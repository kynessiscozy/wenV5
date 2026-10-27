/**
 * Liquid Orb — 首页通透液态光球（单个）
 * 暖橙金色调，含呼吸/浮动/内部液态高光/触摸流动，性能沿用 30fps 节流
 */

const MOTION_PREF = window.matchMedia('(prefers-reduced-motion: reduce)');

let canvas = null;
let ctx = null;
let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let rafId = null;
let visible = true;
let reduced = MOTION_PREF.matches;
let time = 0;
let touches = new Map();
let initialized = false;
let themeDark = false;

// 单球随机布局：随机大小 + 随机相位，运行时固定（避免每帧重算）
let orbCfg = null;

// 光球配色预设：每项含 明暗各一套 a/b/c/glow/core/rim
// a=外部浅色 b=中间 b=内部深色；core=核心高光 rim=边缘描边
const ORB_PRESETS = {
  brand: {
    name: '品牌赭',
    swatch: '#d97757',
    amb: ['hsla(15,60%,58%,0.40)', 'hsla(8,56%,60%,0.28)', 'hsla(22,58%,52%,0.26)'],
    light: { a: 'hsl(15,70%,90%)', b: 'hsl(15,62%,78%)', c: 'hsl(15,60%,62%)', glow: 'hsla(15,60%,60%,0.30)', core: 'rgba(255,255,255,0.72)', rim: 'rgba(255,255,255,0.42)' },
    dark:  { a: 'hsl(15,80%,92%)', b: 'hsl(15,70%,80%)', c: 'hsl(15,64%,64%)', glow: 'hsla(15,66%,62%,0.46)', core: 'rgba(255,255,255,0.85)', rim: 'rgba(255,255,255,0.55)' },
  },
  amber: {
    name: '暖橙金',
    swatch: '#f4933a',
    amb: ['hsla(33,90%,58%,0.40)', 'hsla(45,88%,60%,0.28)', 'hsla(24,84%,52%,0.26)'],
    light: { a: 'hsl(40,90%,86%)', b: 'hsl(36,85%,72%)', c: 'hsl(32,80%,58%)', glow: 'hsla(32,82%,60%,0.30)', core: 'rgba(255,255,255,0.72)', rim: 'rgba(255,255,255,0.42)' },
    dark:  { a: 'hsl(42,95%,90%)', b: 'hsl(38,90%,76%)', c: 'hsl(34,85%,64%)', glow: 'hsla(32,85%,62%,0.46)', core: 'rgba(255,255,255,0.85)', rim: 'rgba(255,255,255,0.55)' },
  },
  violet: {
    name: '暖紫',
    swatch: '#a97bdd',
    amb: ['hsla(268,64%,64%,0.38)', 'hsla(290,58%,66%,0.24)', 'hsla(255,60%,56%,0.22)'],
    light: { a: 'hsl(268,72%,90%)', b: 'hsl(268,64%,78%)', c: 'hsl(268,60%,64%)', glow: 'hsla(268,62%,64%,0.30)', core: 'rgba(255,255,255,0.72)', rim: 'rgba(255,255,255,0.42)' },
    dark:  { a: 'hsl(268,82%,93%)', b: 'hsl(268,72%,80%)', c: 'hsl(268,66%,66%)', glow: 'hsla(268,70%,66%,0.46)', core: 'rgba(255,255,255,0.85)', rim: 'rgba(255,255,255,0.55)' },
  },
  mint: {
    name: '薄荷绿',
    swatch: '#4ec9a0',
    amb: ['hsla(162,62%,54%,0.38)', 'hsla(152,56%,58%,0.24)', 'hsla(172,58%,48%,0.22)'],
    light: { a: 'hsl(162,70%,90%)', b: 'hsl(162,62%,78%)', c: 'hsl(162,58%,62%)', glow: 'hsla(162,60%,62%,0.30)', core: 'rgba(255,255,255,0.72)', rim: 'rgba(255,255,255,0.42)' },
    dark:  { a: 'hsl(162,82%,93%)', b: 'hsl(162,72%,80%)', c: 'hsl(162,66%,64%)', glow: 'hsla(162,72%,64%,0.46)', core: 'rgba(255,255,255,0.85)', rim: 'rgba(255,255,255,0.55)' },
  },
  ice: {
    name: '冰蓝',
    swatch: '#5aa9e6',
    amb: ['hsla(205,70%,58%,0.40)', 'hsla(190,66%,60%,0.26)', 'hsla(222,64%,52%,0.24)'],
    light: { a: 'hsl(205,78%,90%)', b: 'hsl(205,70%,78%)', c: 'hsl(205,66%,62%)', glow: 'hsla(205,68%,62%,0.30)', core: 'rgba(255,255,255,0.72)', rim: 'rgba(255,255,255,0.42)' },
    dark:  { a: 'hsl(205,88%,93%)', b: 'hsl(205,78%,80%)', c: 'hsl(205,72%,64%)', glow: 'hsla(205,78%,64%,0.46)', core: 'rgba(255,255,255,0.85)', rim: 'rgba(255,255,255,0.55)' },
  },
  rose: {
    name: '玫瑰金',
    swatch: '#e6a0b0',
    amb: ['hsla(345,58%,62%,0.36)', 'hsla(330,52%,66%,0.22)', 'hsla(356,54%,54%,0.20)'],
    light: { a: 'hsl(345,70%,90%)', b: 'hsl(345,60%,80%)', c: 'hsl(345,56%,66%)', glow: 'hsla(345,58%,66%,0.30)', core: 'rgba(255,255,255,0.72)', rim: 'rgba(255,255,255,0.42)' },
    dark:  { a: 'hsl(345,82%,93%)', b: 'hsl(345,72%,82%)', c: 'hsl(345,66%,68%)', glow: 'hsla(345,74%,68%,0.46)', core: 'rgba(255,255,255,0.85)', rim: 'rgba(255,255,255,0.55)' },
  },
};

