import { orchestrateProviders } from "../data/providers/orchestrator.js";
import { EVENT_PROVIDERS } from "../data/providers/registry.js";
import { parseHoursParam } from "./request-validation.js";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
};

async function withRuntimeEnv(env, callback) {
  if (!env || typeof env !== "object") return callback();
  const previousProcess = globalThis.process;
  const previousEnv = previousProcess?.env;
  const nextEnv = { ...(previousEnv || {}), ...env };
  if (previousProcess) previousProcess.env = nextEnv;
  else globalThis.process = { env: nextEnv };
  try {
    return await callback();
  } finally {
    if (previousProcess) previousProcess.env = previousEnv;
    else delete globalThis.process;
  }
}

function jsonResponse(data, options = {}) {
  const generatedAt = Date.now();
  const body = {
    data,
    generatedAt,
    sourceStatus: options.sourceStatus || {},
    warnings: options.warnings || [],
    errors: options.errors || [],
    requestId: options.requestId || `req-${generatedAt}-${Math.random().toString(36).slice(2, 8)}`,
  };
  return new Response(JSON.stringify(body), {
    status: options.status || 200,
    headers,
  });
}

function sanitizeStatus(providerId, status = {}, result = {}) {
  return {
    providerId,
    name: EVENT_PROVIDERS.find((provider) => provider.id === providerId)?.name || providerId,
    implementationStatus: status.status || "unknown",
    ok: Boolean(status.ok),
    lastAttemptedAt: status.lastAttemptedAt || null,
    lastSuccessfulAt: status.lastSuccessfulAt || null,
    durationMs: status.durationMs || result.durationMs || 0,
    receivedCount: result.recordCount ?? status.count ?? 0,
    acceptedCount: status.acceptedCount ?? status.count ?? 0,
    rejectedCount: status.rejectedCount ?? result.rejectedCount ?? 0,
    duplicateCount: status.duplicateCount ?? result.duplicateCount ?? 0,
    clusteredCount: status.recordsClustered ?? result.recordsClustered ?? 0,
    promotedCount: status.recordsPromoted ?? result.recordsPromoted ?? 0,
    requestBudget: status.requestBudget ? {
      status: status.requestBudget.status,
      remainingRequests: status.requestBudget.remainingRequests,
      limit: status.requestBudget.limit,
    } : null,
    retryState: result.errorCode || "none",
    cacheMode: status.stateStorageMode || result.stateStorageMode || "memory",
    stale: Boolean(status.stale),
    nextRefreshAt: status.nextScheduledRefreshAt || null,
    circuitBreakerState: result.circuitBreakerState || "closed",
    sanitizedError: result.errorMessage || status.message || null,
    adapterVersion: "1",
    sourceRegistryUrl: status.url || null,
    warnings: status.warnings || result.warnings || [],
  };
}

export async function createProviderHealthResponse(request, options = {}) {
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (request.method !== "GET") return jsonResponse(null, { status: 405, errors: ["Use GET for provider health."] });
  const warnings = [];
  const result = await withRuntimeEnv(options.env, async () => {
    const url = new URL(request.url);
    const hours = parseHoursParam(url.searchParams, warnings);
    return orchestrateProviders({ hours, now: Date.now(), env: options.env });
  });
  const resultByProvider = Object.fromEntries((result.providerResults || []).map((item) => [item.providerId, item]));
  const providers = Object.entries(result.sourceStatus || {}).map(([providerId, status]) => sanitizeStatus(providerId, status, resultByProvider[providerId] || {}));
  return jsonResponse({
    systemStatus: result.systemStatus,
    mode: options.runtimeMode || result.mode,
    providers,
    note: "Technical diagnostics are sanitized and not a security boundary.",
  }, {
    sourceStatus: result.sourceStatus,
    warnings: [...warnings, ...(result.errors || [])],
  });
}
