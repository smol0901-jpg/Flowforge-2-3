/* FlowForge · ui/find — поиск блоков по тексту/типу/тегам, переход и подсветка */
import { $ } from '../core/util.js';
import { nodes, setSel, clearSel, doc } from '../core/state.js';
import { bus } from '../core/bus.js';

let hits = [], idx = -1;

export function initFind() {
  const q = $('#fq'); if (!q) return;
  q.addEventListener('input', () => search(q.value));
  q.addEventListener('keydown', e => { if (e.key === 'Enter') go(e.shiftKey ? -1 : 1); });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-a="fprev"]')) go(-1);
    if (e.target.closest('[data-a="fnext"]')) go(1);
    if (e.target.closest('[data-a="fclose"]')) close();
  });
  bus.on('nav:node', id => gotoNode(id));
}

function search(t) {
  t = String(t).toLowerCase().trim();
  const box = $('#find'); if (!t) { hits = []; upd(); return; }
  hits = nodes().filter(n =>
    String(n.text).toLowerCase().includes(t) ||
    String(n.type).toLowerCase().includes(t) ||
    (n.tags || []).some(x => String(x).toLowerCase().includes(t))
  ).map(n => n.id);
  idx = hits.length ? 0 : -1;
  upd(); if (idx >= 0) gotoNode(hits[0]);
}
const upd = () => { const c = $('#fc'); if (c) c.textContent = hits.length ? `${idx + 1}/${hits.length}` : '—'; };
function go(d) { if (!hits.length) return; idx = (idx + d + hits.length) % hits.length; upd(); gotoNode(hits[idx]); }
function close() { const f = $('#find'); if (f) f.hidden = true; }
export const toggleFind = () => { const f = $('#find'); if (!f) return; f.hidden = !f.hidden; if (!f.hidden) $('#fq')?.focus(); };
export function gotoNode(id) {
  const n = nodes().find(x => String(x.id) === String(id)); if (!n) return;
  clearSel(); setSel([n.id]);
  bus.emit('nav:center', [n.x + n.w / 2, n.y + n.h / 2]);
}
