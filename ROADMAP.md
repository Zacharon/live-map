# Live Map Roadmap

Live Map is a $0-cost, public-data-only open-source project. The short-term mission is not a broad intelligence platform. It is to make one live public-data map work, make it reliable, make it easy to contribute to, and then add domains one at a time.

## Cost-Free Architecture

- GitHub public repo for code, issues, docs, pull requests, and Actions checks.
- Cloudflare Workers Static Assets for the live frontend and Worker API routes.
- Public APIs and official feeds only. No paid provider requirements for the core app.
- No database at first. Use runtime fetches, bounded requests, and short cache headers.
- Optional GitHub Pages can be used later for docs or status pages only.

## Phase 0: Make It Load

Goal: the site opens and `/api/events` returns JSON.

Ship only:

- `/`
- `/api/events`
- A clear degraded-state banner when event data is missing or partial.
- No fake live claims.
- No broken dashboard tabs.

Done when:

- `https://live-map.zacharyfavaron.workers.dev/` loads the frontend.
- `https://live-map.zacharyfavaron.workers.dev/api/events?hours=168` returns JSON.
- The map shows at least USGS earthquakes or a clean empty/degraded state.

## Phase 1: Reliable Public Event Feed

Goal: one dependable normalized feed from public sources.

Use only:

- USGS Earthquakes
- NASA EONET
- NWS alerts
- GDACS when available without keys

Done when:

- Events include title, source, time, severity, domain, coordinates, and source links.
- Provider failures produce degraded status instead of breaking the app.
- Source attribution is visible in the UI.

## Phase 2: Source Health And Trust UI

Goal: make data freshness and provider reliability visible.

Ship:

- `/api/sources`
- `/api/provider-health`
- Provider status panel
- Last updated time
- Source attribution
- Fallback and degraded labels

Done when:

- Users can see which providers are live, degraded, disabled, or config-gated.
- The frontend never implies unavailable data is live.

## Phase 3: Open-Source Contributor Foundation

Goal: make the project safe and approachable for outside contributors and agents.

Ship:

- `CONTRIBUTING.md`
- Provider contribution guide
- Data-source request issue form
- Good first issue labels
- Architecture diagram
- Local development instructions

Done when:

- Contributors can run checks locally without production credentials.
- New provider requests include terms, licensing, attribution, and safety notes.

## Phase 4: Public-Data Domains

Goal: add domains only when each one has free, public, terms-safe sources.

Candidate domains:

- Natural hazards: USGS, EONET, NWS, GDACS
- Weather alerts: NWS, Meteoalarm later if terms allow
- Cyber: CISA KEV, NVD
- Infrastructure: Statuspage feeds, RIPEstat, Cloudflare Radar later if terms allow
- Markets and economics: FRED, SEC EDGAR, EIA
- News discovery: GDELT and curated official RSS allowlists
- Humanitarian: ReliefWeb

Avoid by default:

- Paid ADS-B and maritime feeds
- Dark web monitoring
- Telegram scraping
- X scraping
- Commercial sanctions datasets
- Any provider that requires paid keys for the core app

## Phase 5: Cautious Conflict And Security Layers

Goal: show sourced public reports without overclaiming.

Start with:

- Conflict-related event reports
- Source-linked incidents
- Country-level risk indicators
- Manual or curated layers with clear provenance

Do not ship:

- Real-time territorial-control claims
- Front-line maps
- Military targeting detail
- Unsourced claims

## Phase 6: Optional AI Summaries

Goal: summarize stable, source-linked public data without adding required costs.

Ship only after the data pipeline is reliable:

- Daily public-data summaries
- Source-linked event briefs
- No emergency advice
- No unsourced conclusions
- Optional bring-your-own-key or local-only AI paths later
