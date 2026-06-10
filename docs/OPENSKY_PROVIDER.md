# OpenSky Provider

OpenSky is the first aviation tracking boundary.

Environment variables:

```text
OPENSKY_ENABLED=
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
```

The implementation uses server-side OAuth2 client credentials and the `/states/all` state-vector endpoint with viewport bounding boxes only.

Rules:

- Never poll globally.
- Never expose client secrets to the browser.
- Require a viewport bounding box.
- Cache by rounded viewport.
- Start with 15-30 second refresh guidance.
- Treat coverage as receiver-dependent and incomplete.
- Do not show aircraft owner identity.
- Do not imply destination unless a permitted source provides it.

Without credentials, OpenSky returns `configuration-required`.
