# Live Map - Netlify v2

Live Map is a map-first global event dashboard deployed at:

- https://liveworldmap.netlify.app/

It currently aggregates:

- [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/earthquakes/feed/) earthquake GeoJSON feeds
- [NASA EONET](https://eonet.gsfc.nasa.gov/docs/v3) natural hazard events

This is a near-real-time public information aggregator. It is not an emergency dispatch, evacuation, military, navigation, or official alerting system. Provider reporting delays, outages, duplicates, and corrections may apply.

## Correct Netlify deployment

Use a GitHub-connected deployment. Do not use drag-and-drop when you need the `/api/events` Netlify Function.

1. In Netlify choose **Add new project -> Import an existing project**.
2. Select `Zacharon/live-map`.
3. Build command: leave blank.
4. Publish directory: `.`.
5. Functions directory: Netlify should read `netlify/functions` from `netlify.toml` automatically.
6. Deploy.

Every push to `main` should trigger a new Netlify production deploy.

## Test these URLs

- https://liveworldmap.netlify.app/
- https://liveworldmap.netlify.app/api/events
- https://liveworldmap.netlify.app/.netlify/functions/events

Both API URLs should return JSON. If they do not, open **Netlify -> Live Map -> Logs & Metrics -> Functions -> events**.

## How updates work

- The browser requests `/api/events` when the page opens.
- It polls again every 120 seconds.
- The Netlify Function pulls current USGS and NASA EONET data.
- The function response is cached for 60 seconds to reduce repeated upstream requests.
- If one source fails, the API returns partial data plus a `sourceStatus` object.
- If the function is missing, the browser falls back to direct USGS earthquake data so the map does not go blank.

This is near-real-time polling, not instant streaming.

## Source transparency

Each normalized event can include:

- event title and summary
- category and severity
- severity reason
- latitude and longitude
- coordinate method
- reported timestamp
- provider updated timestamp
- original source link
- source type
- verification status
- confidence score
- provider ID

## Satellite map

The Satellite option uses [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9) with an Esri labels overlay. Google Earth and Apple Maps imagery should not be copied or used as unrestricted tile servers; they require their own approved APIs, terms, and usually billing credentials.

## Local testing

Install Netlify CLI if needed:

```bash
npm install -g netlify-cli
```

Run locally:

```bash
netlify dev
```

Then test:

```text
http://localhost:8888/
http://localhost:8888/api/events
http://localhost:8888/.netlify/functions/events
```

## Automation and quality checks

This repository includes a safe automation foundation for pull requests, security checks, and production monitoring.

Run the main validator locally:

```bash
npm run validate
```

Run only JavaScript syntax checks:

```bash
npm run check:syntax
```

Run the browser-side secret scan:

```bash
npm run security:scan
```

Run the production smoke test:

```bash
npm run smoke:production
```

The validator checks:

- JavaScript syntax for browser code, Netlify Functions, and validation scripts
- local `netlify/functions/events.mjs` response shape
- event coordinate validity
- event source attribution and source URLs
- browser-served files for secret-looking tokens
- source status, freshness, partial modes, fallback modes, and provider errors

The production smoke test checks:

- https://liveworldmap.netlify.app/
- https://liveworldmap.netlify.app/api/events
- https://liveworldmap.netlify.app/.netlify/functions/events

If USGS, NASA EONET, Netlify Functions, or source URLs fail, the validator and production smoke test should fail instead of reporting a false success.

## GitHub Actions

The repository defines these workflows:

- `.github/workflows/validate.yml` runs `npm run validate` on pull requests, pushes to `main`, and manual dispatches.
- `.github/workflows/production-smoke-test.yml` runs `npm run smoke:production` every six hours and on manual dispatch.
- `.github/workflows/security.yml` runs browser-side secret scanning and CodeQL JavaScript analysis.

Dependabot is configured in `.github/dependabot.yml` for weekly npm checks and weekly GitHub Actions updates.

CodeQL configuration lives in `.github/codeql/codeql-config.yml`. Because this repository is private, GitHub code scanning or GitHub Advanced Security may need to be enabled manually before CodeQL alerts appear. If your current GitHub plan does not support CodeQL for private repositories, the workflow may not upload analysis results even though the config is present.

## Troubleshooting automation

- If `npm run validate` fails on `sourceStatus`, check whether USGS or NASA EONET is down or returning partial data.
- If production smoke tests fail but the page loads in your browser, open **Netlify -> Live Map -> Logs & Metrics -> Functions -> events** and inspect the latest function invocation.
- If CodeQL does not publish alerts, check GitHub repository settings for **Code security and analysis** and enable code scanning if your plan supports it.
- If a secret scan fails, remove the token from browser-served files and rotate the credential before merging.
- If you add a new live provider, update `netlify/functions/events.mjs`, source attribution, freshness handling, `.env.example`, and these docs together.

## Adding conflict data

Verified global conflict feeds usually require an account, API key, or license. Add credentials as Netlify environment variables and extend `netlify/functions/events.mjs`. Never put private API keys in `app.js`.

Suggested future sources:

- [ACLED](https://acleddata.com/)
- [ACLED Conflict Index](https://acleddata.com/series/acled-conflict-index)
- [CFR Global Conflict Tracker](https://www.cfr.org/interactive/global-conflict-tracker)
- [International Crisis Group CrisisWatch](https://www.crisisgroup.org/crisiswatch)
- [GeoConfirmed](https://geoconfirmed.org/)
- [GDELT](https://www.gdeltproject.org/)
- [ReliefWeb API](https://apidoc.reliefweb.int/)
- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/)
- [GDACS](https://www.gdacs.org/)
- [NOAA/NWS Alerts API](https://www.weather.gov/documentation/services-web-alerts)

Suggested environment variable names:

- `ACLED_ACCESS_TOKEN`
- `ACLED_EMAIL`
- `GDELT_ENABLED`
- `NASA_FIRMS_MAP_KEY`
- `RELIEFWEB_ENABLED`

After adding variables, trigger a new production deploy.
