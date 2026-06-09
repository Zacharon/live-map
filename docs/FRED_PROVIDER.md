# FRED Provider

FRED uses the official St. Louis Fed API:

- `https://fred.stlouisfed.org/docs/api/fred/`
- `https://api.stlouisfed.org/fred/series`
- `https://api.stlouisfed.org/fred/series/observations`

The adapter is `configuration-required` until `FRED_API_KEY` is configured. It uses a controlled allowlist: `FEDFUNDS`, `CPIAUCSL`, `UNRATE`, `PAYEMS`, `GDP`, `DGS2`, `DGS10`, `T10Y2Y`, `DEXUSEU`, `DCOILWTICO`, `DCOILBRENTEU`, and `GASREGW`.

FRED records are observations by default. Events are created only for configured threshold crossings or revisions. The app does not ingest the full FRED catalog.
