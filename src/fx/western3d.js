/* ============================================================
   西方星象 · Three.js 场景集（Phase 0-3 demo）
   ------------------------------------------------------------
   · 三个标签各一个场景：astro 星盘 / horo 黄道天球 / num 生命矩阵
   · 数据驱动：由 western-view 渲染时写入 window.__w3dData
   · 生命周期：懒加载 three、仅当前可见分区渲染、切走即暂停
   · 主题：材质/文字色跟随 --c-accent（光球调色盘联动），
     主题或调色盘变化时重建场景
   · 降级：prefers-reduced-motion 只渲染单帧；Eastern 模式全部暂停
   ============================================================ */

import { drawZodiacArt } from '../render/zodiac-art.js';

let THREE = null;                 // 懒加载的 three 模块
let ADDONS = null;                // 懒加载的 postprocessing/environment 插件
const built = {};                 // key -> { renderer, scene, camera, anim, mats, raf, container }
const STATE = { activeKey: null, disposed: false };
let syncQueued = false;

const ZODIAC = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const PLANET_GLYPHS = { Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇' };
const KEYS = { 's-ming': 'astro', 's-yun': 'horo', 's-rel': 'num' };
const WSIGN_IDS = ['ari','tau','gem','cnc','leo','vir','lib','sco','sgr','cap','aqu','pis'];

/* ---------- 主题色 ---------- */
function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  const accent = (cs.getPropertyValue('--c-accent') || '#d97757').trim();
  const text = (cs.getPropertyValue('--c-text-hi') || '#f5f4ee').trim();
  return { accent, text };
}

/* ---------- 纹理工具 ---------- */
function glyphTexture(char, color, size = 160) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.font = `${Math.floor(size * 0.62)}px "Noto Serif SC", "Songti SC", serif`;
  char = char + '\uFE0E';   // 强制文本形态呈现，避免彩色 emoji 字形
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = size * 0.06;
  g.fillText(char, size / 2, size / 2 + size * 0.02);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function numberTexture(num, color, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, new THREE.Color(color).multiplyScalar(0.55).getStyle());
  g.fillStyle = grad;
  g.font = `700 ${Math.floor(size * 0.56)}px "Noto Serif SC", "Songti SC", serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = size * 0.08;
  g.fillText(String(num), size / 2, size / 2 + size * 0.03);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowSpriteTexture(color = '#ffd98c') {
  const s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.25, color);
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function textSprite(char, color, size, fontPx = 0.62) {
  return sprite(glyphTexture(char, color, 160, fontPx), size, 1);
}

function sprite(tex, s, opacity = 1) {
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity, depthWrite: false });
  const sp = new THREE.Sprite(m);
  sp.scale.setScalar(s);
  return sp;
}

/* ---------- 通用件 ---------- */
function ring(THREE, r, tube, color, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(r, tube, 12, 128),
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity })
  );
  m.rotation.x = Math.PI / 2;
  return m;
}

function starField(THREE, count = 320, radius = 9) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = radius * (0.55 + Math.random() * 0.45);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(t);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.028, transparent: true, opacity: 0.75, depthWrite: false }));
  return p;
}

function baseLights(THREE, scene, accent) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const glow = new THREE.PointLight(new THREE.Color(accent), 6, 12);
  glow.position.set(0, 0.5, 0);
  scene.add(glow);
}

function makeRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);
  return renderer;
}

function makeCamera(container) {
  const cam = new THREE.PerspectiveCamera(42, (container.clientWidth || 1) / (container.clientHeight || 1), 0.1, 60);
  cam.position.set(0, 1.35, 5.4);
  return cam;
}

/* ---------- 场景 1：astro 命盘 · 真 3D 建模罗盘（参考图 IMG_2967） ----------
   分层挤出盘面 + 金属 PBR + 环境反射 + 行星程序化贴图 + Bloom 辉光 */
const GOLD = 0xd9b36a, NAVY = 0x0a0e1c;
const PCOLORS = { Sun: 0xf6c763, Moon: 0xd7dee8, Mercury: 0xb9bec9, Venus: 0xefd9a7, Mars: 0xc96f4a, Jupiter: 0xd9a05f, Saturn: 0xd8b47a, Uranus: 0x7fb5b5, Neptune: 0x5f7fc9, Pluto: 0x9b6fb5 };
const goldMat = (THREE) => new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.26, envMapIntensity: 1.25 });
const darkMat = (THREE) => new THREE.MeshStandardMaterial({ color: 0x111a30, roughness: 0.62, metalness: 0.35 });

function dialTexture() {
  const s = 1024, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s/2, s/2, s*0.08, s/2, s/2, s*0.52);
  grd.addColorStop(0, '#1c2745');
  grd.addColorStop(0.72, '#131c34');
  grd.addColorStop(1, '#0d1428');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(217,179,106,0.42)';
  g.lineWidth = 2.4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(s/2 + Math.cos(a) * s * 0.085, s/2 + Math.sin(a) * s * 0.085);
    g.lineTo(s/2 + Math.cos(a) * s * 0.5, s/2 + Math.sin(a) * s * 0.5);
    g.stroke();
  }
  g.strokeStyle = 'rgba(217,179,106,0.25)';
  [0.17, 0.3, 0.42].forEach(r => { g.beginPath(); g.arc(s/2, s/2, s*r, 0, Math.PI*2); g.stroke(); });
  for (let i = 0; i < 110; i++) {
    g.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.32})`;
    const a = Math.random() * Math.PI * 2, r = Math.random() * s * 0.48;
    g.fillRect(s/2 + Math.cos(a) * r, s/2 + Math.sin(a) * r, 1.7, 1.7);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* 星座环带贴图:十二金色符号 + 分隔刻度,烘焙到圆柱外表面 */
