/* FlowForge · ui/inspector — панель свойств выбранного блока/связи/группы */
import { $, esc } from '../core/util.js';
import { doc, getSel, getSelE, getSelG, N, E, G, commit, nodes, edges, groups, removeNodes, removeEdges, nid, pushNode, addSel, clearSel, } from '../core/state.js';
import { SHAPES } from '../data/shapes.js';
import { dimOne as dimOneRef } from '../render/dims.js';
import { bus } from '../core/bus.js';

let lastSig = '';

export function initInspector() {
  $('#pt')?.addEventListener('input', e => { const n = one(); if (n) { n.text = e.target.value; dimOneRef(n); syncDraw(); } });
  $('#pt')?.addEventListener('change', () => commit());
  $('#pty')?.addEventListener('change', e => { const n = one(); if (n) { n.type = e.target.value; dimOneRef(n); commit(); syncDraw(); insp(); } });
  $('#pc')?.addEventListener('input', e => { const n = one(); if (n) { n.color = e.target.value; syncDraw(); } });
  $('#pc')?.addEventListener('change', () => commit());
  $('#pf')?.addEventListener('change', e => { const n = one(); if (n) { n.fs = +e.target.value; dimOneRef(n); commit(); syncDraw(); } });
  $('#pb')?.addEventListener('change', e => { const n = one(); if (n) { n.bd = e.target.value || undefined; commit(); syncDraw(); } });
  $('#pl')?.addEventListener('input', e => { const x = ed(); if (x) { x.label = e.target.value; syncDraw(); } });
  $('#pl')?.addEventListener('change', () => commit());
  $('#er')?.addEventListener('change', e => { const x = ed(); if (x) { x.route = e.target.value || undefined; commit(); syncDraw(); } });
  $('#ed')?.addEventListener('change', e => { const x = ed(); if (x) { x.dash = e.target.value; commit(); syncDraw(); } });
  $('#ea')?.addEventListener('change', e => { const x = ed(); if (x) { x.arrow = e.target.value; commit(); syncDraw(); } });
  $('#ew')?.addEventListener('change', e => { const x = ed(); if (x) { x.width = +e.target.value; commit(); syncDraw(); } });
  $('#ec')?.addEventListener('input', e => { const x = ed(); if (x) { x.color = e.target.value; syncDraw(); } });
  $('#ec')?.addEventListener('change', () => commit());
  $('#gt')?.addEventListener('input', e => { const g = grp(); if (g) { g.title = e.target.value; syncDraw(); } });
  $('#gt')?.addEventListener('change', () => commit());
  $('#gc')?.addEventListener('input', e => { const g = grp(); if (g) { g.color = e.target.value; syncDraw(); } });
  $('#gc')?.addEventListener('change', () => commit());
  bus.on('state:sel', insp);
  bus.on('state:doc', insp);
}

const one = () => { const s = getSel(); return s.size === 1 ? N([...s][0]) : null; };
const ed = () => getSelE() ? E(getSelE()) : null;
const grp = () => getSelG() ? G(getSelG()) : null;
const multi = () => getSel().size > 1;

function show(id, on) { $(id)?.classList.toggle('hide', !on); }

/** Обновление панели под текущее выделение */
export function insp() {
  const n = one(), e = ed(), g = grp(), m = multi();
  const sig = (n?.id || '') + '|' + (e?.id || '') + '|' + (g?.id || '') + '|' + m + '|' + (n?.text || '').length;
  if (sig === lastSig && !n) return;
  lastSig = sig;
  show('#s-text', !!n || m); show('#s-node', !!n); show('#s-multi', m); show('#s-edge', !!e); show('#s-grp', !!g); show('#s-del', !!n || !!e || !!g || m);
  $('#ititle').textContent = n ? 'Блок' : e ? 'Связь' : g ? 'Группа' : m ? `Выбрано: ${getSel().size}` : 'Свойства';
  if (n) {
    if ($('#pt').value !== n.text) $('#pt').value = n.text;
    const sel = $('#pty');
    if (!sel.dataset.built) { sel.innerHTML = [...new Map(SHAPES.map(s => [s.cat, []])).entries()].map(([c]) => `<optgroup label="${esc(c)}">`).join(''); sel.innerHTML = SHAPES.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join(''); sel.dataset.built = '1'; }
    sel.value = n.type;
    $('#pc').value = n.color || '#89b4fa';
    $('#pf').value = String(n.fs || 14);
    $('#pb').value = n.bd || '';
  }
  if (e) {
    $('#pl').value = e.label || '';
    $('#er').value = e.route || '';
    $('#ed').value = e.dash || 'solid';
    $('#ea').value = e.arrow || 'end';
    $('#ew').value = String(e.width || 2);
    $('#ec').value = e.color || '#89b4fa';
  }
  if (g) { $('#gt').value = g.title || ''; $('#gc').value = g.color || '#89b4fa'; }
}

