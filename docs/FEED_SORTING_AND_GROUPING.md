# Feed Sorting And Grouping

The event feed supports separate sorting and grouping controls.

## Sorting

Sort modes include:

- newest-reported
- newest-occurred
- recently-updated
- highest-severity
- highest-confidence
- most-corroborated
- highest-impact
- source-freshness
- country
- distance

The feed preserves separate timestamps for occurrence, first report, source update, ingestion and verification. A story updated today should not automatically sort as though the event occurred today.

## Grouping

Group modes include:

- none
- domain
- category
- type
- country
- region
- severity
- verification-status
- provider
- hour
- day
- incident

Groups are collapsible and store collapsed preferences in local storage. Group headers show event count, high/critical count, new event count, latest update and provider warning state.

## Saved Views

Saved views store dashboard, sort, group, card density, time window and filter state in local storage. No account system is required.
