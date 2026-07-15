# Storyline Clustering

Storylines are deterministic six-hour groups of normalized title tokens. The key intentionally favors explainability over opaque semantic inference. A storyline contains observation IDs, source-organization count, independent-source count, latest observation time, trend rate, verification state, and coverage gaps.

Clusters never silently merge event records. Consumers can inspect source coverage and should treat a storyline as a navigation aid, not a claim that all records describe the same real-world event.
