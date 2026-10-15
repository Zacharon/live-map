import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FROZEN_BYTES, FROZEN_EXTRACT_RELATIVE, FROZEN_SHA256 } from "../src/intelligence/portwatch-frozen-sample.js";

export function loadFrozenExtract(filePath = FROZEN_EXTRACT_RELATIVE) {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  const buf = readFileSync(resolved);
  const text = buf.toString("utf8");
  const sha256 = createHash("sha256").update(buf).digest("hex");
  let json = null;
  const errors = [];
  try { json = JSON.parse(text); } catch { errors.push("malformed-json"); }
  if (json?.error) errors.push(`source-error:${json.error.message || json.error}`);
  if (json?.exceededTransferLimit) errors.push("exceeded-transfer-limit");
  if (json && !Array.isArray(json.features)) errors.push("missing-features");
  if (sha256 !== FROZEN_SHA256) errors.push("sha256-mismatch-against-capture");
  if (buf.length !== FROZEN_BYTES) errors.push("byte-length-mismatch");
  return { ok: errors.length === 0, errors, buf, text, json, sha256, byteLength: buf.length };
}
