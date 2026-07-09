import {
  DOMAIN_LABELS,
  IMPLEMENTATION_STATUSES,
  MASTER_SOURCE_REGISTRY,
  SOURCE_ACCESS_CLASSIFICATIONS,
  SOURCE_DOMAINS,
  SOURCE_QUALITY_TIERS,
  filterSources,
  sourceById,
  sourceRegistryStats,
  validateSourceRegistry,
} from "../sources/master-source-registry.js";
import { allowedValue, booleanString, sanitizeText, sanitizeToken } from "./request-validation.js";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=1800",
  "access-control-allow-origin": "*",
};

const SOURCE_CATEGORIES = [...new Set(MASTER_SOURCE_REGISTRY.map((source) => source.category).filter(Boolean))];

function paramsFromUrl(url) {
  const search = new URL(url).searchParams;
  return {
    q: sanitizeText(search.get("q"), { maxLength: 120 }),
    domain: allowedValue(search.get("domain"), SOURCE_DOMAINS, ""),
    category: allowedValue(search.get("category"), SOURCE_CATEGORIES, ""),
    accessMode: allowedValue(search.get("accessMode") || search.get("access"), SOURCE_ACCESS_CLASSIFICATIONS, ""),
    status: allowedValue(search.get("status"), IMPLEMENTATION_STATUSES, ""),
    sourceTier: allowedValue(search.get("sourceTier"), SOURCE_QUALITY_TIERS, ""),
    official: booleanString(search.get("official")),
    implemented: booleanString(search.get("implemented")),
    credentialRequired: booleanString(search.get("credentialRequired")),
    legalReviewRequired: booleanString(search.get("legalReviewRequired")),
    source: sanitizeToken(search.get("source")),
  };
}

function selectedSourceFor(value) {
  if (!value) return null;
  return sourceById(value) || MASTER_SOURCE_REGISTRY.find((source) => source.adapterId === value) || null;
}

export function createSourcesOptionsResponse() {
  return new Response("", { status: 204, headers });
}

export async function createSourcesResponse(request) {
  if (request.method === "OPTIONS") return createSourcesOptionsResponse();
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
}
