// @ts-check
/** Renderer resources stay behind a port. Visibility never starts collection. */
export function layerLifecycle(port) {
  const layers = new Map();
  let disposed = false;
  function requireLayer(id) {
    if (disposed) throw new Error('layer manager disposed');
    const layer = layers.get(id);
    if (!layer) throw new Error(`unregistered layer: ${id}`);
    return layer;
  }
  return {
    register(definition) {
      if (disposed || layers.has(definition.id)) throw new Error('duplicate or disposed registration');
      layers.set(definition.id, { definition, enabled: true, resources: new Map() });
    },
    update(id, items) {
      const layer = requireLayer(id), keys = new Set(items.map(item => item.key));
      if (keys.size !== items.length) throw new Error('duplicate domain references');
      for (const item of items) {
        let resource = layer.resources.get(item.key);
        if (!resource) { resource = port.create(item, layer.definition); layer.resources.set(item.key, resource); }
        port.update(resource, item, layer.enabled && item.renderable, layer.definition);
      }
      for (const [key, resource] of layer.resources) {
        if (!keys.has(key)) { port.remove(resource); layer.resources.delete(key); }
      }
    },
    enable(id) { const layer = requireLayer(id); layer.enabled = true; },
    disable(id) { const layer = requireLayer(id); layer.enabled = false; for (const resource of layer.resources.values()) port.hide(resource); },
    counts() { return Object.fromEntries([...layers].map(([id, l]) => [id, l.resources.size])); },
    dispose() { if (disposed) return; for (const layer of layers.values()) for (const resource of layer.resources.values()) port.remove(resource); layers.clear(); disposed = true; },
  };
}
