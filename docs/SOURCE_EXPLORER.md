# Source Explorer

Source Explorer is available at `/sources` and `source-explorer.html`.

It lets users inspect the governed source directory without implying that every source is live. Filters are preserved in the URL.

The app loads `/api/sources` first and falls back to the local registry module if the endpoint is unavailable. The status row shows the registry version, generated timestamp, request ID, and fallback state.

Supported deep links:

- `/sources?source=adsb-exchange`
- `/sources?domain=aviation`
- `/sources?access=open-api`
- `/sources?status=planned`

Invalid source IDs fail safely and produce a warning instead of injecting query text into the page.

## Filters

- search
- domain
- access classification
- implementation status
- source quality tier
- official-only
- implemented-only

## Detail Panel

Each source shows attribution, docs, terms, credentials, commercial-use status, redistribution status, caching, retention, refresh guidance, rate-limit guidance, review dates, limitations, and implementation status.

## Main App Integration

The main Live Map header links to `/sources` and preserves dashboard, sort, group, and card-density query state where practical. The main source-domain panel links each domain to `/sources?domain=...`.
