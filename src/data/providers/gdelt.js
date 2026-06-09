import { createNormalizedEvent, stableStringHash } from "../../events/normalized-event.js";
import { applyPublicationPolicy, DISCOVERY_PUBLICATION_POLICY } from "./publication-policy.js";
import { GDELT_QUERY_PACKS } from "./gdelt-query-packs.js";
import { clusterDiscoveryLeads, canonicalizeUrl } from "./news-clustering.js";
import { evaluateLeadPromotion } from "./discovery-promotion.js";

export const GDELT_DOC_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

function gdeltEnabled() {
  return String(globalThis?.process?.env?.GDELT_ENABLED || "").toLowerCase() === "true";
}

export function gdeltDocUrl(pack, maxRecords = 6) {
  const params = new URLSearchParams({
    query: pack.query,
    mode: "artlist",
    format: "json",
    sort: "datedesc",
    maxrecords: String(maxRecords),
  });
  return `${GDELT_DOC_API_URL}?${params}`;
}

function publisherFromUrl(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown publisher";
  }
}

export function normalizeGdeltArticle(article = {}, pack = {}, now = new Date()) {
  const url = article.url || null;
  if (!url || !article.title) return { event: null, errors: ["missing title or url"] };
  const publisher = article.domain || article.sourceCountry || publisherFromUrl(url);
  const publishedAt = article.seendate || article.date || now;
  const description = applyPublicationPolicy(article.socialimage ? article.title : article.title, DISCOVERY_PUBLICATION_POLICY);
  const result = createNormalizedEvent({
    id: `gdelt:${stableStringHash(canonicalizeUrl(url))}`,
    provider: "gdelt",
    providerEventId: canonicalizeUrl(url),
    recordKind: "discovery-lead",
    domain: pack.domain || "major-news",
    category: pack.category || "other",
    type: pack.type || "news-discovery",
    subtype: pack.id || null,
    title: article.title,
    description,
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "GDELT articles are discovery leads unless an independent source provides verified event coordinates.",
    startedAt: publishedAt,
    updatedAt: publishedAt,
    ingestedAt: now,
    severity: 35,
    confidence: 35,
    status: "monitoring",
    sourceName: "GDELT DOC API",
    sourceUrl: url,
    sourceType: "Discovery",
    sourceTier: "tier-5-discovery-only",
    publisher,
    language: article.language || null,
    sourcePublishedAt: publishedAt,
    verification: {
      state: "unverified",
      evidenceLevel: "discovery-only",
      independentSourceCount: 1,
      promoted: false,
    },
    publicationPolicy: DISCOVERY_PUBLICATION_POLICY,
    tags: ["GDELT", "discovery-lead", pack.id],
    metadata: {
      verificationStatus: "unverified",
      coordinateMethod: "not applicable",
      severityReason: "Discovery lead only; no severity claim is made.",
      copyrightPolicy: DISCOVERY_PUBLICATION_POLICY.recordText,
      publisher,
      queryPack: pack.id,
      language: article.language || null,
      socialImageAvailable: Boolean(article.socialimage),
      details: {
        Publisher: publisher,
        "Query pack": pack.id || "unknown",
        "Record kind": "Discovery lead",
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

export async function fetchGdeltDiscoveryLeads(context = {}) {
  if (!gdeltEnabled()) {
    return {
      events: [],
      rejected: [],
      status: "configuration-required",
      warnings: ["GDELT_ENABLED=true is required before discovery queries run."],
      safeError: "GDELT discovery is implemented but disabled until explicitly enabled.",
      requestAttempted: false,
    };
  }

  const now = new Date(context.now);
  const events = [];
  const rejected = [];
  let receivedCount = 0;
  for (const pack of (context.gdeltQueryPacks || GDELT_QUERY_PACKS).slice(0, 3)) {
    const payload = await context.fetchJson(gdeltDocUrl(pack, 6), "GDELT DOC API");
    const articles = Array.isArray(payload.articles) ? payload.articles : [];
    receivedCount += articles.length;
    for (const article of articles) {
      const result = normalizeGdeltArticle(article, pack, now);
      if (result.event) events.push(result.event);
      else rejected.push({ id: article?.url || null, errors: result.errors });
    }
  }

  const clusters = clusterDiscoveryLeads(events);
  for (const cluster of clusters) {
    const promotion = evaluateLeadPromotion(cluster);
    for (const event of cluster.leads) {
      event.clusterId = cluster.id;
      event.independentSourceCount = promotion.independentSourceCount || 1;
      event.verification = { ...(event.verification || {}), ...promotion };
      event.metadata = { ...event.metadata, clusterId: cluster.id, promotion };
    }
  }

  return {
    events,
    rejected,
    receivedCount,
    recordsClustered: clusters.length,
    recordsPromoted: 0,
    warnings: ["GDELT records are discovery leads only and are not promoted automatically."],
  };
}
