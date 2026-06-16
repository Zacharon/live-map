# Free/Public OSINT Source Backlog

This backlog is for future Live Map source work. It is not a provider implementation list. Each source must be rechecked before integration for current terms, licensing, attribution, commercial-use limits, rate limits, and required contact/user-agent behavior.

Default rule: prefer official APIs, RSS/Atom feeds, static downloads, GeoJSON, CSV, KML, or documented bulk datasets. Do not scrape by default. Scraping is only acceptable after an explicit terms and robots review, gentle request limits, caching, attribution, and a clear reason that no official feed exists.

Risk levels:

- Green: public or open documented access appears suitable for default open-source integration after normal terms review.
- Yellow: useful, but needs an API key, stricter attribution, rate care, non-commercial review, or narrower default enablement.
- Red: do not enable by default; licensing, commercial terms, scraping risk, sensitivity, or operational risk is too high for the core app.

## Green And Yellow Candidates

| Source | Domain | Official URL | Access | License/terms summary | Attribution | Rate/user-agent needs | Scraping | Default | Priority | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| USGS Earthquake GeoJSON | Earthquakes | https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php | API/GeoJSON | Public USGS feed; verify current USGS data policy before use. | Cite USGS and event URL. | Cache modestly; avoid polling too often. | Disallowed by default; API exists. | Enabled | P0 | Green |
| NASA EONET | Natural events | https://eonet.gsfc.nasa.gov/docs/v3 | API | NASA public API; verify Earthdata/NASA terms for redistribution. | Cite NASA EONET and source links. | Cache; handle downtime. | Disallowed by default; API exists. | Enabled | P0 | Green |
| NOAA/NWS Alerts | Weather alerts | https://www.weather.gov/documentation/services-web-api | API/CAP | Public weather API; not a replacement for official warnings. | Cite NWS/NOAA and alert URL. | Must send descriptive User-Agent/contact. | Disallowed by default; API exists. | Enabled | P0 | Green |
| GDACS | Disasters | https://www.gdacs.org/xml/ | RSS/XML/API | Public disaster feeds; confirm redistribution and attribution details. | Cite GDACS and original report URL. | Cache; tolerate intermittent feed failures. | Disallowed by default; feeds exist. | Enabled | P1 | Green |
| CISA KEV Catalog | Cyber | https://www.cisa.gov/known-exploited-vulnerabilities-catalog | JSON/download | Public U.S. government catalog; verify CISA usage notes. | Cite CISA KEV and CVE links. | Daily-ish refresh is enough. | Disallowed by default; JSON exists. | Enabled | P1 | Green |
| NVD | Cyber vulnerabilities | https://nvd.nist.gov/developers | API | Public API; free key improves limits. | Cite NVD/NIST and CVE. | Respect rate limits; identify client. | Disallowed by default; API exists. | Optional | P2 | Yellow |
| OSV.dev | Package vulnerabilities | https://google.github.io/osv.dev/api/ | API | Open vulnerability API; verify database terms per ecosystem. | Cite OSV and upstream advisory. | Cache query results. | Disallowed by default; API exists. | Optional | P2 | Green |
| GitHub Advisory Database | Security advisories | https://docs.github.com/en/graphql/reference/objects#securityadvisory | API/dataset | Public advisories through GitHub APIs; API auth/rate limits may apply. | Cite GitHub Advisory and source advisory. | Respect GitHub API limits. | Disallowed by default; API exists. | Optional | P2 | Yellow |
| GDELT 2.1 | News discovery | https://www.gdeltproject.org/data.html | API/download | Public event/news metadata; verify terms and avoid treating as confirmed facts. | Cite GDELT and linked article/source. | Cache; cap queries. | Disallowed by default; API/download exists. | Optional | P2 | Yellow |
| ReliefWeb | Humanitarian | https://apidoc.reliefweb.int/ | API | Public API; appname/contact recommended. | Cite ReliefWeb and report source. | Include appname/contact when configured. | Disallowed by default; API exists. | Optional | P2 | Yellow |
| SEC EDGAR Submissions | Companies/filings | https://www.sec.gov/search-filings/edgar-application-programming-interfaces | API | Public filings; SEC fair-access rules apply. | Cite SEC EDGAR and filing accession. | Must identify with contact and throttle. | Disallowed by default; API exists. | Optional | P2 | Yellow |
| FRED | Economics | https://fred.stlouisfed.org/docs/api/fred/ | API | Free API key required; terms must be reviewed. | Cite FRED/St. Louis Fed and series. | API key; cache time series. | Disallowed by default; API exists. | Optional | P3 | Yellow |
| EIA Open Data | Energy | https://www.eia.gov/opendata/ | API | Free API key required; verify EIA terms. | Cite EIA and series. | API key; cache. | Disallowed by default; API exists. | Optional | P3 | Yellow |
| World Bank API | Economics/countries | https://datahelpdesk.worldbank.org/knowledgebase/topics/125589-developer-information | API | Public development indicators; verify dataset license. | Cite World Bank indicator. | Cache; no rapid polling needed. | Disallowed by default; API exists. | Optional | P3 | Green |
| IMF Data API | Economics | https://data.imf.org/en/Resource-Pages/IMF-API | API | Public data API; verify terms by dataset. | Cite IMF dataset and series. | Cache; respect service limits. | Disallowed by default; API exists. | Optional | P3 | Yellow |
| OECD Data Explorer/API | Economics | https://data-explorer.oecd.org/ | API/download | Public OECD data; verify per-dataset terms. | Cite OECD dataset. | Cache. | Disallowed by default; API/download exists. | Optional | P3 | Yellow |
| U.S. Census API | Demographics | https://www.census.gov/data/developers.html | API | Public U.S. data; key may improve access. | Cite Census dataset/table. | Cache; respect API limits. | Disallowed by default; API exists. | Optional | P3 | Green |
| Wikidata | Entities/geography | https://www.wikidata.org/wiki/Wikidata:Data_access | API/SPARQL | Open data with CC0 core; query service has usage policies. | Cite Wikidata item and source where possible. | User-Agent; avoid heavy SPARQL. | Disallowed by default; API exists. | Optional | P3 | Green |
| Wikipedia API | Context articles | https://www.mediawiki.org/wiki/API:Etiquette | API | Free content, but content license/attribution applies. | Cite page and license. | User-Agent; cache; no heavy scraping. | Disallowed by default; API exists. | Optional | P3 | Yellow |
| Natural Earth | Base geography | https://www.naturalearthdata.com/downloads/ | Download | Public domain-style open map data; verify current terms. | Cite Natural Earth. | Static bundled/downloaded data. | Disallowed by default; downloads exist. | Optional | P2 | Green |
| geoBoundaries | Boundaries | https://www.geoboundaries.org/ | Download/API | Open boundaries with license attribution; verify version/license. | Cite geoBoundaries and release. | Static download; no hot polling. | Disallowed by default; downloads exist. | Optional | P3 | Green |
| OpenStreetMap Overpass | Places/infrastructure | https://wiki.openstreetmap.org/wiki/Overpass_API | API | ODbL attribution; public Overpass services have strict usage expectations. | Cite OpenStreetMap contributors. | Strong cache; low query volume; user-agent. | Disallowed by default; use API carefully. | Optional | P4 | Yellow |
| OpenAQ | Air quality | https://docs.openaq.org/ | API | Public air-quality API; verify terms and attribution. | Cite OpenAQ and station/source. | Cache; respect API limits. | Optional only if API terms allow. | Optional | P3 | Yellow |
| AirNow | Air quality | https://docs.airnowapi.org/ | API | API key required; terms review needed. | Cite AirNow/EPA and station/feed. | API key; cache. | Disallowed by default; API exists. | Disabled | P4 | Yellow |
| USGS Water Services | Flooding/water | https://waterservices.usgs.gov/ | API | Public USGS water data; verify site usage policy. | Cite USGS site/gauge. | Cache; avoid excessive polling. | Disallowed by default; API exists. | Optional | P3 | Green |
| IRIS/FDSN | Seismic | https://service.iris.edu/ | API | Public seismology web services; verify service terms. | Cite IRIS and network/station. | Cache; respect service limits. | Disallowed by default; API exists. | Optional | P4 | Green |
| NOAA National Hurricane Center | Hurricanes | https://www.nhc.noaa.gov/gis/ | RSS/KML/GIS | Public NOAA products; official sources remain authoritative. | Cite NOAA/NHC product. | Cache; user-agent recommended. | Disallowed by default; feeds/downloads exist. | Optional | P2 | Green |
| NOAA Storm Prediction Center | Severe weather | https://www.spc.noaa.gov/products/ | RSS/download/pages | Public NOAA products; prefer feed/download endpoints where available. | Cite NOAA/SPC product. | Cache; user-agent recommended. | Unknown; do not scrape by default. | Optional | P3 | Yellow |
| NOAA SWPC | Space weather | https://services.swpc.noaa.gov/ | JSON/feed | Public NOAA space-weather data. | Cite NOAA/SWPC product. | Cache; user-agent recommended. | Disallowed by default; feeds exist. | Optional | P3 | Green |
| NOAA Tides and Currents | Maritime/weather | https://api.tidesandcurrents.noaa.gov/api/prod/ | API | Public NOAA API; verify product terms. | Cite NOAA station/product. | Cache; user-agent recommended. | Disallowed by default; API exists. | Optional | P4 | Green |
| NASA FIRMS | Fires | https://firms.modaps.eosdis.nasa.gov/api/ | API/download | Free access may require MAP_KEY; review terms and attribution. | Cite NASA FIRMS/MODIS/VIIRS. | Key; cache; avoid hot polling. | Disallowed by default; API exists. | Disabled until reviewed | P2 | Yellow |
| Statuspage Public Feeds | Infrastructure outages | https://support.atlassian.com/statuspage/docs/enable-rss-feeds-for-incidents/ | RSS/API where published | Public incident feeds vary by company; only use official published feeds. | Cite provider status page. | Cache; respect feed TTL. | Disallowed by default; RSS/API exists. | Optional allowlist | P2 | Yellow |
| RIPEstat | Internet routing | https://stat.ripe.net/docs/data-api/ | API | Public RIPE NCC API; sourceapp should identify client. | Cite RIPEstat and queried resource. | Include sourceapp; cache. | Disallowed by default; API exists. | Optional | P3 | Green |
| Cloudflare Radar | Internet trends | https://developers.cloudflare.com/radar/ | API | Token and terms review required. | Cite Cloudflare Radar. | API token; cache. | Disallowed by default; API exists. | Disabled | P4 | Yellow |
| Cybersecurity advisory RSS | Cyber advisories | Varies by official agency/vendor | RSS/Atom | Only official advisories or explicitly licensed feeds. | Cite publisher and advisory URL. | Respect feed TTL; allowlist only. | Unknown; do not scrape by default. | Optional allowlist | P2 | Yellow |
| NOAA Climate/Weather CSV Feeds | Climate/weather | https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation | API/download | Public NOAA climate data; verify dataset terms. | Cite NOAA/NCEI dataset. | Cache; no hot polling. | Disallowed by default; API/download exists. | Optional | P4 | Green |

