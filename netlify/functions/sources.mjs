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
    accessMode: search.get("accessMode") || "",
    status: search.get("status") || "",
    sourceTier: search.get("sourceTier") || "",
    official: search.get("official") || "",
    implemented: search.get("implemented") || "",
    credentialRequired: search.get("credentialRequired") || "",
    legalReviewRequired: search.get("legalReviewRequired") || "",
    source: search.get("source") || "",
  };
}

export default async (request) => {
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  const filters = paramsFromUrl(request.url);
  const validation = validateSourceRegistry();
  const sources = filterSources(MASTER_SOURCE_REGISTRY, filters);
  const selectedSource = filters.source ? sourceById(filters.source) : null;

  return new Response(
    JSON.stringify({
      generatedAt: Date.now(),
      mode: "source-registry",
      valid: validation.valid,
      errors: validation.errors,
      stats: sourceRegistryStats(MASTER_SOURCE_REGISTRY),
      filters,
      domainLabels: DOMAIN_LABELS,
      sources,
      selectedSource,
    }),
    { status: validation.valid ? 200 : 500, headers }
  );
};
