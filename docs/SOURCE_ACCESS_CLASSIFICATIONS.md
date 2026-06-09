# Source Access Classifications

Live Map uses these access classifications:

- `open-api`: documented API that can be used after terms review.
- `public-rss`: public feed suitable for server-side polling after review.
- `open-bulk-data`: downloadable dataset or structured file.
- `static-geospatial`: map/reference layer that changes slowly.
- `registration-required`: account required before use.
- `credential-required`: API key, token, email, or private credential required.
- `commercial-license`: paid or licensed access required.
- `link-only`: useful in Source Explorer, not automated ingestion.
- `prohibited-or-unclear`: disabled unless legal and technical review explicitly approves use.

Implementation status is separate from access. A source can be open but still `planned`, or credentialed and `authentication-required`.

