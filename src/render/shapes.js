/* FlowForge · render/shapes — SVG-разметка фигур */
import { GEO, shapeById } from '../data/shapes.js';

/** Атрибуты заливки/обводки одной строкой (значения уже провалидированы) */
const attrs = (f, st, sw) => `fill="${f}" stroke="${st}" stroke-width="${sw}"`;

/**
 * n: {type,x,y,w,h}. da — stroke-dasharray. Возвращает SVG-строку.
 * Неизвестный тип рисуется как rect (безопасный дефолт).
 */
export function shp(n, f, st, sw, da) {
  const s = shapeById(n.type);
  const fn = (s && GEO[s.geo]) || GEO.rect;
  const a = attrs(f, st == 'none' ? 'none' : st, sw) + (da ? ` stroke-dasharray="${da}"` : '');
  return fn(+n.x || 0, +n.y || 0, Math.max(4, +n.w || 170), Math.max(4, +n.h || 60), a);
}

/** Мини-иконка фигуры для палитры */
export function miniIcon(type, color, pw = 38) {
  const n = { type, x: 3, y: 4, w: 40, h: 24 };
  if (type === 'decision' || type.startsWith('bm_gw')) { n.y = 2; n.h = 28; }
  if (type === 'conn' || type === 'g_circle') { n.x = 11; n.y = 3; n.w = 24; n.h = 24; }
  const dk = c => '#' + [1, 3, 5].map(i => Math.round(parseInt((c || '#888').slice(i, i + 2), 16) * .62).toString(16).padStart(2, '0')).join('');
  return `<svg viewBox="0 0 46 32" width="${pw}" height="${Math.round(pw * 32 / 46)}" aria-hidden="true">${shp(n, color, dk(color), 1.4)}</svg>`;
}

/** <defs>: маркеры стрелок под все используемые цвета + градиент объёма */
export function defsSVG(colors, selColor = '#f9e2af') {
  return `<defs>${[...colors].map(c => `<marker id="ah${c.slice(1)}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}<marker id="ahs" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${selColor}"/></marker><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset=".55" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".10"/></linearGradient></defs>`;
}
