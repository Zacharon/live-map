# EIA Provider

EIA uses the official API:

- `https://www.eia.gov/opendata/`
- `https://www.eia.gov/opendata/documentation.php`
- `https://api.eia.gov/v2/`

The adapter is `configuration-required` until `EIA_API_KEY` is configured. It uses a controlled dataset allowlist for crude oil inventories, natural-gas storage, refinery utilization, and electricity observations.

EIA records are observations by default. Commodity events are generated only when configured threshold rules identify meaningful changes. Event language must avoid claiming market causality.
