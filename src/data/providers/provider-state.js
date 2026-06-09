const memoryState = new Map();

function keyFor(providerId, entityId) {
  return `${providerId}:${entityId || "default"}`;
}

export function createMemoryProviderStateStore() {
  return {
    async get(providerId, entityId = "default") {
      return memoryState.get(keyFor(providerId, entityId)) || null;
    },
    async update(providerId, entityId = "default", patch = {}) {
      const key = keyFor(providerId, entityId);
      const previous = memoryState.get(key) || {};
      const next = { ...previous, ...patch, providerId, entityId, updatedAt: new Date().toISOString() };
      memoryState.set(key, next);
      return next;
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
