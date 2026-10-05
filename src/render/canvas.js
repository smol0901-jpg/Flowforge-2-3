/* FlowForge · render/canvas — SVG-сцена: viewport, culling, частичный рендер, экспорт */
import { NS, esc, dk, ink } from '../core/util.js';
import { doc, camera, getSel, getSelE, getSelG, nodes, edges, groups, N } from '../core/state.js';
import { geo, rpath, NV, pt, bbox, nodeSig, clearRouteCache } from './geom.js';
import { shp, defsSVG } from './shapes.js';
import { routeAll, getNoCrossState } from './nocross.js';

export const PAL = {
  dark: { bg: '#1e1e2e', dot: '#3a3c52', edge: '#89b4fa', txt: '#cdd6f4' },
  light: { bg: '#f6f7fb', dot: '#cdd2e2', edge: '#3b5bdb', txt: '#1f2430' },
  blue: { bg: '#0b3d91', dot: '#3b6bc2', edge: '#ffffff', txt: '#ffffff' },
  paper: { bg: '#fbf6e9', dot: '#ded3b5', edge: '#5c4a2a', txt: '#2b2315' },
  none: { bg: 'transparent', dot: '#88888866', edge: '#5c6bc0', txt: '#333333' }
};
export const DASH = { solid: '', dashed: '9 6', dotted: '0.1 7', dashdot: '12 6 0.1 6' };

const ANIM = new Map(), NANIM = new Map(), DUR = 420;
let svg, world, RB = null, full = true, rk0 = 1, NM = new Map();
let LIFT = 0, VEL = { x: 0, y: 0 }, PC = { x: 0, y: 0 };
let raf = 0, tkOn = false, animOn = false;
const REDUCE = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- координаты ---------- */
let rot = 0;                       // угол поворота камеры (радианы)
export const getRot = () => rot;
export const setRot = v => { rot = v; };
export const cr = () => rot;

export function s2w(px, py, c = camera()) {
  const r = -rot, ca = Math.cos(r), sa = Math.sin(r);
  const dx = px - c.px / 2, dy = py - c.py / 2;
  return [c.x + (ca * dx - sa * dy) / c.k, c.y + (sa * dx + ca * dy) / c.k];
}
export function w2s(wx, wy, c = camera()) {
  const r = rot, ca = Math.cos(r), sa = Math.sin(r);
  const x = (wx - c.x) * c.k, y = (wy - c.y) * c.k;
  return [c.px / 2 + ca * x - sa * y, c.py / 2 + sa * x + ca * y];
}

export function viewB(c = camera()) {
  const r = svg.getBoundingClientRect();
  c.px = r.width; c.py = r.height;
  const P = [[0, 0], [r.width, 0], [r.width, r.height], [0, r.height]].map(p => s2w(p[0], p[1], c));
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), P };
}

/* ---------- анимации ---------- */
export const markNewNode = id => { if (!REDUCE) { NANIM.set(id, performance.now()); animKick(); } };
export const markNewEdge = id => { if (!REDUCE) { ANIM.set(id, performance.now()); animKick(); } };
function animKick() { if (!animOn) { animOn = true; tickLoop(); } }
function tickLoop() { if (!animOn) return; animOn = !!(ANIM.size || NANIM.size); if (animOn) requestAnimationFrame(() => { drawCam(); }); }
export const tick = () => { /* совместимость */ };

/* ---------- инициализация ---------- */
export function initCanvas(svgEl) {
  svg = svgEl;
  world = document.createElementNS(NS, 'g');
  world.setAttribute('id', 'world');
  svg.appendChild(world);
}
export const getSvg = () => svg;

