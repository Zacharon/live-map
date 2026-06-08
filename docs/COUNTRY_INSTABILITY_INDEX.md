# Country Instability Index

The Country Instability Index, abbreviated CII, is an experimental analytic indicator.

It is not an official government, travel, insurance, legal, credit, or financial rating.

## Scale

- 0-19: Stable
- 20-39: Guarded
- 40-59: Elevated
- 60-79: High
- 80-100: Critical

## Prototype factors

- Recent event activity
- Event severity
- Natural hazard activity
- Data freshness
- Source confidence

Weights are stored in `src/config.js`.

The app shows score, level, confidence, source list, factor contribution, calculation time, and limitations. Confidence is reduced when data is incomplete or stale.

