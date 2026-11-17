# Maritime signal separation — local candidate

2026-10-02. Candidate snapshot of `C:/Users/zacha/Workspace/20_Products/Live_Map`, remote `https://github.com/Zacharon/live-map.git`, branch `feature/evidence-semantic-globe`, HEAD `1640bed51a76fb916f570d755bf5e576ccc36646` plus inherited dirty source. Candidate lives in `C:/Users/zacha/Documents/Codex/2026-10-02/task-2/live-map-maritime-candidate`. Canonical source is not installed or changed by this task.

## Existing model and bounded gap

The L01–L11 evaluator already separates diplomacy, physical access, throughput and commercial access. This extends that evaluator with four maritime evidence views; it does not replace the workbench, Cesium/Leaflet renderer, source registry, routes, or operational dimensions. Four-signal separation is a design choice, not a claim from a news source.

| View | Qualifying existing record | Meaning / limits |
| --- | --- | --- |
| `visibleAIS` | Explicit `extra.maritimeSignal: visibleAIS`, or existing `proxyNotThroughput` / `n_total` proxy | Loaded AIS observations, including legitimate zero reports. Missing AIS means visibility unknown, never no ships or zero cargo. Inferred/modeled inputs cannot count as visible observations. |
| `inferredDarkTraffic` | Explicit signal or `extra.darkTrafficInference: true` | An attributed inference only. A gap alone creates no transit, identity, cargo or illegality claim. |
| `cargoThroughput` | Existing `throughput-measurement` or `maritime-aggregate` with `extra.measurementBasis: cargo-confirmed` or `published-cargo-estimate` | Stated cargo-confirmation basis remains distinct from published estimates. A confirmation basis is an input's declared method, not independent verification by this view. Numeric scalar and units required; inference cannot become confirmed cargo. No conversion, averaging, total, volume estimate, baseline or recovery conclusion is invented. |
| `securityRisk` | Existing `physical-security-report` | Reports retain their own `extra.securityState`; no composite score or safe-passage verdict. Missing reports remain unknown. Diplomacy/flow never clears risk. |

Each view contains evidence IDs/revisions and separate provider/URL, method, observed/published/retrieved clocks, observation period, scope, coverage, confidence, limitations and freshness. Missing values stay unknown. `extra.analyticalConfidence` requires a low/medium/high level and rationale; the overall operating confidence never supplies it. Coverage remains per record. Different estimates are retained independently, without pretending different methods/scopes are necessarily direct contradictions; explicit `extra.contradictsId` exposes both records.

Freshness uses content time and explicitly declared `extra.maxAgeMs`, not acquisition time. No policy/date means current coverage is unestablished. Source retirement/outage/staleness remains inspectable and cannot qualify as current. Historical PortWatch stays historical, with cargo unknown. Future observation/day/publication/window and `extra.forecast`, `conditional` or `scenario` records remain contextual and are excluded from observed cargo and the operating ratio. A security notice's future expiry is an ongoing validity interval, not a future observation.

Measured-throughput comparison also rejects null/blank/boolean/array/nonfinite values, missing units, AIS/dark proxy baselines, traffic inferences and published estimates. Modeled expected baselines remain valid under the existing unvalidated threshold method. This repairs the previous missing-value-to-zero coercion. No AIS sample drives cargo or risk.

## Existing UI and export

Passage cards have a compact four-signal summary. The existing selected passage → Investigate → Assessment inspector has native keyboard disclosures and source links. Each evidence record exposes the independent fields. JSON case assessments retain the signal views; the existing allowlisted Markdown projection includes states, clocks, current evidence counts, coverage/confidence references and unknowns. Cargo imports cannot be charted under the historical PortWatch n_total caption.

Synthetic regression fixtures have invented values (0 AIS reports; 2 possible inferred transits; separate 4 and 7 cargo counts; unresolved risk). All are explicitly synthetic and use `example.invalid` attribution links. They are not added to active provider feeds or the default demo. The browser harness imports a synthetic case through the existing local JSON workflow. Existing frozen PortWatch provenance is reused without retrieval. The Oct 2 Reuters/S&P/Kpler figures and conditional October forecast are not installed as claims; no commercial source license or live access is implied.

## Verification and handoff

See `../evidence/test-maritime.txt`, syntax logs, `../evidence/validate-nonsecurity.txt`, browser result/screenshots if completed, and the independent review delivered with this candidate. The five focused suites cover independence, legitimate zero/unknown, scope, acquisition cutoff, future/stale content, explicit contradictions, numeric/proxy guards, review invalidation, import/export and historical chart fidelity.

| Check | Local result |
| --- | --- |
| `npm.cmd run test:maritime` | PASS: all five focused suites |
| `npm.cmd run check:syntax`, `check:chokepoints`, `check:maritime` | PASS |
| `node evidence/validate-nonsecurity.mjs` | PASS: nine offline event-envelope checks, zero failures; declared offline/provider warnings |
| `node scripts/runtime-maritime-signals.mjs` | PASS: twelve browser checks, zero exceptions and zero failed requests; real Cesium, existing JSON import, native Enter disclosure, desktop panel bounds/hit testing, actual mobile Reports pane and panel overflow |
| `node evidence/check-patch.mjs` | PASS: relative patch dry-run against copied original files in an isolated scratch directory |
| Independent review | [Exact hashes, adversarial reruns and H3 scope](../../review/MARITIME_H3_REVIEW.md); independent owner visual acceptance remains separate |

Final browser artifacts: [result](../evidence/browser/results.json), [four maritime signals beside Cesium](../evidence/browser/synthetic-four-signals.png), [desktop provenance](../evidence/browser/desktop-cargo-provenance.png), [visible mobile Reports provenance](../evidence/browser/mobile-cargo-provenance.png). Earlier harness assertions were strengthened after independent visual review found an invisible mobile Map-pane inspector and a narrow header overflow; the final images show the actual disclosures. Browser verification required user-context execution because sandboxed Edge DevTools timed out. Initial missing-source failure was fixed by restoring the legitimate `src/artifacts` modules omitted by the snapshot's artifact exclusion.

The [handoff manifest](../evidence/handoff-manifest.json) identifies all sixteen changed files with baseline/candidate/current-canonical SHA-256 values. At final handoff generation the changed files had zero canonical reconciliation conflicts; before/after canonical Git status was identical. [Candidate patch](../evidence/candidate.patch) was checked only in scratch and has not been installed.

Stock `npm run validate` includes a browser-secret scan, and the full platform suite includes authentication/security tests. These are NOT RUN because the user explicitly excluded that work. Its non-security offline event-envelope checks are run separately using `node evidence/validate-nonsecurity.mjs`; source reachability is excluded. This is not a release/security gate pass.

No commit, push, merge, deployment, paid API, credential change, source/provider activation, route change, or new source contact. OS MAPS visuals are outside this LiveMap product slice. Owner must decide whether to reconcile/install this candidate into current dirty canonical source and accept the UI; publication and source activation require separate authority. Compare baseline/current hashes first, especially shared package and memory docs. Existing production CSP, provider policy and owner release gates remain open.
