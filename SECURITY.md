# Security Policy

Live Map is a public-information situational-awareness project. This policy explains how to report security issues and how the project handles responsible disclosure. It is not a legal promise, warranty, bug bounty, or guarantee of protection.

## Supported Branch

Security fixes are accepted against `main` and active feature branches that are open for review. Historical branches are not supported unless a maintainer explicitly marks them active.

## Reporting A Vulnerability

Preferred reporting path:

1. Use GitHub private vulnerability reporting for `Zacharon/live-map` if it is enabled.
2. If private vulnerability reporting is not enabled, open a minimal public GitHub issue asking for a private coordination channel. Do not include exploit details, secrets, payloads, screenshots containing credentials, or private data in the public issue.

Please include:

- A short summary of the issue.
- Affected route, file, provider, or workflow.
- Reproduction steps that avoid destructive testing.
- Expected impact and scope.
- Whether any credential, token, personal data, or third-party provider term may be affected.
- Suggested fix or mitigation, if known.

## Response Expectations

This is a small public project, so response times are best-effort:

- Initial triage target: within 7 days.
- High-risk issue mitigation target: as soon as practical after confirmation.
- Public disclosure target: after a fix or mitigation is available, or after coordination with the reporter.

If the issue is being actively exploited or exposes secrets, rotate affected credentials immediately and treat the report as urgent.

## Responsible Disclosure

Please:

- Test only your own fork, local development environment, or a non-destructive public route.
- Avoid destructive scans, load tests, denial-of-service tests, credential stuffing, spam, or data exfiltration.
- Do not attempt unauthorized access to Cloudflare, GitHub, Netlify, provider accounts, or other third-party systems.
- Do not bypass authentication, CAPTCHAs, paywalls, provider access controls, or rate limits.
- Do not publish exploit details before a reasonable remediation window.
- Preserve privacy and avoid collecting data that is not needed to demonstrate the issue.

Safe-harbor-style intent: if you act in good faith, avoid harm, avoid privacy violations, and follow this policy, the project will try to work with you constructively. This statement is not legal advice and is not a binding legal safe harbor.

## No Bug Bounty

There is no paid bug bounty unless one is explicitly announced in this repository by a maintainer.

## Production Testing Limits

Do not run destructive tests against production. Do not run automated high-volume scans against:

- `https://live-map.zacharyfavaron.workers.dev/`
- Cloudflare Worker routes.
- Netlify compatibility routes.
- Upstream data providers.

Use minimal, non-destructive requests when confirming public behavior.
