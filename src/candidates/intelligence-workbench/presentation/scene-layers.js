import { layerLifecycle } from '../application/layer-lifecycle.js';
import { LAYERS } from '../application/projections.js';
import { symbolImage } from './symbols.js';
export function sceneLayers(handle) {
  const { Cesium: C, viewer } = handle;
  const images = Object.fromEntries(LAYERS.map(l => [l.id, symbolImage(l.id,l.color)]));
  const runtime = layerLifecycle({
    create(item) { return viewer.entities.add({ id: `domain:${item.key}` }); },
    update(entity, item, visible, layer) {
      entity.name = item.record.title;
      const p = item.record.position;
      entity.position = p.valid ? C.Cartesian3.fromDegrees(p.longitude, p.latitude, item.heightMeters) : undefined;
      entity.show = visible;
      entity.billboard = { image: images[layer.id], width: item.selected ? 42 : layer.id==='events'?22:32, height: item.selected ? 42 : layer.id==='events'?22:32,
        color: item.record.stale ? C.Color.WHITE.withAlpha(0.85) : C.Color.WHITE, disableDepthTestDistance: 0 };
      entity.label = { text: item.selected ? item.record.title : '', font: '13px sans-serif', fillColor: C.Color.WHITE,
        show: item.selected && handle.currentTarget().zoom >= 4,
        showBackground: true, backgroundColor: C.Color.fromCssColorString('#10282f'),
        pixelOffset: new C.Cartesian2(0, -26), disableDepthTestDistance: 0 };
    },
    hide(entity) { entity.show = false; },
    remove(entity) { viewer.entities.remove(entity); },
  });
  LAYERS.forEach(layer => runtime.register(layer));
  return {
    sync(items, enabled) { for (const layer of LAYERS) { enabled[layer.id] ? runtime.enable(layer.id) : runtime.disable(layer.id); runtime.update(layer.id, items.filter(p => p.layer === layer.id)); } viewer.scene.requestRender(); },
    visibility(record, heightMeters) {
      const p = record.position, position = C.Cartesian3.fromDegrees(p.longitude, p.latitude, heightMeters);
      const occluder = new C.EllipsoidalOccluder(viewer.scene.globe.ellipsoid, viewer.camera.positionWC);
      if (!occluder.isPointVisible(position)) return 'earth-occluded';
      const point = C.SceneTransforms.worldToWindowCoordinates(viewer.scene, position);
      if (!point || point.x < 0 || point.x > viewer.canvas.clientWidth || point.y < 0 || point.y > viewer.canvas.clientHeight) return 'outside-view-frustum';
      return null;
    },
    counts: runtime.counts,
    pickPoints(items) {
      const bounds = viewer.canvas.getBoundingClientRect();
      return items.filter(item => item.renderable).map(item => {
        const p = item.record.position;
        const point = C.SceneTransforms.worldToWindowCoordinates(viewer.scene, C.Cartesian3.fromDegrees(p.longitude, p.latitude, item.heightMeters));
        return point ? { key: item.key, x: bounds.left + point.x, y: bounds.top + point.y } : null;
      }).filter(Boolean);
    },
    dispose: runtime.dispose,
  };
}
