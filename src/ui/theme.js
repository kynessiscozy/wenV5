/* Claude 风格主题：浅色 / 深色 / 跟随系统 */

const KEY = 'tj_theme';           // 'light' | 'dark' | 'system'
const mq = window.matchMedia('(prefers-color-scheme: dark)');

function resolve(pref) {
  if (pref === 'light' || pref === 'dark') return pref;
  return mq.matches ? 'dark' : 'light';
}

export function getThemePref() {
  try { return localStorage.getItem(KEY) || 'system'; } catch (e) { return 'system'; }
}

export function applyThemePref(pref) {
  const mode = resolve(pref);
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#262624' : '#faf9f5');
  try { localStorage.setItem(KEY, pref); } catch (e) {}
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.setAttribute('aria-label', mode === 'dark' ? '切换到浅色主题' : '切换到深色主题');
    btn.setAttribute('title', mode === 'dark' ? '浅色主题' : '深色主题');
  });
  return mode;
}

/** 在明暗之间切换（一旦手动切换即固定，不再跟随系统） */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || resolve(getThemePref());
  return applyThemePref(current === 'dark' ? 'light' : 'dark');
}

const ICONS =
  '<svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z"/></svg>' +
  '<svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/></svg>';

function makeToggle(cls) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'theme-toggle ' + cls;
  b.innerHTML = ICONS;
  b.addEventListener('click', toggleTheme);
  return b;
}

export function initTheme() {
  applyThemePref(getThemePref());

  // 系统主题变化时，仅在「跟随系统」模式下响应
  const onSystem = () => { if (getThemePref() === 'system') applyThemePref('system'); };
  mq.addEventListener ? mq.addEventListener('change', onSystem) : mq.addListener(onSystem);

  const mount = () => {
    // 首页右上角浮动按钮
    if (!document.querySelector('.theme-toggle-home')) {
      document.body.appendChild(makeToggle('theme-toggle-home'));
    }
    // 报告页顶栏按钮（放在操作区首位）
    const actions = document.querySelector('.p2-actions');
    if (actions && !actions.querySelector('.theme-toggle')) {
      actions.insertBefore(makeToggle('theme-toggle-top'), actions.firstChild);
    }
    applyThemePref(getThemePref());
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
}
