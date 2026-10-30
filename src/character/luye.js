/** A modern music producer with his own portrait and aligned expressions. */
export const LUYE = Object.freeze({
  id: 'luye',
  name: '陆野',
  camera: Object.freeze({ closeScale: 1.45, safeX: .22, safeInset: .04 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/luye-cinema3d.webp',
      alt: '年轻音乐人微微侧身倾听，手持随身播放器，神情充满好奇',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/luye-cinema3d-blink-v2.webp', alt: '', width: 848, height: 1264, forPortrait: './art/luye-cinema3d.webp' }),
    speaking: Object.freeze({ src: './art/luye-cinema3d-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/luye-cinema3d.webp' }),
    avatar: Object.freeze({ src: './art/luye-cinema3d-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
