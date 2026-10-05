# Systems Desk USGS source baseline — October 5

The Systems Desk candidate previously had HEAD `1640bed51a76fb916f570d755bf5e576ccc36646` plus uncommitted source. This isolated branch preserves that cumulative source, including the October 4 energy model, and repairs reload persistence. GitHub main was read on October 5 as `84a4dff47fa8f96a1d8eb482a446743900a3275e` with no open PRs. The candidate remains based on its actual September 16 parent; it has not been rebased, integrated into main or deployed.

## Exact source and boundaries

[Original candidate manifest](provenance/SYSTEMS_CANDIDATE_20261005.json) records 907 copied file hashes, original HEAD, branch and dirty status. The original worktree remains `C:/Users/zacha/Workspace/_worktrees/live-map-intelligence-20261001`. Generated reports/builds, private cache, dependency folders and local configuration remain there; they are excluded from the source snapshot. This branch includes the runtime, provider/API, existing ingestion implementation, vendor licenses, package locks and tests. Dated GDACS/NOAA public test responses now live under development fixtures so the ledger suite no longer depends on ignored artifacts.

October 1/2 reports in the original candidate describe a separately published beta with hosted H3, contrary to the supplied review's implementation-only inference. Those reports are historical evidence; this baseline makes no fresh hosted-runtime or durable-storage claim. #61 human acceptance remains open. Broader #59 suppression rules, native PostgreSQL concurrency/restore, hosted durability and aircraft/ship activation remain separate.

## Behavior

- Selection persists in the URL as source + kind + original provider ID. Reload and 2D/3D switches preserve that reference; matching IDs in different providers remain distinct. Legacy ID-only links remain readable.
- Register rows show the original ID and original-source link. The inspector retains occurrence, source update and retrieval clocks and freshness. Map entities carry the same ID/link; selected globe labels and 2D tooltips display the ID.
- Evidence exports retain the optional API source revision and environment. Unidentified hosted builds remain unknown rather than receiving a guessed revision.
- The acceptance preview uses the existing USGS adapter, collector, replaceable cache, API envelope and candidate UI. One fixed public M2.5+ seven-day feed read acquires genuine data. It provisions no scheduler/database and activates no hosted provider.

## Reproduce

Use Node 22 or later from this branch. No package installation is required for the USGS-only preview.

```powershell
node scripts/build-live-beta.mjs
node scripts/preview-systems-usgs.mjs --collect
# Open http://127.0.0.1:8789/?layout=systems
```

The preview binds loopback only and serves the public manifest allowlist. Both `/api/events` and `/.netlify/functions/events` read the same cache; private paths return 404. Runtime source identity and the original acquisition hash are recorded in `artifacts/usgs-baseline-2026-10-05/`. Browser refresh makes no upstream request. For later reproduction, running without `--collect` reuses that genuine acquired cache. Collection errors stop acquisition; fixtures never fill the feed.

Write one of `available`, `upstream-failure`, `empty-failure`, or `api-failure` to `artifacts/usgs-baseline-2026-10-05/control.txt`, then use **Refresh data**. Failure cases are local simulations: upstream failure retains genuine records as Stale; empty first failure is Unavailable with zero records; API failure keeps browser records visibly stale. The original good cache is untouched. These controls prove failure presentation, not a real provider outage/recovery.

```powershell
node --test tests/systems-workspace-url-tests.mjs tests/live-beta-tests.mjs tests/evidence-ledger-tests.mjs tests/energy-state-tests.mjs
node tests/intelligence-workbench-tests.mjs
npm run check:syntax
npm run validate -- --offline
```

Local verification results, tested commit, original event ID/link and actual browser captures are retained in `artifacts/usgs-baseline-2026-10-05/REPORT.md`. Offline validation does not prove network reachability or repair GitHub main's September 29 CI run. No push, PR, merge or deployment occurs in this baseline.
