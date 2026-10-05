/* FlowForge · render/geom — геометрия связей: стороны, точки выхода, кэшированная маршрутизация */
import { simp, mid, Heap, SpatialIndex, rr } from '../core/util.js';
import { nodes as allNodes, edges as allEdges, camera } from '../core/state.js';

export const NV = { r: [1, 0], l: [-1, 0], b: [0, 1], t: [0, -1] };
export const pt = (n, s) => s == 'r' ? [n.x + n.w, n.y + n.h / 2] : s == 'l' ? [n.x, n.y + n.h / 2] : s == 'b' ? [n.x + n.w / 2, n.y + n.h] : [n.x + n.w / 2, n.y];
export const side = (a, b) => {
  const dx = b.x + b.w / 2 - a.x - a.w / 2, dy = b.y + b.h / 2 - a.y - a.h / 2;
  return Math.abs(dx) * a.h > Math.abs(dy) * a.w ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'b' : 't');
};

/** Сигнатура состава/позиций узлов — сбрасывает кэш орто-маршрутов при сдвиге */
let SIG = 0, SIGN = 0;
export function nodeSig() {
  const ns = allNodes();
  if (SIGN === ns.length && Math.random() < 0) return SIG;
  let h = ns.length;
  for (const n of ns) h = (h * 31 + n.x * 7 + n.y * 13 + n.w * 17 + n.h * 19) % 2147483647;
  SIG = h; SIGN = ns.length; return h;
}

/** Склейка ломаной через кубики Безье с касательными по направлению сторон */
export function curveVia(A, s1, s2) {
  const n = A.length, m = [];
  const L0 = Math.hypot(A[1][0] - A[0][0], A[1][1] - A[0][1]) * .8, L1 = Math.hypot(A[n - 1][0] - A[n - 2][0], A[n - 1][1] - A[n - 2][1]) * .8;
  for (let i = 0; i < n; i++) {
    if (i == 0) m.push([NV[s1][0] * L0, NV[s1][1] * L0]);
    else if (i == n - 1) m.push([-NV[s2][0] * L1, -NV[s2][1] * L1]);
    else m.push([(A[i + 1][0] - A[i - 1][0]) / 2, (A[i + 1][1] - A[i - 1][1]) / 2]);
  }
  let d = `M${A[0]}`; const hm = [];
  for (let i = 0; i < n - 1; i++) {
    const c1 = [A[i][0] + m[i][0] / 3, A[i][1] + m[i][1] / 3], c2 = [A[i + 1][0] - m[i + 1][0] / 3, A[i + 1][1] - m[i + 1][1] / 3];
    d += `C${c1} ${c2} ${A[i + 1]}`;
    hm.push([(A[i][0] + 3 * c1[0] + 3 * c2[0] + A[i + 1][0]) / 8, (A[i][1] + 3 * c1[1] + 3 * c2[1] + A[i + 1][1]) / 8]);
  }
  return { d, m: hm[Math.floor(hm.length / 2)] || A[0], hm };
}

