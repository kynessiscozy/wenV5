/** Subtle pointer depth on desktop; touch and reduced-motion users see a still scene. */
export function initCharacterScene() {
  const scene = document.getElementById('characterScene');
  if (!scene || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const backdrop = document.querySelector('.character-backdrop');
  let frame = 0;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    scene.style.setProperty('--character-x', '0px');
    scene.style.setProperty('--character-y', '0px');
    scene.style.setProperty('--lantern-x', '0px');
    scene.style.setProperty('--lantern-y', '0px');
    scene.style.setProperty('--cloud-x', '0px');
    scene.style.setProperty('--cloud-y', '0px');
    backdrop?.style.setProperty('--backdrop-drift-x', '0px');
    backdrop?.style.setProperty('--backdrop-drift-y', '0px');
  };

  scene.addEventListener('pointermove', event => {
    if (reducedMotion.matches || scene.dataset.cameraDragging === 'true') return;
    const rect = scene.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      scene.style.setProperty('--character-x', `${(x * 4).toFixed(1)}px`);
      scene.style.setProperty('--character-y', `${(y * 3).toFixed(1)}px`);
      scene.style.setProperty('--lantern-x', `${(x * -7).toFixed(1)}px`);
      scene.style.setProperty('--lantern-y', `${(y * -4).toFixed(1)}px`);
      scene.style.setProperty('--cloud-x', `${(x * 3).toFixed(1)}px`);
      scene.style.setProperty('--cloud-y', `${(y * 2).toFixed(1)}px`);
      backdrop?.style.setProperty('--backdrop-drift-x', `${(x * -4).toFixed(1)}px`);
      backdrop?.style.setProperty('--backdrop-drift-y', `${(y * -3).toFixed(1)}px`);
      frame = 0;
    });
  }, { passive: true });
  scene.addEventListener('pointerleave', reset);
  scene.addEventListener('character-camera-dragstart', reset);
  reducedMotion.addEventListener?.('change', reset);
}
