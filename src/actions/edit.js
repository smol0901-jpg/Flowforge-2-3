/* FlowForge · actions/edit — мышь/тач: drag блоков, связывание, ресайз, waypoints, рамка выделения, жесты */
import { $, clamp } from '../core/util.js';
import { doc, camera, nodes, edges, groups, N, E, G, getSel, setSel, addSel, clearSel, setSelE, setSelG, getSelE, getTool, setTool, commit, scheduleSave, activeLayer } from '../core/state.js';
import { s2w, w2s, viewB, anchor, zoomBy, drawCam, markNewEdge, getRot, setRot } from '../render/canvas.js';
import { pt, NV } from '../render/geom.js';
import { resolveOverlaps } from '../render/nocross.js';
import { bus } from '../core/bus.js';
import { placingType, createAt, cancelPlacing } from '../ui/palette.js';

let svg;
let drag = null;         // {mode:'move'|'link'|'rs'|'wp'|'wm'|'pan'|'marq', ...}
let spaceDown = false;
let lastTap = 0, lastTapTarget = null;

export function initEdit(svgEl, cfg, statusFn) {
  svg = svgEl;
  bindPointer(cfg, statusFn);
  bindWheel(cfg, statusFn);
  bindKeys(cfg, statusFn);
  bus.on('nav:center', ([x, y]) => { const c = camera(); c.x = x; c.y = y; drawCam(cfg, statusFn); });
}

const snapV = (v, cfg) => cfg.snap ? Math.round(v / (cfg.gs || 20)) * (cfg.gs || 20) : Math.round(v);

function nodeAt(wx, wy) {
  const ns = nodes();
  for (let i = ns.length - 1; i >= 0; i--) {
    const n = ns[i];
    if (wx >= n.x && wx <= n.x + n.w && wy >= n.y && wy <= n.y + n.h) return n;
  }
  return null;
}

