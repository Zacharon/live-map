# SEC EDGAR Provider

SEC EDGAR uses official SEC filing metadata endpoints:

- `https://data.sec.gov/submissions/CIK##########.json`
- `https://www.sec.gov/search-filings/edgar-application-programming-interfaces`
- `https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data`

The adapter is `configuration-required` until `SEC_CONTACT_EMAIL` is configured. SEC requests must be server-side only and use a descriptive User-Agent. The app uses a controlled `SEC_CIKS` allowlist and conservative polling; it does not query the whole filing firehose.

Normalized records preserve accession number, form, filing date, report date, CIK, company name, filing URL, and primary-document URL. SEC filings are non-geographic unless the filing itself supports a real event location.
