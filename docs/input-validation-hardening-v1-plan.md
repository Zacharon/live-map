# Input Validation Hardening v1 Plan (PR #32 Repair)

## Dependency / context

Repairs conflicted **PR #32** (*Harden API and frontend input validation*) by **manual port onto latest main**, not a force-merge of the old tip.

Base: `main` after Event Artifacts v1 (#43).  
Productization v1 (#44) was merged into the artifacts feature branch only and is **not required** on main for this repair.

## What PR #32 tried to harden

- Shared query sanitizers (`hours`, tokens, country codes, allow-lists)
- Frontend URL/query state sanitization
- Safe localStorage array parse for collapsed groups
- Worker/Netlify body validation (partially superseded later)

## Why it conflicted

PR #32 branched before:

- Security audit #36 (rate limit + bounded Netlify `parseJson` + Worker body guards)
- Dashboard v2, timeline/clusters, change awareness, Event Artifacts
- Expanded `package.json` check chains and `tests/run-tests.mjs`

## Still useful

| Asset | Keep |
|-------|------|
| `src/api/request-validation.js` | Param sanitizers, hours clamp |
| `src/url-params.js` | Frontend query helpers |
| Events/sources/provider-health query wiring | Yes |
| `state.js` allow-lists + safe collapsed-groups parse | Yes |
| Countries / source-explorer URL reads | Yes |
| Moving-object limit NaN fix | Yes |

## Discarded as written

| Asset | Why |
|-------|-----|
| Netlify `lib/response.mjs` rewrite | Owned by #36 |
| briefs/alerts-test re-wraps | Already guarded |
| Worker body-limit rewrite | Already present |
| Duplicate POST oversized tests | Already covered with different error codes |

## This repair implements

1. Shared `request-validation` + `url-params` modules  
2. API hours/filter sanitization + GET method guard on events  
3. Sources filter sanitization  
4. Frontend URL + collapsed-groups soft-parse  
5. Additive regression tests  
6. Docs (this file + verification)

## Intentionally deferred

- Source Confidence v1  
- Productization merge to main  
- Full `safeHttpUrl` scheme allowlist for all `sourceUrl` fields  
- New dependencies / auth / deploy  
