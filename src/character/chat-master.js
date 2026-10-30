// The assistant is independent of the collectible home characters. Both
// twins share one voice/name; neither is selectable as a home trait.
export const CHAT_MASTER = Object.freeze({
  name: '问问',
  title: '问问大师',
  twins: Object.freeze([
    Object.freeze({
      id: 'indigo',
      portrait: './art/master-twin-indigo.webp',
      avatar: './art/master-twin-indigo-avatar.webp',
    }),
    Object.freeze({
      id: 'rose',
      portrait: './art/master-twin-rose.webp',
      avatar: './art/master-twin-rose-avatar.webp',
    }),
  ]),
});

// All URLs are static local constants. These portraits are decorative: the
// message itself already communicates who is speaking.
export function masterAvatarMarkup() {
  return CHAT_MASTER.twins.map(twin =>
    `<img src="${twin.avatar}" alt="" width="256" height="256" decoding="async">`
  ).join('');
}

// Load the larger artwork only once the chat opens, never on the home screen.
export function loadMasterPortraits(sheet) {
  CHAT_MASTER.twins.forEach(twin => {
    const image = sheet?.querySelector(`[data-master-portrait="${twin.id}"]`);
    if (image && (!image.getAttribute('src') || (image.complete && !image.naturalWidth))) {
      image.src = twin.portrait;
    }
  });
}
