# Country Scores Page

The `/countries` page lists country-level CII v2 scores and keeps filters in the URL.

Controls include:

- Search by country.
- Sort by score, country, confidence, completeness, freshness, and trend.
- Filter by region, level, confidence, and completeness.
- Select a country for detail.

Each country detail view links back to the map with `?country=ISO3` and to the CII v2 methodology.

The page consumes `/api/country-risk`. It does not fetch private provider credentials in browser code.
