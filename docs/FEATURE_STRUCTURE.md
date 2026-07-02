# Feature Structure

This repo keeps the current working application in place while adding feature ownership folders for future work. These folders are anchors for boundaries and documentation; they do not activate unfinished features and must not be imported by runtime code until a scoped implementation PR wires them.

## Directory Ownership

`src/features/` is for feature-owned client/server-neutral logic, types, adapters, view models, and tests once a feature is mature enough to have a clear owner. Existing code may stay in legacy folders until a small migration is justified by active work.

Planned feature folders:

| Folder | Owner boundary |
| --- | --- |
| `src/features/events/` | Public event feed behavior, canonical event concepts, event filter ownership. |
| `src/features/sources/` | Source Explorer behavior and public source metadata concepts. |
| `src/features/providers/` | Provider capability concepts that sit above individual adapters. |
| `src/features/country-risk/` | Country score, methodology, and country drilldown behavior. |
| `src/features/moving-objects/` | Bounded aviation and maritime viewport concepts. |
| `src/features/finance/` | Finance and commodity observation concepts. |
| `src/features/cyber/` | Cyber advisories, vulnerability, and infrastructure observation concepts. |
| `src/features/conflict/` | Conflict and humanitarian public-information concepts. |
| `src/features/evidence/` | Evidence records that support, contradict, or contextualize claims. |
| `src/features/claims/` | Reviewed or unreviewed claims derived from public sources. |
| `src/features/control-assessments/` | Human-reviewed assessments and control/effectiveness judgments. |
| `src/features/source-mode/` | Advanced provenance inspection modes. |
| `src/features/alerts/` | Alert rule concepts and safe preview behavior. |
| `src/features/briefs/` | Brief request/response concepts; no AI provider call by default. |

## What Belongs In Feature Folders

Put feature-specific normalization rules, domain constants, view models, focused test fixtures, and feature-level README notes in the matching feature folder. A feature folder may depend on `src/shared/` and on explicit server handlers, but it should not reach across into another feature's private internals.

Avoid cross-feature spaghetti by using small shared concepts only when at least two implemented features need them. If a helper is only used by one feature, keep it with that feature.

## What Stays In Server Handlers

`src/server/handlers/` is reserved for shared route handlers that can be called from Netlify Functions, Cloudflare Workers, or future Cloudflare Pages Functions. Runtime wrappers should stay thin: parse the platform request, call a shared handler, and return the platform response.

Server handlers should own request/response envelopes, error shaping, body limits, and route-level compatibility. Provider credentials and server-only flags must stay server-side.

## What Stays In Middleware

`src/server/middleware/` is for platform-neutral guardrails such as rate limiting wrappers, bounded JSON parsing, CORS/header helpers, and sanitized error handling. Middleware must fail closed for malformed or oversized input and must not expose stack traces or secrets.

## What Stays In Shared Utils

`src/shared/` is for pure, runtime-neutral helpers with no browser globals, Node-only APIs, platform request objects, provider credentials, or feature-specific policy. Shared utilities should be boring and narrow.

## Data Folders

`data/fixtures/` contains sanitized sample records for tests and docs only. Fixtures must never be labeled live, must not include provider credentials, and must not imply complete coverage.

`data/schemas/` contains schema documentation or future machine-readable schemas. Adding a schema does not change public API behavior unless a route PR explicitly wires validation.

`data/registries/` is for future checked-in registries that are safe to bundle or publish. The current source registry remains in `src/sources/master-source-registry.js` until a separate migration is justified.

## When To Add Tests

Add tests whenever a feature folder gains executable code, a schema is enforced, an API envelope changes, a route wrapper moves, or frontend behavior changes. Documentation-only structure can use syntax, validation, and secret scans as the main checks.

## Migration Rule

Do not move large existing systems just to match this structure. Prefer one feature at a time, with unchanged routes, unchanged public response shapes, and a clear before/after test.
