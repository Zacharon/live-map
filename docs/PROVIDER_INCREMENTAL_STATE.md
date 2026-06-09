# Provider Incremental State

Phase 2B adds `src/data/providers/provider-state.js`.

Providers can remember:

- last successfully processed filing
- last accession number
- last observation date
- last observation value
- last revision timestamp
- last dataset update
- processed record IDs

The default implementation is in-memory for tests and local cold starts. A durable implementation can replace it later, for example through Netlify Blobs, as long as secrets and raw unnecessary payloads are not stored.

Providers should use incremental state to avoid duplicate events after restart and to distinguish unchanged observations from new or revised records.
