import type { Event, Tables } from "@/lib/db";

export type { Event };

export type EventTemplateRow = Tables<"event_templates">;

/** Values stored in event_templates.file_types */
export type FileTypeKey = "folder" | "rsvp_form" | "slides" | "signin_sheet";

/** Shape stored in event_templates.task_items JSON */
export type TemplateTaskItem = {
  title: string;
  days_before: number;
  role: string;
};

export type EventTemplate = {
  id: string;
  workspace_id: string;
  name: string;
  task_items: TemplateTaskItem[];
  file_types: FileTypeKey[];
  created_at: string;
};

export type CreateFromTemplateInput = {
  workspaceId: string;
  templateId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  createdByUserId: string;
};

export type EventLinks = {
  driveFolderUrl: string | null;
  rsvpFormUrl: string | null;
  signinSheetUrl: string | null;
  slidesUrl: string | null;
};

export function eventLinks(event: Event): EventLinks {
  return {
    driveFolderUrl: event.drive_folder_id
      ? `https://drive.google.com/drive/folders/${event.drive_folder_id}`
      : null,
    rsvpFormUrl: event.rsvp_form_url
      ? event.rsvp_form_url
      : event.rsvp_form_id
        ? `https://docs.google.com/forms/d/${event.rsvp_form_id}/viewform`
        : null,
    signinSheetUrl: event.signin_sheet_id
      ? `https://docs.google.com/spreadsheets/d/${event.signin_sheet_id}`
      : null,
    slidesUrl: event.slides_id
      ? `https://docs.google.com/presentation/d/${event.slides_id}`
      : null,
  };
}

export function parseTaskItems(raw: unknown): TemplateTaskItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = String(row.title ?? "").trim();
      if (!title) return null;
      return {
        title,
        days_before: Number(row.days_before ?? row.daysBefore ?? 0) || 0,
        role: String(row.role ?? ""),
      };
    })
    .filter((t): t is TemplateTaskItem => t !== null);
}

export function parseFileTypes(raw: unknown): FileTypeKey[] {
  const allowed = new Set<FileTypeKey>(["folder", "rsvp_form", "slides", "signin_sheet"]);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => String(v))
    .filter((v): v is FileTypeKey => allowed.has(v as FileTypeKey));
}

export const ALL_FILE_TYPES: { key: FileTypeKey; label: string }[] = [
  { key: "folder", label: "Drive folder" },
  { key: "rsvp_form", label: "RSVP form" },
  { key: "slides", label: "Slides" },
  { key: "signin_sheet", label: "Sign-in sheet" },
];
