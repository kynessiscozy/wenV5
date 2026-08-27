/**
 * Liquid Orb — 首页中央通透液态光球
 * 替代/叠加于原有 #brand3d 3D 星环，保留暖金玄学基调
 */

const MIN_BLOB_RADIUS = 80;
const MAX_BLOB_RADIUS = 180;
const MOTION_PREF = window.matchMedia('(prefers-reduced-motion: reduce)');

let canvas = null;
let ctx = null;
let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let rafId = null;
let visible = true;
let reduced = MOTION_PREF.matches;
let orbColors = {};
let time = 0;
let blobs = [];
let touches = new Map();
let initialized = false;

// 仅首页空白处触发的液态流动：过滤掉交互控件，避免按钮/卡片上误触
function isInteractiveTarget(el) {
  return !!(el && el.closest && el.closest(
    'button,a,input,select,textarea,.home-hero-title,.home-hero-sub,' +
    '.ig-dock,.home-menu-btn,.home-menu-drawer,.theme-toggle-home,' +
    '.result-style-option,.tool-cta-btn,.cursor-ring,.cursor-dot'
  ));
}

function readColors() {
  const style = getComputedStyle(document.documentElement);
  orbColors = {
    a: style.getPropertyValue('--orb-a').trim() || '#f5efe0',
    b: style.getPropertyValue('--orb-b').trim() || '#e8cda0',
    c: style.getPropertyValue('--orb-c').trim() || '#d97757',
    glow: style.getPropertyValue('--orb-glow').trim() || 'rgba(217,119,87,.28)',
    core: style.getPropertyValue('--orb-core').trim() || 'rgba(255,255,255,.45)',
    rim: style.getPropertyValue('--orb-rim').trim() || 'rgba(255,255,255,.35)',
  };
}

function resize() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initBlobs() {
  blobs = [
    { phase: 0, speed: 0.0009, radiusBase: 0.18, rx: 0.22, ry: 0.14, colorOffset: 0.0 },
    { phase: 2.1, speed: 0.0012, radiusBase: 0.13, rx: 0.18, ry: 0.22, colorOffset: 0.3 },
    { phase: 4.2, speed: 0.0007, radiusBase: 0.10, rx: 0.15, ry: 0.10, colorOffset: 0.6 },
  ];
}

function easePulse(t) {
  return 0.5 + 0.5 * Math.sin(t);
}

