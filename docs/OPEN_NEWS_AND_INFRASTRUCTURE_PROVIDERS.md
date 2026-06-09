# Open News and Internet Infrastructure Providers

Phase 2C adds provider architecture for open discovery leads and Internet infrastructure observations.

## Included providers

- GDELT DOC API: discovery-only news metadata, disabled until `GDELT_ENABLED=true`.
- Official RSS/Atom registry: allowlisted official feeds only, metadata and source links only.
- Official Statuspage incidents: active user-impacting incidents from approved public status pages.
- RIPEstat: Internet routing observations for configured resources, disabled until `RIPESTAT_SOURCEAPP` and `RIPESTAT_RESOURCES` are set.
- Cloudflare Radar: documented future authenticated boundary only. No API calls run in this phase.

## Excluded from this phase

- Commercial news APIs.
- Paid market data.
- ACLED or other licensed conflict feeds.
- Licensed AIS or ADS-B providers.
- Dark-web sources.
- Scraped websites.
- UCDP.
- Aviation and maritime tracking.
- AI or investigation features.

## Publication policy

News and feed adapters must expose metadata, short excerpts, attribution, and source URLs only. They must not mirror full articles, images, PDFs, or scraped page content.

## Verification policy

Discovery leads remain `recordKind: "discovery-lead"` and `verification.state: "unverified"` until a primary source or independent corroboration supports promotion. The promotion helper currently marks eligible clusters for human review and never auto-promotes them.

RIPEstat records are observations first. Only conservative anomaly rules create events, and those events remain non-geographic unless independent source data supports a location.

## SSRF protection

RSS/Atom fetching uses a server-side allowlist plus URL safety checks. Do not add browser-supplied feed URLs or arbitrary URL fetch endpoints.

