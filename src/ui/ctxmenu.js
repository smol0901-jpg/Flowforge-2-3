/* FlowForge · ui/ctxmenu — контекстное меню (долгое нажатие / правый клик) */
import { bus } from '../core/bus.js';
import { getSel, N, E, G } from '../core/state.js';

let el = null;

const ITEMS = [
  ['➡ Связать отсюда', 'linkFrom'],
  ['⧉ Дублировать', 'act:dup'],
  ['🗑 Удалить', 'act:del'],
  ['—', 'sep'],
  ['↔ Развернуть связь', 'act:rev'],
  ['▣ В группу', 'act:grp'],
  ['⇈ На передний план', 'act:front'],
  ['⇊ На задний план', 'act:back'],
  ['—', 'sep'],
  ['⛶ Показать всё', 'act:fit'],
  ['✏ Переименовать', 'edit:text']
];

export function showCtx(x, y, targetId) {
  hideCtx();
  el = document.createElement('div');
  el.id = 'ctxMenu';
  el.setAttribute('role', 'menu');
  el.innerHTML = ITEMS.map(([t, a]) => a === 'sep' ? '<hr>' : `<button role="menuitem" data-cm="${a}" data-tid="${targetId || ''}">${t}</button>`).join('');
  el.style.left = Math.min(x, innerWidth - 210) + 'px';
  el.style.top = Math.min(y, innerHeight - 300) + 'px';
  document.body.appendChild(el);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-cm]'); if (!b) return;
    const a = b.dataset.cm, tid = b.dataset.tid;
    if (a === 'linkFrom') bus.emit('link:start', tid);
    else if (a === 'edit:text') bus.emit('edit:text', tid);
    else bus.emit(a.replace('act:', 'act:'));
    hideCtx();
  });
  setTimeout(() => addEventListener('pointerdown', outside, { once: true }), 0);
}
const outside = e => { if (!e.target.closest('#ctxMenu')) hideCtx(); else setTimeout(() => addEventListener('pointerdown', outside, { once: true }), 0); };
export const hideCtx = () => { el?.remove(); el = null; };
