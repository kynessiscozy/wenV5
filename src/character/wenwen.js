/** Shared character definition. Swap the assets or add topics here, not in each view. */
export const WENWEN = Object.freeze({
  id: 'wenwen',
  name: '问问',
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/wenwen-divine.webp',
      alt: '问问坐在云朵上，手捧泛着心形光芒的星盘',
      width: 992,
      height: 1299,
    }),
    // Transparent expression layers are aligned to the portrait and may be omitted by other characters.
    blink: Object.freeze({ src: './art/wenwen-divine-blink.webp', alt: '', width: 992, height: 1299, forPortrait: './art/wenwen-divine.webp' }),
    speaking: Object.freeze({ src: './art/wenwen-divine-speak.webp', alt: '', width: 992, height: 1299, forPortrait: './art/wenwen-divine.webp' }),
    // Optional scene props belong to this character and may be swapped independently.
    // The hanging cord meets the illustrated cord at this horizontal percentage.
    lantern: Object.freeze({ src: './art/wenwen-lantern.webp', alt: '', width: 301, height: 700, cordAnchorX: 49.67 }),
    cloudTrail: Object.freeze({ src: './art/wenwen-cloud-trail.webp', alt: '', width: 1000, height: 319 }),
    avatar: Object.freeze({ src: './art/wenwen-divine-avatar.webp', alt: '', width: 192, height: 192 }),
  }),
  greeting: '今天想聊什么？',
  topics: Object.freeze([
    Object.freeze({
      id: 'career', label: '事业', response: '一起看看方向和选择。',
      prompt: '我想聊聊事业方向。结合我的命盘，我有哪些优势？有哪些可尝试的下一步？',
    }),
    Object.freeze({
      id: 'relationships', label: '关系', response: '一起聊聊关系里的感受。',
      prompt: '我想聊聊人际和亲密关系。结合我的命盘，我的沟通方式有什么特点？',
    }),
    Object.freeze({
      id: 'self', label: '自己', response: '从你的特点和节奏开始。',
      prompt: '我想更了解自己。结合我的命盘，我有哪些特点、优势和需要留意的地方？',
    }),
  ]),
});

const escapeAttribute = value => String(value).replace(/[&"<>]/g, char => ({
  '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;',
}[char]));

/** String form is useful to the existing chat renderer; the asset still comes from one definition. */
export function characterAvatarMarkup(character = WENWEN) {
  const { src, width, height } = character.assets.avatar;
  return `<img class="character-avatar-image" src="${escapeAttribute(src)}" alt="" width="${escapeAttribute(width)}" height="${escapeAttribute(height)}">`;
}

/** DOM form is useful to new components without HTML interpolation. */
export function createCharacterAvatar(character = WENWEN) {
  const { src, width, height } = character.assets.avatar;
  const image = document.createElement('img');
  image.className = 'character-avatar-image';
  image.src = src;
  image.alt = '';
  image.width = width;
  image.height = height;
  return image;
}

/** Keep static HTML as a fast fallback while resolving all views from the same definition. */
export function applyCharacterAssets(root = document, character = WENWEN) {
  root.querySelectorAll('[data-character-asset]').forEach(image => {
    const asset = character.assets?.[image.dataset.characterAsset];
    // SVG button textures reuse the same optional cloud as the scene.
    if (image.tagName.toLowerCase() === 'image' && 'characterTexture' in image.dataset) {
      if (asset?.src) {
        image.setAttribute('href', asset.src);
        image.removeAttribute('visibility');
      } else {
        image.setAttribute('visibility', 'hidden');
      }
      return;
    }
    if (image.tagName !== 'IMG') return;
    const expression = 'characterOptional' in image.dataset;
    const sceneProp = 'characterSceneOptional' in image.dataset;
    const optional = expression || sceneProp;
    const holder = sceneProp ? image.closest?.('.character-prop') : null;
    const portrait = character.assets?.portrait;
    const aligned = !expression || (asset && portrait && asset.width === portrait.width && asset.height === portrait.height
      && (!asset.forPortrait || asset.forPortrait === portrait.src));
    if (!asset || !aligned) {
      // Missing props or mismatched expressions must not leak onto another character.
      if (optional) image.hidden = true;
      if (holder) holder.hidden = true;
      return;
    }
    if (optional) image.hidden = false;
    if (holder) {
      holder.hidden = false;
      const anchorX = Number(asset.cordAnchorX);
      if (asset.cordAnchorX != null && Number.isFinite(anchorX) && anchorX >= 0 && anchorX <= 100) {
        holder.style?.setProperty('--prop-cord-x', `${anchorX}%`);
      } else {
        holder.style?.removeProperty?.('--prop-cord-x');
      }
    }
    image.src = asset.src;
    image.alt = asset.alt;
    image.width = asset.width;
    image.height = asset.height;
  });
}
