# Provider Source Plan

Live Map keeps provider status in code at `src/data/providers/source-registry.js`. A source is not marked live until its adapter exists, is tested, and appears in provider-health diagnostics.

## Live Providers

- USGS Earthquake Hazards Program: global earthquake feed.
- NASA EONET: global open natural-hazard events.
- NOAA/NWS Active Alerts: United States weather alerts from `https://api.weather.gov/alerts/active`.

## Planned Provider Order

1. NOAA/NWS weather alerts
2. GDACS disaster alerts
3. ReliefWeb humanitarian events
4. GDELT major-news discovery
5. CISA and NVD technology/cyber events
6. SEC EDGAR finance events
7. EIA commodity events
8. ACLED conflict events
9. Aircraft tracking
10. Maritime tracking

## Domain Notes

- Weather: NWS is live for U.S. active alerts. NHC, SPC, SWPC, MeteoAlarm, ECCC, Australia BOM, and national meteorological agencies are planned.
- Natural disasters: USGS and EONET are live. GDACS, FIRMS, NOAA tsunami alerts, and Copernicus EMS are planned.
- Humanitarian: ReliefWeb V2 is planned and requires a pre-approved `appname`. UN OCHA HDX, UNHCR, WHO, UNICEF, and IFRC are planned.
- Technology and cyber: NVD, CISA KEV, CISA advisories, GitHub Status, Cloudflare Status/Radar, AWS, Azure, Google Cloud, RIPEstat, and IODA are planned. CVEs are not mapped as geographic incidents by default.
- Finance and markets: SEC EDGAR, central-bank releases, FRED, World Bank, IMF, official exchange notices, and licensed market-price adapters are planned. SEC EDGAR is a primary filings source, not a stock-price feed.
- Commodities and supply chain: EIA, USDA, FAOSTAT, World Bank commodity data, USGS minerals, official port authority alerts, and operator notices are planned.
- Major news: GDELT is discovery-only and remains single-source/unverified until corroborated.
- Conflicts and security: ACLED, UCDP, GDELT discovery, official government/UN statements, CrisisWatch, GeoConfirmed where terms permit, and maritime security advisories are planned. Restricted sites should not be scraped.
- Aviation: OpenSky is the first planned prototype. Use viewport queries only and review coverage, authentication, quotas, and permitted use.
- Maritime: Global Fishing Watch, AISHub, and licensed AIS providers are planned. Do not scrape MarineTraffic, VesselFinder, or similar commercial sites.
- Infrastructure: separate static assets from verified active outages.
- Positive developments: require measurable positive outcomes from primary institutional sources, not sentiment.

## Durable Provider Cache

`src/data/providers/cache.js` defines the provider-cache interface:

```js
{
  get(providerId),
  set(providerId, payload, metadata),
  delete(providerId)
}
```

The default implementation is in-memory for local tests and zero-cost operation. Netlify Blobs can be enabled by setting:

```text
NETLIFY_BLOBS_PROVIDER_CACHE=true
```

The cache stores normalized accepted events and metadata only. It must not store secrets or unnecessary raw provider payloads.

