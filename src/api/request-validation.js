/**
 * Shared request / query validation helpers for public APIs.
 * Body size limits and rate limiting remain in rate-limit.js + Netlify withPublicApiGuard (#36).
 */

export const DEFAULT_HOURS = 168;
export const MIN_HOURS = 24;
export const MAX_HOURS = 720;

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
  return String(value ?? "").replace(CONTROL_CHARS, " ").trim().slice(0, maxLength);
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
  const list = Array.isArray(allowedValues) ? allowedValues : [...(allowedValues || [])];
  const text = sanitizeToken(value);
  if (!text) return fallback;
  return list.includes(text) ? text : fallback;
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

/**
 * @param {URLSearchParams} searchParams
 * @param {string[]} [warnings]
 */
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

export function safeJsonArray(raw, { maxItems = 100, maxItemLength = 120 } = {}) {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, maxItems)
      .map((item) => String(item).slice(0, maxItemLength))
      .filter(Boolean);
  } catch {
    return [];
  }
}
