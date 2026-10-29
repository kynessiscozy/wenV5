import { WENWEN } from '../character/wenwen.js';
import { MOON_FOX } from '../character/moon-fox.js';
import { EARTHFIRE_SOVEREIGN } from '../character/earthfire-sovereign.js';
import { JADE_EMPRESS } from '../character/jade-empress.js';
import { QINGLAN } from '../character/qinglan.js';
import { XINGLING } from '../character/xingling.js';
import { LUYE } from '../character/luye.js';
import { SUYAN } from '../character/suyan.js';

// One registry supplies the reel, scenes and report styling.
// New characters need only add another entry; choices remain page-local.
export const HOME_THEMES = Object.freeze({
  wenwen: Object.freeze({
    trait: Object.freeze({ label: '温柔', mark: '柔', color: '#ecc1ae' }),
    reportLead: '别急，我们慢慢看。',
    character: WENWEN,
    backdrop: Object.freeze({ wide: './art/sacred-study-wide.webp', mobile: './art/sacred-study-mobile.webp' }),
  }),
  moonfox: Object.freeze({
    trait: Object.freeze({ label: '神秘', mark: '秘', color: '#b9dbef' }),
    reportLead: '有意思，线索已经浮现。',
    character: MOON_FOX,
    backdrop: Object.freeze({ wide: './art/moon-fox-study-wide.webp', mobile: './art/moon-fox-study-mobile.webp' }),
  }),
  diyan: Object.freeze({
    trait: Object.freeze({ label: '威严', mark: '威', color: '#efae8b' }),
    reportLead: '先定根基，再看全局。',
    character: EARTHFIRE_SOVEREIGN,
    backdrop: Object.freeze({ wide: './art/earthfire-hall-wide.webp', mobile: './art/earthfire-hall-mobile.webp' }),
  }),
  yuchen: Object.freeze({
    trait: Object.freeze({ label: '从容', mark: '容', color: '#d9d3a9' }),
    reportLead: '静下心，先看这一处。',
    character: JADE_EMPRESS,
    backdrop: Object.freeze({ wide: './art/yuchen-hall-wide.webp', mobile: './art/yuchen-hall-mobile.webp' }),
  }),
  qinglan: Object.freeze({
    trait: Object.freeze({ label: '洒脱', mark: '洒', color: '#a9d8d0' }),
    reportLead: '不妨换个角度。',
    character: QINGLAN,
    backdrop: Object.freeze({ wide: './art/qinglan-room-wide.webp', mobile: './art/qinglan-room-mobile.webp' }),
  }),
  xingling: Object.freeze({
    trait: Object.freeze({ label: '魅惑', mark: '魅', color: '#d4b7f2' }),
    reportLead: '细看，线索藏在这里。',
    character: XINGLING,
    backdrop: Object.freeze({ wide: './art/xingling-room-wide.webp', mobile: './art/xingling-room-mobile.webp' }),
  }),
  luye: Object.freeze({
    trait: Object.freeze({ label: '好奇', mark: '奇', color: '#e8c595' }),
    reportLead: '发现一个有趣的起点。',
    character: LUYE,
    backdrop: Object.freeze({ wide: './art/luye-room-wide.webp', mobile: './art/luye-room-mobile.webp' }),
  }),
  suyan: Object.freeze({
    trait: Object.freeze({ label: '自信', mark: '信', color: '#e8b4c1' }),
    reportLead: '先把重点抓出来。',
    character: SUYAN,
    backdrop: Object.freeze({ wide: './art/suyan-room-wide.webp', mobile: './art/suyan-room-mobile.webp' }),
  }),
});

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
    target?.focus({ preventScroll: true });
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
    if (source) source.srcset = theme.backdrop.mobile;
    if (backdrop) backdrop.src = theme.backdrop.wide;
    setHomeCharacter(theme.character);
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
        confirm.dataset.result !== id || !Object.hasOwn(HOME_THEMES, id)) return;
    const ticket = ++generation;
    const initialChoice = !selected;
    setState('loading');
    selection.focus({ preventScroll: true });
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
    selection.focus({ preventScroll: true });
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
    confirm.focus({ preventScroll: true });
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
    selection.focus({ preventScroll: true });
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
      if (!buttons.length) { event.preventDefault(); selection.focus({ preventScroll: true }); return; }
      const index = buttons.indexOf(document.activeElement);
      if (index < 0 || (!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0)) {
        event.preventDefault();
        buttons[event.shiftKey ? buttons.length - 1 : 0].focus({ preventScroll: true });
      }
    }
  });

  renderReel('');
  if (status) status.textContent = '';
  selection.focus({ preventScroll: true });
  shieldBackground();
  machine.dataset.ready = 'true';
  spin.disabled = false;
  lever.disabled = false;
  return { getSelected: () => selected, open: openPicker };
}
