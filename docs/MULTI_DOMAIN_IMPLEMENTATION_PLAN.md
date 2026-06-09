# Multi-Domain Implementation Plan

Live Map expands providers in phases so the interface, source health, rate limits, licensing, and privacy controls stay understandable.

## Phase 2A - Humanitarian And Cyber

| Provider | Endpoint | Access | Env vars | Cache | Domain | Volume | Privacy risk | Acceptance |
|---|---|---|---|---|---|---|---|---|
| ReliefWeb | `https://api.reliefweb.int/v2/reports`, `/disasters` | Pre-approved appname required; 1000 calls/day; 1000 entries/request | `RELIEFWEB_APPNAME` | 15-20 min | Humanitarian | 100-250 recent records | Sensitive locations, original-source copyright | Configuration-required without appname; metadata/excerpts only; country-centroid or suppressed coordinates |
| CISA KEV | `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | Public official JSON | none | 60 min | Technology & Cyber | ~1600 records, capped in feed | No geography; exploit detail risk | Non-geographic KEV feed, no exploit instructions, source health |
| NVD | `https://services.nvd.nist.gov/rest/json/cves/2.0` | Public API; API key optional; 5/30s unauthenticated, 50/30s with key | `NVD_API_KEY` | 2 hours | Technology & Cyber | Focused CVE enrichment only | No geography; reference links | Focused enrichment helpers; no bulk downloads |
| SEC EDGAR | `https://data.sec.gov/submissions/CIK##########.json` | Public official API with fair-access/User-Agent rules | `SEC_CONTACT_EMAIL`, optional `SEC_CIKS` | 5 min active windows | Finance & Markets | Controlled CIK allowlist | Non-geographic filings | Material filing classification; no stock prices |
| FRED | `https://api.stlouisfed.org/fred/series/observations` | Official API key | `FRED_API_KEY` | 30-60 min near releases | Finance & Markets | Allowlisted series | Observation/event distinction | Macro threshold/revision signals only |
| EIA | `https://api.eia.gov/v2/` | Official API key | `EIA_API_KEY` | Hourly or dataset-specific | Commodities & Supply Chain | Allowlisted datasets | Observation/event distinction | Energy thresholds only; no causality claims |

## Phase 2B - Finance And Commodities

SEC EDGAR, FRED, EIA, USDA, and World Bank remain planned. Use official endpoints, identify apps with required user agents/API keys, cache 15 minutes to daily depending on source, map to Finance & Markets or Commodities & Supply Chain, and avoid live price claims without licensed price providers.

## Phase 2C - Major News And Internet Infrastructure

GDELT, official RSS registry, RIPEstat, IODA, Cloudflare Radar, and service-status feeds remain planned. GDELT is discovery-only until corroboration rules exist. Infrastructure signals should not become incidents without source context.

## Phase 2D - Conflicts And Security

ACLED, UCDP, CrisisWatch, and official government/UN sources require licensing and attribution review. Acceptance requires credentials, redistribution rights, conflict taxonomy, and no unsafe precision.

## Phase 2E - Positive Developments

Our World in Data, WHO, UNICEF, UN SDG indicators, ReliefWeb recovery reports, IRENA, conservation, and science sources must show measurable outcomes before mapping to Positive Developments.

## Phase 3A - Aviation

OpenSky is the first prototype. ADSB.lol, Airplanes.live, and licensed ADS-B adapters need terms review, viewport limits, privacy controls, and no broad continuous global polling.

## Phase 3B - Maritime

Global Fishing Watch, AISHub, and licensed AIS adapters require access review, attribution, caching boundaries, and no scraping of commercial websites.

## Phase 4 - AI, Alerts, And Investigations

AI briefs, user accounts, alerts, entity graph, cases, and compliance audit trails require citation enforcement, audit logs, permissions, and privacy review before release.

## Phase 2D Operating Rules

- Keep detailed provider diagnostics out of the public map dashboard.
- Keep provider groups independently controlled so one experimental domain cannot silently activate another.
- Do not label configuration-required providers as live.
- Do not invent coordinates for non-geographic records.
- Keep source attribution, source status, and freshness visible.

After country navigation and CII v2 are stable, add providers in this order: NOAA/NWS and GDACS improvements, ReliefWeb, GDELT, CISA/NVD, SEC EDGAR, EIA, ACLED, aircraft tracking, and maritime tracking.
