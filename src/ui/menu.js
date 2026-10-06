/* FlowForge · ui/menu — диалог «Меню»: вкладки, настройки вида, библиотека схем, шаблоны, версии */
import { $, $$, esc, fmtBytes, LS } from '../core/util.js';
import { doc, serialize, applyDoc, commit, toast } from '../core/state.js';
import { listDocs, saveDocMeta, storeDocBody, loadDocBody, deleteDoc, currentMode, setPreferredMode, availableModes } from '../storage/adapter.js';
import { addVersion, listVersions, getVersion } from '../storage/versions.js';
import { PRESETS, presetNames } from '../data/presets.js';
import { bus } from '../core/bus.js';

let MENU;

export function initMenu(cfg, actions) {
  MENU = $('#menu');
  const tabs = $('.tabs'), panes = $('.panes');
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) tab(b.dataset.tab); });
  panes.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (b && actions[b.dataset.a]) { if (!b.hasAttribute('data-keep')) MENU.close(); actions[b.dataset.a](cfg); return; }
    const r = e.target.closest('[data-route]'); if (r) return setCfg('route', r.dataset.route);
    const sc = e.target.closest('[data-sc]'); if (sc) return setCfg('sc', +sc.dataset.sc);
    const bg = e.target.closest('[data-bg]'); if (bg) return setCfg('bg', bg.dataset.bg);
    const rad = e.target.closest('[data-rad]'); if (rad != null && e.target.closest('[data-rad]')) return setCfg('rad', +e.target.closest('[data-rad]').dataset.rad);
    const gs = e.target.closest('[data-gs]'); if (gs) return setCfg('gs', +gs.dataset.gs);
    const pj = e.target.closest('[data-pj]'); if (pj) { openProject(pj.dataset.pj, cfg); MENU.close(); return; }
    const pd = e.target.closest('[data-pdel]'); if (pd) { removeProject(pd.dataset.pdel); return; }
    const tpl = e.target.closest('[data-tpl]'); if (tpl) { applyTemplate(tpl.dataset.tpl, cfg); MENU.close(); return; }
    const ver = e.target.closest('[data-ver]'); if (ver) { restoreVersion(+ver.dataset.ver, cfg); return; }
  });
  ['snap', 'map', 'sig', 'grid', 'guides', 'depth', 'splashSw', 'nocross', 'noover', 'trace', 'flow'].forEach(id => {
    const el = $('#' + id);
    if (el) el.addEventListener('change', () => setCfg(id === 'splashSw' ? 'splash' : id, el.checked));
  });
  $('#pn')?.addEventListener('input', e => { doc().name = e.target.value.slice(0, 60); bus.emit('ui:name'); });
  $('#pn')?.addEventListener('change', () => { commit(); });
  // фоны
  $('#bgs') && ($('#bgs').innerHTML = Object.keys(window.__PAL || {}).length ? '' : '');
  syncUI(cfg);
}

const setCfg = (k, v) => { bus.emit('cfg:set', [k, v]); };

