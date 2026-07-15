# Source Observation Model

An observation is a metadata-only source record: stable ID, provider, source organization, canonical HTTPS URL, title, bounded excerpt, language, observed and ingested timestamps, source tier, verification state, and optional bounded engagement metadata. Raw provider payloads, full text, transcripts, comments, profile histories, and private identifiers are not retained.

URLs drop fragments and tracking parameters before identity or clustering. Validation rejects non-HTTPS canonical links and overlong excerpts. Observation records are not geographic events and do not create map markers by themselves.
