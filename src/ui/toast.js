let toastEl = null;
let hideTimer = null;

function ensureToastEl() {
  if (toastEl && document.body.contains(toastEl)) return toastEl;
  toastEl = document.createElement('div');
  toastEl.id = 'tjToast';
  toastEl.className = 'tj-toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastEl);
  return toastEl;
}

/**
 * Non-blocking replacement for alert(). Shows a small message near the
 * bottom of the screen that auto-dismisses, instead of a native dialog
 * that freezes the whole page.
 * @param {string} message
 * @param {{type?: 'default'|'error'|'success', duration?: number}} [opts]
 */
export function showToast(message, opts = {}) {
  const { type = 'default', duration = 2600 } = opts;
  const el = ensureToastEl();
  el.textContent = message;
  el.className = `tj-toast tj-toast-${type} show`;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    el.classList.remove('show');
  }, duration);
}
