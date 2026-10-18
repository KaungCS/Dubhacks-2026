import { google } from "googleapis";
import { getGoogleClient } from "@/lib/google/client";
import { getDb, type Event } from "@/lib/db";

async function getWorkspaceCalendarId(workspaceId: string): Promise<string> {
  const { data, error } = await getDb()
    .from("workspaces")
    .select("calendar_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load workspace calendar: ${error.message}`);
  if (!data?.calendar_id) {
    throw new Error("Workspace has no shared Google Calendar configured");
  }
  return data.calendar_id;
}

/** Create or update the Google Calendar event; persist calendar_event_id. */
export async function syncEventToGoogleCalendar(event: Event): Promise<string> {
  const auth = await getGoogleClient(event.workspace_id);
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = await getWorkspaceCalendarId(event.workspace_id);

  const body = {
    summary: event.title,
    location: event.location ?? undefined,
    start: { dateTime: event.starts_at },
    end: {
      dateTime: event.ends_at ?? event.starts_at,
    },
  };

  let calendarEventId = event.calendar_event_id;

  if (calendarEventId) {
    await calendar.events.patch({
      calendarId,
      eventId: calendarEventId,
      requestBody: body,
    });
  } else {
    const created = await calendar.events.insert({
      calendarId,
      requestBody: body,
    });
    calendarEventId = created.data.id ?? null;
    if (!calendarEventId) {
      throw new Error("Google Calendar did not return an event id");
    }

    const { error } = await getDb()
      .from("events")
      .update({ calendar_event_id: calendarEventId })
      .eq("id", event.id);
    if (error) throw new Error(`Failed to save calendar_event_id: ${error.message}`);
  }

  return calendarEventId;
}

export async function removeEventFromGoogleCalendar(event: Event): Promise<void> {
  if (!event.calendar_event_id) return;

  const auth = await getGoogleClient(event.workspace_id);
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = await getWorkspaceCalendarId(event.workspace_id);

  await calendar.events.delete({
    calendarId,
    eventId: event.calendar_event_id,
  });
}
