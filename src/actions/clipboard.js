/* FlowForge · actions/clipboard — копирование/вставка блоков и связей, буфер обмена */
import { doc, nid, pushNode, addSel, clearSel, setSel, commit, getSel, N, toast } from '../core/state.js';
import { dimOne } from '../render/dims.js';

let buf = null; // {nodes:[], edges:[]}

export function copySel() {
  const ids = new Set(getSel());
  if (!ids.size) return;
  const ns = doc().nodes.filter(n => ids.has(n.id)).map(n => JSON.parse(JSON.stringify(n)));
  const es = doc().edges.filter(e => ids.has(String(e.from)) && ids.has(String(e.to))).map(e => JSON.parse(JSON.stringify(e)));
  buf = { nodes: ns, edges: es };
  try { localStorage.setItem('ffClip', JSON.stringify(buf)); } catch { }
  toast(`📋 Скопировано: ${ns.length}`);
}

export function pasteBuf(dx = 30, dy = 30) {
  if (!buf) { try { buf = JSON.parse(localStorage.getItem('ffClip')); } catch { } }
  if (!buf?.nodes?.length) return;
  const map = new Map();
  const b = doc().camera ? null : null;
  buf.nodes.forEach(n => {
    const c = { ...n, id: nid('n'), x: n.x + dx, y: n.y + dy };
    map.set(n.id, c.id); pushNode(c); dimOne(c);
  });
  buf.edges.forEach(e => {
    if (map.has(e.from) && map.has(e.to)) doc().edges.push({ ...e, id: nid('e'), from: map.get(e.from), to: map.get(e.to) });
  });
  clearSel(); map.forEach(id => addSel(id));
  commit();
}

/** Вставка из внешнего буфера (текст JSON/Mermaid обрабатывается importers) */
export async function systemPaste(handler) {
  try { const t = await navigator.clipboard.readText(); if (t) handler(t); }
  catch { toast('Разрешите доступ к буферу обмена'); }
}
