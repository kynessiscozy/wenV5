/** A modern photographer with an independent, reusable character image. */
export const SUYAN = Object.freeze({
  id: 'suyan',
  name: '苏言',
  camera: Object.freeze({ closeScale: 1.45, safeX: .21, safeInset: .04 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/suyan-cinema3d.webp',
      alt: '摄影师穿着简洁时尚的深色礼服，手持相机，自信从容',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/suyan-cinema3d-blink-v2.webp', alt: '', width: 848, height: 1264, forPortrait: './art/suyan-cinema3d.webp' }),
    speaking: Object.freeze({ src: './art/suyan-cinema3d-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/suyan-cinema3d.webp' }),
    avatar: Object.freeze({ src: './art/suyan-cinema3d-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
