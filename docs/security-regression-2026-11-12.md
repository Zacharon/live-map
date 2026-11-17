# RSS redirect and body boundaries: local regression repair, 2026-11-12

Status: local source and mocked behavior checked; independent H3 and hosted
validation NOT RUN. No provider, account, deployment, publication or release
change was made.

## Source and scope

Canonical checkout: `20_Products/Live_Map`, branch
`feature/evidence-semantic-globe`, initial HEAD
`390b9a6b79bc89b03baf03f4fe4b1e02aed29384`, remote
`https://github.com/Zacharon/live-map.git`. Initial dirty status was only untracked
`docs/research/`; it was neither read nor changed. Existing intended files were
byte-snapshotted in the agent session before edits. No branch/worktree operation,
commit, push or install occurred.

The public RSS provider already selects registry-controlled URLs. A provider's
HTTP Location header is lower-trust input: it must not grant network access to
another origin. Previously a mocked redirect to an IPv4-mapped loopback address
was accepted and fetched. This establishes a reachable local guard failure, not
the existence of an exposed deployed private service.

`src/data/providers/ssrf-protection.js` now rejects credentials and all IPv6
literals, and allows a nonempty redirect only if both URLs pass the URL guard
and their normalized origins match. This bounds every hop to the starting
feed's scheme, host and effective port. Relative paths, default-port
normalization and normal same-origin redirects work. Cross-origin feed moves,
including upgrades from HTTP to HTTPS, now fail closed until the registry URL is
reviewed. The current feed registry uses HTTPS DNS names.

The implementation uses portable URL APIs only; no Node DNS import, new runtime,
dependency, endpoint, principal, durable state or API field was introduced.
Browser, Netlify and Worker modules continue using the same provider guard.

## RED and GREEN

Runtime: locally installed Node.js v24.16.0. Working directory for all commands is
the canonical checkout. Mock fixtures use reserved `.test` domains and synthetic
feed text. All fetch calls in the focused regression are replaced with in-memory
Responses, recorded and restored in `finally`; no address is contacted. Broader
checks use the existing offline preload and a child-shell environment allowlist
containing only PATH, Windows/toolchain location and temporary-directory variables;
provider credentials and enable flags are absent. No `.env` values were opened.

Focused command:

```powershell
node --input-type=module -e "await (await import('./tests/rss-redirect-tests.mjs')).runRssRedirectRegressionTests()"
```

- RED, exit 1 before the implementation change: `Missing expected rejection:
  Must reject redirect "https://[::ffff:127.0.0.1]/private"`. The synthetic redirect
  was followed and a valid synthetic event returned. An initial direct-URL check
  also failed on the mapped address; the final regression ordering exercises the
  reachable provider path first.
- GREEN, exit 0 after the guard change: mapped loopback/link-local IPv6, arbitrary
  hostname, sibling hostname, scheme-relative hostname, changed port, downgrade,
  embedded credentials, private IPv4, non-HTTP scheme, malformed and empty
  destinations are refused before a second fetch. A cross-origin second hop is
  refused after the permitted first hop. Direct unsafe origins are also refused.
- GREEN: 301/302/303/307/308 same-origin relative moves, equivalent explicit HTTPS
  default port, normal feed success and the existing three-request redirect-loop
  budget. Undated records keep `sourcePublishedAt: null`.

The suite is registered in `tests/run-tests.mjs`, so the existing platform command
runs it sequentially alongside the prior provider/API checks.

## Follow-on streamed-body RED and GREEN

The owner then authorized closing the identified whole-body-read gap. Existing
bounded implementations were checked first: `public-tracking-fetch.js` is tied
to fixed tracking/JSON hosts and caching, and `src/ingestion/usgs-job.js` is tied to
USGS ingestion/JSON. Neither offers a reusable text reader without importing
unrelated provider/ingestion behavior. RSS now has a small private text reader;
no dependency or new configuration was added. It uses the existing internal
`maxBytes` option and its unchanged 1 MiB default.

```powershell
node --input-type=module -e "await (await import('./tests/rss-redirect-tests.mjs')).runRssBodyRegressionTests()"
```

- RED, exit 1 against the redirect-fixed but body-unfixed source: `Missing expected
  rejection`, expected `Feed response exceeds byte limit`. A genuine in-memory
  ReadableStream exceeded 1 MiB and the old `response.text()` consumed the whole
  stream before returning a truncated string. No network was used.
- GREEN, exit 0 after the reader repair. Declared oversize cancels with zero pulls;
  absent, false-small and invalid Content-Length each cancel at the first over-cap
  chunk, before pulling the remaining synthetic feed. Reader locks are released.
