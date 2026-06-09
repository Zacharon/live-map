# CII v2 Methodology

The Country Instability Index v2 is an experimental, explainable country-level signal. It is not an official government, legal, insurance, credit, travel, security, or financial rating.

## Inputs

CII v2 uses visible normalized events, incident identifiers, source tier, verification state, timestamps, severity, confidence, impact, corroboration, provider coverage, and provider source health.

It keeps these dimensions separate:

- Severity: how serious the event is.
- Confidence: how reliable the event record is.
- Impact: how broad the possible effect is.
- Freshness: how current the record is.
- Corroboration: how many independent sources support the record.
- Completeness: how much useful evidence is available for the country.

## Score blocks

- Structural baseline, maximum 35 points.
- Recent pressure, maximum 45 points.
- Economic and infrastructure pressure, maximum 15 points.
- Cross-domain escalation, maximum 5 points.

Recent events are deduplicated by `incidentId`, `clusterId`, or provider event identity so repeated reports do not immediately saturate a country near 99.

## Decay and verification

Events decay by domain-specific half-life. Primary confirmed and corroborated records carry more weight than single-source, observed, unverified, disputed, corrected, or retracted records. Retracted records contribute zero pressure.

Discovery leads and observations are penalized compared with confirmed events. They can raise awareness but should not behave like verified live incidents.

## Outputs

The API returns raw, smoothed, previous, 7-day, and 30-day score values when available, plus level, confidence, completeness, top factors, provider coverage, limitations, and distribution warnings.

See also `docs/CII_SCORE_DISTRIBUTION.md`.
