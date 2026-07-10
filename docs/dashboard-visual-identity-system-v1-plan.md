# Dashboard Visual Identity System v1 Plan

## Why the dashboard felt generic

Productization added real operator substance (command bar, threat level, connections, artifacts), but styling still read as a default dark admin shell: scattered hex colors, flat panels, weak hierarchy, and little OSINT Forge identity.

## What this sprint improves

- Original **OSINT Forge command-console** visual language (`--of-*` tokens)
- Coherent panels: command bar, legend, summary, change awareness, timeline, clusters, provider health
- Analyst drawer as visual centerpiece
- Threat / connection color language
- Artifact export button hierarchy
- Map marker ring tokens
- Focus-visible + reduced-motion
- Mobile tap targets and stacking
- Docs for visual language and demo usage

## Visual language

Dark tactical console — cyan signal accents, amber warnings, red critical, violet intelligence/connections. Subtle grid + glow atmosphere. Monospace for scores/meta only. No game clones, no external fonts/CDN, no heavy animation.

## Codebase cleanup

- Token bridge in `styles.css` (legacy `--bg/--accent` mapped to `--of-*`)
- `dashboard-v2.css` reorganized by section with comments
- Hard-coded hex reduced in dashboard-v2 layer

## Intentionally deferred

- Source Confidence v1
- Export toast feedback
- Globe / Cesium
- Full `styles.css` rewrite
- Investigation workspace

## Why no backend/providers/globe

This sprint is **identity and readability**. Substance layers already exist; sellable demo credibility needs a professional console look without expanding security surface.

## GitHub / demo / sellable positioning

A coherent operator console is easier to screenshot, demo, and pitch than a generic Leaflet admin UI — while remaining client-only and honest about heuristic threat levels.
