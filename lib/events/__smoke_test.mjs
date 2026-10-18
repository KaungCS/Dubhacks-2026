/**
 * Pure-function smoke test (no DB). Run: node lib/events/__smoke_test.mjs
 */

function eventLinks(event) {
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

function parseTaskItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const title = String(item.title ?? "").trim();
      if (!title) return null;
      return {
        title,
        days_before: Number(item.days_before ?? item.daysBefore ?? 0) || 0,
        role: String(item.role ?? ""),
      };
    })
    .filter(Boolean);
}

function parseFileTypes(raw) {
  const allowed = new Set(["folder", "rsvp_form", "slides", "signin_sheet"]);
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter((v) => allowed.has(v));
}

function subtractDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

const event = {
  drive_folder_id: "folder123",
  rsvp_form_id: "form123",
  rsvp_form_url: "https://forms.gle/abc",
  signin_sheet_id: "sheet123",
  slides_id: null,
};

const links = eventLinks(event);
const items = parseTaskItems([{ title: "Book room", days_before: 7, role: "logistics" }]);
const files = parseFileTypes(["folder", "rsvp_form", "bogus"]);
const due = subtractDays(new Date("2026-10-20T18:00:00.000Z"), 7);

const asserts = [
  ["folder link", links.driveFolderUrl?.includes("folder123")],
  ["prefers rsvp url", links.rsvpFormUrl === "https://forms.gle/abc"],
  ["sheet link", links.signinSheetUrl?.includes("sheet123")],
  ["null slides", links.slidesUrl === null],
  ["task days_before", items[0]?.days_before === 7],
  ["file types filter", files.length === 2 && files.includes("folder")],
  ["due date -7d", due.toISOString() === "2026-10-13T18:00:00.000Z"],
];

let failed = 0;
for (const [name, ok] of asserts) {
  if (!ok) {
    console.error("FAIL:", name);
    failed += 1;
  } else console.log("ok:", name);
}
if (failed) process.exit(1);
console.log("All smoke checks passed.");
