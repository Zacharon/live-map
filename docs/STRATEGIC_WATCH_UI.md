# Strategic Watch UI

The main navigation exposes Overview, Events, Chokepoints, Countries, Sources, and Diagnostics. The map stays spatial context; the event feed or chokepoint registry remains the primary inspection surface.

## Chokepoints view

- Search, region, type, condition, domain, and sorting filters operate on the local registry.
- Selecting a card or map geometry opens a source-aware detail pane with assessment reasoning, current correlated developments, operational-dimension labels, limitations, related geography, and original event source links.
- A selected chokepoint dims unrelated event markers; it does not hide them. Selection, map, and list therefore remain synchronized.
- The left-side strategic watch summary highlights non-normal assessments while retaining the full registry for comparison.

## URL state and accessibility

`view=chokepoints`, `chokepoint`, `chokepointQuery`, `chokepointRegion`, `chokepointType`, `chokepointStatus`, `chokepointDomain`, and `chokepointSort` preserve selection and filters. Values are allowlisted or length-limited before use.

Cards are keyboard-focusable and activate with Enter or Space. Escape closes the filter drawer; the detail close control is a labeled button. Mobile layouts collapse chokepoint filter controls to one column and keep the detail pane within the existing drawer model.
