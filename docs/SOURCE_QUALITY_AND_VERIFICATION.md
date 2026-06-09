# Source Quality and Verification

Source tier answers: how authoritative is this source?

- `tier-1-primary-official`: official agency, regulator, exchange, ministry, or owner.
- `tier-2-structured-established`: established structured dataset or institutional source.
- `tier-3-reputable-reporting`: reputable reporting, analysis, or research organization.
- `tier-4-community-osint`: volunteer or community research that may be useful for corroboration.
- `tier-5-discovery-only`: discovery lead, social feed, search result, or signal that is not confirmation.

Verification state answers: how well supported is the event or source claim?

- `unverified`
- `single-source`
- `reported`
- `observed`
- `corroborated`
- `primary-confirmed`
- `disputed`
- `corrected`
- `retracted`

Severity, confidence, impact, freshness, corroboration, and source quality must remain separate fields. Do not collapse them into one unexplained number.

Record kind answers what the platform is displaying:

- `event`: a normalized incident, alert, report, filing, or provider-confirmed occurrence.
- `observation`: a measurement or structured fact that may inform an event but is not itself an incident.
- `discovery-lead`: a lead from news discovery or official feed metadata that is not confirmation.
- `moving-object`: reserved for future aviation or maritime tracking after terms and safety review.

Discovery leads must not be styled, sorted, or described as confirmed live events. Promotion requires a primary source or corroboration rules plus human review.

