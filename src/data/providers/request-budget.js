const memoryBudgets = new Map();

function nextUtcMidnight(now = Date.now()) {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

export function createBudgetState(providerId, allowedRequests, now = Date.now()) {
  return {
    providerId,
    period: "daily",
    allowedRequests,
    usedRequests: 0,
    remainingRequests: allowedRequests,
    resetsAt: new Date(nextUtcMidnight(now)).toISOString(),
    lastRequestAt: null,
    status: "ok",
  };
}

export function retryAfterMs(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = new Date(value).getTime();
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

export function createMemoryRequestBudgetStore() {
  return {
    async get(providerId, allowedRequests) {
      const existing = memoryBudgets.get(providerId);
      if (!existing || new Date(existing.resetsAt).getTime() <= Date.now()) {
        const fresh = createBudgetState(providerId, allowedRequests);
        memoryBudgets.set(providerId, fresh);
        return fresh;
      }
      return existing;
    },
    async recordRequest(providerId, allowedRequests) {
      const budget = await this.get(providerId, allowedRequests);
      const usedRequests = budget.usedRequests + 1;
      const next = {
        ...budget,
        usedRequests,
        remainingRequests: Math.max(0, budget.allowedRequests - usedRequests),
        lastRequestAt: new Date().toISOString(),
        status: usedRequests >= budget.allowedRequests ? "exhausted" : "ok",
      };
      memoryBudgets.set(providerId, next);
      return next;
    },
    async setRateLimited(providerId, allowedRequests, retryAfter = null) {
      const budget = await this.get(providerId, allowedRequests);
      const next = { ...budget, status: "rate-limited", retryAfterMs: retryAfterMs(retryAfter) };
      memoryBudgets.set(providerId, next);
      return next;
    },
    async setDisabled(providerId, allowedRequests, reason) {
      const budget = await this.get(providerId, allowedRequests);
      const next = { ...budget, status: "disabled", reason };
      memoryBudgets.set(providerId, next);
      return next;
    },
  };
}

export async function createRequestBudgetStore() {
  return createMemoryRequestBudgetStore();
}
