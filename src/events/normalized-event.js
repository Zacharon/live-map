const SEVERITY_LABELS = ["low", "moderate", "high", "critical"];
const VALID_STATUS = new Set(["active", "monitoring", "resolved", "unknown"]);

export function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

export function severityLabelFromScore(score) {
  const value = clamp(score, 0, 100);
  if (value >= 85) return "critical";
  if (value >= 65) return "high";
  if (value >= 35) return "moderate";
  return "low";
}

export function uiSeverityFromScore(score) {
  const label = severityLabelFromScore(score);
  return label === "moderate" ? "medium" : label;
}

export function scoreFromLegacySeverity(severity) {
  switch (severity) {
    case "critical":
      return 90;
    case "high":
      return 70;
    case "moderate":
    case "medium":
      return 45;
    case "low":
      return 20;
    default:
      return 25;
  }
}

export function toIsoString(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

export function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180
  );
}

export function stableStringHash(value) {
  const text = String(value || "");
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33) ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeStatus(status) {
  return VALID_STATUS.has(status) ? status : "unknown";
}

export function validateNormalizedEvent(event) {
  const errors = [];
  if (!event || typeof event !== "object") errors.push("event must be an object");
  if (!event?.id) errors.push("id is required");
  if (!event?.provider) errors.push("provider is required");
  if (!event?.title) errors.push("title is required");
  if (!event?.category) errors.push("category is required");
  if (!isValidCoordinate(event?.latitude, event?.longitude)) errors.push("latitude/longitude must be valid");
  if (!toIsoString(event?.startedAt)) errors.push("startedAt must be a valid timestamp");
  if (!toIsoString(event?.ingestedAt)) errors.push("ingestedAt must be a valid timestamp");
  if (!SEVERITY_LABELS.includes(event?.severityLabel)) errors.push("severityLabel is invalid");
  if (!VALID_STATUS.has(event?.status)) errors.push("status is invalid");
  try {
    new URL(event?.sourceUrl || "");
  } catch {
    errors.push("sourceUrl must be a valid URL");
  }
  return { valid: errors.length === 0, errors };
}

export function createNormalizedEvent(input) {
  const nowIso = toIsoString(input.ingestedAt, new Date().toISOString());
  const startedAt = toIsoString(input.startedAt ?? input.occurredAt ?? input.sourcePublishedAt, nowIso);
  const updatedAt = toIsoString(input.updatedAt, startedAt);
  const sourcePublishedAt = toIsoString(input.sourcePublishedAt, startedAt);
  const severity =
    typeof input.severity === "number"
      ? clamp(input.severity, 0, 100)
      : clamp(input.severityScore ?? scoreFromLegacySeverity(input.severityLabel || input.severity), 0, 100);
  const severityLabel = SEVERITY_LABELS.includes(input.severityLabel)
    ? input.severityLabel
    : severityLabelFromScore(severity);
  const providerEventId = input.providerEventId ?? input.providerId ?? null;
  const stableId = input.id || `${input.provider}:${providerEventId || stableStringHash(`${input.title}:${startedAt}:${input.latitude}:${input.longitude}`)}`;
  const event = {
    id: stableId,
    provider: input.provider,
    providerEventId,
    title: String(input.title || "Untitled event"),
    description: input.description ?? input.summary ?? null,
    category: String(input.category || "other"),
    subcategory: input.subcategory ?? null,
    latitude: Number(input.latitude ?? input.lat),
    longitude: Number(input.longitude ?? input.lon),
    countryCode: input.countryCode ?? null,
    countryName: input.countryName ?? input.country ?? null,
    region: input.region ?? null,
    locationName: input.locationName ?? input.place ?? input.location ?? null,
    startedAt,
    updatedAt,
    ingestedAt: nowIso,
    severity,
    severityLabel,
    confidence: clamp(input.confidence ?? 70, 0, 100),
    status: normalizeStatus(input.status),
    sourceName: input.sourceName || input.source || input.providerName || input.provider,
    sourceUrl: input.sourceUrl || input.providerUrl,
    sourceType: input.sourceType || "Official",
    sourcePublishedAt,
    geometry: input.geometry || null,
    tags: Array.isArray(input.tags) ? [...new Set(input.tags.filter(Boolean).map(String))] : [],
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
  };
  const validation = validateNormalizedEvent(event);
  return { event, errors: validation.errors, valid: validation.valid };
}

export function toLegacyEvent(event) {
  const occurredAt = new Date(event.startedAt).getTime();
  const updatedAt = event.updatedAt ? new Date(event.updatedAt).getTime() : occurredAt;
  const uiSeverity = uiSeverityFromScore(event.severity);
  return {
    ...event,
    providerId: event.providerEventId,
    severityScore: event.severity,
    severity: uiSeverity,
    severityLabel: event.severityLabel,
    uiSeverity,
    lat: event.latitude,
    lon: event.longitude,
    country: event.countryName || "Multiple/unknown",
    place: event.locationName || event.countryName || "Unknown location",
    location: event.locationName || event.countryName || "Unknown location",
    occurredAt,
    updatedAt,
    firstReportedAt: event.sourcePublishedAt ? new Date(event.sourcePublishedAt).getTime() : occurredAt,
    summary: event.description || "",
    source: event.sourceName,
    providerName: event.sourceName,
    verificationStatus: event.metadata?.verificationStatus || "single-source",
    severityReason: event.metadata?.severityReason || "Severity is platform-derived from provider data.",
    coordinateMethod: event.metadata?.coordinateMethod || "provider coordinates",
    details: event.metadata?.details || {},
  };
}
