/* FlowForge · ui/palette — панель фигур: категории + пресеты ролей (клик/тап → режим постановки) */
import { SHAPES, CATS, shapesByCat } from '../data/shapes.js';
import { PRESETS, paletteFor } from '../data/presets.js';
import { miniIcon } from '../render/shapes.js';
import { doc, nid, pushNode, commit, activeLayer, getSel, clearSel, addSel, toast } from '../core/state.js';
import { dimOne } from '../render/dims.js';
import { bus } from '../core/bus.js';
import { esc } from '../core/util.js';

let el = null, curPreset = 'none', pendingType = null;

export const placingType = () => pendingType;
export function cancelPlacing() { pendingType = null; syncMarks(); }

export function initPalette(container) {
  el = container;
  el.innerHTML = `<div class="pal-tabs" role="tablist"></div><div class="pal-list" role="listbox" aria-label="Фигуры"></div>`;
  const tabs = el.querySelector('.pal-tabs'), list = el.querySelector('.pal-list');
  const keys = ['none', ...Object.keys(PRESETS), ...CATS.map(c => c[0])];
  tabs.innerHTML = keys.map(k => `<button class="pt ${k === curPreset ? 'on' : ''}" data-p="${k}" role="tab">${esc(tabName(k))}</button>`).join('');
  tabs.addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    curPreset = b.dataset.p;
    tabs.querySelectorAll('.pt').forEach(x => x.classList.toggle('on', x === b));
    renderList(list);
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-shape]'); if (!b) return;
    pickShape(b.dataset.shape, b.dataset.role, b.dataset.color);
  });
  renderList(list);
  bus.on('state:tool', () => { if (pendingType) cancelPlacing(); });
}

const tabName = k => k === 'none' ? 'Базовые' : (PRESETS[k]?.name || (CATS.find(c => c[0] === k) || [, k])[1]);

function items() {
  if (PRESETS[curPreset] && curPreset !== 'none') {
    const ids = paletteFor(curPreset);
    return ids.map(id => SHAPES.find(s => s.id === id)).filter(Boolean);
  }
  if (curPreset === 'none') return SHAPES.filter(s => s.cat === 'flow');
  return shapesByCat(curPreset);
}

function renderList(list) {
  list.innerHTML = items().map(s =>
    `<button class="pi" data-shape="${s.id}" data-role="${esc(curPreset)}" title="${esc(s.name)}">${miniIcon(s.id, s.color, 34)}<span>${esc(s.name)}</span></button>`
  ).join('');
  syncMarks();
}

function syncMarks() {
  el?.querySelectorAll('.pi').forEach(b => b.classList.toggle('pend', b.dataset.shape === pendingType));
}

/** Выбор фигуры → включаем режим постановки; дальше клик по холсту создаёт блок */
function pickShape(id, role, color) {
  pendingType = id;
  pendingRole = role || null; pendingColor = color || null;
  syncMarks();
  bus.emit('palette:placing', id);
}

let pendingRole = null, pendingColor = null;

/** Создание блока в мировых координатах (вызывается из edit-обработчика сцены) */
export function createAt(type, wx, wy, extra = {}) {
  const s = SHAPES.find(x => x.id === type) || { id: 'process', color: '#89b4fa', name: 'Блок' };
  const L = activeLayer();
  if (L?.locked) { toast('Слой заблокирован'); return null; }
  const n = { id: nid('n'), type: s.id, text: extra.text || shortName(s.name), x: Math.round(wx - 85), y: Math.round(wy - 30), layer: L.id, ...(extra.color || pendingColor ? { color: extra.color || pendingColor } : {}) };
  if (extra.role || pendingRole) n.meta = { ...(n.meta || {}), role: extra.role || pendingRole };
  dimOne(n);
  pushNode(n);
  clearSel(); addSel(n.id);
  commit();
  bus.emit('node:created', n.id);
  pendingType = null; pendingRole = null; pendingColor = null; syncMarks();
  return n.id;
}

const shortName = t => String(t).split(/[·/(]/)[0].trim().slice(0, 18);