/* ---------- указатель ---------- */
function bindPointer(cfg, statusFn) {
  let pid = null;
  svg.addEventListener('pointerdown', e => {
    if (pid !== null) return;
    pid = e.pointerId;
    svg.setPointerCapture(pid);
    const r = svg.getBoundingClientRect();
    const [wx, wy] = s2w(e.clientX - r.left, e.clientY - r.top);
    const t = e.target;
    const dbl = Date.now() - lastTap < 320 && lastTapTarget === hitKey(t); lastTap = Date.now(); lastTapTarget = hitKey(t);

    /* жест 2-го пальца → pan/zoom отменяем drag */
    if (drag && drag.mode !== 'pan') { /* второй палец: ignore здесь, см. touch handlers ниже */ }

    if (t.dataset.rs) { // ресайз угла
      const [id, corner] = t.dataset.rs.split(':');
      const n = N(id); if (!n || n.lock) return;
      drag = { mode: 'rs', id, corner, n, sx: wx, sy: wy, ox: n.x, oy: n.y, ow: n.w, oh: n.h };
      return;
    }
    if (t.dataset.wp != null) { // перенос излома
      const [eid, k] = t.dataset.wp.split(':');
      const ed = E(eid); if (!ed) return;
      drag = { mode: 'wp', ed, k: +k };
      return;
    }
    if (t.dataset.wm != null) { // добавление излома копированием
      const [eid] = t.dataset.wm.split(':');
      const ed = E(eid); if (!ed) return;
      drag = { mode: 'wm', ed, sx: wx, sy: wy };
      return;
    }
    if (t.dataset.g) { // заголовок группы → двигает группу
      const g = G(t.dataset.g); if (!g) return;
      setSelG(g.id);
      drag = { mode: 'grp', g, ids: g.nodes.map(N).filter(Boolean), sx: wx, sy: wy, o: g.nodes.map(N).filter(Boolean).map(n => ({ n, x: n.x, y: n.y })) };
      return;
    }
    const nk = t.closest('[data-n]');
    if (nk) {
      const n = N(nk.dataset.n); if (!n) return;
      if (getTool() === 'link' || e.shiftKey) { startLink(n, cfg, statusFn); return; }
      if (!getSel().has(n.id)) { if (!(e.ctrlKey || e.metaKey)) clearSel(); addSel(n.id); }
      if (dbl && !n.lock) { bus.emit('edit:text', n.id); return; }
      if (placingType()) cancelPlacing();
      const sel = getSel();
      const ids = [...sel];
      drag = { mode: 'move', ids, set: new Set(ids), objs: ids.map(N).filter(Boolean).filter(x => !x.lock), o: ids.map(N).filter(Boolean).map(x => ({ n: x, x: x.x, y: x.y })), sx: wx, sy: wy, moved: false };
      window.__dragSet = drag.set;
      return;
    }
    const ek = t.closest('[data-e]');
    if (ek) { setSelE(ek.dataset.e); if (dbl) bus.emit('edit:edgelabel', ek.dataset.e); drawCam(cfg, statusFn); return; }

    /* пустое место */
    if (getTool() === 'pan' || spaceDown || e.button === 1) {
      drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, cx: camera().x, cy: camera().y };
      return;
    }
    if (placingType()) {
      createAt(placingType(), wx, wy);
      drawCam(cfg, statusFn);
      return;
    }
    drag = { mode: 'marq', x0: wx, y0: wy, add: e.ctrlKey || e.metaKey };
    clearSelSilent();
  });

  svg.addEventListener('pointermove', e => {
    if (!drag) { hoverStatus(e, cfg, statusFn); return; }
    const r = svg.getBoundingClientRect();
    const [wx, wy] = s2w(e.clientX - r.left, e.clientY - r.top);
    if (drag.mode === 'pan') {
      const c = camera(), a = -getRot(), ca = Math.cos(a), sa = Math.sin(a);
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      c.x = drag.cx - (ca * dx - sa * dy) / c.k; c.y = drag.cy - (sa * dx + ca * dy) / c.k;
      drawCam(cfg, statusFn); return;
    }
    if (drag.mode === 'move') {
      let dx = wx - drag.sx, dy = wy - drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      drag.o.forEach(({ n, x, y }) => { n.x = snapV(x + dx, cfg); n.y = snapV(y + dy, cfg); });
      drawCam(cfg, statusFn); return;
    }
    if (drag.mode === 'grp') {
      let dx = wx - drag.sx, dy = wy - drag.sy;
      drag.o.forEach(({ n, x, y }) => { n.x = snapV(x + dx, cfg); n.y = snapV(y + dy, cfg); });
      drawCam(cfg, statusFn); return;
    }
    if (drag.mode === 'rs') {
      const n = drag.n, c = drag.corner;
      let nx = drag.ox, ny = drag.oy, nw = drag.ow, nh = drag.oh;
      if (c.includes('e')) nw = Math.max(60, drag.ow + (wx - drag.sx));
      if (c.includes('s')) nh = Math.max(40, drag.oh + (wy - drag.sy));
      if (c.includes('w')) { nw = Math.max(60, drag.ow - (wx - drag.sx)); nx = drag.ox + drag.ow - nw; }
      if (c.includes('n')) { nh = Math.max(40, drag.oh - (wy - drag.sy)); ny = drag.oy + drag.oh - nh; }
      n.x = snapV(nx, cfg); n.y = snapV(ny, cfg); n.w = snapV(nw, cfg); n.h = snapV(nh, cfg);
      n.sw = n.w; n.sh = n.h;
      drawCam(cfg, statusFn); return;
    }
    if (drag.mode === 'wp') {
      const { ed, k } = drag;
      ed.pts[k] = [snapV(wx, cfg), snapV(wy, cfg)];
      drawCam(cfg, statusFn); return;
    }
    if (drag.mode === 'wm') {
      const { ed } = drag;
      if (Math.abs(wx - drag.sx) + Math.abs(wy - drag.sy) > 6) {
        const idx = insertPoint(ed, drag.sx, drag.sy);
        ed.pts[idx] = [snapV(wx, cfg), snapV(wy, cfg)];
        drag.wpIdx = idx; drag.mode = 'wp'; drag.k = idx;
      }
      drawCam(cfg, statusFn); return;
    }
    if (drag.mode === 'marq') {
      drag.x1 = wx; drag.y1 = wy;
      drawMarquee(drag, cfg, statusFn);
    }
  });

  const up = e => {
    if (!drag) return;
    const d = drag; drag = null;
    try { svg.releasePointerCapture(pid); } catch { }
    pid = null;
    if (d.mode === 'move' || d.mode === 'grp' || d.mode === 'rs' || d.mode === 'wp' || d.mode === 'wm') {
      window.__dragSet = null;
      if (d.mode === 'move' && d.moved && cfg.noover) resolveOverlaps(d.ids, nodes(), N);
      if (d.mode === 'wm' && d.ed) { /* точка уже вставлена */ }
      commit();
      bus.emit('draw:full', cfg);
    }
    if (d.mode === 'marq') {
      removeMarquee();
      const x0 = Math.min(d.x0, d.x1 ?? d.x0), x1 = Math.max(d.x0, d.x1 ?? d.x0);
      const y0 = Math.min(d.y0, d.y1 ?? d.y0), y1 = Math.max(d.y0, d.y1 ?? d.y0);
      const hit = nodes().filter(n => n.x < x1 && n.x + n.w > x0 && n.y < y1 && n.y + n.h > y0).map(n => n.id);
      if (hit.length) { setSel(hit); } else if (!d.add) clearSel();
      bus.emit('draw:full', cfg);
    }
  };
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  const hitKey = t => (t.closest?.('[data-n],[data-e],[data-g]')?.outerHTML || '').slice(0, 40);
}

