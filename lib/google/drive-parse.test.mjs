/**
 * Pure parseGoogleFileId tests (no Google API).
 * Run: node --test lib/google/drive-parse.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Keep in sync with parseGoogleFileId in drive.ts */
function parseGoogleFileId(input) {
  const raw = input.trim();
  if (!raw) throw new Error("Paste a Google file link or file id");

  if (/^[a-zA-Z0-9_-]{25,}$/.test(raw) && !raw.includes("/") && !raw.includes(".")) {
    return raw;
  }

  let url;
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

  if (host === "forms.gle") {
    throw new Error(
      "Short forms.gle links can't be duplicated. Open the form in Drive or use the docs.google.com/forms URL (edit link), then paste that.",
    );
  }

  const pathMatch = url.pathname.match(
    /\/(?:document|spreadsheets|presentation|forms|file|open)\/(?:d\/)?([a-zA-Z0-9_-]+)/,
  );
  if (pathMatch?.[1] && pathMatch[1] !== "e") {
    return pathMatch[1];
  }

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

const FID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";

describe("parseGoogleFileId", () => {
  it("accepts a raw file id", () => {
    assert.equal(parseGoogleFileId(FID), FID);
  });

  it("parses Docs / Sheets / Slides / Forms / Drive URLs", () => {
    assert.equal(
      parseGoogleFileId(`https://docs.google.com/document/d/${FID}/edit`),
      FID,
    );
    assert.equal(
      parseGoogleFileId(`https://docs.google.com/spreadsheets/d/${FID}/edit#gid=0`),
      FID,
    );
    assert.equal(
      parseGoogleFileId(`https://docs.google.com/presentation/d/${FID}/edit`),
      FID,
    );
    assert.equal(
      parseGoogleFileId(`https://docs.google.com/forms/d/${FID}/edit`),
      FID,
    );
    assert.equal(
      parseGoogleFileId(`https://drive.google.com/file/d/${FID}/view`),
      FID,
    );
    assert.equal(
      parseGoogleFileId(`https://drive.google.com/open?id=${FID}`),
      FID,
    );
  });

  it("rejects unsupported hosts and forms.gle / response links", () => {
    assert.throws(() => parseGoogleFileId("https://example.com/x"), /not a Google/);
    assert.throws(() => parseGoogleFileId("https://forms.gle/abcdef"), /forms\.gle/);
    assert.throws(
      () => parseGoogleFileId(`https://docs.google.com/forms/d/e/${FID}/viewform`),
      /response \(view\)/,
    );
  });

  it("rejects empty / garbage input", () => {
    assert.throws(() => parseGoogleFileId("   "), /Paste a Google/);
    assert.throws(() => parseGoogleFileId("not-a-link"), /Unsupported Google link/);
  });
});