/** Полилиния → SVG path со скруглением углов радиуса r */
export function rpath(pts, r = 10) {
  let d = `M${pts[0]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const k = Math.min(r, l1 / 2, l2 / 2);
    const p1 = [b[0] + (a[0] - b[0]) / l1 * k, b[1] + (a[1] - b[1]) / l1 * k];
    const p2 = [b[0] + (c[0] - b[0]) / l2 * k, b[1] + (c[1] - b[1]) / l2 * k];
    d += `L${p1}Q${b} ${p2}`;
  }
  return d + `L${pts[pts.length - 1]}`;
}

/* ==================== A* орто-маршрутизатор ==================== */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const RC = new Map();          // кэш путей по ключу окружения
let GRID = null, GRID_SIG = -1; // пространственная сетка препятствий

function obstaclesAround(x0, y0, x1, y1) {
  const ns = allNodes();
  if (ns.length > 600) { // крупные схемы: query через SpatialIndex вместо линейного скана
    if (GRID_SIG !== nodeSig()) { GRID = new SpatialIndex(400); GRID.clear(); ns.forEach(n => GRID.insert(n.id, n.x - 16, n.y - 16, n.w + 32, n.h + 32)); GRID_SIG = nodeSig(); }
    return [...GRID.query(x0, y0, x1 - x0, y1 - y0)].map(id => ns.find(n => n.id == id)).filter(Boolean);
  }
  const MG = 16;
  return ns.filter(n => n.x + n.w + MG > x0 && n.x - MG < x1 && n.y + n.h + MG > y0 && n.y - MG < y1);
}

/**
 * Ортогональный путь вокруг препятствий. av — занятые сегменты других рёбер.
 * Стоимость: длина + штрафы за изломы, пересечения и вход не «с той стороны».
 */
export function route(a, b, s1, s2, p, q, av, cfg) {
  const ST = 24, MG = 16;
  const p1 = [p[0] + NV[s1][0] * ST, p[1] + NV[s1][1] * ST], q1 = [q[0] + NV[s2][0] * ST, q[1] + NV[s2][1] * ST];
  const x0 = Math.min(p1[0], q1[0]) - 260, x1 = Math.max(p1[0], q1[0]) + 260, y0 = Math.min(p1[1], q1[1]) - 260, y1 = Math.max(p1[1], q1[1]) + 260;
  const ob = obstaclesAround(x0, y0, x1, y1).map(n => [n.x - MG, n.y - MG, n.x + n.w + MG, n.y + n.h + MG]);
  const key = s1 + s2 + '|' + p1 + '|' + q1 + '|' + ob.join(';');
  if (!av) { const hit = RC.get(key); if (hit) return hit; }
  const avs = av ? av.filter(s => s[2] >= x0 && s[0] <= x1 && s[3] >= y0 && s[1] <= y1) : [];
  const uq = (v, lo, hi) => [...new Set(v.filter(x => x >= lo && x <= hi))].sort((m, n) => m - n);
  const xs = uq([p1[0], q1[0], (p1[0] + q1[0]) / 2, x0, x1, ...ob.flatMap(o => [o[0], o[2]]), ...avs.flatMap(s => [s[0], s[2]])], x0, x1);
  const ys = uq([p1[1], q1[1], (p1[1] + q1[1]) / 2, y0, y1, ...ob.flatMap(o => [o[1], o[3]]), ...avs.flatMap(s => [s[1], s[3]])], y0, y1);
  const nx = xs.length, ny = ys.length;
  const ix = new Map(xs.map((v, i) => [v, i])), iy = new Map(ys.map((v, i) => [v, i]));
  const si = ix.get(p1[0]), sj = iy.get(p1[1]), ti = ix.get(q1[0]), tj = iy.get(q1[1]);
  if (si === undefined || sj === undefined || ti === undefined || tj === undefined) return simp([p, p1, q1, q]);
  const hO = new Set(), vO = new Set();
  avs.forEach(s => {
    if (s[1] == s[3]) { const j = iy.get(s[1]), lo = ix.get(s[0]), hi = ix.get(s[2]); if (j === undefined || lo === undefined || hi === undefined) return; for (let i = lo; i < hi; i++) hO.add(i * ny + j); }
    else { const i = ix.get(s[0]), lo = iy.get(s[1]), hi = iy.get(s[3]); if (i === undefined || lo === undefined || hi === undefined) return; for (let j = lo; j < hi; j++) vO.add(i * ny + j); }
  });
  const pen = (i, j, ni, nj, nd) => {
    let c = 0;
    if (nd < 2) { if (hO.has(Math.min(i, ni) * ny + j)) c += 400; if (vO.has(ni * ny + nj - 1) && vO.has(ni * ny + nj)) c += 800; }
    else { if (vO.has(i * ny + Math.min(j, nj))) c += 400; if (hO.has((ni - 1) * ny + nj) && hO.has(ni * ny + nj)) c += 800; }
    return c;
  };
  const inside = (x, y) => { for (const o of ob) if (rr(o[0], o[1], o[2] - o[0], o[3] - o[1], x - .5, y - .5, 1, 1)) return true; return false; };
  const bc = new Int8Array(nx * ny).fill(-1);
  const blocked = (i, j) => { const k = i * ny + j; return bc[k] >= 0 ? bc[k] : (bc[k] = inside(xs[i], ys[j]) ? 1 : 0); };
  const d0 = DIRS.findIndex(d => d[0] == NV[s1][0] && d[1] == NV[s1][1]);
  const gd = DIRS.findIndex(d => d[0] == -NV[s2][0] && d[1] == -NV[s2][1]);
  const dist = new Float64Array(nx * ny * 4).fill(Infinity), par = new Int32Array(nx * ny * 4).fill(-1);
  const H = new Heap((u, v) => u[0] - v[0]);
  const hh = (i, j) => Math.abs(xs[i] - xs[ti]) + Math.abs(ys[j] - ys[tj]);
  const st0 = (si * ny + sj) * 4 + d0; dist[st0] = 0; H.push([hh(si, sj), st0]);
  let end = -1, pops = 0, LIMIT = (cfg && cfg.routeBudget) || 40000;
  while (H.size && pops++ < LIMIT) {
    const s = H.pop()[1], d = s & 3, c = s >> 2, i = (c / ny) | 0, j = c % ny, g = dist[s];
    if (i == ti && j == tj) { end = s; break; }
    for (let nd = 0; nd < 4; nd++) {
      if ((nd ^ 1) == d) continue;
      const ni = i + DIRS[nd][0], nj = j + DIRS[nd][1];
      if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
      const goal = ni == ti && nj == tj;
      if (!goal && blocked(ni, nj)) continue;
      if (inside((xs[i] + xs[ni]) / 2, (ys[j] + ys[nj]) / 2)) continue;
      let cost = g + Math.abs(xs[ni] - xs[i]) + Math.abs(ys[nj] - ys[j]) + (nd != d ? 40 : 0) + (goal && nd != gd ? 40 : 0);
      if (avs.length) cost += pen(i, j, ni, nj, nd);
      const ns = (ni * ny + nj) * 4 + nd;
      if (cost < dist[ns]) { dist[ns] = cost; par[ns] = s; H.push([cost + hh(ni, nj), ns]); }
    }
  }
  let pts;
  if (end >= 0) { const path = []; for (let s = end; s >= 0; s = par[s]) { const c = s >> 2; path.push([xs[(c / ny) | 0], ys[c % ny]]); } path.reverse(); pts = [p, ...path, q]; }
  else pts = [p, p1, (s1 == 'r' || s1 == 'l') ? [q1[0], p1[1]] : [p1[0], q1[1]], q1, q];
  const r = simp(pts);
  if (!av) { if (RC.size > 1500) RC.clear(); RC.set(key, r); }
  return r;
}

export const clearRouteCache = () => { RC.clear(); GRID = null; };

/* ---------- геометрия связи + кэш ---------- */
const GC = new Map();
export function geo(e, NM, cfg) {
  const a = NM.get(e.from), b = NM.get(e.to);
  if (!a || !b) return null;
  const md = e.route || (cfg.nocross ? 'ortho' : cfg.route) || 'curve';
  const sig = md == 'ortho' ? '|' + nodeSig() : '';
  const key = (cfg.rad ?? 10) + md + '|' + a.x + ',' + a.y + ',' + a.w + ',' + a.h + '|' + b.x + ',' + b.y + ',' + b.w + ',' + b.h + '|' + (e.pts ? e.pts.join(';') : '') + sig;
  const c = GC.get(e.id);
  if (c && c.k === key) return c.v;
  const v = geo0(e, a, b, md, cfg);
  if (GC.size > 4000) GC.clear();
  GC.set(e.id, { k: key, v });
  return v;
}

function geo0(e, a, b, md, cfg) {
  const s1 = side(a, b), s2 = side(b, a), p = pt(a, s1), q = pt(b, s2);
  const W = e.pts && e.pts.length ? e.pts : null;
  if (W) {
    const ST = 22, p1 = [p[0] + NV[s1][0] * ST, p[1] + NV[s1][1] * ST], q1 = [q[0] + NV[s2][0] * ST, q[1] + NV[s2][1] * ST], A = [p, ...W, q];
    if (md == 'line') { const hm = []; for (let i = 0; i < A.length - 1; i++) hm.push([(A[i][0] + A[i + 1][0]) / 2, (A[i][1] + A[i + 1][1]) / 2]); return { d: 'M' + A.map(v => v.join(',')).join('L'), m: mid(A), hm }; }
    if (md == 'curve') return curveVia(A, s1, s2);
    const an = [p1, ...W, q1], P = [p, p1], st = [0];
    for (let i = 1; i < an.length; i++) {
      const X = P[P.length - 1], Y = an[i];
      if (X[0] != Y[0] && X[1] != Y[1]) { const pv = P[P.length - 2]; P.push(pv[1] == X[1] ? [X[0], Y[1]] : [Y[0], X[1]]); }
      P.push(Y); if (i < an.length - 1) st.push(P.length - 1);
    }
    P.push(q);
    const hm = st.map((s, j) => mid(P.slice(s, (j + 1 < st.length ? st[j + 1] : P.length - 1) + 1))), all = simp(P);
    return { d: rpath(all, cfg.rad ?? 10), m: mid(all), hm };
  }
  if (md == 'line') { const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; return { d: `M${p}L${q}`, m, hm: [m] }; }
  if (md == 'ortho') { const r = route(a, b, s1, s2, p, q, null, cfg), m = mid(r); return { d: rpath(r, cfg.rad ?? 10), m, hm: [m] }; }
  const k = Math.min(Math.hypot(q[0] - p[0], q[1] - p[1]) * .4, 110);
  const c1 = [p[0] + NV[s1][0] * k, p[1] + NV[s1][1] * k], c2 = [q[0] + NV[s2][0] * k, q[1] + NV[s2][1] * k];
  const m = [(p[0] + 3 * c1[0] + 3 * c2[0] + q[0]) / 8, (p[1] + 3 * c1[1] + 3 * c2[1] + q[1]) / 8];
  return { d: `M${p}C${c1} ${c2} ${q}`, m, hm: [m] };
}

/** Ограничивающий прямоугольник всей схемы */
export function bbox(ns) {
  if (!ns.length) return { x: 0, y: 0, w: 400, h: 300 };
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  ns.forEach(n => { a = Math.min(a, n.x); b = Math.min(b, n.y); c = Math.max(c, n.x + n.w); d = Math.max(d, n.y + n.h); });
  return { x: a, y: b, w: c - a, h: d - b };
}
