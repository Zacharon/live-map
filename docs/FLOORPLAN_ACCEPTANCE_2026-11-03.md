# Public Floorplan acceptance — November 3, 2026

Reviewed PR #103 at `abb2bde5b96c8833501bdbc9226da2868131c37d`, based on public source `a0783fc54f3ae1897712ec04666d0f895d9b6c2c`.

## Verified original export

- The README gallery URL responds HTTP 200 and opens the intended map in a desktop browser. Its HTML is byte-identical to PR #103 (`d6d05014b94c5696a145ce1436fb649ba0cd77c5cf4f90ab1b290649a6dbad35`, 2,230,067 bytes).
- The Netlify PR #103 preview at `/docs/floorplan.html` renders the interactive map. GitHub's blob viewer reports the document is too large to show and offers raw download; it does not execute the map.
- All 124 selected paths exist at the pinned revision. All 117 stored SHA-1 prefixes match source bytes. All 124 nonblank line counts match. All 247 import edges are supported by static or dynamic relative imports in that source. This verifies displayed edges, not completeness of extraction.
- Browser checks passed: desktop overview, search by name and exact path, empty search result, Enter selection, folder breadcrumbs, provider dependency navigation, zoom-in, fit and panning. The Flows menu correctly says no flows in this copy.
- Coverage is 4 top-level groups: entry (4), docs (5), Cloudflare Pages functions (1), src (114). No routes or guided flows are indexed. Netlify functions, the Worker entry point, many app files, tests and operational deployment wiring are outside this selected map. Provider-file presence is not proof of provider activation.
- Graph metadata has no local root or repository working-directory metadata. Scans of the exported graph found no credential patterns, private filesystem paths or email addresses. It includes only public file metadata, symbol descriptions and relationships, not a private checkout. There are no external script tags. These findings are a bounded privacy check, not a security audit of upstream Floorplan.
- Security, Validate and Cloudflare Validation completed successfully for the original PR head. They are supporting evidence, not browser acceptance.

## Corrections

The unqualified `0 endpoints` statistic was misleading for the selected Pages API handler because route indexing did not run. Counters now say `indexed endpoints`, and the map summary and README explicitly explain that zero indexed endpoints does not mean the application has no APIs.

File details now offer `View pinned source`, pointing to the selected public file at the full source revision. This makes references usable without a local editor or clipboard. Public source links use a fixed GitHub repository and revision, encode path segments, and open with `noopener noreferrer`. Existing local-editor handling remains available for local maps.

The README explains that GitHub offers the standalone export as a download and that it should be opened locally. The corrected export must also reach the profile gallery through its own PR; the Live Map PR alone cannot update a separate repository.

## Remaining acceptance and publication requirements

- Recheck the corrected hosted preview, including pinned-source navigation and endpoint wording. Record actual results in the review report; do not infer them from syntax checks.
- Mobile widths, touch/pinch, device rotation, screen readers, full keyboard accessibility and multiple browser engines have not been tested. The stylesheet contains responsive breakpoints and a bottom-sheet inspector, but source inspection is not responsive-browser evidence.
- This browser blocks local `file:` navigation, so executing a downloaded standalone export is NOT RUN. Public HTTPS preview acceptance is separate.
- Keep both repositories' HTML byte-identical, update the gallery export checksum and provenance, require checks for the corrected heads, and obtain owner approval before merging either PR. Do not manually deploy.
- After approved integration, verify the README destination and served gallery bytes again. Regenerate deliberately when source changes; this is a dated snapshot, not a live architectural inventory.