/* ---------- тело сцены ---------- */
function gbox(g) {
  const m = g.nodes.map(N).filter(Boolean);
  if (!m.length) return null;
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  m.forEach(n => { a = Math.min(a, n.x); b = Math.min(b, n.y); c = Math.max(c, n.x + n.w); d = Math.max(d, n.y + n.h); });
  const p = 24, hh = 28;
  return { x: a - p, y: b - p - hh, w: c - a + 2 * p, h: d - b + 2 * p + hh, hh };
}
function tipAt(d, f) {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  const L = p.getTotalLength(), a = p.getPointAtLength(L * f), b = p.getPointAtLength(Math.max(0, L * f - 3));
  return { x: a.x.toFixed(1), y: a.y.toFixed(1), a: (Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI).toFixed(1) };
}
const clampv = v => Math.max(-9, Math.min(9, v));
function shT(l) {
  const k = camera().k, a = -rot, ca = Math.cos(a), sa = Math.sin(a);
  const x = 2 + LIFT * 5 + (l > 1 ? 4 : 0) - clampv(VEL.x * .3), y = 4 + LIFT * 9 + (l > 1 ? 7 : 0) - clampv(VEL.y * .3);
  return `translate(${((ca * x - sa * y) / k).toFixed(2)} ${((sa * x + ca * y) / k).toFixed(2)})`;
}

/**
 * Генерирует innerHTML мира. ex=true → «экспортный» режим (без хуков/анимаций/выделений).
 */
