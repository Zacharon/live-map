Live Map — Intelligence Platform Foundation

Live Map is a map-first global event dashboard deployed at:

https://liveworldmap.netlify.app/

It is evolving into a modular intelligence, risk, finance, infrastructure, and OSINT platform. Phase 1 preserves the working Netlify deployment while adding dashboard architecture, transparent source registries, prototype risk scoring, automated validation, and safe scaffolding for credentialed providers.

Live Map is a near-real-time public-information aggregator. It is not an emergency dispatch, evacuation, military, navigation, legal, compliance, credit, travel, or financial-rating system.

Current working layers
USGS Earthquake Hazards Program earthquake feeds
NASA EONET natural-hazard events
Partial-data handling when a provider is temporarily unavailable
Source-health reporting
Marker clustering
Event search and filters
Satellite, dark, and street basemaps
Event-detail dialogs with original source links
Phase 1 features
Five dashboard modes:
Primary
Finance
Technology
Commodity
Happy
Dashboard state preserved through ?dashboard=...
Configuration-driven catalog of more than 45 layers
Stable 2D map with a documented 3D beta boundary
Prototype Country Instability Index
Registry of 92 global stock exchanges
Clearly labeled delayed or fixture market cards
No fabricated live market prices
Event-to-market correlation prototype using cautious language
Local browser-stored alert-rule previews
Source-health interface
API scaffolding for layers, countries, country risk, markets, infrastructure, source status, briefs, and alert testing
Security and privacy documentation
Environment-variable template
Automated validation and production monitoring
Architecture
index.html
app.js
styles.css
src/
data/
docs/
scripts/
tests/
netlify/
  functions/
.github/
  workflows/

Main areas:

index.html — static application shell
app.js — native JavaScript module bootstrap
src/ — frontend modules
data/ — fixture policies and data pointers
docs/ — architecture, source, risk, provider, privacy, and roadmap documentation
scripts/ — validation and production smoke-test scripts
tests/ — platform tests
netlify/functions/ — server-side Netlify Functions
.github/workflows/ — validation, security, and production-monitoring workflows
.codex/skills/ — reusable Codex project skills
AGENTS.md — permanent repository instructions for coding agents

More detail:

Architecture documentation
Provider adapter documentation
Dashboards
Primary

Global events, country risk, natural hazards, security conditions, source health, and infrastructure context.

Finance

Exchange registry, delayed development market cards, market status, and cautious event-to-market correlations.

Technology

Cybersecurity, cloud status, service outages, data breaches, Internet disruptions, and technology-infrastructure scaffolding.

Commodity

Energy, metals, agriculture, ports, shipping, production, weather, and supply-chain scaffolding.

Happy

Positive developments, humanitarian achievements, recovery milestones, conservation, scientific progress, and improvements in stability or safety.

Country Instability Index

The Country Instability Index, or CII, is an experimental analytical indicator using a score from 0 to 100.

Score	Classification
0–19	Stable
20–39	Guarded
40–59	Elevated
60–79	High
80–100	Critical

The score is designed to be explainable and reproducible from visible event data. It is not an official government, credit, insurance, travel, or financial-risk rating.

See:

Country Instability Index methodology
API routes

Current and scaffolded routes include:

GET  /api/events
GET  /api/layers
GET  /api/countries
GET  /api/country-risk
GET  /api/markets
GET  /api/infrastructure
GET  /api/source-status
POST /api/briefs
POST /api/alerts/test

New scaffold endpoints use a consistent response envelope:

{
  data,
  generatedAt,
  sourceStatus,
  warnings,
  errors,
  requestId
}

The existing /api/events response remains compatible with the current frontend.

Data-source limitations

Many requested sources require credentials, commercial licensing, redistribution permission, or explicit terms review.

Planned, disabled, fixture, or credential-required sources must never be labeled as live.

Examples requiring credentials or additional setup include:

ACLED
ADS-B aviation providers
AIS maritime providers
Financial-market price providers
NASA FIRMS
Groq
OpenRouter
Supabase
Neon PostgreSQL
Licensed cyber or OSINT providers

