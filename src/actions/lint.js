/* FlowForge · actions/lint — статическая проверка схемы (структура, условия, достижимость) */
import { nodes, edges } from '../core/state.js';

/**
 * Возвращает список замечаний: {l:'err'|'warn', m:string, ids:string[]}
 */
export function lint() {
  const out = [];
  const ns = nodes().filter(n => n.type !== 'note');
  if (!ns.length) return [{ l: 'info', m: 'Схема пуста', ids: [] }];
  const inn = new Map(ns.map(n => [n.id, 0])), outn = new Map(ns.map(n => [n.id, []]));
  edges().forEach(e => {
    if (inn.has(e.to)) inn.set(e.to, inn.get(e.to) + 1);
    if (outn.has(e.from)) outn.get(e.from).push(e);
  });
  const starts = ns.filter(n => n.type === 'terminal' && !inn.get(n.id));
  const ends = ns.filter(n => n.type === 'terminal' && !outn.get(n.id).length);
  if (!starts.length) out.push({ l: 'warn', m: 'Нет блока «Начало»: овал без входящих связей', ids: [] });
  if (starts.length > 1) out.push({ l: 'warn', m: `Несколько входов (${starts.length}): проверьте, что так задумано`, ids: starts.map(n => n.id) });
  if (!ends.length) out.push({ l: 'warn', m: 'Нет блока «Конец»: овал без исходящих связей', ids: [] });
  ns.forEach(n => {
    const o = outn.get(n.id), i = inn.get(n.id), t = n.text.replace(/\s+/g, ' ').trim().slice(0, 28);
    if (!n.text.trim()) out.push({ l: 'err', m: 'Блок без текста', ids: [n.id] });
    if (!i && !o.length && n.type !== 'conn') { out.push({ l: 'err', m: `«${t || 'без текста'}» ни с чем не соединён`, ids: [n.id] }); return; }
    if (n.type === 'decision') {
      if (o.length < 2) out.push({ l: 'err', m: `Условие «${t}»: нужно минимум 2 выхода, сейчас ${o.length}`, ids: [n.id] });
      else if (o.some(e => !(e.label || '').trim())) out.push({ l: 'warn', m: `Условие «${t}»: подпишите ветки (Да / Нет)`, ids: [n.id] });
    } else if (!o.length && n.type !== 'terminal' && n.type !== 'conn') out.push({ l: 'warn', m: `«${t}»: тупик, нет выхода`, ids: [n.id] });
  });
  if (starts.length) {
    const seen = new Set(), q = starts.map(n => n.id);
    while (q.length) { const u = q.pop(); if (seen.has(u)) continue; seen.add(u); (outn.get(u) || []).forEach(e => q.push(e.to)); }
    const un = ns.filter(n => !seen.has(n.id) && (inn.get(n.id) || outn.get(n.id).length) && !(n.type === 'terminal' && !inn.get(n.id)));
    if (un.length) out.push({ l: 'warn', m: `Не достижимо от «Начала»: ${un.length} бл.`, ids: un.map(n => n.id) });
  }
  return out;
}
