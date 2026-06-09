import { stableStringHash } from "../../events/normalized-event.js";

export function canonicalizeUrl(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    return url.href.replace(/\/$/, "");
  } catch {
    return String(value || "").trim();
  }
}

function words(value = "") {
  return new Set(String(value).toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((word) => word.length > 3));
}

export function titleSimilarity(a = "", b = "") {
  const left = words(a);
  const right = words(b);
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((word) => right.has(word)).length;
  return overlap / Math.max(left.size, right.size);
}

export function clusterDiscoveryLeads(leads = []) {
  const clusters = [];
  for (const lead of leads) {
    const canonicalUrl = canonicalizeUrl(lead.sourceUrl);
    const match = clusters.find((cluster) => {
      if (cluster.urls.has(canonicalUrl)) return true;
      const samePublisher = cluster.publishers.has(lead.publisher || lead.sourceName);
      const closeTime = Math.abs(new Date(cluster.startedAt).getTime() - new Date(lead.startedAt).getTime()) <= 24 * 60 * 60 * 1000;
      return samePublisher && closeTime && titleSimilarity(cluster.title, lead.title) >= 0.72;
    });
    if (match) {
      match.leads.push(lead);
      match.urls.add(canonicalUrl);
      match.publishers.add(lead.publisher || lead.sourceName);
      match.updatedAt = new Date(Math.max(new Date(match.updatedAt).getTime(), new Date(lead.updatedAt).getTime())).toISOString();
    } else {
      clusters.push({
        id: `lead-cluster:${stableStringHash(`${canonicalUrl}:${lead.title}`)}`,
        title: lead.title,
        startedAt: lead.startedAt,
        updatedAt: lead.updatedAt,
        leads: [lead],
        urls: new Set([canonicalUrl]),
        publishers: new Set([lead.publisher || lead.sourceName]),
      });
    }
  }
  return clusters.map((cluster) => ({
    ...cluster,
    urls: [...cluster.urls],
    publishers: [...cluster.publishers],
    independentSourceCount: new Set(cluster.leads.map((lead) => lead.publisher || lead.sourceName || lead.provider)).size,
  }));
}

