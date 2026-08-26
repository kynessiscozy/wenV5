/* ========================================================================
 *  Liquid Engine — 给结果页注入"大艺术家式"液态体验
 *
 *  能力：
 *   1) 液态玻璃光斑 cursor-tracking（带缓动）
 *   2) IntersectionObserver 触发卡片入场与时间线 SVG draw
 *   3) 卡片 3D 倾斜（rAF 节流，transform-only）
 *   4) 背景墨韵 canvas 粒子层（按需节流，隐藏时不占 CPU）
 *   5) prefers-reduced-motion 全量降级
 *
 *  设计原则：只动 transform / opacity / 自定义属性，绝不触发布局。
 * ======================================================================== */

const reduced = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- 1. 液态光斑 (Cursor-tracking specular) ---------- */
function mountSpecularLayer() {
  const scroll = $('#p2Scroll');
  if (!scroll) return;
  if (scroll.querySelector('.lg-specular')) return;

  const layer = document.createElement('div');
  layer.className = 'lg-specular';
  layer.setAttribute('aria-hidden', 'true');
  scroll.appendChild(layer);

  if (reduced) return;

  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const onMove = (e) => {
    const r = scroll.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width;
    ty = (e.clientY - r.top)  / r.height;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const tick = () => {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    layer.style.setProperty('--lg-mx', (cx * 100).toFixed(2) + '%');
    layer.style.setProperty('--lg-my', (cy * 100).toFixed(2) + '%');
    if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
  };
  scroll.addEventListener('pointermove', onMove, { passive: true });
  scroll.addEventListener('pointerleave', () => { tx = 0.5; ty = 0.5; if (!raf) raf = requestAnimationFrame(tick); });
}

/* ---------- 2. 卡片入场与时间线 SVG 描边 ---------- */
function mountRevealObservers() {
  const root = $('#p2Inner');
  if (!root) return;

  // 给所有 .glass.card-2 注入 stagger index
  const cards = $$('.glass.card-2', root);
  cards.forEach((el, i) => {
    if (!el.style.getPropertyValue('--li')) {
      el.style.setProperty('--li', (i % 12).toString());
    }
  });

  if (reduced) {
    cards.forEach(el => el.classList.add('lg-in'));
    $$('.tl-curve path, .tl-curve circle', root).forEach(n => n.classList.add('lg-tl-drawn'));
    return;
  }

  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('lg-in');
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;

  if (io) cards.forEach(el => io.observe(el));
  else cards.forEach(el => el.classList.add('lg-in'));

  // 时间线 SVG draw
  const drawTl = () => {
    $$('.tl-curve', root).forEach(svg => {
      const path = svg.querySelector('path:nth-of-type(2)');
      const dots = svg.querySelectorAll('circle');
      if (!path) return;
      const len = path.getTotalLength ? path.getTotalLength() : 0;
      if (len) {
        path.style.setProperty('--lg-tl-len', len + 'px');
        path.classList.add('lg-tl-draw');
      }
      dots.forEach((c, i) => {
        c.style.setProperty('--li', i.toString());
        c.classList.add('lg-tl-dot');
      });
    });
  };
  // 等卡片入场后再 draw
  setTimeout(drawTl, 600);
}

/* ---------- 3. 卡片 3D 倾斜 (transform-only) ---------- */
function mountCardTilt() {
  if (reduced) return;
  const root = $('#p2Inner');
  if (!root) return;
  const cards = $$('.glass.card-2', root);

  const onEnter = (el) => {
    el.classList.add('lg-tilt');
  };
  cards.forEach(onEnter);

  let raf = 0, target = null;
  const apply = () => {
    if (!target) { raf = 0; return; }
    const { el, rx, ry, gx, gy } = target;
    el.style.setProperty('--lg-rx', rx.toFixed(2) + 'deg');
    el.style.setProperty('--lg-ry', ry.toFixed(2) + 'deg');
    el.style.setProperty('--lg-gx', gx.toFixed(2) + '%');
    el.style.setProperty('--lg-gy', gy.toFixed(2) + '%');
    raf = 0;
  };
  const onMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    if (r.width < 80) return; // 极小卡不参与
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top)  / r.height;
    const rx = (0.5 - py) * 6;   // 上下轻微俯仰
    const ry = (px - 0.5) * 6;   // 左右轻微旋转
    target = { el, rx, ry, gx: px * 100, gy: py * 100 };
    if (!raf) raf = requestAnimationFrame(apply);
  };
  const onLeave = (e) => {
    const el = e.currentTarget;
    target = null;
    el.style.setProperty('--lg-rx', '0deg');
    el.style.setProperty('--lg-ry', '0deg');
    el.style.setProperty('--lg-gx', '50%');
    el.style.setProperty('--lg-gy', '50%');
  };

  cards.forEach(el => {
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
  });
}