export function body(ex, cfg, dragSet) {
  const P = PAL[cfg.bg] || PAL.dark, lb = P.bg == 'transparent' ? '#ffffff' : P.bg;
  const cam = camera(), k0 = cam.k, now = performance.now();
  const vis = (x, y, w, h) => ex || !RB || (x < RB.x + RB.w && x + w > RB.x && y < RB.y + RB.h && y + h > RB.y);
  const flowOK = cfg.flow && !ex && edges().length <= 200;
  const fph = ((now / 1000) % .9).toFixed(3);
  const sel = getSel(), selE = getSelE(), selG = getSelG();
  const MC = new Set([P.edge]);
  let o = '', hd = '';
  const nc = getNoCrossState();
  routeAll(nodes(), edges(), NM, cfg, dragSet ? true : false);
  const ncS = getNoCrossState();

  const vn = nodes().filter(n => vis(n.x, n.y, n.w, n.h));
  const rich = cfg.depth && (ex || (k0 >= .4 && vn.length <= 100));
  const trace = cfg.trace && !ex;
  let hn = null, he = null;
  if (trace) {
    if (sel.size == 1) { const id = [...sel][0]; hn = new Set([id]); he = new Set(); edges().forEach(e => { if (e.from == id || e.to == id) { he.add(e.id); hn.add(e.from); hn.add(e.to); } }); }
    else if (selE) { const x = edges().find(e => e.id == selE); if (x) { hn = new Set([x.from, x.to]); he = new Set([x.id]); } }
  }

  /* группы */
  groups().forEach(gp => {
    const r = gbox(gp); if (!r || !vis(r.x, r.y, r.w, r.h)) return;
    const on = !ex && selG == gp.id, c = gp.color || '#89b4fa';
    o += `<g><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="14" fill="${c}" fill-opacity=".07" stroke="${on ? '#f9e2af' : c}" stroke-width="${on ? 2.6 : 1.8}" ${on ? '' : 'stroke-dasharray="8 5"'} pointer-events="none"/><rect data-g="${gp.id}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.hh}" rx="14" fill="${c}" fill-opacity=".22"/><text x="${r.x + 14}" y="${r.y + 19}" font-size="13" font-weight="700" fill="${P.txt}" pointer-events="none">${esc(gp.title)}</text></g>`;
  });

  /* связи */
  edges().forEach(e => {
    const a = NM.get(e.from), b = NM.get(e.to); if (!a || !b) return;
    const on = !ex && selE == e.id;
    if (!on && !ex) {
      let X0 = Math.min(a.x, b.x), Y0 = Math.min(a.y, b.y), X1 = Math.max(a.x + a.w, b.x + b.w), Y1 = Math.max(a.y + a.h, b.y + b.h);
      if (e.pts) for (const v of e.pts) { X0 = Math.min(X0, v[0]); X1 = Math.max(X1, v[0]); Y0 = Math.min(Y0, v[1]); Y1 = Math.max(Y1, v[1]); }
      if (!vis(X0 - 260, Y0 - 260, X1 - X0 + 520, Y1 - Y0 + 520)) return;
    }
    const q = geo(e, NM, cfg); if (!q) return;
    const col = e.color || P.edge, w = e.width || 2, dm = DASH[e.dash || 'solid'], ar = e.arrow || 'end';
    const mk = on ? 'ahs' : 'ah' + col.slice(1), sc = on ? '#f9e2af' : col;
    const dim2 = he && !he.has(e.id), hi = he && he.has(e.id) && !on, sw = on ? w + 1 : hi ? w + .8 : w;
    MC.add(col);
    let pr = 1;
    if (!ex) { const t0 = ANIM.get(e.id); if (t0 !== undefined) pr = Math.max(0, Math.min(1, (now - t0) / DUR)); }
    const ea = 1 - Math.pow(1 - pr, 3), an = pr < 1;
    let ln;
    if (an && !dm) {
      ln = `<path d="${q.d}" pathLength="1" fill="none" stroke="${sc}" stroke-width="${sw}" stroke-linejoin="round" stroke-dasharray="1 1" stroke-dashoffset="${(1 - ea).toFixed(4)}"/>`;
      if (ar != 'none' && ea > .03) { const t = tipAt(q.d, ea); ln += `<path d="M-11 -6L1 0L-11 6z" transform="translate(${t.x} ${t.y}) rotate(${t.a}) scale(${w / 2})" fill="${sc}"/>`; }
    } else ln = `<path d="${q.d}" fill="none" stroke="${sc}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${dm ? `stroke-dasharray="${dm}"` : ''} ${ar != 'none' ? `marker-end="url(#${mk})"` : ''} ${ar == 'both' ? `marker-start="url(#${mk})"` : ''} ${an ? `opacity="${ea.toFixed(3)}"` : ''}/>`;
    const fl = flowOK && !an && !dm ? `<path class="fl" d="${q.d}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="${w}" stroke-dasharray="3 13" stroke-linecap="round" style="animation-delay:-${fph}s"/>` : '';
    let lab = '';
    if (e.label) {
      const lw = Math.max(26, e.label.length * 8 + 14);
      lab = `<g${an ? ` opacity="${(ea * ea).toFixed(3)}"` : ''}><rect x="${q.m[0] - lw / 2}" y="${q.m[1] - 23}" width="${lw}" height="20" rx="8" fill="${lb}" fill-opacity=".92" stroke="${sc}" stroke-opacity=".4"/><text x="${q.m[0]}" y="${q.m[1] - 9}" text-anchor="middle" font-size="13" font-weight="700" fill="${P.txt}">${esc(e.label)}</text></g>`;
    }
    o += `<g data-e="${e.id}"${dim2 ? ' opacity=".25"' : ''}><path d="${q.d}" fill="none" stroke="transparent" stroke-width="24"/>${ln}${fl}${lab}</g>`;
    if (on) {
      const hk = 1 / Math.max(.6, Math.min(k0, 1.5));
      (e.pts || []).forEach((v, i) => hd += `<circle data-wp="${e.id}:${i}" cx="${v[0]}" cy="${v[1]}" r="${8 * hk}" fill="#f9e2af" stroke="#1e1e2e" stroke-width="${2 * hk}" style="cursor:move"/>`);
      (q.hm || [q.m]).forEach((v, i) => hd += `<circle data-wm="${e.id}:${i}" cx="${v[0]}" cy="${v[1]}" r="${6 * hk}" fill="#1e1e2e" stroke="#f9e2af" stroke-width="${2 * hk}" opacity=".9" style="cursor:copy"/>`);
    }
  });

  /* пересечения (ножки) */
  if (cfg.nocross && !ex && ncS.active) {
    const rr = 6 / Math.max(.6, Math.min(k0, 1.5));
    ncS.crossings.forEach(v => o += `<circle cx="${v[0]}" cy="${v[1]}" r="${rr}" fill="none" stroke="#f38ba8" stroke-width="2" pointer-events="none"/>`);
  }

  /* тени объёма */
  if (rich) {
    const s1 = vn.filter(n => !dragSet || !dragSet.has(n.id)).map(n => shp(n, '#000', '#000', 9)).join('');
    const s2 = dragSet ? vn.filter(n => dragSet.has(n.id)).map(n => shp(n, '#000', '#000', 9)).join('') : '';
    o += `<g fill-opacity=".26" stroke-opacity=".08" stroke-linejoin="round" pointer-events="none" transform="${ex ? 'translate(3 5)' : shT(1)}">${s1}</g>` + (s2 ? `<g fill-opacity=".2" stroke-opacity=".07" stroke-linejoin="round" pointer-events="none" transform="${shT(2)}">${s2}</g>` : '');
  }

  /* узлы */
  nodes().forEach(n => {
    if (!vis(n.x, n.y, n.w, n.h) && !sel.has(n.id)) return;
    const on = !ex && (sel.has(n.id)), dr = dragSet && dragSet.has(n.id);
    const f = n.color || (n.fillHint || '#89b4fa'), cx = n.x + n.w / 2, cy = n.y + n.h / 2;
    const fs = n.fs || 14, lh = fs * 1.32, lines = n._lines || [];
    const y0 = cy - (lines.length - 1) * lh / 2 + fs * .36;
    const bd = n.bd, sc = on ? '#f9e2af' : bd == 'none' ? 'none' : dk(f);
    const swd = on ? 3 : bd == 'thick' ? 3.2 : bd == 'thin' ? .9 : 1.6;
    const da = bd == 'dashed' ? '7 4' : bd == 'dotted' ? '1.5 4' : '';
    let tr = '', dimN = hn && !hn.has(n.id);
    const t0 = ex ? undefined : NANIM.get(n.id);
    if (t0 !== undefined) {
      const p = Math.max(0, Math.min(1, (now - t0) / 220)), e = 1 - Math.pow(1 - p, 3), s = .82 + .18 * e;
      tr = ` transform="translate(${cx} ${cy}) scale(${s.toFixed(3)}) translate(${-cx} ${-cy})" opacity="${e.toFixed(2)}"`;
    } else if (dr) tr = ` transform="translate(${(-2 / k0).toFixed(2)} ${(-3 / k0).toFixed(2)})"`;
    o += `<g data-n="${n.id}"${tr}${dimN && !tr ? ' opacity=".5"' : ''}>${on ? `<g opacity=".3" stroke-linejoin="round">${shp(n, 'none', '#f9e2af', 9)}</g>` : ''}${shp(n, f, sc, swd, da)}${rich ? shp(n, 'url(#gl)', 'none', 0) : ''}<text font-size="${fs}" font-weight="600" text-anchor="middle" fill="${ink(f)}">${lines.map((s, i) => `<tspan x="${cx}" y="${(y0 + i * lh).toFixed(1)}">${esc(s)}</tspan>`).join('')}</text>${n.lock && !ex ? `<text x="${n.x + n.w - 16}" y="${n.y + 15}" font-size="11">🔒</text>` : ''}</g>`;
    if (t0 !== undefined && now - t0 > 260) NANIM.delete(n.id);
  });
  if (ANIM.size) for (const [id, t] of ANIM) if (now - t > DUR + 80) ANIM.delete(id);

  /* ручки привязки и ресайза */
  if (!ex && sel.size == 1) {
    const n = N([...sel][0]);
    if (n) ['r', 'l', 't', 'b'].forEach(s => { const [px, py] = pt(n, s); o += `<circle data-p="${n.id}" data-s="${s}" cx="${px}" cy="${py}" r="${9 / Math.max(.6, Math.min(k0, 1.5))}" fill="#f9e2af" stroke="#1e1e2e" stroke-width="2"/>`; });
    if (n && !n.lock) {
      const k = 1 / Math.max(.6, Math.min(k0, 1.5)), z = 12 * k;
      [['nw', n.x, n.y, 'nwse'], ['ne', n.x + n.w, n.y, 'nesw'], ['sw', n.x, n.y + n.h, 'nesw'], ['se', n.x + n.w, n.y + n.h, 'nwse']].forEach(([c, x, y, cu]) => o += `<rect data-rs="${n.id}:${c}" x="${x - z / 2}" y="${y - z / 2}" width="${z}" height="${z}" rx="${3 * k}" fill="#89b4fa" stroke="#1e1e2e" stroke-width="${1.6 * k}" style="cursor:${cu}-resize"/>`);
    }
  }
  return o + hd;
}

