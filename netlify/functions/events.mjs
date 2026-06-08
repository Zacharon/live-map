const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  "access-control-allow-origin": "*",
};

const SOURCE_REGISTRY = {
  usgs: {
    name: "USGS Earthquake Hazards Program",
    url: "https://earthquake.usgs.gov/earthquakes/feed/",
    type: "Official",
    confidence: 92,
  },
  eonet: {
    name: "NASA EONET",
    url: "https://eonet.gsfc.nasa.gov/docs/v3",
    type: "Official",
    confidence: 88,
  },
};

const quakeSeverity = (magnitude) =>
  magnitude >= 7 ? "critical" : magnitude >= 6 ? "high" : magnitude >= 4.5 ? "medium" : "low";

function isoOrNull(value) {
  return value ? new Date(value).toISOString() : null;
}

function confidenceFromStatus(status, fallback) {
  return status === "reviewed" ? 98 : fallback;
}

function earthquake(feature) {
  const properties = feature.properties || {};
  const coordinates = feature.geometry?.coordinates || [0, 0, 0];
  const magnitude = Number(properties.mag || 0);
  const depth = Number(coordinates[2] || 0);
  const reviewed = properties.status === "reviewed";

  return {
    id: `usgs-${feature.id}`,
    providerId: feature.id,
    category: "earthquake",
    subcategory: "seismic",
    severity: quakeSeverity(magnitude),
    severityReason: `Magnitude ${magnitude.toFixed(1)} earthquake at ${depth.toFixed(1)} km depth.`,
    title: properties.title || `Magnitude ${magnitude.toFixed(1)} earthquake`,
    summary: `Magnitude ${magnitude.toFixed(1)} earthquake at approximately ${depth.toFixed(1)} km depth. ${
      reviewed ? "Reviewed by USGS." : "Preliminary solution; details may change."
    }`,
    lat: coordinates[1],
    lon: coordinates[0],
    latitude: coordinates[1],
    longitude: coordinates[0],
    coordinatePrecision: "provider",
    coordinateMethod: "official epicenter",
    country: (properties.place || "Unknown").split(",").pop().trim(),
    place: properties.place || "Unknown location",
    location: properties.place || "Unknown location",
    occurredAt: properties.time,
    firstReportedAt: properties.time,
    updatedAt: properties.updated,
    ingestedAt: Date.now(),
    source: SOURCE_REGISTRY.usgs.name,
    sourceName: SOURCE_REGISTRY.usgs.name,
    sourceUrl: properties.url,
    sourceType: SOURCE_REGISTRY.usgs.type,
    providerName: SOURCE_REGISTRY.usgs.name,
    providerUrl: SOURCE_REGISTRY.usgs.url,
    confidence: confidenceFromStatus(properties.status, SOURCE_REGISTRY.usgs.confidence),
    verificationStatus: reviewed ? "Provider reviewed" : "Preliminary",
    magnitude,
    depthKm: depth,
    feltReports: properties.felt ?? null,
    tsunami: Boolean(properties.tsunami),
    status: properties.status || "unknown",
    tags: ["USGS", "earthquake", properties.status || "unknown"].filter(Boolean),
    details: {
      Magnitude: magnitude.toFixed(1),
      Depth: `${depth.toFixed(1)} km`,
      Status: properties.status || "unknown",
      Tsunami: properties.tsunami ? "Possible/flagged" : "No flag",
      Felt: properties.felt ?? "Not reported",
      Significance: properties.sig ?? "Not reported",
      Coordinates: `${Number(coordinates[1]).toFixed(4)}, ${Number(coordinates[0]).toFixed(4)}`,
      "Local reported time": properties.time ? new Date(properties.time).toLocaleString() : "Unknown",
      "UTC reported time": isoOrNull(properties.time) || "Unknown",
      "Provider updated": isoOrNull(properties.updated) || "Unknown",
    },
  };
}

function eonetCategory(categories = []) {
  const title = (categories[0]?.title || "").toLowerCase();
  if (title.includes("wildfire")) return "wildfire";
  if (title.includes("storm") || title.includes("severe")) return "storm";
  if (title.includes("volcano")) return "volcano";
  if (title.includes("flood")) return "flood";
  return "other";
}

function eonetSeverity(category) {
  return category === "wildfire" || category === "storm" ? "high" : "medium";
}

function collectCoordinatePairs(value, output = []) {
  if (!Array.isArray(value)) return output;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  ) {
    output.push(value);
    return output;
  }
  value.forEach((item) => collectCoordinatePairs(item, output));
  return output;
}

function representativePoint(geometry) {
  const pairs = collectCoordinatePairs(geometry?.coordinates || []);
  if (!pairs.length) return null;
  const sum = pairs.reduce(
    (acc, pair) => {
      acc.lon += pair[0];
      acc.lat += pair[1];
      return acc;
    },
    { lon: 0, lat: 0 }
  );
  return {
    lon: sum.lon / pairs.length,
    lat: sum.lat / pairs.length,
    method: pairs.length === 1 ? "provider point" : "representative geometry centroid",
  };
}

