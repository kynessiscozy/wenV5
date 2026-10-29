import { initTheme } from './ui/theme.js';
import { initCharacterScene } from './ui/character-scene.js';
import { initCharacterCamera } from './ui/character-camera.js';
import { initCharacterCompanion } from './ui/character-companion.js';
import { initHomeTheme } from './ui/home-theme.js';

// The home scene is a small entry point; the report engines can load separately.
// Keep an early tap rather than silently dropping it while those engines arrive.
let pendingAction = null;
let pendingButton = null;
let pendingLabel = null;
let originalLabel = '';
let mainLoadFailed = false;
const status = document.getElementById('homeLoadingStatus');

function clearPendingFeedback() {
  pendingButton?.removeAttribute('aria-busy');
  if (pendingLabel) pendingLabel.textContent = originalLabel;
  pendingButton = null;
  pendingLabel = null;
  originalLabel = '';
  if (status) status.textContent = '';
}

function queueAction(name, args, buttonId) {
  clearPendingFeedback();
  pendingAction = { name, args };
  pendingButton = document.getElementById(buttonId);
  pendingButton?.setAttribute('aria-busy', 'true');
  if (buttonId === 'homeCtaMain' || buttonId === 'homeCtaCal') {
    pendingLabel = pendingButton?.querySelector(':scope > span:last-child');
    if (pendingLabel) {
      originalLabel = pendingLabel.textContent;
      pendingLabel.textContent = '加载中…';
    }
  }
  if (mainLoadFailed) {
    pendingButton?.removeAttribute('aria-busy');
    if (pendingLabel) pendingLabel.textContent = '请刷新重试';
    if (status) status.textContent = '加载失败，请检查网络后刷新页面';
  } else if (status) status.textContent = '正在加载，请稍候';
}

// Inline home controls need temporary handlers before the main module assigns
// the real functions. Only the most recent intent is replayed.
const earlyMenu = (...args) => queueAction('toggleHomeMenu', args, 'homeMenuBtn');
const earlyCalendar = (...args) => queueAction('openCalendarMode', args, 'homeCtaCal');
if (typeof window.toggleHomeMenu !== 'function') window.toggleHomeMenu = earlyMenu;
if (typeof window.openCalendarMode !== 'function') window.openCalendarMode = earlyCalendar;
window.addEventListener('tj:app-ready', () => {
  const action = pendingAction;
  pendingAction = null;
  clearPendingFeedback();
  if (!action) return;
  const handler = window[action.name];
  if (typeof handler === 'function' && handler !== earlyMenu && handler !== earlyCalendar) handler(...action.args);
});

initTheme();
initCharacterScene();
initCharacterCamera();

export const characterCompanion = initCharacterCompanion({
  deferHomeAssets: true,
  openForm: () => {
    if (typeof window.TJOpenForm === 'function') window.TJOpenForm();
    else queueAction('TJOpenForm', [], 'homeCtaMain');
  },
  // A report prompt should never toggle an already open assistant shut.
  openAsk: () => {
    if (!document.getElementById('aiSheet')?.classList.contains('open')) window.openAsk?.();
  },
});
export const homeThemePicker = initHomeTheme({ setHomeCharacter: characterCompanion.setHomeCharacter });

// Heavy report engines are not required to render or operate the home scene.
import('./main.js').catch(error => {
  mainLoadFailed = true;
  console.error('[app] 加载失败', error);
  if (pendingAction) {
    pendingButton?.removeAttribute('aria-busy');
    if (pendingLabel) pendingLabel.textContent = '请刷新重试';
    if (status) status.textContent = '加载失败，请检查网络后刷新页面';
  }
});
