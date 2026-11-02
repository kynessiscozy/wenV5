/** A modern music producer; optional facial expressions are omitted until they match this portrait. */
export const LUYE = Object.freeze({
  id: 'luye',
  name: '陆野',
  camera: Object.freeze({ closeScale: 1.04, fullBody: true }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/luye-fullbody.webp',
      alt: '年轻音乐人戴着耳机倾听，神情充满好奇',
      width: 864,
      height: 1821,
    }),
    avatar: Object.freeze({ src: './art/luye-fullbody-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
