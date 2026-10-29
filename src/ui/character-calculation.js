import { HOME_THEMES } from './home-theme.js';

const SCENE_DURATION = 2100;

function selectedThemeId() {
  const requested = document.documentElement.dataset.homeTheme;
  return Object.hasOwn(HOME_THEMES, requested) ? requested : 'wenwen';
}
function setImage(image, src) {
  if (!image || !src) return;
  // Retry a previously failed optional image the next time it is requested.
  if (image.getAttribute('src') !== src || (image.complete && !image.naturalWidth)) image.setAttribute('src', src);
}
function requestRoleProps(overlay, themeId) {
  overlay.querySelectorAll(`.calculation-props--${themeId} [data-calculation-src]`).forEach((image) => setImage(image, image.dataset.calculationSrc));
}

/** Start fetching the chosen role's optional props while the user fills the form. */
export function warmCharacterCalculation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const overlay = document.getElementById('calculationOverlay');
  if (overlay) requestRoleProps(overlay, selectedThemeId());
}

/** The scene remains in charge until the user explicitly continues from the real result. */
export function beginCharacterCalculation() {
  const overlay = document.getElementById('calculationOverlay');
  const skip = document.getElementById('calculationSkip');
  const proceed = document.getElementById('calculationContinue');
  if (!overlay || !skip || !proceed) return null;

  const themeId = selectedThemeId();
  const theme = HOME_THEMES[themeId];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const previousFocus = document.activeElement;
  const startedAt = performance.now();
  let skipped = false;
  let finished = false;
  let releaseAnimation = null;
  let releaseResult = null;
  let waitTimer = null;

  const narrow = window.matchMedia('(max-aspect-ratio: 4/5)').matches;
  setImage(overlay.querySelector('[data-calculation-backdrop]'), narrow ? theme.backdrop.mobile : theme.backdrop.wide);
  setImage(overlay.querySelector('[data-calculation-portrait]'), theme.character.assets.portrait.src);
  if (!reducedMotion.matches) requestRoleProps(overlay, themeId);
  overlay.dataset.calculationTheme = themeId;
  overlay.dataset.calculationState = 'computing';
  delete overlay.dataset.animationSkipped;
  document.getElementById('calculationByline').textContent = `${theme.trait.label} · 命盘推演`;
  document.getElementById('calculationTitle').textContent = '正在推演';
  document.getElementById('calculationStatus').textContent = '排定四柱，合参星位…';
  overlay.querySelectorAll('[data-calculation-pillar]').forEach((item) => { item.textContent = '—'; });
  overlay.querySelector('.calculation-pillars')?.setAttribute('aria-label', '四柱结果');
  skip.hidden = reducedMotion.matches;
  proceed.hidden = true;
  overlay.hidden = false;
  (skip.hidden ? overlay : skip).focus({ preventScroll: true });

  // Move focus first, then make every other body layer unavailable until the
  // report is ready. Restore each element's previous state on all exits.
  const background = Array.from(document.body.children)
    .filter((element) => element !== overlay && !['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName))
    .map((element) => ({ element, inert: element.hasAttribute('inert'), aria: element.getAttribute('aria-hidden') }));
  background.forEach(({ element }) => { element.setAttribute('inert', ''); element.setAttribute('aria-hidden', 'true'); });

  const onSkip = (event) => {
    // Resolving the animation can reveal the result before the same click
    // bubbles; it must never count as the separate result confirmation.
    event?.stopPropagation?.();
    if (overlay.dataset.calculationState !== 'computing') return;
    skipped = true;
    overlay.dataset.animationSkipped = 'true';
    releaseAnimation?.();
  };
  const onClick = (event) => {
    if (event.target === skip || skip.contains(event.target) || overlay.dataset.calculationState !== 'ready') return;
    event.stopPropagation();
    releaseResult?.();
  };
  const onKeyDown = (event) => {
    // Global report shortcuts must not act on the inert page behind the scene.
    event.stopPropagation();
    if (event.key === 'Tab') {
      event.preventDefault();
      (overlay.dataset.calculationState === 'ready' ? proceed : skip.hidden ? overlay : skip).focus({ preventScroll: true });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      // Escape skips only the animation; it can never dismiss the result.
      onSkip();
    }
  };
  const onVisibility = () => { if (document.hidden) onSkip(); };
  const onMotionChange = (event) => { if (event.matches) onSkip(); };
  skip.addEventListener('click', onSkip);
  overlay.addEventListener('click', onClick);
  overlay.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener?.('change', onMotionChange);

  return {
    /** Let the browser paint the scene before the synchronous engine runs. */
    async paint() {
      if (reducedMotion.matches || document.hidden) return;
      await new Promise((resolve) => {
        const fallback = setTimeout(resolve, 150);
        requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(fallback); resolve(); }));
      });
    },
    /** The displayed pillars are always taken from the actual calculation. */
    showResult(bazi) {
      const names = { Y: '年柱', M: '月柱', D: '日柱', H: '时柱' };
      const labels = [];
      overlay.querySelectorAll('[data-calculation-pillar]').forEach((item) => {
        const pillar = bazi?.[item.dataset.calculationPillar];
        item.textContent = pillar?.g && pillar?.z ? `${pillar.g}${pillar.z}` : '—';
        labels.push(`${names[item.dataset.calculationPillar]}${item.textContent}`);
      });
      overlay.querySelector('.calculation-pillars')?.setAttribute('aria-label', `四柱结果，${labels.join('，')}`);
    },
    async wait() {
      // A skip, hidden document, or reduced motion removes only the animation.
      if (!skipped && !reducedMotion.matches && !document.hidden) {
        const remaining = Math.max(0, startedAt + SCENE_DURATION - performance.now());
        if (remaining > 0) {
          await new Promise((resolve) => { releaseAnimation = resolve; waitTimer = setTimeout(resolve, remaining); });
          clearTimeout(waitTimer);
          releaseAnimation = null;
        }
      }
      if (finished) return;
      overlay.dataset.calculationState = 'ready';
      document.getElementById('calculationTitle').textContent = '推演完成';
      document.getElementById('calculationStatus').textContent = '点击画面或查看报告继续';
      skip.hidden = true;
      proceed.hidden = false;
      proceed.focus({ preventScroll: true });
      // No timer, visibility change, or motion preference may dismiss this result.
      await new Promise((resolve) => { releaseResult = resolve; });
      releaseResult = null;
    },
    close({ restoreFocus = false } = {}) {
      if (finished) return;
      finished = true;
      clearTimeout(waitTimer);
      releaseAnimation?.();
      releaseResult?.();
      skip.removeEventListener('click', onSkip);
      overlay.removeEventListener('click', onClick);
      overlay.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion.removeEventListener?.('change', onMotionChange);
      overlay.hidden = true;
      delete overlay.dataset.calculationState;
      delete overlay.dataset.animationSkipped;
      background.forEach(({ element, inert, aria }) => {
        if (!inert) element.removeAttribute('inert');
        if (aria === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', aria);
      });
      if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    },
  };
}
