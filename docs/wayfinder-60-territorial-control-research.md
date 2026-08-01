# Wayfinder #60 — Territorial-control intelligence research

**Date:** 2026-08-01  
**Ticket:** [#60](https://github.com/Zacharon/live-map/issues/60)  
**Status:** Research complete — **awaiting human review before close**  
**Non-goals honored:** No control geometry implemented; no real-time control claims shipped; no social-media front-line inference; no targeting.

## Core question

Which **open sources** can support conflict zones, front lines, territorial-control polygons, and disputed-control states with acceptable **licensing and provenance**?

## Repo constraints (locked)

| Constraint | Implication |
|------------|-------------|
| ROADMAP / Phase 5 product stance | Do **not** ship real-time territorial-control claims, front-line maps, military targeting, or unsourced claims as product truth |
| AGENTS / #56 public map bar | Public map only shows claims that clear the bar; control assessments are high-risk |
| #55 source governance | Legal OSINT only; credentials server-side; no ToS scraping |
| Prefer evolutionary seams | Link-only / human-reviewed layers over automated live control polygons |
| Admin ≠ control | Administrative boundaries must never be labeled as control |

## Key conceptual separation (must keep in product language)

| Concept | What it is | What it is not | Safe product role |
|---------|------------|----------------|-------------------|
| **Administrative boundary** | De jure / de facto admin unit (ADM0–ADM3) | Who holds ground today | Basemap / context only |
| **Disputed boundary** | Competing legal/sovereignty claims over a line or area | Live battlefield control | Label as disputed; cite sources |
| **Conflict event** | Time-stamped violent incident (point/area of violence) | Polygon of who controls territory | Event layer / heat / country risk |
| **Assessed control of terrain** | Analyst judgment of physical influence over an area | Legal sovereignty; complete truth | Human-reviewed, dated, attributed assessments only |
| **Contact line / FLOT** | Approximate separation of opposing forces | Survey-grade front | Analyst-only; high uncertainty styling |
| **Discovery lead** | Uncorroborated open reporting | Confirmed control | Never public map claim |

---

## Research matrix

**Allowed-use legend:**  
`ingest` = store/transform in our pipeline · `cache` = temporary server cache · `display` = show in UI · `link` = deep-link only · `human-review` = operator must approve before any map claim

| Source / dataset | License / access | Update cadence | Geometry type | Provenance quality | Allowed use | Risk notes | v2 recommendation |
|------------------|------------------|----------------|---------------|--------------------|-------------|------------|-------------------|
| **UCDP GED** (Georeferenced Event Dataset) | **CC BY 4.0**; free download + API (token for API). Cite codebook publications. Primary: [ucdp.uu.se/downloads](https://ucdp.uu.se/downloads/) | Stable yearly; **Candidate events ~monthly** | Event **points** (village-level when known); not control polygons | Research-grade; peer-reviewed methodology; fatal organized violence only | **ingest + cache + display** as **events** (not control); attribution required | **Not** territorial control; lag on candidate data; lethal-events focus undercounts non-lethal pressure | **Strong yes** for conflict **events** / country context. **No** for control polygons |
| **UCDP Candidate Events** | Same CC BY 4.0 | Monthly (≤~1 month lag claimed) | Points | Good but explicitly **candidate** (not final stable GED) | ingest + display as provisional events | Must label provisional | Analyst-visible; optional Advanced |
| **ACLED** | Proprietary; **EULA + content usage terms**; free/academic access via registration; commercial redistribution restricted. [acleddata.com/terms-of-use](https://acleddata.com/terms-of-use/) | Near-daily (product-dependent) | Event points; some monitors include third-party control layers | High for events; methodology transparent | **link** default; **ingest only after signed license** matching our use | Default open-source app **must not** ship ACLED without license review. Redistribution often blocked | **Blocked for default** until license; link-only in Source Explorer |
| **ISW / Critical Threats assessed control maps** (Ukraine-focused product line) | ISW materials ©; maps published for public viewing; **redistribution of shapefiles/API not free-for-all** — check current ISW materials terms. Methodology: [mapping methodology](https://understandingwar.org/analysis/russia-ukraine/mapping-methodology-ukraine-product-line/) | Often daily assessments | **Polygons** (assessed control, contested/infiltration concepts); FLOT-style continuous lines by military cartography custom | High for **assessed** control with explicit methodology; still assessment, not ground truth | **link** primary; optional **human-reviewed static snapshot** with dated citation if license allows | Using as automated live layer without license = risk; implies authority we do not have | **Link + cite** for operators. **No auto-ingest** of live polygons without explicit permission |
| **DeepStateMap** (Ukraine) | Custom **License Agreement** on site; not open data by default. [license](https://deepstatemap.live/license-en.html) | Frequent / near-live | Control polygons + unit symbols (sensitive) | Operational OSINT; strong for Ukraine public narrative; OPSEC-aware (hides friendly detail in public) | **link only** | Scraping / republishing polygons violates license intent; unit positions are sensitive | **Hard link-only**; never scrape |
| **Black Bird Group** frontline maps (often co-presented with ACLED monitors) | Third-party; methodology PDFs published in places (e.g. ACLED monitor citations); not a blanket open license | Weekly examples exist | Contact line / control | Specialist OSINT | **link only** unless separate license | Same as other commercial/OSINT maps | Link-only |
| **Liveuamap** | Commercial product; terms prohibit scrape/republish of map product as yours | Continuous | Mixed events + control-like overlays | Variable; speed over academic rigor | **link only** | ToS / copyright / completeness risk | Link-only; never default provider |
| **CFR Global Conflict Tracker** | Editorial product; link-out | Periodic narrative updates | Region markers / narrative, not open control polygons | Policy analysis, not raw control | **link** | Not a geometry source | Background context cards only |
| **International Crisis Group CrisisWatch** | Editorial; RSS/public pages for trends | Monthly trends | No open control polygons | High qualitative | **link** / optional RSS metadata if allowlisted | Not geometry | Discovery / briefing context |
| **Natural Earth** admin + disputed | **Public domain** (PD). [Terms](https://www.naturalearthdata.com/about/terms-of-use/) | Slow (dataset releases) | Admin polygons; **disputed areas** layers; de facto styling choices documented | Excellent for basemap; authors note de facto vs de jure choices | **ingest + cache + display** as **reference basemap** | Must **never** label as control or sovereignty truth; still cartographic choices | **Yes** — basemap / disputed styling only |
| **geoBoundaries** | **CC BY 4.0**; attribution required. [geoboundaries.org](https://www.geoboundaries.org/) | Versioned releases | ADM0–ADMn admin; global seamless layers with disputed demarcations | Strong open admin data | **ingest + cache + display** as **admin reference** | Admin ≠ control; cite Runfola et al. | **Yes** — admin reference only |
| **UN OCHA HDX / CODs** | **Per-dataset license** (CC, ODbL, etc.). [HDX licenses](https://data.humdata.org/about/license) | Varies by crisis | Admin boundaries, P-codes, operational datasets; rarely “control” | Authoritative for humanitarian ops when COD-tagged | **ingest only after per-dataset license check**; display with attribution | Sensitive precision (camps, facilities) — suppress/generalize per security policy | Country/admin context; **no** automatic control |
| **UN geospatial / peacekeeping maps** | UN maps often have restrictive copyright; many are **view/link** | Irregular | Official mission maps, ceasefire lines (when published) | High for **official** lines when UN-published | Prefer **link**; ingest only if terms allow | Legal/political sensitivity | Link official maps in investigation drawer |
| **OpenStreetMap** admin extracts | **ODbL** | Continuous | Admin relations, places | Community; variable conflict zones | Careful use with attribution; **not** control | Overpass/tile ToS; do not scrape tiles | Reference only |
| **GADM** | Often **not** free for unrestricted commercial open redistribution | Versioned | Detailed admin | High detail | Prefer geoBoundaries/Natural Earth instead | Licensing trap for open apps | **Avoid** for default product |
| **Manual curated control layer (first-party)** | Our copyright + cited sources | Human cadence (e.g. weekly) | Generalized polygons + uncertainty | Only as good as review process | **human-review + dated display** | Labor-intensive; still not ground truth | **Recommended v2 path** for any control-like display |
| **Social media / Telegram / TikTok inference** | Platform ToS; privacy; verification risk | Continuous noise | None trustworthy | Poor for control alone | **Forbidden** as control source | Automated front-line inference is explicit non-goal | **Hard no** |
| **Predictive control models** | N/A | N/A | Speculative | None | **Forbidden** | Targeting-adjacent harm | **Hard no** |

---

## How responsible orgs represent uncertainty (patterns to steal)

Patterns observed across ISW methodology statements, public Ukraine maps (BBC using ISW assessments), DeepState color schemes, and academic event datasets:

| Pattern | What it means | Product implication for Live Map |
|---------|---------------|----------------------------------|
| **Assessed control** language | Explicitly an assessment, not sovereignty | UI copy: “Assessed control (source, date)” never “Owned by” |
| **Contested / unclear / needs clarification** | Gray or hatched zones | Required third state between A/B control |
| **Infiltration / limited presence** vs full control | Partial influence without continuous FLOT | Do not collapse into solid fill |
| **Pre-war vs post-escalation control** | Different fill for long-held vs newly seized | Temporal legend mandatory |
| **FLOT as approximation** | Continuous line for cartographic readability | Soft edges, zoom-dependent simplification |
| **Event density ≠ control** | UCDP/ACLED points show violence, not governance | Separate layers; never auto-dissolve events into control polygons |
| **Dated snapshots** | “As of DATE TIME TZ” | Every control-like layer needs `asOf` + source URL |
| **Multi-claim / multi-source disagreement** | Show both claims or withhold | Prefer withhold on public map; dual-claim only analyst-only |

---

## Analyst-only vs public map (recommendation)

Aligned with locked **#56 public map bar** and **#59** (change badges never promote to public map).

### Safe on **public map** (with attribution + limitations)

| Layer | Why |
|-------|-----|
| Conflict **events** from UCDP (and already-live disaster/official sources) that pass the public map bar | Events with provenance, not control |
| Natural Earth / geoBoundaries **admin** outlines | Reference only; labeled administrative |
| Natural Earth **disputed boundary** styling (as disputed, not “winner”) | Cartographic context |
| Human-reviewed **generalized** “active conflict theater” blobs **only if** multi-source + dated + not precision targeting | Optional later; still not “control” |
| Country-level instability / CII-style indicators | Aggregate, not front lines |

### **Analyst-only** (Advanced / investigation drawer)

| Layer | Why |
|-------|-----|
| Any **assessed control** polygons (even human-reviewed) | High harm + legal/political risk if misread as product truth |
| Contact lines / FLOT approximations | Misuse risk |
| Links to ISW, DeepState, Liveuamap, CFR | Context without republication |
| ACLED (if licensed) event detail beyond public bar | License + density |
| Multi-claim overlays, disagreement panels | Requires operator literacy |
| Change-awareness on control assessments | Operator console only (#59) |

### **Never**

- Automated social → front line
- Live scraped commercial control maps
- Predictive control / “next week’s front”
- Labeling admin boundaries as “controlled by X”
- Precision layers that expose humanitarian or military OPSEC targets

---

## What is safe enough for a future human-reviewed layer in v2?

### Tier A — Proceed (governance-ready)

1. **UCDP GED / Candidate as conflict events** (not control)  
   - License: CC BY 4.0 with citation  
   - Fits existing event/observation model  
   - Config-gated adapter + rate limits  

2. **Natural Earth + geoBoundaries as reference basemap**  
   - Public domain / CC BY  
   - Disputed styling with careful labels  
   - Static or infrequently refreshed  

3. **First-party “human-reviewed assessment” objects**  
   - Schema: `asOf`, `geometry` (generalized), `assessmentType` (control | contested | unclear), `sources[]`, `reviewer`, `confidence`, `limitations`  
   - Start **analyst-only**; public map only if #56 bar explicitly extended by human decision later  
   - Labor process > automation  

### Tier B — Link-only / optional partnership

- ISW / CTP maps, DeepStateMap, Liveuamap, Black Bird Group  
- CFR / CrisisWatch narrative  
- Use as **provenance links** on investigation cards, not as our geometry  

### Tier C — Blocked until license or policy change

- ACLED default ingest/redistribution  
- Any scrape of commercial conflict maps  
- GADM as default admin source  

### Tier D — Permanent hard no

- Social front-line inference  
- Predictive control  
- Targeting layers  

---

## Recommended product stance (for #61 visual grammar)

1. **Three visual systems, never mixed without labels:**  
   - **Basemap admin** (quiet gray)  
   - **Events** (points/clusters; existing severity language)  
   - **Assessments** (hatched / soft polygons; analyst-only by default)  

2. **Uncertainty grammar is mandatory** for any assessment: contested, unclear, multi-claim, stale (`asOf` age).  

3. **No real-time “control mode”** in v2 public product. If assessments exist, default off + Advanced.  

4. **Ukraine-quality live control maps are not a portable open dataset.** Treat theater-specific OSINT maps as **citations**, not infrastructure.  

5. **Chokepoints stay infrastructure correlation** (already on main) — do not repurpose as territorial control.  

---

## Suggested acceptance criteria before any future implementation ticket

- [ ] Written license note per source in master source registry  
- [ ] Explicit `layerRole`: `admin-reference` | `conflict-event` | `control-assessment` | `link-out`  
- [ ] Public vs analyst visibility matrix signed off  
- [ ] Human review workflow defined (who, how often, rollback)  
- [ ] Visual grammar from **#61** includes contested/unclear  
- [ ] No automated dissolve of events → control polygons  

---

## Sources consulted (primary / first-party)

- UCDP Download Center — CC BY 4.0 statement, GED + Candidate cadence: https://ucdp.uu.se/downloads/  
- Natural Earth Terms of Use — public domain: https://www.naturalearthdata.com/about/terms-of-use/  
- geoBoundaries — CC BY 4.0 + citation: https://www.geoboundaries.org/  
- ACLED Terms hub (EULA / content usage / attribution): https://acleddata.com/terms-of-use/  
- ISW Ukraine mapping methodology (assessed control, FLOT concepts): https://understandingwar.org/analysis/russia-ukraine/mapping-methodology-ukraine-product-line/  
- DeepStateMap license agreement: https://deepstatemap.live/license-en.html  
- HDX licenses overview: https://data.humdata.org/about/license  
- Repo: `docs/FREE_PUBLIC_OSINT_SOURCE_BACKLOG.md`, `docs/RESPONSIBLE_USE.md`, `AGENTS.md`, features stubs under `src/features/conflict`, `src/features/control-assessments`

---

## Explicit confirmation

- **No territorial-control geometry was implemented** in this research.  
- **Production was not deployed.**  
- **#60 should remain open** until the human reviews this matrix and locks recommendations.
