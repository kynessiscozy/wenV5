/** A lively red-panda spirit with her own reusable artwork and expression layers. */
export const RONGRONG = Object.freeze({
  id: 'rongrong',
  name: '绒绒',
  camera: Object.freeze({ closeScale: 1.45, safeX: .90, safeInset: .04 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/rongrong.webp',
      alt: '绒绒是伸手相邀的小熊猫灵，手提爪形铃铛',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/rongrong-blink.webp', alt: '', width: 848, height: 1264, forPortrait: './art/rongrong.webp' }),
    speaking: Object.freeze({ src: './art/rongrong-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/rongrong.webp' }),
    avatar: Object.freeze({ src: './art/rongrong-avatar.webp', alt: '', width: 192, height: 192 }),
    pawbell: Object.freeze({ src: './art/rongrong-pawbell.webp', alt: '', width: 108, height: 165 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
