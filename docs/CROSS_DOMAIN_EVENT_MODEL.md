# Cross-Domain Event Model

The normalized event model supports optional derived fields without changing `/api/events` compatibility:

- `strategicAreas`: supplied or derived strategic areas.
- `affectedChokepoints`: display names from deterministic correlations.
- `impactTypes`: relationship labels such as `weather-impact` or `affects-route`.
- `chokepointCorrelations`: evidence records with chokepoint id, relationship, confidence, match reasons, and optional distance.

These fields are arrays and remain empty when evidence is absent. The feature does not invent casualty totals, infrastructure impact, economic impact, confidence, or geography. Existing non-geographic finance, commodity, cyber, and reference records stay non-geographic unless their provider supplies valid event geography.
