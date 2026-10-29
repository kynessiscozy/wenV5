/** A carefree sword immortal with independent portrait and expression layers. */
export const QINGLAN = Object.freeze({
  id: 'qinglan',
  name: '青岚',
  camera: Object.freeze({ closeScale: 1.45, safeX: .82, safeInset: .04 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/qinglan.webp',
      alt: '青岚斜倚云上，长发随风，手边佩剑与酒葫芦',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/qinglan-blink.webp', alt: '', width: 848, height: 1264, forPortrait: './art/qinglan.webp' }),
    speaking: Object.freeze({ src: './art/qinglan-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/qinglan.webp' }),
    avatar: Object.freeze({ src: './art/qinglan-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
