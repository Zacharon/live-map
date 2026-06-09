# Security and Privacy

## Current controls

- Content Security Policy in `netlify.toml`
- External links use `target="_blank"` and `rel="noopener noreferrer"`
- UI text is HTML-escaped before rendering dynamic content
- Secrets are not committed
- `.env.example` contains variable names only
- AI, aviation, maritime, cyber, and dark-web style providers are disabled until explicit server-side configuration exists
- Source Explorer is metadata-only and must not expose private credentials or restricted provider content
- Master registry entries with unknown licensing remain planned, disabled, link-only, authentication-required, or license-required

## Boundaries

The platform must not support credential theft, doxxing, harassment, unlawful surveillance, malware deployment, restricted scraping, or bypassing authentication.

Licensed or sensitive sources must include access controls, redaction, audit logging, and retention policies before production use.

Browsers should call Live Map APIs rather than upstream providers. Provider adapters must sanitize errors, hide credentials, obey cache and retention limits, and surface provider failure in source status.

