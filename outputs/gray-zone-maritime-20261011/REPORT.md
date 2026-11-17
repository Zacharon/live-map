# Gray-zone maritime activity — isolated local candidate

The existing Live Map workbench now inspects the Taiwan east-coast historical reporting fixture through ordinary Evidence/Assessment controls and the same read-only command used by an agent. It separates **VESSEL OBSERVED** (reported sighting), **COORDINATION INFERRED** (attributed inference) and **BLOCKADE PREPARATION CLAIMED** (attributed claim). No precise vessel location or operational mission is inferred. [Source ledger](SOURCES.md) distinguishes the mid-August occurrence, October 8 publication and October 11 retrieval.

Candidate: `C:/Users/zacha/Workspace/_worktrees/live-map-gray-zone-maritime-20261011`, branch `codex/gray-zone-maritime-20261011`. Remote identity verified as `Zacharon/live-map`. Canonical dirty branch `feature/evidence-semantic-globe` and HEAD `1640bed51a76fb916f570d755bf5e576ccc36646` were preserved. The candidate reused 830 current authored runtime/check paths rather than assuming HEAD was the baseline. [Task contract](TASK.md), [authored baseline](authored-baseline.json), [task delta](changes.json) and [preservation check](preservation.json) bind this scope.

Independent H3: **VERIFIED** for the freeze at `2026-10-11T22:03:39.927Z`, changes digest `8866507c026e8a9c613d5ca8ad1a89d211c032f72467d5754cc083bac290fc01`. See [independent review result](H3.md). No remediation remains for this bounded local inspection scope. This report does not constitute owner acceptance or installation authorization.

## Use the candidate

