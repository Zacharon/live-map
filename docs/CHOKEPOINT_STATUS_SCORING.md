# Chokepoint Condition Assessment

The condition assessor combines recent related-event severity, relationship strength, correlation confidence, and official-source evidence. It produces `normal`, `watch`, `disrupted`, `severely-disrupted`, `closed`, or `unknown` with a reason list, top contributing records, caveats, and an assessment timestamp.

## Status rules

- `normal`: no qualifying disruption evidence and the weighted score is below watch.
- `watch`: sufficient recent related evidence, but no authoritative operational-disruption wording.
- `disrupted`: an official or primary record explicitly describes disruption, restriction, blocking, suspension, rerouting, or similar language and has a direct, inside, route, or adjacent-port relationship.
- `severely-disrupted`: the disrupted rule plus a weighted score of at least 65.
- `closed`: the disrupted rule plus explicit official closure language.
- `unknown`: no related current record while one or more relevant provider states are degraded, unavailable, or stale.

An event reference or high severity alone cannot mark an area disrupted or closed. Scores are explainable prioritization signals, not measurements of traffic, capacity, safety, legal access, or real-world causality.