/* ---------- полный / быстрый рендер ---------- */
let lastFullKey = '';
function fullRender(c, cfg) {
  full = false; rk0 = c.k;
  const vb = viewB(c);
  const mx = vb.w * .6, my = vb.h * .6;
  RB = { x: vb.x - mx, y: vb.y - my, w: vb.w + 2 * mx, h: vb.h + 2 * my };
  NM = new Map(nodes().map(n => [n.id, n]));
  const P = PAL[cfg.bg] || PAL.dark;
  const b = body(false, cfg, window.__dragSet || null);
  const MC = new Set([P.edge]);
  edges().forEach(e => MC.add(e.color || P.edge));
  world.innerHTML = defsSVG(MC) + b;
  applyView(c, P);
  lastFullKey = viewKey(c);
}
const viewKey = c => `${c.x}|${c.y}|${c.k}|${rot}`;
function applyView(c, P) {
  const r = svg.getBoundingClientRect();
  c.px = r.width; c.py = r.height;
  const cx = r.width / 2, cy = r.height / 2;
  world.setAttribute('transform', `translate(${cx} ${cy}) rotate(${(rot * 180 / Math.PI).toFixed(2)}) scale(${c.k}) translate(${-c.x} ${-c.y})`);
  svg.style.background = P.bg == 'transparent' ? '' : P.bg;
  svg.classList.toggle('chk', P.bg == 'transparent');
  const dw = Math.max(14, 26 * c.k), op = c.k < .5 ? .35 : .8;
  svg.style.backgroundImage = P.dot ? `radial-gradient(${P.dot} 1.2px, transparent 1.4px)` : '';
  svg.style.backgroundSize = `${dw}px ${dw}px`;
  svg.style.backgroundPosition = `${(cx - c.x * c.k)}px ${(cy - c.y * c.k)}px`;
}
function fastCam(c) { applyView(c, PAL[(window.__cfg && window.__cfg.bg) || 'dark']); }

