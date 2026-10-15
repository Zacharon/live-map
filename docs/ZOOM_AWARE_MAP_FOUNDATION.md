# Zoom-Aware Map Foundation

Local implementation and review: 2026-09-09. Status: **PARTIAL — working local foundation; production hosting and provider activation remain separate.**

## Authority and scope

PRIMARY: `C:\Users\zacha\Workspace\20_Products\Live_Map`. `C:\Users\zacha\Workspace\CONTEXT.md` explicitly lists this canonical path; the parent `CLAUDE.md` identifies Workspace as the home for project work. Git root matches. Remote: `https://github.com/Zacharon/live-map.git`. Starting branch `map/phase9-visual-grammar`, HEAD `1640bed51a76fb916f570d755bf5e576ccc36646`, clean tree. Work is on `codex/zoom-aware-map-foundation`, same HEAD plus uncommitted scoped edits.

The attached vault's `local_sync_plan.md` names the historical `C:\Users\zacha\Documents\Codex\live-map`; that path is absent. No authoritative reference checkout was attached. The vault remains read-only. Remote GitHub parity was not fetched or asserted; local history includes Phase 9 work beyond the July handoff.

No push, PR, merge, deployment, build hook, production-setting change, purchase, subscription, new key, cloud provisioning, or provider activation occurred.

## God's Eye View reuse

User-requested upstream reuse is implemented: nearby contact roster, inspect and return-to-view interaction, observed tracks, and an attributed MIT heading-stabilization helper. See `docs/GODS_EYE_VIEW_REUSE.md` for the pinned revision, actual reuse, and feature transfer matrix.

## What works

- Existing Leaflet application retained. A new map workspace replaces the stacked console layout on `index.html`; old operator CSS remains available but is no longer loaded by that page.
- Compact global/conflict/hazard/maritime/aviation presets, composable event filters and transport/reference controls, search, verification filter, optional viewport-only list.
- Full filtered list is paged in 60-record pages. This replaces inaccessible records beyond the old per-group 80-record cutoff. Group counts describe the current page; footer gives full record count.
- Updated 2026-09-13: world (<4) allows high/critical severity, up to 18 events; regional (4–6) adds medium, up to 80; local (7+) allows all severities, up to 240. Limits apply to map records, not list records. Filters run first. Only valid geographic records within the viewport are map candidates. An inspected eligible record remains visible within the cap. See `PROGRESSIVE_ZOOM_DETAIL.md`.
- Stable lexicographic attention order: severity, supplied impactScore, confidence, event occurrence time, ID. No count of reports or reposts enters this policy. Source independence/deduplication remains in existing incident/storyline modules.
- High/critical and selected events bypass Leaflet spatial clusters. Other markers spatially cluster until zoom 8. Those clusters are display groups, not corroborated incidents. A selected eligible event can replace the last item within the display budget.
- Detail shows geographic precision, occurrence, report/retrieval times when supplied, verification, source links; unavailable timestamps are explicit. Approximate/unknown geography uses a dashed square marker and precision tooltip. Zoom does not change coordinates or precision.
- Heuristic context, connections, and export fields are disclosures. Existing Finance/Commodity/Technology/Happy surfaces, source explorer, diagnostics, country pages and API routes remain available.
- Map center, zoom, basemap, both tracking types, reference layers, scope, verification, event categories, severities, record kinds, domains, search and time window persist in URL state. `mapState=1` is additive to legacy links. Saved views version 1 include validated map state and restore filters.
- Aircraft/vessels request only at zoom 7+ with a valid bounded area <=400 square degrees. Move updates debounce 200 ms, abort superseded requests, and reject late results. Hidden tabs and disabled tracking stop scheduled tracking work. No global fleet fetch.
- Server tracking requests coalesce matching cache regions; cache remains 25 seconds, bounded to 128 entries. A conservative 30-load/minute budget is shared across tracking users/types within each warm server instance. Antimeridian splits can make two aircraft requests per load. This is **not** a durable distributed account quota: that remains an activation gate.
- Missing moving coordinates are rejected without rejecting valid zeros. Latest position wins for duplicate IDs; stale positions dim. Aircraft and vessel symbols differ. Selected tracks contain at most 20 actual observations; dateline jumps split lines. No interpolation/extrapolation. OpenSky last contact is distinct from position time; missing position timestamps do not become current observations.
- Browser-normalized source/provider URLs accept only HTTP(S), without embedded credentials.

## Demo and local preview

Run `node scripts/preview-foundation.mjs`, then open `http://127.0.0.1:8766/?demo=foundation`.

This loopback server serves static files with no-store headers and returns explicit JSON 503 for APIs. It does not run production providers. The explicit demo path imports invented test records instead of fetching events/positions. Basemap tiles are still external reference imagery. Demo data is not written into the live event cache. A persistent banner and record/source labels identify it.

Local transport example: `?demo=foundation&mapState=1&lat=25.4&lon=56.1&zoom=8&tracking=aircraft,vessels&context=ports,airports,chokepoints&basemap=street`.

Wind: Layers → Synthetic wind field. Native canvas samples a periodic mathematical vector field; metadata: synthetic model, m/s, illustrative 10 m surface, valid 2026-09-08 12:00 UTC, extent 60°S–75°N. Arrows point toward flow. Opacity works. No animation timer, no provider polling; off removes listeners and hidden tabs hide drawing. It is a renderer proof, not weather. No global field was fabricated from city forecasts.

