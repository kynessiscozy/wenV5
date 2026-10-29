import { WENWEN } from '../character/wenwen.js';
import { MOON_FOX } from '../character/moon-fox.js';
import { EARTHFIRE_SOVEREIGN } from '../character/earthfire-sovereign.js';
import { JADE_EMPRESS } from '../character/jade-empress.js';
import { QINGLAN } from '../character/qinglan.js';
import { XINGLING } from '../character/xingling.js';
import { LUYE } from '../character/luye.js';
import { SUYAN } from '../character/suyan.js';

// This registry is the source of both the initial trait choices and their scenes.
// New characters need only add another entry; no switcher or storage key is involved.
export const HOME_THEMES = Object.freeze({
  wenwen: Object.freeze({
    trait: Object.freeze({ label: '温柔', mark: '柔', color: '#ecc1ae' }),
    character: WENWEN,
    backdrop: Object.freeze({ wide: './art/sacred-study-wide.webp', mobile: './art/sacred-study-mobile.webp' }),
  }),
  moonfox: Object.freeze({
    trait: Object.freeze({ label: '神秘', mark: '秘', color: '#b9dbef' }),
    character: MOON_FOX,
    backdrop: Object.freeze({ wide: './art/moon-fox-study-wide.webp', mobile: './art/moon-fox-study-mobile.webp' }),
  }),
  diyan: Object.freeze({
    trait: Object.freeze({ label: '威严', mark: '威', color: '#efae8b' }),
    character: EARTHFIRE_SOVEREIGN,
    backdrop: Object.freeze({ wide: './art/earthfire-hall-wide.webp', mobile: './art/earthfire-hall-mobile.webp' }),
  }),
  yuchen: Object.freeze({
    trait: Object.freeze({ label: '从容', mark: '容', color: '#d9d3a9' }),
    character: JADE_EMPRESS,
    backdrop: Object.freeze({ wide: './art/yuchen-hall-wide.webp', mobile: './art/yuchen-hall-mobile.webp' }),
  }),
  qinglan: Object.freeze({
    trait: Object.freeze({ label: '洒脱', mark: '洒', color: '#a9d8d0' }),
    character: QINGLAN,
    backdrop: Object.freeze({ wide: './art/qinglan-room-wide.webp', mobile: './art/qinglan-room-mobile.webp' }),
  }),
  xingling: Object.freeze({
    trait: Object.freeze({ label: '魅惑', mark: '魅', color: '#d4b7f2' }),
    character: XINGLING,
    backdrop: Object.freeze({ wide: './art/xingling-room-wide.webp', mobile: './art/xingling-room-mobile.webp' }),
  }),
  luye: Object.freeze({
    trait: Object.freeze({ label: '好奇', mark: '奇', color: '#e8c595' }),
    character: LUYE,
    backdrop: Object.freeze({ wide: './art/luye-room-wide.webp', mobile: './art/luye-room-mobile.webp' }),
  }),
  suyan: Object.freeze({
    trait: Object.freeze({ label: '自信', mark: '信', color: '#e8b4c1' }),
    character: SUYAN,
    backdrop: Object.freeze({ wide: './art/suyan-room-wide.webp', mobile: './art/suyan-room-mobile.webp' }),
  }),
});

