/* FlowForge · actions/inline — инлайн-редактирование текста блока и подписи связи поверх SVG */
import { $ } from '../core/util.js';
import { N, E, commit, toast } from '../core/state.js';
import { s2w, w2s } from '../render/canvas.js';
import { dimAll } from '../render/dims.js';
import { bus } from '../core/bus.js';

let inp = null;

export function initInline(cfg, statusFn) {
  bus.on('edit:text', id => openNode(id, cfg, statusFn));
  bus.on('edit:edgelabel', id => openEdge(id, cfg, statusFn));
  bus.on('draw:full', () => close(true));
}

function place(wx, wy, w, h, text, onDone) {
  close(true);
  inp = document.createElement('textarea');
  inp.className = 'inlineEdit';
  inp.rows = 2;
  inp.value = text;
  const stage = $('#stage').getBoundingClientRect();
  const svgBox = $('#cv').getBoundingClientRect();
  const [sx, sy] = w2s(wx, wy);
  inp.style.left = (svgBox.left - stage.left + sx) + 'px';
  inp.style.top = (svgBox.top - stage.top + sy) + 'px';
  inp.style.width = Math.max(90, w) + 'px';
  document.body.appendChild(inp);
  inp.focus(); inp.select();
  const done = () => { const v = inp?.value ?? ''; const ok = v.trim() !== ''; inp?.remove(); inp = null; if (ok) onDone(v); };
  inp.addEventListener('blur', done);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); done(); }
    if (e.key === 'Escape') { inp.remove(); inp = null; }
    e.stopPropagation();
  });
}
const close = force => { if (inp && force) { inp.remove(); inp = null; } };

function openNode(id, cfg, statusFn) {
  const n = N(id); if (!n || n.lock) return;
  place(n.x, n.y, n.w * cfg.camera.k, n.h * cfg.camera.k, n.text, v => {
    n.text = String(v).slice(0, 400);
    dimAll(); commit();
    bus.emit('draw:full', cfg);
  });
}
function openEdge(id, cfg, statusFn) {
  const e = E(id); if (!e) return;
  const mx = 0, my = 0; // середина линии вычисляется в canvas; используем центр между блоками
  place(mx, my, 120, 24, e.label || '', v => { e.label = String(v).slice(0, 80); commit(); bus.emit('draw:full', cfg); });
}
