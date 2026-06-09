# Data Sources

## Live or partially live

- USGS Earthquake Hazards Program: public earthquake GeoJSON feeds.
- NASA EONET: public natural hazard event feed. Provider availability can be intermittent.
- NOAA/NWS Alerts: public U.S. weather alert API.
- GDACS: public global disaster RSS feeds for earthquakes, tropical cyclones, floods, volcanoes, and drought.
- CISA Known Exploited Vulnerabilities: official non-geographic technology/cyber feed.

## Configuration-required or enrichment sources

- ReliefWeb V2: humanitarian reports adapter is implemented, but live queries require a pre-approved `RELIEFWEB_APPNAME`. The provider uses source attribution, limited excerpts, and country-level or suppressed locations for sensitive records.
- NIST NVD CVE API 2.0: focused CVE enrichment is implemented for selected CVE IDs. Bulk vulnerability ingestion is intentionally disabled. `NVD_API_KEY` is optional and should stay server-side.
- SEC EDGAR: material filing adapter is implemented, but live queries require `SEC_CONTACT_EMAIL` and a controlled CIK allowlist. It is not a stock-price feed.
- FRED: macroeconomic observation adapter is implemented, but live queries require `FRED_API_KEY` and use an allowlist of important series.
- EIA: commodity and energy observation adapter is implemented, but live queries require `EIA_API_KEY` and controlled dataset routes.

## Registry or development fixture

- Master OSINT source registry: governed source directory in `src/sources/master-source-registry.js`.
- Source Explorer: `/sources` and `/api/sources` for browsing access classification, status, licensing, review dates, limitations, and implementation state.
- Exchange registry: static registry of 92 global stock exchanges for Phase 1 UI and adapter work.
- Market cards: development fixtures only. They do not claim live prices.
- Layer catalog: source-transparent list of live, planned, disabled, credentialed, and partially available layers.

## Credentialed future sources

- ACLED
- ADS-B providers
- AIS providers
- Finance providers
- SEC EDGAR contact email and CIK allowlist
- FRED API key for macro observations
- EIA API key for energy observations
- NASA FIRMS
- ReliefWeb appname for live humanitarian reports
- Groq
- OpenRouter
- Supabase or Neon

Credentials must be stored server-side through Netlify environment variables.

See also:

- `docs/MASTER_SOURCE_REGISTRY.md`
- `docs/SOURCE_ACCESS_CLASSIFICATIONS.md`
- `docs/SOURCE_QUALITY_AND_VERIFICATION.md`
- `docs/LICENSING_AND_REDISTRIBUTION.md`
- `docs/MULTI_DOMAIN_IMPLEMENTATION_PLAN.md`
- `docs/NON_GEOGRAPHIC_EVENTS.md`
- `docs/SEC_EDGAR_PROVIDER.md`
- `docs/FRED_PROVIDER.md`
- `docs/EIA_PROVIDER.md`

