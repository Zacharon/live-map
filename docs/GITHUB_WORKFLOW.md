# GitHub Workflow

Live Map is a public GitHub repository. GitHub is the review and automation control plane, while Cloudflare Workers remains the production app host.

Production app:

- https://live-map.zacharyfavaron.workers.dev/

Production API check:

- https://live-map.zacharyfavaron.workers.dev/api/events?hours=168

GitHub Pages is optional for documentation or static backup only. Do not make GitHub Pages the primary Live Map host because the app depends on Cloudflare Worker API routes.

## Target Flow

1. Codex or another agent creates a feature branch.
2. The agent opens a pull request into `main`.
3. GitHub Actions run validation and security checks.
4. Auto-merge may merge the PR after required checks pass, when repository settings allow it.
5. Cloudflare connected builds deploy from `main`.
6. Humans verify the Cloudflare app and API after Cloudflare finishes.

Agents must not push directly to `main`, merge PRs, run production deploy commands, or run `wrangler deploy` unless explicitly approved.

## Repository Settings

Current known state from repository metadata:

- Visibility: public.
- Default branch: `main`.
- Pull requests: enabled.
- Squash merge: enabled.
- Merge commits: enabled.
- Rebase merge: enabled.
- Auto-merge: disabled at the repository level as of this setup note.
- Delete branches after merge: not configurable through the available Codex GitHub connector in this environment.

Recommended settings:

- Enable squash merging.
- Enable auto-merge.
- Enable automatically delete head branches after merge.
- Optionally disable merge commits and rebase merging after confirming no current workflow depends on them.
- Keep the default branch as `main`.

Manual path:

1. Open GitHub repository Settings.
2. Open General.
3. Under Pull Requests, enable "Allow squash merging", "Allow auto-merge", and "Automatically delete head branches".
4. Leave merge commits and rebase merging enabled unless the project decides to enforce squash-only history.

## Main Branch Rules

Protect `main` with a branch ruleset or branch protection rule.

Recommended rule:

- Target branch pattern: `main`.
- Require a pull request before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging when practical.
- Required checks:
  - `Validate / validate`
  - `Security / browser-secret-scan`
- Do not require the CodeQL job while it is configured as best-effort.
- Block force pushes.
- Block deletions.
- Restrict direct pushes to `main` where practical.
- Allow administrator bypass only for recovery.

Manual path:

1. Open GitHub repository Settings.
2. Open Rules, then Rulesets, or Branches, then Branch protection rules.
3. Create or update a rule targeting `main`.
4. Add the protections listed above.

## GitHub Actions

Use GitHub-hosted runners only.

Current workflows:

- `.github/workflows/validate.yml`
  - Runs on pull requests, pushes to `main`, and manual dispatch.
  - Uses `ubuntu-latest`.
  - Runs `npm run check`.
  - Runs `npm run validate`.
- `.github/workflows/security.yml`
  - Runs on pull requests, pushes to `main`, and manual dispatch.
  - Uses `ubuntu-latest`.
  - Runs `npm run security:scan`.
  - Runs CodeQL JavaScript analysis as best-effort.
- `.github/workflows/production-smoke-test.yml`
  - Runs only on schedule or manual dispatch.
  - Uses `ubuntu-latest`.
  - Runs `npm run smoke:production`.

Do not add deployment steps to these workflows without an explicit deployment decision. Cloudflare connected builds are responsible for deploying `main`.

## Environments

Create these GitHub environments:

- `preview`
- `production`

Recommended `production` settings:

- Restrict deployment branches to `main`.
- Require reviewer approval if GitHub Actions ever deploys production.
- Store production deployment secrets here only if GitHub Actions becomes the deployer.

Cloudflare currently deploys through connected builds, so GitHub environment secrets may not be needed. Do not add fake secrets. Do not commit real secrets.

Manual path:

1. Open GitHub repository Settings.
2. Open Environments.
3. Create `preview`.
4. Create `production`.
5. For `production`, restrict deployment branches to `main` and add required reviewers if available.

## Codespaces

Codespaces is optional for manual development only.

- Do not rely on Codespaces for deployment.
- Do not enable prebuilds unless there is a measured need.
- Stop Codespaces when done.
- Keep spending limits low.
- Keep secrets in GitHub or Cloudflare secret stores, never in the repo.

## Secret Handling

Never commit:

- API keys.
- Tokens.
- Provider credentials.
- OAuth client secrets.
- Private auth/contact emails.
- `.env` files.
- Screenshots or fixtures containing secrets.

Provider integrations must stay server-side. Browser code must not receive Cloudflare, Netlify, OpenSky, Global Fishing Watch, AISHub, finance, cyber, AI, or licensed-data credentials.

## Agent Rules

Codex and other agents may:

- Create feature branches.
- Edit focused docs, workflow, test, and source files.
- Open PRs into `main`.
- Enable PR auto-merge when repository settings allow it and the user has requested that behavior.

Codex and other agents must not:

- Push directly to `main`.
- Merge PRs unless explicitly approved.
- Run `wrangler deploy` unless explicitly approved.
- Run Netlify, Vercel, Cloudflare, build-hook, or deployment API commands unless explicitly approved.
- Delete Netlify compatibility during the Cloudflare migration.
- Touch untracked `artifacts/`.
- Include `docs/CHAT_HANDOFF_SUMMARY.md` unless explicitly approved.

## Post-Merge Verification

After a PR merges and Cloudflare connected builds finish:

1. Confirm the Cloudflare build completed successfully.
2. Open https://live-map.zacharyfavaron.workers.dev/ and confirm the frontend loads.
3. Open https://live-map.zacharyfavaron.workers.dev/api/events?hours=168 and confirm it returns JSON.
4. Confirm the frontend does not show fake success for missing providers.
5. Confirm provider/source degradation remains visible when upstream providers are unavailable or credential-gated.
6. Confirm unknown `/api/*` routes return JSON 404 instead of static HTML.
