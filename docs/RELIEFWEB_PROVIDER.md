# ReliefWeb Provider

ReliefWeb uses the official V2 API at `https://api.reliefweb.int/v2/`.

- Reports endpoint: `/reports`
- Disaster endpoint: `/disasters`
- Required app identification: `RELIEFWEB_APPNAME`
- Appname status: pre-approved appname required by ReliefWeb
- Quotas: 1000 entries/request and 1000 calls/day
- Request method: POST for structured filters
- Polling plan: 20 minutes, capped recent `date.changed` windows
- Cache policy: server-side cache, 15-20 minute TTL, stale status visible

The adapter remains `configuration-required` until `RELIEFWEB_APPNAME` is configured. It exposes metadata, limited summaries/excerpts, source organizations, country/disaster/theme tags, and links. It does not mirror full copyrighted reports, PDFs, or photos.

Humanitarian locations are generalized. Country centroids are marked approximate; sensitive or unsupported coordinates are suppressed.
