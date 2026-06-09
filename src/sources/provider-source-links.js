import { PROVIDER_SOURCE_REGISTRY } from "../data/providers/source-registry.js";
import { MASTER_SOURCE_REGISTRY, sourceById } from "./master-source-registry.js";

export function validateProviderSourceLinks({
  providers = PROVIDER_SOURCE_REGISTRY,
  sources = MASTER_SOURCE_REGISTRY,
} = {}) {
  const errors = [];
  const liveProviders = providers.filter((provider) => provider.implemented || provider.status === "live");
  for (const provider of liveProviders) {
    if (!provider.sourceRegistryId) {
      errors.push(`${provider.id} missing sourceRegistryId`);
      continue;
    }
    const source = sourceById(provider.sourceRegistryId, sources);
    if (!source) {
      errors.push(`${provider.id} maps to missing source ${provider.sourceRegistryId}`);
      continue;
    }
    if (source.status !== "live" || !source.implemented) {
      errors.push(`${provider.id} maps to non-live source ${source.id}`);
    }
    if (source.status === "link-only") {
      errors.push(`${provider.id} maps to link-only source ${source.id}`);
    }
  }

  const providerSourceIds = new Set(liveProviders.map((provider) => provider.sourceRegistryId).filter(Boolean));
  for (const source of sources.filter((sourceRecord) => sourceRecord.implemented || sourceRecord.status === "live")) {
    if (!source.adapterId) errors.push(`${source.id} is implemented without adapterId`);
    if (!providerSourceIds.has(source.id)) errors.push(`${source.id} is implemented without runtime provider mapping`);
  }

  for (const provider of providers) {
    if (provider.sourceRegistryId) {
      const source = sourceById(provider.sourceRegistryId, sources);
      if (source?.status === "link-only" && provider.implemented) errors.push(`${provider.id} implemented link-only source ${source.id}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
