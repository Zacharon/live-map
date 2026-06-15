# Pull Request Security Checklist

Use this checklist before opening or merging a PR.

- No real secrets, tokens, private auth emails, `.env` files, service credentials, or screenshots containing secrets are committed.
- No fake secrets that look real are added to docs, examples, tests, or fixtures.
- Credentialed provider calls remain server-side.
- Browser code does not receive provider credentials, Cloudflare tokens, Netlify tokens, OAuth secrets, or paid-service credentials.
- No new deployment command, build hook, production publish command, or deployment API call is added without explicit approval.
- No unsafe scraping, provider bypass, CAPTCHA bypass, paywall bypass, or license bypass is introduced.
- Source attribution, source URLs, provider freshness, and provider status remain visible.
- Provider errors are sanitized and do not expose stack traces, raw upstream payloads, secrets, environment variables, or private contact emails.
- `/api/events`, `/.netlify/functions/events`, and existing Cloudflare Worker routes remain compatible.
- Unknown `/api/*` routes return JSON errors rather than static HTML where the Worker handles them.
- Planned, fixture, disabled, credential-required, delayed, degraded, or unavailable sources are not labeled live.
- Public claims stay cautious: no complete real-time global coverage, no emergency reliance, and no professional-advice claims.
- OSINT, aviation, maritime, cyber, humanitarian, and conflict-related changes respect privacy and safety limits.
- Checks run, or local limitations are clearly documented in the PR.
