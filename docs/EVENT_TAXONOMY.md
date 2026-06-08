# Event Taxonomy

Phase 1C introduces a three-level taxonomy while preserving the existing map categories.

## Fields

- `domain`: broad user-facing group, such as `natural-disaster` or `technology-cyber`.
- `category`: retained compatibility category used by existing map/filter code, such as `earthquake`.
- `type`: specific event type, such as `earthquake`, `weather-warning`, or `service-outage`.
- `subtype`: optional provider-specific detail, such as `tectonic-earthquake`.

Unknown provider values map safely to `other`. The original provider classification is preserved in metadata when available.

## Top-Level Domains

- conflict-security
- natural-disaster
- weather
- major-news
- finance-markets
- technology-cyber
- commodity-supply-chain
- infrastructure
- aviation
- maritime
- humanitarian
- positive-development
- other

The registry lives in `src/events/taxonomy.js`. New providers should map source-specific categories there rather than scattering string comparisons through the UI.

## Quality Dimensions

Live Map keeps these separate:

- Severity: how serious the event may be.
- Confidence: how reliable the record is.
- Impact: potential affected people, assets, markets or regions.
- Freshness: how current the source update is.
- Corroboration: independent source support.
- Verification: current verification state.

These are not combined into one unexplained master score.
