/** Focus is helpful, but unsupported options must never interrupt a workflow. */
export function focusSafely(element) {
  if (!element || typeof element.focus !== 'function') return;
  try { element.focus({ preventScroll: true }); }
  catch (_) { try { element.focus(); } catch (_) {} }
}
