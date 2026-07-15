const MIN_REFRESH_MS = 5 * 60 * 1000;
const MIN_CACHE_TTL_MS = 60 * 1000;

export const PROVIDER_SCHEDULES = {
  usgs: schedule("usgs", { refreshIntervalMs: 2 * 60 * 1000, cacheTtlMs: 2 * 60 * 1000, staleAfterMs: 15 * 60 * 1000, dailyRequestBudget: 720 }),
  eonet: schedule("eonet", { refreshIntervalMs: 2 * 60 * 1000, cacheTtlMs: 5 * 60 * 1000, staleAfterMs: 30 * 60 * 1000, dailyRequestBudget: 720 }),
  "nws-alerts": schedule("nws-alerts", { refreshIntervalMs: 2 * 60 * 1000, cacheTtlMs: 2 * 60 * 1000, staleAfterMs: 10 * 60 * 1000, dailyRequestBudget: 720 }),
  gdacs: schedule("gdacs", { refreshIntervalMs: 10 * 60 * 1000, cacheTtlMs: 10 * 60 * 1000, staleAfterMs: 30 * 60 * 1000, dailyRequestBudget: 144 }),
  reliefweb: schedule("reliefweb", { refreshIntervalMs: 20 * 60 * 1000, cacheTtlMs: 15 * 60 * 1000, staleAfterMs: 4 * 60 * 60 * 1000, requestTimeoutMs: 15000, dailyRequestBudget: 144 }),
  "cisa-kev": schedule("cisa-kev", { refreshIntervalMs: 60 * 60 * 1000, cacheTtlMs: 60 * 60 * 1000, staleAfterMs: 24 * 60 * 60 * 1000, requestTimeoutMs: 15000, dailyRequestBudget: 48 }),
  nvd: schedule("nvd", { refreshIntervalMs: 2 * 60 * 60 * 1000, cacheTtlMs: 2 * 60 * 60 * 1000, staleAfterMs: 24 * 60 * 60 * 1000, requestTimeoutMs: 15000, dailyRequestBudget: 40 }),
  "sec-edgar": schedule("sec-edgar", { refreshIntervalMs: 5 * 60 * 1000, cacheTtlMs: 5 * 60 * 1000, staleAfterMs: 60 * 60 * 1000, requestTimeoutMs: 15000, maximumRetries: 1, dailyRequestBudget: 180 }),
  fred: schedule("fred", { refreshIntervalMs: 60 * 60 * 1000, cacheTtlMs: 60 * 60 * 1000, staleAfterMs: 24 * 60 * 60 * 1000, requestTimeoutMs: 15000, maximumRetries: 1, dailyRequestBudget: 48 }),
  eia: schedule("eia", { refreshIntervalMs: 60 * 60 * 1000, cacheTtlMs: 60 * 60 * 1000, staleAfterMs: 12 * 60 * 60 * 1000, requestTimeoutMs: 15000, maximumRetries: 1, dailyRequestBudget: 72 }),
  gdelt: schedule("gdelt", { refreshIntervalMs: 15 * 60 * 1000, cacheTtlMs: 15 * 60 * 1000, staleAfterMs: 2 * 60 * 60 * 1000, requestTimeoutMs: 15000, maximumRetries: 1, dailyRequestBudget: 96 }),
  "official-rss": schedule("official-rss", { refreshIntervalMs: 20 * 60 * 1000, cacheTtlMs: 20 * 60 * 1000, staleAfterMs: 4 * 60 * 60 * 1000, requestTimeoutMs: 15000, maximumRetries: 1, dailyRequestBudget: 96 }),
  "security-rss": schedule("security-rss", { refreshIntervalMs: 30 * 60 * 1000, cacheTtlMs: 30 * 60 * 1000, staleAfterMs: 6 * 60 * 60 * 1000, requestTimeoutMs: 15000, maximumRetries: 1, dailyRequestBudget: 72 }),
  "weather-rss": schedule("weather-rss", { refreshIntervalMs: 15 * 60 * 1000, cacheTtlMs: 15 * 60 * 1000, staleAfterMs: 2 * 60 * 60 * 1000, requestTimeoutMs: 15000, maximumRetries: 1, dailyRequestBudget: 96 }),
  "health-rss": schedule("health-rss", { refreshIntervalMs: 60 * 60 * 1000, cacheTtlMs: 60 * 60 * 1000, staleAfterMs: 12 * 60 * 60 * 1000, requestTimeoutMs: 15000, maximumRetries: 1, dailyRequestBudget: 48 }),
  "positive-rss": schedule("positive-rss", { refreshIntervalMs: 6 * 60 * 60 * 1000, cacheTtlMs: 6 * 60 * 60 * 1000, staleAfterMs: 48 * 60 * 60 * 1000, requestTimeoutMs: 15000, maximumRetries: 1, dailyRequestBudget: 24 }),
  statuspage: schedule("statuspage", { refreshIntervalMs: 5 * 60 * 1000, cacheTtlMs: 5 * 60 * 1000, staleAfterMs: 60 * 60 * 1000, requestTimeoutMs: 12000, maximumRetries: 1, dailyRequestBudget: 180 }),
  ripestat: schedule("ripestat", { refreshIntervalMs: 30 * 60 * 1000, cacheTtlMs: 30 * 60 * 1000, staleAfterMs: 6 * 60 * 60 * 1000, requestTimeoutMs: 15000, maximumRetries: 1, dailyRequestBudget: 72 }),
  youtube: schedule("youtube", { refreshIntervalMs: 30 * 60 * 1000, cacheTtlMs: 30 * 60 * 1000, staleAfterMs: 6 * 60 * 60 * 1000, dailyRequestBudget: 48 }),
  bluesky: schedule("bluesky", { refreshIntervalMs: 15 * 60 * 1000, cacheTtlMs: 15 * 60 * 1000, staleAfterMs: 2 * 60 * 60 * 1000, dailyRequestBudget: 96 }),
  mastodon: schedule("mastodon", { refreshIntervalMs: 20 * 60 * 1000, cacheTtlMs: 20 * 60 * 1000, staleAfterMs: 4 * 60 * 60 * 1000, dailyRequestBudget: 72 }),
  "hacker-news": schedule("hacker-news", { refreshIntervalMs: 15 * 60 * 1000, cacheTtlMs: 15 * 60 * 1000, staleAfterMs: 2 * 60 * 60 * 1000, dailyRequestBudget: 96 }),
  wikimedia: schedule("wikimedia", { refreshIntervalMs: 30 * 60 * 1000, cacheTtlMs: 30 * 60 * 1000, staleAfterMs: 6 * 60 * 60 * 1000, dailyRequestBudget: 48 }),
  twitch: schedule("twitch", { refreshIntervalMs: 30 * 60 * 1000, cacheTtlMs: 30 * 60 * 1000, staleAfterMs: 6 * 60 * 60 * 1000, dailyRequestBudget: 24 }),
  kick: schedule("kick", { refreshIntervalMs: 30 * 60 * 1000, cacheTtlMs: 30 * 60 * 1000, staleAfterMs: 6 * 60 * 60 * 1000, dailyRequestBudget: 24 }),
};

