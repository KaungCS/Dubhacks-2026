import { google } from "googleapis";
import { getGoogleClient } from "@/lib/google/client";
import { getDb } from "@/lib/db";

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
