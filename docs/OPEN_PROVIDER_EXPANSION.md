# Open Provider Expansion

Phase 2D adds controlled official/open provider groups without labeling unavailable providers as live.

New independently controlled provider groups:

- `security-rss`, gated by `SECURITY_RSS_ENABLED=true`.
- `weather-rss`, gated by `WEATHER_RSS_ENABLED=true`.
- `health-rss`, gated by `HEALTH_RSS_ENABLED=true`.
- `positive-rss`, gated by `POSITIVE_RSS_ENABLED=true`.

Each provider group uses an allowlisted feed registry, SSRF-protected server-side fetches, metadata-only excerpts, original source links, and source-health reporting.

These groups default to `configuration-required`. If a flag is missing, the provider returns a visible configuration-required status and does not attempt upstream requests.

Do not add arbitrary user-submitted feed URLs. Do not republish full article bodies, images, PDFs, or scraped pages.
