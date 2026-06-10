import { normalizeMovingObject } from "../../moving-objects/schema.js";

const TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const STATES_URL = "https://opensky-network.org/api/states/all";

let tokenCache = null;

function env(name) {
  return globalThis.process?.env?.[name] || "";
}

export function openskyConfigured() {
  return String(env("OPENSKY_ENABLED")).toLowerCase() === "true" && env("OPENSKY_CLIENT_ID") && env("OPENSKY_CLIENT_SECRET");
}

export function openskyStatus(reason = "OpenSky OAuth2 client credentials are not configured.") {
  return {
    providerId: "opensky",
    status: "configuration-required",
    ok: false,
    message: reason,
    coverage: "Viewport bounding boxes only; never global polling.",
    delay: "Positions may be missing or delayed and coverage is receiver-dependent.",
    nextRefreshAfterMs: 30000,
  };
}

export async function openskyAccessToken(fetchImpl = fetch, now = Date.now()) {
  if (!openskyConfigured()) throw new Error("OpenSky credentials are not configured");
  if (tokenCache?.accessToken && tokenCache.expiresAt > now + 30000) return tokenCache.accessToken;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env("OPENSKY_CLIENT_ID"),
    client_secret: env("OPENSKY_CLIENT_SECRET"),
  });
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`OpenSky token request returned ${response.status}`);
  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + Math.max(30, Number(data.expires_in || 300)) * 1000,
  };
  return tokenCache.accessToken;
}

export function normalizeOpenSkyState(row = [], now = Date.now()) {
  const [icao24, callsign, originCountry, timePosition, lastContact, longitude, latitude, baroAltitude, onGround, velocity, trueTrack, verticalRate, sensors, geoAltitude, squawk, spi, positionSource, aircraftCategory] = row;
  const observedSeconds = Number(timePosition || lastContact || 0);
  const observedAt = observedSeconds ? observedSeconds * 1000 : now;
  return normalizeMovingObject({
    id: `aircraft:${icao24}`,
    objectType: "aircraft",
    providerId: "opensky",
    observedAt,
    receivedAt: now,
    latitude,
    longitude,
    altitude: geoAltitude ?? baroAltitude,
    speed: velocity,
    heading: trueTrack,
    verticalRate,
    status: onGround ? "on-ground" : "airborne",
    identifiers: { icao24, callsign: String(callsign || "").trim() },
    displayName: String(callsign || "").trim() || icao24,
    classification: aircraftCategory == null ? "unknown" : `category-${aircraftCategory}`,
    sourceName: "OpenSky Network",
    sourceUrl: "https://opensky-network.org/",
    dataAgeSeconds: Math.max(0, Math.round((now - observedAt) / 1000)),
    positionSource,
    providerMetadata: { public: { originCountry, positionSource, squawk: squawk || null, specialPurposeIndicator: Boolean(spi) }, sensors: sensors || [] },
  });
}

export async function fetchOpenSkyAircraft({ bbox, limit = 500, now = Date.now(), fetchImpl = fetch } = {}) {
  if (!openskyConfigured()) return { objects: [], status: openskyStatus(), warnings: ["Flight tracking is not configured."], truncated: false };
  const token = await openskyAccessToken(fetchImpl, now);
  const url = new URL(STATES_URL);
  url.searchParams.set("lamin", bbox.south);
  url.searchParams.set("lomin", bbox.west);
  url.searchParams.set("lamax", bbox.north);
  url.searchParams.set("lomax", bbox.east);
  const response = await fetchImpl(url, { headers: { authorization: `Bearer ${token}`, accept: "application/json" } });
  if (response.status === 401 || response.status === 429) {
    return { objects: [], status: { ...openskyStatus(`OpenSky returned ${response.status}; refresh is paused.`), status: response.status === 429 ? "rate-limited" : "authentication-required" }, warnings: ["Aircraft data is temporarily delayed."], truncated: false };
  }
  if (!response.ok) throw new Error(`OpenSky states request returned ${response.status}`);
  const data = await response.json();
  const objects = (data.states || []).map((row) => normalizeOpenSkyState(row, now).object).filter(Boolean).slice(0, limit);
  return {
    objects,
    status: { providerId: "opensky", status: "live", ok: true, count: objects.length, coverage: "Viewport bounding box", delay: "Receiver-dependent, may be delayed.", nextRefreshAfterMs: 30000 },
    warnings: ["Coverage is receiver-dependent; some aircraft may be missing or delayed."],
    truncated: (data.states || []).length > limit,
  };
}