## Do Not Use By Default

| Source | Reason | Allowed path later |
| --- | --- | --- |
| ADS-B Exchange | Commercial/licensed aircraft data; do not scrape. | Only with explicit license and server-side integration. |
| Broad ADS-B/aircraft feeds | License and privacy constraints vary widely. | Only after terms review, bbox limits, caps, and attribution. |
| Commercial maritime AIS feeds | Often paid/licensed and redistribution-limited. | Only with explicit license and server-side caching. |
| Telegram channels | Platform terms, safety, privacy, and verification risk. | Avoid until legal/safety methodology exists. |
| X/Twitter scraping | Terms and anti-scraping risk. | Avoid unless official API terms and budget are approved. |
| ACLED | Valuable conflict data but not free unrestricted default data. | Link/document only unless license explicitly allows project use. |
| GADM | Often unsuitable for unrestricted commercial/open default use. | Prefer Natural Earth or geoBoundaries. |
| OpenStreetMap map tiles | Tile scraping/bulk download violates usage expectations. | Use attributed data extracts or careful Overpass queries instead. |
| Dark web monitoring | High legal/safety risk and likely paid tooling. | Out of scope for default open-source app. |
| Sanctions/compliance commercial datasets | Licensing and legal sensitivity. | Use only official government downloads if added later. |

## Integration Gate

Before any source moves from backlog to implementation:

1. Link the official API/feed/download documentation.
2. Link the terms/license page reviewed for the integration.
3. Record attribution requirements in the source registry.
4. Record rate limits, user-agent/contact requirements, and cache policy.
5. Prove the source can fail without breaking `/api/events`.
6. Add provider-health status for live, degraded, disabled, and configuration-required states.
7. Keep credentials server-side and disabled by default unless the core app can run without them.
