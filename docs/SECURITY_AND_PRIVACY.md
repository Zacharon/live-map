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
- Detailed provider diagnostics are separated onto `/diagnostics` and must stay sanitized
- Opt-in provider groups fail visibly as `configuration-required` instead of silently pretending to be live

## Boundaries

The platform must not support credential theft, doxxing, harassment, unlawful surveillance, malware deployment, restricted scraping, or bypassing authentication.

Licensed or sensitive sources must include access controls, redaction, audit logging, and retention policies before production use.

Browsers should call Live Map APIs rather than upstream providers. Provider adapters must sanitize errors, hide credentials, obey cache and retention limits, and surface provider failure in source status.

The `/api/provider-health` endpoint must never return raw upstream payloads, stack traces, environment variables, tokens, keys, private contact emails, or provider credentials.

Moving-object providers must stay server-side. Do not expose OpenSky OAuth credentials, Global Fishing Watch tokens, AISHub credentials, ADS-B keys, or AIS keys to browser JavaScript. Do not poll globally, keep viewport limits, and present tracking coverage as incomplete and possibly delayed.

Humanitarian providers must not display sensitive camps, shelters, medical facilities, children, trafficking survivors, conflict victims, persecuted groups, or aid-worker movement locations at harmful precision.

Cyber providers must not include exploit instructions, proof-of-concept retrieval, malware retrieval, or fabricated geographic locations.

# Open News and Social Privacy

No provider credential is exposed to browser code. The feed adapter uses the existing SSRF URL and redirect guard. Raw social content, comments, transcripts, chat, profile histories, and raw responses are not retained.
