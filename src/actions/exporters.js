/* FlowForge · actions/exporters — экспорт: JSON, SVG, PNG, PDF, CSV, Mermaid, draw.io */
import { dl, stamp, slug, toast } from '../core/util.js';
import { doc, serialize, nodes, edges } from '../core/state.js';
import { exportSVGString, exportPNG, PAL } from '../render/canvas.js';
import { bbox } from '../render/geom.js';

const fname = ext => `${slug(doc().name || 'flowforge')}-${stamp()}.${ext}`;

export const ACTIONS = {
  json(cfg) { dl(new Blob([JSON.stringify(serialize(true), null, 2)], { type: 'application/json' }), fname('json')); },
  svg(cfg) { dl(new Blob([exportSVGString(cfg)], { type: 'image/svg+xml' }), fname('svg')); },
  async png(cfg, scale) { if (!nodes().length) return toast('Схема пуста'); const b = await exportPNG(cfg, +scale || 2); b && dl(b, fname('png')); },
  async pdf(cfg, scale) {
    if (!nodes().length) return toast('Схема пуста');
    const mod = await import('../vendor/lazy-pdf.js').catch(() => null);
    if (!mod) return toast('PDF-модуль не загрузился');
    const b = await exportPNG(cfg, +scale || 2);
    if (b) await mod.savePdf(b, doc().name);
  },
  csv() {
    const rows = [['тип', 'id', 'текст', 'x', 'y', 'слой', 'цвет']];
    nodes().forEach(n => rows.push(['блок', n.id, n.text, n.x, n.y, n.layer || '', n.color || '']));
    edges().forEach(e => rows.push(['связь', e.id, (e.label || '') + ` (${e.from}→${e.to})`, '', '', e.layer || '', e.color || '']));
    const esc2 = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    dl(new Blob(['\uFEFF' + rows.map(r => r.map(esc2).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), fname('csv'));
  },
  mermaid(cfg) {
    const idOf = new Map(); let i = 0;
    const gid = n => { if (!idOf.has(n)) idOf.set(n, 'n' + (++i)); return idOf.get(n); };
    let s = 'flowchart TD\n';
    nodes().forEach(n => {
      const t = ({ terminal: ['(["', '"])'], decision: ['{"', '"}'], io: ['[/"', '/"]'], data: ['[("', '")]'], sub: ['[[', ']]'] })[n.type] || ['["', '"]'];
      s += `  ${gid(n.id)}${t[0]}${(n.text || '').replace(/["\[\]{}()]/g, "'")}${t[1]}\n`;
    });
    edges().forEach(e => { s += `  ${gid(e.from)} --> ${e.label ? `|${e.label}|` : ''} ${gid(e.to)}\n`; });
    dl(new Blob([s], { type: 'text/plain' }), fname('mmd'));
  },
  drawio(cfg) {
    /* export в формат diagrams.net (uncompressed XML) */
    const escX = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const idMap = {}; let i = 1;
    let xml = `<mxfile host="flowforge"><diagram name="${escX(doc().name)}"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>`;
    nodes().forEach(n => {
      const style = ({ decision: 'rhombus', terminal: 'ellipse', io: 'shape=parallelogram', data: 'shape=cylinder3', note: 'shape=note', doc: 'shape=document' })[n.type] || 'rounded=1';
      idMap[n.id] = ++i;
      xml += `<mxCell id="${i}" value="${escX(n.text)}" style="${style};fillColor=${n.color || '#89b4fa'};fontColor=#1e1e2e" vertex="1" parent="1"><mxGeometry x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" as="geometry"/></mxCell>`;
    });
    edges().forEach(e => {
      if (!idMap[e.from] || !idMap[e.to]) return;
      xml += `<mxCell id="${++i}" value="${escX(e.label || '')}" style="edgeStyle=orthogonalEdgeStyle" edge="1" parent="1" source="${idMap[e.from]}" target="${idMap[e.to]}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
    });
    xml += '</root></mxGraphModel></diagram></mxfile>';
    dl(new Blob([xml], { type: 'application/xml' }), fname('drawio'));
  }
};

/** Полная резервная копия всех проектов + настроек */
export async function backupAll(projects, cfg) {
  const st = await import('../storage/adapter.js');
  const docs = await st.listDocs();
  const full = [];
  for (const d of docs) { const body = await st.loadDocBody(d.id); full.push({ meta: d, body }); }
  dl(new Blob([JSON.stringify({ format: 'flowforge-backup', version: 3, ts: Date.now(), config: cfg, documents: full }, null, 2)], { type: 'application/json' }), `flowforge-backup-${stamp()}.json`);
  toast('🛟 Резервная копия сохранена');
}
