// Persist a domain reference, never a renderer entity ID or a source revision.
export function selectedFromUrl(params) {
  const values = ['selectedSource', 'selectedKind', 'selected'].map(key => params.get(key));
  if (!values.every(value => typeof value === 'string' && value.length > 0 && value.length < 160)) return null;
  const [source, kind, id] = values;
  if (!['event', 'contact'].includes(kind)) return null;
  return { source, kind, id };
}

export function workspaceUrl(href, state) {
  const url = new URL(href);
  url.searchParams.set('layout', state.layout);
  url.searchParams.set('view', state.view);
  for (const [param, field] of [['selectedSource', 'source'], ['selectedKind', 'kind'], ['selected', 'id']]) {
    if (state.selected) url.searchParams.set(param, state.selected[field]);
    else url.searchParams.delete(param);
  }
  return url.href;
}