const syncDraw = () => bus.emit('ui:redraw-lite');

/* ---------- действия панели ---------- */
export function dupSel() {
  const ids = [...getSel()]; if (!ids.length) return;
  const map = new Map();
  ids.forEach(id => {
    const n = N(id); if (!n) return;
    const c = { ...n, id: nid('n'), x: n.x + 30, y: n.y + 30, meta: n.meta ? JSON.parse(JSON.stringify(n.meta)) : undefined };
    pushNode(c); map.set(id, c.id);
  });
  const off = new Set();
  edges().forEach(e => { if (map.has(e.from) && map.has(e.to)) { /* связь между копиями не создаём автоматически */ } });
  clearSel(); map.forEach(v => addSel(v));
  commit();
}
export function delSel() {
  const ids = [...getSel()], se = getSelE(), sg = getSelG();
  if (se) { removeEdges([se]); }
  else if (sg) { const g = G(sg); if (g) { doc().groups = doc().groups.filter(x => x.id !== sg); commit(); } }
  else if (ids.length) {
    const locked = ids.filter(i => N(i)?.lock);
    if (locked.length === ids.length) return;
    removeNodes(ids.filter(i => !N(i)?.lock));
    clearSel(); commit();
  }
}
export function lockSel() { const n = one(); if (n) { n.lock = !n.lock; if (!n.lock) delete n.lock; commit(); syncDraw(); } }
export function frontSel() { const ids = new Set(getSel()); const d = doc(); d.nodes = [...d.nodes.filter(n => !ids.has(n.id)), ...d.nodes.filter(n => ids.has(n.id))]; commit(); syncDraw(); }
export function backSel() { const ids = new Set(getSel()); const d = doc(); d.nodes = [...d.nodes.filter(n => ids.has(n.id)), ...d.nodes.filter(n => !ids.has(n.id))]; commit(); syncDraw(); }
export function alignSel(mode) {
  const ns = [...getSel()].map(N).filter(Boolean); if (ns.length < 2) return;
  const X = Math.min(...ns.map(n => n.x)), X2 = Math.max(...ns.map(n => n.x + n.w));
  const Y = Math.min(...ns.map(n => n.y)), Y2 = Math.max(...ns.map(n => n.y + n.h));
  if (mode === 'l') ns.forEach(n => n.x = X);
  if (mode === 'r') ns.forEach(n => n.x = X2 - n.w);
  if (mode === 't') ns.forEach(n => n.y = Y);
  if (mode === 'b') ns.forEach(n => n.y = Y2 - n.h);
  if (mode === 'c') { const cx = (X + X2) / 2; ns.forEach(n => n.x = Math.round(cx - n.w / 2)); }
  if (mode === 'm') { const cy = (Y + Y2) / 2; ns.forEach(n => n.y = Math.round(cy - n.h / 2)); }
  if (mode === 'dh') { const gap = (X2 - X - ns.reduce((s, n) => s + n.w, 0)) / (ns.length - 1); let q = X; ns.sort((a, b) => a.x - b.x).forEach(n => { n.x = Math.round(q); q += n.w + gap; }); }
  if (mode === 'dv') { const gap = (Y2 - Y - ns.reduce((s, n) => s + n.h, 0)) / (ns.length - 1); let q = Y; ns.sort((a, b) => a.y - b.y).forEach(n => { n.y = Math.round(q); q += n.h + gap; }); }
  commit(); syncDraw();
}
export function mkGroup() {
  const ids = [...getSel()]; if (ids.length < 2) return;
  const g = { id: nid('g'), title: 'Группа', color: '#89b4fa', nodes: ids, layer: doc().activeLayer };
  doc().groups.push(g); clearSel(); commit(); syncDraw();
}
export function ungrp() { const g = grp(); if (g) { doc().groups = doc().groups.filter(x => x.id !== g.id); clearSel(); commit(); syncDraw(); } }
export function sizeFix() { const n = one(); if (n) { n.sw = n.w; n.sh = n.h; commit(); } }
export function autoSize() { const n = one(); if (n) { delete n.sw; delete n.sh; dimOneRef(n); commit(); syncDraw(); } }
export function sizeStep(d) { const n = one(); if (n) { n.sw = Math.max(60, (n.sw || n.w) + d * 20); n.sh = Math.max(40, (n.sh || n.h) + d * 10); dimOneRef(n); commit(); syncDraw(); } }