function hazard(event) {
  const geometry = [...(event.geometry || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const point = representativePoint(geometry);
  const category = eonetCategory(event.categories);
  const source = event.sources?.[0];

  if (!point) return null;

  return {
    id: `eonet-${event.id}`,
    providerId: event.id,
    category,
    subcategory: event.categories?.map((item) => item.title).join(", ") || category,
    severity: eonetSeverity(category),
    severityReason: `NASA EONET lists this as an ${event.closed ? "historical/closed" : "open"} ${category} event.`,
    title: event.title || "Natural hazard event",
    summary:
      event.description ||
      `Open ${category} event tracked by NASA EONET. Open the source for the latest provider details and boundaries.`,
    lat: point.lat,
    lon: point.lon,
    latitude: point.lat,
    longitude: point.lon,
    coordinatePrecision: geometry?.type === "Point" ? "provider point" : "approximate",
    coordinateMethod: point.method,
    country: "Multiple/unknown",
    place: event.title || "Event location",
    location: event.title || "Event location",
    occurredAt: new Date(geometry?.date || Date.now()).getTime(),
    firstReportedAt: geometry?.date ? new Date(geometry.date).getTime() : null,
    updatedAt: Date.now(),
    ingestedAt: Date.now(),
    source: SOURCE_REGISTRY.eonet.name,
    sourceName: SOURCE_REGISTRY.eonet.name,
    sourceUrl: source?.url || event.link || SOURCE_REGISTRY.eonet.url,
    sourceType: SOURCE_REGISTRY.eonet.type,
    providerName: SOURCE_REGISTRY.eonet.name,
    providerUrl: SOURCE_REGISTRY.eonet.url,
    confidence: SOURCE_REGISTRY.eonet.confidence,
    verificationStatus: "Official provider feed",
    status: event.closed ? "closed" : "open",
    geometry,
    geometryType: geometry?.type || "Unknown",
    tags: ["NASA EONET", category, event.closed ? "closed" : "open"],
    details: {
      Category: event.categories?.map((item) => item.title).join(", ") || category,
      Status: event.closed ? "Closed" : "Open",
      Geometry: geometry?.type || "Unknown",
      "Coordinate method": point.method,
      "NASA event ID": event.id,
      "Source title": source?.id || "NASA EONET",
    },
  };
}

async function fetchJson(url, sourceName, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "LiveWorldMap/1.0 (+https://liveworldmap.netlify.app/)",
        },
      });
      if (!response.ok) throw new Error(`${sourceName} returned ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

async function fetchEonet(days) {
  const urls = [
    `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=${days}&limit=250`,
    "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=250",
  ];
  let lastError;
  for (const url of urls) {
    try {
      return await fetchJson(url, "NASA EONET", 3);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function sourceOk(count) {
  return { ok: true, count, message: "Live" };
}

function sourceFailed(error) {
  return { ok: false, count: 0, message: error?.message || "Unavailable" };
}

export default async (request) => {
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers });

  try {
    const url = new URL(request.url);
    const hours = Math.min(720, Math.max(24, Number(url.searchParams.get("hours") || 168)));
    const days = Math.ceil(hours / 24);
    const generatedAt = Date.now();

    const [usgs, eonet] = await Promise.allSettled([
      fetchJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson", "USGS"),
      fetchEonet(days),
    ]);

    const events = [];
    const sources = [];
    const sourceStatus = {};

    if (usgs.status === "fulfilled") {
      const normalized = (usgs.value.features || []).map(earthquake);
      events.push(...normalized);
      sources.push(SOURCE_REGISTRY.usgs.name);
      sourceStatus.usgs = sourceOk(normalized.length);
    } else {
      sourceStatus.usgs = sourceFailed(usgs.reason);
    }

    if (eonet.status === "fulfilled") {
      const normalized = (eonet.value.events || []).map(hazard).filter(Boolean);
      events.push(...normalized);
      sources.push(SOURCE_REGISTRY.eonet.name);
      sourceStatus.eonet = sourceOk(normalized.length);
    } else {
      sourceStatus.eonet = sourceFailed(eonet.reason);
    }

    const cutoff = generatedAt - hours * 3600000;
    const filtered = events.filter((event) => Number(event.occurredAt || 0) >= cutoff);
    const errors = Object.entries(sourceStatus)
      .filter(([, status]) => !status.ok)
      .map(([key, status]) => `${SOURCE_REGISTRY[key]?.name || key}: ${status.message}`);

    return new Response(
      JSON.stringify({
        events: filtered,
        generatedAt,
        sources,
        sourceStatus,
        sourceRegistry: SOURCE_REGISTRY,
        mode: errors.length ? "partial-netlify-function" : "netlify-function",
        errors,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unable to load event feeds",
        detail: error.message,
        generatedAt: Date.now(),
      }),
      { status: 500, headers: { ...headers, "cache-control": "no-store" } }
    );
  }
};
