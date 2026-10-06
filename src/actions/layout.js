/* FlowForge · actions/layout — автоукладка: dagre (если есть) или собственный ранговый алгоритм */
import { nodes, edges, doc, commit } from '../core/state.js';
import { toast } from '../core/util.js';

/** Простейшая раскладка без внешних зависимостей: ранги по длинным путям + барицентрик */
export function simpleLayout(dir = 'TB', gs = 20) {
  const ns = nodes(), es = edges();
  if (!ns.length) return;
  const G = new Map(ns.map(n => [n.id, []]));
  const back = new Set(), indeg = new Map(ns.map(n => [n.id, 0]));
  es.forEach(e => { if (G.has(e.from) && indeg.has(e.to)) { G.get(e.from).push(e); indeg.set(e.to, indeg.get(e.to) + 1); } });
  // удаление циклов: DFS-рёбра назад
  const st = new Map();
  const dfs = u => { st.set(u, 1); for (const e of G.get(u) || []) { const v = e.to; if (!st.get(v)) dfs(v); else if (st.get(v) === 1) back.add(e.id); } st.set(u, 2); };
  ns.forEach(n => { if (!st.get(n.id) && !indeg.get(n.id)) dfs(n.id); });
  ns.forEach(n => { if (!st.get(n.id)) dfs(n.id); });
  const fe = es.filter(e => !back.has(e.id));
  const rk = new Map(ns.map(n => [n.id, 0]));
  for (let it = 0; it < ns.length; it++) {
    let ch = false;
    fe.forEach(e => { const a = rk.get(e.from), b = rk.get(e.to); if (b == null || a == null) return; if (b < a + 1) { rk.set(e.to, a + 1); ch = true; } });
    if (!ch) break;
  }
  const L = [];
  ns.forEach(n => { const r = rk.get(n.id) || 0; (L[r] = L[r] || []).push(n); });
  const pos = new Map();
  L.forEach(ly => ly && ly.forEach((n, i) => pos.set(n.id, i)));
  const bary = n => { const p = fe.filter(e => e.to === n.id).map(e => pos.get(e.from)).filter(v => v != null); return p.length ? p.reduce((s, v) => s + v, 0) / p.length : pos.get(n.id); };
  for (let pass = 0; pass < 2; pass++) L.forEach((ly, ri) => { if (!ly || !ri) return; ly.sort((a, b) => bary(a) - bary(b)); ly.forEach((n, i) => pos.set(n.id, i)); });
  const LR = dir === 'LR', gA = LR ? 90 : 70, gB = LR ? 40 : 50;
  const size = n => LR ? n.h : n.w;
  const sums = L.map(ly => ly ? ly.reduce((s, n) => s + size(n) + gB, -gB) : 0);
  const mx = Math.max(...sums, 0);
  let cur = 0;
  const snap = v => Math.round(v / gs) * gs;
  L.forEach((ly, ri) => {
    if (!ly) return;
    const th = Math.max(...ly.map(n => LR ? n.w : n.h));
    let q = (mx - sums[ri]) / 2;
    ly.forEach(n => {
      if (LR) { n.x = snap(cur + (th - n.w) / 2); n.y = snap(q); }
      else { n.x = snap(q); n.y = snap(cur + (th - n.h) / 2); }
      q += size(n) + gB;
    });
    cur += th + gA;
  });
}

/** Основная точка входа: dir='TB'|'LR'. Использует window.dagre при наличии. */
export function layeredAuto(dir = 'TB', opts = {}) {
  const ns = nodes();
  if (!ns.length) return toast('Нечего укладывать');
  if (window.dagre && window.dagre.graphlib) {
    try {
      const gr = new window.dagre.graphlib.Graph();
      gr.setGraph({ rankdir: dir, nodesep: opts.nodesep || 50, ranksep: opts.ranksep || 70 });
      gr.setDefaultEdgeLabel(() => ({}));
      ns.forEach(n => gr.setNode(n.id, { width: n.w, height: n.h }));
      edges().forEach(e => { if (e.from !== e.to) gr.setEdge(e.from, e.to); });
      window.dagre.layout(gr);
      ns.forEach(n => { const p = gr.node(n.id); n.x = Math.round(p.x - n.w / 2); n.y = Math.round(p.y - n.h / 2); });
    } catch (e) { simpleLayout(dir, opts.gs); }
  } else simpleLayout(dir, opts.gs);
  if (!opts.quiet) commit();
  if (opts.fit) opts.fit();
}