- GREEN: exactly 1 MiB of UTF-8 bytes succeeds, including a multibyte character
  split across chunks; the title remains `Synthetic é🙂 alert` and unknown source
  clocks remain null. Multibyte input exceeding the byte cap is refused even when
  its JS character count is below the cap. Empty streams preserve empty results.

The cap counts bytes supplied by the fetch response stream before each chunk is
decoded or retained. The over-cap chunk itself may already have been allocated by
the runtime; the application does not retain/decode it or request the remainder.
It does not claim to bound an upstream runtime's chunk allocation or decompression
internals. Streaming TextDecoder preserves the previous replacement behavior for
malformed UTF-8 rather than inventing a new encoding policy. Oversized feeds now
fail instead of silently returning a potentially incomplete truncated feed.

## Verification

| Check | Result | Scope |
| --- | --- | --- |
| Focused command above | PASS, exit 0 | Final redirect regression module, no network |
| Follow-on streamed-body command | PASS, exit 0 | Real mocked ReadableStream byte/cancel/UTF-8 tests; also registered in platform suite |
| `node --import ./tests/offline-network.mjs tests/run-tests.mjs` | PASS, exit 0 | Full platform suite including existing unknown-data/API and new RSS cases |
| `npm run check:syntax` | PASS, exit 0 | Existing syntax checks and mocked Cloudflare export check |
| `node scripts/live-map-validator.mjs --security-only --offline` | PASS, exit 0 | Browser secret scan, 336 served source files; values not printed |
| `node scripts/repo-secret-scan.mjs` | PASS, exit 0 | Existing tracked-file scan; values not printed |
| `node scripts/live-map-validator.mjs --offline` | PASS, exit 0 | 10 checks, zero failed; 388 JS files syntax-checked, synthetic provider-unavailable warnings retained, reachability excluded |
| `git diff --check` | PASS, exit 0 | Final patch formatting; repeated after evidence update |
| Production smoke, real DNS/egress/private-service/provider probes | NOT RUN | Outside authorized local mocked scope |
| Independent H3 / owner acceptance / deployed verification | NOT RUN | Separate gates |

## Human and agent capability gates

This is an infrastructure boundary repair within the existing read-only provider
capability. Both human page requests and agent GETs to `/api/events` (or its direct
Netlify alias) still use the same provider implementation, URL validation,
registry and envelopes. No bypassing agent-only fetch adapter was added.

| Gate | Disposition and bounded evidence |
| --- | --- |
| 1 Shared capabilities | PASS at source/offline handler level: shared RSS helper and platform route tests; no separate agent authority |
| 2 Shared state | NOT APPLICABLE to this patch: no new state or user writes; existing provider envelopes unchanged |
| 3 Scoped authority | PASS locally: registry origin authority cannot be extended by Location; negative tests stop before another request |
| 4 Human usability | PARTIAL: valid synthetic feed behavior and unknown clocks pass; actual browser/provider workflow NOT RUN |
| 5 Visible supervision | PARTIAL: existing provider failure/status contract preserved by platform checks; actual operator presentation NOT RUN |
| 6 Safe recovery | PARTIAL: idempotent reads, no user-data mutation, existing timeout/three-request budget preserved; deployed recovery NOT RUN |
| 7 Receipts | NOT APPLICABLE to this infrastructure patch: no new user mutation, delegated action or business receipt; no durable egress-audit claim |

Partial gates prevent a feature-completion or production-safety claim. This record
is a bounded local repair candidate for independent review.

## Remaining limits

The guard intentionally does not resolve or pin DNS in shared browser/Worker
code. A compromised or misconfigured **configured feed hostname** resolving to a
private address remains outside this repair; deployed egress controls and the
trusted host's DNS require separate owner-observed validation. Cross-origin
redirect refusal removes arbitrary Location-host authority, not every possible
network SSRF condition. Public IPv6 literal support would need a reviewed policy.

The earlier unbounded RSS `response.text()` observation is now repaired by the
follow-on streamed-byte change above. Other providers were not changed, and their
body-bound behavior must not be inferred from these RSS tests.
No real feed availability, private-service reachability, DNS ownership, hosted
headers or production request behavior was tested.

## Independent local review

Independent H3 reviewed the same-origin redirect and streamed-byte repairs and
returned VERIFIED for those local invariants only. It independently reran the
focused suites and full offline platform suite. Runtime hashes remained unchanged
after review: `rss-feed.js`
`70784f8d9d39eced85b5e51eb487bf6440f36b2aa82b9f99e9013826c436b345`,
`ssrf-protection.js`
`9a734a78c54ee981e18a33fa38bde1bf869450dfd5dd3f5a90bc781bdea89f02`.
This verdict does not clear the DNS/egress or hosted/full-feature gaps above.
