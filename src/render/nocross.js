/* FlowForge · render/nocross — пакетная орто-маршрутизация без пересечений (с ограничением бюджета) */
import { side, pt, route } from './geom.js';

let NCON = false, NCW = false, NCR = new Map(), NCK = '', NCV = 0, NCX = [];

export const getNoCrossState = () => ({ active: NCON, routes: NCR, crossings: NCX });

/**
 * Пересчитывает пути всех орто-рёбер с учётом занятых сегментов.
 * Ключ пересчёта — сигнатура узлов + состав рёбер; дёшево при drag-е (пропускается).
 */
export function routeAll(ns, es, NM, cfg, dragging) {
  NCON = false;
  if (!cfg.nocross) { NCR = new Map(); return; }
  if (es.length > 120) { if (!NCW) { NCW = true; import('../core/util.js').then(m => m.toast('Запрет пересечений активен до 120 связей')); } return; }
  if (dragging) return;
  const key = cfg.route + '|' + ns.map(n => n.id + n.x + n.y + n.w + n.h).join(';') + '|' + es.map(e => e.id + e.from + e.to + (e.route || '') + (e.pts ? e.pts.join() : '')).join(';');
  if (key !== NCK) {
    NCK = key; NCV++; NCR = new Map();
    const segs = [];
    const dist = e => { const a = NM.get(e.from), b = NM.get(e.to); return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); };
    const todo = es.filter(e => !(e.pts && e.pts.length) && (e.route || 'ortho') == 'ortho' && NM.has(e.from) && NM.has(e.to)).sort((u, v) => dist(u) - dist(v));
    todo.forEach(e => {
      const a = NM.get(e.from), b = NM.get(e.to), s1 = side(a, b), s2 = side(b, a);
      const r = route(a, b, s1, s2, pt(a, s1), pt(b, s2), segs, cfg);
      NCR.set(e.id, r);
      for (let i = 1; i < r.length; i++) { const [x1, y1] = r[i - 1], [x2, y2] = r[i]; segs.push([Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)]); }
    });
    NCX = [];
    const H = segs.filter(s => s[1] == s[3]), V = segs.filter(s => s[0] == s[2]);
    H.forEach(h => V.forEach(v => { if (v[0] > h[0] && v[0] < h[2] && h[1] > v[1] && h[1] < v[3]) NCX.push([v[0], h[1]]); }));
  }
  NCON = true;
}

/** Раздвиг пересекающихся блоков (после вставки/импорта) */
export function resolveOverlaps(ids, ns, N) {
  const mv = ids.map(N).filter(Boolean), oth = ns.filter(n => !ids.includes(n.id));
  let moved = false;
  for (let it = 0; it < 40; it++) {
    let hit = false;
    for (const m of mv) for (const o of oth) {
      const dx = Math.min(m.x + m.w, o.x + o.w) - Math.max(m.x, o.x), dy = Math.min(m.y + m.h, o.y + o.h) - Math.max(m.y, o.y);
      if (dx > 0 && dy > 0) {
        hit = moved = true; const pad = 14;
        if (dx < dy) { const s = (m.x + m.w / 2 < o.x + o.w / 2) ? -1 : 1; mv.forEach(n => n.x = Math.round(n.x + s * (dx + pad))); }
        else { const s = (m.y + m.h / 2 < o.y + o.h / 2) ? -1 : 1; mv.forEach(n => n.y = Math.round(n.y + s * (dy + pad))); }
      }
    }
    if (!hit) break;
  }
  return moved;
}