/** Choose once for this document. The report's own assistant remains 问问. */
export function initHomeTheme({ setHomeCharacter = () => {} } = {}) {
  const home = document.getElementById('page1');
  const selection = document.getElementById('traitSelection');
  const options = document.getElementById('traitOptions');
  const status = document.getElementById('traitStatus');
  if (!home || !selection || !options) return null;
  const source = home.querySelector('.character-backdrop source');
  const backdrop = home.querySelector('.character-backdrop img');
  const portrait = home.querySelector('[data-character-asset="portrait"]');
  const loaded = new Map();
  let selected = '';
  let locked = false;

  // The dialog is present in the initial HTML; shield every background layer
  // while it is open, including controls inserted by the main application.
  const background = Array.from(document.body.children)
    .filter(element => element !== selection && !['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName))
    .map(element => ({ element, inert: element.hasAttribute('inert'), aria: element.getAttribute('aria-hidden') }));
  background.forEach(({ element }) => { element.setAttribute('inert', ''); element.setAttribute('aria-hidden', 'true'); });

  function guardImage(image, expectedSource) {
    if (!image) return () => {};
    image.classList.add('is-scene-image-loading');
    const reveal = () => {
      const expected = new URL(expectedSource(), document.baseURI).href;
      if (image.complete && image.naturalWidth > 0 && image.currentSrc === expected) {
        image.classList.remove('is-scene-image-loading');
        image.removeEventListener('load', reveal);
        image.removeEventListener('error', fail);
      }
    };
    const fail = () => {
      image.classList.remove('is-scene-image-loading');
      image.removeEventListener('load', reveal);
      image.removeEventListener('error', fail);
      const notice = document.getElementById('homeLoadingStatus');
      if (notice) notice.textContent = '部分场景暂时无法加载，请检查网络后刷新重试。';
    };
    image.addEventListener('load', reveal);
    image.addEventListener('error', fail);
    return reveal;
  }

  function apply(id) {
    const theme = HOME_THEMES[id];
    const checkPortrait = guardImage(portrait, () => theme.character.assets.portrait.src);
    const checkBackdrop = guardImage(backdrop, () => window.matchMedia('(max-aspect-ratio: 4/5)').matches ? theme.backdrop.mobile : theme.backdrop.wide);
    selected = id;
    document.documentElement.dataset.homeTheme = id;
    if (source) source.srcset = theme.backdrop.mobile;
    if (backdrop) backdrop.src = theme.backdrop.wide;
    setHomeCharacter(theme.character);
    checkPortrait();
    checkBackdrop();
    document.documentElement.dataset.homeReady = 'true';
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

  async function choose(id, button) {
    if (locked || !Object.hasOwn(HOME_THEMES, id)) return;
    // Lock the intent immediately, not after the artwork finishes downloading.
    locked = true;
    selection.focus({ preventScroll: true });
    selection.setAttribute('aria-busy', 'true');
    options.querySelectorAll('button').forEach(option => { option.disabled = true; });
    button.dataset.pending = 'true';
    const theme = HOME_THEMES[id];
    if (status) status.textContent = '正在开启场景…';
    const room = window.matchMedia('(max-aspect-ratio: 4/5)').matches ? theme.backdrop.mobile : theme.backdrop.wide;
    try {
      let timer;
      await Promise.race([
        Promise.all([room, theme.character.assets.portrait?.src].filter(Boolean).map(preload)),
        new Promise(resolve => { timer = setTimeout(resolve, 2500); }),
      ]);
      clearTimeout(timer);
      apply(id);
      background.forEach(({ element, inert, aria }) => {
        if (element === home || !inert) element.removeAttribute('inert');
        if (element === home || aria === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', aria);
      });
      selection.hidden = true;
      selection.removeAttribute('aria-busy');
      document.getElementById('homeCtaMain')?.focus({ preventScroll: true });
    } catch (error) {
      console.error('[home] 场景加载失败', error);
      selection.removeAttribute('aria-busy');
      if (status) status.textContent = '场景暂时无法开启，请刷新页面重试。';
    }
  }

  Object.entries(HOME_THEMES).forEach(([id, theme]) => {
    const button = document.createElement('button');
    button.className = 'trait-choice';
    button.type = 'button';
    button.dataset.trait = id;
    button.style.setProperty('--trait-color', theme.trait.color);
    const mark = document.createElement('span');
    mark.className = 'trait-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = theme.trait.mark;
    const label = document.createElement('span');
    label.className = 'trait-name';
    label.textContent = theme.trait.label;
    // A trait is intentionally a surprise: don't reveal the character's name.
    button.append(mark, label);
    button.addEventListener('click', () => choose(id, button));
    options.append(button);
  });
  if (status) status.textContent = '';

  selection.addEventListener('keydown', event => {
    // Do not allow global Escape/shortcuts to operate the page underneath.
    event.stopPropagation();
    const buttons = [...options.querySelectorAll('button:not(:disabled)')];
    if (event.key === 'Escape') event.preventDefault();
    if (event.key === 'Tab') {
      if (!buttons.length) { event.preventDefault(); selection.focus({ preventScroll: true }); return; }
      const index = buttons.indexOf(document.activeElement);
      if (index < 0 || (!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0)) {
        event.preventDefault();
        buttons[event.shiftKey ? buttons.length - 1 : 0].focus({ preventScroll: true });
      }
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && buttons.includes(event.target)) {
      event.preventDefault();
      const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
      buttons[(buttons.indexOf(event.target) + delta + buttons.length) % buttons.length].focus({ preventScroll: true });
    }
  });
  selection.focus({ preventScroll: true });
  return { getSelected: () => selected };
}
