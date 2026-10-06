/* FlowForge · ui/toast — всплывающие сообщения (подключается к core/util.setToastHandler) */
import { setToastHandler, esc } from '../core/util.js';

let box = null;
export function initToast() {
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastBox';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  setToastHandler(msg => {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = String(msg);
    box.appendChild(t);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3200);
  });
}
