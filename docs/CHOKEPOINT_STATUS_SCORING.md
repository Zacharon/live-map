# Chokepoint Condition Assessment

The condition assessor combines recent related-event severity, relationship strength, correlation confidence, and official-source evidence. It produces `normal`, `watch`, `disrupted`, `severely-disrupted`, `closed`, or `unknown` with a reason list, top contributing records, caveats, and an assessment timestamp.

## Status rules

- `unknown`: no qualifying operational evidence, or related provider coverage is degraded/stale. Absence of disruption reports is not proof of normal operations.
- `normal`: positive, current operational evidence relevant to the claimed scope (not merely the absence of disruption reports). The weighted attention score is not a substitute.
- `watch`: sufficient recent related evidence, but no authoritative operational-disruption wording.
- `disrupted`: an official or primary record explicitly describes disruption, restriction, blocking, suspension, rerouting, or similar language and has a direct, inside, route, or adjacent-port relationship.
- `severely-disrupted`: the disrupted rule plus a weighted score of at least 65.
- `closed`: the disrupted rule plus explicit official closure language. A closure notice confirms the stated restriction; it does not prove zero actual traffic.
- `restricted` / `recovering`: operational states from the L01–L11 evaluator when restriction geometry or improving dimensions apply.

An event reference or high severity alone cannot mark an area disrupted or closed. Scores are explainable prioritization signals, not measurements of traffic, capacity, safety, legal access, or real-world causality.
