import { jsonResponse } from "./lib/response.mjs";
import { clampMovingObjectLimit, movingObjectPublicView, validateBbox } from "../../src/moving-objects/schema.js";
import { fetchOpenSkyAircraft, openskyStatus } from "../../src/data/providers/opensky.js";
import { fetchGfwVessels, gfwStatus } from "../../src/data/providers/global-fishing-watch.js";
import { aishubStatus } from "../../src/data/providers/aishub.js";

const CACHE = new Map();
const CACHE_TTL_MS = 25000;

function cacheKey(type, bbox, limit) {
  const rounded = bbox ? [bbox.south, bbox.west, bbox.north, bbox.east].map((value) => Math.round(value * 10) / 10).join(",") : "none";
  return `${type}:${rounded}:${limit}`;
}

function splitBbox(bbox) {
  if (!bbox?.antimeridian) return [bbox];
  return [
    { ...bbox, west: bbox.west, east: 180, antimeridian: false },
    { ...bbox, west: -180, east: bbox.east, antimeridian: false },
  ];
}

async function loadObjects(type, bbox, limit, now) {
  const key = cacheKey(type, bbox, limit);
  const cached = CACHE.get(key);
  if (cached && now - cached.generatedAt < CACHE_TTL_MS) return { ...cached, cached: true };
  const parts = splitBbox(bbox);
  const statuses = {};
  const warnings = [];
  let objects = [];
  let truncated = false;
  if (type === "aircraft" || type === "all") {
    for (const part of parts) {
      const result = await fetchOpenSkyAircraft({ bbox: part, limit, now });
      objects = objects.concat(result.objects || []);
      statuses.opensky = result.status || openskyStatus();
      warnings.push(...(result.warnings || []));
      truncated = truncated || Boolean(result.truncated);
    }
  }
  if (type === "vessel" || type === "all") {
    const result = await fetchGfwVessels({ bbox, limit, now });
    objects = objects.concat(result.objects || []);
    statuses["global-fishing-watch"] = result.status || gfwStatus();
    statuses.aishub = aishubStatus();
    warnings.push(...(result.warnings || []));
    truncated = truncated || Boolean(result.truncated);
  }
  objects = objects.slice(0, limit).map(movingObjectPublicView);
  const payload = { objects, providerStatus: statuses, warnings, truncated, generatedAt: now };
  CACHE.set(key, payload);
  return payload;
}

export default async (request) => {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "all";
  if (!["all", "aircraft", "vessel"].includes(type)) {
    return jsonResponse({ objects: [] }, { status: 400, warnings: ["Unsupported moving-object type."] });
  }
  const bboxValidation = validateBbox(url.searchParams.get("bbox"));
  if (!bboxValidation.valid) {
    return jsonResponse({
      objects: [],
      providerStatus: {
        opensky: openskyStatus("Viewport required before aircraft requests run."),
        "global-fishing-watch": gfwStatus("Viewport required before vessel requests run."),
        aishub: aishubStatus(),
      },
      viewport: null,
      truncated: false,
      nextRefreshAfterMs: 30000,
    }, { status: 400, warnings: [bboxValidation.error], cacheControl: "no-store" });
  }
  const limit = clampMovingObjectLimit(url.searchParams.get("limit"), 500);
  const now = Date.now();
  const result = await loadObjects(type, bboxValidation.bbox, limit, now);
  return jsonResponse({
    data: result.objects,
    generatedAt: result.generatedAt,
    providerStatus: result.providerStatus,
    viewport: bboxValidation.bbox,
    truncated: result.truncated || result.objects.length >= limit,
    nextRefreshAfterMs: 30000,
    requestId: crypto.randomUUID(),
  }, {
    sourceStatus: result.providerStatus,
    warnings: result.warnings,
    cacheControl: "public, max-age=10, s-maxage=20",
  });
};
