import { EVENT_PROVIDERS } from "../../src/data/providers/registry.js";
import { orchestrateProviders } from "../../src/data/providers/orchestrator.js";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  "access-control-allow-origin": "*",
};

const sourceRegistry = Object.fromEntries(
  EVENT_PROVIDERS.map((provider) => [
    provider.id,
    {
      name: provider.name,
      url: provider.homepageUrl,
      type: provider.integrationType,
      attribution: provider.attribution,
      refreshIntervalMs: provider.refreshIntervalMs,
      freshnessMs: provider.freshnessMs,
      categories: provider.categories,
    },
  ])
);

function parseHours(request) {
  const url = new URL(request.url);
  return Math.min(720, Math.max(24, Number(url.searchParams.get("hours") || 168)));
}

export default async (request) => {
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers });

  try {
    const hours = parseHours(request);
    const generatedAt = Date.now();
    const result = await orchestrateProviders({ hours, now: generatedAt });

    return new Response(
      JSON.stringify({
        events: result.events,
        canonicalEvents: result.canonicalEvents,
        generatedAt,
        sources: EVENT_PROVIDERS.filter((provider) => result.sourceStatus[provider.id]?.ok).map((provider) => provider.name),
        sourceStatus: result.sourceStatus,
        sourceRegistry,
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
        sourceStatus: {},
        providerResults: [],
        mode: "error",
      }),
      { status: 500, headers: { ...headers, "cache-control": "no-store" } }
    );
  }
};
