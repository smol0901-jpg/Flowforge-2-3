/* FlowForge Studio v3 · app.js — точка входа: связывает модули, действия и цикл отрисовки */
import { $, $$, esc, toast, LS, clamp } from './core/util.js';
import { bus } from './core/bus.js';
import {
  doc, setDoc, applyDoc, serialize, camera, setCamera, commit, undo, redo, canUndo, canRedo,
  getSel, clearSel, setTool, getTool, scheduleSave, loadSession, N, E, G, nodes, edges
} from './core/state.js';
import { dimAll } from './render/dims.js';
import { draw, fitRect, zoomBy, anchor, s2w, w2s, viewB, getSvgSize, getRot, setRot, markNewEdge } from './render/canvas.js';
import { bbox } from './render/geom.js';
import { resolveOverlaps } from './render/nocross.js';
import { layout } from './actions/layout.js';
import { lintGo } from './actions/lint.js';
import { importText, importFile, tplObj, promptTxt } from './actions/importers.js';
import { svgStr, canvas as toCanvas, dlBlob, copyPng, NM } from './actions/exporters.js';
import { linkUrl } from './actions/share.js';
import { initEdit, bindRotateWheel } from './actions/edit.js';
import { initInline } from './actions/inline.js';
import { copySel, pasteBuf } from './actions/clipboard.js';
import { initToast } from './ui/toast.js';
import { initPalette, placingType, cancelPlacing } from './ui/palette.js';
import { initInspector, insp, dupSel, delSel, lockSel, frontSel, backSel, alignSel, mkGroup, ungrp, sizeFix, autoSize, sizeStep } from './ui/inspector.js';
import { initLayers } from './ui/layers.js';
import { initChecklists } from './ui/checklists.js';
import { initFind, toggleFind } from './ui/find.js';
import { initMenu, tab, openMenu, syncUI, saveCurrentProject, backupAll } from './ui/menu.js';
import { initMinimap, update as mmUpdate } from './ui/minimap.js';
import { startPresent, endPresent, isPresenting } from './ui/present.js';
import { showCtx, hideCtx } from './ui/ctxmenu.js';

export const VER = '3.0.0';

const cfg = {
  bg: 'dark', snap: true, sig: true, sc: 2, route: 'curve', map: true, grid: true, guides: true,
  depth: true, flow: false, splash: true, nocross: false, noover: false, rad: 10, gs: 20, trace: true,
  ...LS('ffCfg', {})
};
window.__cfg = cfg;
const cfgSave = () => { try { localStorage.ffCfg = JSON.stringify(cfg); } catch { } };

let svgEl, rafPending = false, fullPending = true;

/* ---------- статус/HUD ---------- */
function statusFn() {
  const i = $('#info'); if (!i) return;
  i.textContent = `${Math.round(camera().k * 100)}%`;
  const pnl = $('#pnl'); if (pnl) pnl.textContent = doc().name || 'Без названия';
  const ub = $('[data-a="undo"]'), rb = $('[data-a="redo"]');
  if (ub) ub.classList.toggle('dim', !canUndo());
  if (rb) rb.classList.toggle('dim', !canRedo());
}

/* ---------- цикл отрисовки ---------- */
function invalidate(full) {
  if (full) fullPending = true;
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const f = fullPending; fullPending = false;
    draw(f ? {} : { lite: true }, cfg, statusFn);
    mmUpdate();
  });
}
bus.on('draw:full', () => invalidate(true));
bus.on('ui:redraw-lite', () => invalidate(false));
bus.on('draw:cam', () => invalidate(false));
bus.on('state:doc', () => { invalidate(true); scheduleSave(saveSessionSilent); });
bus.on('state:sel', () => invalidate(true));
bus.on('layout:auto', c => doLayout('TB'));

function saveSessionSilent() {
  scheduleSave(async () => {
    try {
      const body = JSON.stringify(serialize(true));
      await storeSession(body);
    } catch { }
  });
}

async function storeSession(body) {
  const { putRaw } = await import('./storage/idb.js');
  await putRaw('session', { d: body, t: Date.now() }).catch?.(() => { });
  try { localStorage.setItem('ffLast', body.slice(0, 900000)); } catch { }
}

/* ---------- фон/палитра тем ---------- */
import { PAL, BGN } from './render/grid.js';
function buildBgButtons() {
  const box = $('#bgs'); if (!box) return;
  box.innerHTML = Object.keys(PAL).map(k => `<button data-bg="${k}" style="background:${k == 'none' ? 'conic-gradient(#8885 25%,#0000 0 50%,#8885 0 75%,#0000 0) 0 0/12px 12px,#2a2a3a' : PAL[k].bg};color:${k == 'none' ? '#fff' : '#111'}">${BGN[k] || k}</button>`).join('');
}

