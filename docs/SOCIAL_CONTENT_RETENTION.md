# Social Content Retention

The system stores only short metadata necessary for provenance and clustering: title, a capped excerpt, canonical link, timing, source organization, source tier, and optional aggregate engagement. `rawRetention` is always `none`.

Do not retain full posts, comments, private account data, direct messages, stream/chat content, transcripts, or raw provider payloads. Removal and retention handling must follow provider terms before a persistent storage backend is introduced.
