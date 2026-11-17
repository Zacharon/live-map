# Sol Loop findings and dispositions

Round 1: CHANGES; codex gpt-6.1-sol medium, default service tier. Token usage UNKNOWN.

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| S1 | should | Prototype properties accepted as severity scores | Fixed with Object.hasOwn label lookup; regression-before round 2 preserves actual Function: toString failure; both fields tested against toString/constructor/__proto__ |
| S2 | should | Legacy uiSeverity fallback dropped | Fixed with explicit last fallback; numeric zero retains precedence; focused tests cover both |
| Coverage | should | Mixed cluster, all-unknown threat, risk exclusion proof absent | Added incident/display mixed unknown/zero/known, all-unknown threat and exact factor comparisons with/without unknown records |

Round 2: APPROVE, limited to changed helper, added coverage and open S1/S2. S1 and S2 resolved; coverage accepted; no blocker, should or nit findings. Reviewer independently reran focused tests and diff check. Usage UNKNOWN. All other frozen source hashes retained. No declined findings.
