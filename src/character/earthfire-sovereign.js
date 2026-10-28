/** The fire throne is independent scenery behind this character, not part of his silhouette. */
export const EARTHFIRE_SOVEREIGN = Object.freeze({
  id: 'diyan',
  name: '地炎君',
  // The sceptre is part of his silhouette and should remain visible in the close shot.
  camera: Object.freeze({ closeScale: 1.55, safeX: .885, safeInset: .06 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/earthfire-sovereign.webp',
      alt: '地炎君手持权杖，坐在燃烧的火焰王座前',
      width: 625,
      height: 1180,
    }),
    blink: Object.freeze({ src: './art/earthfire-sovereign-blink.webp', alt: '', width: 625, height: 1180, forPortrait: './art/earthfire-sovereign.webp' }),
    speaking: Object.freeze({ src: './art/earthfire-sovereign-speak.webp', alt: '', width: 625, height: 1180, forPortrait: './art/earthfire-sovereign.webp' }),
    fireThrone: Object.freeze({ src: './art/earthfire-flame-seat.webp', alt: '', width: 1124, height: 644 }),
    avatar: Object.freeze({ src: './art/earthfire-sovereign-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
