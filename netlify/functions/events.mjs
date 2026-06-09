import { EVENT_PROVIDERS } from "../../src/data/providers/registry.js";
import { orchestrateProviders } from "../../src/data/providers/orchestrator.js";
import { DOMAIN_SOURCE_STATUS, PROVIDER_SOURCE_REGISTRY } from "../../src/data/providers/source-registry.js";
import { countryByCode, countryForEvent } from "../../src/data/countries.js";

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

export default async (request) => {
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers });

  try {
    const hours = parseHours(request);
    const filters = parseApiFilters(request);
    const generatedAt = Date.now();
    const result = await orchestrateProviders({ hours, now: generatedAt });
    const canonicalEvents = applyApiFilters(result.canonicalEvents, filters);
    const legacyEvents = applyApiFilters(result.events, filters);

    return new Response(
      JSON.stringify({
        events: legacyEvents,
        canonicalEvents,
        generatedAt,
        filters,
        sources: EVENT_PROVIDERS.filter((provider) => result.sourceStatus[provider.id]?.ok).map((provider) => provider.name),
        sourceStatus: result.sourceStatus,
        sourceRegistry,
        providerSourceRegistry,
        domainSourceStatus: Object.fromEntries(DOMAIN_SOURCE_STATUS.map(([domainId, status, message]) => [domainId, { status, message }])),
        providerResults: result.providerResults,
        systemStatus: result.systemStatus,
        mode: result.mode,
        errors: result.errors,
      }),
      { status: 200, headers }
    );
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
};
