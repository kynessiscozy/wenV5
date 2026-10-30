/** The empress has her own portrait, expression layers, and scene; report AI remains 问问. */
export const JADE_EMPRESS = Object.freeze({
  id: 'yuchen',
  name: '玉宸神后',
  // Her jade seal is held to the left; keep it in the close composition on narrow screens.
  camera: Object.freeze({ closeScale: 2.06, safeX: .30, safeInset: .05 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/yuchen-cinema3d.webp',
      alt: '玉宸神后头戴凤冠，身着翡翠金纹礼服，手捧玉印立于殿中',
      width: 896,
      height: 1200,
    }),
    blink: Object.freeze({ src: './art/yuchen-cinema3d-blink-v2.webp', alt: '', width: 896, height: 1200, forPortrait: './art/yuchen-cinema3d.webp' }),
    speaking: Object.freeze({ src: './art/yuchen-cinema3d-speak.webp', alt: '', width: 896, height: 1200, forPortrait: './art/yuchen-cinema3d.webp' }),
    avatar: Object.freeze({ src: './art/yuchen-cinema3d-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
