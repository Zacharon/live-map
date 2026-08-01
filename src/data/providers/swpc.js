import { createNormalizedEvent } from "../../events/normalized-event.js";

/**
 * NOAA SWPC — Space Weather Prediction Center alerts (public JSON).
 * https://services.swpc.noaa.gov/
 *
 * Governance: open public NOAA product, attribution required, no API key.
 * Non-geographic by default (planetary / multi-region space weather).
 */

export const SWPC_ALERTS_URL = "https://services.swpc.noaa.gov/products/alerts.json";

function limitedText(value, max = 480) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function swpcSeverity(message = "") {
  const text = String(message).toLowerCase();
  if (/extreme|severe|g5|s5|r5|watch.*warning|warning/.test(text)) return 72;
  if (/strong|g4|s4|r4|major/.test(text)) return 60;
  if (/moderate|g3|s3|r3/.test(text)) return 48;
  if (/minor|g1|g2|s1|s2|r1|r2/.test(text)) return 36;
  return 32;
}

export function normalizeSwpcAlert(item, index = 0, now = new Date()) {
  const message = limitedText(item?.message || item?.issue_message || item?.product_id || "");
  const productId = item?.product_id || item?.issue || `alert-${index}`;
  const issueTime = item?.issue_datetime || item?.issue_time || item?.time || now;
  if (!message && !productId) return { event: null, errors: ["empty SWPC alert"] };

  const titleSource = message.split(/[.\n]/)[0] || String(productId);
  const title = limitedText(titleSource, 140) || `Space weather alert: ${productId}`;

  const result = createNormalizedEvent({
    id: `swpc:${productId}:${String(issueTime)}`,
    provider: "noaa-swpc",
    providerEventId: `${productId}:${issueTime}`,
    recordKind: "event",
    domain: "weather",
    category: "storm",
    type: "space-weather-alert",
    subtype: String(productId || "space-weather"),
    title: title.startsWith("Space weather") ? title : `Space weather: ${title}`,
    description:
      limitedText(message, 420) ||
      "NOAA Space Weather Prediction Center alert. See source for full product text.",
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "Space weather products are planetary / multi-region and lack a single verified ground location.",
    startedAt: issueTime,
    updatedAt: issueTime,
    ingestedAt: now,
    severity: swpcSeverity(message),
    confidence: 90,
    status: "active",
    sourceName: "NOAA Space Weather Prediction Center",
    sourceUrl: "https://www.swpc.noaa.gov/",
    sourceType: "Official",
    sourcePublishedAt: issueTime,
    tags: ["NOAA", "SWPC", "space-weather", String(productId)].filter(Boolean),
    metadata: {
      verificationStatus: "primary-confirmed",
      coordinateMethod: "not applicable",
      severityReason: "Derived from SWPC product severity language (G/S/R scales when present).",
      productId,
      details: {
        Product: String(productId),
        Issued: String(issueTime),
        Source: "NOAA SWPC alerts.json",
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

export async function fetchSwpcEvents(context) {
  const data = await context.fetchJson(SWPC_ALERTS_URL, "NOAA SWPC");
  const now = new Date(context.now);
  const items = Array.isArray(data) ? data : Array.isArray(data?.alerts) ? data.alerts : [];
  const normalized = [];
  const rejected = [];
  // Keep newest first; cap to avoid feed noise
  const slice = items.slice(0, 40);
  slice.forEach((item, index) => {
    const result = normalizeSwpcAlert(item, index, now);
    if (result.event) normalized.push(result.event);
    else rejected.push({ id: item?.product_id || null, errors: result.errors });
  });
  return {
    events: normalized,
    rejected,
    receivedCount: items.length,
    warnings: items.length > 40 ? [`Showing latest 40 of ${items.length} SWPC alerts.`] : [],
  };
}
