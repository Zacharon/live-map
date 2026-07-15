import { createSourceObservation } from "../../intelligence/source-observations.js";

const ENABLE_FLAGS = {
  youtube: "YOUTUBE_ENABLED",
  bluesky: "BLUESKY_ENABLED",
  mastodon: "MASTODON_ENABLED",
  "hacker-news": "HACKER_NEWS_ENABLED",
  wikimedia: "WIKIMEDIA_ENABLED",
  twitch: "TWITCH_ENABLED",
  kick: "KICK_ENABLED",
};

function enabled(context, providerId) {
  return String(context.env?.[ENABLE_FLAGS[providerId]] || globalThis?.process?.env?.[ENABLE_FLAGS[providerId]] || "").toLowerCase() === "true";
}

export function normalizeOpenSignal(record = {}, provider = {}, now = new Date()) {
  const url = record.url || record.uri || record.link || `https://${provider.id}.invalid/${encodeURIComponent(record.id || "unknown")}`;
  return createSourceObservation({
    provider: provider.id,
    observationType: provider.observationType || "social",
    externalId: record.id || record.uri || record.url,
    url,
    title: record.title || record.text || record.content || "Untitled signal",
    excerpt: record.description || record.summary || record.text || record.content || "",
    publishedAt: record.publishedAt || record.created_at || record.createdAt || record.time,
    sourceOrganizationId: record.sourceOrganizationId || record.channelId || record.author?.did || record.account?.acct || record.by || provider.id,
    sourceOrganizationName: record.sourceOrganizationName || record.channelTitle || record.author?.displayName || record.account?.display_name || record.by || provider.name,
    publisher: record.publisher || record.channelTitle || record.author?.handle || record.account?.acct || record.by || provider.name,
    language: record.lang || record.language || "und",
    authorHandle: record.author?.handle || record.account?.acct || record.by || null,
    channelId: record.channelId || record.author?.did || null,
    engagement: record.score || record.likeCount || record.favourites_count || null,
    sourceTier: provider.sourceTier,
    verificationState: "unverified",
  }, now);
}

function recordsForPayload(providerId, payload) {
  if (providerId === "hacker-news") return Array.isArray(payload) ? payload : payload.hits || [];
  if (providerId === "bluesky") return payload.posts || [];
  if (providerId === "mastodon") return Array.isArray(payload) ? payload : payload.statuses || [];
  if (providerId === "youtube") return payload.items || [];
  if (providerId === "wikimedia") return payload.query?.recentchanges || payload.items || [];
  return payload.items || [];
}

function endpointFor(provider, context) {
  const watch = (context.watchlist || ["global risk"]).slice(0, 3).join(" ");
  if (provider.id === "hacker-news") return `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(watch)}&tags=story&hitsPerPage=20`;
  if (provider.id === "bluesky") return `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(watch)}&limit=25`;
  if (provider.id === "youtube") return `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&order=date&q=${encodeURIComponent(watch)}&key=${encodeURIComponent(context.env?.YOUTUBE_API_KEY || "")}`;
  if (provider.id === "mastodon") return `${context.env?.MASTODON_INSTANCE_URL || ""}/api/v2/search?q=${encodeURIComponent(watch)}&type=statuses&limit=20`;
  if (provider.id === "wikimedia") return `https://en.wikipedia.org/w/api.php?action=query&format=json&list=recentchanges&rclimit=20&rcprop=title|timestamp|ids|user`;
  return null;
}

export async function fetchOpenNewsSocialSignals(context = {}) {
  const provider = context.provider || {};
  const flag = ENABLE_FLAGS[provider.id];
  const missingKey = provider.id === "youtube" && !context.env?.YOUTUBE_API_KEY;
  const missingInstance = provider.id === "mastodon" && !context.env?.MASTODON_INSTANCE_URL;
  if (!enabled(context, provider.id) || missingKey || missingInstance) {
    const needs = [flag && `${flag}=true`, missingKey && "YOUTUBE_API_KEY", missingInstance && "MASTODON_INSTANCE_URL"].filter(Boolean).join(" and ");
    return { events: [], observations: [], rejected: [], status: "configuration-required", requestAttempted: false, safeError: `${provider.name} is implemented but requires ${needs || "approved server-side configuration"}.` };
  }
  if (["twitch", "kick"].includes(provider.id)) {
    return { events: [], observations: [], rejected: [], status: "configuration-required", requestAttempted: false, safeError: `${provider.name} has an approved configuration boundary but no polling is enabled without a reviewed channel allowlist.` };
  }
  const endpoint = endpointFor(provider, context);
  if (!endpoint) return { events: [], observations: [], rejected: [], status: "configuration-required", requestAttempted: false, safeError: "No approved endpoint is configured." };
  const payload = await context.fetchJson(endpoint, provider.name);
  const observations = recordsForPayload(provider.id, payload).slice(0, 25).map((item) => normalizeOpenSignal(item, provider, new Date(context.now)));
  return { events: [], observations, rejected: [], receivedCount: observations.length, warnings: ["Open news and social records remain metadata-only observations; trend volume does not establish verification."] };
}