function clearSelSilent() { /* без события — маркер перерисует кадром */ }

function insertPoint(ed, x, y) {
  const pts = ed.pts && ed.pts.length ? ed.pts.slice() : [[x, y]];
  // ближайший сегмент
  let bi = 0, bd = 1e18;
  for (let i = 0; i < pts.length - 1; i++) {
    const dd = distSeg(x, y, pts[i], pts[i + 1]);
    if (dd < bd) { bd = dd; bi = i; }
  }
  pts.splice(bi + 1, 0, [x, y]);
  ed.pts = pts;
  return bi + 1;
}
const distSeg = (px, py, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? clamp(((px - a[0]) * dx + (py - a[1]) * dy) / L, 0, 1) : 0;
  return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t);
};

/* режим связывания: тап по блоку A затем по B */
let linkFrom = null;
function startLink(n, cfg, statusFn) {
  if (!linkFrom) { linkFrom = n.id; setSel([n.id]); toastLink('Выберите второй блок'); }
  else if (linkFrom !== n.id) {
    const d = doc();
    if (!d.edges.some(e => e.from == linkFrom && e.to == n.id)) {
      const e = { id: nidEdge(), from: linkFrom, to: n.id, layer: d.activeLayer };
      d.edges.push(e);
      markNewEdge(e.id);
      commit();
    }
    linkFrom = null;
    bus.emit('draw:full', cfg);
  } else linkFrom = null;
}
const nidEdge = () => { let i = 1; const u = new Set(edges().map(e => String(e.id))); while (u.has('e' + i)) i++; return 'e' + i; };
let lt = 0;
function toastLink(m) { clearTimeout(lt); const el = document.createElement('div'); el.className = 'hint'; el.textContent = m; document.body.appendChild(el); lt = setTimeout(() => el.remove(), 1800); }

/* двойной тап по пустому месту на линии связи (dbl на [data-wm]) убирает излом */
svgDblCleanup();
function svgDblCleanup() {
  document.addEventListener('dblclick', e => {
    const wp = e.target.closest?.('[data-wp]');
    if (wp) {
      const [eid, k] = wp.dataset.wp.split(':');
      const ed = E(eid); if (ed && ed.pts) { ed.pts.splice(+k, 1); if (!ed.pts.length) delete ed.pts; commit(); bus.emit('draw:full', window.__cfg || {}); }
    }
  });
}

/* ---------- рамка выделения ---------- */
let mq = null;
function drawMarquee(d, cfg, statusFn) {
  if (!mq) { mq = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); mq.setAttribute('class', 'marq'); svg.appendChild(mq); }
  const a = w2s(Math.min(d.x0, d.x1 ?? d.x0), Math.min(d.y0, d.y1 ?? d.y0));
  const b = w2s(Math.max(d.x0, d.x1 ?? d.x0), Math.max(d.y0, d.y1 ?? d.y0));
  mq.setAttribute('x', a[0]); mq.setAttribute('y', a[1]);
  mq.setAttribute('width', b[0] - a[0]); mq.setAttribute('height', b[1] - a[1]);
}
const removeMarquee = () => { mq?.remove(); mq = null; };

