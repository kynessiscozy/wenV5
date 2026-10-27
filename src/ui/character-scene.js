/** A small amount of pointer-driven depth, with a static reduced-motion view. */
export function initCharacterScene() {
  const scene = document.getElementById('characterScene');
  if (!scene || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    scene.style.setProperty('--character-x', '0px');
    scene.style.setProperty('--character-y', '0px');
    scene.style.setProperty('--scene-drift-x', '0px');
    scene.style.setProperty('--scene-drift-y', '0px');
  };

  scene.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches) return;
    const rect = scene.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      scene.style.setProperty('--character-x', `${(x * 7).toFixed(1)}px`);
      scene.style.setProperty('--character-y', `${(y * 6).toFixed(1)}px`);
      scene.style.setProperty('--scene-drift-x', `${(x * -10).toFixed(1)}px`);
      scene.style.setProperty('--scene-drift-y', `${(y * -8).toFixed(1)}px`);
      frame = 0;
    });
  }, { passive: true });
  scene.addEventListener('pointerleave', reset);
  reducedMotion.addEventListener?.('change', reset);
}
