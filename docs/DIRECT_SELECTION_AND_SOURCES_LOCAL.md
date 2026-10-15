# Direct selection and public-source candidate · 2026-10-02

This is an isolated local candidate, not an installed checkout, publication, production collector, or deployment. Baseline: Zacharon/live-map, feature/evidence-semantic-globe, HEAD 1640bed51a76fb916f570d755bf5e576ccc36646 plus the current inherited dirty working source. `evidence/baseline.json` records the new snapshot and the 16 imported maritime changes. The original maritime candidate, its H3 review, patch and Library package remain a historical freeze.

## Selection

Canonical browser reproduction showed Watch cards already opened the shared event inspector without map input, while the Evidence workbench navigation entry was absent and its 31 ledger rows had no selectable controls. The implementation extends those existing surfaces:

- Evidence ledger navigation opens the existing selected-passage workbench, including from a bare `?workbench=1` URL. Mobile entry opens Reports and clears an obstructing left drawer.
- Native ledger buttons select `state.selectedEvidenceId`; details retain existing source, dates, coverage, analytical confidence, limitations and contradiction semantics. The selected passage remains linked to the globe. Evidence records lacking geometry receive no invented event marker.
- Event list, map, timeline and related-event buttons retain the existing shared `openEventInspector` selection and Cesium synchronization. Selection is available before any globe input. Filter exclusion clears the event selection; unknown/empty records remain explicit.
- URLs retain built-in case identity and evidence selection across reload. Imported JSON cases are session-only; reload explicitly asks for reimport when that selected record is unavailable. Changing case/area clears stale selection. Back/Escape restore a native ledger control; selection brings a scrolled ledger detail into view.

`scripts/runtime-direct-selection.mjs` covers native keyboard selection, reload, event filter exclusion, last-row detail visibility, case switching/reload, empty/unavailable selection, nav-away, mobile and Cesium. `tests/direct-selection-tests.mjs` checks actual schema field values, rather than labels alone. See `evidence/selection-browser/`.

## Source implementation matrix

| Source | Catalogued | Connector implemented | Local verification | Live activation |
| --- | --- | --- | --- | --- |
| USGS, NWS, NASA EONET, GDACS | Existing registry | Existing event adapters reused | Existing checks retained; no new collector | Existing deployment state not changed or independently certified here |
| NHC / CPHC Current Storms | Existing linked registries extended | Event adapter, existing orchestration/envelope | Fixtures plus bounded public development read | **Off**, `NHC_ENABLED` absent by default |
| Fintraffic Digitraffic AIS | Existing linked registries extended | Vessel adapter, existing moving-object API | Schema, fixtures, bounded Finnish-viewport public read | **Off**, `DIGITRAFFIC_ENABLED` absent by default |
| ADSB.lol | Existing linked registries extended | Aircraft adapter, existing moving-object API | Schema, fixtures, bounded local-viewport public read | **Off**, enable and terms-review gates required |
| OpenSky | Existing entry retained | Existing adapter now also requires operational-license confirmation | No OAuth/license calls tested in this task | **Off** without written license confirmation and owner server configuration |

New entries use `configuration-required`, never catalogue `live`. Adapter responses can report a successful one-shot read as live/degraded at that retrieval; that does not activate a production collector. `evidence/sources/public-dev-read.json` separates development reads from activation. The local preview returns `/api/*` 503 and does not consume these sources.

### Exact public interfaces and policies checked

