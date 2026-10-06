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
  const node = (id, text, shape) => {
    let rec = ids.get(id);
    if (!rec) {
      rec = { id: 'n' + (ns.length + 1), type: MM_TYPE[shape] || 'process', text: text || id, x: 0, y: 0, layer: 'L1' };
      ids.set(id, rec); ns.push(rec);
    } else {
      if (text) rec.text = text;
      if (shape && MM_TYPE[shape]) rec.type = MM_TYPE[shape];
    }
    return rec;
  };
  // узел с опциональной формой: A["Текст"], B(Текст), C{{X}}, D[(Y)] …
  const OPEN_RE = /^(\(\[|\[\/|\[\(|\(\(|\[\[|\{\{|\{)/;
  const parseNode = tok => {
    tok = String(tok).trim();
    const m = tok.match(/^([A-Za-z][\w$.:-]*)(.*)$/s);
    if (!m) return null;
    let rest = m[2] || '';
    const om = rest.match(OPEN_RE);
    const shape = om ? om[1] : null;
    if (shape) rest = rest.slice(shape.length);
    rest = rest.replace(/(\]\)|\/\]|\)\)|\]\]|\}\}|\}|\))\s*$/, '');
    const text = rest.trim().replace(/^"([\s\S]*)"$/, '$1').trim();
    node(m[1], text, shape);
    return m[1];
  };
  for (const raw of lines) {
    let ln = raw;
    if (/^(flowchart|graph|subgraph|end)\b/i.test(ln)) continue;
    if (/^\s*direction\s+(TB|BT|LR|RL)\s*$/i.test(ln)) continue;
    let m = ln.match(/^(.+?)\s*(-\.->|-+>|\.+->|==+>)\s*(?:\|([^"|]*)\|\s*)?(.+)$/);
    if (m) {
      const a = parseNode(m[1]), b = parseNode(m[4]);
      if (a && b) {
        const dashed = /^-\.->|\.+>/.test(m[2]), thick = m[2].startsWith('==');
        const rec = ids.get(a), recB = ids.get(b);
        es.push({ id: 'e' + (es.length + 1), from: rec.id, to: recB.id, label: (m[3] || '').trim(), ...(dashed ? { dash: '6 5' } : {}), ...(thick ? { width: 3.5 } : {}), layer: 'L1' });
      }
      continue;
    }
    parseNode(ln);
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