export function schedule(providerId, overrides = {}) {
  return {
    providerId,
    refreshIntervalMs: overrides.refreshIntervalMs ?? MIN_REFRESH_MS,
    cacheTtlMs: overrides.cacheTtlMs ?? 10 * 60 * 1000,
    staleAfterMs: overrides.staleAfterMs ?? 60 * 60 * 1000,
    retryIntervalMs: overrides.retryIntervalMs ?? 5 * 60 * 1000,
    circuitBreakerCooldownMs: overrides.circuitBreakerCooldownMs ?? 30 * 60 * 1000,
    requestTimeoutMs: overrides.requestTimeoutMs ?? 12000,
    maximumRetries: overrides.maximumRetries ?? 2,
    backoffBaseMs: overrides.backoffBaseMs ?? 300,
    dailyRequestBudget: overrides.dailyRequestBudget ?? 144,
    enabled: overrides.enabled !== false,
  };
}

export function validateProviderSchedule(config) {
  const errors = [];
  if (!config?.providerId) errors.push("providerId is required");
  if (config?.refreshIntervalMs < MIN_REFRESH_MS) errors.push(`${config.providerId} refreshIntervalMs is dangerously low`);
  if (config?.cacheTtlMs < MIN_CACHE_TTL_MS) errors.push(`${config.providerId} cacheTtlMs is dangerously low`);
  if (config?.staleAfterMs < config?.cacheTtlMs) errors.push(`${config.providerId} staleAfterMs must be >= cacheTtlMs`);
  if (config?.dailyRequestBudget > 900) errors.push(`${config.providerId} dailyRequestBudget leaves too little provider quota headroom`);
  return { valid: errors.length === 0, errors };
}

export function scheduleForProvider(providerId) {
  return PROVIDER_SCHEDULES[providerId] || schedule(providerId);
}
