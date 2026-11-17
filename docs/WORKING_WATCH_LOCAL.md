# Working Watch local candidate — 2026-10-02

Open the running bounded local preview at http://127.0.0.1:8784/?view=feed&hours=24&sort=newest-occurred&mapMode=3d&basemap=local-earth . This is an isolated candidate, not the installed canonical product or a hosted release. If stopped, run `npm run preview:public -- 8784` in this candidate. Replay without upstream requests: `npm run preview:public -- 8783 --cache-only`.

Use Reports to find a dated earthquake or regional cyclone advisory, filter by source/place, open its native inspector, inspect measurements, source links, separate occurrence/revision/retrieval clocks and coverage, then use Back to return to the same row. The global search selects the same inspector and globe record. Mobile opens Reports directly; the globe remains a real Cesium viewer with local earth imagery.

Track changes establishes a baseline for **all loaded reports**, including reports outside the current source/place filters. New and Revised compare semantic evidence with that baseline. A retrieval alone is not a revision. Mark loaded read replaces the full baseline. An older baseline format must be restarted; blocked storage is disclosed. Refresh retains the original evidence clocks on cache/source failure, and overlapping responses cannot replace a newer successful request.

Only these two existing public normalizers are selected for the development reader:

| Source | Actual endpoint | Coverage and limits |
|---|---|---|
| USGS | https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson | Reported magnitude 2.5+ earthquakes in the past day. Worldwide reporting is incomplete. Source generation and local retrieval clocks remain independent; a source clock ahead of retrieval makes freshness uncertain. |
| NOAA NHC/CPHC | https://www.nhc.noaa.gov/CurrentStorms.json | Issued Atlantic/eastern/central North Pacific cyclone advisories, not global cyclone coverage. Advisory positions are not interpolated live tracks. Excluded identity/coordinate/future-advisory records are counted and do not establish an empty feed. |

The normalized saved reads and API envelope are in `evidence/public-preview-cache.json` and `evidence/real-public-envelope.json`. They record actual URLs, retrieval times, source generation when supplied, counts and coverage. A provider count before time filtering can exceed loaded 24-hour records. The current read is an observation, not a permanent claim about cyclone absence or present safety. No user-supplied September LNG estimates or corporate relationships were fabricated. Existing historical evidence and synthetic maritime demonstrations retain their own explicit labels.

The loopback server reads no credentials or production activation flags. Each source has a 10-second timeout, 2 MiB response cap, schema/record cap, five-minute reuse/backoff, concurrent request coalescing and maximum four upstream reads per server session. GET requests trigger reads; there is no collector schedule. The replay mode never requests upstream data. Other API modules explicitly report unavailable. The cache is a development file, not durable hosted ingestion. Cost budget: zero paid API dollars.

The existing Evidence ledger, case selection/export and four independent maritime assessments remain reachable. AIS visibility, dark-traffic inference, cargo-confirmed flow/published estimates, and security retain separate evidence and unknown states; diplomacy remains contextual. Corporate/institutional evidence is included only when present in the existing schemas and sourced records.

Verification artifacts: `evidence/working-watch-browser/working-watch-results.json`, desktop/mobile screenshots, focused test output, and independent `review/WORKING_WATCH_H3_REVIEW.md` in the workspace. Test fixtures are confined to unit/failure probes; the user preview uses actual public reads. No auth/security testing, commit, push, merge, provider activation or deployment was performed.

Integration requires the owner to accept the concrete cumulative patch after comparing canonical hashes. The earlier 16-path and 41-path candidates and Library packages remain immutable. See WORKING_WATCH_HOSTED_PLAN.md for the existing-host preview plan and remaining release conditions.
