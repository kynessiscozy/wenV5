/* ============================================================
   首页 3D 品牌特效：浑天仪式三重星环 + 中心 ✦ 品牌星
   ------------------------------------------------------------
   纯 Canvas 手写 3D 投影，无第三方依赖。
   只在首页（body.home）运行：进报告页即停笔并清空，
   不与阅读争性能；明暗主题各一套配色；
   prefers-reduced-motion 时只渲染静态一帧。
   ============================================================ */

export function initArmillary(cv) {
  const ctx = cv.getContext && cv.getContext('2d');
  if (!ctx) return { start() {}, stop() {}, surge() {}, center: () => ({ x: 0, y: 0 }) };

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, CX = 0, CY = 0, R = 0;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2; CY = H * 0.44;
    R = Math.min(W, H) * 0.42;
  }
  resize();
  window.addEventListener('resize', () => { resize(); if (!raf && active) draw(tBase()); });

  /* ---------- 3D：绕轴旋转 + 透视投影 ---------- */
  const F = 900;
  function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
  function rotZ(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }
  function project(p) {
    const z = p[2] + F + R * 2;
    const k = F / z;
    return [CX + p[0] * k, CY + p[1] * k, p[2], k];
  }

  /* 三重星环：取向、转速、半径、星点、线宽 */
  const rings = [
    { ax: 0.32, az: 0.16, spin: 0.10, r: 1.00, dots: 26, w: 1.3 },
    { ax: 1.25, az: -0.30, spin: -0.16, r: 0.80, dots: 20, w: 1.1 },
    { ax: -0.85, az: 0.62, spin: 0.22, r: 0.62, dots: 16, w: 1.0 },
  ];

  function palette() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    // 亮色底是纸白，环必须用重墨色 + 高透明度才看得见；暗色底用暖亮色
    return dark
      ? { far: 'rgba(200,185,168,', near: 'rgba(240,205,178,', accent: '#d97757', glow: 'rgba(217,119,87,' }
      : { far: 'rgba(74,64,54,', near: 'rgba(146,106,74,', accent: '#c96f3f', glow: 'rgba(201,111,63,' };
  }

  /* 鼠标视差（缓动跟随） */
  let mx = 0, my = 0, tx = 0, ty = 0;
  function onMove(e) {
    tx = (e.clientX / W - 0.5) * 2;
    ty = (e.clientY / H - 0.5) * 2;
  }
  window.addEventListener('pointermove', onMove, { passive: true });

  const t0 = performance.now() / 1000;
  const tBase = () => performance.now() / 1000 - t0;

  /* ---------- 涌动：推演过渡时加速旋转 + 光晕增强 ----------
     用角速度积分而不是时间直乘，加速/减速全程角度连续不跳变 */
  let surgeT0 = -1, surgeDur = 0;
  let gAngle = 0, lastT = null;
  function surge(ms) {
    if (reduced) return;
    surgeT0 = tBase();
    surgeDur = ms / 1000;
    if (active && !raf) raf = requestAnimationFrame(frame);
  }
  function surgeState(t) {
    if (surgeDur <= 0 || surgeT0 < 0) return { mult: 1, glow: 0 };
    const p = (t - surgeT0) / surgeDur;
    if (p >= 1) { surgeDur = 0; return { mult: 1, glow: 0 }; }
    const e = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
    return { mult: 1 + 5.5 * e, glow: e };
  }

  function draw(t) {
    const dt = lastT === null ? 0.016 : Math.min(0.05, t - lastT);
    lastT = t;
    mx += (tx - mx) * 0.04;
    my += (ty - my) * 0.04;
    const P = palette();
    const sg = surgeState(t);
    if (!reduced) gAngle += dt * 0.12 * sg.mult;
    ctx.clearRect(0, 0, W, H);

    /* 全局姿态：缓慢自转 + 视差倾角 */
    const gY = reduced ? 0.6 : gAngle + mx * 0.35;
    const gX = -0.18 + my * 0.28;

    /* 收集线段与星点，按深度排序统一绘制 */
    const segs = [], dots = [];
    for (const ring of rings) {
      const n = 72;
      const spin = reduced ? 0.8 : gAngle * (ring.spin / 0.12);
      for (let i = 0; i < n; i++) {
        const a1 = i / n * Math.PI * 2, a2 = (i + 1) / n * Math.PI * 2;
        let p1 = [Math.cos(a1) * R * ring.r, 0, Math.sin(a1) * R * ring.r];
        let p2 = [Math.cos(a2) * R * ring.r, 0, Math.sin(a2) * R * ring.r];
        p1 = rotY(rotX(rotZ(p1, ring.az), ring.ax), gY + spin); p1 = rotX(p1, gX);
        p2 = rotY(rotX(rotZ(p2, ring.az), ring.ax), gY + spin); p2 = rotX(p2, gX);
        const q1 = project(p1), q2 = project(p2);
        segs.push({ q1, q2, z: (p1[2] + p2[2]) / 2, w: ring.w * ((q1[3] + q2[3]) / 2) });
      }
      for (let i = 0; i < ring.dots; i++) {
        const a = i / ring.dots * Math.PI * 2 + (reduced ? 0 : spin * 1.4);
        let p = [Math.cos(a) * R * ring.r, 0, Math.sin(a) * R * ring.r];
        p = rotY(rotX(rotZ(p, ring.az), ring.ax), gY + (reduced ? 0.8 : spin)); p = rotX(p, gX);
        const q = project(p);
        dots.push({ x: q[0], y: q[1], z: p[2], k: q[3] });
      }
    }
    segs.sort((a, b) => a.z - b.z);
    for (const s of segs) {
      const depth = (s.z + R) / (2 * R);
      const alpha = 0.16 + depth * 0.62;
      ctx.strokeStyle = (depth > 0.5 ? P.near : P.far) + alpha.toFixed(3) + ')';
      ctx.lineWidth = Math.max(0.5, s.w * (0.6 + depth * 0.9));
      ctx.beginPath(); ctx.moveTo(s.q1[0], s.q1[1]); ctx.lineTo(s.q2[0], s.q2[1]); ctx.stroke();
    }
    dots.sort((a, b) => a.z - b.z);
    for (const d of dots) {
      const depth = (d.z + R) / (2 * R);
      ctx.fillStyle = P.near + (0.30 + depth * 0.6).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(d.x, d.y, 0.9 + depth * 2.6, 0, Math.PI * 2); ctx.fill();
    }

    /* 中心 ✦ 品牌星：呼吸光晕 + 四芒星（涌动时光晕放大增亮） */
    const pulse = reduced ? 1 : (0.85 + 0.15 * Math.sin(t * 1.6));
    const gs = R * 0.62 * pulse * (1 + 0.4 * sg.glow);
    const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, gs);
    const gBoost = Math.min(0.9, 0.34 * (1 + 0.8 * sg.glow));
    g.addColorStop(0, P.glow + gBoost.toFixed(3) + ')');
    g.addColorStop(0.5, P.glow + (gBoost * 0.3).toFixed(3) + ')');
    g.addColorStop(1, P.glow + '0)');
    ctx.fillStyle = g; ctx.fillRect(CX - gs, CY - gs, gs * 2, gs * 2);

    const sr = R * (reduced ? 0.17 : 0.16 + 0.012 * Math.sin(t * 1.6));
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(reduced ? 0 : t * 0.25);
    ctx.fillStyle = P.accent;
    ctx.shadowColor = P.glow + '0.9)';
    ctx.shadowBlur = 18 * pulse;
    ctx.beginPath();
    const K = 0.24;
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4 - Math.PI / 2;
      const rr = i % 2 === 0 ? sr : sr * K;
      const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, sr * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ---------- 生命周期 ---------- */
  let raf = 0, active = false, running = true;

  function frame() {
    raf = 0;
    if (!active || !running) return;
    draw(tBase());
    if (!reduced) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (active) return;
    active = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (!active) return;
    active = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    ctx.clearRect(0, 0, W, H);
  }
  function onVis() {
    running = !document.hidden;
    if (active) {
      if (running && !raf) raf = requestAnimationFrame(frame);
      else if (!running && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
  }
  document.addEventListener('visibilitychange', onVis);

  // 主题切换时立即刷一帧（减少动态模式下尤其需要）
  const themeObs = new MutationObserver(() => { if (active) draw(tBase()); });
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return { start, stop, surge, center: () => ({ x: CX, y: CY }) };
}
