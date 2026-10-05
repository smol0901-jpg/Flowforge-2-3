/* FlowForge · storage/versions — «история версий» схемы (как ffV в v2, но поверх адаптера) */
import { kvSet, kvGet } from './idb.js';
import { currentMode } from './adapter.js';

const LS_KEY = 'ffVersions3';
const MAX_PER_DOC = 12;

async function readAll() {
  if (currentMode() === 'idb') { try { return (await kvGet(LS_KEY)) || {}; } catch { } }
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
async function writeAll(o) {
  if (currentMode() === 'idb') { try { await kvSet(LS_KEY, o); return true; } catch (e) { console.warn(e); } }
  try { localStorage.setItem(LS_KEY, JSON.stringify(o)); return true; } catch { prune(o); try { localStorage.setItem(LS_KEY, JSON.stringify(o)); return true; } catch { return false; } }
}
function prune(o) { // при переполнении — режем самые старые версии
  Object.keys(o).forEach(id => { const a = o[id]; if (a.length > 4) a.splice(0, a.length - 4); });
}

export async function addVersion(docId, snapshotStr) {
  if (!docId || !snapshotStr) return;
  const all = await readAll();
  const arr = all[docId] = (all[docId] || []);
  const last = arr[arr.length - 1];
  if (last && last.s === snapshotStr) return;
  arr.push({ t: Date.now(), s: snapshotStr });
  while (arr.length > MAX_PER_DOC) arr.shift();
  if (!(await writeAll(all))) { arr.pop(); await writeAll(all); }
}
export async function listVersions(docId) {
  const all = await readAll();
  return (all[docId] || []).map((v, i) => ({ n: i + 1, t: v.t }));
}
export async function getVersion(docId, n) {
  const all = await readAll();
  const v = (all[docId] || [])[n - 1];
  return v ? v.s : null;
}
export async function clearVersions(docId) {
  const all = await readAll();
  delete all[docId];
  await writeAll(all);
}