/** Главный кадр: перерисовка или только трансформация камеры */
export function frame(cfg, statusFn) {
  raf = 0;
  const c = camera();
  VEL.x = VEL.x * .55 + (c.x - PC.x) * .45; VEL.y = VEL.y * .55 + (c.y - PC.y) * .45;
  PC = { x: c.x, y: c.y };
  const vb = viewB(c);
  const inside = RB && !full && vb.x >= RB.x && vb.y >= RB.y && vb.x + vb.w <= RB.x + RB.w && vb.y + vb.h <= RB.y + RB.h && Math.abs(c.k / rk0 - 1) < .35 && (c.k < .5) == (rk0 < .5);
  if (inside && viewKey(c) !== lastFullKey) fastCam(c); else fullRender(c, cfg);
  if (statusFn) statusFn(c);
}
export const draw = (cfg, statusFn) => { full = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => frame(cfg, statusFn)); tickAnim(cfg, statusFn); };
export const drawCam = (cfg, statusFn) => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => frame(cfg, statusFn)); };
function tickAnim(cfg, statusFn) {
  clearTimeout(tkOn);
  const loop = () => {
    const now = performance.now();
    const busy = [...ANIM.values()].some(t => now - t < DUR + 100) || [...NANIM.values()].some(t => now - t < 300);
    if (busy) { full = true; frame(cfg, statusFn); tkOn = setTimeout(loop, 50); }
  };
  tkOn = setTimeout(loop, 60);
}

