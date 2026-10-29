/** The empress has her own portrait, expression layers, and scene; report AI remains 问问. */
export const JADE_EMPRESS = Object.freeze({
  id: 'yuchen',
  name: '玉宸神后',
  // Her jade seal is held to the left; keep it in the close composition on narrow screens.
  camera: Object.freeze({ closeScale: 2.06, safeX: .30, safeInset: .05 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/yuchen-empress.webp',
      alt: '玉宸神后头戴凤冠，身着翡翠金纹礼服，手捧玉印立于殿中',
      width: 1024,
      height: 1536,
    }),
    blink: Object.freeze({ src: './art/yuchen-empress-blink.webp', alt: '', width: 1024, height: 1536, forPortrait: './art/yuchen-empress.webp' }),
    speaking: Object.freeze({ src: './art/yuchen-empress-speak.webp', alt: '', width: 1024, height: 1536, forPortrait: './art/yuchen-empress.webp' }),
    avatar: Object.freeze({ src: './art/yuchen-empress-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
