# Ceasefire claim verification — isolated local candidate

Task: CEASEFIRE-20261012. R2 bounded fixture and minimal display/validation support. Canonical checkout and vault controls are read-only. Dedicated branch `codex/ceasefire-fixture-20261012`; inherited HEAD `1640bed51a76fb916f570d755bf5e576ccc36646`, remote `https://github.com/Zacharon/live-map.git`. The installed dirty app was copied with per-file before/after hashes in `artifacts/ceasefire-20261012/baseline.json`; HEAD alone is not the baseline.

## Contract before implementation

`ceasefire-assessment/v1` is a synchronous local read/derive capability. Input: existing workbench-v1 case JSON, with `caseType: ceasefire-v1`, a bounded scope (parties, geography, infrastructure type, start/end/asOf) and attributed existing evidence records carrying `extra.ceasefire`. Output: draft assessment and independently retained record dispositions. No approval, publication, live ingestion or map-marker effect. Human: existing Case selector, Evidence, Assessment, Changes and Export tabs. Agent: existing parseCaseFile -> draftOperationalAssessment -> serializeCase commands, exposed by a bounded task replay CLI. Both recompute the same result; imported assessment claims are not trusted as current results.

Local file export/import is the durable handoff; browser state is a working copy. No authenticated principal, represented-user verification, shared server storage, grants, expiry or cross-user isolation is claimed. Imported approvals remain historical; fixture controls offer no approval action. Derivation has no write side effects or jobs, so cancellation means leaving the view. Explicit JSON download/import can restore the case after restart; there is no background transfer between browser and CLI. Scoped idempotent writes, concurrency conflict handling and atomic authenticated receipts do not exist in the inherited workbench and are not added by this one-fixture scope. Seven-gate assessment will retain these limitations.

## Planned checks

Premature compliance; contradictory acknowledgments; same-origin/syndicated duplication; unknown provenance; stale/out-of-window and future records; sanctions versus observed impact; bounded geography/party/infrastructure/time; explicit compliance observation versus silence; JSON round trip and recomputation; ordinary UI controls and restart/import. Run focused regression, `npm run check:syntax`, `npm run validate` and independent h3_verifier. Shared state/control writeback is proposed in the final report only. No provider flags, routes, engines, deployment policy or release/security gates may change.

## Local review registration

Parent is sole writer. `h3_verifier` will review read-only after evidence exists, under the canonical H3 protocol. This task-local entry replaces a shared run-board write during the concurrent batch, as required by the dispatch boundary.