const ORB_STORE_KEY = 'tj_orb_color';
let orbColorKey = 'brand';
let curPalette = ORB_PRESETS.brand;

// 把当前配色的环境辉光色写入 CSS 变量，让背景渐变流动色随光球同步
// hex -> {h,s,l}（h 0-360, s/l 0-100）
function hexToHsl(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
// 返回 hsl(h, s%, l%) 字符串
function hslStr(h, s, l) { return 'hsl(' + h + ',' + s + '%,' + l + '%)'; }
function clampL(l) { return Math.max(4, Math.min(96, l)); }

function applyOrbAmbient() {
  const amb = curPalette.amb || ORB_PRESETS.brand.amb;
  const root = document.documentElement;
  root.style.setProperty('--orb-amb-1', amb[0]);
  root.style.setProperty('--orb-amb-2', amb[1]);
  root.style.setProperty('--orb-amb-3', amb[2]);
  // 同步首页「输入信息」按钮等强调色为光球主题色
  const sw = curPalette.swatch || ORB_PRESETS.brand.swatch;
  const { h, s, l } = hexToHsl(sw);
  // 实心按钮需中等偏深亮度，保证白色文字可读（限制在 32~56%）
  const accL = clampL(Math.max(32, Math.min(56, l - 4)));
  root.style.setProperty('--c-accent', hslStr(h, Math.min(100, s + 6), accL));
  root.style.setProperty('--c-accent-hover', hslStr(h, Math.min(100, s + 8), clampL(accL - 10)));
  root.style.setProperty('--c-accent-soft', hslStr(h, Math.max(20, s), clampL(accL + 30)));
  root.style.setProperty('--c-accent-text', hslStr(h, Math.min(100, s + 20), clampL(accL - 22)));
}

function loadOrbColor() {
  try {
    const k = localStorage.getItem(ORB_STORE_KEY);
    if (k && ORB_PRESETS[k]) orbColorKey = k;
  } catch (e) {}
  curPalette = ORB_PRESETS[orbColorKey];
  applyOrbAmbient();
}

// 切换光球颜色：返回是否成功
function setOrbColor(key) {
  if (!ORB_PRESETS[key]) return false;
  orbColorKey = key;
  curPalette = ORB_PRESETS[key];
  applyOrbAmbient();
  try { localStorage.setItem(ORB_STORE_KEY, key); } catch (e) {}
  return true;
}

// 仅首页空白处触发的液态流动：过滤掉交互控件，避免按钮/卡片上误触
function isInteractiveTarget(el) {
  return !!(el && el.closest && el.closest(
    'button,a,input,select,textarea,.home-hero-title,.home-hero-sub,' +
    '.ig-dock,.home-menu-btn,.home-menu-drawer,.theme-toggle-home,' +
    '.home-orb-palette-btn,.home-orb-palette-panel,' +
    '.result-style-option,.tool-cta-btn,.cursor-ring,.cursor-dot'
  ));
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

// 生成单球随机布局：随机大小 + 随机相位，运行时固定
// 桌面端（宽屏）光球缩小并下沉到 hero 内容下方；移动端保持适中
function initOrbs() {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const desktop = window.innerWidth >= 768;
  // 保留已有相位/blobs，避免 resize 时视觉跳变
  const prev = orbCfg;
  const phase = prev ? prev.phase : rnd(0, 6.28);
  const blobs = prev ? prev.blobs : [
    { phase: rnd(0, 6.28), speed: 0.0012, rb: 0.16, rx: 0.22, ry: 0.15 },
    { phase: rnd(0, 6.28), speed: 0.0015, rb: 0.11, rx: 0.17, ry: 0.22 },
  ];
  orbCfg = {
    rf: desktop ? rnd(0.15, 0.19) : rnd(0.24, 0.29),
    oy: rnd(-0.04, 0.02),
    cyPct: desktop ? 0.50 : 0.44,
    phase,
    blobs,
  };
  _lastDesktop = desktop;
}

function drawOrb() {
  if (!ctx || !visible || reduced) return;

  const base = Math.min(width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = 0.9;

  const p = themeDark ? curPalette.dark : curPalette.light;
  const cx = width * 0.5;
  // 整体呼吸节律（慢变化，幅度小）
  const breath = 1 + Math.sin(time * 0.0007) * 0.05;
  const floatY = Math.sin(time * 0.0005 + orbCfg.phase) * base * 0.018;
  const cy = height * (orbCfg.cyPct || 0.44) + orbCfg.oy * base + floatY;
  const r = orbCfg.rf * base * (breath + Math.sin(time * 0.0009 + orbCfg.phase) * 0.03);

  // 1. 外部光晕
  const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r * 1.55);
  glowGrad.addColorStop(0, p.glow);
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2);
  ctx.fill();

  // 2. 主体球体（同色调：中心深 → 外浅）
  const bodyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  bodyGrad.addColorStop(0, p.c);
  bodyGrad.addColorStop(0.55, p.b);
  bodyGrad.addColorStop(1, p.a);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 3. 内部液态高光 blob（lighter 模式融合）—— 运动明显
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  orbCfg.blobs.forEach((bl) => {
    const t = time * bl.speed * 2.4 + bl.phase;
    const bx = cx + Math.sin(t) * r * bl.rx * 1.9;
    const by = cy + Math.sin(t * 0.85 + 1.4) * r * bl.ry * 1.9;
    const br = r * bl.rb * (1 + Math.sin(time * 0.0028 + bl.phase) * 0.28);
    const blobGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    blobGrad.addColorStop(0, 'rgba(255,255,255,0.46)');
    blobGrad.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    blobGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = blobGrad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  });
  // 持续旋转的中央漩涡
  const sAng = time * 0.0018 + orbCfg.phase;
  const sx = cx + Math.sin(sAng) * r * 0.30;
  const sy = cy + Math.cos(sAng * 1.15) * r * 0.26;
  const sr = r * 0.24 * (1 + Math.sin(time * 0.0022 + orbCfg.phase) * 0.22);
  const swirlGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
  swirlGrad.addColorStop(0, 'rgba(255,255,255,0.34)');
  swirlGrad.addColorStop(0.55, 'rgba(255,245,225,0.13)');
  swirlGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = swirlGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. 核心高光点
  const coreGrad = ctx.createRadialGradient(
    cx - r * 0.24, cy - r * 0.30, 0,
    cx - r * 0.24, cy - r * 0.30, r * 0.20
  );
  coreGrad.addColorStop(0, p.core);
  coreGrad.addColorStop(0.5, p.core.replace(/[\d.]+\s*\)$/, '0.18)'));
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx - r * 0.24, cy - r * 0.30, r * 0.20, 0, Math.PI * 2);
  ctx.fill();

  // 5. 边缘 rim light
  ctx.save();
  ctx.strokeStyle = p.rim;
  ctx.lineWidth = Math.max(1.2, r * 0.014);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.globalAlpha = 1;

  // 6. 触摸液态渐变流动（仅首页空白区域）—— 流动色跟随当前光球主题色
  if (touches.size) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fc = hexToHsl(curPalette.swatch);
    const flowHue = fc.h, flowSat = Math.min(100, fc.s + 14), flowLit = clampL(fc.l - 4);
    const dead = [];
    for (const [id, t] of touches) {
      t.x += (t.tx - t.x) * 0.16;
      t.y += (t.ty - t.y) * 0.16;
      if (!t.down) t.life -= 0.022;
      if (t.life <= 0) { dead.push(id); continue; }
      const rr = base * 0.15 * t.life;
      const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, rr);
      g.addColorStop(0, `rgba(255,255,255,${0.6 * t.life})`);
      g.addColorStop(0.45, `hsla(${flowHue}, ${flowSat}%, ${flowLit}%, ${0.42 * t.life})`);
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
  if (!orbCfg) initOrbs();
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

let _lastDesktop = null;
function onResize() {
  const desktop = window.innerWidth >= 768;
  if (_lastDesktop === null) _lastDesktop = desktop;
  if (desktop !== _lastDesktop) {
    _lastDesktop = desktop;
    initOrbs();
  }
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

export function initLiquidOrb({ animate = true } = {}) {
  if (initialized) return;
  initialized = true;
  canvas = document.getElementById('liquidOrb');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  initOrbs();
  loadOrbColor();
  themeDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // The character home keeps report color settings without animating a hidden canvas.
  window._tjLiquidOrb = {
    start,
    stop,
    setColor: setOrbColor,
    getColorKey: () => orbColorKey,
    getPresets: () => Object.keys(ORB_PRESETS).map((k) => ({ key: k, name: ORB_PRESETS[k].name, swatch: ORB_PRESETS[k].swatch })),
  };
  if (!animate) return;

  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  MOTION_PREF.addEventListener('change', onMotionChange);

  // 监听主题切换（theme.js 会改 data-theme）
  const mo = new MutationObserver(() => {
    themeDark = document.documentElement.getAttribute('data-theme') === 'dark';
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
