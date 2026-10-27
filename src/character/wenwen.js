/** Shared character definition. Swap the assets or add topics here, not in each view. */
export const WENWEN = Object.freeze({
  id: 'wenwen',
  name: '问问',
  assets: Object.freeze({
    portrait: Object.freeze({
      src: './art/wenwen-complete.webp',
      alt: '星光向导问问坐在云朵上，手捧发光的星星罗盘',
      width: 992,
      height: 1299,
      // Percentage coordinates keep the interactive light attached to this reusable artwork.
      spotlight: Object.freeze({ x: 49, y: 38, size: 28 }),
    }),
    avatar: Object.freeze({ src: './art/wenwen-complete-avatar.webp', alt: '', width: 192, height: 192 }),
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
    const asset = character.assets[image.dataset.characterAsset];
    if (!asset || image.tagName !== 'IMG') return;
    image.src = asset.src;
    image.alt = asset.alt;
    image.width = asset.width;
    image.height = asset.height;
  });
}