/* ---------- мини-карта ---------- */
export function miniData() {
  const ns = nodes();
  if (!ns.length) return null;
  const b = bbox(ns);
  return { x: b.x, y: b.y, w: b.w, h: b.h };
}
export function visibleRect() { try { return viewB(camera()); } catch { return null; } }

/* ---------- вписывание/зум ---------- */
export function fitRect(x, y, w, h, maxk = 1.6, mink = .15, cfg, statusFn) {
  const r = svg.getBoundingClientRect(), a = rot, ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
  const W = Math.max(1, w * ca + h * sa), H = Math.max(1, w * sa + h * ca);
  const c = camera();
  c.k = Math.max(mink, Math.min(maxk, Math.min((r.width - 60) / W, (r.height - 60) / H)));
  anchor(x + w / 2, y + h / 2, r.width / 2, r.height / 2);
  draw(cfg, statusFn);
}
export function fitAll(cfg, statusFn) { const b = bbox(nodes()); fitRect(b.x, b.y, b.w, b.h, 1.6, .15, cfg, statusFn); }
export function anchor(wx, wy, sx, sy) {
  const c = camera(), r = -rot, ca = Math.cos(r), sa = Math.sin(r);
  const dx = sx - c.px / 2, dy = sy - c.py / 2;
  c.x = wx - (ca * dx - sa * dy) / c.k;
  c.y = wy - (sa * dx + ca * dy) / c.k;
}
export function zoomBy(f, cx, cy, cfg, statusFn) {
  const c = camera(), r = svg.getBoundingClientRect();
  cx = cx ?? r.width / 2; cy = cy ?? r.height / 2;
  const before = s2w(cx, cy, c);
  c.k = Math.max(.05, Math.min(8, c.k * f));
  anchor(before[0], before[1], cx, cy);
  drawCam(cfg, statusFn);
}

/* ---------- экспорт ---------- */
export function exportSVGString(cfg, opts = {}) {
  const b = bbox(nodes());
  const pad = 40, W = Math.round(b.w + pad * 2), H = Math.round(b.h + pad * 2);
  NM = new Map(nodes().map(n => [n.id, n]));
  const oldRB = RB; RB = null;
  const inner = body(true, cfg, null);
  RB = oldRB;
  const P = PAL[cfg.bg] || PAL.dark;
  const MC = new Set([P.edge]);
  edges().forEach(e => MC.add(e.color || P.edge));
  const xml = `<svg xmlns="${NS}" viewBox="${b.x - pad} ${b.y - pad} ${W} ${H}" width="${opts.w || W}" height="${opts.h || H}"><rect x="${b.x - pad}" y="${b.y - pad}" width="${W}" height="${H}" fill="${P.bg}"/>${defsSVG(MC)}${inner}</svg>`;
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
}

export async function exportPNG(cfg, scale = 2) {
  const str = exportSVGString(cfg);
  const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const b = bbox(nodes()), pad = 40;
    const cv = document.createElement('canvas');
    cv.width = Math.min(12000, Math.round((b.w + pad * 2) * scale));
    cv.height = Math.min(12000, Math.round((b.h + pad * 2) * scale));
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return await new Promise(res => cv.toBlob(res, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
