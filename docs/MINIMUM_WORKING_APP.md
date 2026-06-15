# Minimum Working App

This is the baseline for a stable $0-cost public Live Map. New feature work should wait when this baseline is broken.

## Required Baseline

- `/` loads the frontend.
- `/api/events?hours=168` returns JSON, not HTML and not a 404.
- At least one public provider works, or the app shows an honest degraded/empty state.
- Provider and source health are visible enough for users to understand stale, disabled, or failed data.
- The frontend does not claim unavailable data is live.
- No paid API is required for the core app.

## Cloudflare Verification

Use these URLs after a Cloudflare deployment has completed:

- `https://live-map.zacharyfavaron.workers.dev/`
- `https://live-map.zacharyfavaron.workers.dev/api/events?hours=168`

The API response should be JSON with the existing event response envelope. It may contain zero events if every provider is unavailable, but that state must be explicit and non-misleading.

## Minimum Provider Set

The first reliable event feed should focus on:

- USGS Earthquakes
- NASA EONET
- NWS alerts
- GDACS

If these providers fail, the app should show a degraded state instead of broken dashboards, fake live status, or static HTML returned from an API route.

## Stop Conditions

Pause new features when:

- `/api/events` does not return JSON.
- The homepage does not load.
- The frontend says unavailable providers are live.
- A provider failure breaks the whole response.
- The core app requires paid credentials to be useful.
