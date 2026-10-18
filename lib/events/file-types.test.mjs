/**
 * file_types serialize/parse tests (no DB).
 * Run: node --test lib/events/file-types.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const ALLOWED = new Set(["folder", "rsvp_form", "slides", "signin_sheet"]);

function parseFileTypeConfigs(raw) {
  if (!Array.isArray(raw)) return [];
  const byKey = new Map();
  for (const entry of raw) {
    const parsed = parseOne(entry);
    if (!parsed) continue;
    byKey.set(parsed.key, parsed);
  }
  return [...byKey.values()];
}

function parseOne(entry) {
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    if (!trimmed) return null;
    if (ALLOWED.has(trimmed)) {
      return { key: trimmed, sourceFileId: null, sourceUrl: null };
    }
    if (trimmed.startsWith("{")) {
      try {
        return parseOne(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
    return null;
  }
  if (!entry || typeof entry !== "object") return null;
  const key = String(entry.k ?? entry.key ?? "");
  if (!ALLOWED.has(key)) return null;
  const sourceFileId =
    entry.id != null && String(entry.id).trim()
      ? String(entry.id).trim()
      : entry.sourceFileId != null && String(entry.sourceFileId).trim()
        ? String(entry.sourceFileId).trim()
        : null;
  const sourceUrl =
    entry.url != null && String(entry.url).trim()
      ? String(entry.url).trim()
      : entry.sourceUrl != null && String(entry.sourceUrl).trim()
        ? String(entry.sourceUrl).trim()
        : null;
  return { key, sourceFileId, sourceUrl };
}

function serializeFileTypes(configs) {
  const seen = new Set();
  const out = [];
  for (const c of configs) {
    if (!ALLOWED.has(c.key) || seen.has(c.key)) continue;
    seen.add(c.key);
    const id = c.sourceFileId?.trim() || null;
    const url = c.sourceUrl?.trim() || null;
    if (!id && !url) out.push(c.key);
    else out.push(JSON.stringify({ k: c.key, id, url }));
  }
  return out;
}

describe("file_types encode/decode", () => {
  it("round-trips plain keys (legacy rows)", () => {
    const raw = ["folder", "slides", "rsvp_form"];
    const configs = parseFileTypeConfigs(raw);
    assert.deepEqual(
      configs.map((c) => c.key),
      ["folder", "slides", "rsvp_form"],
    );
    assert.equal(serializeFileTypes(configs).join(","), "folder,slides,rsvp_form");
  });

  it("persists source id and url as JSON entries", () => {
    const encoded = serializeFileTypes([
      { key: "folder", sourceFileId: null, sourceUrl: null },
      {
        key: "slides",
        sourceFileId: "abc123XYZ_fileid_long_enough",
        sourceUrl: "https://docs.google.com/presentation/d/abc123XYZ_fileid_long_enough/edit",
      },
    ]);
    assert.equal(encoded[0], "folder");
    assert.ok(encoded[1].startsWith("{"));
    const decoded = parseFileTypeConfigs(encoded);
    assert.equal(decoded[1].key, "slides");
    assert.equal(decoded[1].sourceFileId, "abc123XYZ_fileid_long_enough");
    assert.ok(decoded[1].sourceUrl.includes("presentation"));
  });

  it("filters unknown keys", () => {
    const configs = parseFileTypeConfigs(["folder", "bogus", "slides"]);
    assert.deepEqual(
      configs.map((c) => c.key),
      ["folder", "slides"],
    );
  });
});