function bandTexture() {
  const w = 2048, h = 256, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#0b1224');
  grd.addColorStop(0.5, '#152038');
  grd.addColorStop(1, '#0b1224');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  const cell = w / 12;
  g.strokeStyle = 'rgba(217,179,106,0.75)';
  g.lineWidth = 4;
  for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo(i * cell, 0); g.lineTo(i * cell, h); g.stroke(); }
  g.strokeStyle = 'rgba(217,179,106,0.35)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 8); g.lineTo(w, 8); g.moveTo(0, h - 8); g.lineTo(w, h - 8); g.stroke();
  // 每格绘制真实星座星图(恒星 + 连线)+ 小符号
  for (let i = 0; i < 12; i++) {
    drawZodiacArt(g, WSIGN_IDS[i], i * cell + cell / 2, h / 2 - 14, h * 0.62, '#ffffff', 'rgba(230,195,126,0.85)');
    g.fillStyle = '#e6c37e';
    g.font = '700 44px "Noto Serif SC", "Songti SC", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ZODIAC[i] + '\uFE0E', i * cell + cell / 2, h - 44);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* 行星程序化贴图:底色 + 横向气流带 + 噪点 */
function planetTexture(baseHex, banded) {
  const w = 256, h = 128, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const base = new THREE.Color(baseHex);
  g.fillStyle = `rgb(${base.r*255|0},${base.g*255|0},${base.b*255|0})`;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const y = Math.random() * h, hh = 2 + Math.random() * 7;
    const lighter = Math.random() > 0.5;
    g.fillStyle = lighter ? `rgba(255,255,255,${0.05 + Math.random() * 0.14})` : `rgba(0,0,0,${0.05 + Math.random() * 0.16})`;
    if (banded) { g.fillRect(0, y, w, hh); }
    else { g.beginPath(); g.ellipse(Math.random() * w, y, 10 + Math.random() * 26, hh, 0, 0, Math.PI * 2); g.fill(); }
  }
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.2})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildAstro(THREE, container, data) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  const renderer = makeRenderer(container);
  const camera = makeCamera(container);
  camera.position.set(0, 4.3, 3.3);
  camera.lookAt(0, 0, -0.05);

  /* 环境反射:金属材质的关键 */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new ADDONS.RoomEnvironment(), 0.05).texture;

  const goldLight = new THREE.PointLight(0xffd98c, 26, 14, 2);
  goldLight.position.set(0, 3.6, 1.6);
  const cool = new THREE.DirectionalLight(0x8fb0ff, 1.1);
  cool.position.set(-4, 2.5, -3);
  scene.add(goldLight, cool, new THREE.AmbientLight(0x1c2233, 1.4));

  const world = new THREE.Group();
  scene.add(world);

  /* —— 盘面:基层 + 悬浮内盘(真实 3D 层次) —— */
  const base = new THREE.Mesh(new THREE.CircleGeometry(2.44, 96), new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.85, metalness: 0.15 }));
  base.rotation.x = -Math.PI / 2;
  world.add(base);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(1.92, 96), darkMat(THREE));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.035;
  world.add(inner);

  /* —— 金色放射辐条(立体) —— */
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.018, 1.52), goldMat(THREE));
    spoke.position.set(Math.sin(a) * 1.12, 0.045, Math.cos(a) * 1.12);
    spoke.rotation.y = a;
    world.add(spoke);
  }

  /* —— 外圈黄道环带:金属圆筒 + 符号环带贴图 + 双金边 —— */
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.5, 96, 1, true),
    new THREE.MeshStandardMaterial({ map: bandTexture(), roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide })
  );
  band.position.y = 0.25;
  world.add(band);
  [0.0, 0.5].forEach(y => {
    const edge = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.028, 10, 96), goldMat(THREE));
    edge.rotation.x = Math.PI / 2;
    edge.position.y = y;
    world.add(edge);
  });

  /* —— 宫位数字 —— */
  for (let n = 1; n <= 12; n++) {
    const a = ((n - 1) / 12) * Math.PI * 2 + Math.PI / 12;
    const sp = textSprite(String(n), '#c9a35f', 0.15);
    sp.position.set(Math.sin(a) * 2.14, 0.06, Math.cos(a) * 2.14);
    world.add(sp);
  }

  /* —— 四轴 MC / IC / ASC / DSC —— */
  [['MC', 0, -2.78], ['IC', 0, 2.78], ['ASC', -2.78, 0], ['DSC', 2.78, 0]].forEach(([label, x, z]) => {
    const sp = textSprite(label, '#e6c37e', 0.22);
    sp.position.set(x, 0.3, z);
    world.add(sp);
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.22), goldMat(THREE));
    tick.position.set(x * 0.9, 0.05, z * 0.9);
    world.add(tick);
  });

  /* —— 中央发光核:紫蓝球体 + 金色线框笼 + 光晕 —— */
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 40, 28),
    new THREE.MeshStandardMaterial({ color: 0x3d3f7a, emissive: 0x2b2f6e, emissiveIntensity: 1.5, roughness: 0.32, metalness: 0.4 })
  );
  core.position.y = 0.34;
  world.add(core);
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshBasicMaterial({ color: GOLD, wireframe: true, transparent: true, opacity: 0.5 })
  );
  wire.position.y = 0.34;
  world.add(wire);
  const coreGlow = sprite(glowSpriteTexture('#8f8fff'), 1.6, 0.5);
  coreGlow.position.y = 0.34;
  world.add(coreGlow);

  /* —— 十大行星:程序化贴图球体,真实落座角度 —— */
  const markerPos = {};
  (data.planets || []).forEach(p => {
    const a = -((p.absDegree || 0) - 90) * Math.PI / 180;
    const x = Math.sin(a) * 1.66, z = Math.cos(a) * 1.66;
    const color = PCOLORS[p.key] || 0xd9b36a;
    const tex = planetTexture(color, p.key === 'Jupiter' || p.key === 'Saturn');
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(p.key === 'Sun' ? 0.155 : 0.115, 28, 20),
      new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color(color), emissiveIntensity: p.key === 'Sun' ? 0.9 : 0.28, roughness: 0.55, metalness: 0.05 })
    );
    orb.position.set(x, 0.14, z);
    orb.userData.bobSeed = Math.random() * Math.PI * 2;
    orb.userData.baseY = 0.14;
    world.add(orb);
    markerPos[p.key] = orb;
    if (p.key === 'Saturn') {
      const sr = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 8, 48), new THREE.MeshBasicMaterial({ color: 0xd8c49a, transparent: true, opacity: 0.8 }));
      sr.rotation.x = Math.PI / 2.3;
      orb.add(sr);
    }
    if (p.key === 'Sun') {
      const glow = sprite(glowSpriteTexture('#ffd98c'), 0.9, 0.85);
      orb.add(glow);
    }
    const glyph = textSprite(PLANET_GLYPHS[p.key] || '✦', '#e6c37e', 0.17);
    glyph.position.set(x * 1.1, 0.42, z * 1.1);
    world.add(glyph);
  });

  /* —— 相位连线(按相位性质着色) —— */
  (data.aspects || []).forEach(asp => {
    const A = markerPos[asp.p1?.key], B = markerPos[asp.p2?.key];
    if (!A || !B) return;
    const seg = new THREE.BufferGeometry().setFromPoints([A.position.clone(), B.position.clone()]);
    world.add(new THREE.Line(seg, new THREE.LineBasicMaterial({ color: new THREE.Color(asp.color || GOLD), transparent: true, opacity: 0.66 })));
  });

  scene.add(starField(THREE, 460, 11));

  /* —— Bloom 辉光后期 —— */
  const { EffectComposer, RenderPass, UnrealBloomPass } = ADDONS;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.42, 0.5, 0.75);
  composer.addPass(bloom);


  const anim = (t) => {
    core.scale.setScalar(1 + Math.sin(t * 0.0018) * 0.06);
    wire.rotation.y = t * 0.0005;
    wire.rotation.x = Math.sin(t * 0.0004) * 0.35;
    coreGlow.material.opacity = 0.38 + Math.sin(t * 0.0018) * 0.12;
    (data.planets || []).forEach(p => {
      const orb = markerPos[p.key];
      if (orb) orb.position.y = orb.userData.baseY + Math.sin(t * 0.001 + orb.userData.bobSeed) * 0.03;
    });
  };
  const handle = { renderer, scene, camera, anim, mats: {}, accent: '#d9b36a', composer };
  return handle;
}


