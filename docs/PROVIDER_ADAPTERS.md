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

Provider keys must stay in Netlify Functions or another server-side runtime. Browser JavaScript must never receive private API keys.

Current adapters:

- USGS events in `netlify/functions/events.mjs`
- NASA EONET events in `netlify/functions/events.mjs`
- Development finance fixture in `src/finance/finance-adapter.js`
- Disabled AI brief endpoint in `netlify/functions/briefs.mjs`

