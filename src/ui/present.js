/* FlowForge · ui/present — режим презентации: пошаговый показ групп/слоёв/цепочек блоков */
import { nodes, groups, layers, doc, camera, setCamera, N } from '../core/state.js';
import { fitRect, getSvg } from '../render/canvas.js';
import { bbox } from '../render/geom.js';
import { esc, toast } from '../core/util.js';
import { bus } from '../core/bus.js';

let on = false, steps = [], si = -1, ov = null;

export function buildSteps() {
  const d = doc();
  steps = [];
  if (d.layers.filter(l => l.visible).length > 1) d.layers.forEach(l => {
    const ns = d.nodes.filter(n => n.layer === l.id);
    if (ns.length) steps.push({ name: 'Слой: ' + l.name, ids: ns.map(n => n.id) });
  });
  d.groups.forEach(g => { if (g.nodes.length) steps.push({ name: g.title, ids: g.nodes }); });
  if (!steps.length && d.nodes.length) {
    // цепочка от «начала»: обход в ширину по связям, кусками по 6 блоков
    const start = d.nodes.find(n => n.type === 'terminal') || d.nodes[0];
    const seen = new Set(), q = [start.id], order = [];
    while (q.length) { const u = q.shift(); if (seen.has(u)) continue; seen.add(u); order.push(u); d.edges.filter(e => e.from === u).forEach(e => q.push(e.to)); }
    d.nodes.forEach(n => { if (!seen.has(n.id)) order.push(n.id); });
    for (let i = 0; i < order.length; i += 6) steps.push({ name: `Часть ${Math.floor(i / 6) + 1}`, ids: order.slice(i, i + 6) });
  }
  return steps;
}

export function startPresent(cfg, statusFn) {
  buildSteps();
  if (!steps.length) return toast('Нечего показывать');
  on = true; si = -1;
  ov = document.createElement('div');
  ov.id = 'presentOv';
  ov.innerHTML = `<div class="pv-bar"><b id="pvName"></b><span><button id="pvPrev">◀</button><i id="pvNum"></i><button id="pvNext">▶</button><button id="pvX">✕ Выйти</button></span></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#pvPrev').onclick = () => step(-1, cfg, statusFn);
  ov.querySelector('#pvNext').onclick = () => step(1, cfg, statusFn);
  ov.querySelector('#pvX').onclick = () => endPresent();
  addEventListener('keydown', keyHandler);
  let tx = 0;
  ov.addEventListener('touchstart', e => { const x = e.touches[0].clientX; tx = x; }, { passive: true });
  ov.addEventListener('touchend', e => { const dx = (e.changedTouches[0]?.clientX ?? tx) - tx; if (dx < -40) step(1, cfg, statusFn); if (dx > 40) step(-1, cfg, statusFn); }, { passive: true });
  step(1, cfg, statusFn);
}
function keyHandler(e) { if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); bus.emit('present:next'); } if (e.key === 'ArrowLeft') bus.emit('present:prev'); if (e.key === 'Escape') endPresent(); }
export const isPresenting = () => on;

function step(d, cfg, statusFn) {
  si = Math.max(0, Math.min(steps.length - 1, si + d));
  const s = steps[si];
  const ns = s.ids.map(N).filter(Boolean);
  const b = bbox(ns);
  ov.querySelector('#pvName').textContent = s.name;
  ov.querySelector('#pvNum').textContent = `${si + 1}/${steps.length}`;
  fitRect(b.x, b.y, b.w, b.h, 1.8, .15, cfg, statusFn);
}

export function endPresent() {
  on = false;
  removeEventListener('keydown', keyHandler);
  ov?.remove(); ov = null;
  bus.emit('present:end');
}
