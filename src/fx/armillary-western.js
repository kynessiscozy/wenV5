/* ============================================================
   首页 3D 品牌特效 · 西方星相天象仪与黄道星盘庆典版 (Pure Vector / SVG 架构)
   (Celebration 3D Western Astrolabe & Zodiac Celestial Sphere)
   ------------------------------------------------------------
   纯 Canvas 手写 3D 投影与纯矢量 SVG 路径绘制，零 Emoji 字体依赖。
   庆祝「西方星相」板块重磅上线！
   
   【核心视觉架构】：
   1. 黄道十二宫 3D 倾斜光环 (23.44° Ecliptic Ring)
      - 12 星座纯矢量路径符号 (♈♉♊♋♌♍♎♏♐♑♒♓) 与 360° 精密天球刻度
      - 12 星座所属微型恒星连线星宿群 (Constellation Star Clusters)
      - 四象元素（火/土/风/水）调和能量色谱
   2. 十大行星天体 (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)
      - 3D 倾斜开普勒轨道、离子光尾 (Comet Trails)
      - 行星纯矢量符号与球形光影渐变
      - 土星 3D 倾斜星环系统 (Saturn's 3D Rings)
      - 木星 4 颗伽利略卫星微轨 (Jupiter's Galilean Moons)
   3. 神圣几何相位能量网络 (Sacred Geometric Aspects)
      - 三分相 (Trine 120°)、六分相 (Sextile 60°)、四分相 (Square 90°)、对分相 (Opposition 180°)
      - 动态大三角 (Grand Trine) 神圣几何光幕与能量脉冲
   4. 多重浑天经纬圈 (Armillary Celestial Meridian, Equator, Colures & Horizon)
   5. 多层透雕天象仪核心 (Astrolabe Rete, 12-pointed Sun Core, Radiant Corona)
   6. 庆典超新星光爆与星尘流 (Supernova Shockwave, Celebratory Stardust, Meteors)
   7. 极致平滑鼠标/触控视差 + 移动端陀螺仪 (Gyroscope) 倾斜联动
   8. Claude 纸白/暗夜自适应双主题、prefers-reduced-motion 无障碍降级
   ============================================================ */

