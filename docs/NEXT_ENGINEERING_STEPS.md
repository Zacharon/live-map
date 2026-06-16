# Next Engineering Steps

Live Map now has a working Cloudflare event path and public trust routes. The next work should stay narrow: verify the baseline, improve honesty, then add one green-list source at a time.

## Current Baseline

As of the latest smoke check after PR #28 merged:

- `/` returned the Live Map frontend.
- `/api/events?hours=168` returned JSON events.
- `/api/sources` returned JSON source registry data.
- `/api/provider-health` returned JSON provider health data.
- `/api/not-real-route` returned JSON 404.
- The homepage rendered events, showed a nonzero visible count, displayed source-health text, and had no browser console warnings/errors.
- `/sources` still reached the main app shell on live Cloudflare because Static Assets handled the route before the Worker alias. This branch fixes that by adding `/sources` to `run_worker_first`.

## Next 3 PRs

### 1. Baseline smoke test and route diagnostics

Goal: make the working Cloudflare baseline hard to regress.

Scope:

- Add a lightweight production-safe smoke script that checks `/`, `/api/events?hours=168`, `/api/sources`, `/api/provider-health`, `/api/not-real-route`, and `/sources`.
- Keep the script opt-in for production checks; do not run production smoke on every PR unless explicitly configured.
- Add route diagnostics that distinguish static HTML, JSON 404, provider degradation, and frontend render failures.
- Keep unknown `/api/*` responses JSON.

Definition of done:

- The smoke script can report route status, content type, event count, provider-health mode, and `/sources` page identity.
- It never prints secrets, raw upstream payloads, or stack traces.

### 2. One new green-list public provider

Goal: expand data only after the baseline remains stable.

Recommended provider: NOAA National Hurricane Center public feeds or NOAA SWPC JSON feeds.

Why:

- Official public source.
- Feed/API style access, not scraping.
- Clear attribution path.
- Useful domain expansion without paid credentials.

Scope:

- One provider module only.
- Server-side fetch only.
- Source registry entry, provider-health state, attribution, docs, and tests.
- Conservative cache headers and request budget.
- Disabled or narrow default behavior if terms or coverage are uncertain.

Definition of done:

- Provider failure does not break `/api/events`.
- Events have title, time, source, source URL, domain, severity, and coordinates or an honest non-geographic state.
- Provider-health exposes live/degraded/disabled/configuration-required status honestly.

### 3. Better source-health UI and empty state

Goal: make trust visible without redesigning the app.

Scope:

- Keep the current layout.
- Clarify when the app is partial, degraded, stale, or empty.
- Link source status to `/sources` and `/diagnostics`.
- Avoid claiming disabled or credential-gated providers are live.
- Improve mobile card clipping only if a small CSS fix is enough.

Definition of done:

- Users can tell which providers are working and which are not.
- Empty states explain whether filters, provider outages, or disabled sources are responsible.
- The homepage does not hang on "Waiting for live feeds" after a completed API response.

## Bug-Hunt Priorities

Fix bugs before new source work when any of these appear:

- API returns 200 but UI shows stale or empty data.
- Default filters hide valid events unexpectedly.
- Source health says live when a provider failed.
- Unknown `/api/*` serves frontend HTML.
- Provider errors expose raw stack traces, payloads, emails, tokens, or secrets.
- Events lack source attribution or source URLs.
- Map cards show duplicate or old events without explanation.
- Mobile layout clips event cards.
- Cloudflare route behavior diverges from Netlify compatibility.

## Source Policy

Use APIs, feeds, downloads, RSS/Atom, GeoJSON, CSV, KML, or official bulk datasets first. Do not scrape licensed sites. Do not add Telegram or X scraping. Paid or licensed providers stay out of the default open-source stack.
