import { orchestrateProviders } from "../../src/data/providers/orchestrator.js";
import { EVENT_PROVIDERS } from "../../src/data/providers/registry.js";
import { jsonResponse } from "./lib/response.mjs";

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

export default async (request) => {
  const url = new URL(request.url);
  const hours = Math.min(720, Math.max(24, Number(url.searchParams.get("hours") || 168)));
  const result = await orchestrateProviders({ hours, now: Date.now() });
  const resultByProvider = Object.fromEntries((result.providerResults || []).map((item) => [item.providerId, item]));
  const providers = Object.entries(result.sourceStatus || {}).map(([providerId, status]) => sanitizeStatus(providerId, status, resultByProvider[providerId] || {}));
  return jsonResponse({
    systemStatus: result.systemStatus,
    mode: result.mode,
    providers,
    note: "Technical diagnostics are sanitized and not a security boundary.",
  }, {
    sourceStatus: result.sourceStatus,
    warnings: result.errors || [],
    cacheControl: "no-store",
  });
};
