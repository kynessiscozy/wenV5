import { WENWEN, applyCharacterAssets } from '../character/wenwen.js';
import { mountCharacterPrompt } from '../character/companion.js';

/** Connect a reusable character to exploration and the report's assistant. */
export function initCharacterCompanion({
  character = WENWEN,
  openForm = () => {},
  openAsk = () => {},
} = {}) {
  applyCharacterAssets(document, character);
  const scene = document.getElementById('characterScene');
  const portrait = document.getElementById('characterPortraitButton');
  const artwork = character.assets?.portrait;
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
      }
    }
  }
  document.querySelectorAll('[data-character-name]').forEach(el => { el.textContent = character.name; });
  portrait?.setAttribute('aria-label', `点击${character.name}，开启探索`);

  // The portrait and the primary action lead to the same real exploration flow.
  portrait?.addEventListener('click', openForm);
  document.getElementById('homeCtaMain')?.addEventListener('click', openForm);

  // Only actual incoming AI text drives the speaking layer; waiting and errors do not.
  window.addEventListener('tj:ai-stream', event => {
    if (scene) scene.dataset.speaking = String(!!event.detail?.active);
  });

  return {
    onReportReady({ isDemo = false } = {}) {
      // A sample chart must not be presented as the user's personal report.
      if (isDemo) return;
      const section = document.getElementById('s-ming');
      if (!section) return;
      let slot = document.getElementById('characterReportGuide');
      if (!slot) {
        slot = document.createElement('aside');
        slot.id = 'characterReportGuide';
        slot.className = 'character-report-guide';
        slot.setAttribute('aria-label', `${character.name}的提示`);
        section.prepend(slot);
      }
      mountCharacterPrompt(slot, {
        character,
        variant: 'report',
        message: '命盘好了，想一起聊聊吗？',
        actionLabel: `和${character.name}聊聊`,
        onAction: openAsk,
        dismissLabel: `收起${character.name}的提示`,
        onDismiss: () => {
          slot.remove();
          document.getElementById('aiFab')?.focus({ preventScroll: true });
        },
      });
    },
  };
}