OpenStreetMap street is the default. QA observed the old CARTO dark endpoint returning “API KEY REQUIRED” image tiles despite successful HTTP loads; its selector is now disabled and old dark links resolve to street. Satellite remains selectable. Basemap entitlement and capacity must be reviewed before publication; tile HTTP success alone cannot detect watermark/access-denial imagery.

## Source/access matrix

Review date 2026-09-09. “Implemented” means local code, not active production service. No live provider feed was verified during this work and production configuration was not inspected. Existing master registry remains the governance source of truth.

| Layer/provider | Inspected / implemented / fixture evidence | Access, credentials, display/export | Coverage, delay, cache/retention, budget | Activation state |
|---|---|---|---|---|
| USGS/EONET/NWS/GDACS | Existing adapters/orchestration; platform fixtures and local event-envelope validation | Existing source-registry rules; original links and attribution preserved | Provider-specific, NWS US coverage; existing scheduling/backoff; observation time separate from retrieval | Existing integration; production state unverified, no activation |
| News/storylines | Existing metadata-only observations and storyline tests pass | Allowlisted/governed sources only; no article mirroring or restricted scraping | Source organization independence preserved; discovery is not verified incident geography | Existing boundaries unchanged |
| Ports/airports/chokepoints | Existing small static registries + local renderer | Reference context; source fields retained; incomplete samples, not navigation | Static curated samples, viewport caps 24/50 points; no poller | Working reference layers |
| Shipping corridors/density | Not added | No geometry/license package accepted in this milestone | Historical density and generalized corridors must remain distinct from positions | Unavailable, no illustrative route invented |
| OpenSky aircraft | OAuth adapter inspected; normalizer and position rendering fixture-tested | [Formal terms](https://opensky-network.org/about/terms-of-use) require written operational REST license; credentials server-side only; intended redistribution/export must be agreed | Receiver-dependent; local bbox only; 25s server cache, 500 UI cap, bounded in-session tracks; durable global budget still required | License/configuration required; no live verification |
| GFW vessels | Normalizer exists; fetch function deliberately returns configuration-required, even when configured | [API docs](https://globalfishingwatch.org/our-apis/documentation/) specify noncommercial use; endpoint-specific display/export/license review outstanding | Delayed/analytical candidate. Exact endpoint cadence and retention not accepted; the brief's 72-hour claim must be checked for the chosen dataset | Not an active position feed |
| AISHub | Status-only boundary inspected | Participation/access and redistribution review outstanding | No data path, no asserted coverage/cadence | Configuration/access required |
| AISStream | Official documentation checked, no adapter added | [Documentation](https://aisstream.io/documentation) requires server-side connection; no browser key. Redistribution review outstanding | Long-lived bounded subscription; requires separately reviewed ingestion lifecycle and quota design | Future candidate only |
| Wind proof | Native canvas and deterministic vectors tested; browser verified | Original synthetic math, clearly demo only | No retention or remote requests; display bounded by viewport grid | Demo only |
| Operational wind/weather fields | No new pipeline | Select NOAA/GFS variables, subset/redistribution and attribution review before use | Model/run/valid time, level, units and forecast horizon mandatory; preprocess once, cache subsets | Unavailable |
| Road traffic | No activation | Aggregated flow/incidents, never private-car identities | Provider/region-specific, not road geometry presented as traffic | Follow-on |

AIS follow-on architecture: one authorized server-side consumer for bounded subscriptions, controlled reconnect/backoff, latest-observation cache with TTL, data minimization, fixed subscription and spend limits, and sanitized viewport HTTP reads for clients. Never one upstream socket per visitor or a persistent socket hidden in a short-lived function. No infrastructure was provisioned.

## Verification and remaining limits

Passed: syntax; full offline platform suite; foundation regressions; offline validator; offline E2E/Source Explorer smoke; browser/repository secret scans; git diff --check. URL reachability and production smoke were not run.

Browser QA: in-app browser at 1280x720 and 390x844; global/regional/local views, source details, aircraft/vessel fixtures, wind, mobile sheet. No console errors observed. Screenshots appeared in this conversation. C: reached zero free space. Task-generated PNGs and redundant platform log were removed; no existing user files were removed. The test file was restored using allocated task-log space and passed again. Retained: outputs/foundation/benchmark.json and outputs/foundation-validation.txt.

10k-event/2k-object pipeline: 50 iterations, target p95 <50ms; initial median 6.57ms, p95 14.81ms. Final repeat in benchmark.json. i7-4770K 3.50GHz, 16GB RAM, Windows, Node 24.16.0.

Full UI: explicit demo plus stress=1, local zoom, both tracking types. Initial synchronous update 3956.7ms. Cached feed-derived calculations, skipped hidden panels, and conservative incident latitude rejection reduced warm updates to 114.2ms and 193.7ms in the final contact-enabled browser check (target <250ms). Not p95 or a frame-rate guarantee. Cold load still took several seconds; frame/heap/long-session metrics remain unverified.

Remaining: durable provider quota/retention/license review, cold-load/frame/heap work, keyboard audit, richer regional summaries, source-native wind and licensed corridors. Disk space is now available (17.3 GiB at final check). Next: Cloudflare route/header parity. Nothing pushed, published, purchased or activated.
Final follow-up validation: 161 syntax files, 142 browser-served files, offline validator PASS (10 checks, 0 failed), platform and foundation regressions PASS. Contact roster radius/dateline/caps, HTML escaping and heading wrap tests pass. Browser contact selection showed four synthetic observed samples and Return cleared the detail; no console errors. Fresh captures: `outputs/foundation/contacts.png`, `world.png`, `wind.png`. Earlier screenshots were removed when disk space was exhausted; these final captures were written after space became available.