See:

Data sources
Provider adapters
Security and privacy

Project security rules include:

Never place private credentials in frontend JavaScript.
Store private provider keys in Netlify environment variables.
Keep .env.example limited to variable names and blank values.
Never commit real API keys, passwords, tokens, or service-role credentials.
Keep the Supabase service-role key server-side only.
Preserve the Content Security Policy configured in netlify.toml.
Validate external URLs and open them safely.
Escape imported and user-controlled HTML.
Do not bypass logins, CAPTCHAs, paywalls, or access restrictions.
Do not expose raw passwords or unnecessary personal information.
Keep AI, OSINT, aviation, maritime, cyber, and licensed-data integrations disabled until properly configured.
Clearly distinguish verified information from automated analysis or discovery leads.

See:

Security and privacy
Environment variables

The repository may use the following variables as integrations are implemented:

ACLED_ACCESS_TOKEN=
ACLED_EMAIL=
GROQ_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=
FINANCE_API_KEY=
ADS_B_API_KEY=
AIS_API_KEY=
NASA_FIRMS_MAP_KEY=
RELIEFWEB_ENABLED=
GDELT_ENABLED=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

Do not add real credentials to .env.example.

Configure production credentials in:

Netlify
→ Live Map
→ Project configuration
→ Environment variables

Trigger a new deployment after changing environment variables.

Local development

Node.js 20 or newer is recommended.

Install project tooling:

npm install

Install the Netlify CLI when needed:

npm install -g netlify-cli

Start the local Netlify environment:

netlify dev

Test:

http://localhost:8888/
http://localhost:8888/api/events
http://localhost:8888/.netlify/functions/events
Testing and validation

Run all platform tests and validation:

npm test

Run the Phase 1 platform tests only:

npm run test:platform

Run syntax checks:

npm run check:syntax

Run the repository validator:

npm run validate

Run the browser-side secret scan:

npm run security:scan

Run the production smoke test:

npm run smoke:production

The validator checks:

JavaScript syntax
Netlify Function syntax
Local event-response structure
Coordinate validity
Source attribution
Source URL format and reachability
Source freshness
Provider errors
Partial and fallback modes
Secret-looking values in browser-served files

The production smoke test checks:

https://liveworldmap.netlify.app/
https://liveworldmap.netlify.app/api/events
https://liveworldmap.netlify.app/.netlify/functions/events

A provider outage may cause the production smoke test to fail even when the website remains partially usable. This is intentional so provider failures are not hidden.

Manual testing checklist

Before merging a major pull request, verify:

Desktop layout
Mobile-width layout
Dashboard switching
URL-preserved dashboard state
Satellite basemap
Dark basemap
Street basemap
2D mode
3D beta fallback
Event search
Category filters
Severity filters
Marker clustering
Event-detail dialog
Original source links
Source-health display
CII methodology dialog
Finance exchange markers
Alert-rule preview
/api/events
/api/layers
/api/countries
/api/country-risk
/api/markets
/api/source-status
GitHub Actions

The repository includes these workflows:

Validation
.github/workflows/validate.yml

Runs repository validation on:

Pull requests
Pushes to main
Manual workflow dispatches
Production smoke testing
.github/workflows/production-smoke-test.yml

Runs production checks:

Every six hours
On manual workflow dispatch
Security
.github/workflows/security.yml

Runs:

Browser-side secret scanning
CodeQL JavaScript analysis when supported by the repository’s GitHub plan and settings
Dependabot
.github/dependabot.yml

Checks weekly for:

npm dependency updates
GitHub Actions updates
CodeQL
.github/codeql/codeql-config.yml

CodeQL alerts for a private repository may require GitHub Code Security or GitHub Advanced Security.

If the GitHub plan does not support CodeQL for this private repository, the CodeQL job may fail to upload results even when the application code is valid. The browser-secret scan and other validation workflows can still operate independently.

Troubleshooting automation
Validation fails on source status

