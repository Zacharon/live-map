# OSINT Forge — Operator Guide

Client-side situational awareness for public multi-source events. **Not** emergency dispatch or official intelligence.

## Workflow

1. **Triage** — Operator view (counts, high+, new since last visit, degraded providers)  
2. **Investigate** — Open an event (timeline, map, feed, cluster member)  
3. **Connect** — Read Connected Events + cluster members  
4. **Export** — Copy/Download Markdown or JSON artifact  
5. **Monitor** — Mark current view as seen; re-check provider health  

## Dashboard sections (left v2 shell)

| Section | Purpose |
|---------|---------|
| Operator view | Mission summary for current filters |
| Summary cards | Visible events, sources, degraded, last updated |
| Legend | Severity, threat level v0, change/map rings |
| Since last visit | Change awareness (new/updated) |
| Timeline | Time-bucketed events |
| Related clusters | Multi-event geo/time groups |
| Active filters | Chip summary / clear |
| Provider health | Operational vs degraded |

Right drawer: **analyst card** for selected event or cluster.

## Inspect an event

Click timeline row, map marker, feed card, cluster member, or connected event.

The drawer shows:

- Severity, confidence, source badge, change badge  
- **Threat level v0** (level, score, reasons, caveats)  
- **Why am I seeing this?**  
- Location / time / source / verification  
- **Connected events** with reason chips  
- **OSINT artifact** export actions  

## Threat level v0

**Label:** OSINT Forge threat level v0 — heuristic  

Levels: Low · Guarded · Elevated · High · Critical  

Uses public normalized fields only (severity, recency, domain/category, related/cluster size, confidence if present, geo quality, discovery-lead downrank).

**Always a heuristic.** Not an official warning level. Always read caveats.

## Connected events

In-memory only. Reasons may include:

- same-cluster  
- same-provider  
- same-place  
- same-category-domain  
- close-time  
- title-keywords (light boost)  

Capped list. Click a row to inspect. **Not** a confirmed single incident graph.

## Export artifacts

In the drawer artifact section:

- Copy Markdown / Download Markdown  
- Copy JSON / Download JSON  

Exports are client-side snapshots of already-loaded public fields. No server storage.

## Change awareness

Mark current filtered view as seen. Next visit shows new/updated against that snapshot (localStorage).

## Limitations

- Filtered view only  
- Heuristic threat and connections can be wrong  
- Provider outages can empty the board  
- No accounts, cases, or cloud sync  
- No STIX / globe engine in this release  

## Privacy / security model

- Browser localStorage for UI prefs and change snapshot  
- No secrets in artifact exports  
- No new network calls from threat/connections modules  
- Verify facts with original source links  

## Roadmap (later)

- Operator usability polish  
- Source confidence explainability  
- Investigation workspace (notes/cases, local first)  
- Optional globe spike behind a feature flag  
