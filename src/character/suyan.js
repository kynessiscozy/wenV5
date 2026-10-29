/** A modern photographer with an independent, reusable character image. */
export const SUYAN = Object.freeze({
  id: 'suyan',
  name: '苏言',
  camera: Object.freeze({ closeScale: 1.45, safeX: .21, safeInset: .04 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/suyan.webp',
      alt: '苏言穿着现代西装，手持相机，坐在城市摄影工作室',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/suyan-blink.webp', alt: '', width: 848, height: 1264, forPortrait: './art/suyan.webp' }),
    speaking: Object.freeze({ src: './art/suyan-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/suyan.webp' }),
    avatar: Object.freeze({ src: './art/suyan-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
