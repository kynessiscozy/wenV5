/** A bewitching celestial oracle, separate from the report's 问问 assistant. */
export const XINGLING = Object.freeze({
  id: 'xingling',
  name: '星绫',
  camera: Object.freeze({ closeScale: 1.45, safeX: .22, safeInset: .04 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/xingling-cinema3d.webp',
      alt: '星绫身披紫色星纹长衣，倚于云端，抬手执星扇',
      width: 768,
      height: 1376,
    }),
    blink: Object.freeze({ src: './art/xingling-cinema3d-blink.webp', alt: '', width: 768, height: 1376, forPortrait: './art/xingling-cinema3d.webp' }),
    speaking: Object.freeze({ src: './art/xingling-cinema3d-speak.webp', alt: '', width: 768, height: 1376, forPortrait: './art/xingling-cinema3d.webp' }),
    avatar: Object.freeze({ src: './art/xingling-cinema3d-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
