/* FlowForge · actions/importers — импорт: JSON v2/v3, Mermaid, draw.io XML, backup */
import { toast } from '../core/util.js';
import { applyDoc, serialize, doc, nodes } from '../core/state.js';

/** Автоопределение формата текста и применение. Возвращает true/false */
export function importText(text, opts = {}) {
  try {
    const body = String(text).trim()
      .replace(/^```(?:json|mermaid|drawio)?\s*/i, '')
      .replace(/```\s*$/, '').trim();
    if (/^(flowchart|graph|sequenceDiagram)\b/i.test(body)) return mermaidToDoc(body, opts);
    if (/^<\?xml|^<mxfile/i.test(body)) return drawioToDoc(body, opts);
    const d = JSON.parse(body);
    if (d && d.format === 'flowforge-backup') return restoreBackup(d);
    if (d && d.format === 'flowforge' || d && d.nodes) {
      const r = applyDoc(d);
      if (r.auto && opts.layout !== false) autoLayoutSafely();
      toast(`✅ Импорт JSON: ${nodes().length} блоков`);
      return true;
    }
    throw new Error('Неизвестный формат');
  } catch (e) { toast('❌ Ошибка импорта: ' + e.message); return false; }
}

async function autoLayoutSafely() {
  const m = await import('./layout.js');
  m.layeredAuto();
}

/* ---------- Mermaid flowchart → документ ---------- */
const MM_TYPE = {
  '([': 'terminal', '])': 'terminal', '{': 'decision', '}': 'decision',
  '[/': 'io', '/]': 'io', '[(': 'data', ')]': 'data', '[[': 'sub', ']]': 'sub', '((': 'terminal', '))': 'terminal'
};
export function mermaidToDoc(src, opts = {}) {
  const lines = src.replace(/```(?:mermaid)?/gi, '').replace(/%%[^\n]*/g, '').split(/\n|;/).map(s => s.trim()).filter(Boolean);
  const dir = /\bLR\b|\bRL\b/.test(lines[0] || '') ? 'LR' : 'TD';
  const ids = new Map(), ns = [], es = [];
  const node = (id, text, shapeHint) => {
    if (!ids.has(id)) {
      const type = shapeHint && (MM_TYPE[shapeHint.l] || MM_TYPE[shapeHint.r]) || 'process';
      const rec = { id: 'n' + (ns.length + 1), type, text: text || id, x: 0, y: 0, layer: 'L1' };
      ids.set(id, rec); ns.push(rec);
    } else if (text) ids.get(id).text = text;
    return ids.get(id);
  };
  for (const ln of lines) {
    if (/^(flowchart|graph)\b/i.test(ln)) continue;
    let m;
    if (m = ln.match(/^([\w$.-]+)\s*(\[\/|\[\(|\[\[|\(\(|\{|\[|\()/?\s*"([^"]*)"?\s*(\/\]|\)\]|]]|\)\)|\}|\])?\s*(-+|==+|-\.->|-->|\.{2,}>|==>)\s*\|?\s*"?([^"|>]*)"?\s*>?\s*([\w$.-]+)(?:\s*(\[\/|\[\(|\[\[|\(\(|\{|\[|\()?\s*"([^"]*)"?\s*(\/\]|\)\]|]]|\)\)|\}|\])?)?$/)) {
      const a = node(m[1], m[3], { l: m[2], r: m[4] });
      const b = node(m[6], m[8], { l: m[7], r: m[9] });
      es.push({ id: 'e' + (es.length + 1), from: a.id, to: b.id, label: (m[5] || '').trim(), layer: 'L1' });
    } else if (m = ln.match(/^([\w$.-]+)\s*(\[\/|\[\(|\[\[|\(\(|\{|\[|\()\s*"?([^"\]]*)"?\s*(\/\]|\)\]|]]|\)\)|\}|\])\s*$/)) {
      node(m[1], m[3], { l: m[2], r: m[4] });
    } else if (m = ln.match(/^([\w$.-]+)\s*$/)) { node(m[1]); }
  }
  if (!ns.length) { toast('❌ Mermaid: ничего не распознано'); return false; }
  const r = applyDoc({ format: 'flowforge', version: '3.0', name: doc().name, nodes: ns, edges: es }, opts);
  if (dir === 'LR' && opts.layout !== false) import('./layout.js').then(m => m.layeredAuto('LR'));
  else if (opts.layout !== false) autoLayoutSafely();
  toast(`✅ Mermaid: ${ns.length} блоков, ${es.length} связей`);
  return true;
}

/* ---------- draw.io XML → документ ---------- */
export function drawioToDoc(xml, opts = {}) {
  try {
    const p = new DOMParser().parseFromString(xml, 'text/xml');
    const cells = [...p.querySelectorAll('mxCell, object')];
    const nm = new Map(); const ns = [], es = [];
    cells.forEach(c => {
      const geo = c.querySelector('mxGeometry') || (c.matches('[mxGeometry]') ? null : null);
      const style = c.getAttribute('style') || '';
      const id = c.getAttribute('id');
      if (c.getAttribute('vertex') == '1') {
        const g = c.getElementsByTagName('mxGeometry')[0];
        const type = /rhombus/.test(style) ? 'decision' : /ellipse/.test(style) ? 'terminal' : /parallelogram/.test(style) ? 'io' : /cylinder/.test(style) ? 'data' : /note/.test(style) ? 'note' : /document/.test(style) ? 'doc' : 'process';
        const n = { id: 'n' + (ns.length + 1), type, text: (c.getAttribute('value') || 'Блок').replace(/<[^>]+>/g, ''), x: +(g?.getAttribute('x') || 0), y: +(g?.getAttribute('y') || 0), layer: 'L1' };
        nm.set(id, n); ns.push(n);
      } else if (c.getAttribute('edge') == '1') {
        const src = c.getAttribute('source'), tgt = c.getAttribute('target');
        if (nm.has(src) && nm.has(tgt)) es.push({ id: 'e' + (es.length + 1), from: nm.get(src).id, to: nm.get(tgt).id, label: (c.getAttribute('value') || '').replace(/<[^>]+>/g, ''), layer: 'L1' });
      }
    });
    if (!ns.length) { toast('❌ draw.io: пусто'); return false; }
    applyDoc({ format: 'flowforge', version: '3.0', name: doc().name, nodes: ns, edges: es }, opts);
    toast(`✅ draw.io: ${ns.length} блоков, ${es.length} связей`);
    return true;
  } catch (e) { toast('❌ draw.io: ' + e.message); return false; }
}

/* ---------- восстановление из полного бэкапа ---------- */
export async function restoreBackup(obj) {
  if (!obj || !Array.isArray(obj.documents)) { toast('❌ Бэкап повреждён'); return false; }
  const st = await import('../storage/adapter.js');
  let n = 0;
  for (const item of obj.documents) {
    try {
      const meta = { ...item.meta }; delete meta.body;
      await st.saveDocMeta(meta);
      if (item.body) await st.storeDocBody(meta.id, typeof item.body === 'string' ? item.body : JSON.stringify(item.body));
      n++;
    } catch { }
  }
  if (obj.config) { try { localStorage.setItem('ffCfg', JSON.stringify(obj.config)); } catch { } }
  applyDoc(obj.documents[0]?.body ? (typeof obj.documents[0].body === 'string' ? JSON.parse(obj.documents[0].body) : obj.documents[0].body) : {});
  toast(`🛟 Восстановлено проектов: ${n}`);
  return true;
}

/** Чтение файла (File | Blob) как текст с определением кодировки UTF-8 */
export const readFileText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(f, 'utf-8'); });
