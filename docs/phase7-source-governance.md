# Phase 7 — Legal open source expansion governance notes

**Date:** 2026-08-01  
**Constraints:** Locked #55 source governance; no ToS scraping; no paid sources without approval; headlines/link/attribution only for news; credentials server-side only.

## Added or prepared this phase

| Source | Adapter | Status | Ingest | Cache | Transform | Link-only | Retention | Corroboration eligible | Notes |
|--------|---------|--------|--------|-------|-----------|-----------|-----------|------------------------|-------|
| **NASA FIRMS** (VIIRS SNPP NRT) | `src/data/providers/firms.js` | **configuration-required** | Yes (when `NASA_FIRMS_MAP_KEY` set) | Provider cache via orchestrator | CSV → clustered thermal anomalies | No | Follow existing event freshness (~hours) | **No** as sole confirmation of wildfire incident; sensor product only | Free MAP_KEY; world/1-day; grid-clustered to ≤80 cells; attribute NASA FIRMS |
| **NOAA SWPC** alerts JSON | `src/data/providers/swpc.js` | **live** (no key) | Yes | Yes | JSON → non-geo space-weather events | No | Short-lived alerts | **Yes** as official NOAA product | Complements existing SWPC RSS in weather-rss |
| **Additional official RSS** | `feed-registry.js` | **allowlist** | Metadata-only discovery leads | Yes | RSS/Atom title+link+excerpt | Original article bodies **not** stored | Feed TTL / existing RSS policy | **No** until independent corroboration | See registry entries below |
| **UCDP GED** | none (docs only) | **prepared / not enabled** | No | — | — | Prefer download + human review | Research bulk | Future historical conflict context only | Free research access with registration; delayed data; **not** real-time control |
| **Cloudflare Radar** | registry boundary only | **disabled** | No until token | — | — | Trends only | — | No | Still `authenticated-api-boundary` |
| **HDX / humanitarian bulk** | none | **planned** | Per-dataset license | — | — | Often link/cache-static | — | Case-by-case | Do not bulk-ingest without license check |

## RSS allowlist additions (Phase 7)

All remain **metadata-only** (`discovery-lead` / publication policy). No full article republication.

| Feed id | Publisher | Domain | Rationale | URL check 2026-08-01 |
|---------|-----------|--------|-----------|----------------------|
| `noaa-news` | NOAA | natural-disaster | Official climate/weather agency news | 200 |
| `ecb-press` | ECB | finance | Official central-bank press | 200 |
| `cdc-newsroom` | CDC | health | Official public-health newsroom | 200 |
| `who-news-english` | WHO | health | Official health news | 200 |
| `unocha-news` | UN OCHA | humanitarian | Official humanitarian coordination news | 200 |
| `reliefweb-updates` | ReliefWeb | humanitarian | Headlines only; full reports stay behind ReliefWeb API appname path | 200 |
| `iaea-news` | IAEA | conflict-security | Nuclear safety / safeguards public news (not targeting) | 200 |
| `noaa-nhc-pacific` | NOAA NHC | weather | Pacific tropical weather outlook | 200 |
| `nasa-earth-observatory` | NASA EO | positive-development | Science imagery / Earth observation stories | 200 |
| FEMA / USGS news RSS | — | — | **Not added** — FEMA 403 / USGS 404 at review time | failed |
| `bbc-world` / Reuters / social | — | — | **Hard no** — prefer primary official sources; third-party news stays GDELT opt-in | n/a |

## Hard no (unchanged)

- TikTok / Instagram / private account scraping  
- Anti-bot evasion  
- Full article body republication  
- Social volume as verification  
- Paid sources without explicit approval  
- ACLED default enable without license  

## Environment variables

| Variable | Provider | Required to go live |
|----------|----------|---------------------|
| `NASA_FIRMS_MAP_KEY` | nasa-firms | Yes |
| (none) | noaa-swpc | No |
| Existing RSS flags | `WEATHER_RSS_ENABLED`, etc. | As before |

## Public map bar interaction

FIRMS thermal anomalies and SWPC alerts still pass through existing quality / map-display rules (#56). Change badges never promote items onto the public map (#59).

## Explicit non-goals this phase

- Territorial-control geometry (#60 research only next)  
- Correlation / evidence / claim domain rewrite  
- Production deploy  
