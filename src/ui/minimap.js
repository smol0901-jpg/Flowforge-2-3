/* FlowForge · ui/minimap — мини-карта: обзор, рамка обзора, клик/драг для навигации */
import { $ } from '../core/util.js';
import { nodes, camera, setCamera } from '../core/state.js';
import { getSvgSize, viewB, getRot } from '../render/canvas.js';
import { bbox } from '../render/geom.js';
import { bus } from '../core/bus.js';

let mm = null, cfgRef = null, statusFn = null, dragMm = false;

export function initMinimap(cfg, statusFn2) {
  mm = $('#mm'); if (!mm) return;
  cfgRef = cfg; statusFn = statusFn2;
  const go = e => {
    const r = mm.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    const b = worldBox();
    goTo(b.x + b.w * px, b.y + b.h * py);
  };
  mm.addEventListener('pointerdown', e => { dragMm = true; mm.setPointerCapture(e.pointerId); go(e); });
  mm.addEventListener('pointermove', e => { if (dragMm) go(e); });
  mm.addEventListener('pointerup', () => dragMm = false);
  bus.on('draw:minimap', update);
}

function worldBox() {
  const ns = nodes();
  if (!ns.length) return { x: 0, y: 0, w: 1000, h: 700 };
  const b = bbox(ns);
  const pad = Math.max(80, b.w * .05);
  return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
}

function goTo(wx, wy) {
  setCamera({ x: wx, y: wy, k: camera().k });
  bus.emit('draw:cam', cfgRef);
}

export function update() {
  if (!mm || !cfgRef?.map) return;
  const [W, H] = getSvgSize();
  const vb = viewB(W, H);
  const b = worldBox();
  mm.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
  const sw = Math.max(4, b.w * .006), sh = Math.max(4, b.h * .006);
  let s = `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#0002"/>`;
  nodes().forEach(n => {
    s += `<rect x="${n.x}" y="${n.y}" width="${Math.max(6, n.w)}" height="${Math.max(4, n.h)}" rx="${sw}" fill="${n.color || '#89b4fa'}" opacity=".85"/>`;
  });
  s += `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="none" stroke="#fff" stroke-width="${sw * 2}" rx="${sw * 3}"/>`;
  mm.innerHTML = s;
}
