/* FlowForge · core/state — единый источник правды: документ, слои, узлы, связи, история */
import { bus } from './bus.js';
import { pick, hex6, toast } from './util.js';

export const FORMAT = 'flowforge';
export const VERSION = '3.0';
export const MAX_HISTORY = 120;

/** Пустой документ v3 со слоем по умолчанию */
export function emptyDoc(name = 'Без названия') {
  return {
    format: FORMAT, version: VERSION, name,
    layers: [{ id: 'L1', name: 'Схема', visible: true, locked: false, color: '#89b4fa' }],
    activeLayer: 'L1',
    nodes: [], edges: [], groups: [], checklists: [],
    meta: { createdAt: Date.now(), updatedAt: Date.now() }
  };
}

let D = emptyDoc();          // текущий документ
let cam = { x: 60, y: 40, k: 1, r: 0 };
let sel = new Set();         // выделенные узлы
let selE = null;             // выделенная связь
let selG = null;             // выделенная группа
let tool = 'select';
let hist = [], hi = -1;      // undo/redo (снапшоты документа)
let dirtyTimer = 0;

/* ---------- доступ ---------- */
export const doc = () => D;
export const setDocRaw = d => { D = d; bump(); emit('doc'); };
export const camera = () => cam;
export const setCamera = c => { Object.assign(cam, c); };
export const nodes = () => D.nodes;
export const edges = () => D.edges;
export const groups = () => D.groups;
export const layers = () => D.layers;
export const N = id => D.nodes.find(n => n.id == id);
export const E = id => D.edges.find(e => e.id == id);
export const G = id => D.groups.find(g => g.id == id);
export const activeLayer = () => D.layers.find(l => l.id === D.activeLayer) || D.layers[0];

/* ---------- выделение ---------- */
export const getSel = () => sel;
export const getSelE = () => selE;
export const getSelG = () => selG;
export const setSel = ids => { sel = new Set(ids); emit('sel'); };
export const addSel = id => { sel.add(id); emit('sel'); };
export const clearSel = () => { if (sel.size || selE || selG) { sel = new Set(); selE = null; selG = null; emit('sel'); } };
export const setSelE = id => { selE = id; if (id) { sel = new Set(); selG = null; } emit('sel'); };
export const setSelG = id => { selG = id; if (id) { sel = new Set(); selE = null; } emit('sel'); };
export const getTool = () => tool;
export const setTool = t => { tool = t; emit('tool'); };

/* ---------- уникальные id ---------- */
export function nid(p) {
  let i = 1;
  const u = new Set([...D.nodes, ...D.edges, ...D.groups].map(o => o.id));
  while (u.has(p + i)) i++;
  return p + i;
}

/* ---------- слои ---------- */
export function addLayer(name, opts = {}) {
  const l = { id: nid('L'), name: name || ('Слой ' + (D.layers.length + 1)), visible: true, locked: false, color: opts.color || '#a6e3a1', role: opts.role || null };
  D.layers.push(l); D.activeLayer = l.id; bump(); emit('layers'); emit('doc');
  return l;
}
export function removeLayer(id) {
  if (D.layers.length <= 1) { toast('Нельзя удалить единственный слой'); return false; }
  D.layers = D.layers.filter(l => l.id !== id);
  D.nodes = D.nodes.filter(n => n.layer !== id);
  const rm = new Set(D.edges.filter(e => !nodeExists(e.from, D.nodes) || !nodeExists(e.to, D.nodes)).map(e => e.id));
  D.edges = D.edges.filter(e => !rm.has(e.id));
  D.groups = D.groups.filter(g => g.layer !== id && g.nodes.some(i => nodeExists(i, D.nodes)));
  if (D.activeLayer === id) D.activeLayer = D.layers[0].id;
  bump(); commit(); emit('layers'); emit('doc');
  return true;
}
export function setActiveLayer(id) { D.activeLayer = id; emit('layers'); }
const nodeExists = (id, ns) => ns.some(n => n.id == id);

/* ---------- узлы / связи ---------- */
export function pushNode(n) { D.nodes.push(n); bump(); return n; }
export function pushEdge(e) { D.edges.push(e); bump(); return e; }
export function removeNodes(ids) {
  const s = new Set(ids.map(String));
  D.nodes = D.nodes.filter(n => !s.has(String(n.id)));
  D.edges = D.edges.filter(e => !s.has(String(e.from)) && !s.has(String(e.to)));
  D.groups.forEach(g => g.nodes = g.nodes.filter(i => !s.has(String(i))));
  D.groups = D.groups.filter(g => g.nodes.length > 1);
  bump();
}
export function removeEdges(ids) {
  const s = new Set(ids.map(String));
  D.edges = D.edges.filter(e => !s.has(String(e.id)));
  bump();
}

