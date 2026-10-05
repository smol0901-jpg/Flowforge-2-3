/* FlowForge · render/dims — измерение текста (кэш canvas-замеров) и размеры блоков */
import { wrap } from '../core/util.js';

let CTX = null;
const METRICS = new Map(); // "fs|text" -> width px
const CW = .6; // фолбэк: ширина символа относительно fs

export function initMetrics() {
  try { const c = document.createElement('canvas'); CTX = c.getContext('2d'); } catch { CTX = null; }
}

function textW(t, fs) {
  const key = fs + '|' + t;
  let v = METRICS.get(key);
  if (v !== undefined) return v;
  if (CTX) {
    CTX.font = `700 ${fs}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
    v = CTX.measureText(t).width;
  } else v = t.length * fs * CW;
  if (METRICS.size > 30000) METRICS.clear();
  METRICS.set(key, v);
  return v;
}

/** Автоподбор ширины под текст */
function fitW(n, lines) {
  const need = Math.max(...lines.map(l => textW(l, n.fs || 14))) + (n.fs || 14) * 2.4;
  const min = n.type === 'decision' ? 150 : 120;
  if (need > n.sw) { n.sw = Math.round(Math.min(need, 900) / 2) * 2; n.dirty = true; }
}

/** Полный пересчёт размеров всех узлов (вызывается при загрузке/изменении текста) */
export function dimAll(ns) {
  ns.forEach(n => {
    const lines = wrap(n.text, 16);
    n._lines = lines;
    fitW(n, lines);
  });
  applyDims(ns);
}

/** Итоговые w/h по sw/sh (детерминировано — важно для сериализации) */
export function applyDims(ns) {
  ns.forEach(n => {
    const fs = n.fs || 14, lines = n._lines || wrap(n.text, 16);
    n.w = n.sw || 170;
    n.h = Math.max(n.sh || 60, lines.length * fs * 1.32 + fs * 1.8);
  });
}

export function dimOne(n) {
  n._lines = wrap(n.text, 16);
  fitW(n, n._lines);
  const fs = n.fs || 14;
  n.w = n.sw || 170;
  n.h = Math.max(n.sh || 60, n._lines.length * fs * 1.32 + fs * 1.8);
}
