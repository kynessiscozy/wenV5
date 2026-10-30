import { focusSafely } from './focus.js';
import { syncBrowserThemeColor } from './theme-color.js';
import { JIANGJIANG } from '../character/wenwen.js';
import { MOON_FOX } from '../character/moon-fox.js';
import { EARTHFIRE_SOVEREIGN } from '../character/earthfire-sovereign.js';
import { JADE_EMPRESS } from '../character/jade-empress.js';
import { QINGLAN } from '../character/qinglan.js';
import { XINGLING } from '../character/xingling.js';
import { LUYE } from '../character/luye.js';
import { SUYAN } from '../character/suyan.js';
import { RONGRONG } from '../character/rongrong.js';
import { ZHIYA } from '../character/zhiya.js';

// One registry supplies the reel, scenes and report styling.
// New characters need only add another entry; choices remain page-local.
export const HOME_THEMES = Object.freeze({
  wenwen: Object.freeze({
    trait: Object.freeze({ label: '温柔', description: '温和细腻，善于倾听与陪伴。', mark: '柔', color: '#ecc1ae' }),
    reportLead: '别急，我们慢慢看。',
    character: JIANGJIANG,
    backdrop: Object.freeze({ wide: './art/sacred-study-wide.webp', mobile: './art/sacred-study-mobile.webp' }),
  }),
  moonfox: Object.freeze({
    trait: Object.freeze({ label: '神秘', description: '敏锐内敛，总想探索未知。', mark: '秘', color: '#b9dbef' }),
    reportLead: '有意思，线索已经浮现。',
    character: MOON_FOX,
    backdrop: Object.freeze({ wide: './art/moon-fox-study-wide.webp', mobile: './art/moon-fox-study-mobile.webp' }),
  }),
  diyan: Object.freeze({
    trait: Object.freeze({ label: '威严', description: '坚定果断，敢于为选择担当。', mark: '威', color: '#ec8278' }),
    reportLead: '先定根基，再看全局。',
    character: EARTHFIRE_SOVEREIGN,
    backdrop: Object.freeze({ wide: './art/earthfire-hall-wide.webp', mobile: './art/earthfire-hall-mobile.webp' }),
  }),
  yuchen: Object.freeze({
    trait: Object.freeze({ label: '从容', description: '沉静笃定，遇事自有节奏。', mark: '容', color: '#d9d3a9' }),
    reportLead: '静下心，先看这一处。',
    character: JADE_EMPRESS,
    backdrop: Object.freeze({ wide: './art/yuchen-hall-wide.webp', mobile: './art/yuchen-hall-mobile.webp' }),
  }),
  qinglan: Object.freeze({
    trait: Object.freeze({ label: '洒脱', description: '随性而不随波，坦然向前。', mark: '洒', color: '#a9d8d0' }),
    reportLead: '不妨换个角度。',
    character: QINGLAN,
    backdrop: Object.freeze({ wide: './art/qinglan-room-wide.webp', mobile: './art/qinglan-room-mobile.webp' }),
  }),
  xingling: Object.freeze({
    trait: Object.freeze({ label: '魅惑', description: '自有吸引力，懂得欣赏生活。', mark: '魅', color: '#d4b7f2' }),
    reportLead: '细看，线索藏在这里。',
    character: XINGLING,
    backdrop: Object.freeze({ wide: './art/xingling-room-wide.webp', mobile: './art/xingling-room-mobile.webp' }),
  }),
  luye: Object.freeze({
    trait: Object.freeze({ label: '好奇', description: '对新鲜事物，总想多看一眼。', mark: '奇', color: '#e8c595' }),
    reportLead: '发现一个有趣的起点。',
    character: LUYE,
    backdrop: Object.freeze({ wide: './art/luye-room-wide.webp', mobile: './art/luye-room-mobile.webp' }),
  }),
  suyan: Object.freeze({
    trait: Object.freeze({ label: '自信', description: '相信自己的眼光，敢于表达。', mark: '信', color: '#e8b4c1' }),
    reportLead: '先把重点抓出来。',
    character: SUYAN,
    backdrop: Object.freeze({ wide: './art/suyan-room-wide.webp', mobile: './art/suyan-room-mobile.webp' }),
  }),
  rongrong: Object.freeze({
    trait: Object.freeze({ label: '可爱', description: '热情真诚，善于发现小美好。', mark: '萌', color: '#f0ad78' }),
    reportLead: '把复杂的事拆小，也给自己一点暖意。',
    character: RONGRONG,
    backdrop: Object.freeze({ wide: './art/rongrong-room-wide.webp', mobile: './art/rongrong-room-mobile.webp' }),
  }),
  zhiya: Object.freeze({
    trait: Object.freeze({ label: '天真', description: '保有想象力，也相信惊喜。', mark: '真', color: '#f0dc90' }),
    reportLead: '带着好奇出发，答案会慢慢展开。',
    character: ZHIYA,
    backdrop: Object.freeze({ wide: './art/zhiya-room-wide.webp', mobile: './art/zhiya-room-mobile.webp' }),
  }),
});

