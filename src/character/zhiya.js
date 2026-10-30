/** A free-spirited paper-crane messenger with separately reusable artwork. */
export const ZHIYA = Object.freeze({
  id: 'zhiya',
  name: '纸鸢',
  camera: Object.freeze({ closeScale: 1.45, safeX: .92, safeInset: .04 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/zhiya-cinema3d.webp',
      alt: '纸鸢是腾空伸手的风与纸鹤使者，身穿羽纸披风',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/zhiya-cinema3d-blink-v2.webp', alt: '', width: 848, height: 1264, forPortrait: './art/zhiya-cinema3d.webp' }),
    speaking: Object.freeze({ src: './art/zhiya-cinema3d-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/zhiya-cinema3d.webp' }),
    avatar: Object.freeze({ src: './art/zhiya-cinema3d-avatar.webp', alt: '', width: 192, height: 192 }),
    crane: Object.freeze({ src: './art/zhiya-crane.webp', alt: '', width: 260, height: 218 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
