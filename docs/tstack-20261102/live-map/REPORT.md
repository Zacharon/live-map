# Live Map unknown severity - local trial report

Outcome: FIXED locally. Sol Loop approved after two rounds. This is a reviewed, uncommitted local candidate, not a completed release.

## Identity and preservation

Bound worktree: a local T3 worktree for this branch (path withheld). Branch tstack/live-map-20261102. Remote identity Zacharon/live-map. Pinned base and unchanged HEAD: 390b9a6b79bc89b03baf03f4fe4b1e02aed29384. Initial worktree clean. Canonical feature/evidence-semantic-globe committed HEAD matched base; no canonical dirty files copied or modified. No fetch, commit, push, remote PR/comment, deployment, publication, source activation, CSP change or governance edits.

## Defect and fix

Missing severity became low/0 in the browser normalizer, 25 in canonical normalization, and a default 20 in country risk. The pinned original normalizer fails the unknown assertion (regression-before.log); before.json preserves original outputs.

Shared nullable interpretation preserves unknown/null, genuine numeric zero, and known scores. Unknown has an explicit filter band and sorts after known zero. Canonical/legacy normalizers, event/incident clusters, change-awareness and risk consumers retain unknowns. Country risk counts unknownSeverityEvents, excludes those records from severity-weighted pressure and discloses this limitation. Threat and all-unknown cluster threat stay unscored. Confidence, freshness and impact remain separate. uiSeverity remains a legacy fallback; zero has precedence. Label lookup rejects inherited property keys.

Focused tests use inline synthetic records only; no provider fixtures changed or current feeds contacted. The new test file remains uncommitted under the explicit no-commit instruction.

## Verification

Node v24.16.0. Final logs:

- round2-before.log: FAIL before S1 repair (actual Function: toString), preserved.
- round2-after.log: PASS unknown/zero/known, prototype keys in both label fields, UI fallback/zero precedence, filters/sorts, mixed clusters, all-unknown threat, exact country-factor equality with/without unknown records.
- round2-audit.log: PASS 49/49.
- round2-platform.log: PASS offline platform suite.
- round2-syntax.log: PASS npm run check:syntax, Cloudflare exports valid.
- round2-validate.log: PASS npm run validate -- --offline, 10 checks/0 failed; 389 JS files and 337 browser files checked. Expected offline provider-unavailable warnings; source URL reachability intentionally omitted.
- git diff --check: PASS. All 17 reviewed file hashes match review-hashes.json after approval.

Earlier candidate failures remain in the logs. Sparse-threat and clock-fixture low-band expectations were updated to unknown semantics. An early threat return initially omitted the missing-confidence caveat; repaired and audit passed. No inherited failures remain in these final checks.

## Review and usage

Implementer: gpt-6.1-sol, medium reasoning. Independent reviewer via T3: codex gpt-6.1-sol, medium reasoning, default service tier, no nested agents. Round 1 CHANGES: S1 inherited mapping keys, S2 dropped uiSeverity fallback, and missing coverage. All accepted and fixed. Round 2 APPROVE on changed behavior/open findings; S1/S2 resolved, no remaining findings. See LEDGER.md. Round 1 hashes retained in review-hashes-round1.json; final freeze review-hashes.json. Only helper/test changed between freezes. Reviewer reran focused tests and diff check, inspected all final check logs.

Input/output/cached/reasoning token counts: UNKNOWN for implementer and both review rounds. Overall elapsed time not measured: UNKNOWN. No efficiency or human-team superiority claim.

## Limits and proposed PR

NOT RUN: browser/UI, human, device, H3, hosted, production smoke, deployment and release acceptance. Existing project gates remain open. This local review does not establish hosted readiness.

Proposed title: Preserve unknown severity across event and risk consumers

Proposed body: Missing severity previously became low or zero. Preserve null/unknown through normalization, filtering, sorting, clustering and risk consumers while retaining real zero and legacy UI labels. Country risk discloses omitted unknown-severity pressure. Synthetic regression, audit 49/49, offline platform, syntax and offline validator 10/10 pass. Reviewed with sol-loop: two rounds with gpt-6.1-sol on medium; approved. Browser/H3/human/device/hosted acceptance NOT RUN. No feeds or hosting policy changed.

## Exact reviewed paths

- `docs/API_CONTRACTS.md`
- `docs/LAST_30_DAYS.md`
- `docs/NEXT_TASK_QUEUE.md`
- `src/config.js`
- `src/events/change-awareness.js`
- `src/events/clustering.js`
- `src/events/event-filters.js`
- `src/events/event-normalizer.js`
- `src/events/feed-organization.js`
- `src/events/incident-clustering.js`
- `src/events/normalized-event.js`
- `src/intelligence/threat-level.js`
- `src/risk/country-risk.js`
- `tests/audit-repair-tests.mjs`
- `tests/run-tests.mjs`
- `src/events/severity.js`
- `tests/unknown-severity-tests.mjs`
