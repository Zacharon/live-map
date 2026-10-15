# Development Fixtures

This directory is reserved for non-live, clearly labeled fixtures.

Fixtures must never contain secrets, real credentials, raw passwords, private personal data, or data that is presented as live provider output.

Synthetic and compact-field samples for local preview. They are not live intelligence.

| File | Kind |
| --- | --- |
| `gfs-10m-recorded-sample.json` | Compact 10 m U/V decoder fixture. Not a live NOMADS pull. Separate from synthetic wind. |
| `shipping-density-sample.json` | Overlay *format* sample. Not World Bank measured cells. Period remains 2015-01–2021-02. |
| `portwatch-chokepoint6-sample.json` | Dated activity *schema* sample. Not PortWatch measurements. |
| `portwatch-hormuz-2025-01-extract.json` | Frozen public ArcGIS extract for Strait of Hormuz, 2025-01-01..07. Historical. Not live. |
| `portwatch-hormuz-2025-01-provenance.json` | Capture provenance for that extract. |

Keep these caches separate from any future live/recorded provider cache.
