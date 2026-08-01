import { createNormalizedEvent } from "../../events/normalized-event.js";

/**
 * NASA FIRMS — fire / thermal anomaly detections.
 * Free MAP_KEY required (server-side only). See:
 * https://firms.modaps.eosdis.nasa.gov/api/
 *
 * Governance: official open API, attribution required, configuration-gated.
 * Detections are sensor products, not confirmed wildfire incident reports.
 */

export const FIRMS_SOURCE = "VIIRS_SNPP_NRT";
export const FIRMS_DAY_RANGE = 1;
export const FIRMS_MAX_EVENTS = 80;
export const FIRMS_GRID_DEG = 0.25;

function env(name) {
  return globalThis?.process?.env?.[name] || "";
}

export function firmsAreaUrl(mapKey, source = FIRMS_SOURCE, dayRange = FIRMS_DAY_RANGE) {
  const key = encodeURIComponent(String(mapKey || "").trim());
  return `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${source}/world/${dayRange}`;
}

function parseCsv(text = "") {
  const lines = String(text)
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cols[index]?.trim() ?? "";
    });
    return row;
  });
}

function confidenceRank(value) {
  const raw = String(value || "").toLowerCase();
  if (raw === "h" || raw === "high" || Number(raw) >= 80) return 3;
  if (raw === "n" || raw === "nominal" || Number(raw) >= 50) return 2;
  if (raw === "l" || raw === "low" || Number(raw) > 0) return 1;
  return 0;
}

