# Duplicate grouping experiment

Bounded offline candidate; synthetic authored reports only. No production integration, live source fetch or semantic inference. Requires existing Node >=20, no install.

From the repository root, run:

```powershell
node experiments/arxiv-20261113-dedup/cli.mjs --help
node experiments/arxiv-20261113-dedup/cli.mjs --fixture experiments/arxiv-20261113-dedup/development.json --case development-syndication
node experiments/arxiv-20261113-dedup/cli.mjs --fixture experiments/arxiv-20261113-dedup/holdout.json --case holdout-negation --json
node experiments/arxiv-20261113-dedup/test.mjs
node experiments/arxiv-20261113-dedup/evaluate.mjs
```

Human workbench: choose a case and inspect group membership and the pair reasons in the terminal; add `--baseline` for the imported project predicate. No AI or server is required. `--json` changes presentation only.

Agent capability `dedup.group.v1`: pipe a JSON object to `node experiments/arxiv-20261113-dedup/cli.mjs --request - --json`, or pass a local request file. Example shape:

```json
{"capability":"dedup.group.v1","method":"candidate","records":[{"id":"a","title":"Authored example","category":"fire","startedAt":null,"latitude":null,"longitude":null,"sourceUrl":null,"severity":null}]}
```

Both interfaces call `execute` -> `group`. Input: up to 500 records with unique nonempty string `id` and string `title`, optional occurrence clocks (`startedAt`), coordinates (`latitude`,`longitude`), category, canonical/source URL, provider/event ID, source organization and syndication. Other fields pass through unchanged. Invalid requests return JSON errors on stderr and exit 1. Missing context yields abstention. Output includes all original records, groups, all pair decisions/reasons/scores, family counts, unknown origins and explicit semantic status.

Read-only capability: input JSON is the authoritative snapshot; there is no stored user state, authenticated principal, approval, grant escalation, transaction, revision or retry effect. OS local access is the only boundary. Cancellation is process interruption before stdout; rerun on the same input to recover. The evaluator writes derived synthetic results inside this experiment folder; CLI never writes input or output files itself. No URLs are fetched. Do not expose this CLI as a multi-user API without an authorization design.

`embeddingAdapter({vectors,license,modelId})` is an optional in-process adapter for already loaded licensed local vectors. It does not load a model or download anything. Reviewed provenance and separate calibration would be required before use. No such adapter was used for these measurements. Binary token cosine is lexical overlap, never semantic embeddings.

Fixtures are frozen in `freeze.json`; `evaluate.mjs` checks their hashes. The freeze generator refuses to overwrite an existing freeze. Evaluation reruns replace derived `results.json`, not cases; copy derived results within this directory before a deliberately changed experiment. Current command logs preserve the initial and final unchanged measurements. See REPORT.md for failures, evidence limits and individual feature gates.
