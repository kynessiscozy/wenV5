/** A modern photographer with an independent, reusable character image. */
export const SUYAN = Object.freeze({
  id: 'suyan',
  name: '苏言',
  camera: Object.freeze({ closeScale: 1.04, fullBody: true }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/suyan-fullbody.webp',
      alt: '摄影师穿着简洁时尚的深色礼服，手持相机，自信从容',
      width: 864,
      height: 1821,
    }),
    avatar: Object.freeze({ src: './art/suyan-fullbody-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
