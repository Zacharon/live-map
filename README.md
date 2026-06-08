# Live Map - Intelligence Platform Foundation

Live Map is a map-first global event dashboard deployed at:

- https://liveworldmap.netlify.app/

It is evolving into a modular intelligence, risk, finance, infrastructure, and OSINT platform. Phase 1 keeps the working static Netlify deployment while adding dashboard architecture, transparent registries, prototype scoring, and safe scaffolding for credentialed future providers.

This is a near-real-time public information aggregator. It is not an emergency dispatch, evacuation, military, navigation, legal, compliance, credit, travel, or financial rating system.

## Current working layers

- [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/earthquakes/feed/) earthquake feeds
- [NASA EONET](https://eonet.gsfc.nasa.gov/docs/v3) natural hazard events, with partial-data handling when the provider is unavailable
- Source-health reporting
- Marker clustering
- Event filters
- Satellite, dark, and street basemaps
- Event detail dialogs with source links

## Phase 1 features

- Five dashboard modes: Primary, Finance, Technology, Commodity, Happy
- URL-preserved dashboard state through `?dashboard=...`
- Configuration-driven 45+ layer registry
- 2D/3D mode control with stable 2D default and documented 3D beta boundary
- Country Instability Index prototype
- 92-exchange finance registry
- Delayed/fixture market cards with no fake live prices
- Event-to-market correlation prototype using cautious language
- Local browser-stored alert preview rules
- API scaffolding for layers, countries, country risk, markets, infrastructure, source status, briefs, and alert testing
- Security/privacy documentation and `.env.example`

## Architecture

- `index.html` - static app shell
- `app.js` - native module bootstrap
- `src/` - frontend modules
- `data/` - fixture notes and data pointers
- `docs/` - architecture, source, CII, provider, privacy, and roadmap docs
- `netlify/functions/` - Netlify Functions

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Dashboards

- Primary: global events, country risk, natural hazards, security, and infrastructure context
- Finance: exchange registry, delayed fixture market cards, event-market correlations
- Technology: cyber, cloud, outage, breach, and technology infrastructure scaffolding
- Commodity: energy, metals, agriculture, ports, shipping, and supply-chain scaffolding
- Happy: positive developments, humanitarian wins, recovery, conservation, science, and stability improvements

## Country Instability Index

CII is an experimental analytic indicator with a 0-100 score:

- 0-19: Stable
- 20-39: Guarded
- 40-59: Elevated
- 60-79: High
- 80-100: Critical

It is explainable and reproducible from visible event data. It is not an official rating.

Methodology: [docs/COUNTRY_INSTABILITY_INDEX.md](docs/COUNTRY_INSTABILITY_INDEX.md)

## API routes

- `GET /api/events`
- `GET /api/layers`
- `GET /api/countries`
- `GET /api/country-risk`
- `GET /api/markets`
- `GET /api/infrastructure`
- `GET /api/source-status`
- `POST /api/briefs`
- `POST /api/alerts/test`

New scaffold endpoints use:

```js
{
  data,
  generatedAt,
  sourceStatus,
  warnings,
  errors,
  requestId
}
```

The legacy `/api/events` shape is preserved for the current frontend.

## Data-source limitations

Many requested sources require credentials, licensing, or explicit terms review. Planned or credentialed layers are not labeled live.

Examples requiring credentials or additional setup:

- ACLED
- ADS-B aviation feeds
- AIS maritime feeds
- Finance price providers
- NASA FIRMS
- Groq/OpenRouter AI providers
- Supabase/Neon database

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Security and privacy

- Do not put secrets in frontend JavaScript.
- Use Netlify environment variables for private provider keys.
- `.env.example` contains variable names only.
- CSP is configured in `netlify.toml`.
- AI, OSINT, cyber, aviation, maritime, and dark-web style provider integrations are disabled/scaffolded until explicitly configured.
- Do not bypass logins, CAPTCHAs, paywalls, or access restrictions.
- Do not display raw passwords or unnecessary sensitive personal data.

See [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md).

## Environment variables

Suggested future variables:

- `ACLED_ACCESS_TOKEN`
- `ACLED_EMAIL`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `OLLAMA_BASE_URL`
- `FINANCE_API_KEY`
- `ADS_B_API_KEY`
- `AIS_API_KEY`
- `NASA_FIRMS_MAP_KEY`
- `RELIEFWEB_ENABLED`
- `GDELT_ENABLED`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The Supabase service-role key must never reach browser code.

## Local development

Install dependencies only if you need local tooling:

```bash
npm install
```

Run Netlify locally:

```bash
netlify dev
```

Test local endpoints:

```text
http://localhost:8888/
http://localhost:8888/api/events
http://localhost:8888/.netlify/functions/events
```

## Testing

Syntax:

```bash
npm run check
```

Unit tests:

```bash
npm test
```

Manual checks:

- Desktop layout
- Mobile-width layout
- Dashboard switching
- URL dashboard state
- Satellite, dark, and street basemaps
- 2D mode
- 3D beta fallback
- Event search and filters
- Marker clustering
- Event dialog
- CII methodology dialog
- Finance dashboard exchange markers
- `/api/events`
- `/api/layers`
- `/api/markets`

## Netlify deployment

Use GitHub-connected deployment. Do not use drag-and-drop when functions are required.

Netlify settings:

- Branch: `main`
- Build command: blank
- Publish directory: `.`
- Functions directory: `netlify/functions`

Every merge to `main` should trigger a production deploy.

## Future roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
