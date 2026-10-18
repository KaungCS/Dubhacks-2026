import { google } from "googleapis";
import { getGoogleClient } from "@/lib/google/client";
import { getDb } from "@/lib/db";

/** Google Workspace MIME types we can duplicate via Drive files.copy. */
export const COPYABLE_MIME_TYPES = {
  document: "application/vnd.google-apps.document",
  spreadsheet: "application/vnd.google-apps.spreadsheet",
  presentation: "application/vnd.google-apps.presentation",
  form: "application/vnd.google-apps.form",
} as const;

export type CopyableGoogleKind = keyof typeof COPYABLE_MIME_TYPES;

const MIME_TO_KIND = Object.fromEntries(
  Object.entries(COPYABLE_MIME_TYPES).map(([kind, mime]) => [mime, kind]),
) as Record<string, CopyableGoogleKind>;

const KIND_LABEL: Record<CopyableGoogleKind, string> = {
  document: "Google Doc",
  spreadsheet: "Google Sheet",
  presentation: "Google Slides",
  form: "Google Form",
};

async function getSharedDriveId(workspaceId: string): Promise<string> {
  const { data, error } = await getDb()
    .from("workspaces")
    .select("shared_drive_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load shared drive: ${error.message}`);
  if (!data?.shared_drive_id) {
    throw new Error("Workspace has no shared Drive configured");
  }
  return data.shared_drive_id;
}

/**
 * Extract a Drive file id from a Google Docs/Sheets/Slides/Forms/Drive URL, or a raw id.
 * Throws a clear error for unsupported or unparseable links.
 */
export function parseGoogleFileId(input: string): string {
  const raw = input.trim();
  if (!raw) throw new Error("Paste a Google file link or file id");

  // Raw file id (Drive ids are typically 25–44 URL-safe chars)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(raw) && !raw.includes("/") && !raw.includes(".")) {
    return raw;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      "Unsupported Google link. Paste a Docs, Sheets, Slides, Forms, or Drive file URL (or the file id).",
    );
  }

  const host = url.hostname.replace(/^www\./, "");
  if (
    host !== "docs.google.com" &&
    host !== "drive.google.com" &&
    host !== "forms.gle"
  ) {
    throw new Error(
      "That URL is not a Google Drive/Docs link. Use a Docs, Sheets, Slides, Forms, or Drive file URL.",
    );
  }

  // forms.gle short links don't expose the Drive file id in the path
  if (host === "forms.gle") {
    throw new Error(
      "Short forms.gle links can't be duplicated. Open the form in Drive or use the docs.google.com/forms URL (edit link), then paste that.",
    );
  }

  // /document/d/ID, /spreadsheets/d/ID, /presentation/d/ID, /forms/d/ID, /file/d/ID
  const pathMatch = url.pathname.match(
    /\/(?:document|spreadsheets|presentation|forms|file|open)\/(?:d\/)?([a-zA-Z0-9_-]+)/,
  );
  if (pathMatch?.[1] && pathMatch[1] !== "e") {
    return pathMatch[1];
  }

  // /forms/d/e/FORM_RESPONSE_ID — not the Drive file id
  if (url.pathname.includes("/forms/d/e/")) {
    throw new Error(
      "That is a form response (view) link, not the editable Form file. Open the form from Drive or use the edit URL, then paste that.",
    );
  }

  const idParam = url.searchParams.get("id");
  if (idParam && /^[a-zA-Z0-9_-]{10,}$/.test(idParam)) {
    return idParam;
  }

  throw new Error(
    "Could not find a file id in that link. Paste a Docs, Sheets, Slides, Forms, or Drive file URL (or the file id).",
  );
}

export type GoogleFileMeta = {
  fileId: string;
  name: string;
  mimeType: string;
  kind: CopyableGoogleKind | null;
  webViewLink: string | null;
};

