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
