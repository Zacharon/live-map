# October 12 repository repair candidate

Base: audited public main `84a4dff47fa8f96a1d8eb482a446743900a3275e`. Branch: `fix/audit-20261012-live-map`. This is a separate local repair candidate; canonical local installations, hosted acceptance, provider activation and releases are separate.

## Behavior and editing guidance

`src/sources/source-url.js` owns `safeSourceUrl` and `sourceLink`: only explicitly absolute HTTP/HTTPS input with no embedded username/password can become an external source destination. The renderer validates even imported/cached records that bypass ingestion, then escapes the canonical URL, label and class attribute. Missing/rejected destinations are unavailable text. Event/RSS/observation/series ingestion, drawer/dialog/feed, source explorer, diagnostics/provider health and chokepoint links share this boundary. Fixed internal navigation and the user-requested local blob export are separate intentional URL classes.

`src/events/event-values.js` owns nullable confidence and source-clock conversion. Real zero remains zero. Absent, nonnumeric or incompatible confidence becomes null; finite numeric values retain the existing 0–100 clamp. Canonical event clocks are ISO strings or null; legacy/UI clocks are milliseconds or null. `ingestedAt` remains the processing clock. Missing event occurrence, source publication, update and verification clocks are never assigned from ingestion. Event adapters retain their explicit source-derived clock choices and remove only fallback-to-processing-time behavior. Series observations preserve valid source time representation for compatibility, with missing clocks null.

Quality freshness is null when no valid source clock exists. Such records add no freshness contribution to the calculated impact score, with an explicit reason. Feed sorting places known confidence/time/freshness before unknown values; day/hour grouping labels unknown time. Current-window filters exclude undated records, so they cannot appear recent; canonical/API data retains their unknown fields. Timeline unknown buckets, safe time formatting, deduplication, incidents, artifact confidence, threat caveats and country-risk decay avoid interpreting missing values as observed zero/epoch/current time. No new confidence methodology is introduced.

USGS metadata references use `https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php`. The actual `2.5_week.geojson` feed remains unchanged.

## Agent read capability

`live-map.normalize-public-event/v1` is a deterministic, read/transform capability. Typed event/provider metadata enters `createNormalizedEvent` (canonical ISO/null output); `toLegacyEvent` and `normalizeEvent` produce the same values shown by ordinary human feed/detail controls. Agents may invoke these exported functions for synthetic input or read the existing `GET /api/events`/direct Netlify endpoint, using the same source URL/value validation as human views. Invalid destinations produce structured ingestion errors or unavailable UI text; missing observations remain explicit null. No actor-controlled write, privileged grant, approval, job, new authoritative store or external effect is added. Repeating a transform has no external effect. This does not authenticate an agent actor or certify arbitrary existing product writes.

## Verification and CI

Run `npm run check:syntax`, `npm run test:platform`, `npm run test:audit-repair`, `npm run security:scan`, `npm run security:repo-scan`, `npm run validate`, `npm run test:e2e`, `npm run test:sources`. The focused suite covers protocol/credential/attribute bypasses, imported raw UI input, unknown/zero confidence, unknown/valid clocks, downstream consumers, all changed event adapters and preserved USGS feed.

Validate now runs platform and focused regressions. CodeQL's job-level `continue-on-error` is removed after GitHub confirmed successful initialization and analysis on this exact base with the unchanged action/config. Candidate hosted execution is separate evidence. The 14 audited CodeQL alerts are not all treated as exploits or bulk-remediated. Main's required-status-check configuration remains an owner settings decision: proposed checks are `validate`, `cloudflare-validation`, `browser-secret-scan`, `repo-secret-scan`, and `CodeQL JavaScript analysis`, after actual successful candidate CI. No ruleset is changed. The intentionally disabled Production Smoke Test remains disabled.

## Acceptance limits

Independent H3, actual browser evidence, candidate CI and owner release acceptance are separate from local worker tests. No merge, deployment, configuration change, source activation, private data access or real inquiry occurs in this candidate. Reverse this branch's declared patch only; do not replace or reset a dirty canonical checkout.
