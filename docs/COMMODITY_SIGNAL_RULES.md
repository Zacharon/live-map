# Commodity Signal Rules

Commodity providers support both observations and events. Observations are official data points. Events are only created when configured thresholds are crossed or an official revision is detected.

Initial EIA signal wording:

- Large weekly inventory change reported
- Production level revised
- Potential supply-impact signal
- Requires market interpretation

Thresholds live in `src/data/providers/finance-commodity-config.js`. Signals must not claim causality between an official data release and a market move.
