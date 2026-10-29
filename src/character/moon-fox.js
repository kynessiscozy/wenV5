/** A second, independent character whose optional layers match its own portrait. */
export const MOON_FOX = Object.freeze({
  id: 'moonfox',
  name: '月白',
  // Keep the foxfire in frame as the camera approaches on narrow screens.
  camera: Object.freeze({ closeScale: 1.85, safeX: .23, safeInset: .05 }),
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/moon-fox-reimagined.webp',
      alt: '银发狐妖月白坐在祥云上，手中托着蓝色狐火',
      width: 848,
      height: 1264,
    }),
    blink: Object.freeze({ src: './art/moon-fox-reimagined-blink.webp', alt: '', width: 848, height: 1264, forPortrait: './art/moon-fox-reimagined.webp' }),
    speaking: Object.freeze({ src: './art/moon-fox-reimagined-speak.webp', alt: '', width: 848, height: 1264, forPortrait: './art/moon-fox-reimagined.webp' }),
    cloudTrail: Object.freeze({ src: './art/moon-fox-cloud-trail.webp', alt: '', width: 1000, height: 319 }),
    avatar: Object.freeze({ src: './art/moon-fox-reimagined-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '',
  topics: Object.freeze([]),
});
