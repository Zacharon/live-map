# Frozen St. Petersburg multi-site evaluation

This is one **frozen evaluation fixture**, dated 2026-10-18, with partial source
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
