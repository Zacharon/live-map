# Competitive Product Audit v1

Review date: 2026-07-15. This is a product-pattern audit, not a claim that these products provide identical coverage.

| Product | Primary job / audience | Notable interaction and hierarchy | Freshness, sources, limits, takeaways | Sources |
| --- | --- | --- | --- | --- |
| Zoom Earth | Weather situational awareness for broad public use | Full-screen map, time controls, compact overlays | Time-aware weather imagery; map first, with visible source context. Use spatial context without copying UI. | [Zoom Earth](https://zoom.earth/) |
| DisasterAWARE | Disaster monitoring for public-sector and response audiences | Alert map, event briefs, risk context | Event impact context matters; preserve uncertainty and do not frame this app as response guidance. | [DisasterAWARE](https://disasteraware.org/about/) |
| GDACS | Global disaster alerts for responders and analysts | Alert emphasis and event filtering | Clear alert escalation and explicit sources are useful; existing GDACS adapter remains the only disaster feed used here. | [GDACS](https://www.gdacs.org/) |
| NASA FIRMS | Fire detection and analysis | Dense map controls and data-oriented layers | Layer context is valuable, but raw detections need clear timing and limitations. | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/map/) |
| USGS Latest Earthquakes | Earthquake awareness | Fast map/list selection and direct event links | Direct authoritative sources and timestamps support trust. | [USGS](https://earthquake.usgs.gov/earthquakes/map/) |
| MarineTraffic | Commercial vessel awareness | Vessel-first map, history and tracks | Do not infer cargo, owner, behavior, or complete coverage; no global polling. | [MarineTraffic support](https://support.marinetraffic.com/en/articles/9552727-display-vessel-past-track-on-the-live-map) |
| VesselFinder | Vessel data API consumers | API-oriented vessel lookup | Any future use needs terms, caching, and viewport caps. | [VesselFinder API](https://api.vesselfinder.com/docs/) |
| Global Fishing Watch | Fisheries transparency | Activity visualization and methodology | Privacy and interpretation limits are first-class. Existing adapter remains configuration-required. | [Global Fishing Watch](https://globalfishingwatch.org/our-platform/) |
| Flightradar24 | Flight tracking public users | Dense live-map controls | Moving data needs clear coverage and freshness boundaries. | [Flightradar24](https://www.flightradar24.com/blog/product-features/) |
| Crisis24 | Enterprise risk intelligence | Briefing-led analytical hierarchy | Prioritize conclusion, evidence, and freshness over control volume. | [Crisis24](https://www.crisis24.com/capabilities/intelligence/global-intelligence) |
| ACLED | Conflict-data researchers | Structured methodology before visual narrative | Do not call conflict data live without licensing and methodological review. | [ACLED](https://acleddata.com/) |
| CFR Global Conflict Tracker | Public policy context | Narrative context paired with geography | Separate background context from current events. | [CFR](https://www.cfr.org/global-conflict-tracker) |
| Copernicus EMS | Emergency mapping users | Map products with operational caveats | Generalized chokepoint geometry must remain distinct from authoritative mapping. | [Copernicus EMS](https://emergency.copernicus.eu/mapping) |
| Windy | Weather explorers | Map-first layers and temporal controls | Spatial controls work best when output remains legible. | [Windy](https://www.windy.com/) |
| earth.nullschool | Atmospheric visualization | Minimal immersive globe | A visual layer can be compelling without being an assessment. | [earth.nullschool](https://earth.nullschool.net/about.html) |
| Cloudflare Radar | Internet health analysts | Data views with method notes | Infrastructure observations should not be converted into unsupported incident claims. | [Cloudflare Radar](https://developers.cloudflare.com/radar/) |
| Trading Economics | Economic-calendar users | Calendar and indicator hierarchy | Economic observations must remain observations, not causal market-event claims. | [Trading Economics](https://tradingeconomics.com/calendar) |
| World Bank Indicators | Development-data users | Dataset and metadata orientation | Favor transparent provenance over false real-time framing. | [World Bank API](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392) |
| ReliefWeb | Humanitarian information users | Source-first report aggregation | Respect publication policy and do not mirror full reports. | [ReliefWeb API](https://apidoc.reliefweb.int/endpoints) |
| Liveuamap | Public conflict-map audience | Fast map-centric updates | Speed requires visible verification limits and no implied completeness. | [Liveuamap](https://liveuamap.com/) |

Shared lesson: give an analyst a compact conclusion and evidence trail, then let the map provide context. This v1 keeps that pattern while retaining source status, freshness, non-geographic records, and public-information limitations.
