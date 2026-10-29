const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Keep the same close-up on every entry, with a role-specific prop-safe anchor. */
export function initCharacterCamera() {
  const scene = document.getElementById('characterScene');
  const camera = scene?.querySelector('.character-camera');
  const portrait = scene?.querySelector('.character-portrait');
  const viewport = scene?.querySelector('.character-camera-viewport');
  const backdrop = document.querySelector('.character-backdrop');
  if (!scene || !camera || !portrait) return null;
  scene.dataset.cameraShot = 'close';

  function paint() {
    const stage = scene.getBoundingClientRect();
    const figure = portrait.getBoundingClientRect();
    const baseScale = Number(scene.dataset.cameraCloseScale) || 1.7;
    // A short landscape viewport otherwise shrinks the figure to a distant
    // shot. Keep the same close-up and recalculate the prop-safe anchor using
    // the actual displayed scale, rather than just magnifying the CSS layer.
    const compactLandscape = window.matchMedia('(orientation: landscape) and (max-height: 550px)').matches;
    const scale = baseScale * (compactLandscape ? 1.35 : 1);
    const safeX = Number(scene.dataset.cameraSafeX);
    let shiftX = 0;
    if (scene.dataset.cameraSafeX != null && Number.isFinite(safeX) && scale > 1) {
      const center = stage.width / 2;
      const anchor = figure.left - stage.left + figure.width * safeX;
      const projected = center + (anchor - center) * scale;
      const inset = Math.max(16, figure.width * scale * (Number(scene.dataset.cameraSafeInset) || .05));
      shiftX = clamp(projected, inset, stage.width - inset) - projected;
    }
    camera.style.setProperty('--camera-scale', scale.toFixed(4));
    camera.style.setProperty('--camera-shift-x', `${shiftX.toFixed(2)}px`);
    camera.style.setProperty('--camera-shift-y', '12%');
    backdrop?.style.setProperty('--camera-room-scale', '1.105');
  }

  let frame = 0;
  const updateGeometry = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { frame = 0; paint(); });
  };
  // `overflow: clip` avoids a scroll container; guard older hidden fallbacks too.
  viewport?.addEventListener('scroll', () => {
    if (viewport.scrollLeft || viewport.scrollTop) viewport.scrollTo(0, 0);
  }, { passive: true });
  scene.addEventListener('dragstart', event => event.preventDefault());
  // A swipe is no longer a camera control, and must not turn into an accidental
  // portrait tap. Keyboard activation (detail === 0) always remains available.
  let pointer = null;
  let suppressClick = false;
  scene.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (event.isPrimary) pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, { passive: true });
  window.addEventListener('pointermove', event => {
    if (pointer?.id === event.pointerId && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 12) suppressClick = true;
  }, { passive: true });
  window.addEventListener('pointerup', event => {
    if (pointer?.id === event.pointerId) {
      pointer = null;
      window.setTimeout(() => { suppressClick = false; }, 400);
    }
  }, { passive: true });
  window.addEventListener('pointercancel', () => { pointer = null; suppressClick = false; }, { passive: true });
  scene.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  scene.addEventListener('character-assets-changed', updateGeometry);
  window.addEventListener('resize', updateGeometry, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(updateGeometry);
    observer.observe(scene);
    observer.observe(portrait);
  }
  paint();
  return { getSelected: () => 'close' };
}