/* ---------- 场景 2：horo 星座全览 · 黄道天球 ---------- */
function buildHoro(THREE, container, data) {
  const accent = themeColors().accent;
  const text = '#e8e6f0';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  const renderer = makeRenderer(container);
  const camera = makeCamera(container);
  camera.position.set(0, 2.7, 4.9);
  camera.lookAt(0, 0, 0);
  baseLights(THREE, scene, accent);

  const g = new THREE.Group();
  scene.add(g);

  // 外圈黄道十二宫
  g.add(ring(THREE, 2.45, 0.02, accent, 0.8));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sp = sprite(glyphTexture(ZODIAC[i], text), 0.34, 1);
    sp.position.set(Math.cos(a) * 2.45, 0, Math.sin(a) * 2.45);
    g.add(sp);
  }
  // 中央太阳
  const sunMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), emissive: new THREE.Color(accent), emissiveIntensity: 2.0, roughness: 0.45, metalness: 0.1 });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.26, 28, 20), sunMat);
  g.add(sun);

  // 行星轨道（半径/速度/倾角递变，符号随行）
  const orbs = [];
  const GLYPHS = ['☽', '☿', '♀', '♂', '♃', '♄', '♅', '♆', '♇'];
  const N = GLYPHS.length;
  for (let i = 0; i < N; i++) {
    const r = 0.95 + i * 0.17;
    const orbit = ring(THREE, r, 0.006, 0xffffff, 0.16);
    orbit.rotation.x = Math.PI / 2 + Math.sin(i * 1.7) * 0.16;
    orbit.rotation.z = Math.cos(i * 2.1) * 0.12;
    g.add(orbit);
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 18, 12),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), emissive: new THREE.Color(accent), emissiveIntensity: 1.3, roughness: 0.5, metalness: 0.05 })
    );
    orb.userData = { r, speed: 0.22 + i * 0.055, phase: i * 1.3, tiltX: orbit.rotation.x - Math.PI / 2, tiltZ: orbit.rotation.z };
    const glyph = sprite(glyphTexture(GLYPHS[i], text), 0.19, 0.85);
    orb.add(glyph);
    g.add(orb);
    orbs.push(orb);
  }

  scene.add(starField(THREE));

  const anim = (t) => {
    g.rotation.y = t * 0.0001;
    orbs.forEach(o => {
      const u = t * 0.00035 * o.userData.speed + o.userData.phase;
      const x = Math.cos(u) * o.userData.r, z = Math.sin(u) * o.userData.r;
      const y = Math.sin(u) * Math.tan(o.userData.tiltX) * o.userData.r * 0.4;
      o.position.set(x, y, z);
    });
    sun.scale.setScalar(1 + Math.sin(t * 0.002) * 0.05);
  };
  return { renderer, scene, camera, anim, mats: { accent: [sunMat] }, accent };
}

