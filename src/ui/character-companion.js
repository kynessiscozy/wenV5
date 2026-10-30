import { JIANGJIANG, applyCharacterAssets } from '../character/wenwen.js';
import { CHAT_MASTER } from '../character/chat-master.js';
import { mountCharacterPrompt } from '../character/companion.js';

/** Connect a reusable character to exploration and the report's assistant. */
export function initCharacterCompanion({
  character = JIANGJIANG,
  openForm = () => {},
  openAsk = () => {},
  deferHomeAssets = false,
} = {}) {
  const scene = document.getElementById('characterScene');
  const portrait = document.getElementById('characterPortraitButton');

  function applyToScene(nextCharacter, root, traitLabel = '') {
    applyCharacterAssets(root, nextCharacter);
    const artwork = nextCharacter.assets?.portrait;
    if (portrait && artwork) {
      const width = Number(artwork.width), height = Number(artwork.height);
      if (width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)) {
        const ratio = `${width} / ${height}`;
        portrait.style.setProperty('--character-ratio', ratio);
        scene?.style.setProperty('--character-ratio', ratio);
        const heightPerWidth = height / width;
        if (scene && Number.isFinite(heightPerWidth)) {
          // Bound the mobile scene to the image's available width without letterboxing.
          scene.style.setProperty('--character-mobile-vw', `${(heightPerWidth * 100).toFixed(4)}vw`);
          scene.style.setProperty('--character-mobile-inset', `${(heightPerWidth * 40).toFixed(4)}px`);
          scene.style.setProperty('--character-mobile-inset-compact', `${(heightPerWidth * 16).toFixed(4)}px`);
        }
      }
      if (scene) {
        // Camera composition belongs to the character, not to a particular view.
        for (const [key, value, min, max] of [
          ['cameraCloseScale', nextCharacter.camera?.closeScale, 1.1, 2.2],
          ['cameraSafeX', nextCharacter.camera?.safeX, 0, 1],
          ['cameraSafeInset', nextCharacter.camera?.safeInset, 0, .25],
        ]) {
          if (Number.isFinite(value) && value >= min && value <= max) scene.dataset[key] = String(value);
          else delete scene.dataset[key];
        }
        scene.dispatchEvent?.(new CustomEvent('character-assets-changed'));
      }
    }
    const publicLabel = traitLabel || nextCharacter.name;
    root.querySelectorAll('[data-character-name]').forEach(el => { el.textContent = publicLabel; });
    portrait?.setAttribute('aria-label', `点击${publicLabel}${traitLabel ? '形象' : ''}，开启探索`);
    if (traitLabel) {
      // Keep a meaningful visual description if an image fails, without
      // exposing the internal character name in its fallback or alt text.
      root.querySelectorAll('[data-character-asset]').forEach(image => {
        if (image.dataset.characterAsset === 'portrait' && image.tagName === 'IMG') {
          image.alt = (image.alt || `${traitLabel}特质同行形象`).replace(nextCharacter.name, `${traitLabel}特质同行`);
        }
      });
    }
  }

  // The report keeps its own identity. The home waits for an explicit trait
  // choice, so do not fetch or apply the default portrait and scenery first.
  const home = document.getElementById('page1');
  if (deferHomeAssets && home) {
    applyCharacterAssets({
      querySelectorAll: selector => [...document.querySelectorAll(selector)].filter(element => !home.contains(element)),
    }, character);
  } else {
    applyToScene(character, document);
  }

  // The portrait and the primary action lead to the same real exploration flow.
  portrait?.addEventListener('click', openForm);
  document.getElementById('homeCtaMain')?.addEventListener('click', openForm);

  return {
    setHomeCharacter(nextCharacter, traitLabel = '') {
      // Do not change the report/chat identity when only the home theme changes.
      const home = document.getElementById('page1');
      if (home && nextCharacter?.assets?.portrait) applyToScene(nextCharacter, home, traitLabel);
    },
    onReportReady({ isDemo = false } = {}) {
      // A sample chart must not be presented as the user's personal report.
      if (isDemo) return;
      const section = document.getElementById('s-ming');
      if (!section) return;
      // Keep the existing 问问 chat option distinct from the selected guide.
      // Each system has its own location after the first piece of actual content.
      const systems = [
        { id: 'characterReportGuide', root: section.querySelector(':scope > .sys-eastern'), anchor: '.qr-card' },
        { id: 'characterReportGuideWestern', root: section.querySelector(':scope > .sys-western'), anchor: '#w3d-astro' },
      ];
      systems.forEach(({ id, root, anchor }) => {
        if (!root) return;
        let slot = document.getElementById(id);
        if (!slot) {
          slot = document.createElement('aside');
          slot.id = id;
          slot.className = 'character-report-guide';
          slot.setAttribute('aria-label', `${CHAT_MASTER.name}的提示`);
          const content = root.querySelector(anchor);
          if (content) content.insertAdjacentElement('afterend', slot);
          else root.prepend(slot);
        }
        mountCharacterPrompt(slot, {
          character: CHAT_MASTER,
          showAvatar: false,
          variant: 'report',
          message: id === 'characterReportGuideWestern' ? '星盘好了，想一起聊聊吗？' : '命盘好了，想一起聊聊吗？',
          actionLabel: `和${CHAT_MASTER.name}聊聊`,
          onAction: openAsk,
          dismissLabel: `收起${CHAT_MASTER.name}的提示`,
          onDismiss: () => {
            section.querySelectorAll('.character-report-guide').forEach(guide => guide.remove());
            document.getElementById('aiFab')?.focus({ preventScroll: true });
          },
        });
      });
    },
  };
}
