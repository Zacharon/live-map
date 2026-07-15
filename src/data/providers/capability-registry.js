import { EVENT_PROVIDERS } from "./registry.js";

const DEFAULTS = {
  supportedRecordKinds: ["event"],
  supportedDomains: ["other"],
  supportsGeometry: false,
  supportsIncrementalFetch: false,
  supportsConditionalRequests: false,
  requiresKey: false,
  requiresRegistration: false,
  licenseClass: "open-public",
  defaultEnabled: true,
  expectedVolume: "low",
  sensitivityLevel: "low",
};

export const PROVIDER_CAPABILITIES = {
  usgs: capability({ supportedDomains: ["natural-disaster"], supportsGeometry: true, supportsIncrementalFetch: true, expectedVolume: "medium" }),
  eonet: capability({ supportedDomains: ["natural-disaster", "weather"], supportsGeometry: true, expectedVolume: "medium" }),
  "nws-alerts": capability({ supportedDomains: ["weather"], supportsGeometry: true, supportsIncrementalFetch: true, expectedVolume: "high" }),
  gdacs: capability({ supportedDomains: ["natural-disaster", "weather", "humanitarian"], supportsGeometry: true, expectedVolume: "medium" }),
  reliefweb: capability({ supportedDomains: ["humanitarian"], requiresRegistration: true, licenseClass: "appname-required", sensitivityLevel: "medium" }),
  "cisa-kev": capability({ supportedDomains: ["technology-cyber"], supportedRecordKinds: ["event", "observation"], supportsConditionalRequests: true }),
  nvd: capability({ supportedDomains: ["technology-cyber"], supportedRecordKinds: ["event", "observation"], supportsIncrementalFetch: true, supportsConditionalRequests: true, expectedVolume: "medium" }),
  "sec-edgar": capability({ supportedDomains: ["finance-markets"], requiresRegistration: true, supportsIncrementalFetch: true, expectedVolume: "medium" }),
  fred: capability({ supportedDomains: ["finance-markets", "commodity-supply-chain"], supportedRecordKinds: ["event", "observation"], requiresKey: true }),
  eia: capability({ supportedDomains: ["commodity-supply-chain", "infrastructure"], supportedRecordKinds: ["event", "observation"], requiresKey: true }),
  gdelt: capability({ supportedDomains: ["major-news", "infrastructure", "commodity-supply-chain"], supportedRecordKinds: ["discovery-lead"], licenseClass: "metadata-only", expectedVolume: "medium" }),
  "official-rss": capability({ supportedDomains: ["technology-cyber", "finance-markets", "infrastructure", "major-news"], supportedRecordKinds: ["discovery-lead"], supportsConditionalRequests: true }),
  "security-rss": capability({ supportedDomains: ["conflict-security", "major-news"], supportedRecordKinds: ["discovery-lead"], supportsConditionalRequests: true, sensitivityLevel: "medium" }),
  "weather-rss": capability({ supportedDomains: ["weather", "natural-disaster"], supportedRecordKinds: ["discovery-lead"], supportsConditionalRequests: true }),
  "health-rss": capability({ supportedDomains: ["health", "humanitarian"], supportedRecordKinds: ["discovery-lead"], supportsConditionalRequests: true, sensitivityLevel: "medium" }),
  "positive-rss": capability({ supportedDomains: ["positive-development"], supportedRecordKinds: ["discovery-lead"], supportsConditionalRequests: true }),
  statuspage: capability({ supportedDomains: ["technology-cyber", "infrastructure"], supportedRecordKinds: ["event"], expectedVolume: "low" }),
  ripestat: capability({ supportedDomains: ["infrastructure"], supportedRecordKinds: ["observation", "event"], requiresRegistration: true, expectedVolume: "low" }),
  "cloudflare-radar": capability({ supportedDomains: ["infrastructure", "technology-cyber"], supportedRecordKinds: ["observation"], requiresKey: true, defaultEnabled: false, licenseClass: "api-token-required" }),
  youtube: capability({ supportedDomains: ["major-news"], supportedRecordKinds: ["observation"], requiresKey: true, defaultEnabled: false, licenseClass: "api-key-required", expectedVolume: "medium" }),
  bluesky: capability({ supportedDomains: ["major-news"], supportedRecordKinds: ["observation"], defaultEnabled: false, expectedVolume: "medium" }),
  mastodon: capability({ supportedDomains: ["major-news"], supportedRecordKinds: ["observation"], defaultEnabled: false, expectedVolume: "medium" }),
  "hacker-news": capability({ supportedDomains: ["technology-cyber", "major-news"], supportedRecordKinds: ["observation"], defaultEnabled: false, expectedVolume: "medium" }),
  wikimedia: capability({ supportedDomains: ["identity-research", "major-news"], supportedRecordKinds: ["observation"], defaultEnabled: false, expectedVolume: "medium" }),
  twitch: capability({ supportedDomains: ["major-news"], supportedRecordKinds: ["observation"], requiresRegistration: true, defaultEnabled: false, licenseClass: "reviewed-api-access" }),
  kick: capability({ supportedDomains: ["major-news"], supportedRecordKinds: ["observation"], requiresRegistration: true, defaultEnabled: false, licenseClass: "reviewed-api-access" }),
  opensky: capability({ supportedDomains: ["aviation"], supportedRecordKinds: ["moving-object"], supportsGeometry: true, supportsIncrementalFetch: true, requiresKey: true, defaultEnabled: false, licenseClass: "oauth-client-credentials", expectedVolume: "high", sensitivityLevel: "medium" }),
  "global-fishing-watch": capability({ supportedDomains: ["maritime"], supportedRecordKinds: ["moving-object", "observation"], supportsGeometry: true, requiresKey: true, defaultEnabled: false, licenseClass: "api-token-required", expectedVolume: "medium", sensitivityLevel: "medium" }),
  aishub: capability({ supportedDomains: ["maritime"], supportedRecordKinds: ["moving-object"], supportsGeometry: true, requiresRegistration: true, defaultEnabled: false, licenseClass: "participation-required", expectedVolume: "high", sensitivityLevel: "medium" }),
};

function capability(overrides = {}) {
  return { ...DEFAULTS, ...overrides };
}
export function providerCapability(providerId) {
  return PROVIDER_CAPABILITIES[providerId] || capability();
}

export function validateProviderCapabilities(providers = EVENT_PROVIDERS, capabilities = PROVIDER_CAPABILITIES) {
  const errors = [];
  for (const provider of providers) {
    const capabilityRecord = capabilities[provider.id];
    if (!capabilityRecord) errors.push(`${provider.id} missing capability record`);
    if (capabilityRecord?.requiresKey && !provider.credentialRequired && !/configuration|required|authenticated/i.test(provider.integrationType || "")) {
      errors.push(`${provider.id} requires key but provider metadata does not show controlled configuration`);
    }
    if (capabilityRecord?.supportedRecordKinds?.includes("moving-object") && !["aviation", "maritime"].some((domain) => capabilityRecord.supportedDomains.includes(domain))) {
      errors.push(`${provider.id} moving-object support must be aviation or maritime scoped`);
    }
  }
  return { valid: errors.length === 0, errors };
}
