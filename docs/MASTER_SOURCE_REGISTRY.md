# Master Source Registry

Live Map keeps a governed source directory in `src/sources/master-source-registry.js`.

The registry is not a promise that every source is live. It separates useful research resources from providers that are implemented, configured, licensed, fresh, and legally safe to display.

## Rules

- Only `usgs-earthquake-geojson` and `nasa-eonet` are marked `live` on this branch because those adapters exist on `main`.
- Planned, link-only, licensed, credentialed, or unknown sources must not populate live events.
- Unknown commercial-use or redistribution terms require legal review and keep ingestion disabled.
- Browser code must call Live Map APIs only. It must not fan out to upstream providers.
- Every source needs attribution, source URL, source tier, access classification, implementation status, review dates, cache guidance, retention guidance, and known limitations.

## API

`/api/sources` returns:

- `generatedAt`
- `mode`
- `valid`
- `errors`
- `stats`
- `filters`
- `domainLabels`
- `sources`
- `selectedSource`

Supported filters are `q`, `domain`, `category`, `accessMode`, `status`, `sourceTier`, `official`, `implemented`, `credentialRequired`, `legalReviewRequired`, and `source`.