/* ---------- 场景 3：num 生命矩阵 · 灵数粒子云(移植自 ASTRA threejs 版) ----------
   数字画布采样 → 4200 粒子从散乱球壳汇聚成灵数形态(金→紫渐变,加色混合)
   + 12 块数字魔方环绕 + 金/青双色光环 + 星尘 */
function canv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function numberCubeTex(n) {
  const s = 256, c = canv(s, s), g = c.getContext('2d');
  g.fillStyle = 'rgba(10,14,28,0.92)';
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(232,197,106,0.8)';
  g.lineWidth = 7;
  g.strokeRect(10, 10, s - 20, s - 20);
  g.fillStyle = '#ffe9b0';
  g.font = '700 ' + (String(n).length > 1 ? 96 : 128) + 'px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), s / 2, s / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildNum(THREE, container, data) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  const renderer = makeRenderer(container);
  const camera = makeCamera(container);
  camera.position.set(0, 2.4, 5.2);
  camera.lookAt(0, 1.15, 0);
  baseLights(THREE, scene, '#d9b36a');

  const CY = 1.15;
  const g = new THREE.Group();
  scene.add(g);

  /* 金 / 青双色光环(呼吸摇摆) */
  const haloA = new THREE.Mesh(new THREE.TorusGeometry(2.06, 0.009, 8, 160), new THREE.MeshBasicMaterial({ color: 0xe8c56a, transparent: true, opacity: 0.5 }));
  haloA.position.y = CY;
  const haloB = new THREE.Mesh(new THREE.TorusGeometry(2.31, 0.006, 8, 160), new THREE.MeshBasicMaterial({ color: 0x6ee7ff, transparent: true, opacity: 0.3 }));
  haloB.position.y = CY;
  haloB.rotation.x = 0.5;
  g.add(haloA, haloB);

  /* 数字魔方(1-9 / 大师数 11·22·33) */
  const cubes = [];
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33].forEach((n, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), new THREE.MeshBasicMaterial({ map: numberCubeTex(n), transparent: true, opacity: 0.95 }));
    g.add(m);
    cubes.push({ m, r: 1.93 + (i % 4) * 0.32, y: Math.sin(i * 2.1) * 0.63, a: i * 0.55, sp: 0.16 + Math.random() * 0.22, rx: 0.3 + Math.random() * 0.8, ry: 0.3 + Math.random() * 0.8, ph: i * 1.3 });
  });

  /* 星尘(金 / 紫,加色混合) */
  const N = 420, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), cc = new THREE.Color();
  for (let k = 0; k < N; k++) {
    const r = 1.3 + Math.random() * 2.6, th = Math.random() * Math.PI * 2;
    pos[k * 3] = Math.cos(th) * r;
    pos[k * 3 + 1] = CY + (Math.random() - 0.5) * 2.9;
    pos[k * 3 + 2] = Math.sin(th) * r;
    cc.set(Math.random() < 0.5 ? 0xffd97a : 0xa78bff).multiplyScalar(0.4 + Math.random() * 0.6);
    col[k * 3] = cc.r; col[k * 3 + 1] = cc.g; col[k * 3 + 2] = cc.b;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const starMap = glowSpriteTexture('#ffffff');
  g.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.045, map: starMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true })));

  scene.add(starField(THREE, 200, 12));

  /* —— 灵数粒子云:数字轮廓采样 → 汇聚动画 —— */
  let numCloud = null, numTargets = null;
  function setNumNumber(n) {
    const str = String(n);
    const cw = str.length > 1 ? 340 : 220, ch = 280;
    const c = canv(cw, ch), x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.font = '900 210px Georgia, serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(str, cw / 2, ch / 2 + 8);
    const img = x.getImageData(0, 0, cw, ch).data, step = 3;
    let pts = [];
    for (let py = 0; py < ch; py += step) for (let px = 0; px < cw; px += step)
      if (img[(py * cw + px) * 4 + 3] > 128) pts.push([px, py]);
    if (pts.length > 4200) { const nth = Math.ceil(pts.length / 4200), f = []; for (let i = 0; i < pts.length; i += nth) f.push(pts[i]); pts = f; }
    const W = str.length > 1 ? 4.9 : 3.45;
    const targets = new Float32Array(pts.length * 3);
    const starts = new Float32Array(pts.length * 3);
    const col = new Float32Array(pts.length * 3), cc2 = new THREE.Color();
    for (let k = 0; k < pts.length; k++) {
      targets[k * 3] = (pts[k][0] / cw - 0.5) * W;
      targets[k * 3 + 1] = CY + (0.5 - pts[k][1] / ch) * 3.5;
      targets[k * 3 + 2] = (Math.random() - 0.5) * 0.2;
      const r = 5.5 + Math.random() * 3.7, th2 = Math.random() * Math.PI * 2, ph2 = Math.acos(2 * Math.random() - 1);
      starts[k * 3] = r * Math.sin(ph2) * Math.cos(th2);
      starts[k * 3 + 1] = CY + r * Math.cos(ph2);
      starts[k * 3 + 2] = r * Math.sin(ph2) * Math.sin(th2);
      cc2.set(0xffe3a0).lerp(new THREE.Color(0x8b5cf6), Math.min(1, Math.max(0, (pts[k][1] / ch) * 1.15)));
      col[k * 3] = cc2.r; col[k * 3 + 1] = cc2.g; col[k * 3 + 2] = cc2.b;
    }
    if (numCloud) { numCloud.geometry.dispose(); g.remove(numCloud); }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(starts, 3));
    pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    numCloud = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.085, map: starMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true }));
    g.add(numCloud);
    numTargets = targets;
  }
  setNumNumber(data.lifePath || 1);

  const anim = (t, dt) => {
    const d = Math.min(0.05, dt || 0.016);
    /* 粒子向数字形态汇聚(渐进收敛,长期微颤) */
    if (numCloud && numTargets) {
      const np = numCloud.geometry.attributes.position.array;
      for (let i = 0; i < np.length; i += 3) {
        np[i] += (numTargets[i] - np[i]) * d * 4.5;
        np[i + 1] += (numTargets[i + 1] - np[i + 1]) * d * 4.5;
        np[i + 2] += (numTargets[i + 2] - np[i + 2]) * d * 4.5;
      }
      numCloud.geometry.attributes.position.needsUpdate = true;
    }
    /* 数字魔方环绕自转 */
    cubes.forEach(cu => {
      cu.a += d * cu.sp;
      cu.m.position.set(Math.cos(cu.a) * cu.r, CY + cu.y + Math.sin(t * 0.0007 + cu.ph) * 0.13, Math.sin(cu.a) * cu.r);
      cu.m.rotation.x += d * cu.rx;
      cu.m.rotation.y += d * cu.ry;
    });
    /* 光环摇摆 */
    haloA.rotation.x = Math.sin(t * 0.0004) * 0.16;
    haloA.rotation.y = Math.cos(t * 0.00031) * 0.2;
    haloB.rotation.x = 0.5 + Math.cos(t * 0.00037) * 0.2;
    haloB.rotation.z = Math.sin(t * 0.00029) * 0.24;
  };
  return { renderer, scene, camera, anim, mats: {}, accent: '#d9b36a' };
}

