export const ADAPTER_RESULT_STATUSES = ["ok", "partial", "degraded", "stale", "disabled", "authentication-required", "license-required", "provider-unavailable", "error"];

export function createAdapterResult({
  providerId,
  status = "disabled",
  attemptedAt = Date.now(),
  succeededAt = null,
  durationMs = 0,
  receivedCount = 0,
  acceptedCount = 0,
  rejectedCount = 0,
  duplicateCount = 0,
  events = [],
  warnings = [],
  safeError = null,
  stale = false,
  cacheAgeMs = null,
  nextSuggestedRefreshAt = null,
  sourceStatus = "not-run",
} = {}) {
  if (!providerId) throw new Error("providerId is required");
  if (!ADAPTER_RESULT_STATUSES.includes(status)) throw new Error(`Unknown adapter status: ${status}`);
  return {
    providerId,
    status,
    attemptedAt,
    succeededAt,
    durationMs,
    receivedCount,
    acceptedCount,
    rejectedCount,
    duplicateCount,
    events,
    warnings,
    safeError,
    stale,
    cacheAgeMs,
    nextSuggestedRefreshAt,
    sourceStatus,
  };
}

export function sanitizeProviderError(error) {
  const raw = error instanceof Error ? error.message : String(error || "Unknown provider error");
  return raw
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .replace(/(api[_-]?key|token|secret|password|authorization)=?[\w.-]+/gi, "$1=[redacted]")
    .replace(/Bearer\s+[\w.-]+/gi, "Bearer [redacted]")
    .slice(0, 240);
}

export function classifyProviderError(error) {
  const message = sanitizeProviderError(error).toLowerCase();
  if (/401|403|unauthori[sz]ed|forbidden|credential|api[_ -]?key|token/.test(message)) return "authentication-required";
  if (/license|terms|redistribution|copyright/.test(message)) return "license-required";
  if (/429|rate.?limit|too many requests/.test(message)) return "degraded";
  if (/timeout|network|503|502|unavailable|econn/.test(message)) return "provider-unavailable";
  return "error";
}

export function shouldOpenCircuitBreaker({ consecutiveFailures = 0, lastStatus = "ok", legalReviewRequired = false, accessMode = "open-api" } = {}) {
  if (legalReviewRequired && ["commercial-license", "prohibited-or-unclear"].includes(accessMode)) return true;
  if (["authentication-required", "license-required"].includes(lastStatus)) return true;
  return consecutiveFailures >= 3;
}

export function nextRefreshWithBackoff({ now = Date.now(), baseRefreshMs = 300000, consecutiveFailures = 0, maxRefreshMs = 3600000 } = {}) {
  const multiplier = Math.min(2 ** Math.max(0, consecutiveFailures), maxRefreshMs / baseRefreshMs);
  const jitter = Math.floor(baseRefreshMs * 0.15);
  return now + Math.min(maxRefreshMs, baseRefreshMs * multiplier) + jitter;
}
