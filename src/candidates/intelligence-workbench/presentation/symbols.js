// Original vector symbols: no font/emoji dependency or external asset request.
export const SYMBOLS = Object.freeze({
  events: '<circle cx="20" cy="20" r="10"/>',
  aircraft: '<path d="M18 4 Q20 1 22 4 L23 15 L35 23 L35 27 L23 24 L23 32 L28 36 L28 39 L20 36 L12 39 L12 36 L17 32 L17 24 L5 27 L5 23 L17 15 Z"/>',
  vessels: '<path d="M8 21 L8 14 L15 14 L15 8 L24 8 L24 14 L31 14 L31 21 L35 24 L30 34 L10 34 L5 24 Z"/><path d="M20 4 V8 M5 38 Q10 34 15 38 Q20 34 25 38 Q30 34 35 38" fill="none"/><path d="M12 18 H16 M23 18 H27 M20 25 V31" fill="none"/>',
  satellites: '<g transform="rotate(-25 20 20)"><path d="M15 13 H25 V27 H15 Z"/><path d="M2 10 H12 V30 H2 Z M28 10 H38 V30 H28 Z" fill="none"/><path d="M2 17 H12 M2 24 H12 M28 17 H38 M28 24 H38 M12 20 H15 M25 20 H28 M20 8 V13 M17 5 Q20 9 23 5" fill="none"/></g>',
});
export function symbolSvg(id, color='#dce9e9') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><g fill="${color}" stroke="#091b27" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${SYMBOLS[id]||SYMBOLS.events}</g></svg>`;
}
export const symbolImage=(id,color)=>`data:image/svg+xml,${encodeURIComponent(symbolSvg(id,color))}`;
