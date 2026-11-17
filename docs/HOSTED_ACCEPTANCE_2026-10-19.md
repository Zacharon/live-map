# Hosted acceptance probe — October 19, 2026

Verdict: **PARTIAL; proposed hosted acceptance milestone remains open.**

Observed 15:36–15:40 UTC using T3's collaborative browser. Desktop 1280×800 and
mobile layout 390×844 (desktop browser engine, not a physical mobile device).
No deployment, production configuration changes, provider activation, case import,
review approval or external publication was performed.

## Revision and hosting identity

Fetched `origin/main` read-only; it resolves to
`5aabf0f7903ecee7e10c12d05e7eea7113d2cf56`. This worktree stays on its separate
October 18 fixture branch. No rebase, merge or checkout was performed.

GitHub's check-runs API reports success for validate, repo-secret-scan,
browser-secret-scan, CodeQL and Workers Builds on that revision. The Workers check
links build `cac3d61d-5a42-487b-b1bd-4543ec4f2555`. GitHub's deployments API returned
an empty array; that is not proof of no Cloudflare deployment. The serving Worker
version was not exposed by the sampled responses and was not independently bound
to the supplied `5ca83369-1dde-401a-8d72-f73f12a0ac96` version.

- [Netlify homepage](https://liveworldmap.netlify.app/): HTTP 200, older operator
  console visible; serving SHA unknown.
- [Netlify globe](https://liveworldmap.netlify.app/globe.html): fresh HTTP 404,
  “Page not found.” This is a host/path observation, not a merged-code diagnosis.
- [Cloudflare homepage](https://live-map.zacharyfavaron.workers.dev/): HTTP 200,
  Watch workspace visible; defaults to `mapMode=2d`.
- [Cloudflare globe](https://live-map.zacharyfavaron.workers.dev/globe.html): HTTP
  200. Normal 3D selection navigated to `/globe?...&mapMode=3d` and rendered Cesium.

Five sampled frontend response bodies match `git show origin/main:<path>` SHA-256:

```text
index.html                  d898ffb47ec6b0a7b0288feb892f0a52d2bbdf0433b5159d3cfcbca8e21b55a6
globe.html                  c56cb3ef9d835bcc853d10562db8663d2b6a77c6af785dfdc7c0ac504ac55dbd
src/app-controller.js       8dd8a724b9a050240f68b64f2a09250f0f1b25dbd6441a9915e8dd9287e65456
src/map/cesium-adapter.js   fcdec2879c94ac00e5b3b6938192aca532a383a86766d1b72205d394835f1ec2
src/map/globe-controller.js 802e2f9cab8632cb3715f3fc2dd4a4c034688dea3b30f77bce81fbd35b96e72e
```

This establishes sampled frontend content parity. It does not prove the entire
deployed bundle, server code, serving version, or every asset matches that SHA.
One initial local hashing command failed due to PowerShell/native quoting; the
corrected stdin Node script produced the hashes above. No application change was
needed.

## Genuine public-event journey

Hosted `/api/events?hours=24` returned HTTP 200. Selected record:

- ID `usgs:us6000u3ct`, M 5.3, 116 km WNW of Höfn, Iceland.
- [USGS source](https://earthquake.usgs.gov/earthquakes/eventpage/us6000u3ct).
- Occurred `2026-10-19T14:44:24.015Z`; source revision
  `2026-10-19T14:59:53.040Z`; API `ingestedAt` `2026-10-19T15:37:10.607Z`.
- Latitude 64.5774, longitude -17.5136; provider `usgs`; reviewed in supplied
  provider metadata. Source page itself was not independently opened in this run.
- Provider status reported healthy, not stale, with `stateStorageMode: memory`.
  This is not evidence of durable collection or recovery.

Clicked the ordinary report title, changed the native map-mode control to 3D,
opened the ordinary export disclosure, downloaded JSON, and used browser Back.
No synthetic event injection or demo mode was used for this journey.

PASS observations:

- The same ID/source/occurrence/revision appeared in list, inspector, globe
  selection attribute and downloaded artifact. A selected marker and label were
  visible on the desktop globe.
- Desktop 2D loaded 12 tile elements at the sampled moment. Globe loaded actual
  same-origin Natural Earth JPEG tiles; network diagnostics show HTTP 200.
- Cloudflare homepage CSP has `script-src 'self' 'wasm-unsafe-eval'`; globe adds
  `'unsafe-eval'`, retaining the other restrictions. No CSP refusal was found in
  captured browser diagnostics. GPU ReadPixels warnings were present.
- The 2D→3D URL retained event ID, 24-hour window, filters, view, basemap, center
  and zoom. Browser Back returned to the 2D homepage with those values retained.
  Non-default as-of, different time windows and every filter combination were
  NOT RUN.
- At 390×844, document scroll width remained 390. The globe rendered at mobile
  layout and recovered after one Retry now action. Physical mobile testing and
  owner visual acceptance remain NOT RUN.
- Existing `?failWebgl=1` hook explicitly disclosed forced unavailability and
  retained the selected event and filters in the Leaflet fallback. This is a
  forced renderer-failure probe, separate from the real API failure below.

## Acceptance gaps and precise follow-up

1. **Serving-version binding UNKNOWN.** Obtain read-only Cloudflare deployment
   metadata linking the currently serving URL/version to the exact revision.
   Sampled assets already match; no deployment is needed merely to investigate.
2. **USGS-to-case path not demonstrated.** Clicking Evidence ledger with the
   USGS event selected opened `view=chokepoints`, Strait of Hormuz and
   `case=portwatch-hormuz-2025-01`. The case selector exposed historical PortWatch,
   synthetic Hormuz and Riyadh reporting. No USGS case entry was present. This
   run therefore cannot accept the same event through Question → Evidence →
   Assessment → Review → Export. Import is available, but was not used to invent
   a native handoff or approval. Existing review gates were not exercised/closed.
3. **Mobile pane transition clears selection.** With the event selected in the
   mobile Reports inspector, clicking Map removed `event=usgs:us6000u3ct` from
   the URL and left `data-globe-selected-event` empty. This fails selection
   preservation for that specific pane transition; it is distinct from the
   successful desktop Back behavior.
4. **Export semantics differ.** API independentSourceCount/corroborationScore are
   null and the inspector says “Independent sources: Not established.” The
   snapshot card shows “Corroboration: 1”; JSON reports `distinctSourceCount: 1`,
   `sourceKeys: ["usgs"]`, `display: "1 distinct source (related/co-cluster)"`.
   Its caveat explicitly says this is not independent primary confirmation.
   Record this as terminology/semantic parity ambiguity, not proof that JSON
   claims independent verification. Inspector retrieval time also says “Not
   supplied” despite API ingestedAt; document the intended clock mapping before
   treating ingestion as publication or observation time.
5. **Observed API failure and recovery.** At 15:39:11 UTC console reported HTTP
   503 and `Error: API 503` in loadEvents. Mobile showed “Feed unavailable,”
   “Event data temporarily unavailable,” and last successful refresh while
   retaining the prior inspector. It also said “Next automatic retry
   Future-dated.” This timestamp label is misleading for a scheduled future
   retry. One manual Retry now later returned an Operational display with
   9/28 sources healthy; it does not explain the 503 or prove sustained recovery.
   Root cause, broader host availability and stale-record export behavior remain
   unverified. Do not generalize this single observed response into an outage.

Next bounded work is version binding and these experience gaps using the merged
implementation. Native PostgreSQL concurrency/restore, hosted durable activation,
global tracking coverage and owner approval remain separate gates. No globe or
routing replacement was attempted.

## Evidence retained locally

Ignored directory `artifacts/hosted-acceptance-20261019/` contains:

- `receipts.json`: browser results, source response sample, URLs, headers, sampled
  hashes, globe attributes, ledger navigation, failure diagnostics and recovery.
- `usgs-export.json`: exact 12,676-byte downloaded artifact; not a case approval.
- `desktop-globe-selected.png`, `mobile-2d-selected.png`,
  `mobile-feed-unavailable.png`, `mobile-map-after-retry.png`,
  `forced-webgl-fallback.png`, `netlify-globe-404.png`.
- `manifest.json`: SHA-256 for those local files. These artifacts are not staged
  or intended for static hosting.

Docs-only follow-up: `git diff --check` and local receipt/export/manifest checks.
No product test suite rerun; no runtime files changed. Acceptance is bounded
browser evidence, not independent H3 or owner sign-off.
