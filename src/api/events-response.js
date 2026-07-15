import { EVENT_PROVIDERS } from "../data/providers/registry.js";
import { orchestrateProviders } from "../data/providers/orchestrator.js";
import { DOMAIN_SOURCE_STATUS, PROVIDER_SOURCE_REGISTRY } from "../data/providers/source-registry.js";
import { countryByCode, countryForEvent } from "../data/countries.js";
import { RECORD_KINDS } from "../events/normalized-event.js";
import { SOURCE_DOMAINS, VERIFICATION_STATES } from "../sources/master-source-registry.js";
import { allowedValue, parseHoursParam, sanitizeCountryCode } from "./request-validation.js";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  "access-control-allow-origin": "*",
};

const EVENT_DOMAINS = SOURCE_DOMAINS;

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

function parseApiParams(request) {
  const url = new URL(request.url);
  const warnings = [];
  const country = sanitizeCountryCode(url.searchParams.get("country"));
  const normalizedCountry = country ? countryByCode(country)?.iso3 || null : null;
  if (country && !normalizedCountry) warnings.push("Invalid country filter ignored.");

  const recordKind = allowedValue(url.searchParams.get("recordKind"), RECORD_KINDS, null);
  if (url.searchParams.get("recordKind") && !recordKind) warnings.push("Invalid recordKind filter ignored.");

  const verification = allowedValue(url.searchParams.get("verification"), VERIFICATION_STATES, null);
  if (url.searchParams.get("verification") && !verification) warnings.push("Invalid verification filter ignored.");

  const domain = allowedValue(url.searchParams.get("domain"), EVENT_DOMAINS, null);
  if (url.searchParams.get("domain") && !domain) warnings.push("Invalid domain filter ignored.");

  return {
    hours: parseHoursParam(url.searchParams, warnings),
    filters: {
      recordKind,
      verification,
      domain,
      country: normalizedCountry,
    },
    warnings,
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
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "method-not-allowed", message: "Use GET for event feeds." }),
      { status: 405, headers: { ...headers, "cache-control": "no-store" } },
    );
  }

  try {
    const result = await withRuntimeEnv(options.env, async () => {
      const { hours, filters, warnings } = parseApiParams(request);
      const generatedAt = Date.now();
      const providerResult = await orchestrateProviders({ hours, now: generatedAt, env: options.env });
      const canonicalEvents = applyApiFilters(providerResult.canonicalEvents, filters);
      const legacyEvents = applyApiFilters(providerResult.events, filters);

      return {
        events: legacyEvents,
        canonicalEvents,
        generatedAt,
        filters,
        hours,
        sources: EVENT_PROVIDERS.filter((provider) => providerResult.sourceStatus[provider.id]?.ok).map((provider) => provider.name),
        sourceStatus: providerResult.sourceStatus,
        sourceRegistry,
        providerSourceRegistry,
        domainSourceStatus: Object.fromEntries(DOMAIN_SOURCE_STATUS.map(([domainId, status, message]) => [domainId, { status, message }])),
        providerResults: providerResult.providerResults,
        observationSummary: {
          total: providerResult.observations.length,
          retained: "metadata-only",
          coverageGaps: providerResult.storylines.flatMap((storyline) => storyline.coverageGaps).filter((item, index, values) => values.indexOf(item) === index),
        },
        storylines: providerResult.storylines,
        observations: providerResult.observations,
        systemStatus: providerResult.systemStatus,
        mode: responseMode(providerResult, options.runtimeMode),
        errors: providerResult.errors,
        warnings: [...warnings, ...(providerResult.errors || [])],
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
        storylines: [],
        observations: [],
        mode: "error",
      }),
      { status: 500, headers: { ...headers, "cache-control": "no-store" } }
    );
  }
}