// Derive readable UI shades from the registry's single character color. The
// illustrated swatch stays unchanged; a darker solid is used behind white text.
function applyTraitAccent(color) {
  const match = /^#([0-9a-f]{6})$/i.exec(color || '');
  if (!match) return;
  const rgb = [0, 2, 4].map(i => parseInt(match[1].slice(i, i + 2), 16));
  const [r, g, b] = rgb.map(value => value / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min, lightness = (max + min) / 2;
  let hue = 0;
  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  const h = Math.round(hue);
  const s = Math.max(45, Math.min(75, Math.round(saturation * 100)));
  // Bright yellow and green swatches can be too luminous even at 34% HSL.
  // Preserve their hue and saturation, but darken the solid until white text
  // meets WCAG AA. Keep the chart's RGB exactly in step with that solid.
  const channelsAt = l => [0, 8, 4].map(n => {
    const a = s / 100 * Math.min(l, 1 - l);
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  });
  const whiteContrast = channels => {
    const luminance = channels.map(value => {
      const v = value / 255;
      return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    return 1.05 / (luminance + .05);
  };
  let accentLightness = 34;
  while (accentLightness > 20 && whiteContrast(channelsAt(accentLightness / 100)) < 4.6) accentLightness -= .5;
  const root = document.documentElement;
  root.style.setProperty('--trait-color', color);
  root.style.setProperty('--trait-h', String(h));
  root.style.setProperty('--trait-s', `${s}%`);
  root.style.setProperty('--trait-accent-l', `${accentLightness}%`);
  root.style.setProperty('--trait-graph-light', channelsAt(accentLightness / 100).join(','));
  root.style.setProperty('--trait-graph-dark', rgb.join(','));
  syncBrowserThemeColor();
}

/** Choose a trait at entry, or reopen the selector without losing the current session. */
export function initHomeTheme({ setHomeCharacter = () => {} } = {}) {
  const home = document.getElementById('page1');
  const selection = document.getElementById('traitSelection');
  const status = document.getElementById('traitStatus');
  const track = document.getElementById('traitReelTrack');
  const machine = document.getElementById('traitMachine');
  const spin = document.getElementById('traitSpin');
  const lever = document.getElementById('traitLever');
  const confirm = document.getElementById('traitConfirm');
  const cancel = document.getElementById('traitCancel');
  const reselect = document.getElementById('homeTraitReset');
  if (!home || !selection || !track || !machine || !spin || !lever || !confirm || !cancel) return null;

  const entries = Object.entries(HOME_THEMES);
  const source = home.querySelector('.character-backdrop source');
  const backdrop = home.querySelector('.character-backdrop img');
  const portrait = home.querySelector('[data-character-asset="portrait"]');
  const loaded = new Map();
  const imageNotice = document.getElementById('homeLoadingStatus');
  const imageError = '部分场景暂时无法加载，请检查网络后刷新重试。';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = '';
  let draft = '';
  let state = 'idle'; // idle | spinning | loading
  let generation = 0;
  let animation = null;
  let background = [];
  let backgroundObserver = null;
  let firstOpening = true;
  let returnFocus = null;

  function shieldBackground() {
    // Capture fresh state each time: a report and a home page have different
    // focus/visibility states, and neither should be changed by cancelling.
    background = [];
    const shield = element => {
      if (element.nodeType !== 1 || element === selection || ['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName) || background.some(item => item.element === element)) return;
      background.push({ element, inert: element.hasAttribute('inert'), aria: element.getAttribute('aria-hidden') });
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    };
    Array.from(document.body.children).forEach(shield);
    // The larger app may append a modal while its modules load slowly.
    backgroundObserver = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(shield)));
    backgroundObserver.observe(document.body, { childList: true });
  }

  function restoreBackground() {
    backgroundObserver?.disconnect();
    backgroundObserver = null;
    background.forEach(({ element, inert, aria }) => {
      // The home starts inert in static HTML until the first deliberate choice.
      if ((firstOpening && element === home) || !inert) element.removeAttribute('inert');
      if ((firstOpening && element === home) || aria === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', aria);
    });
    background = [];
    firstOpening = false;
  }

  function focusReturn(firstChoice = false) {
    const current = returnFocus?.id ? document.getElementById(returnFocus.id) : returnFocus;
    const fallback = document.body.classList.contains('report-active')
      ? document.getElementById('reportTraitReselect') || document.getElementById('p2MenuBtn')
      : document.getElementById(firstChoice ? 'homeCtaMain' : 'homeTraitReset');
    const target = current?.isConnected && current.getClientRects().length ? current : fallback;
    focusSafely(target);
    returnFocus = null;
  }

  function guardImage(image, expectedSource) {
    if (!image) return () => {};
    // Late load/error events from the previous character cannot reveal stale art.
    const request = image.__homeSceneRequest = (image.__homeSceneRequest || 0) + 1;
    image.__homeSceneCleanup?.();
    image.classList.add('is-scene-image-loading');
    const cleanup = () => {
      image.removeEventListener('load', reveal);
      image.removeEventListener('error', fail);
      if (image.__homeSceneCleanup === cleanup) delete image.__homeSceneCleanup;
    };
    image.__homeSceneCleanup = cleanup;
    const reveal = () => {
      if (image.__homeSceneRequest !== request) { cleanup(); return; }
      const expected = new URL(expectedSource(), document.baseURI).href;
      if (image.complete && image.naturalWidth > 0 && image.currentSrc === expected) {
        image.classList.remove('is-scene-image-loading');
        cleanup();
      }
    };
    const fail = () => {
      if (image.__homeSceneRequest !== request) { cleanup(); return; }
      // A queued error from the replaced source must not unmask the new one
      // while it is still pending (or has already succeeded).
      if (!image.complete || image.naturalWidth > 0) return;
      image.classList.remove('is-scene-image-loading');
      cleanup();
      if (imageNotice) imageNotice.textContent = imageError;
    };
    image.addEventListener('load', reveal);
    image.addEventListener('error', fail);
    return reveal;
  }

  function apply(id) {
    const previous = selected;
    const theme = HOME_THEMES[id];
    if (imageNotice?.textContent === imageError) imageNotice.textContent = '';
    const checkPortrait = guardImage(portrait, () => theme.character.assets.portrait.src);
    const checkBackdrop = guardImage(backdrop, () => window.matchMedia('(max-aspect-ratio: 4/5)').matches ? theme.backdrop.mobile : theme.backdrop.wide);
    selected = id;
    document.documentElement.dataset.homeTheme = id;
    const summary = document.getElementById('homeTraitSummary');
    if (summary) {
      document.getElementById('homeTraitLabel').textContent = theme.trait.label;
      document.getElementById('homeTraitDescription').textContent = theme.trait.description;
      summary.hidden = false;
    }
    applyTraitAccent(theme.trait.color);
    if (source) source.srcset = theme.backdrop.mobile;
    if (backdrop) backdrop.src = theme.backdrop.wide;
    // The public interface identifies companions by trait, including their
    // accessible label; the underlying reusable character keeps its identity.
    setHomeCharacter(theme.character, theme.trait.label);
    checkPortrait();
    checkBackdrop();
    document.documentElement.dataset.homeReady = 'true';
    if (previous && previous !== id) window.dispatchEvent(new CustomEvent('tj:trait-change', { detail: { id, previous } }));
  }

  function preload(url) {
    if (!loaded.has(url)) {
      const image = new Image();
      image.fetchPriority = 'high';
      let ready;
      if (typeof image.decode === 'function') {
        image.src = url;
        ready = image.decode().catch(() => { loaded.delete(url); });
      } else {
        ready = new Promise(resolve => {
          image.onload = resolve;
          image.onerror = () => { loaded.delete(url); resolve(); };
          image.src = url;
        });
      }
      loaded.set(url, ready);
    }
    return loaded.get(url);
  }

  function prepareTheme(id) {
    const theme = HOME_THEMES[id];
    const room = window.matchMedia('(max-aspect-ratio: 4/5)').matches ? theme.backdrop.mobile : theme.backdrop.wide;
    let timer;
    return Promise.race([
      Promise.all([room, theme.character.assets.portrait?.src].filter(Boolean).map(preload)),
      new Promise(resolve => { timer = setTimeout(resolve, 2500); }),
    ]).finally(() => clearTimeout(timer));
  }

  function reelItem(text, extra = '') {
    const node = document.createElement('div');
    node.className = `trait-reel-item${extra ? ` ${extra}` : ''}`;
    node.textContent = text;
    return node;
  }

  function renderReel(id) {
    const index = entries.findIndex(([key]) => key === id);
    if (index < 0) {
      track.replaceChildren(reelItem('✦', 'is-neighbor'), reelItem('?', 'is-placeholder'), reelItem('☾', 'is-neighbor'));
    } else {
      const length = entries.length;
      track.replaceChildren(
        reelItem(entries[(index - 1 + length) % length][1].trait.label, 'is-neighbor'),
        reelItem(entries[index][1].trait.label),
        reelItem(entries[(index + 1) % length][1].trait.label, 'is-neighbor'),
      );
    }
    track.style.transform = '';
  }

  async function turnReel(id, duration) {
    const target = entries.findIndex(([key]) => key === id);
    if (target < 0) return;
    if (motion.matches || typeof track.animate !== 'function') { renderReel(id); return; }
    const start = Math.max(0, entries.findIndex(([key]) => key === draft));
    const count = entries.length;
    const steps = count * 3 + (target - start + count) % count;
    const items = Array.from({ length: steps + 3 }, (_, index) => reelItem(entries[(start - 1 + index + count) % count][1].trait.label));
    track.replaceChildren(...items);
    track.style.transform = '';
    const row = items[0].getBoundingClientRect().height;
    animation = track.animate([{ transform: 'translateY(0)' }, { transform: `translateY(-${steps * row}px)` }], {
      duration, easing: 'cubic-bezier(.12, .72, .18, 1)', fill: 'forwards',
    });
    let timer;
    const current = animation;
    await Promise.race([current.finished.catch(() => {}), new Promise(resolve => { timer = setTimeout(resolve, duration + 150); })]);
    clearTimeout(timer);
    if (animation === current) { animation = null; current.cancel(); renderReel(id); }
  }

  function setState(next) {
    state = next;
    const busy = next !== 'idle';
    spin.disabled = busy;
    lever.disabled = busy;
    confirm.disabled = busy;
    // A random spin may be cancelled, but a committed choice stays locked
    // while its assets are prepared, avoiding cross-character races.
    cancel.disabled = next === 'loading';
    if (busy) selection.setAttribute('aria-busy', 'true');
    else selection.removeAttribute('aria-busy');
    machine.dataset.spinning = String(next === 'spinning' || next === 'loading');
  }

  async function choose() {
    // Only a completed spin can be confirmed; the picker has no direct path.
    const id = draft;
    if (selection.hidden || state !== 'idle' || confirm.hidden ||
        confirm.dataset.result !== id || !Object.prototype.hasOwnProperty.call(HOME_THEMES, id)) return;
    const ticket = ++generation;
    const initialChoice = !selected;
    setState('loading');
    focusSafely(selection);
    if (status) status.textContent = '正在开启场景…';
    try {
      await prepareTheme(id);
      if (ticket !== generation) return;
      apply(id);
      setState('idle');
      selection.hidden = true;
      delete selection.dataset.reselect;
      restoreBackground();
      focusReturn(initialChoice);
    } catch (error) {
      if (ticket !== generation) return;
      console.error('[home] 场景加载失败', error);
      setState('idle');
      if (status) status.textContent = '场景暂时无法开启，请重试。';
    }
  }

  async function randomSpin() {
    if (selection.hidden || state !== 'idle' || !entries.length) return;
    const ticket = ++generation;
    let random;
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      random = value[0] / 0x100000000;
    } else random = Math.random();
    const [id, theme] = entries[Math.floor(random * entries.length)];
    setState('spinning');
    focusSafely(selection);
    if (status) status.textContent = '正在转动…';
    await turnReel(id, 1250);
    if (ticket !== generation) return;
    draft = id;
    confirm.textContent = `选择「${theme.trait.label}」`;
    confirm.dataset.result = id;
    confirm.hidden = false;
    spin.querySelector('span').textContent = '再转一次';
    setState('idle');
    if (status) status.textContent = `转到了${theme.trait.label}，可以选择它或再转一次。`;
    focusSafely(confirm);
    confirm.scrollIntoView({ block: 'nearest', behavior: motion.matches ? 'auto' : 'smooth' });
  }

  function closePicker() {
    if (!selected || selection.hidden || state === 'loading') return;
    generation++;
    animation?.cancel();
    animation = null;
    setState('idle');
    selection.hidden = true;
    delete selection.dataset.reselect;
    restoreBackground();
    focusReturn();
  }

  function openPicker(trigger = document.activeElement) {
    if (!selected || !selection.hidden || state !== 'idle') return false;
    returnFocus = trigger;
    draft = selected;
    renderReel(selected);
    confirm.hidden = true;
    delete confirm.dataset.result;
    spin.querySelector('span').textContent = '转一转';
    if (status) status.textContent = '';
    cancel.hidden = false;
    selection.dataset.reselect = 'true';
    selection.hidden = false;
    selection.scrollTop = 0;
    focusSafely(selection);
    shieldBackground();
    return true;
  }

  motion.addEventListener?.('change', event => {
    if (event.matches && animation) animation.finish();
  });
  spin.addEventListener('click', randomSpin);
  lever.addEventListener('click', randomSpin);
  confirm.addEventListener('click', choose);
  cancel.addEventListener('click', closePicker);
  reselect?.addEventListener('click', event => openPicker(event.currentTarget));

  selection.addEventListener('keydown', event => {
    // Do not allow global Escape/shortcuts to operate the page underneath.
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); closePicker(); return; }
    const buttons = [...selection.querySelectorAll('button:not(:disabled)')].filter(button => button.getClientRects().length);
    if (event.key === 'Tab') {
      if (!buttons.length) { event.preventDefault(); focusSafely(selection); return; }
      const index = buttons.indexOf(document.activeElement);
      if (index < 0 || (!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0)) {
        event.preventDefault();
        focusSafely(buttons[event.shiftKey ? buttons.length - 1 : 0]);
      }
    }
  });

  renderReel('');
  if (status) status.textContent = '';
  focusSafely(selection);
  shieldBackground();
  machine.dataset.ready = 'true';
  spin.disabled = false;
  lever.disabled = false;
  return { getSelected: () => selected, open: openPicker };
}
