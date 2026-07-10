# Input Validation Hardening v1 Verification

## PR #32 recovery method

**Strategy:** Manual port from `feature/input-validation-hardening@876961a` onto latest `main` (after Event Artifacts #43).  
**Not used:** Rebase of conflicted tip; Netlify/Worker body rewrites from #32.

## Branch

`feature/input-validation-conflict-repair-v1` → `main`

## Files ported / created

| Path | Action |
|------|--------|
| `src/api/request-validation.js` | Created (param-focused; no competing body parser) |
| `src/url-params.js` | Created |
| `src/api/events-response.js` | Hours/filter sanitize + GET-only |
| `src/api/sources-response.js` | Filter sanitize |
| `src/api/provider-health-response.js` | Hours + method |
| `netlify/functions/countries.mjs` | Country sanitize (kept `withPublicApiGuard`) |
| `netlify/functions/country-risk.mjs` | Hours + country sanitize |
| `src/moving-objects/schema.js` | Limit clamp via `clampedInteger` |
| `src/state.js` | URL allow-lists + safe collapsed-groups parse |
| `src/countries-app.js` / `src/source-explorer-app.js` | URL helpers |
| `tests/run-tests.mjs` | Additive validation tests |
| `package.json` | `node --check` for new modules |
| docs plan + verification | This pair |

## Conflicts resolved

| Conflict area | Resolution |
|---------------|------------|
| `lib/response.mjs` | **Discarded** #32 rewrite; keep #36 |
| Worker body limits | **Discarded** #32 rewrite; keep main |
| `tests/run-tests.mjs` | **Additive** only; keep #36 + artifact tests |
| `package.json` | Append checks only |
| `state.js` | Surgical allow-lists; keep `selectedClusterId` |

## Validation surfaces covered

- API `hours` invalid/out-of-range  
- API domain/recordKind/verification/country filters  
- Sources `q`/enums/source token  
- FE URL view/sort/domains/country helpers  
- Corrupt localStorage array (collapsed groups helper)  
- Moving-object limit NaN  

## Commands run

| Command | Result |
|---------|--------|
| `npm run check` | PASS |
| `npm run test:platform` | PASS (includes new validation tests) |
| `npm run validate` | PASS 10/10 |
| `npm run security:scan` | PASS |
| `npm run security:repo-scan` | PASS |
| `git diff --check` | PASS |

## Manual / scripted QA

| Check | Result |
|-------|--------|
| Events API normal | PASS via validate + unit tests |
| Malformed hours/domain/recordKind | PASS unit test (200 + warnings, null filters) |
| Malformed sources filters | PASS unit test |
| Frontend URL helpers | PASS unit test |
| Corrupt storage helper | PASS `safeJsonArray` |
| Artifacts / change-awareness | PASS existing tests |
| Browser UI click-through | Not driven; no UI productization regression expected (no drawer edits) |

## No-secrets / no-provider-regression

- No `.env`, secrets, providers, or deploy changes  
- #36 rate-limit and body guards unchanged  

## Known limitations

- `safeHttpUrl` for all source links not in this repair  
- Productization intelligence modules not on main (N/A)  
- Full browser click QA optional after PR open  
- Recommend close original PR #32 after this lands  
