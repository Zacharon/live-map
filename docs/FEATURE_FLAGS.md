# Feature Flags

Feature flags are documented by name only. Do not put secret values, provider credentials, private emails, or environment-specific tokens in this file.

Unfinished features default to `false`. A default-off flag means the structure may exist, but no public UI, route behavior, provider call, or bundled frontend data should be activated unless a focused implementation PR changes that behavior.

## Planned Flags

| Flag | Default | Scope | Status | Notes |
| --- | --- | --- | --- | --- |
| `FEATURE_EVIDENCE_FRAMEWORK` | `false` | Server-only until UI is implemented | Planned | Enables future evidence record handling after schemas and review rules exist. |
| `FEATURE_SOURCE_MODE` | `false` | Frontend-affecting | Planned | Enables advanced provenance/source inspection only after backed by existing source data. |
| `FEATURE_CONTROL_ASSESSMENTS` | `false` | Server-only until UI is implemented | Planned | Enables reviewed control-assessment records after reviewer workflow is documented. |
| `FEATURE_MOVING_OBJECTS` | `false` | Server-only with frontend-affecting views | Existing bounded prototype remains separately guarded | Future flag for additional moving-object expansion; credentials remain server-side. |
| `FEATURE_FINANCE` | `false` | Server-only with frontend-affecting views | Planned expansion | Future flag for finance observations beyond existing fixture/status behavior. |
| `FEATURE_CYBER` | `false` | Server-only with frontend-affecting views | Planned expansion | Future flag for cyber observations beyond implemented public providers. |
| `FEATURE_CONFLICT` | `false` | Server-only with frontend-affecting views | Planned | Must not turn unreviewed reports into map claims without review rules. |
| `FEATURE_BRIEFS` | `false` | Server-only | Disabled scaffold | Keeps brief generation disabled unless a safe provider integration is approved. |
| `FEATURE_ALERTS` | `false` | Server-only with frontend-affecting views | Disabled scaffold | Keeps alert delivery disabled; validation previews may remain local/test-only. |
| `FEATURE_CLOUDFLARE_PAGES_FUNCTIONS` | `false` | Server/platform | Planned | Allows future Pages Functions wrappers over shared handlers without replacing Netlify routes. |

## Server-Only Flags

Server-only flags may be read from deployment environment variables by Netlify Functions, Cloudflare Workers, or future Cloudflare Pages Functions. They must not be embedded into static frontend bundles unless the value is explicitly safe and only controls display of already-public data.

## Frontend-Affecting Flags

Frontend-affecting flags can hide or reveal UI that is fully backed by existing public data and documented API behavior. They must not expose credentials, private provider diagnostics, unfinished source modes, evidence frameworks, claim review workflows, or control assessments by default.

## Documentation Rule

Cloudflare, Netlify, GitHub, and provider secret names may be documented by name only. Values belong in the hosting provider's secret store, never in source, docs, fixtures, screenshots, or browser bundles.