function drawOrb() {
  if (!ctx || !visible || reduced) return;

  const centerX = width * 0.5;
  const centerY = height * 0.44;
  // 光球放大 20%
  const baseRadius = Math.min(width, height) * 0.312;

  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = 0.9;

  // 呼吸缩放：放大 20% 后增强呼吸感（幅度更大、节奏更舒缓）
  const breath = 1 + Math.sin(time * 0.0007) * 0.06;
  const radius = baseRadius * breath;
  // 轻微上下浮动，强化呼吸韵律
  const floatY = Math.sin(time * 0.0005 + 1.2) * radius * 0.05;
  const cy = centerY + floatY;

  // 1. 外部光晕
  const glowGrad = ctx.createRadialGradient(centerX, cy, radius * 0.5, centerX, cy, radius * 1.5);
  glowGrad.addColorStop(0, orbColors.glow);
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(centerX, cy, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. 主体球体
  const bodyGrad = ctx.createRadialGradient(centerX, cy, 0, centerX, cy, radius);
  bodyGrad.addColorStop(0, orbColors.c);
  bodyGrad.addColorStop(0.55, orbColors.b);
  bodyGrad.addColorStop(1, orbColors.a);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(centerX, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // 3. 内部液态高光 blob（lighter 模式融合）
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  blobs.forEach((b) => {
    const t = time * b.speed + b.phase;
    const bx = centerX + Math.sin(t) * radius * b.rx;
    const by = cy + Math.cos(t * 0.7) * radius * b.ry;
    const br = radius * b.radiusBase * (1 + Math.sin(time * 0.0015 + b.phase) * 0.16);
    const blobGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    blobGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
    blobGrad.addColorStop(0.6, 'rgba(255,255,255,0.10)');
    blobGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = blobGrad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 4. 核心高光点
  const coreGrad = ctx.createRadialGradient(
    centerX - radius * 0.24,
    cy - radius * 0.30,
    0,
    centerX - radius * 0.24,
    cy - radius * 0.30,
    radius * 0.20
  );
  coreGrad.addColorStop(0, 'rgba(255,255,255,.75)');
  coreGrad.addColorStop(0.5, 'rgba(255,255,255,.18)');
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.24, cy - radius * 0.30, radius * 0.20, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;

  // 5. 边缘 rim light
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = orbColors.rim;
  ctx.lineWidth = Math.max(1.5, radius * 0.014);
  ctx.beginPath();
  ctx.arc(centerX, cy, radius * 0.96, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 6. 触摸液态渐变流动（仅首页空白区域）
  if (touches.size) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const dead = [];
    for (const [id, t] of touches) {
      // 位置缓动跟随，产生流动拖尾感
      t.x += (t.tx - t.x) * 0.16;
      t.y += (t.ty - t.y) * 0.16;
      if (!t.down) t.life -= 0.022;
      if (t.life <= 0) { dead.push(id); continue; }
      const rr = Math.min(width, height) * 0.15 * t.life;
      const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, rr);
      g.addColorStop(0, colorAlpha(orbColors.core, 0.6 * t.life));
      g.addColorStop(0.45, colorAlpha(orbColors.glow, 0.42 * t.life));
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(t.x, t.y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    dead.forEach((id) => touches.delete(id));
  }
}

// 将 rgba(x,x,x,a) 或 #hex 调 alpha（简单处理 hex->rgb）
function colorAlpha(col, alpha) {
  if (col.startsWith('#')) {
    const r = parseInt(col.slice(1, 3), 16);
    const g = parseInt(col.slice(3, 5), 16);
    const b = parseInt(col.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return col.replace(/[\d.]+\s*\)$/, `${alpha})`);
}

let lastDraw = 0;
function frame(now) {
  if (!visible || reduced) {
    rafId = null;
    return;
  }
  rafId = requestAnimationFrame(frame);
  // 呼吸/流动为慢变化，30fps 已足够流畅；触摸跟随时切回近 60fps 保证跟手，
  // 同时避免每帧重算全屏 filter:blur(9px) 的昂贵合成开销
  const fast = touches.size > 0;
  const interval = fast ? 16 : 33;
  if (now - lastDraw < interval) return;
  lastDraw = now;
  time = now;
  drawOrb();
}

function start() {
  if (!canvas) return;
  visible = true;
  readColors();
  resize();
  if (!rafId) {
    rafId = requestAnimationFrame(frame);
  }
}

function stop() {
  visible = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function onVisibility() {
  if (document.hidden) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  } else if (visible && !rafId && !reduced) {
    rafId = requestAnimationFrame(frame);
  }
}

function onResize() {
  resize();
}

function onMotionChange(e) {
  reduced = e.matches;
  if (reduced) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    // 清空画布，让 CSS 静态回退显示
    if (ctx) ctx.clearRect(0, 0, width, height);
  } else if (visible && !rafId) {
    rafId = requestAnimationFrame(frame);
  }
}

/* ---------- 触摸液态流动：指针交互 ---------- */
function onTouchDown(e) {
  if (!document.body.classList.contains('home')) return;
  if (isInteractiveTarget(e.target)) return;
  touches.set(e.pointerId, {
    x: e.clientX, y: e.clientY, tx: e.clientX, ty: e.clientY, life: 1, down: true,
  });
}
function onTouchMove(e) {
  if (!document.body.classList.contains('home')) return;
  const t = touches.get(e.pointerId);
  if (!t) return;
  if (isInteractiveTarget(e.target)) return;
  t.tx = e.clientX;
  t.ty = e.clientY;
}
function onTouchEnd(e) {
  const t = touches.get(e.pointerId);
  if (t) t.down = false;
}

export function initLiquidOrb() {
  if (initialized) return;
  initialized = true;
  canvas = document.getElementById('liquidOrb');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  readColors();
  initBlobs();

  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  MOTION_PREF.addEventListener('change', onMotionChange);

  // 监听主题切换（theme.js 会改 data-theme）
  const mo = new MutationObserver(() => {
    readColors();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // 是否首页
  const observer = new MutationObserver(() => {
    if (document.body.classList.contains('home')) {
      start();
    } else {
      stop();
      touches.clear();
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // 首页空白处的触摸液态流动
  window.addEventListener('pointerdown', onTouchDown, { passive: true });
  window.addEventListener('pointermove', onTouchMove, { passive: true });
  window.addEventListener('pointerup', onTouchEnd, { passive: true });
  window.addEventListener('pointercancel', onTouchEnd, { passive: true });

  if (document.body.classList.contains('home')) {
    start();
  } else {
    stop();
  }

  window._tjLiquidOrb = { start, stop };
}

export function destroyLiquidOrb() {
  stop();
  if (canvas) {
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    MOTION_PREF.removeEventListener('change', onMotionChange);
    window.removeEventListener('pointerdown', onTouchDown);
    window.removeEventListener('pointermove', onTouchMove);
    window.removeEventListener('pointerup', onTouchEnd);
    window.removeEventListener('pointercancel', onTouchEnd);
    touches.clear();
  }
}
