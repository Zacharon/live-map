const memoryStore = new Map();
const CACHE_VERSION = 1;

function cacheRecord(payload, metadata = {}) {
  return {
    cacheVersion: CACHE_VERSION,
    payload,
    metadata: {
      storedAt: new Date().toISOString(),
      expiresAt: metadata.expiresAt || null,
      providerResponseAt: metadata.providerResponseAt || null,
      lastSuccessfulFetchAt: metadata.lastSuccessfulFetchAt || null,
      sourceFreshness: metadata.sourceFreshness || null,
      ...metadata,
    },
  };
}

function isExpired(record, now = Date.now()) {
  const expiresAt = record?.metadata?.expiresAt ? new Date(record.metadata.expiresAt).getTime() : null;
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

export function createMemoryProviderCache() {
  return {
    type: "memory",
    async get(providerId) {
      const record = memoryStore.get(providerId) || null;
      return record && !isExpired(record) ? record : null;
    },
    async set(providerId, payload, metadata = {}) {
      const record = cacheRecord(payload, metadata);
      memoryStore.set(providerId, record);
      return record;
    },
    async delete(providerId) {
      memoryStore.delete(providerId);
    },
  };
}

export async function createProviderCache() {
  if (globalThis?.process?.env?.NETLIFY_BLOBS_PROVIDER_CACHE !== "true") {
    return createMemoryProviderCache();
  }
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("live-map-provider-cache");
    return {
      type: "netlify-blobs",
      async get(providerId) {
        const record = await store.get(providerId, { type: "json" });
        return record && !isExpired(record) ? record : null;
      },
      async set(providerId, payload, metadata = {}) {
        const record = cacheRecord(payload, metadata);
        await store.setJSON(providerId, record);
        return record;
      },
      async delete(providerId) {
        await store.delete(providerId);
      },
    };
  } catch {
    return createMemoryProviderCache();
  }
}

