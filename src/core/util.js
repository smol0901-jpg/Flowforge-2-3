/* FlowForge · core/util — общие утилиты (без зависимостей) */
export const NS = 'http://www.w3.org/2000/svg';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
export const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Экранирование для безопасной вставки в HTML/SVG-строки (защита от XSS) */
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Только безопасные цвета — всё остальное отбрасываем (инъекции в атрибуты невозможны) */
export function hex6(c) {
  c = String(c || '');
  if (/^#[0-9a-f]{3}$/i.test(c)) c = '#' + [...c.slice(1)].map(x => x + x).join('');
  return /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : null;
}

/** Выборка непустых полей объекта (для сериализации) */
export const pick = (o, ks) => Object.fromEntries(ks.filter(k => o[k] != null && o[k] !== '').map(k => [k, o[k]]));

/** Контрастный цвет текста поверх произвольного фона */
export const ink = c => {
  c = String(c || '#888888').replace('#', '');
  if (c.length === 3) c = [...c].map(x => x + x).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16) || 0);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#1e1e2e' : '#ffffff';
};

/** Затемнение цвета на k (0..1) */
export function dk(c, k = .38) {
  c = hex6(c) || '#888888';
  return '#' + [1, 3, 5].map(i => Math.round(parseInt(c.substr(i, 2), 16) * (1 - k)).toString(16).padStart(2, '0')).join('');
}

/** Перенос текста по словам, max ~m символов в строке */
export const wrap = (t, m = 16) => {
  const o = [];
  String(t ?? '').split('\n').forEach(p => {
    let l = '';
    p.split(' ').forEach(w => {
      if (l && (l + ' ' + w).length > m) { o.push(l); l = w; } else l = l ? l + ' ' + w : w;
    });
    o.push(l);
  });
  return o.length ? o : [''];
};

/** Убрать нулевые/пустые сегменты полилинии и коллинеарные точки */
export const simp = pts => {
  if (!pts || pts.length < 3) return pts || [];
  const o = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = o[o.length - 1], b = pts[i], c = pts[i + 1];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) continue;
    o.push(b);
  }
  o.push(pts[pts.length - 1]);
  return o;
};

/** Точка на середине ломаной */
export function mid(pts) {
  let t = 0; const sg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); sg.push(l); t += l; }
  let h = t / 2;
  for (let i = 0; i < sg.length; i++) {
    if (h <= sg[i]) { const k = sg[i] ? h / sg[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
    h -= sg[i];
  }
  return pts[0] || [0, 0];
}

/** Бинарная мин-куча (f,score) — используется A* маршрутизацией */
export class Heap {
  constructor(cmp = (a, b) => a[0] - b[0]) { this.a = []; this.cmp = cmp; }
  get size() { return this.a.length; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(a[p], a[i]) <= 0) break;[a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, t = a[0], l = a.pop(); if (a.length) { a[0] = l; let i = 0; for (; ;) { const x = 2 * i + 1, y = x + 1; let m = i; if (x < a.length && this.cmp(a[x], a[m]) < 0) m = x; if (y < a.length && this.cmp(a[y], a[m]) < 0) m = y; if (m === i) break;[a[m], a[i]] = [a[i], a[m]]; i = m; } } return t; }
}

/** Пространственная сетка для запросов «что пересекает прямоугольник» за O(1)..O(k) */
export class SpatialIndex {
  constructor(cell = 300) { this.cell = cell; this.m = new Map(); }
  _key(cx, cy) { return cx + ',' + cy; }
  clear() { this.m.clear(); }
  insert(id, x, y, w, h) {
    const c = this.cell;
    for (let gx = Math.floor(x / c); gx <= Math.floor((x + w) / c); gx++)
      for (let gy = Math.floor(y / c); gy <= Math.floor((h + y) / c); gy++) {
        const k = this._key(gx, gy); let s = this.m.get(k); if (!s) this.m.set(k, s = new Set()); s.add(id);
      }
  }
  query(x, y, w, h) {
    const out = new Set(), c = this.cell;
    for (let gx = Math.floor(x / c); gx <= Math.floor((x + w) / c); gx++)
      for (let gy = Math.floor(y / c); gy <= Math.floor((h + y) / c); gy++) {
        const s = this.m.get(this._key(gx, gy)); if (s) s.forEach(i => out.add(i));
      }
    return out;
  }
}

/** Проверка пересечения двух прямоугольников */
export const rr = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

/** base64url для упакованных ссылок */
export const b64u = u => { let s = ''; u.forEach(c => s += String.fromCharCode(c)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const unb64u = s => { s = atob(s.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };

/** Скачивание Blob */
export function dl(b, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Имя файла из названия схемы */
export const slug = s => String(s).trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'flowforge';

/** Глобальный toast (подключается UI-слоем) */
let TOAST = null;
export const setToastHandler = fn => { TOAST = fn; };
export const toast = m => { if (TOAST) TOAST(m); };
