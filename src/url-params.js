import { sanitizeText, sanitizeToken } from "./api/request-validation.js";

export function safeSearchParams(search = window.location.search) {
  try {
    return new URLSearchParams(search || "");
  } catch {
    return new URLSearchParams();
  }
}

export function textParam(params, key, fallback = "", maxLength = 120) {
  const value = sanitizeText(params.get(key), { maxLength });
  return value || fallback;
}

export function tokenParam(params, key, fallback = "", options = {}) {
  return sanitizeToken(params.get(key), options) || fallback;
}

export function allowedParam(params, key, allowedValues, fallback = "") {
  const value = sanitizeToken(params.get(key));
  return allowedValues.includes(value) ? value : fallback;
}

export function listParam(params, key, allowedValues, maxItems = 20) {
  const allowed = new Set(allowedValues);
  return new Set(
    String(params.get(key) || "")
      .split(",")
      .map((item) => sanitizeToken(item))
      .filter((item) => item && allowed.has(item))
      .slice(0, maxItems)
  );
}

export function countryParam(params, key, countryByCode) {
  const value = sanitizeToken(params.get(key), { maxLength: 3, pattern: /^[a-z]{2,3}$/i }).toUpperCase();
  return countryByCode(value)?.iso3 || "";
}
