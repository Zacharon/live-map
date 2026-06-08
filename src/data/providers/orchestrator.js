import { mergeDuplicateEvents } from "../../events/event-deduplication.js";
import { toLegacyEvent } from "../../events/normalized-event.js";
import { EVENT_PROVIDERS } from "./registry.js";
import { fetchUsgsEvents } from "./usgs.js";
import { fetchEonetEvents } from "./eonet.js";

const ADAPTERS = {
  usgs: fetchUsgsEvents,
  eonet: fetchEonetEvents,
};

const lastSuccess = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJsonWithTimeout(url, sourceName, options = {}) {
  const attempts = options.attempts ?? 2;
  const timeoutMs = options.timeoutMs ?? 12000;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "user-agent": "LiveWorldMap/1.0 (+https://liveworldmap.netlify.app/)",
        },
      });
      if (!response.ok) throw new Error(`${sourceName} returned ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(300 * attempt + Math.round(Math.random() * 150));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function providerStatus(provider, result, now) {
  const ok = result.status === "healthy" || result.status === "degraded";
  return {
    ok,
    status: result.status,
    count: result.events.length,
    acceptedCount: result.events.length,
    rejectedCount: result.rejectedCount,
    message: result.errorMessage || (result.stale ? "Showing stale provider data" : ok ? "Live" : "Unavailable"),
    lastAttemptedAt: result.fetchedAt,
    lastSuccessfulAt: result.lastSuccessfulAt || null,
    durationMs: result.durationMs,
    cached: result.cached,
    stale: result.stale,
    attribution: provider.attribution,
    url: provider.homepageUrl,
  };
}

export async function runProvider(provider, context) {
  const started = Date.now();
  const fetchedAt = new Date(started).toISOString();
  const adapter = ADAPTERS[provider.id];
  if (!adapter || provider.enabled === false) {
    return {
      providerId: provider.id,
      status: "unavailable",
      events: [],
      fetchedAt,
      durationMs: Date.now() - started,
      recordCount: 0,
      rejectedCount: 0,
      cached: false,
      stale: false,
      errorCode: "provider_disabled",
      errorMessage: "Provider is disabled or not implemented.",
    };
  }
  try {
    const result = await adapter({
      ...context,
      provider,
      fetchJson: (url, sourceName) => fetchJsonWithTimeout(url, sourceName, { timeoutMs: provider.timeoutMs }),
    });
    const events = result.events || [];
    lastSuccess.set(provider.id, { events, fetchedAt, providerResult: result });
    return {
      providerId: provider.id,
      status: result.rejected?.length ? "degraded" : "healthy",
      events,
      fetchedAt,
      lastSuccessfulAt: fetchedAt,
      durationMs: Date.now() - started,
      recordCount: events.length + (result.rejected?.length || 0),
      rejectedCount: result.rejected?.length || 0,
      cached: false,
      stale: false,
    };
  } catch (error) {
    const cached = lastSuccess.get(provider.id);
    return {
      providerId: provider.id,
      status: cached ? "degraded" : "unavailable",
      events: cached?.events || [],
      fetchedAt,
      lastSuccessfulAt: cached?.fetchedAt || null,
      durationMs: Date.now() - started,
      recordCount: cached?.events?.length || 0,
      rejectedCount: 0,
      cached: Boolean(cached),
      stale: Boolean(cached),
      errorCode: error.name === "AbortError" ? "timeout" : "provider_error",
      errorMessage: error.message || "Provider unavailable",
    };
  }
}

export async function orchestrateProviders(options = {}) {
  const now = options.now || Date.now();
  const hours = options.hours || 168;
  const enabledProviders = EVENT_PROVIDERS.filter((provider) => provider.enabled !== false);
  const settled = await Promise.allSettled(enabledProviders.map((provider) => runProvider(provider, { now, hours })));
  const providerResults = settled.map((item, index) =>
    item.status === "fulfilled"
      ? item.value
      : {
          providerId: enabledProviders[index].id,
          status: "unavailable",
          events: [],
          fetchedAt: new Date(now).toISOString(),
          durationMs: 0,
          recordCount: 0,
          rejectedCount: 0,
          cached: false,
          stale: false,
          errorCode: "orchestration_error",
          errorMessage: item.reason?.message || "Provider failed",
        }
  );
  const cutoff = now - hours * 3600000;
  const events = providerResults
    .flatMap((result) => result.events)
    .filter((event) => new Date(event.startedAt).getTime() >= cutoff);
  const dedupedEvents = mergeDuplicateEvents(events);
  const duplicateCount = Math.max(0, events.length - dedupedEvents.length);
  const duplicateCountByProvider = Object.fromEntries(providerResults.map((result) => [result.providerId, 0]));
  if (duplicateCount) {
    const providers = [...new Set(events.map((event) => event.provider))];
    for (const providerId of providers) duplicateCountByProvider[providerId] = Math.round(duplicateCount / providers.length);
  }
  const sourceStatus = Object.fromEntries(
    providerResults.map((result) => {
      const provider = EVENT_PROVIDERS.find((item) => item.id === result.providerId);
      const status = providerStatus(provider, result, now);
      const latest = result.events.reduce((max, event) => Math.max(max, new Date(event.updatedAt || event.startedAt).getTime()), 0);
      return [
        result.providerId,
        {
          ...status,
          duplicateCount: duplicateCountByProvider[result.providerId] || 0,
          mostRecentSourceEventAt: latest ? new Date(latest).toISOString() : null,
        },
      ];
    })
  );
  const unavailable = providerResults.filter((result) => result.status === "unavailable").length;
  const degraded = providerResults.filter((result) => result.status === "degraded").length;
  const systemStatus =
    dedupedEvents.length === 0 ? "no-current-provider-data" : unavailable === providerResults.length ? "major-provider-outage" : unavailable || degraded ? "partial-data" : "operational";
  return {
    events: dedupedEvents.map(toLegacyEvent),
    canonicalEvents: dedupedEvents,
    providerResults: providerResults.map((result) => ({ ...result, duplicateCount: duplicateCountByProvider[result.providerId] || 0 })),
    sourceStatus,
    systemStatus,
    mode: systemStatus === "operational" ? "netlify-function" : "partial-netlify-function",
    errors: providerResults
      .filter((result) => result.errorMessage)
      .map((result) => `${result.providerId}: ${result.errorMessage}`),
  };
}
