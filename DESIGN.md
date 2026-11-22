# Live Map design system

Live Map is drawn as a printed hydrographic chart: a sheet with a neatline and a title block, laid on a plotting table. The person using it wants to know what has been reported, where, by whom, and whether they can reach the original source.

Tokens live in `chart-tokens.css`. Components live in `chart.css`, which loads last on every page and maps the older stylesheets onto these tokens.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--chart-paper` | `#edf3f3` | Page background |
| `--chart-sheet` | `#fafcfb` | Panels and controls |
| `--chart-shoal` | `#d3e6ea` | Hover and selected surfaces |
| `--chart-buff` | `#eadfbe` | Change badges and text selection |
| `--chart-ink` | `#12304a` | Text, primary actions, the neatline |
| `--chart-overprint` | `#a1125e` | Selection and keyboard focus only |
| `--chart-sounding` | `#0e5a82` | Links |

Magenta is the overprint colour on real charts. Keep it for "you are here": the current tab, the selected record and the focus ring. Never use it for a severity or a status.

## Status and evidence

- Status always combines an icon, a word and a tint (`.chart-state`). Colour alone never carries meaning.
- Only a healthy, current provider may use the `ok` state. Waiting for setup, switched off, delayed and failing each have their own state.
- Severity, confidence, verification and source labels keep their words. Severity colours appear only as a small marker beside the word.

## Type

- Overpass for headings, tabs and report titles. It descends from US highway signage, so it reads quickly at small sizes.
- Atkinson Hyperlegible for body text and controls.
- Overpass Mono for times, counts and scores.
- Nothing below 12px.

All three are self-hosted from `vendor/fonts` under the SIL Open Font License. Icons are Phosphor regular, inlined in `chart-tokens.css`.

## Layout

- Signature: the alternating neatline around the map, repeated as a thin band under the header of every other page.
- The map title block is the only floating panel with a double rule.
- Square corners on the chart, 4px on controls.
- Phones: list first, with detail opening as its own screen (`src/ui/detail-sheet.js`). Touch targets are at least 44px at 900px wide and below.
- Motion is limited to the loading sweep, and it stops under reduced motion.
