# OSINT Forge Alignment

Live Map should evolve from "map with feeds" into a governed intelligence interface.

## Core Rule

Raw OSINT should inform the map. It should not directly control the map.

## Evidence Pipeline

```text
Raw Source
-> Normalized Event
-> Evidence Record
-> Claim
-> Corroboration / Contradiction
-> Reviewed Assessment
-> Public Map Layer
-> Audit Trail
```

## Vocabulary

- Raw Source: original feed item, report, alert, filing, observation, or post metadata.
- Normalized Event: structured record produced by an adapter.
- Evidence Record: source-backed fact or observation with provenance.
- Claim: assertion derived from one or more evidence records.
- Corroboration: independent support for a claim.
- Contradiction: independent evidence that weakens or disputes a claim.
- Reviewed Assessment: human or rule-reviewed conclusion with confidence and caveats.
- Public Map Layer: display-ready subset safe for public users.
- Audit Trail: who/what changed status, confidence, visibility, or interpretation.

## Publication Rules

- A tweet, Telegram post, forum post, or dark-web mention is a lead, not a territory polygon.
- Conflict-zone or humanitarian data should default to lower precision until reviewed.
- Public map layers should prefer reviewed/corroborated assessments over raw claims.
- Discovery leads must remain visually and semantically distinct from confirmed events.
- Retractions, disputes, corrections, and stale status must remain visible in evidence history.

## Product Direction

- Public mode: clear, conservative, low-noise event map.
- Advanced mode: evidence, provenance, source health, confidence, and review state.
- Future governance: audit trails, reviewer status, claim history, dispute handling, and provenance filters.
