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

- USGS events in `netlify/functions/events.mjs`
- NASA EONET events in `netlify/functions/events.mjs`
- Development finance fixture in `src/finance/finance-adapter.js`
- Disabled AI brief endpoint in `netlify/functions/briefs.mjs`
- Source registry endpoint in `netlify/functions/sources.mjs`

