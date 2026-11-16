# USGS inspection and export

`projectUsgsEvidence(event, {sourceStatus, now})` is a public read-only capability.
The event and source status must come from the same `/api/events` envelope.
Human inspection, JSON/Markdown exports and agent imports use the same projection.
It returns an evidence record or null for unsupported identities/unsafe source URLs.
It creates no case, assessment, approval or durable user record.

## Response clock

Cached scores describe ingestion time. `withReadTimeQuality` recomputes freshness
and its attention term after deduplication, then exposes the same response-time
scores in canonical, legacy and provider-result events. It copies records rather
than rewriting cache or retrieval clocks. Retaining a stored score would make old
records look fresh during replay; computing before merge could retain an obsolete
score when dedupe adopts a later revision. Unknown/future revision clocks remain
unknown. Severity, confidence and impact retain their independent meanings.

## Evidence boundary

Occurrence, publication, revision and retrieval are separate clocks. Missing clocks
remain null; zero values remain valid. Current evidence freshness requires healthy
source status and retrieval age within 15 minutes. A carried source-clock-ahead
caveat survives projection and Markdown. Allowlisted USGS HTTPS identity is required;
unsupported records receive no USGS evidence. This is one reporting organization;
an epicenter is not an impact footprint. Projection never establishes independent
corroboration or changes review status.

## Drawer recovery

Selecting a report closes Filters and must persist that closure. Keeping the saved
open value reopens Filters on reload, leaving Reports inert on narrow screens.
The browser regression selects from the advanced timeline, reloads at 390px and
uses keyboard selection and Back. Human controls and agent inspection still share
one event identity and read model; no new authority is granted.

## Camera continuity

A programmatic camera target is exact; picking rendered terrain back from a screen
pixel adds cumulative rounding. Preserve the target while the camera pose matches
its applied pose, and derive a new ellipsoid target after operator movement.
Programmatic flights suppress intermediate move-end synchronization and commit
the captured target on completion. Otherwise cancel/start callbacks can overwrite
the return target with the selected event. Keep the current globe route, tile
warmup, flight behavior and rendering lifecycle.
The hidden 2D renderer must not overwrite the visible globe's shared camera state.

## Reproduce offline

```sh
node tests/usgs-spine-tests.mjs
node tests/usgs-composition-tests.mjs
node scripts/runtime-usgs-flow.mjs
```

The browser harness uses the existing isolated headless Edge/CDP helper and a
small explicitly synthetic cache generated in temporary storage. It blocks external
HTTPS, serves cache-only on loopback and checks actual downloaded JSON/Markdown.
No upstream feed calls or source activation. Local outputs/profiles are ignored.
Optional dated cache export: `node tests/usgs-composition-tests.mjs <cache-file>`.
Preview a supplied cache with `node scripts/preview-usgs-milestone.mjs <port> <cache-file>
--now=<ISO-clock>`; without a replay clock, old records can correctly fall outside
the time window. Capture/outage switches are rejected. A cache is never live coverage.

## Acceptance scope

Shared capabilities, read-only state and public scoped authority are tested locally.
Human usability is exercised by the browser harness; owner visual acceptance and
independent consequential review remain separate. Gates 5-7 for new durable writes
or external effects do not apply to this read-only projection. Existing browser
view-preference persistence uses the existing storage rules. No authenticated actor,
approval, release, hosted ingestion or native database recovery is certified here.


## Local verification (2026-11-16)

The isolated Edge run passed 21 checks: keyboard select/detail, real JSON and
Markdown downloads, Back focus, advanced timeline, earlier/latest loaded-data
windows, mobile reload, export focus, 320px overflow, native Tab traversal,
actual Cesium globe selection/Back, repeated refresh and narrow/wide resize.
It recorded zero unhandled exceptions and zero upstream reads. This is synthetic
local browser evidence, not owner visual acceptance or hosted/live coverage.

Regression suites cover post-dedupe freshness and attention, unknown/future
clocks, byte-preserved replay, source rejection, aviation import semantics,
selection, provider deadlines and existing platform behavior. Required syntax and
offline validator checks run separately. The validator intentionally skips source
URL reachability. Independent H3/review, owner acceptance, source activation,
production verification and deployment remain open. No merge is authorized.
