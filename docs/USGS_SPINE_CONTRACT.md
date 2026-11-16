# USGS evidence projection v1

`projectUsgsEvidence(event, {sourceStatus, now})` is a read-only application capability.
It accepts a normalized USGS event and the source status from the same API envelope,
returning an evidence-schema record or null for unsupported identity/source URLs.
Human inspection and JSON export call this same handler; agents import it from
`src/intelligence/event-evidence.js` with the event and status returned by `/api/events`.
The stable ID is unchanged. Missing clocks remain null. Current freshness requires
a healthy source and retrieval within the existing 15-minute provider policy.
`freshnessScore` and the attention term that includes it are derived at read
time from the source revision and the response clock. A cached retrieval-time
score is not authoritative and the cache file is not rewritten on replay.
When the event already carries `Source feed clock is ahead of local retrieval; freshness is uncertain.`,
`projectUsgsEvidence` keeps that sentence with the projection caveats. Markdown
export copies the same sentence into caveats. The inspector already reads the
event limitation list.

Read-time score and exported limitation, gates recorded 2026-11-13 for this
candidate only. No user-data write or external effect, so gates 5–7 are not
applicable.

| Gate | Result | Evidence |
|---|---|---|
| Shared capabilities | PASS | Served canonical, legacy, and provider-result events use `withReadTimeQuality`. `normalizeEvent` uses the same formula. Inspector, JSON evidence, and Markdown call `projectUsgsEvidence`. |
| Shared state | PASS | Replay response scores match across those copies. The on-disk cache remains the retrieval snapshot. |
| Scoped authority | PASS | Unchanged public read-only projection. No new grant, identity, or approval. |
| Human usability | PARTIAL | `artifactToMarkdown` and the cache-only replay assert the exported sentence and recomputed score. The local preview UI was not opened; the milestone server writes evidence under artifacts/usgs-composition-local in this checkout. |

Authority is public read-only event data. No authenticated actor, delegated grant,
write, case insertion, assessment, approval or durable receipt is created. Review
remains `not-reviewed`. Reads are repeatable for identical input and `now`; there
is no mutation, retry key, cancellation or Undo. Export is a local snapshot with
its generation timestamp, original occurrence/revision/retrieval times and source.
It does not establish a durable assessment/review/export workflow.

The loopback milestone server uses the existing API builder and provider normalizer.
Replay contacts no providers. Capture and outage switches are rejected in this isolated composition. No synthetic events are substituted. Production flags and hosting are unchanged.


Local composed candidate usage (no source activation):

```powershell
node tests/usgs-spine-tests.mjs
node tests/usgs-composition-tests.mjs
node scripts/preview-usgs-milestone.mjs 8792 artifacts/usgs-composition-local/saved-cache.json --now=2026-10-15T19:22:30.442Z
```

The preview is loopback-only and cache-only; capture/outage switches are rejected.
The replay test invokes the same `/api/events` response and event-artifact builder
used by the drawer export controls. The saved cache is dated historical evidence,
not current coverage. Browser/keyboard/visual acceptance is NOT RUN for this composition.
Authority is public read-only data; no approval fields or persistent case writes
are added. Export creates a local snapshot, without changing application state.
