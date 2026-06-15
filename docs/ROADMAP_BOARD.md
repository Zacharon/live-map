# Roadmap Board

Use this lightweight board structure for GitHub Projects, labels, or manual planning.

## Columns

### Backlog

Ideas that are useful but not ready for an agent yet.

Entry criteria:

- Problem is captured.
- No immediate safety blocker.
- Scope may still be fuzzy.

### Ready For Codex

Small, well-scoped tasks ready for agent work.

Entry criteria:

- Clear branch name.
- Clear goal.
- Files to inspect first.
- Safety rules.
- Expected checks.
- Label `good-first-agent-task` when the task is small and low risk.

### In Progress

An agent or contributor is actively working on a branch.

Entry criteria:

- Branch exists.
- Owner is known.
- Task scope is still current.

### PR Open

A pull request exists and checks/review are pending.

Entry criteria:

- PR links the issue or task.
- Checks are running or complete.
- PR template is filled out.

### Merged

The PR is merged to `main`, and Cloudflare connected build may be running.

Entry criteria:

- PR merged.
- No manual deploy was run unless explicitly approved.
- Follow-up verification is queued.

### Verified Live

The change is confirmed on the live Cloudflare site.

Entry criteria:

- Cloudflare build completed.
- `/` loads.
- `/api/events?hours=168` returns JSON.
- Affected API/UI behavior works.
- Provider degradation and source status remain visible.

## Recommended Labels

- `cloudflare`
- `api-route`
- `provider`
- `security`
- `docs`
- `ui`
- `workflow`
- `good-first-agent-task`

## Priority Rules

Highest priority:

- Security reports.
- Leaked secrets.
- Broken `/api/events`.
- Production frontend cannot load.
- Provider failures hidden as success.

High priority:

- Cloudflare route compatibility regressions.
- Source attribution missing.
- Public claims overstate coverage or certainty.
- Broken diagnostics/source health.

Normal priority:

- Provider additions.
- UI improvements.
- Documentation improvements.
- Workflow automation.

Low priority:

- Cosmetic refactors.
- Broad speculative source research.
- Prototype ideas without a safety or user-facing need.

## Post-Merge Verification Issue

For meaningful production changes, open or update a verification issue with this checklist:

- [ ] Cloudflare build finished.
- [ ] `/` loads on the live Cloudflare Worker.
- [ ] `/api/events?hours=168` returns JSON.
- [ ] Relevant new route or UI path works.
- [ ] Source health and degraded/fallback states are visible.
- [ ] No fake success is shown for missing providers.
- [ ] Follow-up bugs are filed for anything not verified.
