import { Readable } from "node:stream";
import { google } from "googleapis";
import type { EventPlan } from "@/lib/plan";
import { getClubName } from "@/lib/config";

function getAuthedClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
  );
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

function formatChecklist(plan: EventPlan): string {
  const lines = [
    plan.summary,
    "",
    "Checklist:",
    ...plan.checklist.map((item) => `- ${item}`),
    "",
    "Agenda:",
    ...plan.templates.agenda.map((item) => `- ${item}`),
    "",
    "Roles:",
    ...plan.templates.roles.map((item) => `- ${item}`),
    "",
    "Materials:",
    ...plan.templates.materials.map((item) => `- ${item}`),
    "",
    `Created with ${getClubName()} / RSO Manager`,
  ];
  return lines.join("\n");
}

export async function createCalendarEvent(
  accessToken: string,
  plan: EventPlan,
) {
  const auth = getAuthedClient(accessToken);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: plan.title,
      description: formatChecklist(plan),
      start: {
        dateTime: plan.suggestedStart,
        timeZone: plan.timezone,
      },
      end: {
        dateTime: plan.suggestedEnd,
        timeZone: plan.timezone,
      },
    },
  });

  return {
    id: response.data.id ?? undefined,
    htmlLink: response.data.htmlLink ?? undefined,
  };
}

export async function createDriveFolder(
  accessToken: string,
  plan: EventPlan,
) {
  const auth = getAuthedClient(accessToken);
  const drive = google.drive({ version: "v3", auth });
  const club = getClubName();
  const folderName = `${club} — ${plan.title}`;

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, webViewLink",
  });

  const folderId = folder.data.id;
  if (!folderId) {
    throw new Error("Drive folder create returned no id");
  }

  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      type: "anyone",
      role: "reader",
    },
  });

  const checklistBody = formatChecklist(plan);
  await drive.files.create({
    requestBody: {
      name: "event-checklist.txt",
      parents: [folderId],
      mimeType: "text/plain",
    },
    media: {
      mimeType: "text/plain",
      body: Readable.from([checklistBody]),
    },
    fields: "id",
  });

  const meta = await drive.files.get({
    fileId: folderId,
    fields: "id, webViewLink",
  });

  return {
    id: folderId,
    webViewLink:
      meta.data.webViewLink ??
      folder.data.webViewLink ??
      `https://drive.google.com/drive/folders/${folderId}`,
  };
}
