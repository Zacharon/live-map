const memoryState = new Map();
const memoryCache = new Map();
const memoryBudgets = new Map();
const locks = new Map();

function keyFor(providerId, entityId) {
  return `${providerId}:${entityId || "default"}`;
}

export function createMemoryProviderStateStore() {
  return {
    mode: "memory",
    async get(providerId, entityId = "default") {
      return memoryState.get(keyFor(providerId, entityId)) || null;
    },
    async getProviderState(providerId, entityId = "default") {
      return this.get(providerId, entityId);
    },
    async setProviderState(providerId, entityId = "default", state = {}) {
      const next = { ...state, providerId, entityId, updatedAt: new Date().toISOString() };
      memoryState.set(keyFor(providerId, entityId), next);
      return next;
    },
    async update(providerId, entityId = "default", patch = {}) {
      const key = keyFor(providerId, entityId);
      const previous = memoryState.get(key) || {};
      const next = { ...previous, ...patch, providerId, entityId, updatedAt: new Date().toISOString() };
      memoryState.set(key, next);
      return next;
    },
    async getCacheEntry(providerId, cacheKey = "default") {
      return memoryCache.get(keyFor(providerId, cacheKey)) || null;
    },
    async setCacheEntry(providerId, cacheKey = "default", payload = null, metadata = {}) {
      const record = { providerId, cacheKey, payload, metadata, updatedAt: new Date().toISOString() };
      memoryCache.set(keyFor(providerId, cacheKey), record);
      return record;
    },
    async getBudgetState(providerId, budgetKey = "default") {
      return memoryBudgets.get(keyFor(providerId, budgetKey)) || null;
    },
    async setBudgetState(providerId, budgetKey = "default", state = {}) {
      const record = { ...state, providerId, budgetKey, updatedAt: new Date().toISOString() };
      memoryBudgets.set(keyFor(providerId, budgetKey), record);
      return record;
    },
    async acquireLock(providerId, lockKey = "default", ttlMs = 30000) {
      const key = keyFor(providerId, lockKey);
      const now = Date.now();
      const existing = locks.get(key);
      if (existing && existing.expiresAt > now) return { acquired: false, token: existing.token, expiresAt: existing.expiresAt };
      const token = `${now}:${Math.random().toString(36).slice(2)}`;
      const record = { acquired: true, token, expiresAt: now + ttlMs };
      locks.set(key, record);
      return record;
    },
    async releaseLock(providerId, lockKey = "default", token = null) {
      const key = keyFor(providerId, lockKey);
      const existing = locks.get(key);
      if (!existing || (token && existing.token !== token)) return false;
      locks.delete(key);
      return true;
    },
    async hasProcessed(providerId, entityId, recordId) {
      const state = await this.get(providerId, entityId);
      return Array.isArray(state?.processedRecordIds) && state.processedRecordIds.includes(recordId);
    },
    async markProcessed(providerId, entityId, recordId, patch = {}) {
      const state = await this.get(providerId, entityId);
      const processedRecordIds = [...new Set([...(state?.processedRecordIds || []), recordId])].slice(-500);
      return this.update(providerId, entityId, { ...patch, processedRecordIds });
    },
  };
}

export async function createProviderStateStore() {
  return createMemoryProviderStateStore();
}
