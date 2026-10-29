/** A modern music producer with his own portrait and aligned expressions. */
export const LUYE = Object.freeze({
  id: 'luye',
  name: '陆野',
  camera: Object.freeze({ closeScale: 1.45, safeX: .22, safeInset: .04 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/luye.webp',
      alt: '陆野穿着现代皮夹克，手握耳机，悠然坐在音乐工作室',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/luye-blink.webp', alt: '', width: 848, height: 1264, forPortrait: './art/luye.webp' }),
    speaking: Object.freeze({ src: './art/luye-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/luye.webp' }),
    avatar: Object.freeze({ src: './art/luye-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
