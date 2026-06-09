import { createNormalizedEvent, stableStringHash } from "../../events/normalized-event.js";
import { OFFICIAL_FEED_REGISTRY } from "./feed-registry.js";
import { applyPublicationPolicy } from "./publication-policy.js";
import { assertSafeFetchUrl, assertSafeRedirect } from "./ssrf-protection.js";

const PROVIDER_ENABLE_FLAGS = {
  "security-rss": "SECURITY_RSS_ENABLED",
  "weather-rss": "WEATHER_RSS_ENABLED",
  "health-rss": "HEALTH_RSS_ENABLED",
  "positive-rss": "POSITIVE_RSS_ENABLED",
};

function decodeEntities(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function tagValue(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function linkValue(xml) {
  const href = String(xml).match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
  return decodeEntities(href || tagValue(xml, "link"));
}

export function parseFeedItems(xml = "") {
  const text = String(xml);
  const rssItems = [...text.matchAll(/<item[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const atomEntries = [...text.matchAll(/<entry[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  const chunks = rssItems.length ? rssItems : atomEntries;
  return chunks.map((chunk) => ({
    title: tagValue(chunk, "title"),
    link: linkValue(chunk),
    guid: tagValue(chunk, "guid") || tagValue(chunk, "id") || linkValue(chunk),
    publishedAt: tagValue(chunk, "pubDate") || tagValue(chunk, "published") || tagValue(chunk, "updated"),
    updatedAt: tagValue(chunk, "updated") || tagValue(chunk, "pubDate") || tagValue(chunk, "published"),
    summary: tagValue(chunk, "description") || tagValue(chunk, "summary") || tagValue(chunk, "content"),
  }));
}

async function fetchTextWithSafety(url, options = {}) {
  let current = assertSafeFetchUrl(url).href;
  for (let redirect = 0; redirect < 3; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 12000);
    try {
      const response = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9",
          "user-agent": options.userAgent || "LiveWorldMap/1.0 (+https://liveworldmap.netlify.app/)",
          ...(options.headers || {}),
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        current = assertSafeRedirect(current, response.headers.get("location") || "").href;
        continue;
      }
      if (!response.ok) throw new Error(`Feed returned ${response.status}`);
      const text = await response.text();
      return text.slice(0, options.maxBytes || 1024 * 1024);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Too many feed redirects");
}

export function normalizeFeedItem(item, feed, now = new Date()) {
  if (!item?.title || !item?.link) return { event: null, errors: ["missing title or link"] };
  const startedAt = item.publishedAt || item.updatedAt || now;
  const result = createNormalizedEvent({
    id: `${feed.providerId}:${feed.id}:${stableStringHash(item.guid || item.link || item.title)}`,
    provider: feed.providerId,
    providerEventId: `${feed.id}:${item.guid || item.link}`,
    recordKind: "discovery-lead",
    domain: feed.domain,
    category: feed.category,
    type: feed.type,
    title: item.title,
    description: applyPublicationPolicy(item.summary || item.title, feed.publicationPolicy),
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "Official feed item has no verified event coordinates.",
    startedAt,
    updatedAt: item.updatedAt || startedAt,
    ingestedAt: now,
    severity: feed.domain === "technology-cyber" ? 42 : 35,
    confidence: feed.sourceTier === "tier-1-primary-official" ? 78 : 55,
    status: "monitoring",
    sourceName: feed.name,
    sourceUrl: item.link,
    sourceType: "Official feed",
    sourceTier: feed.sourceTier,
    publisher: feed.name,
    sourcePublishedAt: startedAt,
    verification: {
      state: feed.verificationState || "reported",
      evidenceLevel: "official-feed-metadata",
      independentSourceCount: 1,
    },
    publicationPolicy: feed.publicationPolicy,
    tags: ["official-feed", feed.id, feed.domain],
    metadata: {
      verificationStatus: feed.verificationState || "reported",
      coordinateMethod: "not applicable",
      copyrightPolicy: feed.publicationPolicy?.recordText || "metadata-only",
      feedId: feed.id,
      details: {
        Feed: feed.name,
        "Record kind": "Discovery lead",
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

export async function fetchOfficialFeedEvents(context = {}) {
  const flag = PROVIDER_ENABLE_FLAGS[context.provider?.id];
  if (flag && String(globalThis?.process?.env?.[flag] || "").toLowerCase() !== "true") {
    return {
      events: [],
      rejected: [],
      status: "configuration-required",
      warnings: [`${flag}=true is required before ${context.provider.id} fetches run.`],
      safeError: `${context.provider.name || context.provider.id} is implemented but disabled until ${flag}=true is configured.`,
      requestAttempted: false,
    };
  }
  const now = new Date(context.now);
  const events = [];
  const rejected = [];
  let receivedCount = 0;
  const registry = context.feedRegistry || OFFICIAL_FEED_REGISTRY;
  const providerId = context.provider?.id || "official-rss";
  const selectedFeeds = registry.filter((feed) => feed.providerId === providerId);
  for (const feed of selectedFeeds.slice(0, 8)) {
    const xml = await fetchTextWithSafety(feed.url, {
      timeoutMs: context.provider?.timeoutMs || context.schedule?.requestTimeoutMs || 12000,
      userAgent: context.provider?.userAgent,
    });
    const items = parseFeedItems(xml).slice(0, 8);
    receivedCount += items.length;
    for (const item of items) {
      const result = normalizeFeedItem(item, feed, now);
      if (result.event) events.push(result.event);
      else rejected.push({ id: item.guid || item.link || null, errors: result.errors });
    }
  }
  return { events, rejected, receivedCount, warnings: ["Official RSS/Atom records are metadata-only feed items unless promoted by corroboration rules."] };
}

