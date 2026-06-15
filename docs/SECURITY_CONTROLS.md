# Security Controls

This checklist reduces risk for a public OSINT/public-information project. It does not make the project lawsuit-proof, breach-proof, or fit for life-safety use.

## GitHub Settings Checklist

Enable or verify in repository settings:

- Dependency graph.
- Dependabot alerts.
- Dependabot security updates.
- Secret scanning.
- Push protection.
- CodeQL/code scanning.
- Branch protection or rulesets for `main`.
- Required pull request before merging to `main`.
- Required checks:
  - `Validate / validate`.
  - `Security / browser-secret-scan`.
  - `Security / repo-secret-scan`.
- Block force pushes to `main`.
- Block branch deletion for `main`.
- Environments:
  - `preview`.
  - `production`.
- Production environment restrictions:
  - Deployment branches restricted to `main`.
  - Required reviewers if GitHub Actions ever deploys production.

Manual paths are documented in `docs/GITHUB_WORKFLOW.md`.

## Cloudflare Controls

- Cloudflare Workers is the production host.
- Store provider credentials only in Cloudflare environment variables or bindings.
- Do not put secrets in frontend files, docs, screenshots, fixtures, or `.env.example`.
- Keep `/api/*` provider integrations server-side.
- Sanitize provider errors before returning them to browser clients.
- Return JSON 404 for unknown API routes instead of frontend HTML.
- Deploy production only from `main` through the approved connected-build flow.
- Do not run `wrangler deploy` from agent sessions unless explicitly approved.

## Agent And Codex Controls

Agents must:

- Work on feature branches.
- Open pull requests into `main`.
- Avoid direct pushes to `main`.
- Avoid production deploys unless explicitly approved.
- Avoid committing secrets or secret-looking placeholders.
- Avoid touching untracked `artifacts/`.
- Avoid including `docs/CHAT_HANDOFF_SUMMARY.md` unless explicitly approved.
- Preserve Netlify compatibility during the Cloudflare migration.
- Keep public claims cautious and source-attributed.

## Incident Response Checklist

### Leaked Secret

1. Revoke or rotate the credential immediately.
2. Remove the secret from current files.
3. Identify affected systems and logs.
4. Review Git history exposure and decide whether history rewriting is necessary.
5. Move replacement credentials to Cloudflare, Netlify, or GitHub secret stores as appropriate.
6. Add a regression check if the leak pattern was not covered.

### Bad Data

1. Identify the event, provider, source URL, and affected UI/API route.
2. Mark provider or record status degraded, corrected, disputed, or unavailable as appropriate.
3. Preserve source attribution and correction context.
4. Avoid silent deletion when a correction note is safer.
5. Update docs/tests if the failure reveals a policy gap.

### API Outage

1. Confirm whether the issue is Cloudflare Worker routing, Netlify compatibility, or an upstream provider.
2. Check `/api/events?hours=168`, `/api/sources`, and `/api/provider-health`.
3. Surface partial-data and provider degradation to users.
4. Avoid claiming the site is fully operational when source status is degraded.

### Provider Terms Issue

1. Pause or disable the affected provider.
2. Preserve attribution and source links for already ingested metadata where terms allow.
3. Review caching, retention, redistribution, and commercial-use rules.
4. Update the source registry status and limitations.
5. Do not resume live use until terms are reviewed.

### Security Report

1. Acknowledge the report.
2. Reproduce safely in a local or non-destructive environment.
3. Prioritize based on impact.
4. Patch on a feature branch when possible.
5. Avoid public exploit details until mitigation is available.
6. Credit the reporter only with permission.
