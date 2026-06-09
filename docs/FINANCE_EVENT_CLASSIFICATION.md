# Finance Event Classification

SEC filing form, filing item, and normalized event type stay separate.

Initial 8-K item mapping:

- `1.05` -> `cybersecurity-disclosure`
- `2.01` -> `acquisition-disposition`
- `2.04` -> `financial-obligation-trigger`
- `2.06` -> `material-impairment`
- `4.02` -> `non-reliance-restatement`
- `5.02` -> `executive-change`
- `7.01` -> `regulation-fd-disclosure`
- `8.01` -> `other-material-event`

Not every filing is critical. Severity reflects potential disclosure importance, not share-price movement, trading advice, or verified market impact.

Company identity uses CIK first, then LEI or ticker metadata where available. Similar company names alone must not merge entities.