/* ---------- действия ---------- */
function fit(c = cfg) { const b = bbox(nodes()); if (!b) return; fitRect(b.x, b.y, b.w, b.h, 1.8, .12, c, statusFn); }
function doLayout(dir) { layout(dir, cfg, invalidate.bind(null, true), statusFn); }

const ACT = {
  undo() { undo() ? (dimAll(), invalidate(true), statusFn(), toast('↶ Отменено')) : toast('Нечего отменять'); },
  redo() { redo() ? (dimAll(), invalidate(true), statusFn(), toast('↷ Повторено')) : toast('Нечего повторять'); },
  fit: () => fit(),
  del: () => delSel(),
  zin: () => zoomBy(1.25, null, null, cfg, statusFn),
  zout: () => zoomBy(.8, null, null, cfg, statusFn),
  menu: () => openMenu('file'),
  grp: () => mkGroup(),
  ungrp: () => ungrp(),
  dup: () => dupSel(),
  rev() { const e = E(window.__selE || ''); if (e) { [e.from, e.to] = [e.to, e.from]; commit(); invalidate(true); } },
  resetc() { getSel().forEach(id => delete N(id).color); commit(); invalidate(true); insp(); },
  resetec() { const e = E(window.__selE); if (e) { delete e.color; commit(); invalidate(true); } },
  lock: () => lockSel(),
  front: () => frontSel(),
  back: () => backSel(),
  autosz: () => autoSize(),
  sizefix: () => sizeFix(),
  sizeplus: () => sizeStep(1),
  sizeminus: () => sizeStep(-1),
  bg() { const ks = Object.keys(PAL), n = ks[(ks.indexOf(cfg.bg) + 1) % ks.length]; setCfg('bg', n); toast('Фон: ' + (BGN[n] || n)); },
  route() { const ks = ['curve', 'ortho', 'line'], n = ks[(ks.indexOf(cfg.route) + 1) % 3]; setCfg('route', n); toast('Линии: ' + n); },
  map: () => setCfg('map', !cfg.map),
  new() { saveCurrentProject(); applyDoc({ format: 'flowforge', version: '3.0', name: 'Новая схема', nodes: [], edges: [] }); commit(); invalidate(true); toast('Новая схема создана'); },
  demo() { importText(JSON.stringify(tplObj()), cfg, () => invalidate(true)); doLayout('TB'); },
  tb: () => doLayout('TB'),
  lr: () => doLayout('LR'),
  open: () => $('#fi')?.click(),
  save: () => saveCurrentProject(),
  json: () => dlBlob(new Blob([JSON.stringify(serialize(true), null, 2)], { type: 'application/json' }), 'schema.json'),
  png: async () => { const c = await toCanvas(+cfg.sc); c.toBlob(b => dlBlob(b, 'schema.png')); },
  copypng: () => copyPng(+cfg.sc),
  svg: () => { NM.reset(); const { s } = svgStr(); dlBlob(new Blob([s], { type: 'image/svg+xml' }), 'schema.svg'); },
  pdf: async () => {
    if (!window.jspdf) return toast('PDF: нужна сеть для jsPDF (или установите офлайн-модуль)');
    const { c, w, h } = await toCanvas(2, true);
    const d = new window.jspdf.jsPDF({ orientation: w > h ? 'l' : 'p', unit: 'px', format: [w, h] });
    d.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, w, h); d.save('schema.pdf');
  },
  share: async () => {
    const { c } = await toCanvas(2);
    c.toBlob(b => {
      const f = new File([b], 'flowforge.png', { type: 'image/png' });
      (navigator.canShare && navigator.canShare({ files: [f] })) ? navigator.share({ files: [f], title: doc().name }).catch(() => { }) : dlBlob(b, 'flowforge.png');
    });
  },
  link: () => { const u = linkUrl(serialize(false)); navigator.clipboard.writeText(u).then(() => toast('🔗 Ссылка скопирована')); },
  backup: () => backupAll(cfg),
  prompt: () => navigator.clipboard.writeText(promptTxt()).then(() => toast('📋 Промпт скопирован')),
  tpl: () => dlBlob(new Blob([JSON.stringify(tplObj(), null, 2)], { type: 'application/json' }), 'flowforge-template.json'),
  report() {
    const t = `FlowForge v${VER}\n${navigator.userAgent}\nЭкран: ${innerWidth}x${innerHeight} dpr ${devicePixelRatio}\nБлоков: ${nodes().length}, связей: ${edges().length}\nФон: ${cfg.bg}, линии: ${cfg.route}`;
    navigator.clipboard.writeText(t).then(() => toast('📎 Скопировано для отчёта'));
  },
  view() { document.body.classList.toggle('viewmode'); toast(document.body.classList.contains('viewmode') ? 'Просмотр вкл.' : 'Просмотр выкл.'); },
  lint: () => lintGo(cfg, invalidate.bind(null, true)),
  find: () => toggleFind(),
  install: () => window.dp && window.dp.prompt().then(r => { if (r.outcome === 'accepted') window.dp = null; }),
  present: () => startPresent(cfg, statusFn),
  ctxbtn: () => { const b = $('#hud button[data-a="ctxbtn"]'); const r = b.getBoundingClientRect(); showCtx(r.left - 180, r.bottom + 6, [...getSel()][0]); },
  inspmin() { const p = $('#insp'); if (p) p.classList.toggle('min'); },
  fclose() { const f = $('#find'); if (f) f.hidden = true; },
  lintx() { const l = $('#lintp'); if (l) l.hidden = true; },
  copy: () => copySel(),
  paste: () => pasteBuf()
};
bus.on('act:undo', ACT.undo); bus.on('act:redo', ACT.redo); bus.on('act:del', ACT.del);
bus.on('act:copy', ACT.copy); bus.on('act:paste', ACT.paste); bus.on('act:grp', ACT.grp);
bus.on('act:fit', ACT.fit); bus.on('act:find', ACT.find); bus.on('act:save', ACT.save);
bus.on('act:front', ACT.front); bus.on('act:back', ACT.back); bus.on('act:rev', ACT.rev);

