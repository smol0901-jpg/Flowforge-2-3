/* FlowForge · core/bus — шина событий (слабая связанность модулей) */
const L = new Map();
export const bus = {
  on(ev, fn) { (L.get(ev) || L.set(ev, new Set()).get(ev)).add(fn); return () => this.off(ev, fn); },
  off(ev, fn) { L.get(ev)?.delete(fn); },
  emit(ev, data) {
    const s = L.get(ev);
    if (s) for (const fn of [...s]) { try { fn(data); } catch (e) { console.error('[bus:' + ev + ']', e); } }
  },
  clear() { L.clear(); }
};
