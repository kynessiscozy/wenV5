/* ============================================================
   首页 3D 品牌特效：八月星盘 · 天璇漩涡
   ------------------------------------------------------------
   纯 Canvas 手写 3D 投影，无第三方依赖。
   双臂对数螺旋星河（顺时针）+ 二十八宿外环（逆时针）
   + 轨道天体拖尾 + 中心六瓣莲花核心 + 放射光线
   只在首页（body.home）运行：进报告页即停笔并清空，
   不与阅读争性能；明暗主题各一套配色；
   prefers-reduced-motion 时只渲染静态一帧。
   ============================================================ */

export function initArmillaryAugust(cv) {
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
    R = Math.min(W, H) * 0.40;
  }
  resize();
  window.addEventListener('resize', () => { resize(); if (!raf && active) draw(tBase()); });

  /* ---------- 3D：绕轴旋转 + 透视投影 ---------- */
  const F = 900;
  function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
  function project(p) {
    const z = p[2] + F + R * 2;
    const k = F / z;
    return [CX + p[0] * k, CY + p[1] * k, p[2], k];
  }
  function polar3D(angle, radius) {
    return [Math.cos(angle) * R * radius, 0, Math.sin(angle) * R * radius];
  }

  /* ---------- 主题配色 ---------- */
  function palette() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    // 亮色底是纸白，用重墨色 + 高透明度；暗色底用暖亮金色
    return dark
      ? { far: 'rgba(180,140,80,',  near: 'rgba(255,210,140,', accent: '#d97757', glow: 'rgba(217,119,87,',
          white: 'rgba(255,250,240,', trail: 'rgba(255,220,160,', mote: 'rgba(255,200,120,' }
      : { far: 'rgba(74,64,54,',    near: 'rgba(146,106,74,',  accent: '#c96f3f', glow: 'rgba(201,111,63,',
          white: 'rgba(74,64,54,',   trail: 'rgba(146,106,74,', mote: 'rgba(120,95,70,' };
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

  /* ---------- 涌动：推演过渡时加速旋转 + 光晕增强 ---------- */
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

  /* ---------- 螺旋臂星点（预计算极坐标） ---------- */
  const SPIRAL_ARMS = 2;
  const SPIRAL_TURNS = 1.3;
  const SPIRAL_STARS_PER_ARM = 100;
  const spiralPoints = [];
  for (let arm = 0; arm < SPIRAL_ARMS; arm++) {
    for (let i = 0; i < SPIRAL_STARS_PER_ARM; i++) {
      const t = i / SPIRAL_STARS_PER_ARM;
      spiralPoints.push({
        angle: arm * (Math.PI * 2 / SPIRAL_ARMS) + t * Math.PI * 2 * SPIRAL_TURNS,
        radius: 0.15 + t * 0.85,
        size: 0.5 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.5 + Math.random() * 1.5
      });
    }
  }

  /* ---------- 轨道天体 ---------- */
  const orbitals = [
    { a: 0.75, b: 0.42, tilt: 0.30, speed: 0.35,  phase: 0,   size: 2.2, trail: [] },
    { a: 0.58, b: 0.33, tilt: -0.50, speed: -0.55, phase: 1.2, size: 1.8, trail: [] },
    { a: 0.90, b: 0.50, tilt: 0.15, speed: 0.22,  phase: 2.8, size: 1.5, trail: [] },
  ];

  /* ---------- 漂浮光尘 ---------- */
  const motes = [];
  for (let i = 0; i < 30; i++) {
    motes.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.15 - Math.random() * 0.35,
      r: 0.4 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.2
    });
  }

  /* ---------- 流星（仅暗色主题） ---------- */
  const meteors = [];
  function spawnMeteor() {
    const angle = Math.PI * 0.18 + Math.random() * Math.PI * 0.15;
    const speed = 7 + Math.random() * 5;
    meteors.push({
      x: Math.random() * W * 1.2 - W * 0.1,
      y: -40 - Math.random() * 80,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.005 + Math.random() * 0.004,
      len: 60 + Math.random() * 100,
      width: 1.2 + Math.random() * 1.2
    });
  }
  let meteorTimer = 0;

  /* ---------- 外环参数 ---------- */
  const RING_R = 0.95;
  const RING_TILT = 0.45;
  const RING_SEGMENTS = 72;
  const RING_DOTS = 28;

  function draw(t) {
    const dt = lastT === null ? 0.016 : Math.min(0.05, t - lastT);
    lastT = t;
    mx += (tx - mx) * 0.04;
    my += (ty - my) * 0.04;
    const P = palette();
    const sg = surgeState(t);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (!reduced) gAngle += dt * 0.10 * sg.mult;
    ctx.clearRect(0, 0, W, H);

    /* 全局姿态：缓慢自转 + 视差倾角 */
    const gY = reduced ? 0.6 : gAngle + mx * 0.30;
    const gX = -0.22 + my * 0.25;

    /* ===== 1. 漂浮光尘 ===== */
    if (!reduced) {
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy; m.phase += dt * m.speed;
        if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
        if (m.x < -10) m.x = W + 10;
        if (m.x > W + 10) m.x = -10;
        const alpha = 0.10 + 0.18 * Math.abs(Math.sin(m.phase));
        ctx.fillStyle = P.mote + alpha.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = P.mote + (alpha * 0.15).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    /* ===== 2. 螺旋臂（顺时针旋转） ===== */
    const spiralRot = reduced ? 0.8 : gAngle * 1.2 * sg.mult;
    const spiralTilt = 0.35;
    const spStars = [];
    for (const sp of spiralPoints) {
      const ang = sp.angle + spiralRot;
      let p = polar3D(ang, sp.radius);
      p = rotX(p, spiralTilt);
      p = rotY(p, gY);
      p = rotX(p, gX);
      const q = project(p);
      const tw = reduced ? 0.7 : (0.4 + 0.6 * Math.abs(Math.sin(t * sp.twinkle + sp.phase)));
      spStars.push({ x: q[0], y: q[1], z: p[2], size: sp.size * tw });
    }
    spStars.sort((a, b) => a.z - b.z);
    for (const s of spStars) {
      const depth = (s.z + R) / (2 * R);
      const r = s.size * (0.5 + depth * 0.8);
      ctx.fillStyle = (depth > 0.45 ? P.near : P.far) + (0.06 + depth * 0.10).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, r * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = (depth > 0.45 ? P.near : P.far) + (0.25 + depth * 0.55).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
    }

    /* ===== 3. 二十八宿外环（逆时针旋转） ===== */
    const ringRot = reduced ? -0.5 : -gAngle * 0.55 * sg.mult;
    /* 环线段 */
    const ringSegs = [];
    for (let i = 0; i < RING_SEGMENTS; i++) {
      const a1 = i / RING_SEGMENTS * Math.PI * 2;
      const a2 = (i + 1) / RING_SEGMENTS * Math.PI * 2;
      let p1 = polar3D(a1, RING_R);
      let p2 = polar3D(a2, RING_R);
      p1 = rotX(p1, RING_TILT); p1 = rotY(p1, ringRot); p1 = rotX(p1, gX * 0.5);
      p2 = rotX(p2, RING_TILT); p2 = rotY(p2, ringRot); p2 = rotX(p2, gX * 0.5);
      const q1 = project(p1), q2 = project(p2);
      ringSegs.push({ q1, q2, z: (p1[2] + p2[2]) / 2 });
    }
    ringSegs.sort((a, b) => a.z - b.z);
    for (const s of ringSegs) {
      const depth = (s.z + R) / (2 * R);
      const alpha = 0.06 + depth * 0.22;
      ctx.strokeStyle = (depth > 0.5 ? P.near : P.far) + alpha.toFixed(3) + ')';
      ctx.lineWidth = 0.6 + depth * 0.6;
      ctx.beginPath(); ctx.moveTo(s.q1[0], s.q1[1]); ctx.lineTo(s.q2[0], s.q2[1]); ctx.stroke();
    }
    /* 二十八宿星点 + 刻度 */
    const ringDots = [];
    for (let i = 0; i < RING_DOTS; i++) {
      const a = i / RING_DOTS * Math.PI * 2 + ringRot;
      let p = polar3D(a, RING_R);
      p = rotX(p, RING_TILT); p = rotY(p, ringRot); p = rotX(p, gX * 0.5);
      let pIn = polar3D(a, RING_R * 0.92);
      pIn = rotX(pIn, RING_TILT); pIn = rotY(pIn, ringRot); pIn = rotX(pIn, gX * 0.5);
      const q = project(p), qIn = project(pIn);
      ringDots.push({ q, qIn, z: p[2] });
    }
    ringDots.sort((a, b) => a.z - b.z);
    for (const d of ringDots) {
      const depth = (d.z + R) / (2 * R);
      const r = 1.2 + depth * 2.2;
      /* 刻度短线 */
      ctx.strokeStyle = (depth > 0.5 ? P.near : P.far) + (0.12 + depth * 0.25).toFixed(3) + ')';
      ctx.lineWidth = 0.8 + depth * 0.5;
      ctx.beginPath(); ctx.moveTo(d.qIn[0], d.qIn[1]); ctx.lineTo(d.q[0], d.q[1]); ctx.stroke();
      /* 光晕 */
      ctx.fillStyle = P.near + (0.06 + depth * 0.10).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(d.q[0], d.q[1], r * 2.5, 0, Math.PI * 2); ctx.fill();
      /* 核心 */
      ctx.fillStyle = (depth > 0.5 ? P.near : P.far) + (0.25 + depth * 0.55).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(d.q[0], d.q[1], r, 0, Math.PI * 2); ctx.fill();
    }

    /* ===== 4. 轨道天体 ===== */
    for (const orb of orbitals) {
      if (!reduced) orb.phase += dt * orb.speed * sg.mult;
      const ex = Math.cos(orb.phase) * R * orb.a;
      const ez = Math.sin(orb.phase) * R * orb.b;
      let p = [ex, 0, ez];
      p = rotX(p, orb.tilt); p = rotY(p, gY); p = rotX(p, gX);
      const q = project(p);
      if (!reduced) {
        orb.trail.push({ x: q[0], y: q[1], z: p[2] });
        if (orb.trail.length > 35) orb.trail.shift();
      }
      /* 轨迹 */
      for (let i = 0; i < orb.trail.length - 1; i++) {
        const tr = orb.trail[i], trN = orb.trail[i + 1];
        const a = (i / orb.trail.length) * 0.45;
        ctx.strokeStyle = P.trail + a.toFixed(3) + ')';
        ctx.lineWidth = (i / orb.trail.length) * orb.size * 0.7;
        ctx.beginPath(); ctx.moveTo(tr.x, tr.y); ctx.lineTo(trN.x, trN.y); ctx.stroke();
      }
      /* 天体 */
      const depth = (p[2] + R) / (2 * R);
      ctx.fillStyle = P.white + (0.05 + depth * 0.08).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(q[0], q[1], orb.size * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.white + (0.50 + depth * 0.40).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(q[0], q[1], orb.size * (0.7 + depth * 0.4), 0, Math.PI * 2); ctx.fill();
    }

    /* ===== 5. 中心光晕 ===== */
    const pulse = reduced ? 1 : (0.85 + 0.15 * Math.sin(t * 1.4));
    const gs = R * 0.50 * pulse * (1 + 0.4 * sg.glow);
    const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, gs);
    const gBoost = Math.min(0.9, 0.38 * (1 + 0.8 * sg.glow));
    g.addColorStop(0, P.glow + gBoost.toFixed(3) + ')');
    g.addColorStop(0.4, P.glow + (gBoost * 0.3).toFixed(3) + ')');
    g.addColorStop(1, P.glow + '0)');
    ctx.fillStyle = g; ctx.fillRect(CX - gs, CY - gs, gs * 2, gs * 2);

    /* ===== 6. 放射光线（8 道，缓慢旋转） ===== */
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(reduced ? 0.3 : t * 0.08);
    const rayCount = 8;
    const rayLen = R * 0.35 * pulse * (1 + 0.3 * sg.glow);
    for (let i = 0; i < rayCount; i++) {
      const ang = i * (Math.PI * 2 / rayCount);
      const gx = Math.cos(ang), gy = Math.sin(ang);
      const rg = ctx.createLinearGradient(0, 0, gx * rayLen, gy * rayLen);
      const rayAlpha = 0.22 + 0.18 * sg.glow;
      rg.addColorStop(0, P.glow + rayAlpha.toFixed(3) + ')');
      rg.addColorStop(0.5, P.glow + (rayAlpha * 0.3).toFixed(3) + ')');
      rg.addColorStop(1, P.glow + '0)');
      ctx.strokeStyle = rg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx * R * 0.05, gy * R * 0.05);
      ctx.lineTo(gx * rayLen, gy * rayLen);
      ctx.stroke();
    }
    ctx.restore();

    /* ===== 7. 六瓣莲花核心 ===== */
    const lotusR = R * (reduced ? 0.15 : 0.14 + 0.008 * Math.sin(t * 1.4));
    ctx.save();
    ctx.translate(CX, CY);
    /* 外层花瓣（缓慢逆时针） */
    ctx.rotate(reduced ? -0.2 : -t * 0.15);
    const petals = 6;
    for (let i = 0; i < petals; i++) {
      const ang = i * (Math.PI * 2 / petals);
      ctx.save();
      ctx.rotate(ang);
      const pg = ctx.createLinearGradient(0, 0, 0, -lotusR);
      pg.addColorStop(0, P.accent);
      pg.addColorStop(0.6, P.glow + '0.7)');
      pg.addColorStop(1, P.near + '0.15)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(lotusR * 0.35, -lotusR * 0.5, 0, -lotusR);
      ctx.quadraticCurveTo(-lotusR * 0.35, -lotusR * 0.5, 0, 0);
      ctx.fill();
      ctx.strokeStyle = P.near + '0.3)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
    /* 内层花瓣（顺时针，偏移半角） */
    ctx.rotate(reduced ? 0.4 : t * 0.30);
    const lotusR2 = lotusR * 0.62;
    for (let i = 0; i < petals; i++) {
      const ang = i * (Math.PI * 2 / petals) + Math.PI / petals;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = P.near + '0.55)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(lotusR2 * 0.3, -lotusR2 * 0.5, 0, -lotusR2);
      ctx.quadraticCurveTo(-lotusR2 * 0.3, -lotusR2 * 0.5, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    /* 中心光球 */
    ctx.save();
    ctx.translate(CX, CY);
    const coreR = lotusR * 0.32 * pulse;
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 2);
    cg.addColorStop(0, 'rgba(255,250,235,0.95)');
    cg.addColorStop(0.3, isDark ? 'rgba(255,220,160,0.7)' : 'rgba(217,119,87,0.6)');
    cg.addColorStop(1, 'rgba(217,119,87,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, coreR * 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,250,0.9)';
    ctx.beginPath(); ctx.arc(0, 0, coreR * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* ===== 8. 流星（仅暗色主题，偶尔出现） ===== */
    if (isDark && !reduced) {
      meteorTimer += dt;
      if (meteorTimer > 2.5 + Math.random() * 3) {
        meteorTimer = 0;
        spawnMeteor();
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx; m.y += m.vy; m.life -= m.decay;
        if (m.life <= 0 || m.x > W + 200 || m.y > H + 200) {
          meteors.splice(i, 1);
          continue;
        }
        const tailX = m.x - m.vx * m.len / 10;
        const tailY = m.y - m.vy * m.len / 10;
        const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        grad.addColorStop(0, 'rgba(255,240,210,' + m.life.toFixed(3) + ')');
        grad.addColorStop(0.4, 'rgba(255,240,210,' + (m.life * 0.4).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = m.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,240,210,' + m.life.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.width * 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,210,' + (m.life * 0.15).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.width * 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
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

  // 主题切换时立即刷一帧
  const themeObs = new MutationObserver(() => { if (active) draw(tBase()); });
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return { start, stop, surge, center: () => ({ x: CX, y: CY }) };
}
