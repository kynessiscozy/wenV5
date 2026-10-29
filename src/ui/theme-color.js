/** Keep the browser/PWA chrome aligned with the actual selected page palette. */
export function syncBrowserThemeColor() {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const background = getComputedStyle(document.documentElement).backgroundColor;
  if (background && background !== 'rgba(0, 0, 0, 0)') meta.setAttribute('content', background);
}
