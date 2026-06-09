# Data Sources

## Live or partially live

- USGS Earthquake Hazards Program: public earthquake GeoJSON feeds.
- NASA EONET: public natural hazard event feed. Provider availability can be intermittent.

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
- NASA FIRMS
- Groq
- OpenRouter
- Supabase or Neon

Credentials must be stored server-side through Netlify environment variables.

See also:

- `docs/MASTER_SOURCE_REGISTRY.md`
- `docs/SOURCE_ACCESS_CLASSIFICATIONS.md`
- `docs/SOURCE_QUALITY_AND_VERIFICATION.md`
- `docs/LICENSING_AND_REDISTRIBUTION.md`

