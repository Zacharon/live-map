# Provider Adapters

Every future provider should implement:

```js
{
  id,
  name,
  enabled,
  credentialRequired,
  fetchData,
  normalize,
  healthCheck,
  getAttribution,
  getRefreshInterval,
  getLegalNotes
}
```

Every future provider should also satisfy the safer adapter result contract in `src/sources/source-adapter-contract.js`:

```js
{
  providerId,
  status,
  attemptedAt,
  succeededAt,
  durationMs,
  receivedCount,
  acceptedCount,
  rejectedCount,
  duplicateCount,
  events,
  warnings,
  safeError,
  stale,
  cacheAgeMs,
  nextSuggestedRefreshAt
}
```

Provider keys must stay in Netlify Functions or another server-side runtime. Browser JavaScript must never receive private API keys.

Before an adapter is enabled, the matching master source registry entry must document access classification, implementation status, source tier, attribution, terms URL, docs URL, cache policy, retention policy, review dates, and environment variable names.

Runtime provider entries must include `sourceRegistryId`, pointing at exactly one master source registry entry. Live providers must map to implemented live master sources. Planned sources may exist without adapters, but link-only sources cannot have runtime adapters.

Current adapters:

- USGS events through the provider orchestrator and `src/data/providers/usgs.js`
- NASA EONET events through the provider orchestrator and `src/data/providers/eonet.js`
- NOAA/NWS alerts through `src/data/providers/nws-alerts.js`
- GDACS global disasters through `src/data/providers/gdacs.js`
- ReliefWeb humanitarian reports through `src/data/providers/reliefweb.js`; this is configuration-required until `RELIEFWEB_APPNAME` is set server-side.
- CISA Known Exploited Vulnerabilities through `src/data/providers/cisa-kev.js`; this produces non-geographic technology/cyber events.
- NIST NVD CVE API enrichment through `src/data/providers/nvd.js`; this only performs focused CVE lookups and does not bulk-ingest the CVE catalog.
- SEC EDGAR filings through `src/data/providers/sec-edgar.js`; configuration-required until `SEC_CONTACT_EMAIL` and a controlled CIK allowlist are configured.
- FRED macroeconomic observations through `src/data/providers/fred.js`; configuration-required until `FRED_API_KEY` is configured and series remain allowlisted.
- EIA energy observations through `src/data/providers/eia.js`; configuration-required until `EIA_API_KEY` is configured and datasets remain allowlisted.
- GDELT discovery leads through `src/data/providers/gdelt.js`; configuration-required until `GDELT_ENABLED=true`, metadata-only, and never auto-promoted to confirmed events.
- Official RSS/Atom feeds through `src/data/providers/rss-feed.js`; allowlisted feeds only, SSRF-protected fetches, metadata-only excerpts, and original source links.
- Security, weather, health/humanitarian, and positive-development RSS groups use the same adapter but separate provider IDs and opt-in environment flags. They default to `configuration-required` and do not fetch upstream until explicitly enabled.
- Official Statuspage incidents through `src/data/providers/statuspage.js`; active unresolved incidents only, non-geographic by default.
- RIPEstat observations through `src/data/providers/ripestat.js`; configuration-required until `RIPESTAT_SOURCEAPP` and `RIPESTAT_RESOURCES` are configured, with anomaly rules in `src/data/providers/internet-anomaly-rules.js`.
- Cloudflare Radar boundary is documented in the source registry only; no adapter runs until a future authenticated implementation is reviewed.
- Development finance fixture in `src/finance/finance-adapter.js`
- Disabled AI brief endpoint in `netlify/functions/briefs.mjs`
- Source registry endpoint in `netlify/functions/sources.mjs`
- Sanitized provider diagnostics endpoint in `netlify/functions/provider-health.mjs`

Shared provider infrastructure:

- `src/data/providers/orchestrator.js` preserves Phase 1B provider orchestration, diagnostics, caching, deduplication, and provider health.
- `src/data/providers/scheduling.js` defines conservative refresh guidance, cache TTLs, stale windows, request budgets, and retry policies.
- `src/data/providers/request-budget.js` tracks in-memory request budgets so providers can fail visibly instead of silently over-polling.
- `src/data/providers/provider-state.js` tracks incremental provider state for filings, observations, revisions, and duplicate prevention.
- `src/data/providers/capability-registry.js` documents provider capability boundaries, geography support, credential state, record kinds, and implementation notes.
- `src/data/providers/opensky.js` normalizes aircraft state vectors and requires viewport-limited server-side OAuth credentials.
- `src/data/providers/global-fishing-watch.js` normalizes vessel-style records but remains configuration-required until endpoint terms are reviewed.
- `src/data/providers/aishub.js` documents the AIS participation/access boundary.
- `netlify/functions/moving-objects.mjs` validates bounding boxes, caps results, and rejects global moving-object requests.
- `src/data/providers/provider-state.js` also exposes durable-provider-state interface methods for provider state, cache entries, request budgets, and refresh locks. The current implementation is safe in-memory storage with a future Netlify Blobs boundary.
- `src/events/normalized-event.js` supports explicit non-geographic events with `geographic: false`, `mapDisplayStatus`, and `nonGeographicReason`.
- `src/events/normalized-event.js` supports `recordKind` values: `event`, `observation`, `discovery-lead`, and `moving-object`.

Scaffolding:

- `scripts/create-provider.mjs` creates a disabled provider adapter stub, fixture README, and provider doc skeleton. It does not register or enable the provider.
- See `docs/PROVIDER_ADAPTER_TEMPLATE.md`.

# Open News and Social Adapters

`open-news-social.js` provides bounded, server-side, configuration-gated normalizers for YouTube, Bluesky, Mastodon, Hacker News, Wikimedia, Twitch, and Kick. `rss-feed.js` supports allowlisted RSS, Atom, and JSON Feed documents. All produce metadata-only observations.
