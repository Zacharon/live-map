# Chokepoint Correlation Methodology

Correlation is deterministic and runs locally over the existing normalized event set. No new event provider or event claim is created.

## Evidence order

1. Exact, bounded aliases in event title, summary, place, tags, and details.
2. Generalized geometry containment or proximity to a registry reference area.
3. Explicit watched ports, routes, or entities.
4. A compatible domain only when geographic or textual evidence is also present.

Relationships are `directly-references`, `inside`, `affects-adjacent-port`, `affects-route`, domain impact types, `nearby`, or `possible-indirect-impact`. The UI preserves those labels rather than implying causality.

## Guardrails

- Generic domain matches alone do not create a correlation.
- Non-geographic records can correlate only with explicit textual evidence.
- Broad approximate polygons are context aids and are weighted below direct references.
- Confidence reflects match evidence, not event truth, operational impact, or source credibility.
- Correlation neither establishes a disruption nor supplies maritime routing guidance.

The registry, correlation output, enriched event fields, and scoring tests are deterministic when the event input and timestamp are fixed.