/* ---------- колесо / pinch ---------- */
function bindWheel(cfg, statusFn) {
  let pinch = null;
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    if (e.ctrlKey) { // pinch-zoom на тачпадах
      zoomBy(Math.exp(-e.deltaY * .01), e.clientX - r.left, e.clientY - r.top, cfg, statusFn);
    } else if (e.shiftKey) { // горизонтальный пан
      camera().x += e.deltaY / camera().k; drawCam(cfg, statusFn);
    } else {
      zoomBy(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top, cfg, statusFn);
    }
  }, { passive: false });
  /* 2 пальца на touch-экране */
  const touches = new Map();
  svg.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      drag = null; window.__dragSet = null;
      const [a, b] = e.touches;
      pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), k: camera().k, mx: (a.clientX + b.clientX) / 2, my: (a.clientY + b.clientY) / 2, cx: camera().x, cy: camera().y };
    }
  }, { passive: true });
  svg.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && pinch) {
      e.preventDefault();
      const [a, b] = e.touches;
      const nd = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const r = svg.getBoundingClientRect();
      const f = clamp(nd / pinch.d, .2, 5);
      const nm = { x: (a.clientX + b.clientX) / 2 - r.left, y: (a.clientY + b.clientY) / 2 - r.top };
      const before = s2w(pinch.mx - r.left, pinch.my - r.top);
      camera().k = clamp(pinch.k * f, .05, 8);
      anchor(before[0], before[1], nm.x, nm.y);
      drawCam(cfg, statusFn);
    }
  }, { passive: false });
  svg.addEventListener('touchend', e => { if (e.touches.length < 2) pinch = null; }, { passive: true });
}

/* правый клик / alt+колесо → поворот листа */
export function bindRotateWheel(cfg, statusFn) {
  svg.addEventListener('wheel', e => {
    if (e.altKey) {
      e.preventDefault();
      setRot(getRot() + e.deltaY * .0007);
      drawCam(cfg, statusFn);
    }
  }, { passive: false });
}

/* ---------- клавиатура ---------- */
function bindKeys(cfg, statusFn) {
  addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (e.code === 'Space') { spaceDown = true; e.preventDefault(); }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); bus.emit('act:' + (e.shiftKey ? 'redo' : 'undo')); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); bus.emit('act:redo'); return; }
    if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); bus.emit('act:copy'); return; }
    if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); bus.emit('act:paste'); return; }
    if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); bus.emit('act:grp'); return; }
    if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); bus.emit('act:find'); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); bus.emit('act:save'); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); bus.emit('act:del'); return; }
    if (e.key === 'Escape') { cancelPlacing(); setTool('select'); clearSel(); bus.emit('draw:full', cfg); return; }
    if (e.key === 'v' || e.key === 'к') setTool('select');
    if (e.key === 'h' || e.key === 'р') setTool('pan');
    if (e.key === 'c' || e.key === 'с') setTool('link');
    if (e.key === 'f' || e.key === 'а') bus.emit('act:fit');
    if (e.key === '+' || e.key === '=') zoomBy(1.2, null, null, cfg, statusFn);
    if (e.key === '-') zoomBy(.83, null, null, cfg, statusFn);
    if (e.key.startsWith('Arrow')) {
      const sel = getSel(); if (!sel.size) return;
      e.preventDefault();
      const d = e.shiftKey ? 1 : (cfg.gs || 20) / (camera().k > 1 ? camera().k : 1);
      const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
      const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
      [...sel].map(N).filter(n => n && !n.lock).forEach(n => { n.x = Math.round(n.x + dx); n.y = Math.round(n.y + dy); });
      commit(); bus.emit('draw:full', cfg);
    }
  });
  addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
}

function hoverStatus(e, cfg, statusFn) { /* резерв под статус координат */ }
