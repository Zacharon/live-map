/**
 * Bounded local JSON import/export for synthetic or public-safe investigation cases.
 * Not a case server. Not a publication path. .gitignore is not the privacy boundary.
 */

import { isGrayZoneMaritime, validateGrayZoneMaritime } from './gray-zone-maritime.js';

const MAX_BYTES = 512 * 1024;
const MAX_RECORDS = 200;
const MAX_DEPTH = 16;
const MAX_STRING = 4000;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const CASE_IO_LIMITS = { MAX_BYTES, MAX_RECORDS, MAX_DEPTH, MAX_STRING };

function depthOf(value, depth = 0) {
  if (depth > MAX_DEPTH) return depth;
  if (value && typeof value === "object") {
    const children = Array.isArray(value) ? value : Object.values(value);
    return children.reduce((max, child) => Math.max(max, depthOf(child, depth + 1)), depth);
  }
  return depth;
}

function countRecords(caseObject) {
  return ["evidence", "collections", "claims", "assessments", "products", "parked", "feedback", "relationships"]
    .reduce((sum, key) => sum + (Array.isArray(caseObject?.[key]) ? caseObject[key].length : 0), 0);
}

function walkUnsafe(value, errors, path = "$") {
  if (typeof value === "string") {
    if (value.length > MAX_STRING) errors.push(`${path} exceeds ${MAX_STRING} characters`);
    if (/^(javascript|data|file|vbscript):/i.test(value.trim())) errors.push(`${path} has a disallowed URL scheme`);
    if (/[A-Za-z]:\\Users\\|\/home\/|C:\\Users\\/i.test(value)) errors.push(`${path} looks like a local filesystem path`);
  }
  if (!value || typeof value !== "object") return;
  const keys = Array.isArray(value) ? value.map((_, i) => String(i)) : Object.keys(value);
  for (const key of keys) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`${path} contains forbidden key ${key}`);
    walkUnsafe(Array.isArray(value) ? value[key] : value[key], errors, `${path}.${key}`);
  }
}

export function validateCasePayload(text) {
  const errors = [];
  if (typeof text !== "string") return { ok: false, errors: ["payload must be a UTF-8 JSON string"] };
  // UTF-8 bytes are the shared browser/Node boundary, not UTF-16 string length.
  if (text.length > MAX_BYTES || new TextEncoder().encode(text).byteLength > MAX_BYTES) return { ok: false, errors: [`payload exceeds ${MAX_BYTES} bytes`] };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["malformed JSON"] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errors: ["root must be a case object"] };
  }
  const caseObject = Object.hasOwn(parsed, 'case') ? parsed.case : parsed;
  if (!caseObject || typeof caseObject !== 'object' || Array.isArray(caseObject)) return { ok:false, errors:['case must be an object'] };
  if (depthOf(parsed) > MAX_DEPTH) errors.push(`nesting exceeds ${MAX_DEPTH}`);
  // Both portable workbench-v1 wrappers and raw local cases share the limit.
  if (countRecords(caseObject) > MAX_RECORDS) errors.push(`record count exceeds ${MAX_RECORDS}`);
  walkUnsafe(parsed, errors);
  if (parsed.kind && parsed.kind !== "live-map-investigation-case") errors.push("unexpected kind");
  return { ok: errors.length === 0, errors, value: errors.length ? null : parsed };
}

export function neutralizeImportedApprovals(caseObject) {
  const clone = structuredClone ? structuredClone(caseObject) : JSON.parse(JSON.stringify(caseObject));
  for (const assessment of clone.assessments || []) {
    const extra = assessment.extra || (assessment.extra = {});
    if (extra.reviewState === "reviewed" || extra.approved === true || assessment.approved === true) {
      extra.importedApproval = true;
      extra.reviewState = "historical";
      extra.currentApplicability = "expired";
      extra.approved = false;
      extra.reviewNote = "Imported approval metadata is historical and cannot authorize a new product.";
    }
  }
  for (const product of clone.products || []) {
    if (product.approved === true || product.extra?.approved === true) {
      product.approved = false;
      product.extra = { ...(product.extra || {}), importedApproval: true, reviewState: "historical" };
    }
  }
  clone.unsaved = true;
  clone.importedAt = new Date().toISOString();
  return clone;
}

export function serializeCase(caseObject) {
  const { lastOperational, ...rest } = caseObject || {};
  const payload = {
    kind: "live-map-investigation-case",
    schemaVersion: "workbench-v1",
    exportedAt: new Date().toISOString(),
    handling: "synthetic-or-public-safe-local-only",
    case: rest,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseCaseFile(text) {
  const checked = validateCasePayload(text);
  if (!checked.ok) return { ok: false, errors: checked.errors, caseObject: null };
  const root = checked.value.case || checked.value;
  // This dated reporting fixture has stricter semantics than generic case JSON.
  // Validate before replacing session state; imported labels grant no authority.
  const semantic = validateGrayZoneMaritime(root);
  if (!semantic.valid) return { ok: false, errors: semantic.errors, caseObject: null };
  const caseObject = neutralizeImportedApprovals(root);
  if (isGrayZoneMaritime(caseObject)) caseObject.genuine = true;
  return { ok: true, errors: [], caseObject };
}