- Fintraffic: [marine docs](https://www.digitraffic.fi/en/marine-traffic/), [OpenAPI](https://meri.digitraffic.fi/swagger/openapi.json), [instructions](https://www.digitraffic.fi/en/support/instructions/), [CC BY terms](https://www.digitraffic.fi/en/terms-of-service/), reviewed 2026-10-02. REST location record uses `timestampExternal` milliseconds; AIS `timestamp` is only a UTC second and cannot supply a full time. Radius/latitude/longitude and ten-minute time filter are sent upstream, then clipped to the viewport. Finnish regional coverage is not Hormuz/global coverage. Gzip is mandatory; non-personal application header used. Anonymous general/V1 allowance is 60 requests/min/IP; local implementation permits one/min/provider/warm instance, cache/coalescing and no automatic retries. Coordinates/sentinels are validated; speed is explicitly knots in metadata; cargoManifest is null. CC BY attribution, source and license links, and transformation notice are retained in public object metadata and inspector.
- ADSB.lol: [API docs/schema](https://api.adsb.lol/docs), [open data](https://www.adsb.lol/docs/open-data/api/), [ODbL](https://opendatacommons.org/licenses/odbl/1-0/), checked 2026-10-02. `now` is milliseconds and `seen_pos` seconds, confirmed by actual response shape (`public-shapes.json`). Source age is separate from retrieval. Geometric altitude feet → meters; ground speed knots → m/s; barometric/geometric values remain distinct in provenance. A missing altitude is not ground. Viewport-circle query is capped at 250 nautical miles and results clipped. No numeric upstream quota/SLA established; local one/min cache/budget is an engineering cap. Production maintainer contact and ODbL downstream obligations remain owner conditions; no contact was made. Keep this data namespace segregated.
- NHC: [current storms JSON](https://www.nhc.noaa.gov/CurrentStorms.json), [product reference](https://www.nhc.noaa.gov/productexamples/), [NWS use policy](https://www.weather.gov/disclaimer), checked 2026-10-02. Atlantic/eastern/central North Pacific advisory positions only. IDs persist across advisory revisions; issuance, file update and retrieval remain distinct. Missing coordinates yield a non-geographic record, valid zero coordinates remain valid, legitimate empty arrays remain a healthy empty source. No track extrapolation or forecast cone presented as observed footprint. Shared cache five minutes, source freshness eight hours engineering choice, 288/day proposed schedule. No numeric provider quota verified.
- OpenSky: parent primary-source review of [current terms](https://opensky-network.org/about/terms-of-use) found written operational REST license required even for nonprofit/internal live products. `OPENSKY_OPERATIONAL_LICENSE_CONFIRMED` is an additional explicit gate; credentials alone do not enable it. No permission or credential was obtained here.

Warm-instance cache/budgets are not a distributed account quota or billing guarantee. Each new read has fixed provider host, rejected redirects, 12-second timeout, 1–2 MiB decoded body cap, schema/record-count caps, and no retry loop. Clock skew was observed in development: the host was about three minutes behind provider HTTP timestamps. Preserve the actual source times; future positions within five minutes are retained as **stale/degraded with clock-skew metadata**, not current. Larger future offsets reject the record. Resolve host clock synchronization before interpreting freshness in an activated runtime.

## Free defaults and optional fork adapters

`provider-activation.js` is used before event-provider budget/fetch work and by the new moving-object adapters. Free providers may opt in with their named enable flags; default flags are absent. Paid or unknown-price adapters require explicit `LIVE_MAP_PROVIDER_MODE=byo-paid`, `LIVE_MAP_ALLOW_PAID=true`, a positive `LIVE_MAP_PAID_MONTHLY_CAP_USD`, provider opt-in, and an adapter declaring an enforced hard budget. The cap field is a policy declaration, **not a spend meter**: an optional paid connector must implement its own hard limiter before it can honestly set `hardBudgetEnforced=true`. No paid connector is added or activated.

Example future adapter descriptor (contains no keys):

```js
activation: {
  billingClass: 'paid', enableEnvVar: 'FORK_PROVIDER_ENABLED',
  termsEnvVar: 'FORK_PROVIDER_TERMS_REVIEWED',
  credentialEnvVars: ['FORK_PROVIDER_API_KEY'],
  hardBudgetEnforced: false // blocks all requests until a real limiter exists
}
```

Fork owners supply their own accounts, keys, billing and data-use license. Values belong only in their server environment; never in browser code, repository, screenshots or public diagnostics. Missing access stays unavailable; there is no automatic commercial fallback. This owner's deployment retains the zero-paid budget. Open-source code licensing would not license upstream datasets; repository publication remains a separate owner decision.

## Next suitable sources

The parent inventory contains 34 curated leads, not 34 working connectors. Prioritize after this local slice: NOAA Aviation Weather Center for station/hazard context; CelesTrak GP for **modeled** orbital positions with two-hour fetch ceiling and stop-on-error policy; NASA GIBS viewport/date tiles with layer-specific rights; Norwegian Kystverket open AIS after TCP transport/decoder review; Caltrans selected-district closures; approved UCDP historical downloads. Port calls are a separate Digitraffic product; AIS counts are not a substitute.

Keep AIS Stream redistribution unresolved, PortWatch commercial/bulk permission conditional, ReliefWeb pre-approved appname, Space-Track/CDSE BYO accounts, FAA/UNCTAD low-frequency reference and Landsat requester-pays routes outside the free defaults. No raw-data mirror, receiver expansion, new account or source contact is implied.

Validation here excludes the previously blocked security task and auth/security suites. Full validator includes unrelated secret/auth scanning, so the bounded non-security validator and relevant syntax/test suites are the local evidence. See the new handoff and H3 review for exact scope and remaining limits.
