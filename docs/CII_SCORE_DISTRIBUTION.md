# CII Score Distribution

CII v2 should avoid a dashboard where many countries sit at 98-100 from duplicate high-severity reports.

The scorer uses logarithmic saturation, event decay, conservative incident deduplication, verification weights, source-tier weights, and separate provider coverage penalties. A critical score should require multiple serious, fresh, credible signals rather than one repeated feed item.

Distribution warnings are produced when the score set appears unhealthy, such as too many countries above 90 or a large cluster at the maximum score. These warnings are returned by `/api/country-risk` for diagnostics and review.

Expected behavior:

- Empty or stale data produces lower confidence and limitations.
- One severe event can raise a country, but should not automatically pin it at 99.
- Corroborated, fresh, multi-domain incidents should score higher than weak discovery leads.
- Retractions and corrected records should reduce pressure.