const BUILDERS = { astro: buildAstro, horo: buildHoro, num: buildNum };

/* —— 共享轨道拖拽:双轴球坐标 + 惯性 + 滚轮缩放 ——
   触控端 touch-action:pan-y —— 横向拖旋转、纵向留给你滚动页面 */
function attachOrbit(s, container) {
  const o = s.orbit = Object.assign(
    { theta: 0, phi: 1.05, radius: 5.4, target: { x: 0, y: 0, z: 0 }, minPhi: 0.3, maxPhi: 1.35, vTheta: 0, vPhi: 0, autoSpeed: 0, dragging: false },
    s.orbitInit || {}
  );
  o.target = o.target && o.target.isVector3 ? o.target : new THREE.Vector3(o.target.x || 0, o.target.y || 0, o.target.z || 0);
  let px = 0, py = 0;
  const onDown = e => {
    if (STATE.activeKey !== Object.keys(built).find(k => built[k] === s)) return;
    o.dragging = true; px = e.clientX; py = e.clientY; o.vTheta = 0; o.vPhi = 0;
    container.classList.add('grabbing');
    try { container.setPointerCapture(e.pointerId); } catch (err) {}
  };
  const onMove = e => {
    if (!o.dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    o.theta -= dx * 0.0042;
    o.phi = Math.max(o.minPhi, Math.min(o.maxPhi, o.phi - dy * 0.003));
    o.vTheta = -dx * 0.0042 * 0.5;
    o.vPhi = -dy * 0.003 * 0.5;
  };
  const onUp = () => { o.dragging = false; container.classList.remove('grabbing'); };
  const onWheel = e => {
    if (STATE.activeKey !== Object.keys(built).find(k => built[k] === s)) return;
    e.preventDefault();
    o.radius = Math.max(3.4, Math.min(8.5, o.radius + e.deltaY * 0.0032));
  };
  container.addEventListener('pointerdown', onDown);
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerup', onUp);
  container.addEventListener('pointercancel', onUp);
  container.addEventListener('pointerleave', onUp);
  container.addEventListener('wheel', onWheel, { passive: false });
  s._applyOrbit = () => {
    s.camera.position.setFromSphericalCoords(o.radius, o.phi, o.theta).add(o.target);
    s.camera.lookAt(o.target.x, o.target.y, o.target.z);
  };
  s._applyOrbit();
}
window._w3d = { built, STATE };   // 调试出口
const CONTAINER_IDS = { astro: 'w3d-astro', horo: 'w3d-horo', num: 'w3d-num' };
const ORBIT_DEFAULTS = {
  astro: { theta: 0, phi: 0.61, radius: 5.4, target: { x: 0, y: 0, z: -0.05 }, minPhi: 0.18, maxPhi: 1.15, autoSpeed: 0 },
  horo:  { theta: 0, phi: 1.07, radius: 5.6, target: { x: 0, y: 0, z: 0 }, minPhi: 0.5, maxPhi: 1.35, autoSpeed: 0 },
  num:   { theta: 0, phi: 1.14, radius: 5.3, target: { x: 0, y: 1.15, z: 0 }, minPhi: 0.5, maxPhi: 1.4, autoSpeed: 0 },
};

/* ---------- 生命周期 ---------- */
function reducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function ensure(key) {
  if (built[key] && built[key].container.isConnected) return built[key];
  if (built[key]) { dispose(key); }
  if (!THREE) {
    THREE = await import('three');
    const A = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/environments/RoomEnvironment.js'),
    ]);
    ADDONS = { EffectComposer: A[0].EffectComposer, RenderPass: A[1].RenderPass, UnrealBloomPass: A[2].UnrealBloomPass, RoomEnvironment: A[3].RoomEnvironment };
  }
  const container = document.getElementById(CONTAINER_IDS[key]);
  if (!container || !container.offsetWidth) return null;
  const data = (window.__w3dData || {})[key] || {};
  const s = BUILDERS[key](THREE, container, data);
  s.container = container;
  s.orbitInit = ORBIT_DEFAULTS[key];
  attachOrbit(s, container);
  container.querySelector('.w3d-loading')?.remove();
  /* 容器尺寸变化(窗口缩放)时重适配画布与相机 */
  if (typeof ResizeObserver !== 'undefined') {
    let lastW = container.clientWidth, lastH = container.clientHeight;
    s._ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h || (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2)) return;
      lastW = w; lastH = h;
      s.renderer.setSize(w, h);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      if (s.composer) s.composer.setSize(w, h);
    });
    s._ro.observe(container);
  }
  built[key] = Object.assign(s, { container, raf: 0 });
  return built[key];
}

