/** A carefree sword immortal with independent portrait and expression layers. */
export const QINGLAN = Object.freeze({
  id: 'qinglan',
  name: '青岚',
  camera: Object.freeze({ closeScale: 1.45, safeX: .82, safeInset: .04 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/qinglan-cinema3d.webp',
      alt: '青岚倚风云举起酒葫芦，长发飘扬，手执长剑',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/qinglan-cinema3d-blink.webp', alt: '', width: 848, height: 1264, forPortrait: './art/qinglan-cinema3d.webp' }),
    speaking: Object.freeze({ src: './art/qinglan-cinema3d-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/qinglan-cinema3d.webp' }),
    avatar: Object.freeze({ src: './art/qinglan-cinema3d-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
