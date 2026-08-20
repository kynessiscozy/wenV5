/* ============================================================
   开屏动画：逐笔绘制应用 V5 图标
   ------------------------------------------------------------
   页面加载时自动播放：底色方块 → 外层螺旋 → 内层曲线
   → 中心圆环 → 金点弹出 → V5 文字淡入 → 停留 2s → 淡出
   全程使用 SVG stroke-dasharray + stroke-dashoffset 动画。
   ============================================================ */

export function playIconDrawAnimation() {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  /* 避免重复触发 */
  if (document.getElementById('tjIconDraw')) return;

  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const bg = dark ? '#1a1915' : '#f5efe0';
  const strokeColor = 'rgba(180,135,65,.7)';
  const accentColor = '#c75a2a';
  const goldColor = '#c49b3c';
  const ringColor = 'rgba(140,100,50,.5)';

  /* 计算路径长度（近似值，用于 dash 动画） */
  const PATH1_LEN = 180; // 外层螺旋路径
  const PATH2_LEN = 120; // 内层曲线
  const RING_LEN = Math.PI * 9; // r=4.5

  const overlay = document.createElement('div');
  overlay.id = 'tjIconDraw';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:1400;display:flex;align-items:center;justify-content:center;' +
    'background:' + (dark ? 'rgba(26,25,21,.98)' : 'rgba(245,239,224,.98)') + ';' +
    'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' +
    'opacity:0;transition:opacity .5s ease;';

  overlay.innerHTML =
    '<svg viewBox="0 0 64 64" width="240" height="240" style="filter:drop-shadow(0 8px 32px rgba(0,0,0,.12))">' +
      '<rect class="id-bg" width="64" height="64" rx="12" fill="' + bg + '" ' +
        'style="transform-origin:center;transform:scale(0)"/>' +
      '<path class="id-p1" ' +
        'd="M32 8 C50 8 56 20 56 32 C56 44 50 56 32 56 C14 56 8 44 8 32 C8 24 12 16 16 16 C24 16 28 28 28 32 C28 40 22 48 16 48" ' +
        'fill="none" stroke="' + strokeColor + '" stroke-width="2.5" stroke-linecap="round" ' +
        'stroke-dasharray="' + PATH1_LEN + '" stroke-dashoffset="' + PATH1_LEN + '"/>' +
      '<path class="id-p2" ' +
        'd="M32 8 C46 8 48 18 48 26 C48 34 40 42 32 42 C24 42 16 40 16 48" ' +
        'fill="none" stroke="' + accentColor + '" stroke-width="2.5" stroke-linecap="round" ' +
        'stroke-dasharray="' + PATH2_LEN + '" stroke-dashoffset="' + PATH2_LEN + '"/>' +
      '<circle class="id-ring" cx="32" cy="32" r="4.5" fill="none" stroke="' + ringColor + '" stroke-width="1.2" ' +
        'stroke-dasharray="' + RING_LEN.toFixed(1) + '" stroke-dashoffset="' + RING_LEN.toFixed(1) + '"/>' +
      '<circle class="id-dot" cx="32" cy="32" r="1.8" fill="' + goldColor + '" ' +
        'style="opacity:0;transform-origin:32px 32px;transform:scale(0)"/>' +
      '<text class="id-v5" x="48" y="57" text-anchor="middle" fill="' + accentColor + '" ' +
        'font-family="system-ui,sans-serif" font-size="14" font-weight="900" letter-spacing="0.5" ' +
        'style="opacity:0"/>' +
    '</svg>';

  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  const bgRect = overlay.querySelector('.id-bg');
  const p1 = overlay.querySelector('.id-p1');
  const p2 = overlay.querySelector('.id-p2');
  const ring = overlay.querySelector('.id-ring');
  const dot = overlay.querySelector('.id-dot');
  const v5 = overlay.querySelector('.id-v5');

  /* 动画时间轴：
     0–400ms    底色方块缩放入场
     400–2000ms 绘制外层螺旋
     2000–3200ms 绘制内层曲线
     3200–3700ms 绘制中心圆环
     3700–3900ms 金点弹出
     3900–4200ms V5 文字淡入
     4200–6200ms 停留展示 2 秒
     6200ms+    淡出移除
  */
  const HOLD = 2000; // 绘制完成后停留 2 秒
  const DRAW_END = 4200;
  const FADE_DURATION = 500;
  const start = performance.now();

  function animate(now) {
    const t = now - start;

    /* 阶段 0 (0–400ms)：底色方块缩放入场 */
    if (t < 400) {
      const p = t / 400;
      bgRect.style.transform = 'scale(' + (p * p * (3 - 2 * p)).toFixed(3) + ')';
    } else if (t < 500 && !bgRect.dataset.done) {
      bgRect.style.transform = 'scale(1)';
      bgRect.dataset.done = '1';
    }

    /* 阶段 1 (400–2000ms)：绘制外层螺旋 */
    if (t >= 400 && t < 2000) {
      const p = Math.min(1, (t - 400) / 1600);
      const eased = p * p * (3 - 2 * p);
      p1.style.strokeDashoffset = (PATH1_LEN * (1 - eased)).toFixed(1);
    } else if (t >= 2000 && !p1.dataset.done) {
      p1.style.strokeDashoffset = '0';
      p1.dataset.done = '1';
    }

    /* 阶段 2 (2000–3200ms)：绘制内层曲线 */
    if (t >= 2000 && t < 3200) {
      const p = Math.min(1, (t - 2000) / 1200);
      const eased = p * p * (3 - 2 * p);
      p2.style.strokeDashoffset = (PATH2_LEN * (1 - eased)).toFixed(1);
    } else if (t >= 3200 && !p2.dataset.done) {
      p2.style.strokeDashoffset = '0';
      p2.dataset.done = '1';
    }

    /* 阶段 3 (3200–3700ms)：绘制中心圆环 */
    if (t >= 3200 && t < 3700) {
      const p = Math.min(1, (t - 3200) / 500);
      const eased = p * p * (3 - 2 * p);
      ring.style.strokeDashoffset = (RING_LEN * (1 - eased)).toFixed(1);
    } else if (t >= 3700 && !ring.dataset.done) {
      ring.style.strokeDashoffset = '0';
      ring.dataset.done = '1';
    }

    /* 阶段 4 (3700–3900ms)：金点弹出 */
    if (t >= 3700 && t < 3900) {
      const p = Math.min(1, (t - 3700) / 200);
      const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      dot.style.opacity = eased.toFixed(2);
      dot.style.transform = 'scale(' + eased.toFixed(3) + ')';
    } else if (t >= 3900 && !dot.dataset.done) {
      dot.style.opacity = '1';
      dot.style.transform = 'scale(1)';
      dot.dataset.done = '1';
    }

    /* 阶段 5 (3900–4200ms)：V5 文字淡入 */
    if (t >= 3900 && t < 4200) {
      const p = Math.min(1, (t - 3900) / 300);
      v5.style.opacity = p.toFixed(2);
    } else if (t >= 4200 && !v5.dataset.done) {
      v5.style.opacity = '1';
      v5.dataset.done = '1';
    }

    /* 阶段 6：停留 2 秒后淡出移除 */
    if (t >= DRAW_END + HOLD) {
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.remove(); }, FADE_DURATION);
      return;
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
