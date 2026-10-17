# Evidence-to-Assessment Workbench v1

Local only. 2026-09-16. Nothing deployed.

## Split

- **OSINT Forge (workflow):** requirement, collection, evidence, claims, assessment, review, invalidation.
- **Live Map (projection):** selected chokepoint, 2D/3D, timeline, public-safe product preview.

This is not a second intelligence platform and not “all OSINT tools on a globe.”

## Journey

`?demo=foundation&view=chokepoints&chokepoint=strait-of-hormuz` → **Investigate** → Question / Evidence / Assessment / Changes / Export.

Trace: standing watch → dated evidence → origin grouping → official-notice claim (issued ≠ closed) → L01–L11 draft → human review binding → local Markdown/JSON → mutate input → previous approval superseded.

## Records

Existing evidence/assessment records plus `requirement`, `collection`, `product`, `feedback`. Edges add `derived_from`, `possible_association`, `collected_with`.

`retrievedAt` is excluded from content digests. Historical replay uses `recordsKnownBy`.

Source reliability, claim credibility, and analytical confidence stay independent. F and 6 mean cannot judge. Publisher category does not auto-grade. Two sources are not required to *display* a scoped official notice; they are required before upgrading that notice into measured throughput or recovery.

## Catalog

`src/intelligence/resource-catalog.js` overlays the master registry. `upstreamStatus` is not `implementationStatus`. Upstream `live` / `api: true` never sets `automationEnabled`.

## Storage

In-memory case + explicit JSON import/export. Caps: 512 KiB, 200 records, depth 16, 4000-char strings. Derived `lastOperational` is not exported. Imported `approved=true` is historical. No public case-write API. Private case artifacts must not enter `vendor/`, `dist/`, URL state, or the preview allowlist as a publication path.

## Frozen Hormuz extract (2026-09-16)

Public PortWatch `Daily_Chokepoints_Data` query for Strait of Hormuz (`chokepoint6`), 2025-01-01..2025-01-07. Date-only field. `n_total` kept as published and is not measured throughput. Acquisition `historical_public`. Row publication date is unknown. Replay: `node scripts/replay-hormuz-frozen-sample.mjs`. Genuine draft remains `review_required`. Test-only reviewer `automated-test-only:hormuz-frozen-sample` is not owner approval. Invalidating or aging out the source removes operating conclusions that depended on it; the frozen rows stay in the case as historical evidence. A diplomatic improvement does not make throughput normal.

## Out of scope (this slice)

FAIR, TAXII, ATT&CK ingestion, SpiderFoot/Recon-ng/Kali, live PortWatch/GFS/CelesTrak, Stripe-like paid services, production publish.

## Tests

`node tests/investigation-workbench-tests.mjs` (also imported by `tests/run-tests.mjs`).