/** Load metadata and confirm the connected account can access the file. */
export async function getGoogleFileMeta(
  workspaceId: string,
  fileIdOrUrl: string,
): Promise<GoogleFileMeta> {
  const fileId = parseGoogleFileId(fileIdOrUrl);
  const auth = await getGoogleClient(workspaceId);
  const drive = google.drive({ version: "v3", auth });

  try {
    const { data } = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, webViewLink, capabilities",
      supportsAllDrives: true,
    });

    const mimeType = data.mimeType ?? "";
    if (mimeType === "application/vnd.google-apps.folder") {
      throw new Error(
        "That link points to a folder. Paste a Docs, Sheets, Slides, or Forms file to duplicate.",
      );
    }

    const kind = MIME_TO_KIND[mimeType] ?? null;
    if (!kind) {
      throw new Error(
        `Unsupported Google file type (${mimeType || "unknown"}). Only Docs, Sheets, Slides, and Forms can be duplicated.`,
      );
    }

    return {
      fileId: data.id ?? fileId,
      name: data.name ?? "Untitled",
      mimeType,
      kind,
      webViewLink: data.webViewLink ?? null,
    };
  } catch (err) {
    if (err instanceof Error && /Unsupported Google|folder|forms\.gle|response \(view\)/.test(err.message)) {
      throw err;
    }
    const status = (err as { code?: number; status?: number }).code
      ?? (err as { code?: number; status?: number }).status;
    if (status === 404) {
      throw new Error(
        "Google file not found, or the club Google account cannot access it. Check the link and sharing.",
      );
    }
    if (status === 403) {
      throw new Error(
        "Permission denied reading that Google file. Share it with the club admin Google account (at least Viewer), then try again.",
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not read Google file: ${message}`);
  }
}

export type CopyGoogleFileInput = {
  /** File id or Google URL */
  source: string;
  /** Optional display name for the copy */
  name?: string;
  /** Parent folder id; defaults to workspace shared drive root */
  parentFolderId?: string | null;
  /** If set, reject when the source MIME does not match */
  expectKind?: CopyableGoogleKind;
};

/**
 * Duplicate a Google Workspace file into the event folder (or shared drive)
 * via Drive files.copy — works for Docs, Sheets, Slides, and Forms.
 */
export async function copyGoogleFile(
  workspaceId: string,
  input: CopyGoogleFileInput,
): Promise<{ fileId: string; url: string | null; kind: CopyableGoogleKind; name: string }> {
  const meta = await getGoogleFileMeta(workspaceId, input.source);

  if (input.expectKind && meta.kind !== input.expectKind) {
    throw new Error(
      `Expected a ${KIND_LABEL[input.expectKind]}, but that link is a ${KIND_LABEL[meta.kind!]}.`,
    );
  }

  const auth = await getGoogleClient(workspaceId);
  const drive = google.drive({ version: "v3", auth });
  const sharedDriveId = await getSharedDriveId(workspaceId);
  const parent = input.parentFolderId || sharedDriveId;
  const copyName = input.name?.trim() || `${meta.name} (copy)`;

  try {
    const copied = await drive.files.copy({
      fileId: meta.fileId,
      requestBody: {
        name: copyName,
        parents: [parent],
      },
      fields: "id, webViewLink, name, mimeType",
      supportsAllDrives: true,
    });

    const fileId = copied.data.id;
    if (!fileId) throw new Error("Google Drive did not return a copied file id");

    return {
      fileId,
      url: copied.data.webViewLink ?? null,
      kind: meta.kind!,
      name: copied.data.name ?? copyName,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Expected a ")) throw err;
    const status = (err as { code?: number; status?: number }).code
      ?? (err as { code?: number; status?: number }).status;
    if (status === 403) {
      throw new Error(
        "Permission denied copying that Google file. The club admin account needs at least Viewer access on the source file.",
      );
    }
    if (status === 404) {
      throw new Error(
        "Google file not found, or the club Google account cannot access it. Check the link and sharing.",
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to copy Google file: ${message}`);
  }
}

/** Create an event folder under the workspace shared drive. */
export async function createEventFolder(
  workspaceId: string,
  eventTitle: string,
): Promise<{ folderId: string; url: string | null }> {
  const auth = await getGoogleClient(workspaceId);
  const drive = google.drive({ version: "v3", auth });
  const sharedDriveId = await getSharedDriveId(workspaceId);

  const created = await drive.files.create({
    requestBody: {
      name: eventTitle,
      mimeType: "application/vnd.google-apps.folder",
      parents: [sharedDriveId],
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  const folderId = created.data.id;
  if (!folderId) throw new Error("Google Drive did not return a folder id");

  return { folderId, url: created.data.webViewLink ?? null };
}

/** Create a blank Google Slides deck in the event folder (or shared drive root). */
export async function createEventSlides(
  workspaceId: string,
  eventTitle: string,
  parentFolderId?: string | null,
): Promise<{ slidesId: string; url: string | null }> {
  const auth = await getGoogleClient(workspaceId);
  const drive = google.drive({ version: "v3", auth });
  const sharedDriveId = await getSharedDriveId(workspaceId);
  const parent = parentFolderId || sharedDriveId;

  const created = await drive.files.create({
    requestBody: {
      name: `${eventTitle} — Slides`,
      mimeType: "application/vnd.google-apps.presentation",
      parents: [parent],
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  const slidesId = created.data.id;
  if (!slidesId) throw new Error("Google Drive did not return a slides id");

  return { slidesId, url: created.data.webViewLink ?? null };
}
