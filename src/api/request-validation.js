export const DEFAULT_HOURS = 168;
export const MIN_HOURS = 24;
export const MAX_HOURS = 720;
export const MAX_JSON_BODY_BYTES = 16 * 1024;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const TOKEN_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,79}$/i;
const COUNTRY_PATTERN = /^[a-z]{2,3}$/i;

export class ApiInputError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiInputError";
    this.status = status;
    this.code = code;
    this.publicMessage = message;
  }
}

export function apiErrorResponse(error, headers = {}) {
  const status = error instanceof ApiInputError ? error.status : 500;
  const code = error instanceof ApiInputError ? error.code : "internal-error";
  const message = error instanceof ApiInputError ? error.publicMessage : "The request could not be completed.";
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function sanitizeText(value, { maxLength = 120 } = {}) {
  return String(value || "").replace(CONTROL_CHARS, " ").trim().slice(0, maxLength);
}

export function sanitizeToken(value, { maxLength = 80, pattern = TOKEN_PATTERN } = {}) {
  const text = sanitizeText(value, { maxLength });
  if (!text || !pattern.test(text)) return "";
  return text;
}

export function sanitizeCountryCode(value) {
  return sanitizeToken(value, { maxLength: 3, pattern: COUNTRY_PATTERN }).toUpperCase();
}

export function allowedValue(value, allowedValues, fallback = "") {
  const text = sanitizeToken(value);
  return allowedValues.includes(text) ? text : fallback;
}

export function booleanString(value) {
  const text = sanitizeText(value, { maxLength: 5 }).toLowerCase();
  if (text === "true" || text === "false") return text;
  return "";
}

export function clampedInteger(value, { min, max, fallback }) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function parseHoursParam(searchParams, warnings = []) {
  const raw = searchParams.get("hours");
  if (raw == null || raw === "") return DEFAULT_HOURS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    warnings.push("Invalid hours parameter ignored.");
    return DEFAULT_HOURS;
  }
  const clamped = clampedInteger(raw, { min: MIN_HOURS, max: MAX_HOURS, fallback: DEFAULT_HOURS });
  if (clamped !== Math.trunc(parsed)) warnings.push(`Hours parameter clamped to ${clamped}.`);
  return clamped;
}

export function parseLimitedIntegerParam(searchParams, name, { min, max, fallback }, warnings = []) {
  const raw = searchParams.get(name);
  if (raw == null || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    warnings.push(`Invalid ${name} parameter ignored.`);
    return fallback;
  }
  const clamped = clampedInteger(raw, { min, max, fallback });
  if (clamped !== Math.trunc(parsed)) warnings.push(`${name} parameter clamped to ${clamped}.`);
  return clamped;
}

export function contentLength(request) {
  const value = request.headers.get("content-length");
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function readTextBody(request, maxBytes) {
  const declaredLength = contentLength(request);
  if (declaredLength != null && declaredLength > maxBytes) {
    throw new ApiInputError(413, "payload-too-large", "Request body is too large.");
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ApiInputError(413, "payload-too-large", "Request body is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

export async function parseJsonBody(request, { maxBytes = MAX_JSON_BODY_BYTES } = {}) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiInputError(400, "invalid-content-type", "JSON requests must use application/json.");
  }
  const text = await readTextBody(request, maxBytes);
  if (!text.trim()) throw new ApiInputError(400, "malformed-json", "JSON request body is required.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiInputError(400, "malformed-json", "Request body must be valid JSON.");
  }
}
