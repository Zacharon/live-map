import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const root=new URL('./',import.meta.url),r=JSON.parse(readFileSync(new URL('results.json',root),'utf8'));
const table=['| Split | Method | TP / FP / FN / TN | Precision | Recall | Abstentions | Retained | Family count sum |','|---|---|---|---|---|---|---|---|'];
const failures=[];for(const [s,methods]of Object.entries(r.splits))for(const [m,v]of Object.entries(methods)){table.push(`| ${s} | ${m} | ${v.tp} / ${v.fp} / ${v.fn} / ${v.tn} | ${(100*v.precision).toFixed(1)}% | ${(100*v.recall).toFixed(1)}% | ${v.abstentions} | ${v.retainedRecords} | ${v.declaredFamilyCountSumAcrossCases} |`);for(const c of v.cases)for(const f of c.failures)failures.push(`- ${s}/${m}: ${c.id}, ${f.kind}, ${f.ids.join(' / ')}; pair state ${f.state}: ${f.reasons.join('; ')}.`);}
const report=`# SemDeDup-inspired duplicate grouping candidate

Candidate result: guard bands reduced false merges in authored fixtures, but lexical overlap still merges distinct incidents. Do not integrate as automatic incident identity or verification. Holdout precision was 66.7% versus baseline 54.5%, recall both 66.7%, false merges 3 versus 5. All 67 record occurrences across the two splits retained, with every field/provenance intact. No semantic inference was run. This is a completed bounded experiment, not an accepted feature or release.

## Checkout and infrastructure

Worktree: a local T3 worktree (path withheld). Branch experiment/arxiv-livemap-20261113. Source HEAD ecb356aa18774aa71a43c52faeb53ac10ee9cabc. Remote https://github.com/Zacharon/live-map.git. Initial git status was clean. T3 retry prepared from origin/main; setup scripts skipped to avoid uncontrolled writes. No canonical checkout edits, commits, pushes, PRs, merges, deployment, provider collection or model downloads.

Original startup: run 1 never started; provisioning failed with GitVcsDriver.fetchRemote: Git command timed out, completed 2026-11-13T20:40:35.714Z. Classified INFRASTRUCTURE, excluded from algorithm failure counts. T3 preparation retry succeeded. See infrastructure.json. No experimental command failures occurred; all classification failures below remain recorded.

## Paper transfer and rationale

[Abbas et al., SemDeDup, arXiv:2303.09540v3](https://arxiv.org/html/2303.09540v3), section 3, embeds samples with pretrained models, uses k-means to bound comparisons, thresholds within-cluster cosine similarity and retains selected representatives. This experiment borrows thresholded similarity only. It retains all reports and uses all-pairs comparison with deterministic complete-link groups, context constraints and abstention. It does not reproduce SemDeDup, use k-means, prune a training corpus, train models or test training efficiency. The paper's thresholds and training results do not establish incident equivalence or source independence.

Existing package dependencies supply no text encoder. Inspected local Hugging Face hub contained only a Parakeet speech model directory, not a usable licensed text encoder; no exhaustive machine model search is claimed. Use the explicit lexical fallback. Semantic inference, encoder licensing validation and semantic model comparison: NOT RUN.

## Method and comparison boundary

Baseline adapter imports actual arePotentialDuplicates from src/events/event-deduplication.js and its value-semantics.js dependency. Baseline rules: provider/event identity shortcut, otherwise category/time <=6h/distance <=35km and normalized title overlap >=0.55. It strips magnitude numbers. We do not invoke mergeDuplicateEvents because it mutates representative severity/confidence and does not retain complete records. Both methods use the same non-destructive complete-link grouping wrapper. These results compare the actual pair predicate under that wrapper, not the complete production merging pipeline or incident-clustering.js.

Candidate policy fixed before first evaluation: binary Unicode token cosine >=0.82 match; 0.74 to <0.82 abstain; lower separate. Same valid canonical URL or provider/event ID can establish identity only after context checks. Tracking query parameters/fragments are normalized without requests; all other query parameters are retained. Different category, >6h occurrence delta or >35km separates. Missing category/time/coordinates abstains. The 5-6h and 30-35km interior margins abstain. Revision time is retained but does not replace occurrence time. Severity, confidence, source status and impact are never combined or used for matching. Same organization/syndication is an explanatory family relationship, never sufficient incident identity by itself.

Declared organization, syndication and canonical-URL edges form family components; unknown origins are explicit and do not add a declared family. The count is not an independently verified source count; independentConfirmationCount remains null. Synthetic organization labels are fixture inputs, not verified sources. Baseline and candidate use this same conservative count projection. Counts shown are summed across independent case runs; they are not a global source inventory. Complete-link groups avoid transitive bridges; pair match decisions may remain outside the final group when another member conflicts. Sorted IDs make ordering repeatable, but complete-link assignment is greedy and not optimal clustering. Input cap 500 bounds O(n squared) comparison; large text sizes and hostile multi-user inputs are not hardened.

## Frozen evaluation

freeze.json was created before grouping implementation and the first evaluation. Development: 15 cases/30 records/15 pairs. Holdout: 18 cases/37 records/20 pairs. Labels are authored by this implementing agent, not users or independent adjudicators. Holdout shares templates with development; it is a disjoint frozen file, not evidence of independent distribution generalization. No tuning or fixture changes followed evaluation. Extracting the baseline adapter after the first run changed no behavior; final measurements matched initial measurements.

Pairwise metrics evaluate final co-membership within each case; all unlabeled within-case pairs are negative. Abstention counts as no merge (and a false negative when positive). There are no cross-case comparisons. No confidence interval or production quality claim is justified by this tiny synthetic set.

${table.join('\n')}

Every failed labeled pair follows; full original records, decisions, groups and reasons are in results.json:

${failures.join('\n')}

## Executed checks and commands

- node experiments/arxiv-20261113-dedup/freeze-fixtures.mjs: PASS, hashes saved before core implementation.
- node experiments/arxiv-20261113-dedup/evaluate.mjs: PASS twice; see evaluation-output.txt and evaluation-output-final.txt; all prediction errors preserved.
- node experiments/arxiv-20261113-dedup/test.mjs: PASS twice; test-run-1.txt and test-run-2.txt. Final suite covers input immutability, every frozen record/field retained, exact-once group membership, ordering, family transitivity/unknowns, null versus zero, incompatible URL context, missing geography, validation, no three-record bridge, actual human/JSON subprocess equality and structured rejection.
- node experiments/arxiv-20261113-dedup/cli.mjs --fixture experiments/arxiv-20261113-dedup/development.json --case development-syndication: PASS, human-output.txt.
- node --check on every experiment .mjs: PASS. git diff --check: PASS for tracked diff (new files are untracked).
- Full repository syntax/validate, production smoke, security scan: NOT RUN. No PR, production change or release is proposed; production smoke/online validation could violate no-provider-fetch scope. Focused checks cover only this experiment.

## Feature standard, local candidate evidence

Capability dedup.group.v1 is read-only; README defines typed input/output, human and JSON commands, shared handler, local snapshot scope, validation and effect/recovery limits. No user data write or external effect is provided.

| Gate | Status | Evidence and limit |
|---|---|---|
| 1 Shared capabilities | PASS | Human and JSON CLI subprocesses use execute/group; same input produces same core result; test-run-2.txt. |
| 2 Shared state | PASS | Both consume the same immutable snapshot; repeated subprocess invocation retains records. No durable user write/revision capability exists. |
| 3 Scoped authority | PARTIAL | Local OS-only process boundary; no identity/grants/expiry/cross-user application checks. Read-only command rejects malformed/unknown capability/method; no production connections. |
| 4 Human usability | PARTIAL | Executed plain terminal workbench with AI disabled; help, errors and pair reasons supplied. Independent human/owner keyboard usability acceptance NOT RUN. |
| 5 Visible supervision | NOT APPLICABLE | No user state write or external effect; proposals/results/reasons are inspectable. |
| 6 Safe recovery | NOT APPLICABLE | No user write/effect; deterministic read-only retries; evaluation outputs are disposable derived synthetic artifacts. |
| 7 Receipts | NOT APPLICABLE | No state/effect transaction; outputs and logs are experimental evidence, not authenticated receipts. |

Independent H3, owner acceptance, hosted/live tests, security and release closure: NOT RUN. Partial gates prevent claiming accepted product completion. Existing global/project gates remain unchanged.

## Next integration prerequisite

Keep this offline. First independently adjudicate a larger frozen set with real authorized metadata and distinct incident IDs; resolve negation, number/event identity and source-lineage ambiguity. Compare a locally licensed encoder only when already available and calibrated on development data with new untouched holdout. Before a production proposal, define authorized actor/scope, test current actual ingestion/incident pipeline, preserve originals and nullable values, obtain separate independent review and owner installation decision. No automatic promotion, deletion or confidence score increase is justified.

Context writeback: recent result/next step recorded here because allowed writes exclude docs/LAST_30_DAYS.md, docs/NEXT_TASK_QUEUE.md and the vault. Canonical priority and state files remain untouched.

## Exact artifact inventory

${[...readdirSync(root),'REPORT.md'].filter((x,i,a)=>a.indexOf(x)===i).sort().map(n=>'- '+n).join('\n')}

All paths above are relative to experiments/arxiv-20261113-dedup/. Production source files were read/imported only. Non-obvious constraints are explained beside the implementation and above; no separate production rationale edits apply.
`;
writeFileSync(new URL('REPORT.md',root),report);
