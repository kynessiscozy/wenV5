/** 雷兹：宙斯原型引路人，3D 定妆。素材与人物定义同在一处，换图只改这里。 */
export const LEIZI = Object.freeze({
  id: 'leizi',
  name: '雷兹',
  camera: Object.freeze({ closeScale: 1.6, safeX: .5, safeInset: .05 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/leizi-cinema3d.webp',
      alt: '雷兹站在奥林匹斯云端台阶上，指尖绕着一束闪电',
      width: 768,
      height: 1376,
    }),
    blink: Object.freeze({ src: './art/leizi-cinema3d-blink.webp', alt: '', width: 768, height: 1376, forPortrait: './art/leizi-cinema3d.webp' }),
    speaking: Object.freeze({ src: './art/leizi-cinema3d-speak.webp', alt: '', width: 768, height: 1376, forPortrait: './art/leizi-cinema3d.webp' }),
    avatar: Object.freeze({ src: './art/leizi-cinema3d-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
