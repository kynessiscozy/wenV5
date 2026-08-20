/* ============================================================
   推演过渡粒子：表单"化"为粒子，汇入浑天仪中心
   ------------------------------------------------------------
   点击开始推演时调用：粒子的出生地是表单卡片区域，
   目标点是背景星环中心，沿弧线加速飞入、末端淡出，
   视觉上就是"表单融入了星环"。独立 canvas，播完即拆。
   ============================================================ */

export function burstToArmillary(rect) {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const cv = document.createElement('canvas');
  cv.id = 'tjBurst';
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1200;pointer-events:none;';
  document.body.appendChild(cv);

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth, H = window.innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  const ctx = cv.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const COLORS = dark
    ? ['rgba(240,205,178,', 'rgba(217,119,87,', 'rgba(235,225,215,']
    : ['rgba(201,111,63,', 'rgba(146,106,74,', 'rgba(120,90,70,'];

  const arm = window._tjArm;
  const c = arm ? arm.center() : { x: W / 2, y: H * 0.44 };
  // 出生区域：默认整屏中心（表单在弹窗里居中）
  const bx = rect ? rect.left : W * 0.2;
  const by = rect ? rect.top : H * 0.3;
  const bw = rect ? rect.width : W * 0.6;
  const bh = rect ? rect.height : H * 0.4;

  const N = 150;
  const parts = [];
  for (let i = 0; i < N; i++) {
    const sx = bx + Math.random() * bw;
    const sy = by + Math.random() * bh;
    const jitter = 26;
    parts.push({
      sx, sy,
      tx: c.x + (Math.random() - 0.5) * jitter * 2,
      ty: c.y + (Math.random() - 0.5) * jitter * 2,
      // 弧线控制点：让轨迹弯曲而不是直线灌入
      cx: (sx + c.x) / 2 + (Math.random() - 0.5) * 220,
      cy: (sy + c.y) / 2 + (Math.random() - 0.5) * 160,
      delay: Math.random() * 520,
      dur: 1150 + Math.random() * 900,
      size: 1 + Math.random() * 2.2,
      col: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }

  const start = performance.now();
  const TOTAL = 2600;
  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      const lt = t - p.delay;
      if (lt < 0) { alive = true; continue; }
      let pr = lt / p.dur;
      if (pr >= 1) continue;
      alive = true;
      // 缓慢汇入：smoothstep 匀速感，避免急促加速
      const q = Math.min(1, pr * pr * (3 - 2 * pr));
      const x = (1 - q) * (1 - q) * p.sx + 2 * (1 - q) * q * p.cx + q * q * p.tx;
      const y = (1 - q) * (1 - q) * p.sy + 2 * (1 - q) * q * p.cy + q * q * p.ty;
      const fade = pr < 0.15 ? pr / 0.15 : pr > 0.72 ? (1 - pr) / 0.28 : 1;
      ctx.fillStyle = p.col + (0.85 * fade).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, p.size * (1 - q * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    if (alive && t < TOTAL) requestAnimationFrame(frame);
    else cv.remove();
  }
  requestAnimationFrame(frame);
}
