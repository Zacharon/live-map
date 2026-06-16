const DEFAULT_PUBLIC_API_LIMIT = 120;
const DEFAULT_PUBLIC_API_WINDOW_SECONDS = 60;
const DEFAULT_MAX_API_BODY_BYTES = 16 * 1024;
const MAX_BUCKETS = 4096;

const apiBuckets = new Map();

function positiveInteger(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function clientKey(request) {
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const fallback = request.headers.get("x-real-ip") || "anonymous";
  return String(cloudflareIp || forwardedFor || fallback).trim().slice(0, 80) || "anonymous";
}

function routeKey(request) {
  const url = new URL(request.url);
  return `${url.pathname}:${clientKey(request)}`;
}

function cleanupExpiredBuckets(now) {
  if (apiBuckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of apiBuckets.entries()) {
    if (bucket.resetAt <= now) apiBuckets.delete(key);
  }
  while (apiBuckets.size > MAX_BUCKETS) {
    const oldest = apiBuckets.keys().next().value;
    apiBuckets.delete(oldest);
  }
}

export function apiBodyLimitBytes(env = {}) {
  return positiveInteger(env.API_MAX_BODY_BYTES, DEFAULT_MAX_API_BODY_BYTES, { min: 1024, max: 1024 * 1024 });
}

export function apiContentLength(request) {
  const header = request.headers.get("content-length");
  if (!header) return null;
  const parsed = Number(header);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function apiRateLimitPolicy(env = {}) {
  return {
    limit: positiveInteger(env.API_RATE_LIMIT_REQUESTS, DEFAULT_PUBLIC_API_LIMIT, { min: 1, max: 10_000 }),
    windowSeconds: positiveInteger(env.API_RATE_LIMIT_WINDOW_SECONDS, DEFAULT_PUBLIC_API_WINDOW_SECONDS, { min: 1, max: 3600 }),
  };
}

export function checkApiRateLimit(request, env = {}, options = {}) {
  if (request.method === "OPTIONS") {
    return { allowed: true };
  }
  const now = options.now ?? Date.now();
  const policy = apiRateLimitPolicy(env);
  const key = routeKey(request);
  const current = apiBuckets.get(key);
  const windowMs = policy.windowSeconds * 1000;
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };

  if (bucket.count >= policy.limit) {
    return {
      allowed: false,
      limit: policy.limit,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  apiBuckets.set(key, bucket);
  cleanupExpiredBuckets(now);
  return {
    allowed: true,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function jsonRateLimitResponse(result) {
  return Response.json(
    {
      error: "rate-limited",
      message: "Too many API requests. Please retry later.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
        "retry-after": String(result.retryAfterSeconds),
        "x-ratelimit-limit": String(result.limit),
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

export function jsonPayloadTooLargeResponse() {
  return Response.json(
    {
      error: "payload-too-large",
      message: "Request body is too large.",
    },
    {
      status: 413,
      headers: {
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    }
  );
}

export function resetApiRateLimiterForTests() {
  apiBuckets.clear();
}
