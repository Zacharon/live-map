# Institutional pilot: one Environment Agency contracting process

Proposed, local-only scope; 2026-10-01. No institutional record was imported or synthesized into the workbench. No collection, contact, publication or OCDS conformance is claimed.

The first-party indexed [award notice 005023-2025](https://www.find-tender.service.gov.uk/Notice/005023-2025/PDF) identifies Environment Agency, “Flood Modeller licenses renewal”, procurement `ocds-h6vhtk-04dee6`, published 2025-02-13. The indexed [earlier notice 037161-2024](https://www.find-tender.service.gov.uk/Notice/037161-2024/PDF) describes a proposed five-year software licensing arrangement. These establish a bounded, discoverable process to examine. Direct HTML/PDF retrieval returned 403 in this session. Search-index excerpts are discovery evidence, not retained originals or validated financial records. Contact details were excluded from this pilot design.

Question: can a reviewer reconcile the published award, subsequent amendments and independently published expenditure for this process, while identifying what the available records do not establish?

The next acquisition step is a finite, permitted manual import of the two original notices and, only if actually published and linkable, an amendment, agency expenditure entry and official audit document. Do not bypass access restrictions. If the originals cannot be retrieved normally or provided under approved rights, the pilot remains at specification stage. Do not fill payment or audit gaps with invented joins.

| Domain record | Minimum fields | Evidence boundary |
|---|---|---|
| Agency | source-scoped ID, published institutional identifier, name | Name equality is a match candidate, never sufficient identity proof. |
| Supplier | source-scoped ID, registry scheme and identifier, source name | No private contacts, accounts or individual targeting. |
| Award | OCID, award ID, amount as decimal string, currency, tax basis, date precision, source locator | An award amount is neither an invoice nor a payment. |
| Contract | OCID, contract ID, award reference, period, status | Distinct from a notice; preserve source distinctions. |
| Amendment | immutable revision ID, affected contract/award, original and revised fields, effective/publication/receipt clocks | No silent replacement of prior values. |
| Commitment / invoice | own ID, accounting type, currency, amount, period, explicit process linkage | Do not conflate accounting stages. |
| Payment / refund | transaction ID, payer/payee source IDs, amount, currency, date, documented contract linkage | Missing transactions mean missing evidence, not zero spending. |
| Audit material | document ID/hash, issued date, exact page/section, assertion class | A published audit allegation is not an adjudicated finding. |
| Evidence document | source URL, permitted original hash, version, locator, retrieval time, rights/retention, date precision | Originals and extracted facts retain independent revision identity. |

Represent every field as `{subjectRef, property, originalValue, normalizedValue, unitOrCurrency, datePrecision, evidenceRef, locator, revision, assertionClass}`. Assertion classes are `source-assertion`, `disputed-source-claim`, `calculation` and `analyst-assessment`; assessment never replaces the original assertion. Keep date precision (`year`, `month`, `day`, `instant`) explicit; do not manufacture midnight observation times from date-only records.

Source concepts: [OCDS releases and records](https://standard.open-contracting.org/1.1/en/primer/releases_and_records/), [implementation transactions/documents](https://standard.open-contracting.org/1.1/en/schema/reference/), [FollowTheMoney statements](https://followthemoney.tech/docs/statements/). OCDS 1.1.5 is the researched documentation version; actual exports must validate against an explicitly pinned schema and extensions before a conformance claim. No framework code is reused here. [Find a Tender API documentation](https://www.find-tender.service.gov.uk/Developer/Documentation) is a future integration reference; browsing it does not activate a provider.

The output consists of four synchronized views, driven by the same selected domain reference:

- Timeline: notices, amendments, accounting transactions and audit assertions with separate effective, published and received clocks. Historical queries exclude unavailable later revisions.
- Institutional graph: `awarded_to`, `amends`, `payment_under` or `audits` only when a supporting locator establishes that exact relationship. Candidate matches use a visibly different dashed style and remain reversible.
- Reconciliation table: rows preserve original award value, revised award value, commitment, invoice, payments and refunds, currency and tax basis. Totals group compatible money semantics; mixed currencies or absent conversion evidence refuse a combined total. Use decimal arithmetic and explicitly cited conversion dates if conversion is separately approved.
- Gaps register: payment linkage, supplier identifiers, amendment completeness, accounting period, currency/tax comparability, retention rights, alternative explanations and audit scope. Each gap has a source owner and a finite next evidence action.

Review decisions bind the field/evidence manifest, calculation version, entity decisions, audience and exact revisions. A correction, source withdrawal, new contradictory record or changed match supersedes affected decisions. Existing Live Map review/invalidation logic remains authoritative; this specification does not add authenticated approval or a second ledger. Uncertain matches need `candidate → accepted/rejected → reversed`, with reviewer, reason, supporting locators and immutable history. Shared address, name or proximity never proves beneficial ownership, payments or misconduct.

Before any public finding: independent field/amount verification, material claim review, privacy/rights review, right-of-reply process and correction/withdrawal history must exist, followed by explicit publication authorization. No automatic outreach or publication. Forge remains separate; introduce a versioned evidence manifest only if an actual capability requires it.

Acceptance: two original notices retained with permitted hashes and locators; every amount and edge source-linked; unsupported payments left unresolved; input changes invalidate review; source assertions and assessments remain distinct; imports cannot confer approval; no institutional geography without a documented location role. This pilot tests reconciliation usefulness, not whether wrongdoing can be found.
