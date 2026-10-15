// Synthetic mathematical field; never imported into the ordinary data path.
export const WIND_METADATA = { model: 'Synthetic test field', units: 'm/s', level: 'Illustrative surface (10 m)', validTime: '2026-09-08T12:00:00Z', extent: [-60,-180,75,180] };
export function windVector(lat, lon) { return { u: 12 * Math.cos(lat*Math.PI/180), v: 5 * Math.sin(lon*Math.PI/90) }; }
export function createWindProof(map) {
  const canvas = document.createElement('canvas');
  canvas.className = 'wind-proof'; canvas.setAttribute('aria-label','Synthetic wind vectors, meters per second; arrows point toward flow');
  map.getContainer().append(canvas);
  let enabled = false, opacity = 0.7;
  function draw() {
    canvas.hidden = !enabled || document.hidden;
    if (canvas.hidden) return;
    const size = map.getSize(); canvas.width = size.x; canvas.height = size.y;
    const ctx = canvas.getContext('2d'); ctx.globalAlpha = opacity; ctx.strokeStyle = '#a4d8f5'; ctx.lineWidth = 1.3;
    for (let x=24;x<size.x;x+=44) for(let y=24;y<size.y;y+=44) {
      const p = map.containerPointToLatLng([x,y]); if(p.lat < -60 || p.lat > 75) continue;
      const {u,v} = windVector(p.lat,p.lng); const angle = Math.atan2(-v,u), length = Math.hypot(u,v)*1.6;
      const ex=x+Math.cos(angle)*length, ey=y+Math.sin(angle)*length;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(ex,ey);
      ctx.moveTo(ex-5*Math.cos(angle-.5),ey-5*Math.sin(angle-.5)); ctx.lineTo(ex,ey); ctx.lineTo(ex-5*Math.cos(angle+.5),ey-5*Math.sin(angle+.5)); ctx.stroke();
    }
  }
  return { set(active, alpha = opacity) { enabled = active; opacity = alpha; map.off('moveend resize',draw); document.removeEventListener('visibilitychange',draw); if(active) { map.on('moveend resize',draw); document.addEventListener('visibilitychange',draw); } draw(); }, destroy() { map.off('moveend resize',draw); document.removeEventListener('visibilitychange',draw); canvas.remove(); } };
}
