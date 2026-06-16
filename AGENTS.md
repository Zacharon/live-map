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
- Do not fabricate geography for non-geographic cyber, finance, or reference records.
- Do not present simplified country bounds as legal or precise boundaries.
- Keep detailed provider diagnostics on `/diagnostics`; the public dashboard should show only compact data-status summaries.
- Keep CII severity, confidence, impact, freshness, corroboration, and completeness separate. Do not collapse them into an unexplained number.
- Do not map SEC issuers to headquarters merely to create event markers.
- Do not claim causality between official economic, filing, energy, or market records and price movements unless verified by sources.
- Do not poll aircraft or vessel providers globally. Moving-object requests must be viewport-limited, server-side, cached, and capped.
- Do not expose OpenSky, Global Fishing Watch, AISHub, ADS-B, or AIS credentials in browser code.
- Do not claim complete global flight or vessel coverage.
- Do not identify private aircraft owners or infer vessel cargo/illegal behavior from position data.
- Sensitive humanitarian locations must be generalized or suppressed when precise display could increase risk.
- Do not mirror full copyrighted reports, PDFs, photos, exploit code, or malware samples.
- Do not add paid services without explicit approval.
- Keep public-information and risk claims explainable.
- Treat this application as informational, not emergency dispatch or operational guidance.

## Source Quality

- Every live event source must include attribution, source URL, provider freshness, and source status.
- Every registry source must include access classification, implementation status, source tier, verification state, source URL, attribution, review dates, cache guidance, retention guidance, and limitations.
- Provider failures must be visible in `sourceStatus` and must not be hidden behind a successful-looking workflow result.
- If freshness, source status, or attribution changes, update the relevant docs and validator checks.
- Keep taxonomy, grouping, sorting, incident clustering, and provider-health behavior documented when changed.
- Keep non-geographic event behavior, request budgets, and provider scheduling documented when changed.
- Keep finance/commodity event classification, observation-vs-event rules, and provider-state behavior documented when changed.
- Keep country navigation, country-score methodology, diagnostics separation, provider capabilities, and opt-in provider gating documented when changed.
- Keep consumer UX, Standard/Advanced mode, moving-object API limits, tracking privacy disclosures, and aviation/maritime provider boundaries documented when changed.

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

If a Windows Codex shell cannot find `npm` or resolves `node` to a blocked WindowsApps/Codex shim, follow `docs/LOCAL_VALIDATION.md` before treating GitHub Actions as the only source of validation.
