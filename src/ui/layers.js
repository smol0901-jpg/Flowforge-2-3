/* FlowForge · ui/layers — панель слоёв: видимость, блокировка, активный слой, роли */
import { $, esc } from '../core/util.js';
import { layers, doc, setActiveLayer, addLayer, removeLayer, commit, toast } from '../core/state.js';
import { bus } from '../core/bus.js';

let host = null;

export function initLayers(panel) {
  host = panel || document.createElement('div');
  if (!panel) { host.id = 'layersP'; host.className = 'floatp'; document.body.appendChild(host); }
  host.addEventListener('click', e => {
    const b = e.target.closest('[data-ly]'); if (!b) return;
    const id = b.dataset.ly, act = b.dataset.act;
    const L = layers().find(l => l.id === id); if (!L) return;
    if (act === 'vis') { L.visible = !L.visible; commit(); redraw(); }
    if (act === 'lock') { L.locked = !L.locked; commit(); redraw(); }
    if (act === 'act') { setActiveLayer(id); }
    if (act === 'del') { if (removeLayer(id)) redraw(); return; }
    render();
  });
  host.addEventListener('dblclick', e => {
    const b = e.target.closest('[data-ly-name]'); if (!b) return;
    const L = layers().find(l => l.id === b.dataset.lyName); if (!L) return;
    const n = prompt('Название слоя:', L.name);
    if (n) { L.name = String(n).slice(0, 60); commit(); render(); }
  });
  bus.on('state:layers', render);
  bus.on('state:doc', render);
}

export function newLayer(name, opts) { addLayer(name, opts); render(); redraw(); }

function render() {
  if (!host) return;
  const d = doc();
  host.innerHTML = `<h4>Слои <button data-addlayer class="mini" title="Добавить слой">＋</button></h4>` +
    layers().map(l => `<div class="lrow ${d.activeLayer === l.id ? 'on' : ''}" data-ly="${l.id}">
      <button data-act="vis" data-ly="${l.id}" title="Показать/скрыть">${l.visible ? '👁' : '–'}</button>
      <button data-act="lock" data-ly="${l.id}" title="Блокировать">${l.locked ? '🔒' : '🔓'}</button>
      <span data-ly-name="${l.id}" style="color:${l.color || '#89b4fa'}">${esc(l.name)}</span>
      <button data-act="act" data-ly="${l.id}" title="Активный слой">●</button>
      <button data-act="del" data-ly="${l.id}" title="Удалить слой">×</button></div>`).join('');
  host.querySelector('[data-addlayer]')?.addEventListener('click', () => { newLayer(); });
}

const redraw = () => bus.emit('ui:redraw-lite');
