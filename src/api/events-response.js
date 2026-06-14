import { EVENT_PROVIDERS } from "../data/providers/registry.js";
import { orchestrateProviders } from "../data/providers/orchestrator.js";
import { DOMAIN_SOURCE_STATUS, PROVIDER_SOURCE_REGISTRY } from "../data/providers/source-registry.js";
import { countryByCode, countryForEvent } from "../data/countries.js";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  "access-control-allow-origin": "*",
};

const providerSourceRegistry = Object.fromEntries(
  PROVIDER_SOURCE_REGISTRY.map((provider) => [
    provider.id,
    {
      name: provider.name,
      url: provider.homepageUrl || provider.sourceUrl,
      type: provider.integrationType || provider.status,
      attribution: provider.attribution,
      refreshIntervalMs: provider.refreshIntervalMs,
      freshnessMs: provider.freshnessMs,
      categories: provider.categories,
      domains: provider.domains,
      status: provider.status,
      implemented: provider.implemented,
      credentialRequired: provider.credentialRequired,
      documentationUrl: provider.documentationUrl,
      limitations: provider.limitations,
    },
  ])
);

const sourceRegistry = Object.fromEntries(
  EVENT_PROVIDERS.map((provider) => [
    provider.id,
    {
      name: provider.name,
      url: provider.homepageUrl || provider.sourceUrl,
      type: provider.integrationType,
      attribution: provider.attribution,
      refreshIntervalMs: provider.refreshIntervalMs,
      freshnessMs: provider.freshnessMs,
      categories: provider.categories,
      domains: provider.domains,
      status: provider.status,
      implemented: provider.implemented,
      credentialRequired: provider.credentialRequired,
      documentationUrl: provider.documentationUrl,
      limitations: provider.limitations,
    },
  ])
);

function parseHours(request) {
  const url = new URL(request.url);
  return Math.min(720, Math.max(24, Number(url.searchParams.get("hours") || 168)));
}

function parseApiFilters(request) {
  const url = new URL(request.url);
  return {
    recordKind: url.searchParams.get("recordKind") || null,
    verification: url.searchParams.get("verification") || null,
    domain: url.searchParams.get("domain") || null,
    country: url.searchParams.get("country") || null,
  };
}

function eventVerification(event) {
  return event.verification?.state || event.metadata?.verificationStatus || event.verificationStatus || "single-source";
}

function applyApiFilters(events, filters) {
  return events.filter((event) => {
    if (filters.recordKind && event.recordKind !== filters.recordKind) return false;
    if (filters.domain && event.domain !== filters.domain) return false;
    if (filters.verification && eventVerification(event) !== filters.verification) return false;
    if (filters.country) {
      const requested = countryByCode(filters.country);
      const eventCountry = countryForEvent(event);
      if (!requested || eventCountry?.iso3 !== requested.iso3) return false;
    }
    return true;
  });
}

function responseMode(result, runtimeMode) {
  if (!runtimeMode) return result.mode;
  return result.systemStatus === "operational" ? runtimeMode : `partial-${runtimeMode}`;
}

async function withRuntimeEnv(env, callback) {
  if (!env || typeof env !== "object") return callback();
  const previousProcess = globalThis.process;
  const previousEnv = previousProcess?.env;
  const nextEnv = { ...(previousEnv || {}), ...env };
  if (previousProcess) previousProcess.env = nextEnv;
  else globalThis.process = { env: nextEnv };
  try {
    return await callback();
  } finally {
    if (previousProcess) previousProcess.env = previousEnv;
    else delete globalThis.process;
  }
}

export function createEventsOptionsResponse() {
  return new Response("", { status: 204, headers });
}

export async function createEventsResponse(request, options = {}) {
  if (request.method === "OPTIONS") return createEventsOptionsResponse();

  try {
    const result = await withRuntimeEnv(options.env, async () => {
      const hours = parseHours(request);
      const filters = parseApiFilters(request);
      const generatedAt = Date.now();
      const providerResult = await orchestrateProviders({ hours, now: generatedAt, env: options.env });
      const canonicalEvents = applyApiFilters(providerResult.canonicalEvents, filters);
      const legacyEvents = applyApiFilters(providerResult.events, filters);

      return {
        events: legacyEvents,
        canonicalEvents,
        generatedAt,
        filters,
        sources: EVENT_PROVIDERS.filter((provider) => providerResult.sourceStatus[provider.id]?.ok).map((provider) => provider.name),
        sourceStatus: providerResult.sourceStatus,
        sourceRegistry,
        providerSourceRegistry,
        domainSourceStatus: Object.fromEntries(DOMAIN_SOURCE_STATUS.map(([domainId, status, message]) => [domainId, { status, message }])),
        providerResults: providerResult.providerResults,
        systemStatus: providerResult.systemStatus,
        mode: responseMode(providerResult, options.runtimeMode),
        errors: providerResult.errors,
      };
    });

    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unable to load event feeds",
        detail: "The event feed orchestration failed before provider diagnostics could be produced.",
        generatedAt: Date.now(),
        sourceRegistry,
        providerSourceRegistry,
        sourceStatus: {},
        providerResults: [],
        mode: "error",
      }),
      { status: 500, headers: { ...headers, "cache-control": "no-store" } }
    );
  }
}
