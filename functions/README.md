# Cloudflare Pages Functions Placeholder

This directory contains Cloudflare Pages Functions compatibility work.

Netlify remains supported through `netlify/functions`, and those functions must not be removed until Cloudflare route parity is implemented and tested.

Implemented Cloudflare Pages routes:

- `functions/api/events.js` maps to `/api/events` and calls the shared `src/api/events-response.js` response builder used by `netlify/functions/events.mjs`.

Initial Cloudflare Pages Function ports should focus on:

- `/api/events` - implemented as the first compatibility route
- `/api/sources`
- `/api/provider-health`
- `/api/countries`
- `/api/country-risk`
- `/api/moving-objects`

Provider credentials must be configured only as server-side Cloudflare Pages environment variables when Cloudflare support is implemented. Do not place secrets in frontend code, docs, fixtures, screenshots, or `.env.example`.
