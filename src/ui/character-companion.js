import { WENWEN, applyCharacterAssets } from '../character/wenwen.js';
import { mountCharacterCompanion, mountCharacterPrompt } from '../character/companion.js';

/** Connect the reusable character to the app's form, report and existing AI panel. */
export function initCharacterCompanion({
  character = WENWEN,
  hasReport = () => false,
  openForm = () => {},
  openReport = () => {},
  openAsk = () => {},
} = {}) {
  applyCharacterAssets(document, character);
  const home = document.getElementById('characterCompanion');
  const scene = document.getElementById('characterScene');
  const portrait = document.getElementById('characterPortraitButton');
  const invitation = document.getElementById('characterInvitation');
  const formNotice = document.getElementById('characterFormContext');
  const artwork = character.assets.portrait;
  // Geometry belongs to the character definition, so another artwork can be substituted.
  if (portrait?.style && portrait.classList && artwork) {
    const width = Number(artwork.width), height = Number(artwork.height);
    if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
      portrait.style.setProperty('--character-ratio', `${width} / ${height}`);
    }
    const light = artwork.spotlight;
    const values = [light?.x, light?.y, light?.size].map(Number);
    const hasLight = !!light && values.every(Number.isFinite);
    portrait.classList.toggle('has-character-light', hasLight);
    if (hasLight) {
      const percent = n => `${Math.max(0, Math.min(100, n))}%`;
      portrait.style.setProperty('--character-light-x', percent(values[0]));
      portrait.style.setProperty('--character-light-y', percent(values[1]));
      portrait.style.setProperty('--character-light-size', percent(values[2]));
    }
  }
  document.querySelectorAll('[data-character-name]').forEach(el => { el.textContent = character.name; });
  home?.setAttribute('aria-label', `和${character.name}聊聊`);
  portrait?.setAttribute('aria-label', `和${character.name}聊聊`);
  let pendingTopic = null;
  let reportTopic = null;
  let reaction = null;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  reducedMotion?.addEventListener?.('change', event => {
    if (event.matches) reaction?.cancel();
  });

  function reactToConversation() {
    if (reducedMotion?.matches || !portrait?.animate) return;
    // Repeated taps continue from the current pose instead of snapping back to rest.
    const current = reaction?.playState === 'running' ? getComputedStyle(portrait).transform : 'none';
    reaction?.cancel();
    reaction = portrait.animate([
      { transform: current, easing: 'cubic-bezier(.22, 1, .36, 1)' },
      { transform: 'translateY(-3px) rotate(-.25deg) scale(1.006)', offset: .45, easing: 'cubic-bezier(.45, 0, .55, 1)' },
      { transform: 'none' },
    ], { id: 'character-reaction', duration: 900 });
  }

  function clearPending() {
    pendingTopic = null;
    if (formNotice) {
      formNotice.hidden = true;
      formNotice.replaceChildren();
    }
  }

  function showFormNotice(topic) {
    if (!formNotice) return;
    formNotice.hidden = false;
    mountCharacterPrompt(formNotice, {
      character,
      variant: 'form',
      message: `这次想聊：${topic.label}`,
      actionLabel: '清除',
      onAction: () => {
        clearPending();
        conversation?.clearSelection();
        document.getElementById('formModalTitle')?.focus({ preventScroll: true });
      },
    });
  }

  function showReportNotice(topic) {
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
      message: topic ? `想聊「${topic.label}」？我们继续。` : '命盘好了，想一起聊聊吗？',
      actionLabel: `和${character.name}聊聊`,
      onAction: () => openAsk(topic?.prompt || ''),
      dismissLabel: `收起${character.name}的提示`,
      onDismiss: () => {
        slot.remove();
        document.getElementById('aiFab')?.focus({ preventScroll: true });
      },
    });
  }

  const conversation = mountCharacterCompanion(home, {
    character,
    hasReport,
    showGreeting: false,
    actionButton: document.getElementById('homeCtaMain'),
    onDefault: openForm,
    onStart(topic) {
      pendingTopic = topic;
      showFormNotice(topic);
      openForm();
    },
    onResume(topic) {
      reportTopic = topic;
      showReportNotice(reportTopic);
      openReport();
      openAsk(topic.prompt);
    },
    onSelectionChange(topic) {
      if (scene) {
        if (topic) scene.dataset.characterMood = topic.id;
        else delete scene.dataset.characterMood;
      }
      const label = invitation?.querySelector('b');
      if (label) label.textContent = topic ? '我在听' : '和我聊聊';
      if (topic) reactToConversation();
    },
  });
  const inviteConversation = () => {
    reactToConversation();
    conversation?.focus();
  };
  invitation?.addEventListener('click', inviteConversation);
  portrait?.addEventListener('click', inviteConversation);

  return {
    cancelForm: clearPending,
    onCalendarProfileReady() {
      clearPending();
      conversation?.refresh();
    },
    onReportReady({ isDemo = false } = {}) {
      reportTopic = isDemo ? null : pendingTopic;
      clearPending();
      // A sample report must not be presented as the user's own chart.
      if (!isDemo) showReportNotice(reportTopic);
      conversation?.refresh();
    },
  };
}
