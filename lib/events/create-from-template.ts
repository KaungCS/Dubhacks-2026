import { getDb, type Event, type TablesUpdate } from "@/lib/db";
import { createTask } from "@/lib/tasks";
import { createNotification } from "@/lib/notifications";
import { createRsvpForm } from "@/lib/google/forms";
import { createSignInSheet } from "@/lib/google/sheets";
import { syncEventToGoogleCalendar } from "@/lib/google/calendar";
import {
  copyGoogleFile,
  createEventFile,
  createEventFolder,
} from "@/lib/google/drive";
import { getTemplate } from "./templates";
import { getEvent } from "./get-event";
import {
  FILE_TYPE_EXPECT_KIND,
  copySourceRef,
  type CreateFromTemplateInput,
} from "./types";

function subtractDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/**
 * Create an event from a template:
 * event row → tasks → Drive folder/slides/notes → Dom form/sheet → Google Calendar.
 * When a file type has a Google source link/id, copies that file into the event folder
 * via Drive files.copy instead of creating a blank file / calling Dom stubs.
 */
export async function createEventFromTemplate(
  input: CreateFromTemplateInput,
): Promise<Event> {
  const template = await getTemplate(input.templateId);
  if (template.workspace_id !== input.workspaceId) {
    throw new Error("Template does not belong to this workspace");
  }

  const { data, error } = await getDb()
    .from("events")
    .insert({
      workspace_id: input.workspaceId,
      title: input.title,
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt.toISOString(),
      location: input.location ?? null,
      status: "planned",
      template_id: input.templateId,
      created_by: input.createdByUserId,
    })
    .select("*")
    .single();

  if (error) throw new Error(`createEventFromTemplate insert failed: ${error.message}`);

  let event: Event = data;
  const updates: TablesUpdate<"events"> = {};
  const configs = template.file_type_configs;
  const fileTypes = new Set(template.file_types);

  for (const item of template.task_items) {
    await createTask({
      workspace_id: input.workspaceId,
      title: item.title,
      description: item.role ? `Role: ${item.role}` : null,
      event_id: event.id,
      due_at: subtractDays(input.startsAt, item.days_before).toISOString(),
      created_by: input.createdByUserId,
    });
  }

  if (fileTypes.has("folder")) {
    const folder = await createEventFolder(input.workspaceId, input.title);
    updates.drive_folder_id = folder.folderId;
    event = { ...event, drive_folder_id: folder.folderId };
  }

  // Plain Drive files: copy the template's source when set (never blank), else create blank.
  for (const [key, column, suffix] of [
    ["slides", "slides_id", "Slides"],
    ["notes", "notes_id", "Notes"],
  ] as const) {
    if (!fileTypes.has(key)) continue;
    const source = copySourceRef(configs, key);
    const name = `${input.title} — ${suffix}`;
    const kind = FILE_TYPE_EXPECT_KIND[key]!;
    const file = source
      ? await copyGoogleFile(input.workspaceId, {
          source,
          name,
          parentFolderId: event.drive_folder_id,
          expectKind: kind,
        })
      : await createEventFile(input.workspaceId, name, kind, event.drive_folder_id);
    updates[column] = file.fileId;
    event = { ...event, [column]: file.fileId };
  }

  if (fileTypes.has("rsvp_form")) {
    const source = copySourceRef(configs, "rsvp_form");
    if (source) {
      const copied = await copyGoogleFile(input.workspaceId, {
        source,
        name: `${input.title} — RSVP`,
        parentFolderId: event.drive_folder_id,
        expectKind: FILE_TYPE_EXPECT_KIND.rsvp_form,
      });
      updates.rsvp_form_id = copied.fileId;
      // Copied forms keep an edit URL in webViewLink; responder URI is not returned by Drive.
      updates.rsvp_form_url = copied.url
        ? copied.url.replace(/\/edit.*$/, "/viewform")
        : `https://docs.google.com/forms/d/${copied.fileId}/viewform`;
      event = {
        ...event,
        rsvp_form_id: copied.fileId,
        rsvp_form_url: updates.rsvp_form_url,
      };
    } else {
      const form = await createRsvpForm(input.workspaceId, event);
      updates.rsvp_form_id = form.formId;
      updates.rsvp_form_url = form.url;
      event = { ...event, rsvp_form_id: form.formId, rsvp_form_url: form.url };
    }
  }

  if (fileTypes.has("signin_sheet")) {
    const source = copySourceRef(configs, "signin_sheet");
    if (source) {
      const copied = await copyGoogleFile(input.workspaceId, {
        source,
        name: `${input.title} — Sign-in`,
        parentFolderId: event.drive_folder_id,
        expectKind: FILE_TYPE_EXPECT_KIND.signin_sheet,
      });
      updates.signin_sheet_id = copied.fileId;
      event = { ...event, signin_sheet_id: copied.fileId };
    } else {
      const sheet = await createSignInSheet(input.workspaceId, event);
      updates.signin_sheet_id = sheet.sheetId;
      event = { ...event, signin_sheet_id: sheet.sheetId };
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await getDb()
      .from("events")
      .update(updates)
      .eq("id", event.id);
    if (updateError) {
      throw new Error(`Failed to save event Google ids: ${updateError.message}`);
    }
  }

  try {
    const calendarEventId = await syncEventToGoogleCalendar(event);
    event = { ...event, calendar_event_id: calendarEventId };
  } catch (err) {
    console.error("syncEventToGoogleCalendar failed", err);
  }

  try {
    await createNotification(input.createdByUserId, "event_created", {
      eventId: event.id,
      title: event.title,
    });
  } catch (err) {
    console.error("createNotification failed", err);
  }

  return getEvent(event.id);
}
