# Next Task Queue

Small, agent-ready tasks only. Do not turn these into broad refactors.

## Context Updates

- Completed: PR #37 created the ICM memory pack and made `AGENTS.md`, `docs/PROJECT_HANDOFF.md`, `docs/LAST_30_DAYS.md`, `docs/API_CONTRACTS.md`, `docs/SECURITY_INVARIANTS.md`, and this queue the first-read context for future agents.
- In progress: PR #38 future feature structure and feature-flag documentation on branch `feature/future-feature-structure`. Keep it docs/structure-only: no runtime imports, no fake UI, no unfinished feature activation.

## P0

### Rebase or close PR #32

- Goal: decide whether `feature/input-validation-hardening` is still needed after PR #33 and PR #36.
- Touch first: GitHub PR #32, `src/api/events-response.js`, `src/api/sources-response.js`, `src/api/provider-health-response.js`, frontend query parsing files.
- Test: `npm run check:syntax`, `npm run test:platform`.

### Add source URL scheme allowlist

- Goal: prevent provider-controlled event links from rendering non-web schemes.
- Touch first: `src/events/normalized-event.js`, `src/app-controller.js`, `src/ui/dialogs.js`, provider normalizers that set `sourceUrl`.
- Test: add cases for `javascript:`, `data:`, `mailto:`, relative URLs, `http:`, and `https:`.

## P1

### Add Cloudflare asset security headers

- Goal: match Netlify CSP/security headers for Cloudflare static asset responses.
- Touch first: `src/worker.js`, `netlify.toml`, `tests/run-tests.mjs`.
- Test: Worker responses for `/`, `/app.js`, `/sources` include CSP, `X-Content-Type-Options`, and `Referrer-Policy`.

### Add bounded provider JSON helper

- Goal: avoid unbounded `response.json()` on upstream provider responses.
- Touch first: `src/data/providers/orchestrator.js`, direct provider `response.json()` calls.
- Test: over-cap JSON, malformed JSON, normal JSON.

### Stream RSS feed size cap

- Goal: stop reading RSS/Atom bodies after the configured byte cap.
- Touch first: `src/data/providers/rss-feed.js`.
- Test: fake over-cap feed response must not fully materialize.

## P2

### Harden RSS redirect policy

- Goal: disallow or tightly restrict redirects outside the feed registry.
- Touch first: `src/data/providers/rss-feed.js`, `src/data/providers/ssrf-protection.js`.
- Test: private host literals, link-local hosts, non-allowlisted redirect destinations.

### Draft evidence record model

- Goal: introduce evidence/claim/assessment terminology without changing public API shapes yet.
- Touch first: `docs/OSINT_FORGE_ALIGNMENT.md`, `src/events/normalized-event.js`, `docs/SOURCE_QUALITY_AND_VERIFICATION.md`.
- Test: documentation only unless adding schema helpers.

### Add advanced source-mode UI sketch

- Goal: let advanced users inspect provenance without overwhelming the public map.
- Touch first: `src/app-controller.js`, `src/ui/`, `docs/STANDARD_AND_ADVANCED_MODES.md`.
- Test: smallest frontend rendering/unit coverage available.