export function tab(n) {
  $$('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab == n));
  $$('[data-pane]').forEach(p => p.hidden = p.dataset.pane != n);
  if (n === 'file') renderProjects();
  if (n === 'tpl') renderTemplates();
  if (n === 'more') renderVersions();
}
export const openMenu = (n = 'file') => { tab(n); if (!MENU.open) MENU.showModal(); $('.panes') && ($('.panes').scrollTop = 0); renderProjects(); };

export function syncUI(cfg) {
  $$('#segRoute button').forEach(b => b.classList.toggle('on', b.dataset.route == cfg.route));
  $$('#segSc button').forEach(b => b.classList.toggle('on', +b.dataset.sc == (cfg.sc || 2)));
  $$('#segGs button').forEach(b => b.classList.toggle('on', +b.dataset.gs == (cfg.gs || 20)));
  $$('[data-rad]').forEach(b => b.classList.toggle('on', +b.dataset.rad == (cfg.rad ?? 10)));
  $$('#bgs button').forEach(b => b.classList.toggle('on', b.dataset.bg == cfg.bg));
  const ck = id => { const el = $('#' + id); if (el) el.checked = !!cfg[id]; };
  ['snap', 'map', 'sig', 'grid', 'guides', 'depth', 'nocross', 'noover', 'trace', 'flow'].forEach(ck);
  const sp = $('#splashSw'); if (sp) sp.checked = !!cfg.splash;
  const pn = $('#pn'); if (pn && document.activeElement !== pn) pn.value = doc().name || '';
}

/* ---------- библиотека проектов ---------- */
async function renderProjects() {
  const box = $('#plist'); if (!box) return;
  const docs = await listDocs();
  docs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  box.innerHTML = docs.length ? docs.map(d => `<div class="pjrow"><button data-pj="${esc(d.id)}" title="Открыть">${esc(d.name || 'Без названия')} <small>${new Date(d.updatedAt || 0).toLocaleDateString()}</small></button><button class="d" data-pdel="${esc(d.id)}" title="Удалить">🗑</button></div>`).join('') : '<p class="note">Пока пусто — сохраните схему кнопкой «Сохранить».</p>';
}

export async function saveCurrentProject() {
  const d = doc();
  const id = d.id || (d.id = 'p' + Date.now().toString(36));
  await saveDocMeta({ id, name: d.name || 'Без названия', updatedAt: Date.now(), blocks: d.nodes.length, links: d.edges.length });
  const ok = await storeDocBody(id, JSON.stringify(serialize(true)));
  if (ok) { addVersion(id, JSON.stringify(serialize(false))); toast('💾 Схема сохранена'); }
  renderProjects();
}

async function openProject(id, cfg) {
  const body = await loadDocBody(id);
  if (!body) return toast('Не удалось прочитать схему');
  applyDoc(JSON.parse(body));
  doc().id = id;
  commit();
  bus.emit('draw:full', cfg);
  toast('📂 Открыто: ' + (doc().name || ''));
}

async function removeProject(id) {
  if (!confirm('Удалить эту схему безвозвратно?')) return;
  await deleteDoc(id);
  toast('Удалено');
  renderProjects();
}

/* ---------- шаблоны ---------- */
const TPL = {
  blank: { name: 'Пустая', nodes: [], edges: [] },
  haccp: { name: 'ХАССП: кухня', preset: 'haccp', nodes: [
    ['raw', 'Приёмка сырья', 'terminal'], ['chk', 'Входной контроль', 'ctrl'], ['ok', 'Соответствует?', 'decision'],
    ['rej', 'Брак → утилизация', 'corr'], ['prep', 'Приготовление', 'prep'], ['ccp', 'КТ: температура ≥75°C', 'ccp'],
    ['mon', 'Замер и запись', 'monitor'], ['lim', 'В пределах нормы?', 'decision'], ['act', 'Корректирующее действие', 'corr'],
    ['pack', 'Фасовка', 'store'], ['ship', 'Отдача гостю', 'ship']],
    edges: [['raw','chk'],['chk','ok'],['ok','rej','Нет'],['ok','prep','Да'],['prep','ccp'],['ccp','mon'],['mon','lim'],['lim','act','Нет'],['lim','pack','Да'],['act','pack'],['pack','ship']] },
  order: { name: 'Заказ гостя', nodes: [['st','Гость сделал заказ','terminal'],['wait','Ожидание официанта','delay'],['pay','Оплата','process'],['cook','Передача на кухню','process'],['done','Блюдо готово','terminal']],
    edges: [['st','wait'],['wait','pay'],['pay','cook'],['cook','done']] },
  org: { name: 'Оргструктура кафе', preset: 'org', nodes: [['boss','Управляющий','org_boss'],['chef','Шеф-повар','org_dept'],['hall','Зал','org_dept'],['cook1','Повара ×4','org_staff'],['w1','Официанты ×6','org_staff']],
    edges: [['boss','chef'],['boss','hall'],['chef','cook1'],['hall','w1']] },
  it: { name: 'Микросервис заказа', preset: 'it', nodes: [['cl','Клиент (web/mobile)','i_client'],['gw','API Gateway','i_api'],['ord','Сервис заказов','i_server'],['db','PostgreSQL','i_db'],['mq','Kafka','i_queue'],['kch','Кухня (WebSocket)','i_cloud']],
    edges: [['cl','gw'],['gw','ord'],['ord','db'],['ord','mq'],['mq','kch']] }
};
function tplDoc(key) {
  const t = TPL[key]; if (!t) return null;
  const ids = [];
  const ns = t.nodes.map(([id, text, type], i) => ({ id, type, text, x: 0, y: i * 90 }));
  const es = t.edges.map(([a, b, label], i) => ({ id: 'e' + (i + 1), from: a, to: b, ...(label ? { label } : {}) }));
  const d = { format: 'flowforge', version: '3.0', name: t.name, nodes: ns, edges: es };
  if (t.preset) { d.preset = t.preset; d.roles = PRESETS[t.preset].roles.map(r => Object.fromEntries(r.map((v, i2) => [['id', 'name', 'color'][i2], v]))); }
  return d;
}
function renderTemplates() {
  const box = $('#tpllist'); if (!box) return;
  box.innerHTML = Object.entries(TPL).map(([k, t]) => `<button class="card" data-tpl="${k}"><i>🧩</i><b>${esc(t.name)}</b><small>${t.nodes.length} блоков</small></button>`).join('');
}
function applyTemplate(key, cfg) {
  const d = tplDoc(key); if (!d) return;
  saveIfNotEmpty();
  applyDoc(d);
  commit();
  bus.emit('layout:auto', cfg);
  toast('📚 Шаблон загружен');
}
function saveIfNotEmpty() { if (doc().nodes.length) saveCurrentProject(); }

/* ---------- версии ---------- */
async function renderVersions() {
  const box = $('#versBox'); if (!box) return;
  const id = doc().id;
  if (!id) { box.innerHTML = '<p class="note">Сохраните схему, чтобы вести историю версий.</p>'; return; }
  const vs = await listVersions(id);
  box.innerHTML = vs.length ? vs.slice().reverse().map(v => `<div class="pjrow"><button data-ver="${v.n}">Версия ${v.n} · ${new Date(v.t).toLocaleString()}</button></div>`).join('') : '<p class="note">История пуста.</p>';
}
async function restoreVersion(n, cfg) {
  const s = await getVersion(doc().id, n);
  if (!s) return toast('Версия не найдена');
  applyDoc(JSON.parse(s)); commit(); bus.emit('draw:full', cfg);
  toast('↺ Восстановлена версия ' + n);
}

/** Полная резервная копия всех документов */
export async function backupAll(cfg) {
  const docs = await listDocs();
  const full = [];
  for (const d of docs) { const body = await loadDocBody(d.id); full.push({ meta: d, body }); }
  const blob = new Blob([JSON.stringify({ format: 'flowforge-backup', version: 3, ts: Date.now(), config: cfg, documents: full }, null, 2)], { type: 'application/json' });
  const m = await import('../core/util.js');
  m.dl(blob, `flowforge-backup-${m.stamp()}.json`);
  toast('🛟 Резервная копия сохранена');
}
