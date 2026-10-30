/** The fire throne is independent scenery behind this character, not part of his silhouette. */
export const EARTHFIRE_SOVEREIGN = Object.freeze({
  id: 'diyan',
  name: '地炎君',
  // The sceptre is part of his silhouette and should remain visible in the close shot.
  camera: Object.freeze({ closeScale: 1.7, safeX: .885, safeInset: .06 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/diyan-cinema3d.webp',
      alt: '地炎君手持权杖，坐在燃烧的火焰王座前',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/diyan-cinema3d-blink.webp', alt: '', width: 848, height: 1264, forPortrait: './art/diyan-cinema3d.webp' }),
    speaking: Object.freeze({ src: './art/diyan-cinema3d-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/diyan-cinema3d.webp' }),
    fireThrone: Object.freeze({ src: './art/earthfire-flame-seat.webp', alt: '', width: 1124, height: 644 }),
    runes: Object.freeze({ src: './art/earthfire-runes.webp', alt: '', width: 512, height: 512 }),
    runeSeal: Object.freeze({ src: './art/earthfire-rune-seal.webp', alt: '', width: 960, height: 640 }),
    avatar: Object.freeze({ src: './art/diyan-cinema3d-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
