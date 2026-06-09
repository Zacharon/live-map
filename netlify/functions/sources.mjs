import { DOMAIN_LABELS, MASTER_SOURCE_REGISTRY, filterSources, sourceById, sourceRegistryStats, validateSourceRegistry } from "../../src/sources/master-source-registry.js";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=1800",
  "access-control-allow-origin": "*",
};

function paramsFromUrl(url) {
  const search = new URL(url).searchParams;
  return {
    q: search.get("q") || "",
    domain: search.get("domain") || "",
    category: search.get("category") || "",
    accessMode: search.get("accessMode") || search.get("access") || "",
    status: search.get("status") || "",
    sourceTier: search.get("sourceTier") || "",
    official: search.get("official") || "",
    implemented: search.get("implemented") || "",
    credentialRequired: search.get("credentialRequired") || "",
    legalReviewRequired: search.get("legalReviewRequired") || "",
    source: search.get("source") || "",
  };
}

function selectedSourceFor(value) {
  if (!value) return null;
  return sourceById(value) || MASTER_SOURCE_REGISTRY.find((source) => source.adapterId === value) || null;
}

export default async (request) => {
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  const filters = paramsFromUrl(request.url);
  const validation = validateSourceRegistry();
  let sources = filterSources(MASTER_SOURCE_REGISTRY, filters);
  const selectedSource = selectedSourceFor(filters.source);
  const warnings = [];
  if (filters.source && !selectedSource) warnings.push(`Unknown source id: ${filters.source}`);
  if (selectedSource && !sources.some((source) => source.id === selectedSource.id)) {
    sources = [selectedSource, ...sources];
    warnings.push("Selected source is shown even though it is outside the current filters.");
  }
  const statistics = sourceRegistryStats(MASTER_SOURCE_REGISTRY);
  const generatedAt = Date.now();
  const requestId = `sources-${generatedAt.toString(36)}`;

  return new Response(
    JSON.stringify({
      data: {
        sources,
        statistics,
        registryVersion: "1",
        selectedSource,
        domainLabels: DOMAIN_LABELS,
      },
      generatedAt,
      warnings,
      requestId,
      mode: "source-registry",
      valid: validation.valid,
      errors: validation.errors,
      stats: statistics,
      filters,
      domainLabels: DOMAIN_LABELS,
      sources,
      selectedSource,
    }),
    { status: validation.valid ? 200 : 500, headers }
  );
};