function tick(key, t) {
  const s = built[key];
  if (!s || !s.orbit || STATE.activeKey !== key) return;
  s.frames = (s.frames || 0) + 1;
  const o = s.orbit, now = performance.now(), dt = Math.min(50, now - (s._lastT || now));
  s._lastT = now;
  if (!o.dragging) {
    // 惯性衰减
    if (Math.abs(o.vTheta) > 0.00002 || Math.abs(o.vPhi) > 0.00002) {
      o.theta += o.vTheta * dt;
      o.phi = Math.max(o.minPhi, Math.min(o.maxPhi, o.phi + o.vPhi * dt));
      o.vTheta *= 0.94; o.vPhi *= 0.94;
    } else if (o.autoSpeed) {
      o.theta += o.autoSpeed * dt;   // 怠速自转
    }
  }
  s.camera.position.setFromSphericalCoords(o.radius, o.phi, o.theta).add(o.target);
  s.camera.lookAt(o.target.x, o.target.y, o.target.z);
  s.anim(t, Math.min(50, now - (s._lastT || now)) / 1000);
  if (s.composer) s.composer.render(); else s.renderer.render(s.scene, s.camera);
  s.raf = requestAnimationFrame(tt => tick(key, tt));
}

function start(key) {
  const s = built[key];
  if (!s || s.raf) return;
  if (reducedMotion()) { s.anim(1000); s.renderer.render(s.scene, s.camera); return; }   // 降级：单帧
  // 立即渲染首帧（部分 headless/后台环境 RAF 不触发也不至于空屏）
  s.frames = 0;
  s.anim(800);
  if (s.composer) s.composer.render(); else s.renderer.render(s.scene, s.camera);
  s.raf = requestAnimationFrame(tt => tick(key, tt));
  // RAF 兜底：600ms 内没有帧推进（后台标签/受限环境）则降级为定时器驱动
  setTimeout(() => {
    if (built[key] && !built[key].raf) return;
    if ((built[key]?.frames || 0) < 2 && STATE.activeKey === key) {
      stop(key);
      const s2 = built[key];
      if (!s2) return;
      s2.raf = 1;                                     // 标记为运行中
      s2.timer = setInterval(() => {
        if (STATE.activeKey !== key) { stop(key); return; }
        s2.anim(performance.now());
        if (s2.composer) s2.composer.render(); else s2.renderer.render(s2.scene, s2.camera);
        s2.frames++;
      }, 33);
    }
  }, 600);
}

