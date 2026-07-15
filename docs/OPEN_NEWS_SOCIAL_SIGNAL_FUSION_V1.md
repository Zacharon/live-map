# Open News and Social Signal Fusion v1

This feature adds a server-side source-observation layer for open news, feeds, video, forums, and public social metadata. It is discovery and context infrastructure, not an automated truth engine.

`/api/events` retains its existing event contract and adds bounded `observations`, `storylines`, and `observationSummary` fields. The Latest Intelligence view exposes these records with coverage gaps and separate trend and verification labels.

Implemented provider boundaries are GDELT, allowlisted RSS/Atom/JSON Feed, YouTube, Bluesky, Mastodon, Hacker News, Wikimedia, Twitch, and Kick. All new social/video adapters are configuration-gated; none enable browser-side credentials or unrestricted polling.
