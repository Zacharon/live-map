# Strategic Data Source Roadmap

Strategic chokepoints v1 uses existing event providers only. It does not activate maritime, conflict, sanctions, commercial shipping, port, or military data feeds.

| Priority | Candidate | Status | Reason for boundary |
| --- | --- | --- | --- |
| 1 | Existing USGS, NASA EONET, NOAA/NWS, GDACS | Existing runtime providers | Natural-hazard and weather context through the current orchestrator. |
| 2 | Official canal, port, and maritime authority notices | Research required | Terms, scope, refresh, attribution, and reliable public endpoints need review. |
| 3 | ReliefWeb and official humanitarian feeds | Configuration-required / planned | Keep credentials and publication policy server-side; do not imply live coverage. |
| 4 | AIS or vessel-position providers | Configuration-required | Viewport limited, server cached, capped, privacy-respecting, and never global polling. |
| 5 | Licensed conflict, shipping, and market intelligence | Planned | Requires contractual permission, attribution, cache/retention policy, and dedicated adapters. |

Any future provider must meet the source registry contract before it is labeled live: terms review, attribution, implementation state, verification, cache/retention guidance, provider health, and public limitations.