function stop(key) {
  const s = built[key];
  if (!s) return;
  if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; }
  if (s.timer) { clearInterval(s.timer); s.timer = 0; }
  s.frames = 0;
}

function dispose(key) {
  stop(key);
  const s = built[key];
  if (!s) return;
  s.renderer.dispose();
  s.container.querySelector('canvas')?.remove();
  delete built[key];
}

function disposeAll() { Object.keys(built).forEach(dispose); }

/* ---------- 同步：根据 模式 + 激活分区 决定谁在渲染 ---------- */
export function syncWestern3D() {
  if (syncQueued) return;
  syncQueued = true;
  setTimeout(async () => {
    syncQueued = false;
    if (STATE.disposed) return;
    const mode = document.body.getAttribute('data-system-mode') || 'eastern';
    const activeSec = document.querySelector('.sec.active')?.id || null;
    const key = mode === 'western' ? KEYS[activeSec] : null;
    STATE.activeKey = key;
    Object.keys(KEYS).forEach(k => { if (k !== key) stop(KEYS[k]); });
    if (!key) return;
    try {
      const s = await ensure(key);
      if (s) start(key);
    } catch (e) {
      console.warn('[western3d]', e);
      const ld = document.querySelector('#' + CONTAINER_IDS[key] + ' .w3d-loading');
      if (ld) ld.innerHTML = '<span>当前设备暂不支持 3D 渲染</span>';
    }
  }, 120);
}

