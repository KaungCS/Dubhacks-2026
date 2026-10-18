import type { Event, Tables } from "@/lib/db";
import type { CopyableGoogleKind } from "@/lib/google/drive";

export type { Event };

export type EventTemplateRow = Tables<"event_templates">;

/** Values stored in event_templates.file_types */
export type FileTypeKey = "folder" | "rsvp_form" | "slides" | "signin_sheet";

/** Optional Google source to duplicate when creating an event from the template. */
export type FileTypeSource = {
  sourceFileId: string | null;
  sourceUrl: string | null;
};

/** File type checklist entry with optional duplicate-from source. */
export type FileTypeConfig = {
  key: FileTypeKey;
  sourceFileId: string | null;
  sourceUrl: string | null;
};

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
  /** Enabled file-type keys (derived from file_type_configs). */
  file_types: FileTypeKey[];
  /** Full config including optional Google source per type. */
  file_type_configs: FileTypeConfig[];
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

const ALLOWED_FILE_TYPES = new Set<FileTypeKey>([
  "folder",
  "rsvp_form",
  "slides",
  "signin_sheet",
]);

/**
 * Parse event_templates.file_types text[].
 * Entries may be a plain key ("slides") or JSON:
 * {"k":"slides","id":"...","url":"..."}.
 */
export function parseFileTypeConfigs(raw: unknown): FileTypeConfig[] {
  if (!Array.isArray(raw)) return [];
  const byKey = new Map<FileTypeKey, FileTypeConfig>();

  for (const entry of raw) {
    const parsed = parseOneFileTypeEntry(entry);
    if (!parsed) continue;
    byKey.set(parsed.key, parsed);
  }

  return [...byKey.values()];
}

function parseOneFileTypeEntry(entry: unknown): FileTypeConfig | null {
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    if (!trimmed) return null;
    if (ALLOWED_FILE_TYPES.has(trimmed as FileTypeKey)) {
      return { key: trimmed as FileTypeKey, sourceFileId: null, sourceUrl: null };
    }
    if (trimmed.startsWith("{")) {
      try {
        return parseOneFileTypeEntry(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
    return null;
  }

  if (!entry || typeof entry !== "object") return null;
  const row = entry as Record<string, unknown>;
  const key = String(row.k ?? row.key ?? "") as FileTypeKey;
  if (!ALLOWED_FILE_TYPES.has(key)) return null;
  const sourceFileId = row.id != null && String(row.id).trim()
    ? String(row.id).trim()
    : row.sourceFileId != null && String(row.sourceFileId).trim()
      ? String(row.sourceFileId).trim()
      : null;
  const sourceUrl = row.url != null && String(row.url).trim()
    ? String(row.url).trim()
    : row.sourceUrl != null && String(row.sourceUrl).trim()
      ? String(row.sourceUrl).trim()
      : null;
  return { key, sourceFileId, sourceUrl };
}

/** Keys only — backward-compatible with older callers. */
export function parseFileTypes(raw: unknown): FileTypeKey[] {
  return parseFileTypeConfigs(raw).map((c) => c.key);
}

/**
 * Serialize configs into text[] for the file_types column.
 * Plain key when no source; JSON string when a source id/url is set.
 */
export function serializeFileTypes(configs: FileTypeConfig[]): string[] {
  const seen = new Set<FileTypeKey>();
  const out: string[] = [];
  for (const c of configs) {
    if (!ALLOWED_FILE_TYPES.has(c.key) || seen.has(c.key)) continue;
    seen.add(c.key);
    const id = c.sourceFileId?.trim() || null;
    const url = c.sourceUrl?.trim() || null;
    if (!id && !url) {
      out.push(c.key);
    } else {
      out.push(JSON.stringify({ k: c.key, id, url }));
    }
  }
  return out;
}

/** Build configs from a key list + optional source map (UI submit shape). */
export function buildFileTypeConfigs(
  keys: FileTypeKey[],
  sources: Partial<Record<FileTypeKey, FileTypeSource>> = {},
): FileTypeConfig[] {
  const seen = new Set<FileTypeKey>();
  const out: FileTypeConfig[] = [];
  for (const key of keys) {
    if (!ALLOWED_FILE_TYPES.has(key) || seen.has(key)) continue;
    seen.add(key);
    const src = sources[key];
    out.push({
      key,
      sourceFileId: src?.sourceFileId?.trim() || null,
      sourceUrl: src?.sourceUrl?.trim() || null,
    });
  }
  return out;
}

export function fileTypeConfigsToKeys(configs: FileTypeConfig[]): FileTypeKey[] {
  return configs.map((c) => c.key);
}

export function sourceForFileType(
  configs: FileTypeConfig[],
  key: FileTypeKey,
): FileTypeSource | null {
  const c = configs.find((x) => x.key === key);
  if (!c) return null;
  if (!c.sourceFileId && !c.sourceUrl) return null;
  return { sourceFileId: c.sourceFileId, sourceUrl: c.sourceUrl };
}

/** Expected Drive MIME kind for template file types that support duplicate-from. */
export const FILE_TYPE_EXPECT_KIND: Partial<Record<FileTypeKey, CopyableGoogleKind>> = {
  slides: "presentation",
  signin_sheet: "spreadsheet",
  rsvp_form: "form",
};

/** File types that accept a Google source link (not folder). */
export const DUPLICATABLE_FILE_TYPES: FileTypeKey[] = [
  "slides",
  "signin_sheet",
  "rsvp_form",
];

export const ALL_FILE_TYPES: {
  key: FileTypeKey;
  label: string;
  sourceHint?: string;
}[] = [
  { key: "folder", label: "Drive folder" },
  {
    key: "rsvp_form",
    label: "RSVP form",
    sourceHint: "Paste a Google Form link (or file id) to duplicate",
  },
  {
    key: "slides",
    label: "Slides",
    sourceHint: "Paste a Google Slides link (or file id) to duplicate",
  },
  {
    key: "signin_sheet",
    label: "Sign-in sheet",
    sourceHint: "Paste a Google Sheet link (or file id) to duplicate",
  },
];
