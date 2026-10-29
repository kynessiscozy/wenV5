/** A bewitching celestial oracle, separate from the report's 问问 assistant. */
export const XINGLING = Object.freeze({
  id: 'xingling',
  name: '星绫',
  camera: Object.freeze({ closeScale: 1.45, safeX: .22, safeInset: .04 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/xingling-renewed.webp',
      alt: '星绫身披紫色星纹长衣，倚于云端，抬手执星扇',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/xingling-renewed-blink.webp', alt: '', width: 848, height: 1264, forPortrait: './art/xingling-renewed.webp' }),
    speaking: Object.freeze({ src: './art/xingling-renewed-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/xingling-renewed.webp' }),
    avatar: Object.freeze({ src: './art/xingling-renewed-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
