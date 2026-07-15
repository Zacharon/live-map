# Feed Ingestion and SSRF Safety

The generic feed adapter accepts RSS, Atom, and JSON Feed documents from the allowlisted registry only. It validates initial URLs and redirects through the existing SSRF guard, permits only HTTPS fetches, limits redirects, applies timeouts, and bounds retained feed text.

Feed entries are normalized into metadata-only observations and discovery leads. The implementation never accepts arbitrary browser-supplied feed URLs and does not fetch article pages.
