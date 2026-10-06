/* FlowForge · ui/checklists — конструктор и выполнение чеклистов (ХАССП, Роспотребнадзор, ТО, онбординг) */
import { $, esc, toast, stamp } from '../core/util.js';
import { doc, commit, N, getSel } from '../core/state.js';
import { bus } from '../core/bus.js';

let host = null, curId = null;

export function initChecklists(panel) {
  host = panel;
  host.innerHTML = `<div class="cl-h"><select id="clSel" aria-label="Чеклист"></select><button id="clNew" title="Новый чеклист">＋</button><button id="clDel" title="Удалить">×</button></div>
  <div class="cl-prog"><i id="clBar"></i><span id="clTxt"></span></div>
  <ul id="clItems" role="list"></ul>
  <div class="cl-add"><input id="clInp" placeholder="Новый пункт…" maxlength="300"><button id="clAdd" title="Добавить">＋</button><button id="clLink" title="Привязать к выбранному блоку">🔗</button></div>
  <div class="cl-row2"><button id="clExport" class="pri">Экспорт отчёта CSV</button><button id="clReset">Сброс выполнено</button></div>`;
  const d = doc();
  host.querySelector('#clNew').onclick = () => {
    const name = prompt('Название чеклиста:', 'Чеклист'); if (!name) return;
    d.checklists.push({ id: 'c' + Date.now().toString(36), name: String(name).slice(0, 80), items: [] });
    commit(); render();
  };
  host.querySelector('#clDel').onclick = () => {
    if (!curId) return;
    d.checklists = d.checklists.filter(c => c.id !== curId); curId = null; commit(); render();
  };
  host.querySelector('#clSel').onchange = e => { curId = e.target.value; render(); };
  host.querySelector('#clAdd').onclick = addItem;
  host.querySelector('#clInp').onkeydown = e => { if (e.key === 'Enter') addItem(); };
  host.querySelector('#clLink').onclick = () => {
    const it = selItem(); if (!it) return;
    const s = getSel(); if (!s.size) return toast('Сначала выберите блок на схеме');
    it.node = [...s][0]; commit(); render(); toast('Пункт привязан к блоку');
  };
  host.querySelector('#clExport').onclick = exportCsv;
  host.querySelector('#clReset').onclick = () => { const c = cur(); if (c) { c.items.forEach(i => { i.done = false; i.by = null; i.at = null; }); commit(); render(); } };
  host.querySelector('#clItems').addEventListener('change', e => {
    const it = e.target.closest('[data-it]'); if (!it) return;
    const item = cur()?.items.find(x => x.id === it.dataset.it); if (!item) return;
    item.done = it.checked; item.at = item.done ? Date.now() : null; item.by = item.done ? (localStorage.getItem('ffUser') || '') : null;
    commit(); render();
    if (item.done && item.node) flashNode(item.node);
  });
  host.querySelector('#clItems').addEventListener('dblclick', e => {
    const it = e.target.closest('[data-it-text]'); if (!it) return;
    const item = cur()?.items.find(x => x.id === it.dataset.itText); if (!item) return;
    const t = prompt('Текст пункта:', item.text); if (t != null) { item.text = String(t).slice(0, 300); commit(); render(); }
  });
  host.querySelector('#clItems').addEventListener('click', e => {
    const go = e.target.closest('[data-goto]'); if (go) { bus.emit('nav:node', go.dataset.goto); return; }
    const rm = e.target.closest('[data-rm]'); if (rm) { const c = cur(); c.items = c.items.filter(x => x.id !== rm.dataset.rm); commit(); render(); }
  });
  bus.on('state:doc', render);
  render();
}

const cur = () => doc().checklists.find(c => c.id === curId) || doc().checklists[0];
const selItem = () => cur()?.items[cur()._pick ?? 0];

function addItem() {
  const inp = host.querySelector('#clInp'), t = inp.value.trim(); if (!t) return;
  const c = cur(); if (!c) { toast('Создайте чеклист'); return; }
  c.items.push({ id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: t.slice(0, 300), done: false, node: null, by: null, at: null });
  inp.value = ''; commit(); render();
}

function flashNode(id) { bus.emit('nav:node', id); }

function exportCsv() {
  const c = cur(); if (!c) return;
  const rows = [['чеклист', c.name], ['дата отчёта', new Date().toLocaleString()], [], ['пункт', 'выполнено', 'кто', 'когда', 'блок']];
  c.items.forEach(i => rows.push([i.text, i.done ? 'ДА' : 'нет', i.by || '', i.at ? new Date(i.at).toLocaleString() : '', i.node || '']));
  const esc2 = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  import('../core/util.js').then(m => m.dl(new Blob(['\uFEFF' + rows.map(r => r.map(esc2).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `checklist-${c.name}-${stamp()}.csv`));
}

function render() {
  if (!host || !host.querySelector('#clSel')) return;
  const cs = doc().checklists;
  if (!cs.length) { host.querySelector('#clSel').innerHTML = '<option>— нет чеклистов —</option>'; host.querySelector('#clItems').innerHTML = ''; host.querySelector('#clTxt').textContent = ''; return; }
  if (!cur()) curId = cs[0].id;
  const sel = host.querySelector('#clSel');
  sel.innerHTML = cs.map(c => `<option ${c.id === curId ? 'selected' : ''}>${esc(c.id)}</option>`).join('').replace(/>[^<]*</g, m => m); // значения id
  sel.innerHTML = cs.map(c => `<option value="${esc(c.id)}" ${c.id === curId ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const c = cur(), done = c.items.filter(i => i.done).length, p = c.items.length ? done / c.items.length : 0;
  host.querySelector('#clBar').style.width = (p * 100).toFixed(1) + '%';
  host.querySelector('#clTxt').textContent = `${done}/${c.items.length} · ${(p * 100).toFixed(0)}%`;
  host.querySelector('#clItems').innerHTML = c.items.map(i => `<li class="cli ${i.done ? 'ok' : ''}">
    <label><input type="checkbox" data-it="${i.id}" ${i.done ? 'checked' : ''}></label>
    <span data-it-text="${i.id}" title="Двойной клик — изменить">${esc(i.text)}</span>
    ${i.node ? `<button data-goto="${esc(i.node)}" title="Перейти к блоку">🧭</button>` : ''}
    ${i.done && i.at ? `<small>${new Date(i.at).toLocaleDateString()}${i.by ? ' · ' + esc(i.by) : ''}</small>` : ''}
    <button data-rm="${i.id}" title="Удалить пункт">×</button></li>`).join('');
}
