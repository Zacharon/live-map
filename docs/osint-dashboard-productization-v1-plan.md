# OSINT Dashboard Productization v1 Plan

## Dependency

**Depends on Event Artifacts v1** (`6d52274` / `feature/event-artifacts-v1-exports`).

Do not merge this branch without the artifacts base (or squash both carefully).

## What already works well

- Live multi-provider event feed on a map
- Dashboard v2 shell (summary, timeline, clusters, filters, provider health)
- Change awareness (since last visit)
- Event/cluster detail drawer
- Exportable OSINT artifacts (Markdown/JSON)
- Client-only security posture (no secrets in browser for core path)

## What blocked “professional / sellable” feel

1. No operator mission summary (what first?)
2. No explainable threat/attention band (severity alone is not enough)
3. Connections buried in artifact list
4. Drawer not a full analyst reference card
5. Weak empty/filter/error operator copy
6. Limited legend / visual hierarchy
7. Docs for operators incomplete

## This sprint improves

| Priority | Delivery |
|----------|----------|
| P1 | Operator command bar + legend + focus empty state |
| P2 | Threat Level v0 (pure heuristic module + drawer/timeline badges) |
| P3 | Event Connections v0 (drawer panel, reuses related-event logic) |
| P4 | Drawer as analyst card (why shown, threat, connections, source badge, artifacts) |
| P5 | Clearer loading/error/empty/filter copy |
| P6 | Operator guide + plan/verification docs |
| P7 | CSS hierarchy for command bar, threat, connections |

## Why no backend / providers / globe

Productization is **operator usefulness and credibility**, not coverage or map-engine churn. Substance before globe. No new ToS/rate-limit surface.

## Future sellability foundation

- Explainable threat language (honest caveats)
- Connection strip (relationship narrative without a graph product)
- Exportable artifacts (handoff)
- Operator guide (demo + portfolio story)
- Still local-only — safe to show publicly without accounts

## Intentionally deferred

- Cesium / map engine rewrite
- STIX
- Investigation workspace (editable notes, cases)
- Source-confidence deep scoring
- New providers / network fetches
- Auth, payments, deploy
