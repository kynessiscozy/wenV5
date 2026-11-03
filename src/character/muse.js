/** 絮羽：缪斯原型引路人，单翼羽神，3D 定妆。素材与人物定义同在一处，换图只改这里。 */
export const MUSE = Object.freeze({
  id: 'muse',
  name: '絮羽',
  camera: Object.freeze({ closeScale: 1.6, safeX: .5, safeInset: .05 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/muse-cinema3d.webp',
      alt: '絮羽悬浮在黄昏石柱大厅里，身后展开一只巨大的白色羽毛翅膀',
      width: 768,
      height: 1376,
    }),
    blink: Object.freeze({ src: './art/muse-cinema3d-blink.webp', alt: '', width: 768, height: 1376, forPortrait: './art/muse-cinema3d.webp' }),
    speaking: Object.freeze({ src: './art/muse-cinema3d-speak.webp', alt: '', width: 768, height: 1376, forPortrait: './art/muse-cinema3d.webp' }),
    avatar: Object.freeze({ src: './art/muse-cinema3d-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
