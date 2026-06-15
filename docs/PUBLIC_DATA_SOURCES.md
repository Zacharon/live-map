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
- Public does not mean unrestricted. Review terms before enabling a new source.
- Do not claim complete global coverage from partial public feeds.
