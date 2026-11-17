# Frozen multi-site incident evaluations

The original St. Petersburg case is a **frozen evaluation fixture**, dated 2026-10-18, with partial source
retrieval and unverified claims. It is not live data, an operational assessment,
or a public feed feature. No provider, UI, or API imports it.

## Source receipt and limitations

Research on 2026-10-18 retrieved search-index excerpts, not complete article pages.
Direct page opens for AP, ITV's AP coverage, Reuters via Internazionale,
Devdiscourse and StreetInsider, and Local10 failed with `Internal Error` /
`URL ... is not accessible via this tool`. No access restrictions were bypassed.
Source timestamps below are publication metadata returned by search, not verified
event/observation times. Retrieval date has day precision. No raw articles retained.

| Source | Publication metadata | Retained facts and attribution |
| --- | --- | --- |
| [AP](https://apnews.com/article/f813d3725b8b5f23958a68a95729fd0d) | 2026-10-18 09:49:17 UTC | Beglov: fires at two oil sites; city toll 1 killed, 5 injured. MoD: 1,015 drones intercepted. |
| [Reuters via Devdiscourse](https://www.devdiscourse.com/article/international/3994318-one-killed-five-injured-in-ukrainian-drone-attack-on-russias-st-petersburg-governor-says) | 2026-10-18 12:32 IST (07:02 UTC) | Ozon: logistics fire. VK: data center attacked, user services normal. |
| [Reuters via Yahoo Malaysia](https://malaysia.news.yahoo.com/one-killed-15-injured-ukrainian-104758436.html) | 2026-10-18 10:47 UTC | Authorities: 1 killed, 15 injured across city and Leningrad region. |
| [RFE/RL](https://www.rferl.org/a/ukraine-russia-drone-attacks-zelenskyy-airports/33878787.html) | 2026-10-18 12:07 CET, preserved as displayed | Zelenskyy: 76 energy/oil/gas attacks during prior week. Trump: energy pause announcement October 11. |
| Owner Daily Priority Brief | 2026-10-18; time unknown | No mutually confirmed ceasefire terms: **brief-only, unverified**. |

The fixture never turns news repetition into independent physical confirmation.
Both Reuters hosts share one organization identity. The casualty reports cover
different geographic scopes: neither sum them nor allocate either to a site.
They remain unreconciled, not an inferred correction or a new city total.
No imagery was inspected, coordinates retrieved, operational closure established,
or restoration sourced. Facility operations and Ozon service impact stay unknown.
VK's service statement is a company claim, not proof of facility operability.
The interception count is not a launch total, site count, damage measure, or
independently verified observation. A ceasefire announcement does not establish
mutual terms or a violation finding.

## Evaluation contract and use

This local-main base lacks the operational-evidence code, workbench document, and
PortWatch frozen sample referenced by the brief. The minimal addition is an
evaluation-only schema v1 in `tests/fixtures/st-petersburg-20261018.mjs` and a
validator in `tests/helpers/multi-site-incident-evaluation.mjs`. Public
`/api/events`, its direct Netlify endpoint, and `/api/sources` are unchanged.
This is not integration proof for the absent workbench or future imports.

Every evidence-bearing field carries source link/id, publisher, publication,
retrieval and event clocks, claimant/type, scope, confidence, verification and
evidence kind. Missing source/observation times are null; event dates are not
invented exact times. Site names and region labels identify the subjects described
by their attack records; geography has no geometry. `national-authority` and
`brief-author` avoid falsely classifying political statements as military or
independent journalism. Confidence describes establishment of the underlying
claim, not confidence that the excerpt exists. All remain unknown/unverified.

Read-only capability `validateMultiSiteIncidentFixture/v1` accepts this frozen
case shape and returns `{valid, errors}`. It intentionally rejects new supported
facts too: a later source update needs a separately reviewed fixture revision,
not silent mutation of this snapshot. Humans and agents run the same command:

```sh
node tests/multi-site-incident-evaluation-tests.mjs
npm test
```

Negative cases exercise claim-to-observation promotion, launch/damage substitution,
unsupported operations, site casualty allocation, fabricated geography, restoration,
live relabeling, provenance mismatch and collapsed assessment dimensions. Severity,
confidence, impact, corroboration, freshness and completeness remain separate.
The validator is a test utility, not an API ingestion security boundary.

## Feature-standard scope

This adds offline evaluation assets only. Seven product acceptance gates:

- Shared capabilities: PASS for local evaluation; same read-only CLI test and
  validator for humans/agents.
- Shared state: NOT APPLICABLE; no application state writes or new persistence.
- Scoped authority: NOT APPLICABLE; no accounts, grants or external effects.
- Human usability: PASS for CLI evaluation; readable fixture/docs and CLI errors.
  No product UI introduced.
- Visible supervision: PASS for CLI evaluation; output reports failure and mutation
  checks. Delegation/cancellation controls are NOT APPLICABLE to this sync test.
- Safe recovery: NOT APPLICABLE; read-only tests; Git versions assets.
- Receipts: PASS for local evaluation output; application transaction receipts
  are NOT APPLICABLE because no application state changes.

Product UI, hosted operation, live provider and real-user gates are NOT RUN.

## Local verification, 2026-10-18

- `node tests/multi-site-incident-evaluation-tests.mjs`: PASS, valid case plus
  28 rejected unsafe mutations; fully offline.
- `npm.cmd test`: PASS (exit 0): platform suite, validator (10 checks, 0 failures;
  154 syntax files, 403 returned events, 20 reachable source URLs), E2E smoke and
  Source Explorer smoke. Existing validator/smoke code calls provider routes;
  these results do not independently verify the fixture's reporting.
- `npm.cmd run check:syntax`: PASS; Cloudflare exports valid.
- `git diff --check`: PASS.

No push, PR, merge, production smoke or deployment performed.

## 2026-10-21 grid-region extension (schema v2, offline)

`tests/fixtures/ukraine-grid-20261020.mjs` extends the same multi-site
evaluation container (`sources`, `sites`, `nonSiteRecords`) and the same per-field
evidence envelope and separate assessment dimensions. The one validator
dispatches on `schemaVersion`. `sites` holds seven **regional reports**, not seven identified facilities
or map points. Five western regions are marked as newly targeted **according to
the reported statement**; Kirovohrad and Odesa are central/southern reports.
The Odesa regional record says DTEK reported **three facilities hit**. It does
not name any of them or allocate the 32,700 families among them.

Each regional record stores `reportedTargetRegion`, `specificAsset`,
`physicalDamage`, `outageStart`, `customersAffected`, `restorationUpdate`,
`source`, and `observationTime` separately. Unknown asset, physical damage,
outage start, and restoration are explicit `null` evidence values. The Odesa
32,700 unit is **families**, with `point-in-time-at-report`,
`permanence: not-established`, and no per-incident or per-facility allocation.
The six regions without a count carry `null`, including no invented unit. The exact DTEK
observation clock is unavailable; `2026-10-20` is report-day precision, separate
from publication and retrieval. Ukrainian energy ministry officials and local
authorities reported the aggregate western expansion. Nekrasov named the
regions and central/western/southern labels; DTEK supplied the Odesa facility
count and family figure. The announced halt is context with Trump as announcer,
Zelenskiy as the speaker reporting it, unknown announcement date, an inferred
Sunday statement date (2026-10-18), and `cessationVerified: false`. It is not
a ceasefire finding. The earlier St. Petersburg fixture's October 11 halt
context is cross-referenced without treating it as a second independent source.
The Sunday Zelenskiy statement may also be the original fixture's weekly
attack-count statement; that possible match is referenced but not counted as
independent evidence.

The [Reuters article](https://www.reuters.com/business/energy/russia-expands-attacks-energy-facilities-western-ukraine-2026-10-20/)
could not be opened directly in this environment. A
[Reuters syndication snapshot](https://uk.marketscreener.com/news/russia-expands-attacks-on-energy-facilities-to-western-ukraine-ce785cd8d88dfe2c)
was read on 2026-10-21. Its displayed publication/update times are 2026-10-20
12:50/12:55 BST (11:50/11:55 UTC); the fixture stores a short factual snapshot,
not article text. This is one Reuters origin, not independent corroboration.

Read-only capability `queryGridIncidentFixture/v2` takes the frozen fixture and
returns an allowlisted regional expansion, Odesa record and halt context after
`validateMultiSiteIncidentFixture` dispatches to the v2 validation branch and
rejects unsupported promotions and extra keys. Human and agent
use the same local command and validation:

```sh
node tests/ukraine-grid-incident-evaluation-tests.mjs
```

Feature-standard gates 1–4 (local test environment):

| Gate | Status | Evidence and limit |
| --- | --- | --- |
| 1 Shared capabilities | PASS for this read-only evaluation | The documented command calls the same `queryGridIncidentFixture/v2` and validator for a person or an agent. No product adapter was added. |
| 2 Shared state | NOT APPLICABLE | Query reads a versioned frozen fixture; it writes no application or user state. |
| 3 Scoped authority | NOT APPLICABLE | No user, role, grant, or external effect is involved; the fixture is local test data. This grants no ingestion permission. |
| 4 Human usability | PASS for this evaluation | A person can run the command without AI and read the JSON projection and explicit validation errors. Product UI and keyboard use are NOT RUN. |

Gates 5–7 are NOT APPLICABLE because the capability writes no user data and
causes no external effect. This is candidate evaluation evidence only; live
provider, public API/UI, OSINT Forge storage, independently verified damage,
outage duration, and restoration remain NOT RUN or unknown.

Local verification on 2026-10-21: `node tests/ukraine-grid-incident-evaluation-tests.mjs`
exited 0 and reported `7 regional reports, 32,700 families at report time,
25 rejected unsafe mutations`. The query JSON includes the five western names,
Odesa count 3, family count 32,700 with point-in-time and permanence caveats,
`null` asset/damage/outage/restoration values, and `cessationVerified: false`.
`npm.cmd run check:syntax` exited 0 (`Cloudflare exports are valid.`).
`npm.cmd test` exited 0: platform suite `All tests passed`; nested validator
`Result: PASS (10 checks, 0 failed)` with one `mode=partial-netlify-function`
warning; E2E and Source Explorer smoke tests passed. These are local tests,
not proof of live case data or hosted UI.