/* 复位指定场景的视角(恢复默认轨道参数) */
function resetSceneView(key) {
  const s = built[key];
  const def = ORBIT_DEFAULTS[key];
  if (!s || !s.orbit || !def) return;
  Object.assign(s.orbit, {
    theta: def.theta, phi: def.phi, radius: def.radius,
    target: { x: def.target.x || 0, y: def.target.y || 0, z: def.target.z || 0 },
    vTheta: 0, vPhi: 0
  });
  s.orbit.target = new THREE.Vector3(s.orbit.target.x, s.orbit.target.y, s.orbit.target.z);
  if (s._applyOrbit) s._applyOrbit();
  else {
    s.camera.position.setFromSphericalCoords(s.orbit.radius, s.orbit.phi, s.orbit.theta).add(s.orbit.target);
    s.camera.lookAt(s.orbit.target.x, s.orbit.target.y, s.orbit.target.z);
  }
}
window._w3dReset = resetSceneView;

export function disposeWestern3D() {
  STATE.disposed = true;
  disposeAll();
}

/* ---------- 自接线：模式/分区/内容/主题变化 → 重新同步 ---------- */
export function initWestern3D() {
  const resync = () => { if (document.body.classList.contains('report-active')) syncWestern3D(); };

  // 分区切换 / Dock 点击
  document.addEventListener('click', e => {
    if (e.target.closest?.('.tab-item')) syncWestern3D();
  }, true);

  // 模式与主题切换
  new MutationObserver(resync).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-system-mode'] });
  new MutationObserver(resync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });

  // 报告内容重渲染（innerHTML 替换会丢画布）
  const p2 = document.getElementById('p2Inner');
  if (p2) new MutationObserver(resync).observe(p2, { childList: true });
  else {
    let tries = 0;
    const t = setInterval(() => {
      const el = document.getElementById('p2Inner');
      if (el) { clearInterval(t); new MutationObserver(resync).observe(el, { childList: true }); }
      else if (++tries > 40) clearInterval(t);
    }, 500);
  }

  if (document.body.classList.contains('report-active')) resync();
}
