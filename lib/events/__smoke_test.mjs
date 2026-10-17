/**
 * Pure-function smoke test (no scaffold / DB required).
 * Run: node lib/events/__smoke_test.mjs
 */

function mapEventRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    status: row.status || "scheduled",
    templateId: row.template_id,
    calendarEventId: row.calendar_event_id,
    driveFolderId: row.drive_folder_id,
    rsvpFormId: row.rsvp_form_id,
    signinSheetId: row.signin_sheet_id,
    slidesId: row.slides_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function eventLinks(event) {
  return {
    driveFolderUrl: event.driveFolderId
      ? `https://drive.google.com/drive/folders/${event.driveFolderId}`
      : null,
    rsvpFormUrl: event.rsvpFormId
      ? `https://docs.google.com/forms/d/${event.rsvpFormId}/viewform`
      : null,
    signinSheetUrl: event.signinSheetId
      ? `https://docs.google.com/spreadsheets/d/${event.signinSheetId}`
      : null,
    slidesUrl: event.slidesId
      ? `https://docs.google.com/presentation/d/${event.slidesId}`
      : null,
  };
}

function subtractDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

const row = {
  id: "e1",
  workspace_id: "w1",
  title: "jun: test event",
  starts_at: "2026-10-20T18:00:00.000Z",
  ends_at: "2026-10-20T20:00:00.000Z",
  location: "HUB",
  status: "scheduled",
  template_id: "t1",
  calendar_event_id: null,
  drive_folder_id: "folder123",
  rsvp_form_id: "form123",
  signin_sheet_id: "sheet123",
  slides_id: null,
  created_at: "2026-10-17T00:00:00.000Z",
  updated_at: "2026-10-17T00:00:00.000Z",
};

const event = mapEventRow(row);
const links = eventLinks(event);
const due = subtractDays(new Date("2026-10-20T18:00:00.000Z"), 7);

const asserts = [
  ["maps workspaceId", event.workspaceId === "w1"],
  ["maps title", event.title === "jun: test event"],
  ["folder link", links.driveFolderUrl === "https://drive.google.com/drive/folders/folder123"],
  ["form link", links.rsvpFormUrl === "https://docs.google.com/forms/d/form123/viewform"],
  ["sheet link", links.signinSheetUrl === "https://docs.google.com/spreadsheets/d/sheet123"],
  ["null slides", links.slidesUrl === null],
  ["due date -7d", due.toISOString() === "2026-10-13T18:00:00.000Z"],
];

let failed = 0;
for (const [name, ok] of asserts) {
  if (!ok) {
    console.error("FAIL:", name);
    failed += 1;
  } else {
    console.log("ok:", name);
  }
}

if (failed) {
  process.exit(1);
}
console.log("All smoke checks passed.");