/* ---------- 十二星座纯矢量路径绘制器 (Zero Emoji / Pure Vector SVG Paths) ---------- */
function drawZodiacVector(ctx, key, x, y, scale, strokeColor, alpha, glowColor, glowBlur) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = Math.max(1.1, 1.3 / scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (glowBlur > 0 && glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
  }

  switch (key) {
    case 'aries': // ♈ 白羊
      ctx.beginPath();
      ctx.moveTo(0, 6.5);
      ctx.lineTo(0, -1);
      ctx.bezierCurveTo(-2, -5.5, -6.5, -6.5, -6.5, -3.5);
      ctx.bezierCurveTo(-6.5, -1, -4, 1, -1.5, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.bezierCurveTo(2, -5.5, 6.5, -6.5, 6.5, -3.5);
      ctx.bezierCurveTo(6.5, -1, 4, 1, 1.5, 0);
      ctx.stroke();
      break;

    case 'taurus': // ♉ 金牛
      ctx.beginPath();
      ctx.arc(0, 2.2, 4.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -2.6, 5.2, Math.PI * 0.16, Math.PI * 0.84, true);
      ctx.stroke();
      break;

    case 'gemini': // ♊ 双子
      ctx.beginPath();
      ctx.moveTo(-6.5, -6); ctx.quadraticCurveTo(0, -4.5, 6.5, -6);
      ctx.moveTo(-6.5, 6);  ctx.quadraticCurveTo(0, 4.5, 6.5, 6);
      ctx.moveTo(-2.8, -5.2); ctx.lineTo(-2.8, 5.2);
      ctx.moveTo(2.8, -5.2);  ctx.lineTo(2.8, 5.2);
      ctx.stroke();
      break;

    case 'cancer': // ♋ 巨蟹
      ctx.beginPath();
      ctx.arc(-3, -3, 2.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3, -5.4);
      ctx.bezierCurveTo(1.5, -7, 6.5, -5, 6, -0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3, 3, 2.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, 5.4);
      ctx.bezierCurveTo(-1.5, 7, -6.5, 5, -6, 0.8);
      ctx.stroke();
      break;

    case 'leo': // ♌ 狮子
      ctx.beginPath();
      ctx.arc(-3.8, -1.8, 2.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-1.8, -2.8);
      ctx.bezierCurveTo(0, -7, 4.5, -6, 3.5, -0.5);
      ctx.bezierCurveTo(2.5, 4.5, 6, 6.5, 7.5, 4);
      ctx.stroke();
      break;

    case 'virgo': // ♍ 处女
      ctx.beginPath();
      ctx.moveTo(-6.5, 5.5); ctx.lineTo(-6.5, -3); ctx.quadraticCurveTo(-6.5, -6, -3.8, -6); ctx.quadraticCurveTo(-1.5, -6, -1.5, -3); ctx.lineTo(-1.5, 5.5);
      ctx.moveTo(-1.5, -3); ctx.quadraticCurveTo(-1.5, -6, 1.5, -6); ctx.quadraticCurveTo(3.8, -6, 3.8, -3); ctx.lineTo(3.8, 4.5);
      ctx.bezierCurveTo(3.8, 7.5, 7.5, 7, 7, 1.5);
      ctx.bezierCurveTo(6.5, -1.2, 3.5, 2, 6.5, 6.5);
      ctx.stroke();
      break;

    case 'libra': // ♎ 天秤
      ctx.beginPath();
      ctx.moveTo(-6.5, 5.5); ctx.lineTo(6.5, 5.5);
      ctx.moveTo(-6.5, 0.5); ctx.lineTo(-2.8, 0.5);
      ctx.arc(0, 0.5, 3.2, Math.PI, 0, false);
      ctx.lineTo(6.5, 0.5);
      ctx.stroke();
      break;

    case 'scorpio': // ♏ 天蝎
      ctx.beginPath();
      ctx.moveTo(-6.5, 5.5); ctx.lineTo(-6.5, -3); ctx.quadraticCurveTo(-6.5, -6, -3.8, -6); ctx.quadraticCurveTo(-1.5, -6, -1.5, -3); ctx.lineTo(-1.5, 5.5);
      ctx.moveTo(-1.5, -3); ctx.quadraticCurveTo(-1.5, -6, 1.5, -6); ctx.quadraticCurveTo(3.8, -6, 3.8, -3); ctx.lineTo(3.8, 3);
      ctx.quadraticCurveTo(3.8, 6.5, 7.5, 4);
      ctx.moveTo(5.5, 3.5); ctx.lineTo(8, 3.5); ctx.lineTo(7.5, 6);
      ctx.stroke();
      break;

    case 'sagittarius': // ♐ 射手
      ctx.beginPath();
      ctx.moveTo(-6, 6); ctx.lineTo(6, -6);
      ctx.moveTo(1.5, -6); ctx.lineTo(6, -6); ctx.lineTo(6, -1.5);
      ctx.moveTo(-3, 1.5); ctx.lineTo(1.5, 6);
      ctx.stroke();
      break;

    case 'capricorn': // ♑ 摩羯
      ctx.beginPath();
      ctx.moveTo(-5.5, 5); ctx.lineTo(-5.5, -3); ctx.quadraticCurveTo(-5.5, -6, -2.5, -6); ctx.quadraticCurveTo(0, -6, 0, -2); ctx.lineTo(0, 4);
      ctx.bezierCurveTo(0, 7.5, 4.5, 7.5, 5, 4);
      ctx.bezierCurveTo(5.5, 1, 2, 1, 3.5, 5.5);
      ctx.stroke();
      break;

    case 'aquarius': // ♒ 水瓶
      ctx.beginPath();
      ctx.moveTo(-6.5, -3); ctx.lineTo(-4.2, -5.2); ctx.lineTo(-1.8, -3); ctx.lineTo(0.5, -5.2); ctx.lineTo(2.8, -3); ctx.lineTo(5.2, -5.2); ctx.lineTo(6.5, -4);
      ctx.moveTo(-6.5, 3);  ctx.lineTo(-4.2, 0.8);  ctx.lineTo(-1.8, 3);  ctx.lineTo(0.5, 0.8);  ctx.lineTo(2.8, 3);  ctx.lineTo(5.2, 0.8);  ctx.lineTo(6.5, 2);
      ctx.stroke();
      break;

    case 'pisces': // ♓ 双鱼
      ctx.beginPath();
      ctx.arc(-5.5, 0, 6.5, -Math.PI * 0.35, Math.PI * 0.35, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(5.5, 0, 6.5, Math.PI * 0.65, Math.PI * 1.35, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

/* ---------- 行星纯矢量符号绘制器 (Zero Emoji / Pure Vector SVG Paths) ---------- */
function drawPlanetVector(ctx, key, x, y, scale, color, alpha, strokeWidth) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth || (1.2 / scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (key) {
    case 'sun': // ☉ 太阳
      ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
      break;

    case 'moon': // ☽ 月亮
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, -Math.PI * 0.45, Math.PI * 0.45, false);
      ctx.quadraticCurveTo(2, 0, Math.cos(-Math.PI * 0.45) * 5.5, Math.sin(-Math.PI * 0.45) * 5.5);
      ctx.stroke();
      break;

    case 'mercury': // ☿ 水星
      ctx.beginPath(); ctx.arc(0, -4.5, 2.8, Math.PI * 0.1, Math.PI * 0.9, false); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 3.2); ctx.lineTo(0, 7.2); ctx.moveTo(-2.2, 5.2); ctx.lineTo(2.2, 5.2); ctx.stroke();
      break;

    case 'venus': // ♀ 金星
      ctx.beginPath(); ctx.arc(0, -2.5, 3.8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 1.3); ctx.lineTo(0, 7.2); ctx.moveTo(-2.2, 4.5); ctx.lineTo(2.2, 4.5); ctx.stroke();
      break;

    case 'mars': // ♂ 火星
      ctx.beginPath(); ctx.arc(-1.8, 1.8, 3.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1.0, -1.0); ctx.lineTo(6.0, -6.0); ctx.moveTo(2.2, -6.0); ctx.lineTo(6.0, -6.0); ctx.lineTo(6.0, -2.2); ctx.stroke();
      break;

    case 'jupiter': // ♃ 木星
      ctx.beginPath();
      ctx.moveTo(-5.0, -3.2); ctx.quadraticCurveTo(-1.5, -6.0, -1.5, 5.0);
      ctx.moveTo(-4.0, 1.0); ctx.lineTo(5.0, 1.0);
      ctx.moveTo(2.2, -1.5); ctx.lineTo(2.2, 6.0);
      ctx.stroke();
      break;

    case 'saturn': // ♄ 土星
      ctx.beginPath();
      ctx.moveTo(-1.8, -6.0); ctx.lineTo(-1.8, 1.8); ctx.moveTo(-4.0, -3.8); ctx.lineTo(0.5, -3.8);
      ctx.moveTo(-1.8, 0); ctx.quadraticCurveTo(2.2, 1.2, 2.2, 4.5); ctx.quadraticCurveTo(2.2, 7.0, 0.5, 6.5);
      ctx.stroke();
      break;

    case 'uranus': // ♅ 天王星
      ctx.beginPath(); ctx.arc(0, 3.0, 2.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0.4); ctx.lineTo(0, -5.5);
      ctx.moveTo(-4.5, -5.5); ctx.lineTo(-4.5, -0.8); ctx.moveTo(4.5, -5.5); ctx.lineTo(4.5, -0.8);
      ctx.moveTo(-4.5, -3.2); ctx.lineTo(4.5, -3.2); ctx.stroke();
      break;

    case 'neptune': // ♆ 海王星
      ctx.beginPath(); ctx.moveTo(0, -6.0); ctx.lineTo(0, 6.5); ctx.moveTo(-2.2, 4.2); ctx.lineTo(2.2, 4.2);
      ctx.moveTo(-4.2, -3.2); ctx.quadraticCurveTo(-4.2, 1.0, 0, 1.2); ctx.quadraticCurveTo(4.2, 1.0, 4.2, -3.2); ctx.stroke();
      break;

    case 'pluto': // ♇ 冥王星
      ctx.beginPath(); ctx.arc(0, -2.2, 2.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 4.2, Math.PI * 0.2, Math.PI * 0.8, false); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 1.8); ctx.lineTo(0, 6.5); ctx.moveTo(-2.2, 4.2); ctx.lineTo(2.2, 4.2); ctx.stroke();
      break;
  }
  ctx.restore();
}

export function initArmillaryWestern(cv, initialMode = 'western') {
  const ctx = cv.getContext && cv.getContext('2d');
  if (!ctx) {
    return {
      start() {}, stop() {}, surge() {}, center: () => ({ x: 0, y: 0 }),
      setMode() {}, getMode: () => 'western'
    };
  }

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, CX = 0, CY = 0, R = 0;
  let currentMode = initialMode || 'western'; // 'western' | 'fusion' | 'eastern'

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W * DPR;
    cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2;
    CY = H * 0.44;
    R = Math.min(W, H) * (W < 480 ? 0.38 : 0.42);
  }
  resize();
  window.addEventListener('resize', () => {
    resize();
    if (!raf && active) draw(tBase());
  });

  /* ---------- 3D 数学引擎：旋转与透视投影 ---------- */
  const F = 920; // 焦距
  function rotX(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  }
  function rotY(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  }
  function rotZ(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
  }

  function project(p) {
    const z = p[2] + F + R * 2.2;
    const k = F / z;
    return [CX + p[0] * k, CY + p[1] * k, p[2], k];
  }

  function polar3D(angle, radius, yOffset = 0) {
    return [Math.cos(angle) * R * radius, yOffset * R, Math.sin(angle) * R * radius];
  }

  /* ---------- 主题色彩系统（Claude 纸质与暗夜星空） ---------- */
  function palette() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) {
      return {
        isDark: true,
        ringFar: 'rgba(180, 140, 80,',
        ringNear: 'rgba(255, 215, 140,',
        ecliptic: 'rgba(255, 200, 120,',
        accent: '#d97757',
        accentGlow: 'rgba(217, 119, 87,',
        gold: 'rgba(255, 215, 110,',
        cyan: 'rgba(100, 220, 240,',
        ruby: 'rgba(255, 110, 95,',
        textHi: 'rgba(255, 250, 240,',
        textDim: 'rgba(220, 190, 150,',
        stardust: 'rgba(255, 225, 160,',
        voidBg: '#121110'
      };
    }
    // 亮色纸质底
    return {
      isDark: false,
      ringFar: 'rgba(92, 75, 60,',
      ringNear: 'rgba(165, 115, 75,',
      ecliptic: 'rgba(201, 111, 63,',
      accent: '#c96f3f',
      accentGlow: 'rgba(201, 111, 63,',
      gold: 'rgba(195, 135, 45,',
      cyan: 'rgba(50, 135, 145,',
      ruby: 'rgba(195, 80, 65,',
      textHi: 'rgba(54, 44, 36,',
      textDim: 'rgba(120, 95, 75,',
      stardust: 'rgba(160, 115, 75,',
      voidBg: '#faf9f5'
    };
  }

  /* ---------- 视差与陀螺仪物理跟踪 ---------- */
  let mx = 0, my = 0, tx = 0, ty = 0;
  function onMove(e) {
    tx = (e.clientX / W - 0.5) * 2;
    ty = (e.clientY / H - 0.5) * 2;
  }
  window.addEventListener('pointermove', onMove, { passive: true });

  // 移动端陀螺仪视差
  if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma !== null && e.beta !== null) {
        tx = Math.max(-1, Math.min(1, e.gamma / 30));
        ty = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
      }
    }, { passive: true });
  }

  const t0 = performance.now() / 1000;
  const tBase = () => performance.now() / 1000 - t0;

  /* ---------- 涌动与庆典超新星光爆状态 ---------- */
  let surgeT0 = -1, surgeDur = 0;
  let gAngle = 0, lastT = null;
  const celebrationBursts = [];

  function surge(ms = 2200) {
    if (reduced) return;
    surgeT0 = tBase();
    surgeDur = ms / 1000;
    // 触发超新星扩散能量波
    spawnCelebrationShockwave();
    if (active && !raf) raf = requestAnimationFrame(frame);
  }

  function surgeState(t) {
    if (surgeDur <= 0 || surgeT0 < 0) return { mult: 1, glow: 0 };
    const p = (t - surgeT0) / surgeDur;
    if (p >= 1) { surgeDur = 0; return { mult: 1, glow: 0 }; }
    const e = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
    return { mult: 1 + 5.0 * e, glow: e };
  }

  function spawnCelebrationShockwave() {
    celebrationBursts.push({
      t0: tBase(),
      dur: 2.4,
      particles: Array.from({ length: 48 }, () => {
        const phi = Math.random() * Math.PI * 2;
        const theta = (Math.random() - 0.5) * Math.PI * 0.8;
        const speed = 0.5 + Math.random() * 0.9;
        return {
          vx: Math.cos(theta) * Math.cos(phi) * speed,
          vy: Math.sin(theta) * speed,
          vz: Math.cos(theta) * Math.sin(phi) * speed,
          size: 1.2 + Math.random() * 2.2,
          decay: 0.8 + Math.random() * 0.4
        };
      })
    });
    if (celebrationBursts.length > 3) celebrationBursts.shift();
  }

  /* 点击/轻触 Canvas 或主视觉触发庆典波动 */
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', (e) => {
      if (typeof document !== 'undefined' && !document.body.classList.contains('home')) return;
      if (!e.target.closest || !e.target.closest('button, input, select, a, .home-menu-drawer')) {
        surge(1600);
      }
    }, { passive: true });
  }

  /* ---------- 黄道十二宫恒星与星相基础数据 ---------- */
  const ZODIAC_SIGNS = [
    { key: 'aries',       name: '白羊', element: 'fire',  deg: 0,   stars: [{d:2, r:0.95}, {d:9, r:0.92}, {d:19, r:0.96}, {d:27, r:0.93}] },
    { key: 'taurus',      name: '金牛', element: 'earth', deg: 30,  stars: [{d:33, r:0.93}, {d:42, r:0.96}, {d:48, r:0.91}, {d:56, r:0.94}] },
    { key: 'gemini',      name: '双子', element: 'air',   deg: 60,  stars: [{d:64, r:0.96}, {d:70, r:0.92}, {d:80, r:0.95}, {d:88, r:0.92}] },
    { key: 'cancer',      name: '巨蟹', element: 'water', deg: 90,  stars: [{d:96, r:0.92}, {d:104, r:0.95}, {d:112, r:0.91}, {d:118, r:0.94}] },
    { key: 'leo',         name: '狮子', element: 'fire',  deg: 120, stars: [{d:124, r:0.95}, {d:132, r:0.92}, {d:140, r:0.96}, {d:148, r:0.93}] },
    { key: 'virgo',       name: '处女', element: 'earth', deg: 150, stars: [{d:155, r:0.92}, {d:164, r:0.95}, {d:172, r:0.93}, {d:178, r:0.96}] },
    { key: 'libra',       name: '天秤', element: 'air',   deg: 180, stars: [{d:185, r:0.95}, {d:193, r:0.91}, {d:202, r:0.96}, {d:208, r:0.93}] },
    { key: 'scorpio',     name: '天蝎', element: 'water', deg: 210, stars: [{d:214, r:0.96}, {d:222, r:0.93}, {d:230, r:0.91}, {d:238, r:0.95}] },
    { key: 'sagittarius', name: '射手', element: 'fire',  deg: 240, stars: [{d:245, r:0.93}, {d:254, r:0.96}, {d:262, r:0.92}, {d:268, r:0.95}] },
    { key: 'capricorn',   name: '摩羯', element: 'earth', deg: 270, stars: [{d:275, r:0.95}, {d:284, r:0.92}, {d:292, r:0.95}, {d:298, r:0.92}] },
    { key: 'aquarius',    name: '水瓶', element: 'air',   deg: 300, stars: [{d:304, r:0.93}, {d:312, r:0.96}, {d:320, r:0.92}, {d:327, r:0.95}] },
    { key: 'pisces',      name: '双鱼', element: 'water', deg: 330, stars: [{d:335, r:0.95}, {d:344, r:0.92}, {d:352, r:0.96}, {d:358, r:0.93}] },
  ];

  /* ---------- 十大行星天体天象参数 ---------- */
  const PLANETS = [
    { key: 'sun',     name: 'Sun',     r: 0.00, speed: 0.00, tilt: 0.00, size: 7.5, color: '#f59e0b', trail: [] },
    { key: 'moon',    name: 'Moon',    r: 0.32, speed: 0.95, tilt: 0.12, size: 3.2, color: '#e2e8f0', trail: [] },
    { key: 'mercury', name: 'Mercury', r: 0.44, speed: 1.40, tilt: 0.22, size: 2.2, color: '#fbbf24', trail: [] },
    { key: 'venus',   name: 'Venus',   r: 0.54, speed: 0.82, tilt:-0.15, size: 3.2, color: '#fef08a', trail: [] },
    { key: 'mars',    name: 'Mars',    r: 0.65, speed: 0.58, tilt: 0.28, size: 2.8, color: '#f87171', trail: [] },
    { key: 'jupiter', name: 'Jupiter', r: 0.77, speed: 0.36, tilt:-0.10, size: 4.4, color: '#f97316', trail: [], moons: 4 },
    { key: 'saturn',  name: 'Saturn',  r: 0.88, speed: 0.24, tilt: 0.32, size: 3.6, color: '#eab308', trail: [], hasRing: true },
    { key: 'uranus',  name: 'Uranus',  r: 0.98, speed: 0.16, tilt:-0.24, size: 2.8, color: '#38bdf8', trail: [] },
    { key: 'neptune', name: 'Neptune', r: 1.07, speed: 0.11, tilt: 0.18, size: 2.6, color: '#60a5fa', trail: [] },
    { key: 'pluto',   name: 'Pluto',   r: 1.16, speed: 0.07, tilt: 0.44, size: 1.8, color: '#c084fc', trail: [] },
  ];

  /* ---------- 漂浮星尘粒子 (3D 空间微尘) ---------- */
  const MOTES_COUNT = 36;
  const motes = [];
  for (let i = 0; i < MOTES_COUNT; i++) {
    motes.push({
      x: (Math.random() - 0.5) * 2.4,
      y: (Math.random() - 0.5) * 2.0,
      z: (Math.random() - 0.5) * 2.4,
      vx: (Math.random() - 0.5) * 0.08,
      vy: -0.05 - Math.random() * 0.10,
      vz: (Math.random() - 0.5) * 0.08,
      r: 0.6 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.8 + Math.random() * 1.5
    });
  }

  /* ---------- 东方二十八宿对数螺旋星点（用于 Fusion / Eastern 模式） ---------- */
  const SPIRAL_ARMS = 2;
  const SPIRAL_TURNS = 1.3;
  const SPIRAL_STARS_PER_ARM = 80;
  const spiralPoints = [];
  for (let arm = 0; arm < SPIRAL_ARMS; arm++) {
    for (let i = 0; i < SPIRAL_STARS_PER_ARM; i++) {
      const t = i / SPIRAL_STARS_PER_ARM;
      spiralPoints.push({
        angle: arm * (Math.PI * 2 / SPIRAL_ARMS) + t * Math.PI * 2 * SPIRAL_TURNS,
        radius: 0.18 + t * 0.82,
        size: 0.5 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.6 + Math.random() * 1.4
      });
    }
  }

  /* ---------- 流星系统 ---------- */
  const meteors = [];
  let meteorTimer = 0;
  function spawnMeteor() {
    const angle = Math.PI * 0.18 + Math.random() * Math.PI * 0.15;
    const speed = 8 + Math.random() * 6;
    meteors.push({
      x: Math.random() * W * 1.2 - W * 0.1,
      y: -40 - Math.random() * 80,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.006 + Math.random() * 0.005,
      len: 70 + Math.random() * 90,
      width: 1.2 + Math.random() * 1.4
    });
  }

  /* ---------- 模式切换与查询 ---------- */
  function setMode(mode) {
    if (['western', 'fusion', 'eastern'].includes(mode)) {
      currentMode = mode;
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem('tj_star_mode', mode); } catch (_) {}
      }
      surge(1800);
    }
  }
  function getMode() {
    return currentMode;
  }

  /* ============================================================
     核心绘制函数：每帧 3D 投影与景深统一排序
     ============================================================ */
  function draw(t) {
    const dt = lastT === null ? 0.016 : Math.min(0.05, t - lastT);
    lastT = t;
    mx += (tx - mx) * 0.045;
    my += (ty - my) * 0.045;
    const P = palette();
    const sg = surgeState(t);
    if (!reduced) gAngle += dt * 0.10 * sg.mult;

    ctx.clearRect(0, 0, W, H);

    /* 全局姿态：自转 + 视差倾角 */
    const gY = reduced ? 0.6 : gAngle + mx * 0.32;
    const gX = -0.18 + my * 0.26;

    // 绘制容器：所有可渲染元素加入 layers 数组，最后依 z-depth 深度统一绘制
    const layers = [];

    /* ===== 1. 漂浮星尘粒子 (3D Brownian Motes) ===== */
    if (!reduced) {
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.z += m.vz * dt;
        m.phase += dt * m.twinkleSpeed;
        if (m.y < -1.2) { m.y = 1.2; m.x = (Math.random() - 0.5) * 2.4; m.z = (Math.random() - 0.5) * 2.4; }
        let p = [m.x * R, m.y * R, m.z * R];
        p = rotY(p, gY * 0.4);
        p = rotX(p, gX * 0.4);
        const q = project(p);
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(m.phase));
        layers.push({
          z: p[2],
          render: () => {
            const depth = (p[2] + R) / (2 * R);
            const alpha = (0.12 + depth * 0.45) * tw;
            ctx.fillStyle = P.stardust + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(q[0], q[1], m.r * (0.6 + depth * 0.8), 0, Math.PI * 2);
            ctx.fill();
            if (depth > 0.6) {
              ctx.fillStyle = P.stardust + (alpha * 0.25).toFixed(3) + ')';
              ctx.beginPath();
              ctx.arc(q[0], q[1], m.r * 2.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      }
    }

    /* ===== 2. 浑天仪基础天球环架 (Equator, Meridian, Colure, Horizon) ===== */
    const FRAME_RINGS = [
      { name: 'Meridian', r: 1.02, rot: (p) => rotY(rotX(p, Math.PI / 2), gY), w: 1.1, alpha: 0.22, dash: false },
      { name: 'Equator',  r: 0.92, rot: (p) => rotY(p, gY), w: 0.9, alpha: 0.18, dash: true },
      { name: 'Colure',   r: 0.94, rot: (p) => rotY(rotZ(rotX(p, Math.PI / 2), Math.PI / 2), gY), w: 0.8, alpha: 0.15, dash: false },
      { name: 'Horizon',  r: 1.08, rot: (p) => rotX(rotY(p, gY * 0.3), 0.12), w: 1.2, alpha: 0.20, dash: false },
    ];

    for (const fr of FRAME_RINGS) {
      const segCount = 64;
      for (let i = 0; i < segCount; i++) {
        const a1 = (i / segCount) * Math.PI * 2;
        const a2 = ((i + 1) / segCount) * Math.PI * 2;
        let p1 = [Math.cos(a1) * R * fr.r, 0, Math.sin(a1) * R * fr.r];
        let p2 = [Math.cos(a2) * R * fr.r, 0, Math.sin(a2) * R * fr.r];
        p1 = fr.rot(p1); p1 = rotX(p1, gX);
        p2 = fr.rot(p2); p2 = rotX(p2, gX);
        const q1 = project(p1), q2 = project(p2);
        const avgZ = (p1[2] + p2[2]) / 2;
        layers.push({
          z: avgZ,
          render: () => {
            const depth = (avgZ + R) / (2 * R);
            const a = (fr.alpha * (0.3 + depth * 0.9)).toFixed(3);
            ctx.strokeStyle = (depth > 0.5 ? P.ringNear : P.ringFar) + a + ')';
            ctx.lineWidth = Math.max(0.5, fr.w * (0.6 + depth * 0.8));
            if (fr.dash) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(q1[0], q1[1]);
            ctx.lineTo(q2[0], q2[1]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }
    }

    /* ===== 3. 黄道十二宫 3D 倾斜光环 (Ecliptic Zodiac Band) =====
       黄道倾角 ~23.44° (0.409 rad) 动态叠加 */
    const ECLIPTIC_TILT = 0.409;
    const ECLIPTIC_R_OUT = 0.96;
    const ECLIPTIC_R_IN = 0.87;
    const eclipticSpin = reduced ? 0.8 : gAngle * 0.9 * sg.mult;

    // 黄道双轨环带
    const eclipticSegs = 96;
    for (let i = 0; i < eclipticSegs; i++) {
      const a1 = (i / eclipticSegs) * Math.PI * 2 + eclipticSpin;
      const a2 = ((i + 1) / eclipticSegs) * Math.PI * 2 + eclipticSpin;
      let p1 = polar3D(a1, ECLIPTIC_R_OUT);
      let p2 = polar3D(a2, ECLIPTIC_R_OUT);
      p1 = rotX(p1, ECLIPTIC_TILT); p1 = rotY(p1, gY); p1 = rotX(p1, gX);
      p2 = rotX(p2, ECLIPTIC_TILT); p2 = rotY(p2, gY); p2 = rotX(p2, gX);
      const q1 = project(p1), q2 = project(p2);
      const avgZ = (p1[2] + p2[2]) / 2;
      layers.push({
        z: avgZ,
        render: () => {
          const depth = (avgZ + R) / (2 * R);
          const alpha = (0.22 + depth * 0.65).toFixed(3);
          ctx.strokeStyle = P.ecliptic + alpha + ')';
          ctx.lineWidth = Math.max(0.8, 1.6 * (0.6 + depth * 0.9));
          ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke();
        }
      });
      // 内轨细线
      let pi1 = polar3D(a1, ECLIPTIC_R_IN);
      let pi2 = polar3D(a2, ECLIPTIC_R_IN);
      pi1 = rotX(pi1, ECLIPTIC_TILT); pi1 = rotY(pi1, gY); pi1 = rotX(pi1, gX);
      pi2 = rotX(pi2, ECLIPTIC_TILT); pi2 = rotY(pi2, gY); pi2 = rotX(pi2, gX);
      const qi1 = project(pi1), qi2 = project(pi2);
      layers.push({
        z: (pi1[2] + pi2[2]) / 2,
        render: () => {
          const depth = (pi1[2] + R) / (2 * R);
          ctx.strokeStyle = P.ringFar + (0.12 + depth * 0.35).toFixed(3) + ')';
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(qi1[0], qi1[1]); ctx.lineTo(qi2[0], qi2[1]); ctx.stroke();
        }
      });
    }

    // 黄道 12 宫分界辐条与 360° 刻度
    for (let i = 0; i < 72; i++) {
      const deg = (i / 72) * Math.PI * 2;
      const isMajor = i % 6 === 0; // 30° 宫位分界
      const isMid = i % 3 === 0;   // 15° 中分界
      const rIn = isMajor ? ECLIPTIC_R_IN * 0.98 : (isMid ? ECLIPTIC_R_OUT * 0.93 : ECLIPTIC_R_OUT * 0.96);
      let pOut = polar3D(deg + eclipticSpin, ECLIPTIC_R_OUT);
      let pIn = polar3D(deg + eclipticSpin, rIn);
      pOut = rotX(pOut, ECLIPTIC_TILT); pOut = rotY(pOut, gY); pOut = rotX(pOut, gX);
      pIn = rotX(pIn, ECLIPTIC_TILT); pIn = rotY(pIn, gY); pIn = rotX(pIn, gX);
      const qOut = project(pOut), qIn = project(pIn);
      layers.push({
        z: pOut[2],
        render: () => {
          const depth = (pOut[2] + R) / (2 * R);
          const alpha = (isMajor ? 0.35 + depth * 0.55 : 0.10 + depth * 0.30).toFixed(3);
          ctx.strokeStyle = (isMajor ? P.accent : P.ringNear) + alpha + ')';
          ctx.lineWidth = isMajor ? 1.4 : 0.7;
          ctx.beginPath(); ctx.moveTo(qIn[0], qIn[1]); ctx.lineTo(qOut[0], qOut[1]); ctx.stroke();
        }
      });
    }

    // 12 星座纯矢量 SVG 路径符号与微型恒星连线星宿群 (Pure Vector Rendering)
    for (let i = 0; i < ZODIAC_SIGNS.length; i++) {
      const sign = ZODIAC_SIGNS[i];
      const signAng = (i * 30 + 15) * (Math.PI / 180) + eclipticSpin;
      let pSign = polar3D(signAng, (ECLIPTIC_R_IN + ECLIPTIC_R_OUT) / 2);
      pSign = rotX(pSign, ECLIPTIC_TILT); pSign = rotY(pSign, gY); pSign = rotX(pSign, gX);
      const qSign = project(pSign);

      layers.push({
        z: pSign[2],
        render: () => {
          const depth = (pSign[2] + R) / (2 * R);
          if (depth < 0.15) return; // 极远端遮挡减弱
          const alpha = Math.min(1, 0.35 + depth * 0.65);
          const vecScale = (0.75 + depth * 0.45) * (qSign[3] * 1.1);
          const strokeCol = P.textHi + alpha.toFixed(3) + ')';
          const glowCol = depth > 0.55 ? P.accentGlow + (alpha * 0.8).toFixed(3) + ')' : null;
          const glowBlur = depth > 0.55 ? 8 * depth : 0;
          
          // 使用纯矢量路径绘制，杜绝各平台系统 EMOJI 字体差异
          drawZodiacVector(ctx, sign.key, qSign[0], qSign[1], vecScale, strokeCol, alpha, glowCol, glowBlur);
        }
      });

      // 星座恒星微点
      if (sign.stars && sign.stars.length) {
        const starProjected = [];
        for (const st of sign.stars) {
          const stAng = st.d * (Math.PI / 180) + eclipticSpin;
          let pSt = polar3D(stAng, st.r);
          pSt = rotX(pSt, ECLIPTIC_TILT); pSt = rotY(pSt, gY); pSt = rotX(pSt, gX);
          const qSt = project(pSt);
          starProjected.push({ q: qSt, z: pSt[2] });
          layers.push({
            z: pSt[2],
            render: () => {
              const depth = (pSt[2] + R) / (2 * R);
              const tw = 0.5 + 0.5 * Math.sin(t * 2 + st.d);
              ctx.fillStyle = P.gold + ((0.2 + depth * 0.7) * tw).toFixed(3) + ')';
              ctx.beginPath();
              ctx.arc(qSt[0], qSt[1], 1.0 + depth * 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
        // 恒星间微弱连线
        for (let j = 0; j < starProjected.length - 1; j++) {
          const s1 = starProjected[j], s2 = starProjected[j + 1];
          const avgZ = (s1.z + s2.z) / 2;
          layers.push({
            z: avgZ,
            render: () => {
              const depth = (avgZ + R) / (2 * R);
              ctx.strokeStyle = P.gold + (0.08 + depth * 0.22).toFixed(3) + ')';
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(s1.q[0], s1.q[1]);
              ctx.lineTo(s2.q[0], s2.q[1]);
              ctx.stroke();
            }
          });
        }
      }
    }

    /* ===== 4. 东方对数螺旋星河（Fusion 或 Eastern 模式） ===== */
    if (currentMode === 'fusion' || currentMode === 'eastern') {
      const spRot = reduced ? 0.8 : gAngle * 1.1 * sg.mult;
      const spTilt = 0.35;
      for (const sp of spiralPoints) {
        const ang = sp.angle + spRot;
        let p = polar3D(ang, sp.radius);
        p = rotX(p, spTilt); p = rotY(p, gY); p = rotX(p, gX);
        const q = project(p);
        const tw = reduced ? 0.7 : (0.4 + 0.6 * Math.abs(Math.sin(t * sp.twinkle + sp.phase)));
        layers.push({
          z: p[2],
          render: () => {
            const depth = (p[2] + R) / (2 * R);
            const r = sp.size * (0.5 + depth * 0.8) * tw;
            ctx.fillStyle = (depth > 0.45 ? P.ringNear : P.ringFar) + (0.15 + depth * 0.45).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill();
          }
        });
      }
    }

    /* ===== 5. 十大行星天体轨迹、实体与相位连接 ===== */
    const calculatedPlanets = [];

    for (const pl of PLANETS) {
      if (pl.r === 0) {
        // 太阳位于核心
        let pSun = [0, 0, 0];
        pSun = rotY(pSun, gY); pSun = rotX(pSun, gX);
        const qSun = project(pSun);
        calculatedPlanets.push({ pl, q: qSun, z: pSun[2], angle: 0 });
        continue;
      }

      const phase = (reduced ? 1.2 : t * pl.speed * 0.8 * sg.mult) + (pl.r * 3.7);
      const ex = Math.cos(phase) * R * pl.r;
      const ez = Math.sin(phase) * R * pl.r;
      let p = [ex, 0, ez];
      p = rotX(p, pl.tilt);
      p = rotY(p, gY);
      p = rotX(p, gX);
      const q = project(p);

      calculatedPlanets.push({ pl, q, z: p[2], angle: phase % (Math.PI * 2) });

      // 行星离子拖尾 (Comet Trail)
      if (!reduced) {
        pl.trail.push({ x: q[0], y: q[1], z: p[2] });
        const maxTrail = Math.round(20 * (pl.size / 2.5));
        if (pl.trail.length > maxTrail) pl.trail.shift();
      }

      // 渲染拖尾
      if (pl.trail.length > 1) {
        for (let j = 0; j < pl.trail.length - 1; j++) {
          const tr1 = pl.trail[j], tr2 = pl.trail[j + 1];
          const trProg = j / pl.trail.length;
          layers.push({
            z: (tr1.z + tr2.z) / 2,
            render: () => {
              const alpha = trProg * 0.45;
              ctx.strokeStyle = P.ringNear + alpha.toFixed(3) + ')';
              ctx.lineWidth = Math.max(0.4, trProg * pl.size * 0.6);
              ctx.beginPath(); ctx.moveTo(tr1.x, tr1.y); ctx.lineTo(tr2.x, tr2.y); ctx.stroke();
            }
          });
        }
      }

      // 渲染行星本体
      layers.push({
        z: p[2],
        render: () => {
          const depth = (p[2] + R) / (2 * R);
          const pr = pl.size * (0.6 + depth * 0.7);

          // 行星外光晕
          ctx.fillStyle = P.accentGlow + (0.12 + depth * 0.25).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(q[0], q[1], pr * 2.8, 0, Math.PI * 2); ctx.fill();

          // 行星球体（球形光影渐变）
          const pg = ctx.createRadialGradient(
            q[0] - pr * 0.3, q[1] - pr * 0.3, 0,
            q[0], q[1], pr
          );
          pg.addColorStop(0, P.isDark ? '#ffffff' : '#fff5eb');
          pg.addColorStop(0.4, pl.color);
          pg.addColorStop(1, P.isDark ? 'rgba(40,20,10,0.9)' : 'rgba(100,50,20,0.9)');
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.arc(q[0], q[1], pr, 0, Math.PI * 2); ctx.fill();

          // 靠近镜头时附带精致行星纯矢量印记
          if (depth > 0.55 && pl.key !== 'sun') {
            const planetGlyphColor = P.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(74,64,54,0.7)';
            drawPlanetVector(ctx, pl.key, q[0], q[1] - pr * 2.0, 0.75 * q[3], planetGlyphColor, 0.8, 0.9);
          }

          // 土星 3D 倾斜光环
          if (pl.hasRing) {
            ctx.save();
            ctx.translate(q[0], q[1]);
            ctx.rotate(0.45);
            ctx.scale(1, 0.32);
            ctx.strokeStyle = P.gold + (0.4 + depth * 0.5).toFixed(3) + ')';
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(0, 0, pr * 2.5, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = P.ringFar + (0.2 + depth * 0.3).toFixed(3) + ')';
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.arc(0, 0, pr * 2.9, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
          }

          // 木星伽利略卫星微点
          if (pl.moons) {
            for (let m = 0; m < pl.moons; m++) {
              const mAng = t * (1.8 + m * 0.7) + m * 1.5;
              const mDist = pr * (1.8 + m * 0.6);
              const mx2 = q[0] + Math.cos(mAng) * mDist;
              const my2 = q[1] + Math.sin(mAng) * mDist * 0.4;
              ctx.fillStyle = P.textHi + (0.4 + depth * 0.5).toFixed(3) + ')';
              ctx.beginPath(); ctx.arc(mx2, my2, 0.8 + depth * 0.5, 0, Math.PI * 2); ctx.fill();
            }
          }
        }
      });
    }

    /* ===== 6. 神圣几何相位能量网络 (Sacred Geometric Aspects) ===== */
    const activeAspects = [];
    for (let i = 1; i < calculatedPlanets.length; i++) {
      for (let j = i + 1; j < calculatedPlanets.length; j++) {
        const pA = calculatedPlanets[i], pB = calculatedPlanets[j];
        let diffDeg = Math.abs((pA.angle - pB.angle) * (180 / Math.PI)) % 360;
        if (diffDeg > 180) diffDeg = 360 - diffDeg;

        let aspectType = null;
        let orb = 0;
        if (Math.abs(diffDeg - 120) <= 8) { aspectType = 'trine'; orb = Math.abs(diffDeg - 120); }
        else if (Math.abs(diffDeg - 60) <= 6) { aspectType = 'sextile'; orb = Math.abs(diffDeg - 60); }
        else if (Math.abs(diffDeg - 180) <= 8) { aspectType = 'opposition'; orb = Math.abs(diffDeg - 180); }
        else if (Math.abs(diffDeg - 90) <= 7) { aspectType = 'square'; orb = Math.abs(diffDeg - 90); }

        if (aspectType) {
          activeAspects.push({ pA, pB, type: aspectType, strength: 1 - (orb / 8) });
          const avgZ = (pA.z + pB.z) / 2;
          layers.push({
            z: avgZ,
            render: () => {
              const depth = (avgZ + R) / (2 * R);
              const intensity = (1 - orb / 8) * (0.2 + depth * 0.65) * (1 + 0.5 * sg.glow);
              let strokeCol = P.gold;
              if (aspectType === 'sextile') strokeCol = P.cyan;
              if (aspectType === 'square' || aspectType === 'opposition') strokeCol = P.ruby;

              ctx.strokeStyle = strokeCol + intensity.toFixed(3) + ')';
              ctx.lineWidth = Math.max(0.6, (aspectType === 'trine' ? 1.4 : 0.9) * depth);
              ctx.setLineDash(aspectType === 'trine' ? [] : [3, 3]);
              ctx.beginPath();
              ctx.moveTo(pA.q[0], pA.q[1]);
              ctx.lineTo(pB.q[0], pB.q[1]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          });
        }
      }
    }

    // 动态大三角 (Grand Trine) 神圣几何光幕
    const trines = activeAspects.filter(a => a.type === 'trine');
    if (trines.length >= 3) {
      for (let i = 0; i < trines.length; i++) {
        for (let j = i + 1; j < trines.length; j++) {
          for (let k = j + 1; k < trines.length; k++) {
            const t1 = trines[i], t2 = trines[j], t3 = trines[k];
            const nodes = new Set([t1.pA, t1.pB, t2.pA, t2.pB, t3.pA, t3.pB]);
            if (nodes.size === 3) {
              const [nA, nB, nC] = Array.from(nodes);
              const avgZ = (nA.z + nB.z + nC.z) / 3;
              layers.push({
                z: avgZ,
                render: () => {
                  const depth = (avgZ + R) / (2 * R);
                  ctx.fillStyle = P.gold + (0.04 + depth * 0.08 + sg.glow * 0.08).toFixed(3) + ')';
                  ctx.beginPath();
                  ctx.moveTo(nA.q[0], nA.q[1]);
                  ctx.lineTo(nB.q[0], nB.q[1]);
                  ctx.lineTo(nC.q[0], nC.q[1]);
                  ctx.closePath();
                  ctx.fill();
                }
              });
            }
          }
        }
      }
    }

    /* ===== 7. 庆典超新星扩散能量光爆 (Supernova Shockwave) ===== */
    for (let b = celebrationBursts.length - 1; b >= 0; b--) {
      const burst = celebrationBursts[b];
      const prog = (t - burst.t0) / burst.dur;
      if (prog >= 1) {
        celebrationBursts.splice(b, 1);
        continue;
      }
      const easeProg = 1 - Math.pow(1 - prog, 3);
      const waveR = R * 1.35 * easeProg;
      const alpha = (1 - prog) * 0.55;

      // 3D 扩散环
      const waveSegs = 48;
      for (let i = 0; i < waveSegs; i++) {
        const a1 = (i / waveSegs) * Math.PI * 2;
        const a2 = ((i + 1) / waveSegs) * Math.PI * 2;
        let p1 = [Math.cos(a1) * waveR, 0, Math.sin(a1) * waveR];
        let p2 = [Math.cos(a2) * waveR, 0, Math.sin(a2) * waveR];
        p1 = rotY(rotX(p1, 0.35), gY); p1 = rotX(p1, gX);
        p2 = rotY(rotX(p2, 0.35), gY); p2 = rotX(p2, gX);
        const q1 = project(p1), q2 = project(p2);
        layers.push({
          z: (p1[2] + p2[2]) / 2,
          render: () => {
            ctx.strokeStyle = P.accentGlow + alpha.toFixed(3) + ')';
            ctx.lineWidth = Math.max(1, 3.0 * (1 - prog));
            ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke();
          }
        });
      }

      // 扩散星火粒子
      for (const pt of burst.particles) {
        let p = [
          pt.vx * waveR * pt.decay,
          pt.vy * waveR * pt.decay,
          pt.vz * waveR * pt.decay
        ];
        p = rotY(p, gY); p = rotX(p, gX);
        const q = project(p);
        layers.push({
          z: p[2],
          render: () => {
            ctx.fillStyle = P.gold + ((1 - prog) * 0.8).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(q[0], q[1], pt.size * (1 - prog * 0.6), 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
    }

    /* ===== 统一景深排序与渲染输出 ===== */
    layers.sort((a, b) => a.z - b.z);
    for (const l of layers) {
      l.render();
    }

    /* ===== 8. 中心透雕星盘核心 (Astrolabe Sun Core & 12-Point Star) ===== */
    const pulse = reduced ? 1 : (0.86 + 0.14 * Math.sin(t * 1.5));
    const gs = R * 0.58 * pulse * (1 + 0.45 * sg.glow);

    // 核心星辉大光晕
    const gCore = ctx.createRadialGradient(CX, CY, 0, CX, CY, gs);
    const gBoost = Math.min(0.92, 0.38 * (1 + 0.85 * sg.glow));
    gCore.addColorStop(0, P.accentGlow + gBoost.toFixed(3) + ')');
    gCore.addColorStop(0.35, P.accentGlow + (gBoost * 0.35).toFixed(3) + ')');
    gCore.addColorStop(1, P.accentGlow + '0)');
    ctx.fillStyle = gCore;
    ctx.fillRect(CX - gs, CY - gs, gs * 2, gs * 2);

    // 旋转透雕星盘 Reticulum 指针网
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(reduced ? 0 : t * 0.08);
    const reteR = R * 0.22 * pulse;
    for (let i = 0; i < 12; i++) {
      const ang = i * (Math.PI / 6);
      ctx.save();
      ctx.rotate(ang);
      ctx.strokeStyle = P.ringNear + (0.15 + 0.15 * sg.glow).toFixed(3) + ')';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(reteR * 0.5, reteR * 0.3, 0, reteR);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 十二芒星太阳图腾 (12-Pointed Solar Totem)
    const starR = R * (reduced ? 0.14 : 0.135 + 0.010 * Math.sin(t * 1.5));
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(reduced ? 0.2 : -t * 0.12);

    // 外层 12 芒
    ctx.fillStyle = P.accent;
    if (P.isDark) {
      ctx.shadowColor = P.accentGlow + '0.9)';
      ctx.shadowBlur = 16 * pulse;
    }
    ctx.beginPath();
    const POINTS = 12;
    const K = 0.32;
    for (let i = 0; i < POINTS * 2; i++) {
      const ang = (i * Math.PI) / POINTS - Math.PI / 2;
      const rr = i % 2 === 0 ? starR : starR * K;
      const sx = Math.cos(ang) * rr, sy = Math.sin(ang) * rr;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // 内层逆转 6 芒金色花瓣
    ctx.rotate(reduced ? 0 : t * 0.28);
    ctx.fillStyle = P.gold + '0.75)';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI) / 6;
      const rr = i % 2 === 0 ? starR * 0.55 : starR * 0.20;
      const sx = Math.cos(ang) * rr, sy = Math.sin(ang) * rr;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();

    // 核心耀白光珠
    ctx.fillStyle = 'rgba(255, 255, 250, 0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, starR * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* ===== 9. 流星划过天际（偶发） ===== */
    if (!reduced) {
      meteorTimer += dt;
      if (meteorTimer > 2.8 + Math.random() * 3.5) {
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
        grad.addColorStop(0, P.textHi + m.life.toFixed(3) + ')');
        grad.addColorStop(0.4, P.gold + (m.life * 0.4).toFixed(3) + ')');
        grad.addColorStop(1, P.gold + '0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = m.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }
    }
  }

  /* ---------- 生命周期控制 ---------- */
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
    running = typeof document !== 'undefined' ? !document.hidden : true;
    if (active) {
      if (running && !raf) raf = requestAnimationFrame(frame);
      else if (!running && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', onVis);
  }

  // 监听明暗主题切换
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.documentElement) {
    const themeObs = new MutationObserver(() => {
      if (active) draw(tBase());
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  return {
    start,
    stop,
    surge,
    center: () => ({ x: CX, y: CY }),
    setMode,
    getMode
  };
}