[Open the local preview](http://127.0.0.1:8785/?demo=foundation&mapMode=3d&view=chokepoints&chokepoint=taiwan-strait&workbench=1&case=gray-zone-maritime-taiwan-2026-08). The loopback static preview uses Cesium and an explicitly synthetic background scenario. Its map labels, demo date and markers are not the vessel sighting. The fixture has no map geometry. `/api/*` is unavailable in this static preview; no collector or source provider is activated.

From the candidate directory, with the installed Node runtime in PATH:

```powershell
node scripts/preview-foundation.mjs 8785
node outputs/gray-zone-maritime-20261011/evaluate.mjs
node outputs/gray-zone-maritime-20261011/evaluate.mjs outputs/gray-zone-maritime-20261011/browser-export.json
node tests/gray-zone-maritime-tests.mjs
npm.cmd run test:maritime
```

Choose the named Case, select a vessel in Evidence, inspect its attributed identity/class, textual coverage, method, associations, clocks, confidence and unknowns, then open Assessment. Keyboard Enter selects records. Export downloads public-safe versioned JSON; Import reuses `parseCaseFile`. A rejected import preserves the previous case. Imported arbitrary cases are session-only and require reimport after restart; reload of the named fixture reads and revalidates the durable fixture. No assessed Markdown product exists. The final actual download used `gray-zone-maritime-taiwan-case-2026-10-11T22-00-02-836Z.json`; its bytes are preserved as `browser-export.json`. The earlier old-prefix export remains separately preserved as `browser-export-earlier.json`.

## Exact application delta

| Path | Change |
|---|---|
| `data/development-fixtures/gray-zone-maritime-taiwan-2026-08.json` | New public-safe historical-reporting fixture, three vessel records, attributed CGA response, three distinct claims and two co-collection relationships. |
| `src/intelligence/gray-zone-maritime.js` | Shared semantic validation and read-only inspection, source-loss unknown states and shared inspection receipt. |
| `src/intelligence/case-io.js` | Existing bounded case parser applies fixture semantics before imported approval neutralization. |
| `src/ui/evidence-detail.js` | Shows reporting attribution, vessel/class, associations, textual location, period, source access and explicit unknowns. |
| `src/ui/investigation-workbench.js` | Named fixture, three conclusion blocks, honest historical labels, inspection receipt, JSON-only export and case-specific filename. |
| `src/app-controller.js` | Existing controller loads/selects/reloads the fixture, preserves imported local case state within the session, discards superseded loads and omits unrelated operating assessment wrapper. |
| `tests/gray-zone-maritime-tests.mjs` | Semantic, unknown, source-loss, roundtrip, operating non-promotion and 33 negative-import checks. |
| `docs/LAST_30_DAYS.md` | Candidate-local context and capability editing pointers. |
| `docs/NEXT_TASK_QUEUE.md` | Candidate-local review/install boundary; preserves existing gates. |

Output-only scripts and evidence live in this report's folder. No shared vault writes, canonical application writes, account/credential changes, paid/model calls, push, merge, deployment, current tracking or installation occurred. Rollback is to stop the preview and leave/remove this candidate only after a separately authorized cleanup; canonical application bytes need no rollback.

## Verification actually performed

| Check | Result and evidence |
|---|---|
| New semantic suite | PASS: three identities; typed record validity; unknown clocks/geography; one sighting origin; three separate attributed conclusions; 33 rejected import mutations plus raw/wrapped/relationship record limits and multibyte UTF-8 size; source loss/missing support; repeat read and export roundtrip; read-only receipts; inspector labels; no Taiwan Strait operating/throughput promotion. [Final focused output](check-final-focused.json). |
| Existing maritime suites and selection | PASS: five maritime/operational/workbench/PortWatch/brief suites, plus direct selection. [Final focused output](check-final-focused.json). |
| Repository syntax / Cloudflare exports | PASS. [Syntax output](check-final-syntax.json). Final parser repairs are additionally covered by the final all-file offline syntax scan and semantic/regression suites. |
| Full validator, network-capable read | PASS, 10 checks, 0 failed, 469 returned events, 28 sources and 20 reachable URLs. [Network summary](check-validate-network.json). Earlier sandbox attempt failed network reads; authorized rerun passed. This predates final receipt/label changes and is not maritime observation evidence. |
| Final offline validator | PASS, 10 checks, 0 failed, 381 syntax files and 331 browser-served files scanned. [Output](check-final-offline.json). Mocked provider 503 warnings and skipped URL reachability are explicit; not live API evidence. |
| Browser, actual in-app surface | PASS named fixture, direct vessel selection, keyboard Enter, selected vessel + named fixture after reload, Cesium retained, mobile 390×844 without horizontal overflow, source-loss import produces three unknown states, invalid provenance import visibly rejected while case preserved, versioned JSON downloaded and revalidated by the agent adapter. [Browser record](browser-results.json). |
| Human/agent equivalence | PASS portable exported bytes parsed by the same parser and inspected by the same command; three output states and shared receipt fingerprint match the final browser DOM. [Fixture receipt](agent-receipt.json), [actual browser export receipt](browser-export-receipt.json). |
| Scope / preservation / rationale | See [preservation](preservation.json), [nine-path before/after hashes](changes.json), [coverage output](rationale-check.json) and code rationale below. Coverage alone does not prove explanation quality. |

Browser artifacts: [desktop assessment](desktop-assessment-final.jpg), [vessel inspector](desktop-vessel.jpg), [mobile vessel](mobile-vessel.jpg), [mobile shared receipt](mobile-receipt.jpg), [source loss](source-loss.jpg), [rejected import](import-rejection.jpg), [final actual downloaded bytes](browser-export.json). Browser error log read returned no captured error entries. An intermediate download capture timed out; the final corrected download succeeded and its exact bytes match the corrected fixture's shared inspection result. Browser filechooser/download operations were slow. No hosted or physical-device evidence is claimed.

## Seven gates for `gray-zone-maritime.inspect/v1`

These apply only to anonymous read-only public-safe fixture inspection. They do not certify pre-existing workbench mutation, private case storage, multi-user authority or ingestion.

| Gate | Status | Exact scoped evidence / applicability |
|---|---|---|
| Shared capabilities | PASS | Ordinary selector/import → `parseCaseFile` → `inspectGrayZoneMaritime`; task-local CLI uses the same functions. Exported browser bytes yield the same three states and final fingerprint. Semantic and browser rejection both enforce reported provenance. |
| Shared state | PASS for immutable reading / portable files | Static fixture bytes and explicit downloaded JSON are authoritative read inputs. Named case and selected vessel reload correctly; exported file revalidates in CLI. Browser import is session-only, clearly documented. Cross-interface persistent edits/revisions are NOT APPLICABLE: there is no editing capability. |
| Scoped authority | NOT APPLICABLE to privileged/user writes | No authenticated user, represented principal, grant, private case server or privileged write exists. Anonymous local read grants no approval authority. No review action or operational draft exists here; parser rejects imported assessments/products and retains existing approval neutralization for other cases. Cross-user, expired grant and hosted ownership tests are NOT RUN and no such capability is claimed. |
| Human usability | PASS | AI disabled; actual Case, Evidence, Assessment, Import, JSON Export and disclosure controls; keyboard selection, reload and 390px mobile containment. Import error is understandable. Browser export bytes exist. |
| Visible supervision | PASS | Attribution, three unestablished states, source-loss unknowns, unavailable originals, and unknown mission/intent/legal geometry are visible. Human can switch cases and inspect the shared read-only receipt. No background job/delegation; cancel/takeover of remote jobs is NOT APPLICABLE. |
| Safe recovery | PASS for read-only inspection | Repeat identical input yields equal result/receipt and no effect. Invalid import preserves current case. Source loss suppresses dependent conclusions without erasing historical attribution. Durable-write retry key, conflict-safe Undo, transaction atomicity and compensation are NOT APPLICABLE because no durable mutation exists. Superseded session-load guard is source-inspected; deliberately delayed network race was NOT RUN. |
| Receipts | PASS for read-only inspection | Shared core returns operation, case target, factual input fingerprint, safe counts/classification, anonymous actor, no represented user/delegation/approval, null before/after revisions, no effect, outcome and repeat-read recovery. Same receipt is visible in ordinary UI and agent result. CLI additionally hashes the full input bytes with SHA-256. FNV fingerprint is not cryptographic authority. State/receipt write commit atomicity is NOT APPLICABLE: no write. |

Live model/platform, hosted multi-user/recovery, provider activation and owner visual acceptance remain NOT RUN/separately gated. A `read-public-report` label records this dated read; it is not a continuing reachability probe. Import semantics constrain this fixture's fields, not authenticate arbitrary source prose. Exact day/time, MMSI/IMO, track, point, hostile intent, mission and independent corroboration remain unknown.

## Editing rationale and coverage

Initial independent review reproduced malformed-import crashes in parent-evidence IDs, limitations, vessel associations, history and parked records. The repair validates consumed structured fields before session replacement. Review also caught observed provenance on a reported co-occurrence relationship and a nonnumeric origin count. Regression cases reject those reproductions, malformed parked records and imported source-reliability promotion. CGA rights attribution and its separate response period were corrected. Parser limits now count actual wrapped/raw case records, including relationships, and enforce UTF-8 bytes with `TextEncoder`; focused tests disprove both prior bypasses. The frozen manifest and rationale coverage were refreshed after these targeted repairs; no baseline or allowed scope changed.

Keep this fixture within the existing workbench, parser and evidence contracts. There is no new event feed, poller, framework or geometry. The controller's generation guard prevents older async loads from replacing a more recent case request. The gray-zone workbench bypasses an unrelated operating/Hormuz wrapper because historical security reporting cannot determine those conditions. Historical records carry null exact timestamps and a textual period/day-precision publication field, so no midnight/day is fabricated. The shared receipt uses all reporting/source-availability input rather than the generic digest that omits `extra`.

The task-start rationale baseline was frozen before app edits and retains SHA-256 `a548e6bcebe3a9e1e6189ef868a43d09a8502d3e62489edd4ea16fdce99af73b`. The nine allowed application paths stayed fixed. Output artifacts are outside that coverage boundary. Independent review must evaluate rationale quality and task scope; the check is point-in-time coverage only.

```code-rationale
{
  "task_id": "gray-zone-maritime-20261011",
  "baseline_sha256": "a548e6bcebe3a9e1e6189ef868a43d09a8502d3e62489edd4ea16fdce99af73b",
  "changes_sha256": "8866507c026e8a9c613d5ca8ad1a89d211c032f72467d5754cc083bac290fc01",
  "entries": [
    {
      "paths": [
        "data/development-fixtures/gray-zone-maritime-taiwan-2026-08.json",
        "docs/LAST_30_DAYS.md",
        "docs/NEXT_TASK_QUEUE.md",
        "src/app-controller.js",
        "src/intelligence/case-io.js",
        "src/intelligence/gray-zone-maritime.js",
        "src/ui/evidence-detail.js",
        "src/ui/investigation-workbench.js",
        "tests/gray-zone-maritime-tests.mjs"
      ],
      "disposition": "documented",
      "why": "Preserve sighting, inference and attributed purpose as three unestablished historical-report conclusions in the existing workbench.",
      "where_to_edit": "Fixture metadata; gray-zone-maritime validate/inspect; case-io parser seam; evidence-detail inspector; investigation-workbench controls/receipt; app-controller case loading/selection; focused tests and candidate-local context docs.",
      "constraints": "No exact occurrence/time, geometry, MMSI/IMO, mission, hostile intent, independent corroboration or operational assessment. Source loss gives unknown. Anonymous read-only command grants no approval. Preserve actual dirty baseline and release gates.",
      "verification": "New 33-negative semantic suite, including H3-reproduced malformed structure faults, history/parked list faults, relationship provenance, typed origin counts and source reliability; five maritime suites, direct selection, syntax/Cloudflare checks, final offline validator, actual browser selection/reload/mobile/import/export; CLI revalidated downloaded bytes and same read receipt.",
      "references": [
        {
          "path": "data/development-fixtures/gray-zone-maritime-taiwan-2026-08.json",
          "sha256": "b166013ededfc2cc02481ae5c46b8b769fc34169dad42e7f937337c776b46d69",
          "contains": "fixtureType"
        },
        {
          "path": "src/intelligence/gray-zone-maritime.js",
          "sha256": "0627d034443d61e29a01e6f9fc141f653da45431bc4a5bc7628c73395e76c477",
          "contains": "inspectGrayZoneMaritime"
        },
        {
          "path": "src/intelligence/case-io.js",
          "sha256": "007871e38417009c8711704e104b3435474c3800e80bcf3c197c0383268a6ee6",
          "contains": "validateGrayZoneMaritime"
        },
        {
          "path": "src/ui/evidence-detail.js",
          "sha256": "10a6d95042ba10a7d32eeefc20c2f0ff124b0d0946f3b4925d4a1f48ba877919",
          "contains": "historicalReporting"
        },
        {
          "path": "src/ui/investigation-workbench.js",
          "sha256": "d993ccf022b6ac4731b198b1129d19eb63597eed88124ee5acad2def5a2ea4fd",
          "contains": "grayConclusions"
        },
        {
          "path": "src/app-controller.js",
          "sha256": "8adce383fd3beb76cd34d7b563311df832d7b6ca0b23a2384bafc9cfed22be5c",
          "contains": "investigationLoadGeneration"
        },
        {
          "path": "tests/gray-zone-maritime-tests.mjs",
          "sha256": "b1e2478f637ddac94937e07534eb12d7efc6b05d52de0e5c022682a4271e4e51",
          "contains": "33 adversarial imports"
        },
        {
          "path": "docs/LAST_30_DAYS.md",
          "sha256": "d138a8b713e227a03b346381b2dbc400c66f0b95842bb02b781d80044cea43e5",
          "contains": "gray-zone-maritime.inspect/v1"
        },
        {
          "path": "docs/NEXT_TASK_QUEUE.md",
          "sha256": "8c9e291b21d9521063bca047a370170765eed927773893bbc290d832f0fe6810",
          "contains": "Gray-zone maritime candidate review"
        }
      ]
    }
  ]
}
```
