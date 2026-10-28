// Camera stops are proportions of the same scene: the room moves less than the figure.
const SHOTS = Object.freeze([
  Object.freeze({ id: 'far', scale: .82, shiftY: 12, roomScale: 1.015 }),
  Object.freeze({ id: 'mid', scale: 1, shiftY: 0, roomScale: 1.04 }),
  Object.freeze({ id: 'close', scale: 1.7, shiftY: 12, roomScale: 1.105 }),
]);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Continuous interpolation lets a drag follow the hand instead of jumping between presets. */
export function cameraValues(progress, closeScale = SHOTS[2].scale) {
  const value = clamp(Number.isFinite(progress) ? progress : 1, 0, SHOTS.length - 1);
  const lower = Math.floor(value);
  const upper = Math.min(lower + 1, SHOTS.length - 1);
  const amount = value - lower;
  const at = (index, key) => key === 'scale' && index === 2 && Number.isFinite(closeScale) ? closeScale : SHOTS[index][key];
  const mix = key => at(lower, key) + (at(upper, key) - at(lower, key)) * amount;
  return { scale: mix('scale'), shiftY: mix('shiftY'), roomScale: mix('roomScale') };
}

/** A small camera control, independent of the character and of the app's real actions. */
export function initCharacterCamera() {
  const scene = document.getElementById('characterScene');
  const camera = scene?.querySelector('.character-camera');
  const subject = scene?.querySelector('.character-camera-subject');
  const viewport = scene?.querySelector('.character-camera-viewport');
  const backdrop = document.querySelector('.character-backdrop');
  const picker = document.querySelector('.character-camera-picker');
  const buttons = picker ? [...picker.querySelectorAll('button[data-camera-shot]')] : [];
  if (!scene || !camera || !subject || buttons.length !== SHOTS.length) return null;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 1;
  let gesture = null;
  let frame = 0;
  let reactionTimer = 0;
  let suppressClick = false;
  let framing = null;

  function measure() {
    const stage = scene.getBoundingClientRect();
    const portrait = subject.parentElement.getBoundingClientRect();
    framing = { width: stage.width, portraitLeft: portrait.left - stage.left, portraitWidth: portrait.width };
  }

  function paint(progress) {
    const closeScale = Number(scene.dataset.cameraCloseScale) || SHOTS[2].scale;
    const values = cameraValues(progress, closeScale);
    const safeX = Number(scene.dataset.cameraSafeX);
    let shiftX = 0;
    if (framing && scene.dataset.cameraSafeX != null && Number.isFinite(safeX) && values.scale > 1) {
      const center = framing.width / 2;
      const anchor = framing.portraitLeft + framing.portraitWidth * safeX;
      const projected = center + (anchor - center) * values.scale;
      const inset = Math.max(16, framing.portraitWidth * values.scale * (Number(scene.dataset.cameraSafeInset) || .05));
      shiftX = clamp(projected, inset, framing.width - inset) - projected;
    }
    camera.style.setProperty('--camera-scale', values.scale.toFixed(4));
    camera.style.setProperty('--camera-shift-x', `${shiftX.toFixed(2)}px`);
    camera.style.setProperty('--camera-shift-y', `${values.shiftY.toFixed(3)}%`);
    backdrop?.style.setProperty('--camera-room-scale', values.roomScale.toFixed(4));
  }

  function schedulePaint(progress) {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { frame = 0; paint(progress); });
  }

  function greet() {
    clearTimeout(reactionTimer);
    scene.classList.remove('camera-react');
    if (reducedMotion.matches) return;
    // The character blinks once as the camera settles; this is not a simulated chat.
    reactionTimer = window.setTimeout(() => {
      scene.classList.add('camera-react');
      reactionTimer = window.setTimeout(() => scene.classList.remove('camera-react'), 900);
    }, 450);
  }

  function select(index, react = true) {
    selected = clamp(index, 0, SHOTS.length - 1);
    scene.dataset.cameraShot = SHOTS[selected].id;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
    paint(selected);
    if (react) greet();
  }

  buttons.forEach((button, i) => button.addEventListener('click', () => select(i)));
  picker.addEventListener('keydown', event => {
    const current = buttons.indexOf(event.target);
    if (current < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? SHOTS.length - 1
      : clamp(current + (event.key === 'ArrowRight' ? 1 : -1), 0, SHOTS.length - 1);
    select(next);
    buttons[next].focus({ preventScroll: true });
  });

  // `overflow: clip` avoids an inner scroll container; reset it on older browsers using the hidden fallback.
  viewport?.addEventListener('scroll', () => {
    if (viewport.scrollLeft || viewport.scrollTop) viewport.scrollTo(0, 0);
  }, { passive: true });
  scene.addEventListener('dragstart', event => event.preventDefault());
  scene.addEventListener('click', event => {
    // A swipe that started on the portrait must not also open the form.
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  scene.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    measure();
    gesture = {
      id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(),
      start: selected, progress: selected, locked: false,
      distance: clamp(scene.getBoundingClientRect().width * .32, 100, 200),
    };
  }, { passive: true });

  window.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.locked) {
      // Let vertical swipes scroll the page and let small movements remain ordinary clicks.
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.2) { gesture = null; return; }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      gesture.locked = true;
      scene.dataset.cameraDragging = 'true';
      document.body.classList.add('camera-dragging');
      scene.dispatchEvent(new Event('character-camera-dragstart'));
    }
    gesture.progress = clamp(gesture.start - dx / gesture.distance, 0, SHOTS.length - 1);
    schedulePaint(gesture.progress);
  }, { passive: true });

  function finish(event, cancelled = false) {
    if (!gesture || (event && gesture.id !== event.pointerId)) return;
    const current = gesture;
    gesture = null;
    if (!current.locked) return;
    cancelAnimationFrame(frame);
    frame = 0;
    paint(current.progress);
    // Commit the direct-manipulation frame before enabling the easing for the snap.
    getComputedStyle(subject).transform;
    delete scene.dataset.cameraDragging;
    document.body.classList.remove('camera-dragging');
    const dx = (event?.clientX ?? current.x) - current.x;
    const elapsed = performance.now() - current.time;
    const quickFlick = Math.abs(dx) > 36 && elapsed < 300 && Math.abs(dx) / Math.max(elapsed, 1) > .4;
    const direction = dx < 0 ? 1 : -1;
    const nearest = Math.round(current.progress);
    // A flick advances at least one stop, but never pulls a longer drag back a stop.
    const flickTarget = direction > 0 ? Math.max(nearest, current.start + 1) : Math.min(nearest, current.start - 1);
    select(cancelled ? current.start : quickFlick ? flickTarget : nearest, !cancelled);
    if (!cancelled) {
      suppressClick = true;
      // The next pointerdown clears this immediately; this timeout covers pointerup without a click.
      window.setTimeout(() => { suppressClick = false; }, 500);
    }
  }
  window.addEventListener('pointerup', event => finish(event));
  window.addEventListener('pointercancel', event => finish(event, true));
  window.addEventListener('blur', () => finish(null, true));
  reducedMotion.addEventListener?.('change', () => {
    clearTimeout(reactionTimer);
    scene.classList.remove('camera-react');
  });

  // Recalculate the composition only when the character or viewport changes, not on every drag frame.
  let measureFrame = 0;
  const updateGeometry = () => {
    cancelAnimationFrame(measureFrame);
    measureFrame = requestAnimationFrame(() => {
      measureFrame = 0;
      measure();
      paint(gesture?.progress ?? selected);
    });
  };
  scene.addEventListener('character-assets-changed', updateGeometry);
  window.addEventListener('resize', updateGeometry, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(updateGeometry);
    observer.observe(scene);
    observer.observe(subject.parentElement);
  }
  // Start in the existing full-figure composition; changing characters retains the current shot.
  measure();
  select(1, false);
  return { select: id => { const index = SHOTS.findIndex(shot => shot.id === id); if (index >= 0) select(index); }, getSelected: () => SHOTS[selected].id };
}
