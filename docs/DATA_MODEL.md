# Data Model

This document names the core records Live Map expects to handle over time. It is descriptive structure, not a runtime schema migration.

## Core Records

| Record | Meaning | Public handling |
| --- | --- | --- |
| Event | A public, map/feed-visible occurrence with time, location when appropriate, source attribution, freshness, and status. | May appear in `/api/events` when normalized, sourced, and compatible with public claims policy. |
| Observation | A factual source reading that may inform an event or status card but is not itself a claim of causality. | Can be public when source rights allow it and limitations are clear. |
| Discovery lead | An unreviewed or weakly corroborated signal that may deserve review. | Must not directly drive public map claims. |
| Moving object | A bounded aircraft or vessel position record from an approved provider. | Must be viewport-limited, cached, capped, and privacy-safe. |
| Evidence | A source artifact, quote summary, metadata record, or observation that supports or contradicts a claim. | Future framework only; avoid mirroring copyrighted material or sensitive details. |
| Claim | A statement about what happened, who was affected, or why it matters. | Must keep confidence, corroboration, and review state separate. |
| Control assessment | A human-reviewed judgment about controls, mitigations, exposure, or operational posture. | Future reviewed workflow only; not public by default. |
| Source | A public data source with URL, attribution, access classification, implementation status, review dates, and limitations. | Public metadata can appear in Source Explorer. |
| Provider | A server-side integration that fetches or normalizes source data. | Provider credentials stay server-side; failures must appear honestly in status. |
| Actor | An organization, government, provider, issuer, group, or other named party. | Avoid unsupported attribution or causality. |
| Location | A geographic or non-geographic context for an event or observation. | Do not fabricate geography; sensitive humanitarian locations may need generalization. |
| Rights policy | The access, licensing, attribution, retention, and redistribution limits for a source. | Must be reviewed before a source is treated as live. |

## Confidence And Reliability

Keep these fields conceptually separate:

- `confidence`: how strongly the app can trust the normalized record.
- `sourceReliability`: historical or institutional reliability of the source.
- `corroboration`: whether independent sources support the record.
- `freshness`: whether the record is current enough for its use.
- `completeness`: whether key fields are present.
- `impact`: the assessed scale or user relevance.
- `severity`: the domain-specific seriousness of the event.

Do not collapse these into an unexplained score. If a UI needs a compact display, it should be backed by documented methodology.

## Reviewed And Unreviewed Data

Unreviewed data can be stored as fixtures, discovery leads, provider diagnostics, or internal review inputs. It must not be presented as confirmed public event data.

Reviewed data has enough source attribution, provider status, limitations, and rights review to support its public use. Review state must be explicit when evidence, claims, or control assessments are introduced.

## Fixtures

Fixtures are sanitized examples for tests and documentation. They are not live data, must not contain secrets or private credentials, and must not imply provider coverage that does not exist.
