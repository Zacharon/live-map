# Public Data Sources

Live Map core mode uses only free, public, default-safe sources. A source can be public and still require careful attribution, rate limiting, caching limits, or an application identifier. Do not add paid APIs, scraped licensed sites, or credentials to the frontend.

| Source | Domain | Free/public status | API/key requirement | Terms caution | Enabled by default | First integration priority |
| --- | --- | --- | --- | --- | --- | --- |
| USGS Earthquakes | Natural hazards | Public earthquake feeds | No key | Attribute USGS and preserve source links | Yes | Phase 0 core provider |
| NASA EONET | Natural hazards | Public natural event API | No key | Attribute NASA/EONET and handle intermittent availability | Yes | Phase 1 |
| NWS alerts | Weather | Public US weather alerts | No key, identify client when possible | US-focused coverage; preserve alert URLs and official wording context | Yes | Phase 1 |
| GDACS | Disasters and humanitarian hazards | Public disaster feeds | No key | Respect feed terms, freshness limits, and attribution | Yes when reachable | Phase 1 |
| CISA KEV | Cyber | Public known exploited vulnerabilities catalog | No key | Catalog is not a live incident feed; avoid implying active exploitation everywhere | Yes | Phase 2 |
| NVD | Cyber | Public vulnerability API | Optional API key for higher limits | Rate limits apply; cite CVE/NVD records and avoid unsupported severity claims | Yes, bounded | Phase 3 |
| SEC EDGAR | Markets and economics | Public filings | Requires compliant contact identity in User-Agent or configured contact email | Respect SEC fair-access rules; use controlled CIK allowlists | No, config-gated | Phase 4 |
| FRED | Economics | Free public economic data API | Free API key | Respect St. Louis Fed terms and metadata attribution | No, config-gated | Phase 4 |
| EIA | Energy and economics | Free public energy data API | Free API key | Respect EIA terms and dataset update cadence | No, config-gated | Phase 4 |
| ReliefWeb | Humanitarian | Public humanitarian API | App name/contact style identifier | Attribute ReliefWeb and original sources; avoid emergency-advice framing | No, config-gated | Phase 4 |
| GDELT | News discovery | Public global event/news datasets | No key | Use for discovery, not truth claims; preserve source links and avoid overcounting | No, opt-in | Phase 4 |
| Curated RSS/Atom feeds | Official/public metadata feeds | Public feeds selected by allowlist | Usually no key | Use official or clearly licensed feeds only; no arbitrary scraping | Official safe feeds only | Phase 2 |
| Statuspage feeds | Infrastructure | Public status APIs and feeds | Usually no key | Each status page has its own terms; incidents are provider-scoped | Yes for curated allowlist | Phase 3 |
| RIPEstat | Internet infrastructure | Public internet measurement API | Source app and resource config recommended | Respect acceptable use; data can be technical and incomplete | No, config-gated | Phase 4 |

## Source Rules

- The core app must work without paid accounts or private credentials.
- Keys and contact emails must stay server-side in Worker or Netlify environment variables.
- Every event should carry provider identity, source URL when available, freshness, and degraded-state information.
- `/api/sources` and `/api/provider-health` are the public trust layer for source registry status and sanitized provider health.
- Public does not mean unrestricted. Review terms before enabling a new source.
- Do not claim complete global coverage from partial public feeds.

## Saved history and reference imagery (2026-09-30)

The bounded historical import uses the official [USGS FDSN API](https://earthquake.usgs.gov/fdsnws/event/1/) and [NASA EONET v3](https://eonet.gsfc.nasa.gov/docs/v3), not news scraping. The saved September 2024 extract contains 481 magnitude >=4.5 earthquake records and 721 curated EONET records. The [manifest](../data/history/september-2024/manifest.json) records queries, original response hashes, counts, rejects, duplicates, caps and retrieval timestamp. Each record retains provider ID, source links and supplied geometry/clock values. [EONET's extent disclaimer](https://eonet.gsfc.nasa.gov/what-is-eonet) applies: positions and dates can be approximate, and this is not an official warning service.

Original JSON is retained as factual catalog metadata/geometry in a versioned local archive, with no mirrored source articles, images or PDFs. The importer refuses to overwrite the existing version before making a network request. No browser calls to earthquake/EONET APIs or recurring collection job are introduced. Future archive versions require bounded queries and review; the current importer is intentionally fixed to this authorized month.

Both engines share the [USGS National Map basemap configuration](../src/map/basemaps.js). [National Map terms](https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map) and the actual service metadata govern viewing: Alaska SPOT imagery is viewing-only, not covered by a blanket public-domain/download claim. Only normal viewport tile requests are made; no tile archive, prefetch or bulk scraping is implemented. USGS/NGP attribution is displayed. Fine imagery is US-focused; global imagery is coarse. CONUS NAIP imagery spans 2017–2021 in this service, with differing regional vintages, and does not show September 2024 event conditions. Ellipsoid terrain has no elevation relief. See the [detail and failure evidence](REAL_HISTORY_2026-09-30.md).

Esri account/software eligibility was not established, so the new satellite/topographic configuration uses the public USGS service. Existing offline dark/light geography remains available. The legacy online-dark style retains its previous provider and attribution; this work does not authorize bulk use or claim new eligibility for that style.