function parseAcqTime(dateStr, timeStr) {
  const d = String(dateStr || "").trim();
  const t = String(timeStr || "0000").padStart(4, "0");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const iso = `${d}T${t.slice(0, 2)}:${t.slice(2, 4)}:00Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function gridKey(lat, lon) {
  const g = FIRMS_GRID_DEG;
  const la = Math.round(lat / g) * g;
  const lo = Math.round(lon / g) * g;
  return `${la.toFixed(2)}:${lo.toFixed(2)}`;
}

/**
 * Collapse dense detections into grid cells so the map stays readable.
 * Keeps the hottest (highest FRP, then confidence) sample per cell.
 */
export function clusterFirmsRows(rows = [], maxEvents = FIRMS_MAX_EVENTS) {
  const cells = new Map();
  for (const row of rows) {
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (confidenceRank(row.confidence) < 1) continue;
    const key = gridKey(latitude, longitude);
    const frp = Number(row.frp) || 0;
    const conf = confidenceRank(row.confidence);
    const existing = cells.get(key);
    if (
      !existing ||
      frp > existing.frp ||
      (frp === existing.frp && conf > confidenceRank(existing.confidence))
    ) {
      cells.set(key, { ...row, latitude, longitude, frp, _count: (existing?._count || 0) + 1 });
    } else if (existing) {
      existing._count = (existing._count || 1) + 1;
    }
  }
  return [...cells.values()]
    .sort((a, b) => (b.frp || 0) - (a.frp || 0) || confidenceRank(b.confidence) - confidenceRank(a.confidence))
    .slice(0, maxEvents);
}

function firmsSeverity(row) {
  const frp = Number(row.frp) || 0;
  const conf = confidenceRank(row.confidence);
  if (frp >= 80 && conf >= 2) return 78;
  if (frp >= 30 || conf >= 3) return 62;
  if (frp >= 10) return 48;
  return 38;
}

export function normalizeFirmsRow(row, now = new Date()) {
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { event: null, errors: ["missing coordinates"] };
  }
  const acq = parseAcqTime(row.acq_date, row.acq_time) || now;
  const frp = Number(row.frp);
  const sat = row.satellite || row.instrument || "VIIRS";
  const conf = row.confidence || "unknown";
  const cellCount = row._count || 1;
  const idSeed = `${row.acq_date || ""}:${row.acq_time || ""}:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
  const result = createNormalizedEvent({
    id: `firms:${idSeed}`,
    provider: "nasa-firms",
    providerEventId: idSeed,
    title: `Thermal anomaly / fire detection (${sat})`,
    description: [
      `NASA FIRMS ${sat} detection with confidence ${conf}`,
      Number.isFinite(frp) ? `FRP ${frp.toFixed(1)} MW` : null,
      cellCount > 1 ? `${cellCount} detections clustered in this cell` : null,
      "Sensor product — not a confirmed wildfire incident report. Confirm with official authorities.",
    ]
      .filter(Boolean)
      .join(". "),
    category: "wildfire",
    type: "wildfire",
    subtype: "thermal-anomaly",
    subcategory: "remote-sensing",
    domain: "natural-disaster",
    latitude,
    longitude,
    countryName: "Unknown",
    locationName: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
    startedAt: acq,
    updatedAt: acq,
    ingestedAt: now,
    severity: firmsSeverity(row),
    confidence: confidenceRank(conf) >= 3 ? 74 : confidenceRank(conf) >= 2 ? 62 : 48,
    status: "monitoring",
    sourceName: "NASA FIRMS",
    sourceUrl: "https://firms.modaps.eosdis.nasa.gov/",
    sourceType: "Official",
    sourcePublishedAt: acq,
    tags: ["NASA FIRMS", "VIIRS", "thermal-anomaly", String(conf), sat].filter(Boolean),
    metadata: {
      verificationStatus: "single-source",
      coordinateMethod: "remote-sensing detection centroid",
      severityReason: "Fire radiative power and detection confidence from NASA FIRMS VIIRS.",
      frp: Number.isFinite(frp) ? frp : null,
      confidence: conf,
      satellite: sat,
      instrument: row.instrument || null,
      daynight: row.daynight || null,
      clusterCount: cellCount,
      recordKindNote: "Thermal anomaly detection — corroborate before treating as confirmed incident.",
      details: {
        FRP: Number.isFinite(frp) ? `${frp.toFixed(1)} MW` : "Not reported",
        Confidence: conf,
        Satellite: sat,
        Acquired: acq.toISOString?.() || String(acq),
        Clustered: String(cellCount),
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

export async function fetchFirmsEvents(context) {
  const mapKey = env("NASA_FIRMS_MAP_KEY") || context.env?.NASA_FIRMS_MAP_KEY || "";
  if (!String(mapKey).trim()) {
    return {
      events: [],
      rejected: [],
      status: "configuration-required",
      warnings: ["NASA_FIRMS_MAP_KEY is required before FIRMS can be queried."],
      safeError:
        "NASA FIRMS is not configured. Add a free NASA_FIRMS_MAP_KEY in server environment variables (https://firms.modaps.eosdis.nasa.gov/api/area/).",
      requestAttempted: false,
    };
  }

  const url = firmsAreaUrl(mapKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), context.provider?.timeoutMs || 20000);
  let text;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "text/csv,text/plain,*/*",
        "user-agent": "LiveWorldMap/1.0 (+https://liveworldmap.netlify.app/; NASA FIRMS MAP_KEY configured server-side)",
      },
    });
    if (response.status === 401 || response.status === 403) {
      return {
        events: [],
        rejected: [],
        status: "configuration-required",
        warnings: ["NASA FIRMS rejected the MAP_KEY."],
        safeError: "NASA FIRMS MAP_KEY was rejected. Check NASA_FIRMS_MAP_KEY.",
        requestAttempted: true,
      };
    }
    if (!response.ok) throw new Error(`NASA FIRMS returned ${response.status}`);
    text = await response.text();
  } finally {
    clearTimeout(timeout);
  }

  // Invalid keys often return HTML or short error text
  if (!text || text.length < 40 || /invalid|error|unauthorized/i.test(text.slice(0, 200))) {
    if (/invalid|unauthorized|error/i.test(String(text).slice(0, 400))) {
      return {
        events: [],
        rejected: [],
        status: "configuration-required",
        warnings: ["NASA FIRMS response indicates key or request problem."],
        safeError: "NASA FIRMS did not return usable CSV. Verify NASA_FIRMS_MAP_KEY and day range.",
        requestAttempted: true,
      };
    }
  }

  const rows = parseCsv(text);
  const clustered = clusterFirmsRows(rows, FIRMS_MAX_EVENTS);
  const now = new Date(context.now);
  const normalized = [];
  const rejected = [];
  for (const row of clustered) {
    const result = normalizeFirmsRow(row, now);
    if (result.event) normalized.push(result.event);
    else rejected.push({ id: null, errors: result.errors });
  }

  return {
    events: normalized,
    rejected,
    receivedCount: rows.length,
    warnings:
      rows.length > FIRMS_MAX_EVENTS
        ? [`Clustered ${rows.length} FIRMS detections into ${normalized.length} map cells (cap ${FIRMS_MAX_EVENTS}).`]
        : [],
  };
}
