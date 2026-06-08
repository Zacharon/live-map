# Live Map — Netlify v2

## Correct Netlify deployment

Use a GitHub-connected deployment. Do not use drag-and-drop when you need the `/api/events` Netlify Function.

1. Unzip this package.
2. Create a GitHub repository and upload the files exactly as shown. `netlify.toml` must be at the repository root.
3. In Netlify choose **Add new project → Import an existing project**.
4. Select the repository.
5. Build command: leave blank.
6. Publish directory: `.`
7. Functions directory: Netlify should read `netlify/functions` from `netlify.toml` automatically.
8. Deploy.

Test these URLs after deployment:

- `https://YOUR-SITE.netlify.app/`
- `https://YOUR-SITE.netlify.app/api/events`
- `https://YOUR-SITE.netlify.app/.netlify/functions/events`

Both API URLs should return JSON. If they do not, open **Logs & Metrics → Functions → events** in Netlify.

## How updates work

- The browser requests `/api/events` when the page opens.
- It polls again every 120 seconds.
- The Netlify Function pulls current USGS and NASA EONET data.
- The function response is cached for 60 seconds to reduce repeated upstream requests.
- If the function is missing, the browser falls back to direct USGS earthquake data so the map does not go blank.

This is near-real-time polling, not instant streaming. Provider reporting latency still applies.

## Satellite map

The Satellite option uses Esri World Imagery with an Esri labels overlay. Google Earth and Apple Maps imagery should not be copied or used as unrestricted tile servers; they require their own approved APIs, terms, and usually billing credentials.

## Adding conflict data

Verified global conflict feeds usually require an account, API key, or license. Add credentials as Netlify environment variables and extend `netlify/functions/events.mjs`. Never put private API keys in `app.js`.

Suggested environment variable names:

- `ACLED_ACCESS_TOKEN`
- `ACLED_EMAIL`
- `GDELT_ENABLED`

After adding variables, trigger a new production deploy.
