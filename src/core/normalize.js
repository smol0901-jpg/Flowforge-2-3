/* FlowForge · core/normalize — безопасный импорт произвольного JSON-документа (v2.x и v3) */
import { hex6 } from './util.js';
import { shapesByAlias, shapeTypes } from '../data/shapes.js';

/**
 * Приводит любой вход к чистому виду. Никогда не бросает исключение на мусорных полях —
 * просто отбрасывает их. Возвращает {nodes, edges, groups, layers, checklists, name, camera, auto}
 */
export function normalize(d) {
  const out = { nodes: [], edges: [], groups: [], layers: null, checklists: [], name: '', camera: null, auto: false };
  if (!d || typeof d !== 'object') { out.layers = defLayers(); return out; }
  out.name = typeof d.name === 'string' ? d.name.slice(0, 120) : '';
  out.camera = d.camera && isFinite(d.camera.x) ? { x: +d.camera.x, y: +d.camera.y, zoom: clampZoom(+d.camera.zoom || 1), rot: +d.camera.rot || 0 } : null;

  /* слои */
  if (Array.isArray(d.layers) && d.layers.length) {
    const ls = [];
    const seen = new Set();
    d.layers.forEach((l, i) => {
      const id = String(l?.id ?? 'L' + (i + 1));
      if (seen.has(id)) return; seen.add(id);
      ls.push({ id, name: String(l?.name ?? 'Слой ' + (i + 1)).slice(0, 60), visible: l?.visible !== false, locked: l?.locked === true, color: hex6(l?.color) || '#89b4fa', role: typeof l?.role === 'string' ? l.role : null });
    });
    out.layers = ls;
  } else out.layers = defLayers();
  const layerIds = new Set(out.layers.map(l => l.id));

  /* узлы */
  const alias = shapesByAlias();
  const valid = shapeTypes();
  const m = new Map(), seenId = new Set();
  const src = Array.isArray(d.nodes) ? d.nodes : [];
  let missingXY = false;
  out.nodes = src.map((r, i) => {
    r = r || {};
    let id = r.id != null ? String(r.id) : 'n' + (i + 1);
    const o = id; while (seenId.has(id)) id += '_'; seenId.add(id);
    if (!m.has(o)) m.set(o, id);
    const ty0 = alias[r.type] || r.type;
    const type = valid.has(ty0) ? ty0 : 'process';
    const xy = r.x != null && r.y != null && isFinite(+r.x) && isFinite(+r.y);
    if (!xy) missingXY = true;
    const layer = layerIds.has(String(r.layer)) ? String(r.layer) : out.layers[0].id;
    const n = { id, type, text: String(r.text ?? ''), x: xy ? +r.x : NaN, y: xy ? +r.y : NaN, layer };
    if (!n.text) n.text = defaultText(type);
    const hc = hex6(r.color); if (hc) n.color = hc;
    if (+r.fs >= 10 && +r.fs <= 48 && +r.fs != 14) n.fs = +r.fs;
    if (+r.sw >= 40) n.sw = Math.min(+r.sw, 4000);
    if (+r.sh >= 30) n.sh = Math.min(+r.sh, 4000);
    if (r.lock === true) n.lock = true;
    if (['dashed', 'dotted', 'none', 'thick', 'thin'].includes(r.bd)) n.bd = r.bd;
    if (Array.isArray(r.tags)) n.tags = r.tags.slice(0, 20).map(t => String(t).slice(0, 40));
    if (r.meta && typeof r.meta === 'object') { try { n.meta = JSON.parse(JSON.stringify(r.meta)); } catch { } }
    return n;
  });
  out.auto = missingXY;

  /* связи */
  const pairs = new Set();
  (Array.isArray(d.edges) ? d.edges : []).forEach((r, i) => {
    r = r || {};
    const a = m.get(String(r.from)), b = m.get(String(r.to));
    if (!a || !b || a === b) return;
    const key = a + '>' + b; if (pairs.has(key)) return; pairs.add(key);
    const id = r.id != null ? String(r.id) : 'e' + (i + 1);
    const e = { id, from: a, to: b, layer: layerIds.has(String(r.layer)) ? String(r.layer) : out.layers[0].id };
    if (r.label != null && r.label !== '') e.label = String(r.label).slice(0, 120);
    const RM = { curve: 'curve', smooth: 'curve', bezier: 'curve', ortho: 'ortho', orthogonal: 'ortho', angle: 'ortho', angular: 'ortho', line: 'line', straight: 'line' };
    if (RM[r.route]) e.route = RM[r.route];
    const DM = { dashed: 'dashed', dash: 'dashed', dotted: 'dotted', dot: 'dotted', dashdot: 'dashdot' };
    if (DM[r.dash]) e.dash = DM[r.dash];
    if (['end', 'both', 'none', 'start'].includes(r.arrow)) e.arrow = r.arrow;
    const ec = hex6(r.color); if (ec) e.color = ec;
    if (+r.width >= 1 && +r.width <= 10) e.width = +r.width;
    if (Array.isArray(r.pts)) e.pts = r.pts.filter(p => Array.isArray(p) && isFinite(+p[0]) && isFinite(+p[1])).slice(0, 60).map(p => [+p[0], +p[1]]);
    if (Array.isArray(r.tags)) e.tags = r.tags.slice(0, 20).map(t => String(t).slice(0, 40));
    if (e.pts && e.pts.length >= 1) out.edges.push(e); else out.edges.push(e);
  });

  /* группы */
  const used = new Set();
  (Array.isArray(d.groups) ? d.groups : []).forEach((r, i) => {
    const ids = (Array.isArray(r?.nodes) ? r.nodes : []).map(x => m.get(String(x))).filter(x => x && !used.has(x));
    if (ids.length < 2) return;
    ids.forEach(x => used.add(x));
    out.groups.push({ id: 'g' + (i + 1), title: String(r?.title ?? 'Группа').slice(0, 60), color: hex6(r?.color) || '#89b4fa', nodes: ids, layer: layerIds.has(String(r?.layer)) ? String(r?.layer) : out.layers[0].id });
  });

  /* чеклисты */
  (Array.isArray(d.checklists) ? d.checklists : []).forEach((cl, i) => {
    if (!cl || typeof cl !== 'object') return;
    out.checklists.push({
      id: String(cl.id ?? 'c' + (i + 1)),
      name: String(cl.name ?? 'Чеклист').slice(0, 80),
      items: (Array.isArray(cl.items) ? cl.items : []).slice(0, 500).map((it, j) => ({
        id: String(it?.id ?? 'c' + (i + 1) + '-' + (j + 1)),
        text: String(it?.text ?? '').slice(0, 300),
        done: it?.done === true,
        node: m.get(String(it?.node)) || null,
        by: String(it?.by ?? '').slice(0, 40) || null,
        at: +it?.at || null
      })).filter(it => it.text)
    });
  });
  return out;
}

const defLayers = () => [{ id: 'L1', name: 'Схема', visible: true, locked: false, color: '#89b4fa' }];
const clampZoom = z => Math.max(.05, Math.min(8, z));
function defaultText(type) {
  const t = { terminal: 'Старт/Конец', process: 'Действие', decision: 'Условие?', note: 'Заметка' };
  return t[type] || 'Блок';
}
