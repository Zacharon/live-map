# Agent Automation

Live Map uses a split automation model:

- GitHub handles issues, labels, pull requests, checks, branch rules, and optional auto-merge.
- Cloudflare handles production hosting and Worker API deployment from `main`.
- Codex works on controlled feature branches and opens pull requests.
- Replit is for prototypes and UI experiments unless production use is explicitly approved.
- Codespaces is a manual browser IDE for occasional editing, not an always-on deployment environment.

Agents must not push directly to `main`, merge pull requests, run production deploys, or run `wrangler deploy` unless the user explicitly approves that action.

## Agent Workflow

1. Start from a small issue or prompt.
2. Create a feature branch from the latest `main`.
3. Inspect relevant files before editing.
4. Make the smallest reviewable change.
5. Update docs and checks when behavior changes.
6. Run available checks.
7. Push the branch.
8. Open a draft PR into `main`.
9. Stop for review unless the user explicitly asks for more.

After merge, Cloudflare connected builds deploy from `main`. Agents should verify the live Cloudflare app only after the build finishes and only with non-destructive requests.

## Recommended Task Size

Good agent tasks:

- One API route port.
- One provider boundary or provider adapter.
- One UI bug fix.
- One docs/checks update.
- One workflow improvement.
- One small validation rule.

Avoid combining unrelated provider work, UI redesigns, routing changes, and workflow changes in one PR.

## Good Agent Prompts

A good prompt includes:

- Branch name.
- Goal.
- Files to inspect first.
- Safety rules.
- Expected behavior.
- Checks to run.
- Whether to commit, push, and open a PR.
- Whether deployment is forbidden or approved.

Example:

```text
Use branch feature/example-route.
Inspect src/worker.js, netlify/functions/example.mjs, and src/api/.
Port only /api/example to Cloudflare Workers.
Preserve Netlify compatibility.
Do not deploy.
Run npm run check.
Commit, push, and open a draft PR.
```

## Labels For Agent Work

Useful labels:

- `good-first-agent-task`: scoped, low-risk, clear files, clear checks.
- `cloudflare`: Worker, Wrangler, or Cloudflare migration.
- `api-route`: API route behavior or compatibility.
- `provider`: source/provider registry or adapter work.
- `security`: security policy, scanning, secrets, or privacy controls.
- `docs`: documentation-only or documentation-heavy work.
- `ui`: frontend behavior or presentation.
- `workflow`: GitHub Actions, issue templates, labels, or automation.

## Tool Boundaries

Codex:

- Good for branch work, repo inspection, docs, tests, and focused code changes.
- Should not run production deploys without explicit approval.

Replit:

- Good for fast UI prototypes.
- Must not become production deployment for Live Map unless explicitly approved.

Codespaces:

- Good for manual browser-based edits.
- Keep stopped when not in use.
- Do not use as a deployment runner.

Cloudflare:

- Production app host.
- Provider secrets belong in Cloudflare environment variables or bindings, not in the repository.

GitHub:

- Source of truth for PR review, checks, issues, labels, Dependabot, branch rules, and optional auto-merge.
