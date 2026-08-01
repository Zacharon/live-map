# Wayfinder #61 — Map visual grammar

**Date:** 2026-08-01  
**Ticket:** [#61](https://github.com/Zacharon/live-map/issues/61)  
**Status:** Prototype specification + evolutionary chrome polish  
**Bound by #60 (locked):** No automated live control polygons; assessed control analyst-only; admin ≠ control; ACLED link-only; global-only core.

## Core question

How do events, borders, territorial control (future), uncertainty, routes, chokepoints, and moving assets coexist **without map spaghetti**?

---

## 1. Layer z-order (bottom → top)

| Stack | Pane / layer | Content | Public default | Standard | Advanced |
|-------|--------------|---------|----------------|----------|----------|
| 0 | Tile basemap | Satellite / dark / street | On | On | On |
| 1 | Boundary labels (satellite mode) | Place/boundary labels | On with sat | On | On |
| 2 | **Admin / country reference** | Country bounds, CII circles | Off unless toggled | Off | Optional |
| 3 | **Infrastructure reference** | Airports / ports (zoom ≥ 4) | Off unless toggled | Off | Optional |
| 4 | **Chokepoints** | Generalized points/lines/polys + condition color | On in Chokepoints view | Contextual | On when view active |
| 5 | **Event geometries** | Alert polygons (NWS etc.) soft fill | If event passes #56 bar | On | On |
| 6 | **Event markers / clusters** | Primary attention objects | On | On | On |
| 7 | **Moving assets** | Aircraft / vessels (capped, viewport) | Off unless toggled | Off | Optional |
| 8 | **Selection / cluster highlight** | Rings, focus | Interaction only | On | On |
| 9 | **Chrome** | Toolbar, floating controls, compact legend | On | On | On |

**Rule:** Attention objects (events, selection) always sit **above** reference and chokepoint fills. Chokepoints must not bury markers (`bringToFront` only for highlight/selection rings).

### Future (not drawn now)

| Stack | Layer | Visibility |
|-------|-------|------------|
| Between 3–4 | Disputed admin styling (Natural Earth class) | Quiet basemap accent |
| Analyst-only | Assessed control / multi-claim hatches | Advanced + explicit toggle; **never** public default |
| Never | Live scraped commercial control; social front lines; predictive control | — |

---

## 2. Default visibility by mode

### Standard (operator default)

**On:** basemap, event clusters/markers (public-bar filtered), compact map legend, essential floating controls.  
**Off / quiet:** dense tracking panels, airport/port pins, aircraft/vessels, CII choropleth noise, multi-panel OSINT chrome, diagnostics.  
**View-scoped:** Chokepoints overlays when Chokepoints view is active; hide when leaving view (existing controller rule).

### Advanced

All Standard layers plus: tracking toggles, reference pins, connections/change panels, richer legend (severity + threat + change), provider health.

---

## 3. Uncertainty encoding (never fake precision)

| Signal | Encoding |
|--------|----------|
| **Low geo confidence / approximate** | Smaller marker, lower fill opacity, soft tooltip “approximate location” |
| **Discovery lead / observation** | Square / non-circle marker class (`record-marker`); never solid “confirmed event” chrome |
| **Non-geographic** | **Not drawn** on map; list-only with reason |
| **Stale moving object** | Lower opacity (already) |
| **Chokepoint unknown** | Neutral gray; dashed if line; no alarming red |
| **Chokepoint watch/disrupted** | Amber → orange scale (condition, not sovereignty) |
| **Event polygon** | Low fill opacity (≤0.24 selected); stroke > fill |
| **Future multi-claim control** | Hatched dual colors, 30–40% opacity, **no** solid fill as truth; always `asOf` + sources |
| **Future contested / unclear** | Gray hatch or stipple; explicit legend key |
| **Cluster** | Count badge only; no severity average as color-of-truth without label |

**Forbidden uncertainty lies:** hard borders for soft data; solid control fills; treating social volume as confidence; implying admin boundary = control.

---

## 4. Multi-claim / disputed control (design only — no geometry now)

When a human-reviewed `control-assessment` exists later:

1. **Never** a single opaque partisan fill as product truth.  
2. Prefer: dual-claim hatch, “disputed”, “unclear”, “assessed as of DATE”.  
3. Public map: **do not show** by default (#60).  
4. Analyst map: soft polygons under events, above admin reference.  
5. Click → investigation drawer with sources, not “X owns this”.

Disputed **administrative** basemap (Natural Earth class) uses quiet boundary styling only — labeled “disputed boundary / reference”, never “controlled by”.

---

## 5. Chokepoint vs event density deconfliction

| Rule | Behavior |
|------|----------|
| Z-order | Chokepoints under event markers |
| Geometry style | Low fill (0.06–0.16); lines dashed; points moderate radius |
| Selection | Selected chokepoint elevates stroke; related events may dim others (existing) |
| Color language | Condition palette (normal/watch/disrupted/closed) **orthogonal** to event category colors |
| Clustering | Events cluster; chokepoints never join event clusters |
| Density | At world zoom, chokepoint fills nearly invisible; markers/clusters dominate |
| Labels | Tooltip on hover only — no permanent label collision with marker text |

---

## 6. Density / declutter by zoom

| Zoom | Events | Reference | Chokepoints | Moving |
|------|--------|-----------|-------------|--------|
| ≤ 3 (world) | Aggressive clustering (`maxClusterRadius` ~52–56) | Hidden | Soft outline only | Hidden |
| 4–6 | Cluster; spiderfy near max | Airports/ports if toggled (cap 50) | Visible generalized shapes | Cap / viewport only |
| ≥ 7 | Clustering off / spiderfy | More reference OK | Detail geometry OK | Viewport + stale dim |
| ≥ 9 | Individual markers | Optional dense ref still capped | Local chokepoint focus | Performance cap |

**Hard caps remain:** moving-object limits, reference slice(50), cluster disable at configured zoom.

---

## 7. Color-blind safe constraints

| Use | Safe approach |
|-----|----------------|
| Severity | Not hue-only: keep label tags + position in list; map uses category color **plus** size/selection ring |
| Chokepoint status | Shape/dash (line dash) + hue; avoid red/green only pair for sole meaning |
| Selection | Cyan/teal ring + weight (not only color swap) |
| New vs updated | Green vs amber **plus** card badges with text |
| Basemap | Dark/satellite default; legend contrast ≥ WCAG-ish on chrome |
| Patterns | Future control uses hatch patterns, not red vs blue alone |

Primary accent remains cyan; hot states amber/red with text labels in UI chrome.

---

## 8. What is **never** drawn on the public map

Per #56 + #60 + RESPONSIBLE_USE:

- Automated live territorial-control polygons as product truth  
- Hard “side A controls region X” fills  
- ACLED (or other license-blocked) data without approval  
- Social-inferred front lines  
- Predictive control / targeting layers  
- Sensitive humanitarian precision (camps, shelters, victims)  
- Raw credentials / personal tracking  
- Non-geographic events as fake coordinates  
- Discovery leads promoted as confirmed map claims without bar  
- 3D globe as productized default (fog — beta only)

---

## 9. Chrome grammar (map stage UI)

| Element | Role | Polish rule |
|---------|------|-------------|
| Map stage | Primary surface | Strong vignette; drawers recede |
| Toolbar | Mode / basemap | Single glass strip; no stacked opaque boxes |
| Floating controls | View actions | Compact pills; bottom-left stack without covering legend |
| Legend | Decode only | Compact; hide on very small screens; no duplicate of full v2 legend |
| Zoom control | Navigation | Bottom-right; quiet dark glass |
| Health / errors | System | Transient; not permanent clutter |

---

## 10. Implementation notes (this phase)

Evolutionary only:

- Leaflet **custom panes** for z-order (country → reference → chokepoint → markers → moving → highlight)  
- Stop chokepoint `bringToFront` from covering events  
- Slightly stronger clustering at world scale  
- Legend includes chokepoint + record-kind keys  
- CSS: cleaner floating chrome, marker hierarchy, reduced panel competition  

**Not implemented:** control polygons, new basemap boundary tiles, UCDP adapter (separate engineering ticket).

---

## 11. Acceptance for “grammar locked”

- [x] Spec covers z-order, modes, uncertainty, multi-claim design, chokepoint deconfliction, zoom density, a11y, public never-list  
- [x] Evolutionary map controller + CSS polish PR  
- [ ] Human review of this grammar on #61  
- [ ] After lock → #62 lifecycle/scale  

---

## Related

- #60 research: `docs/wayfinder-60-territorial-control-research.md`  
- Moving objects: `docs/MOVING_OBJECTS.md`  
- Chokepoints: `docs/STRATEGIC_CHOKEPOINTS_V1.md`  
- Public map bar: #56  
