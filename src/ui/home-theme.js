import { syncBrowserThemeColor } from './theme-color.js';
import { themeForPersona } from './entry-personas.js';
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

// One registry supplies scenes and report styling. The character is chosen
// in funnel.html (the only entry); this module only applies that choice:
// backdrop, portrait and the trait-derived theme colors for the whole app.
// The old slot-machine picker is gone — there is no second selector here.
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

/** Apply the funnel-chosen character (default 月白） as the app theme. */
export function initHomeTheme({ setHomeCharacter = () => {} } = {}) {
  const home = document.getElementById('page1');
  if (!home) return null;

  const source = home.querySelector('.character-backdrop source');
  const backdrop = home.querySelector('.character-backdrop img');
  const portrait = home.querySelector('[data-character-asset="portrait"]');
  const loaded = new Map();
  const imageNotice = document.getElementById('homeLoadingStatus');
  const imageError = '部分场景暂时无法加载，请检查网络后刷新重试。';
  let selected = '';

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

  /* 引路人在 funnel.html 选定，直接决定主应用角色与主题色；未知/缺失时
     回退月白（首屏默认人物）。映射表在 entry-personas.js，避免「夕瑶」等
     没有同名主题的人物静默变成默认角色。 */
  let requestedTrait = '';
  try {
    const payload = JSON.parse(localStorage.getItem('wen_funnel_v1') || 'null');
    if (payload && payload.trait) requestedTrait = payload.trait;
  } catch (error) { /* 数据不可用时回退默认角色 */ }
  const requestedTheme = Object.prototype.hasOwnProperty.call(HOME_THEMES, requestedTrait)
    ? requestedTrait : themeForPersona(requestedTrait);
  const directTheme = Object.prototype.hasOwnProperty.call(HOME_THEMES, requestedTheme)
    ? requestedTheme : 'moonfox';

  (async () => {
    try {
      await prepareTheme(directTheme);
    } catch (error) {
      if (imageNotice) imageNotice.textContent = imageError;
    }
    apply(directTheme);
    // The home scene starts inert in static HTML; the applied theme is the
    // deliberate entry state, so release it exactly once here.
    home.removeAttribute('inert');
    home.removeAttribute('aria-hidden');
  })();
  return { getSelected: () => selected, apply };
}
