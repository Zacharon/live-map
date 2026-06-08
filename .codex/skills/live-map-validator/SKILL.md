---
name: live-map-validator
description: Validate the Live Map repository before pull requests, deploys, or provider changes by running syntax checks, event API checks, coordinate checks, source URL and freshness checks, and browser-side secret scanning.
---

# Live Map Validator

Use this skill when working in `Zacharon/live-map` and the task affects the frontend, Netlify Functions, event data, provider integrations, source attribution, or deployment automation.

## Standard Workflow

1. Confirm the repo root contains `package.json`, `netlify.toml`, and `netlify/functions/events.mjs`.
2. Run the validator:

```bash
npm run validate
```

3. For production checks, run:

```bash
npm run smoke:production
```

4. For secret-focused checks, run:

```bash
npm run security:scan
```

5. Treat any `FAIL` result as blocking. Do not describe a provider as live if the validator reports missing source status, stale data, invalid coordinates, failed source URLs, or browser-side secret exposure.

## What The Validator Checks

- JavaScript syntax for browser code, Netlify Functions, and validation scripts.
- Local Netlify event function response shape.
- Event coordinate ranges.
- Event source URLs and provider URLs.
- Browser-side secret patterns in files served to users.
- `sourceStatus`, source freshness, attribution, and partial/fallback modes.

## Reporting

Summarize the pass/fail report in PRs. Include exact failures, not only a generic "validation failed" sentence.
