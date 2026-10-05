/* FlowForge · storage/adapter — единый API поверх localStorage и IndexedDB с автовыбором и фолбэком */
import { idbSupported, putDoc, getDoc, delDoc, allDocs, savePacked, loadPacked, delChunksBy } from './idb.js';

const LS_MAIN = 'ffMain3', LS_DOCS = 'ffDocs3', LS_MIG = 'ffMigratedFrom';
let MODE = null;         // 'idb' | 'ls'
const listeners = [];

export const onStorageChange = fn => listeners.push(fn);
const announce = () => listeners.forEach(f => { try { f(MODE); } catch { } });

export function currentMode() {
  if (MODE) return MODE;
  MODE = pickMode();
  return MODE;
}
function pickMode() {
  try {
    const pref = JSON.parse(localStorage.getItem('ffStoragePref') || '"auto"');
    if (pref === 'ls') return 'ls';
    if (pref === 'idb') return idbSupported() ? 'idb' : 'ls';
  } catch { }
  return idbSupported() ? 'idb' : 'ls';
}
export function setPreferredMode(m) {
  localStorage.setItem('ffStoragePref', JSON.stringify(m));
  MODE = m === 'idb' && !idbSupported() ? 'ls' : m;
  announce();
  return MODE;
}
export function availableModes() { return idbSupported() ? ['idb', 'ls'] : ['ls']; }

/* ---------- локальный черновик (текущая открытая схема) ---------- */
export async function saveLocal(json) {
  if (currentMode() === 'idb') {
    try { await savePacked('__local__', JSON.parse(json)); return; } catch (e) { console.warn('IDB local fail → LS', e); MODE = 'ls'; announce(); }
  }
  try { localStorage.setItem(LS_MAIN, json); } catch (e) { toastQuota(); }
}
export async function loadLocal() {
  if (currentMode() === 'idb') {
    try { const o = await loadPacked('__local__'); if (o) return JSON.stringify(o); } catch (e) { console.warn(e); }
  }
  return localStorage.getItem(LS_MAIN);
}

/* ---------- библиотека документов ---------- */
export async function listDocs() {
  if (currentMode() === 'idb') {
    try { return (await allDocs()).filter(d => d.id !== '__local__'); } catch (e) { console.warn(e); }
  }
  try { return JSON.parse(localStorage.getItem(LS_DOCS) || '[]'); } catch { return []; }
}
export async function saveDocMeta(meta) {
  if (currentMode() === 'idb') { try { await putDoc(meta); return; } catch (e) { console.warn(e); } }
  lsUpdateDocs(list => { const i = list.findIndex(d => d.id === meta.id); if (i >= 0) list[i] = meta; else list.push(meta); return list; });
}
export async function deleteDoc(id) {
  if (currentMode() === 'idb') { try { await delDoc(id); await delChunksBy(id + '#'); return; } catch (e) { console.warn(e); } }
  lsUpdateDocs(list => list.filter(d => d.id !== id));
}
export async function storeDocBody(id, json) {
  if (currentMode() === 'idb') { try { await savePacked(id, JSON.parse(json)); return true; } catch (e) { console.warn(e); } }
  try { lsUpdateDocs(list => { list.forEach(d => { if (d.id === id) d.body = json; }); return list; }); return true; }
  catch { toastQuota(); return false; }
}
export async function loadDocBody(id) {
  if (currentMode() === 'idb') {
    try { const o = await loadPacked(id); if (o) return JSON.stringify(o); } catch (e) { console.warn(e); }
  }
  try { const l = JSON.parse(localStorage.getItem(LS_DOCS) || '[]'); const d = l.find(x => x.id === id); return d?.body || null; } catch { return null; }
}

function lsUpdateDocs(fn) {
  try {
    const list = fn(JSON.parse(localStorage.getItem(LS_DOCS) || '[]'));
    localStorage.setItem(LS_DOCS, JSON.stringify(list));
  } catch { toastQuota(); }
}

let quotaWarned = 0;
function toastQuota() {
  import('../core/util.js').then(m => m.toast('Хранилище переполнено — удалите старые версии или включите IndexedDB'));
  if (Date.now() - quotaWarned > 60000) { quotaWarned = Date.now(); console.error('localStorage quota exceeded'); }
}

/* ---------- миграция со старых ключей v2 ---------- */
export async function migrateOld() {
  if (localStorage.getItem(LS_MIG)) return false;
  let moved = 0;
  try {
    const oldMain = localStorage.getItem('ffMain');
    if (oldMain) { await saveLocal(oldMain); moved++; }
    const oldDocs = localStorage.getItem('ffDocs');
    if (oldDocs) {
      const list = JSON.parse(oldDocs);
      for (const d of list) {
        if (!d || !d.id) continue;
        const body = d.body; delete d.body;
        await saveDocMeta({ ...d, migrated: true });
        if (body) await storeDocBody(d.id, typeof body === 'string' ? body : JSON.stringify(body));
        moved++;
      }
    }
  } catch (e) { console.warn('migrate', e); }
  localStorage.setItem(LS_MIG, String(Date.now()));
  return moved > 0;
}
