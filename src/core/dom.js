/* FlowForge · core/dom — точечные DOM-мутации вместо innerHTML (быстрый частичный рендер) */

/**
 * Примонтировать children-строку в parent, переиспользуя существующие узлы.
 * Если структура не совпала — быстрый путь невозможен: один раз заменяем innerHTML.
 * Возвращает true если обошлись минимальными мутациями.
 */
export function patchChildren(parent, html) {
  if (parent.__lastHtml === html) return true;
  const old = parent.firstElementChild;
  // совпадение тегов по верхнему уровню и одинаковое число — можно патчить атрибуты
  if (old && !old.nextElementSibling && parent.childNodes.length === 1 && sameRootTag(html, old)) {
    const tmp = document.createElement(old.tagName.indexOf('svg') >= 0 ? 'svg' : 'div');
    tmp.innerHTML = extractInner(html);
    mutateLike(old, tmp.childNodes);
    parent.__lastHtml = html;
    return true;
  }
  parent.innerHTML = html;
  parent.__lastHtml = html;
  return false;
}

function sameRootTag(html, el) {
  const m = /^\s*<([a-zA-Z][\w-]*)/.exec(html);
  return !!m && m[1].toLowerCase() === el.tagName.toLowerCase();
}
function extractInner(html) {
  const s = html.replace(/^\s*<[a-zA-Z][\w-]*[^>]*>/, '');
  return s.replace(/<\/[a-zA-Z][\w-]*>\s*$/, '');
}

/** Синхронизирует коллекцию детей el с новой последовательностью узлов src (по tag + data-ключам) */
function mutateLike(el, src) {
  const kids = [...src];
  setAttrsFrom(el, kids.length ? [] : [], null);
  // атрибуты самого элемента берём из первого «эталонного» клонирования проще: переставляем детей
  let i = 0;
  let cur = el.firstElementChild;
  for (const n of kids) {
    if (!cur) { el.appendChild(n.cloneNode(true)); cur = el.lastElementChild; i++; continue; }
    if (cur.tagName !== n.tagName) { el.insertBefore(n.cloneNode(true), cur); cur = cur.previousElementSibling; }
    else copyAttrs(n, cur);
    mutateLike(cur, n.childNodes);
    i++;
    cur = cur.nextElementSibling;
  }
  while (el.children.length > kids.length) el.removeChild(el.lastElementChild);
}

function copyAttrs(from, to) {
  for (let i = to.attributes.length - 1; i >= 0; i--) {
    const a = to.attributes[i];
    if (!from.hasAttribute(a.name)) to.removeAttribute(a.name);
  }
  for (const a of from.attributes) if (to.getAttribute(a.name) !== a.value) to.setAttribute(a.name, a.value);
  if (from.textContent !== to.textContent && !from.firstElementChild && to.firstChild && to.firstChild.nodeType === 3) {
    if (from.textContent) to.textContent = from.textContent;
  } else if (!from.firstElementChild && from.textContent !== to.textContent) to.textContent = from.textContent;
}

function setAttrsFrom() { /* резерв: атрибуты корня патча совпадают — не трогаем */ }

/** Удалить все дочерние узлы */
export const clearEl = el => { while (el.firstChild) el.removeChild(el.firstChild); };