Check whether USGS or NASA EONET is unavailable or returning partial data.

Review:

Netlify
→ Live Map
→ Logs & Metrics
→ Functions
→ events
Production smoke test fails while the page still loads

The site may be operating in a partial-data or fallback mode. Inspect the /api/events response and sourceStatus object.

CodeQL fails

Open the failed GitHub Actions job and inspect the error.

For a private repository, verify:

GitHub repository
→ Settings
→ Code security and analysis

CodeQL may require additional GitHub security features. If unavailable, disable only the CodeQL analysis job rather than removing the browser-secret scan or validation workflows.

Secret scan fails

Remove the credential from every browser-served file and Git history where practical, rotate the exposed credential, and configure the replacement through Netlify environment variables.

A new provider is added

Update all relevant areas together:

Provider adapter
Source registry
Source attribution
Freshness rules
Failure handling
.env.example
Documentation
Tests
Netlify deployment

Use a GitHub-connected deployment. Do not use drag-and-drop when Netlify Functions are required.

Recommended settings:

Branch: main
Base directory: blank
Build command: blank
Publish directory: .
Functions directory: netlify/functions

Every merge into main should trigger a production deployment.

After deployment, test:

https://liveworldmap.netlify.app/
https://liveworldmap.netlify.app/api/events
https://liveworldmap.netlify.app/.netlify/functions/events
Pull-request workflow

For major changes:

Create a new branch from the latest main.
Make focused changes.
Run all applicable tests.
Push the branch.
Open a pull request into main.
Review the Netlify deploy preview.
Resolve conflicts by combining required functionality from both branches.
Wait for required checks.
Merge only after reviewing the preview and test results.
Verify the production Netlify deployment.

To reduce future conflicts, new branches should always be created or updated from the latest main after earlier pull requests are merged.

Future roadmap

Planned work includes:

Additional verified conflict feeds
OSINT source explorer
Financial and commodity feeds
Cybersecurity feeds
Aviation tracking
Maritime tracking
Infrastructure monitoring
AI-generated briefs with citations
Persistent event history
User accounts and alerts
Investigation and entity-relationship tools
True WebGL 3D globe

See:

Roadmap

Phase 1B reliable event system

Phase 1B adds a normalized event model, provider registry, provider adapters, partial-failure orchestration, conservative deduplication, provider diagnostics, and broader tests for the current USGS and NASA EONET feeds.

Read:

docs/phase-1b-event-system.md

The event API now returns:

events - browser-compatible normalized events
canonicalEvents - provider-neutral event records
providerResults - provider timing, accepted/rejected counts, stale/cache flags, and safe errors
sourceStatus - user-facing source-health summary
systemStatus - operational, partial-data, major-provider-outage, or no-current-provider-data

Local verification:

npm run check:syntax
npm run test:platform
npm run validate

There is no production build command for the current static Netlify setup. Netlify publishes the repository root with `netlify/functions` as the Functions directory.

Deployment warning:

Do not run Netlify deploy commands while developing.
Do not call Netlify build hooks or deployment APIs.
Work on feature branches and merge only after review.
Use Netlify builds only for the final approved release.

Phase 1C event taxonomy and feed UI

Phase 1C adds event taxonomy, stronger sorting and grouping, detailed provider-health UI, incident clustering, saved local views, compact/expanded event cards, and URL-preserved feed state.

Read:

docs/EVENT_TAXONOMY.md
docs/FEED_SORTING_AND_GROUPING.md
docs/INCIDENT_CLUSTERING.md
docs/SOURCE_HEALTH_UI.md

The feed keeps these concepts separate:

Domain - broad top-level area such as weather, natural disasters, finance, aviation, or humanitarian.
Category - compatibility event layer used by the existing map and filters.
Type - specific event type such as earthquake, weather warning, cloud outage, or port disruption.
Severity - potential or observed seriousness.
Confidence - reliability of the event record.
Impact - potential affected people, assets, markets or regions.
Verification - source/record verification state.
Incident - a conservative cluster linking related events while preserving each individual source event.