/* ---------- сериализация ---------- */
export function serialize(withCam = false) {
  return {
    format: FORMAT, version: VERSION, name: D.name,
    ...(withCam ? { camera: { x: Math.round(cam.x), y: Math.round(cam.y), zoom: +cam.k.toFixed(3), ...(cam.r ? { rot: +cam.r.toFixed(4) } : {}) } } : {}),
    layers: D.layers.map(l => pick(l, ['id', 'name', 'visible', 'locked', 'color', 'role'])),
    activeLayer: D.activeLayer,
    nodes: D.nodes.map(n => ({ id: n.id, type: n.type, text: n.text, x: n.x, y: n.y, layer: n.layer, ...pick(n, ['color', 'fs', 'sw', 'sh', 'lock', 'bd', 'tags', 'meta']) })),
    edges: D.edges.map(e => ({ id: e.id, from: e.from, to: e.to, layer: e.layer, ...pick(e, ['label', 'route', 'dash', 'arrow', 'color', 'width', 'pts', 'tags']) })),
    groups: D.groups.map(g => ({ id: g.id, title: g.title, color: hex6(g.color) || g.color, nodes: g.nodes, layer: g.layer })),
    checklists: D.checklists || [],
    meta: { ...D.meta, updatedAt: Date.now() }
  };
}

/* ---------- история (undo/redo) ---------- */
function snap() { return JSON.stringify(serialize()); }
export function commit() {
  const s = snap();
  if (hist[hi] === s) return;
  hist = hist.slice(0, hi + 1);
  hist.push(s);
  if (hist.length > MAX_HISTORY) hist.shift();
  hi = hist.length - 1;
  emit('dirty');
  scheduleSave();
}
export function restoreSnapshot(str) {
  try {
    const d = JSON.parse(str);
    applyDoc(d, { silentHistory: true });
  } catch (e) { console.error('restore', e); }
}
export function undo() { if (hi > 0) { hi--; restoreSnapshot(hist[hi]); emit('dirty'); scheduleSave(); return true; } return false; }
export function redo() { if (hi < hist.length - 1) { hi++; restoreSnapshot(hist[hi]); emit('dirty'); scheduleSave(); return true; } return false; }
export function resetHistory(first = null) { hist = first ? [first] : []; hi = hist.length ? 0 : -1; }

/* ---------- применение документа с валидацией ---------- */
import { normalize } from './normalize.js';
export function applyDoc(raw, opts = {}) {
  const { nodes, edges, groups, layers, checklists, name, camera: cmr, auto } = normalize(raw);
  D = {
    format: FORMAT, version: VERSION, name: name || D.name || 'Без названия',
    layers, activeLayer: layers.some(l => l.id === raw?.activeLayer) ? raw.activeLayer : layers[0].id,
    nodes, edges, groups, checklists: checklists || [],
    meta: (raw && raw.meta) || D.meta || { createdAt: Date.now() }
  };
  sel = new Set(); selE = null; selG = null;
  if (cmr && isFinite(cmr.x)) cam = { x: +cmr.x, y: +cmr.y, k: +cmr.zoom || 1, r: +cmr.rot || 0 };
  bump();
  emit('doc');
  if (!opts.silentHistory) commit();
  return { auto };
}

/* ---------- пересчёт размеров (вызывается renderer/dims) ---------- */
let dimAllFn = null;
export const registerDimAll = fn => { dimAllFn = fn; };
export const recalcDims = () => dimAllFn && dimAllFn();

/* ---------- автосохранение ---------- */
let saveFn = null;
export const registerSaver = fn => { saveFn = fn; };
export function scheduleSave() {
  clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(() => { saveFn && saveFn(serialize(true)); }, 500);
}
export function saveNow() { clearTimeout(dirtyTimer); saveFn && saveFn(serialize(true)); }
const bump = () => { D.meta = D.meta || {}; D.meta.updatedAt = Date.now(); };

/* ---------- события ---------- */
const emit = ev => bus.emit('state:' + ev);

/* регистрация pagehide для гарантированного сохранения */
if (typeof addEventListener !== 'undefined') {
  addEventListener('pagehide', saveNow);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
}
