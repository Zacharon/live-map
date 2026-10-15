/**
 * Deterministic digest of factual content. retrievedAt is excluded so a
 * refresh timestamp cannot impersonate a content revision.
 */

const SKIP = new Set(["retrievedAt", "extra"]);

function canonicalize(value, depth = 0) {
  if (depth > 8) return '"[max-depth]"';
  if (value == null) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item, depth + 1)).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).filter((key) => !SKIP.has(key) && key !== "__proto__" && key !== "constructor").sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key], depth + 1)}`).join(",")}}`;
  }
  return "null";
}

export function fnv1aHex(text) {
  let hash = 0x811c9dc5;
  const input = String(text);
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function contentDigest(record) {
  return `fnv1a:${fnv1aHex(canonicalize(record || {}))}`;
}

export function inputManifest(records = []) {
  return records.map((record) => ({
    id: String(record.id),
    revision: Number(record.revision) || 1,
    contentDigest: record.contentDigest || contentDigest(record),
    evidentialOriginId: record.evidentialOriginId || record.canonicalUrl || record.id,
  })).sort((a, b) => a.id.localeCompare(b.id));
}

export function manifestDigest(manifest) {
  return `fnv1a:${fnv1aHex(canonicalize(manifest || []))}`;
}
