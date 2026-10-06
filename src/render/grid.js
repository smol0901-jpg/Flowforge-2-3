/* FlowForge · render/grid — фоновая сетка-«точками», синхронная с камерой (включая поворот) */
import { camera } from '../core/state.js';
import { getRot, s2w, w2s } from './canvas.js';

const cache = new WeakMap();

/**
 * Обновляет div-оверлей под SVG: смещение и масштаб точек считаются от камеры,
 * поэтому сетка «прилипает» к мировым координатам даже при повёрнутом листе.
 * cfg.grid=false или слишком мелкий шаг → скрываем.
 */
export function paintGrid(el, dotColor, gsCfg) {
  if (!el) return;
  const c = camera(), GS = gsCfg || 20;
  let st = cache.get(el);
  if (!st) { st = {}; cache.set(el, st); }
  if (!dotColor || c.k < .35) { el.style.display = 'none'; return; }
  const per = GS * c.k;
  const r = el.parentElement ? el.parentElement.getBoundingClientRect() : el.getBoundingClientRect();
  // мировая точка, соответствующая центру экрана
  const cw = s2w(r.width / 2, r.height / 2, c);
  // экранные координаты ближайшего узла сетки (округление в мире к шагу)
  const sp = w2s(Math.round(cw[0] / GS) * GS, Math.round(cw[1] / GS) * GS, c);
  const rotDeg = getRot() * 180 / Math.PI;
  const D = Math.ceil(Math.hypot(r.width, r.height) * 1.08 / per + 4) * per; // сторона карета, чтобы закрыть углы при повороте
  const rad = Math.max(.8, c.k);
  const s = el.style;
  if (st.per === per && st.x === sp[0] && st.y === sp[1] && st.rot === rotDeg && st.D === D && st.dot === dotColor) return;
  st.per = per; st.x = sp[0]; st.y = sp[1]; st.rot = rotDeg; st.D = D; st.dot = dotColor;
  s.display = 'block';
  s.width = s.height = D + 'px';
  s.transform = `translate(${(sp[0] - D / 2).toFixed(2)}px,${(sp[1] - D / 2).toFixed(2)}px) rotate(${rotDeg.toFixed(3)}deg)`;
  s.backgroundImage = `radial-gradient(circle at 50% 50%,${dotColor} ${rad}px,transparent ${rad + .6}px)`;
  s.backgroundSize = `${per}px ${per}px`;
  s.backgroundPosition = `${D / 2 - per / 2}px ${D / 2 - per / 2}px`;
}