function setCfg(k, v) { cfg[k] = v; cfgSave(); syncUI(cfg); invalidate(k !== 'map'); if (k == 'bg') document.body.dataset.bg = v; }
bus.on('cfg:set', ([k, v]) => setCfg(k, v));

/* ---------- глобальные обработчики кнопок разметки ---------- */
document.addEventListener('click', e => {
  const a = e.target.closest('[data-a]');
  if (a && ACT[a.dataset.a]) { ACT[a.dataset.a](); if (a.closest('#menu') && !a.hasAttribute('data-keep')) $('#menu')?.close(); return; }
  const t = e.target.closest('[data-t]');
  if (t) { setTool(t.dataset.t); $$('#top [data-t]').forEach(b => b.classList.toggle('on', b === t)); return; }
  const al = e.target.closest('[data-al]');
  if (al) { alignSel(al.dataset.al); invalidate(false); return; }
});
document.addEventListener('contextmenu', e => {
  if (e.target.closest('#cv')) { e.preventDefault(); showCtx(e.clientX, e.clientY, e.target.closest('[data-n]')?.dataset.n); }
});
let pressT = null;
document.addEventListener('pointerdown', e => { if (e.target.closest('#cv')) pressT = setTimeout(() => { showCtx(e.clientX, e.clientY, e.target.closest('[data-n]')?.dataset.n); }, 550); });
document.addEventListener('pointerup', () => clearTimeout(pressT));
document.addEventListener('pointercancel', () => clearTimeout(pressT));

/* импорт файла */
$('#fi')?.addEventListener('change', e => importFile(e.target.files[0], cfg, () => { dimAll(); invalidate(true); fit(); }));
$('#pasteGo')?.addEventListener('click', () => {
  const v = $('#pasteBox').value.trim(); if (!v) return;
  importText(v, cfg, () => { dimAll(); invalidate(true); doLayout('TB'); $('#menu')?.close(); });
});

/* drag&drop файла на окно */
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0]) importFile(e.dataTransfer.files[0], cfg, () => { dimAll(); invalidate(true); fit(); }); });

/* PWA install prompt */
addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.dp = e; $('#instBox') && ($('#instBox').hidden = false); });

/* service worker */
if ('serviceWorker' in navigator && location.protocol != 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));

/* ---------- запуск ---------- */
async function boot() {
  initToast();
  svgEl = $('#cv');
  initPalette($('#pal'));
  initInspector();
  initLayers($('#layersP') || undefined);
  initChecklists($('#clPanel') || mkPanel('clPanel'));
  initFind();
  initMenu(cfg, ACT);
  initMinimap(cfg, statusFn);
  initEdit(svgEl, cfg, statusFn);
  bindRotateWheel(cfg, statusFn);
  initInline(cfg, statusFn);
  buildBgButtons();
  document.body.dataset.bg = cfg.bg;
  syncUI(cfg);
  // восстановление сессии
  let body = null;
  try { body = localStorage.getItem('ffLast'); } catch { }
  if (!body) {
    const { getRaw } = await import('./storage/idb.js');
    const rec = await getRaw?.('session'); if (rec?.d) body = rec.d;
  }
  if (body) { try { applyDoc(JSON.parse(body)); } catch { } }
  else applyDoc({ format: 'flowforge', version: '3.0', name: 'Моя первая схема', nodes: [], edges: [] });
  dimAll();
  invalidate(true);
  if (!nodes().length) toast('Выберите фигуру слева и кликните по холсту, чтобы начать');
  statusFn();
  addEventListener('resize', () => invalidate(false));
  bus.on('link:start', id => { setTool('link'); $$('#top [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t == 'link')); });
  bus.on('present:end', () => invalidate(true));
}

function mkPanel(id) { const d = document.createElement('aside'); d.id = id; d.className = 'floatp'; document.body.appendChild(d); return d; }

boot();
