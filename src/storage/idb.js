/* FlowForge · storage/idb — IndexedDB: документы, чанки больших схем, медиа (Blobs), метаданные */

const DB_NAME = 'flowforge', DB_VER = 1;
let _db = null, _ok = null;

export function idbSupported() {
  if (_ok === null) _ok = typeof indexedDB !== 'undefined' && !!indexedDB;
  return _ok;
}

export function openDB() {
  if (_db) return Promise.resolve(_db);
  if (!idbSupported()) return Promise.reject(new Error('IndexedDB недоступен'));
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB_NAME, DB_VER);
    rq.onupgradeneeded = () => {
      const d = rq.result;
      if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('chunks')) d.createObjectStore('chunks', { keyPath: 'k' });
      if (!d.objectStoreNames.contains('media')) d.createObjectStore('media', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
    };
    rq.onsuccess = () => { _db = rq.result; res(_db); };
    rq.onerror = () => rej(rq.error);
    rq.onblocked = () => rej(new Error('IndexedDB заблокирован другой вкладкой'));
  });
}

const tx = async (store, mode, fn) => {
  const d = await openDB();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode), s = t.objectStore(store);
    let out;
    try { out = fn(s); } catch (e) { rej(e); return; }
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('aborted'));
  });
};

const wrapReq = rq => new Promise((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });

/* ---------- документы ---------- */
export const putDoc = meta => tx('docs', 'readwrite', s => s.put({ ...meta, updatedAt: Date.now() }));
export const getDoc = id => tx('docs', 'readonly', s => wrapReq(s.get(id)));
export const delDoc = id => tx('docs', 'readwrite', s => s.delete(id));
export const allDocs = () => tx('docs', 'readonly', s => wrapReq(s.getAll()));

/* ---------- чанки (для схем 10 000+ блоков: JSON режется на куски) ---------- */
export const putChunk = (key, data) => tx('chunks', 'readwrite', s => s.put({ k: key, data }));
export const getChunk = key => tx('chunks', 'readonly', s => wrapReq(s.get(key)));
export const delChunksBy = prefix => tx('chunks', 'readwrite', async s => {
  const keys = await wrapReq(s.getAllKeys(IDBKeyRange.bound(prefix, prefix + '\uffff')));
  keys.forEach(k => s.delete(k));
});

/** Разбить объект на чанки по ~512 КБ и сохранить */
export async function savePacked(id, obj, per = 400_000) {
  const str = JSON.stringify(obj);
  const n = Math.ceil(str.length / per);
  for (let i = 0; i < n; i++) await putChunk(id + '#' + i, str.slice(i * per, (i + 1) * per));
  await putChunk(id + '#meta', { parts: n, size: str.length });
  return n;
}
export async function loadPacked(id) {
  const meta = await getChunk(id + '#meta');
  if (!meta) return null;
  let s = '';
  for (let i = 0; i < meta.parts; i++) { const c = await getChunk(id + '#' + i); if (c == null) throw new Error('chunk missing ' + i); s += c; }
  return JSON.parse(s);
}

/* ---------- медиа (изображения, вложения) ---------- */
export const putMedia = (id, blob, meta = {}) => tx('media', 'readwrite', s => s.put({ id, blob, meta, at: Date.now() }));
export const getMedia = id => tx('media', 'readonly', s => wrapReq(s.get(id)));
export const delMedia = id => tx('media', 'readwrite', s => s.delete(id));
export const allMedia = () => tx('media', 'readonly', s => wrapReq(s.getAll()));

/* ---------- kv ---------- */
export const kvSet = (k, v) => tx('kv', 'readwrite', s => s.put(v, k));
export const kvGet = k => tx('kv', 'readonly', s => wrapReq(s.get(k)));

export async function estimateUsage() {
  if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); return { used: e.usage || 0, quota: e.quota || 0 }; }
  return { used: 0, quota: 0 };
}
