# Moving Object Performance

Moving-object rendering must remain viewport-limited.

Performance rules:

- Reject global unbounded API requests.
- Cap responses at 500 by default and 1,000 maximum.
- Update objects by stable ID where possible.
- Remove stale objects incrementally.
- Hide or cluster at low zoom.
- Disable trails by default.
- Reduce polling in background tabs with Page Visibility API.

Initial local tests cover schema, caps, truncation, and stale cleanup boundaries. Browser render measurements should be repeated before enabling any high-volume live provider.
