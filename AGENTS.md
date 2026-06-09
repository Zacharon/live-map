# Live Map Agent Instructions

These instructions apply to the whole repository.

## Deployment and API Compatibility

- Never run Netlify deploy commands, build hooks, deployment APIs, manual deploy triggers, or production-publish actions unless the user explicitly asks for deployment.
- Never merge pull requests automatically.
- Do not push directly to `main`, `master`, or another production branch.
- Preserve Netlify static hosting compatibility: publish directory `.` and functions directory `netlify/functions`.
- Preserve `/api/events` and the direct `/.netlify/functions/events` endpoint. Do not rename, remove, or break either route.
- Preserve `/api/sources` and `/sources` when editing the master source registry or Source Explorer.
- Keep browser code static-host friendly. Do not require a build step unless `README.md`, `netlify.toml`, and GitHub Actions are updated together.

## Secrets and Data Safety

- Never expose secrets, access tokens, API keys, emails used for provider auth, or private credentials in browser code.
- Keep provider credentials in Netlify environment variables only.
- Do not place real API keys in `.env.example`, docs, tests, fixtures, screenshots, or source files.
- Never label fixtures, placeholder data, unavailable providers, or planned integrations as live.
- Never mark a master source registry entry `live` unless an adapter exists, terms are reviewed, attribution is implemented, and cache/retention policies are documented.
- Do not fabricate missing event data.
- Do not add paid services without explicit approval.
- Keep public-information and risk claims explainable.
- Treat this application as informational, not emergency dispatch or operational guidance.

## Source Quality

- Every live event source must include attribution, source URL, provider freshness, and source status.
- Every registry source must include access classification, implementation status, source tier, verification state, source URL, attribution, review dates, cache guidance, retention guidance, and limitations.
- Provider failures must be visible in `sourceStatus` and must not be hidden behind a successful-looking workflow result.
- If freshness, source status, or attribution changes, update the relevant docs and validator checks.
- Keep taxonomy, grouping, sorting, incident clustering, and provider-health behavior documented when changed.

## Workflow

- Use branches and pull requests for changes. Do not push directly to `main` unless the user explicitly asks for that.
- Keep changes scoped to the requested behavior.
- Update documentation whenever app behavior, deployment behavior, API shape, provider status, or validation behavior changes.

## Required Checks

Run the available syntax and validation checks before opening a PR:

```bash
npm run check:syntax
npm run validate
```

For production or release changes, also run:

```bash
npm run smoke:production
npm run security:scan
```
