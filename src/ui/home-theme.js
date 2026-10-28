import { WENWEN } from '../character/wenwen.js';
import { MOON_FOX } from '../character/moon-fox.js';
import { EARTHFIRE_SOVEREIGN } from '../character/earthfire-sovereign.js';

const STORAGE_KEY = 'tj_home_character';

/** Home themes are independent of the application's light/dark preference. */
export const HOME_THEMES = Object.freeze({
  wenwen: Object.freeze({
    character: WENWEN,
    backdrop: Object.freeze({ wide: './art/sacred-study-wide.webp', mobile: './art/sacred-study-mobile.webp' }),
  }),
  moonfox: Object.freeze({
    character: MOON_FOX,
    backdrop: Object.freeze({ wide: './art/moon-fox-study-wide.webp', mobile: './art/moon-fox-study-mobile.webp' }),
  }),
  diyan: Object.freeze({
    character: EARTHFIRE_SOVEREIGN,
    backdrop: Object.freeze({ wide: './art/earthfire-hall-wide.webp', mobile: './art/earthfire-hall-mobile.webp' }),
  }),
});

function storedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return Object.hasOwn(HOME_THEMES, value) ? value : 'wenwen';
  } catch {
    return 'wenwen';
  }
}

/** Switch only the landing scene: the report's actual assistant remains 问问. */
export function initHomeTheme({ setHomeCharacter = () => {} } = {}) {
  const home = document.getElementById('page1');
  if (!home) return null;
  const source = home.querySelector('.character-backdrop source');
  const backdrop = home.querySelector('.character-backdrop img');
  const buttons = [...home.querySelectorAll('[data-home-character]')];
  const switcher = home.querySelector('.character-theme-switcher');
  const loaded = new Map();
  let selected = '';
  let revision = 0;

  function save(next) {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* A private session still switches in memory. */ }
  }

  function apply(next) {
    selected = next;
    const theme = HOME_THEMES[next];
    document.documentElement.dataset.homeTheme = next;
    if (source) source.srcset = theme.backdrop.mobile;
    if (backdrop) backdrop.src = theme.backdrop.wide;
    setHomeCharacter(theme.character);
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.homeCharacter === next)));
    switcher?.removeAttribute('aria-busy');
    document.documentElement.dataset.homeReady = 'true';
  }

  function preload(url) {
    if (!loaded.has(url)) {
      const image = new Image();
      // Decoding before swapping avoids a flash of the other character or an empty room.
      let ready;
      if (typeof image.decode === 'function') {
        image.src = url;
        ready = image.decode().catch(() => {});
      } else {
        ready = new Promise(resolve => { image.onload = resolve; image.onerror = resolve; image.src = url; });
      }
      loaded.set(url, ready);
    }
    return loaded.get(url);
  }

  async function select(id, persist = false) {
    const next = Object.hasOwn(HOME_THEMES, id) ? id : 'wenwen';
    const request = ++revision;
    // Save the user's intent even if they reload before the artwork finishes decoding.
    if (persist) save(next);
    if (next === selected) {
      switcher?.removeAttribute('aria-busy');
      return;
    }
    const theme = HOME_THEMES[next];
    const assets = theme.character.assets;
    const room = window.matchMedia('(max-aspect-ratio: 4/5)').matches ? theme.backdrop.mobile : theme.backdrop.wide;
    const urls = [room, assets.portrait?.src, assets.blink?.src, assets.speaking?.src, assets.cloudTrail?.src, assets.fireThrone?.src].filter(Boolean);
    switcher?.setAttribute('aria-busy', 'true');
    // An unavailable image must not leave the controls stuck indefinitely.
    await Promise.race([Promise.all(urls.map(preload)), new Promise(resolve => setTimeout(resolve, 2500))]);
    if (request !== revision) return;
    apply(next);
  }

  buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.homeCharacter, true)));
  // The buttons are individually tabbable; arrow keys also move through all themes.
  switcher?.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !buttons.includes(event.target)) return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const index = (buttons.indexOf(event.target) + delta + buttons.length) % buttons.length;
    buttons[index].focus();
    select(buttons[index].dataset.homeCharacter, true);
  });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) select(event.newValue);
  });
  const initial = storedTheme();
  // The static HTML is already the complete default scene; never wait to show it.
  if (initial === 'wenwen') apply(initial);
  else select(initial);
  return { select, getSelected: () => selected };
}
