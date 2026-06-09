# NVD Provider

NVD enrichment uses CVE API 2.0:

`https://services.nvd.nist.gov/rest/json/cves/2.0`

`NVD_API_KEY` is optional but raises rate limits. Public unauthenticated use is limited to 5 requests per rolling 30 seconds; API-key use is limited to 50 requests per rolling 30 seconds.

Live Map uses focused CVE-ID and incremental modification-window enrichment. It does not bulk-download every CVE, does not create map markers without supported geography, and does not retrieve exploit code.