/* ---------- 4. 背景墨韵 Canvas 粒子层 ---------- */
function mountInkParticles() {
  if (reduced) return;
  const scroll = $('#p2Scroll');
  if (!scroll) return;
  if (scroll.querySelector('canvas.lg-ink')) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'lg-ink';
  canvas.setAttribute('aria-hidden', 'true');
  scroll.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  let w = 0, h = 0, parts = [];

  const resize = () => {
    const r = scroll.getBoundingClientRect();
    w = Math.max(1, Math.floor(r.width));
    h = Math.max(1, Math.floor(r.height));
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 根据面积生成 6~10 个墨点
    const target = Math.max(6, Math.min(10, Math.round((w * h) / 90000)));
    parts = new Array(target).fill(0).map(() => spawn(true));
  };

  const spawn = (initial = false) => {
    const palette = [
      'rgba(194, 59, 34, ',   // 朱砂
      'rgba(212, 162, 58, ',  // 赭黄
      'rgba(58, 107, 88, ',   // 玉青
      'rgba(42, 93, 140, ',   // 黛蓝
      'rgba(20, 20, 24, '     // 玄墨
    ];
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 40,
      r: 24 + Math.random() * 80,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.05 - Math.random() * 0.18,
      a: 0.04 + Math.random() * 0.05,
      c: palette[Math.floor(Math.random() * palette.length)]
    };
  };

  let running = true, raf = 0, last = performance.now();
  const tick = (now) => {
    if (!running) return;
    const dt = Math.min(48, now - last);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'multiply';
    parts.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y + p.r < 0) Object.assign(p, spawn(false));
      if (p.x < -p.r) p.x = w + p.r;
      if (p.x > w + p.r) p.x = -p.r;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0,   p.c + (p.a * 1.4).toFixed(3) + ')');
      g.addColorStop(0.6, p.c + (p.a * 0.6).toFixed(3) + ')');
      g.addColorStop(1,   p.c + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(tick);
  };

  // 性能与可见性：tab 隐藏/页面不可见时停
  const onVis = () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', onVis);

  // 仅在结果页可见时渲染
  const page2 = $('#page2');
  const pageObs = ('IntersectionObserver' in window)
    ? new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
        } else {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }, { threshold: 0.01 })
    : null;
  if (pageObs && page2) pageObs.observe(page2);
  else { last = performance.now(); raf = requestAnimationFrame(tick); }

  resize();
  window.addEventListener('resize', resize, { passive: true });
}

/* ---------- 5. Pillar 展开的液态过渡 ---------- */
function mountPillarBind() {
  const root = $('#p2Inner');
  if (!root) return;
  // 原生 onclick="this.classList.toggle('open')" 已挂上；这里只加 stagger index
  $$('.pl', root).forEach((el, i) => {
    if (!el.style.getPropertyValue('--li')) {
      el.style.setProperty('--li', (i % 6).toString());
    }
  });
}

/* ---------- 6. 进度条 (wxr) 流动填充 ---------- */
function mountProgressFlow() {
  const root = $('#p2Inner');
  if (!root) return;
  $$('.wxf', root).forEach((el) => {
    const v = el.getAttribute('data-w') || el.dataset.w || '';
    if (!el.style.getPropertyValue('--lg-wx-pct')) {
      el.style.setProperty('--lg-wx-pct', v);
    }
  });
  if (reduced) {
    $$('.wxf', root).forEach(el => el.style.width = (el.getAttribute('data-w') || ''));
    return;
  }
  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const el = e.target;
            el.classList.add('lg-flow');
            io.unobserve(el);
          }
        });
      }, { threshold: 0.4 })
    : null;
  if (io) $$('.wxf', root).forEach(el => io.observe(el));
}

/* ---------- 7. 顶级入口：mount / unmount ---------- */
let mounted = false;
export function mountLiquid() {
  if (mounted) return;
  const scroll = $('#p2Scroll');
  if (!scroll) return;
  scroll.classList.add('lg-on');
  mountSpecularLayer();
  mountInkParticles();
  mountRevealObservers();
  mountCardTilt();
  mountPillarBind();
  mountProgressFlow();
  mounted = true;
}

export function unmountLiquid() {
  if (!mounted) return;
  const scroll = $('#p2Scroll');
  if (scroll) {
    scroll.classList.remove('lg-on');
    scroll.querySelectorAll('.lg-specular, canvas.lg-ink').forEach(n => n.remove());
  }
  mounted = false;
}

/* ---------- 8. 报告重新渲染时重新挂载（用于在结果页内多次推演） ---------- */
export function refreshLiquid() {
  // 只重挂"内容相关"的部分；canvas/specular 持续运行
  mountRevealObservers();
  mountCardTilt();
  mountPillarBind();
  mountProgressFlow();
}

/* ---------- 9. 自动挂载：观察 #p2Inner 出现新内容 ---------- */
let autoObs = null;
export function autoMountLiquid() {
  const target = $('#p2Inner');
  if (!target || typeof MutationObserver === 'undefined') return;
  let pending = null;
  autoObs = new MutationObserver(() => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      if (!mounted) mountLiquid();
      else refreshLiquid();
    }, 80);
  });
  autoObs.observe(target, { childList: true, subtree: true });
}
