# Contributing To Live Map

Thanks for helping make Live Map useful, honest, and maintainable. The core project is a public-data-only map that should run without paid APIs or private credentials.

## Local Checks

Use a feature branch for all changes.

```bash
npm run check
```

If the full check is not available in your environment, run the narrowest available checks and say exactly what did and did not run in the pull request.

Useful narrower checks:

```bash
npm run check:syntax
npm run security:scan
```

Do not run production deploy commands from contributor or agent workflows.

## Adding A Public Data Source

Before adding a source, confirm:

- The source is free/public or optional and clearly config-gated.
- The source terms allow the intended use.
- The integration does not scrape licensed sites.
- Credentials, tokens, contact emails, and API keys stay server-side.
- The provider can fail without breaking the app.
- Events include source attribution, source URLs when available, timestamps, domain, severity, and coordinates when applicable.

Keep provider integrations small. Prefer one provider module, focused tests, and documentation updates in the same PR.

## Source Attribution

Every live provider must expose enough context for users to verify the original source:

- Provider name
- Source URL or canonical record URL when available
- Last fetched or last updated time
- Freshness/degraded status
- Coverage limitations

Do not label fixtures, placeholders, unavailable providers, or planned providers as live.

## Secrets And Paid Data

Never commit secrets, tokens, OAuth values, contact emails used for provider access, or paid-service credentials. Do not add required paid provider dependencies for the core app.

The frontend must never contain provider secrets. Use server-side Worker or Netlify environment variables for optional providers.

## Pull Requests

Use the pull request checklist when available, and include:

- Checks run
- Whether any API routes changed
- Whether Netlify compatibility was preserved
- Whether Cloudflare compatibility was affected
- Provider attribution and degraded-state behavior
- Confirmation that no production deploy was run

See `docs/PR_SECURITY_CHECKLIST.md` for security-sensitive changes.

## Public Claims

Keep public claims cautious. Live Map can show public reports, official alerts, and source-linked indicators. It should not imply complete coverage, emergency guidance, territorial control, military targeting detail, or unsourced conclusions.
