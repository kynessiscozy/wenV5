/* ============================================================
   风水大师 · 定位 + 八宅命卦 + 当年九宫飞星 + AI 测算
   ------------------------------------------------------------
   三层计算：
   1) 定位：取浏览器当前位置（城市/经纬度），结合你填的房屋坐向，
      用八宅法由出生年推「命卦」、由坐向推「宅卦」，判断宅命配合度，
      给出个人吉凶方位（生气/天医/延年/伏位 vs 五鬼/六煞/祸害/绝命）。
   2) 八字：喜用神有利/宜避方位与五行色彩。
   3) 飞星：当年九宫飞星（紫白），正财/偏财/文昌/桃花/五黄二黑化解。
   结果底部自动挂「✦ AI 解读」——把当前位置、坐向、命卦、宅卦一并
   交给 AI，生成结合你处境的话术与可执行建议。
   ============================================================ */
import { masthead, notice, esc, viewShell, goResult } from './runtime.js';
import { getCtx } from '../state/context.js';
import { getWxGeo, requestGeo } from '../ui/weather.js';

/* ============================================================
   1) 定位 + 八宅
   ============================================================ */
const GUA_GRP = { 坎: '东四', 离: '东四', 震: '东四', 巽: '东四', 乾: '西四', 坤: '西四', 艮: '西四', 兑: '西四' };
const GUA_NAME = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兑', 8: '艮', 9: '离' };

/* 出生年 → 命卦（男寄坤、女寄艮；2000 年前后算法不同） */
function mingGua(birthYear, isMale) {
  const y = birthYear % 100;
  let n = birthYear >= 2000 ? (isMale ? 99 - y : y + 6) : (isMale ? 100 - y : y - 4);
  n = ((n % 9) + 9) % 9;
  if (n === 0) n = 9;
  if (n === 5) return isMale ? '坤' : '艮';
  return GUA_NAME[n];
}

/* 八宅游星表：命卦 → 四吉四凶方位 */
const BAZHAI = {
  坎: { 伏位: '正北', 生气: '东南', 延年: '正南', 天医: '正东', 祸害: '正西', 六煞: '西北', 五鬼: '东北', 绝命: '西南' },
  离: { 伏位: '正南', 生气: '正东', 延年: '正北', 天医: '东南', 祸害: '西南', 六煞: '正西', 五鬼: '西北', 绝命: '东北' },
  震: { 伏位: '正东', 生气: '正南', 延年: '东南', 天医: '正北', 祸害: '东北', 六煞: '西南', 五鬼: '正西', 绝命: '西北' },
  巽: { 伏位: '东南', 生气: '正北', 延年: '正东', 天医: '正南', 祸害: '西北', 六煞: '东北', 五鬼: '西南', 绝命: '正西' },
  乾: { 伏位: '西北', 生气: '正西', 延年: '西南', 天医: '东北', 祸害: '正南', 六煞: '正东', 五鬼: '正北', 绝命: '东南' },
  坤: { 伏位: '西南', 生气: '东北', 延年: '西北', 天医: '正西', 祸害: '正北', 六煞: '正南', 五鬼: '正东', 绝命: '东南' },
  艮: { 伏位: '东北', 生气: '西南', 延年: '正西', 天医: '西北', 祸害: '正东', 六煞: '正北', 五鬼: '正南', 绝命: '东南' },
  兑: { 伏位: '正西', 生气: '西北', 延年: '东北', 天医: '西南', 祸害: '东南', 六煞: '正南', 五鬼: '正东', 绝命: '正北' },
};
const GOOD_STARS = ['生气', '天医', '延年', '伏位'];
const BAD_STARS = ['五鬼', '六煞', '祸害', '绝命'];
const STAR_MEANING = {
  生气: '最吉，生发旺气，主财运、事业兴旺',
  天医: '次吉，主健康、贵人与化病',
  延年: '主长寿、夫妻和谐、稳健',
  伏位: '平稳蓄势，宜静养安身',
  绝命: '最凶，主健康损耗、意外',
  五鬼: '主是非、烂桃花、意外',
  六煞: '主口舌、破耗、情绪不稳',
  祸害: '主小人是非、病痛不顺',
};

/* 命卦 → 五行（用于与地域五行呼应） */
const GUA_WX = { 坎: '水', 离: '火', 震: '木', 巽: '木', 乾: '金', 兑: '金', 坤: '土', 艮: '土' };
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE    = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
function wxRelate(a, b) {
  if (!a || !b) return '';
  if (SHENG[a] === b) return '生';       // a 生 b
  if (SHENG[b] === a) return '生我';     // b 生 a
  if (KE[a] === b) return '克';           // a 克 b
  if (KE[b] === a) return '被克';         // b 克 a
  return '比和';
}
/* 由经纬度推位置特征：真实可算的「真太阳时差」+ 民俗方位五行近似 */
function geoProfile(lat, lon) {
  if (lat == null || lon == null) return null;
  const tzOffsetMin = Math.round((lon - 120) * 4); // 北京时间为东经120°标准时，经度每差1°约4分钟
  let regionWx = '土', regionName = '中部 / 西南（中土）';
  if (lat >= 38)                       { regionWx = '水'; regionName = '北方（北水）'; }
  else if (lat < 30 && lon >= 105)     { regionWx = '火'; regionName = '华南 / 南方（南火）'; }
  else if (lon >= 118)                 { regionWx = '木'; regionName = '华东 / 东南沿海（东木）'; }
  else if (lon < 102)                  { regionWx = '金'; regionName = '西部 / 西南（西金）'; }
  else                                 { regionWx = '土'; regionName = '中部 / 西南（中土）'; }
  return { tzOffsetMin, regionWx, regionName };
}

/* ============================================================
   周边环境（公开地图 Overpass，免费无需密钥）
   ------------------------------------------------------------
   按用户经纬度查 200m 内建筑/道路/水体/绿地/特殊场所，
   归并到八方位，供风水叠加分析。失败/超时则优雅降级。
   ============================================================ */
const DIR8 = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
function dirKey(s) { return String(s || '').replace(/[方正]/g, ''); } // 北方→北，正东→东，东北→东北

function bearingDir(lat0, lon0, lat, lon) {
  const φ1 = lat0 * Math.PI / 180, φ2 = lat * Math.PI / 180, Δλ = (lon - lon0) * Math.PI / 180;
  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const brng = (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
  return DIR8[Math.round(brng / 45) % 8];
}
function haversine(lat0, lon0, lat, lon) {
  const R = 6371000, toR = x => x * Math.PI / 180;
  const dφ = toR(lat - lat0), dλ = toR(lon - lon0);
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(toR(lat0)) * Math.cos(toR(lat)) * Math.sin(dλ / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function classifyFeature(tags) {
  if (!tags) return null;
  if (tags.natural === 'water' || tags.water) return { wx: '水', label: '水体（河/湖/池塘）' };
  if (tags.leisure === 'park' || tags.leisure === 'garden') return { wx: '木', label: '绿地公园' };
  if (tags.highway) return { wx: '路', label: '道路' + (tags.highway.match(/motorway|trunk|primary/) ? '（主干道）' : '') };
  if (tags.amenity === 'school') return { wx: '木', label: '学校' };
  if (tags.amenity === 'hospital') return { wx: '土', label: '医院' };
  if (tags.amenity === 'place_of_worship') return { wx: '土', label: '寺庙/教堂' };
  if (tags.amenity === 'fuel') return { wx: '火', label: '加油站' };
  if (tags.building) {
    const h = tags.height ? (parseFloat(tags.height) || 0) : (tags['building:levels'] ? (parseFloat(tags['building:levels']) || 0) * 3 : 0);
    return { wx: '建', label: '建筑' + (h ? '（约' + Math.round(h) + 'm）' : '') };
  }
  return null;
}
async function fetchSurroundings(lat, lon) {
  const q = '[out:json][timeout:15];(' +
    'way["building"](around:160,' + lat + ',' + lon + ');' +
    'way["natural"="water"](around:230,' + lat + ',' + lon + ');' +
    'way["leisure"~"park|garden"](around:230,' + lat + ',' + lon + ');' +
    'way["highway"~"motorway|trunk|primary|secondary|tertiary"](around:230,' + lat + ',' + lon + ');' +
    'node["amenity"~"school|hospital|place_of_worship|fuel"](around:230,' + lat + ',' + lon + ');' +
    'way["amenity"~"school|hospital|place_of_worship|fuel"](around:230,' + lat + ',' + lon + ');' +
    ');out center tags;';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(q),
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const items = [];
    for (const el of (json.elements || [])) {
      let la, lo;
      if (el.type === 'node') { la = el.lat; lo = el.lon; }
      else if (el.center) { la = el.center.lat; lo = el.center.lon; }
      else continue;
      const f = classifyFeature(el.tags);
      if (!f) continue;
      const dist = haversine(lat, lon, la, lo);
      if (dist > 260) continue;
      items.push({ dir: bearingDir(lat, lon, la, lo), dist, ...f });
    }
    return items.length ? items : null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}
function analyzeSurroundings(surr, ys, mg) {
  if (!surr || !surr.length) {
    return { html: '<div class="tw-para">未获取到周边建筑数据（定位未授权或公开地图暂不可达）。你可手动描述住宅四周的主要建筑、道路或水体，我再结合方位给出建议。</div>', text: '周边建筑：未获取到（可手动补充）。' };
  }
  const near = {};
  for (const it of surr) {
    if (!near[it.dir] || it.dist < near[it.dir].dist) near[it.dir] = it;
  }
  let chips = '';
  const present = [];
  for (const d of DIR8) {
    const it = near[d];
    if (it) {
      chips += '<div class="tw-fs-sur-tag"><b>' + d + '</b>' + it.label + (it.dist ? ' · 约' + it.dist + 'm' : '') + '</div>';
      present.push({ d, ...it });
    }
  }
  if (!chips) chips = '<div class="tw-para">周边 200m 内未识别到显著建筑或地形。</div>';

  const noteFor = (wx) => {
    if (wx === '水') return '水气汇聚，利人缘偏财；若你用神忌水，宜以绿植/屏风缓冲。';
    if (wx === '木') return '木气生发，利健康文昌，与用神木比和尤吉。';
    if (wx === '路') return '车流直冲主口舌破耗，宜设玄关或厚帘化解。';
    if (wx === '建') return '邻栋为靠山亦为压，吉位可借势、凶位宜留白少压。';
    if (wx === '土') return '气场偏静重，宜保持整洁、少作卧室。';
    if (wx === '火') return '火气偏躁，注意通风、避免红色堆积。';
    return '';
  };
  const lines = present.slice(0, 4).map(p => p.d + '向' + p.label + '——' + noteFor(p.wx));
  let para = '你所在位置四周（约200m）识别到的显著环境：' + lines.join('；') + '。';
  if (ys && YS[ys]) {
    const goodHit = present.filter(p => YS[ys].good.some(g => dirKey(g) === p.d));
    const badHit = present.filter(p => YS[ys].bad.some(b => dirKey(b) === p.d));
    if (goodHit.length) para += '其中' + goodHit.map(p => p.d + '向' + p.label).join('、') + '落在你的用神有利方位，宜重点布置主活动区。';
    if (badHit.length) para += '而' + badHit.map(p => p.d + '向' + p.label).join('、') + '在用神宜避方位，宜静置或化解。';
  }
  para += '（周边数据来自公开地图，仅作环境参考；实地以现场观察为准。）';

  const html = '<div class="tw-fs-surround">' + chips + '</div><div class="tw-para">' + para + '</div>';
  const text = '周边环境：' + present.map(p => p.d + p.label + '(约' + p.dist + 'm)').join('、') + '。';
  return { html, text };
}

/* 坐向选项 → 宅卦（宅卦按「坐」判，向为其对宫） */
const ZUO_GUA = {
  坐北朝南: '坎', 坐南朝北: '离', 坐东朝西: '震', 坐东南朝西北: '巽',
  坐西朝东: '兑', 坐西北朝东南: '乾', 坐西南朝东北: '坤', 坐东北朝西南: '艮',
};
const DIR_OPP = { 正北: '正南', 正南: '正北', 正东: '正西', 正西: '正东', 东北: '西南', 西南: '东北', 东南: '西北', 西北: '东南' };
const ZUO_LABEL = { 正北: '坐北朝南', 正南: '坐南朝北', 正东: '坐东朝西', 正西: '坐西朝东', 东北: '坐东北朝西南', 西南: '坐西南朝东北', 东南: '坐东南朝西北', 西北: '坐西北朝东南' };

/* 罗盘读数（面向角度 0-360）→ 面向方位 */
function headingToDir(deg) {
  const dirs = ['正北', '东北', '正东', '东南', '正南', '西南', '正西', '西北'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

/* 读设备罗盘朝向（需 HTTPS + 授权；失败则回退手动） */
function readCompass() {
  return new Promise((resolve, reject) => {
    if (!window.DeviceOrientationEvent) return reject(new Error('no compass'));
    const take = () => {
      const h = e => {
        const hd = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute ? e.alpha : null);
        if (hd != null) { cleanup(); resolve(hd); }
      };
      const cleanup = () => { window.removeEventListener('deviceorientation', h); if (t) clearTimeout(t); };
      const t = setTimeout(() => { cleanup(); reject(new Error('compass timeout')); }, 7000);
      window.addEventListener('deviceorientation', h);
    };
    if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      window.DeviceOrientationEvent.requestPermission()
        .then(p => p === 'granted' ? take() : reject(new Error('denied')))
        .catch(reject);
    } else take();
  });
}

/* ============================================================
   2) 九宫飞星（保留）
   ============================================================ */
const STARS = {
  1: { name: '贪狼', wx: '水', jx: '吉',   tag: '桃花 · 人缘 · 文昌 · 偏财' },
  2: { name: '巨门', wx: '土', jx: '凶',   tag: '病符 · 疾病' },
  3: { name: '禄存', wx: '木', jx: '凶',   tag: '是非 · 口舌 · 官非' },
  4: { name: '文昌', wx: '木', jx: '吉',   tag: '文昌 · 学业 · 功名' },
  5: { name: '廉贞', wx: '土', jx: '大凶', tag: '灾祸 · 血光 · 破财' },
  6: { name: '武曲', wx: '金', jx: '吉',   tag: '偏财 · 贵人 · 权力' },
  7: { name: '破军', wx: '金', jx: '凶',   tag: '破财 · 盗贼 · 口舌' },
  8: { name: '左辅', wx: '土', jx: '大吉', tag: '正财 · 置业' },
  9: { name: '右弼', wx: '火', jx: '吉',   tag: '喜庆 · 姻缘 · 贵人' },
};
const PALACE = {
  巽: { dir: '东南', wd: 'SE', wx: '木' }, 离: { dir: '正南', wd: 'S', wx: '火' }, 坤: { dir: '西南', wd: 'SW', wx: '土' },
  震: { dir: '正东', wd: 'E', wx: '木' },  中: { dir: '中央', wd: '', wx: '土' },   兑: { dir: '正西', wd: 'W', wx: '金' },
  艮: { dir: '东北', wd: 'NE', wx: '土' }, 坎: { dir: '正北', wd: 'N', wx: '水' },  乾: { dir: '西北', wd: 'NW', wx: '金' },
};
const TRAIL = ['中', '乾', '兑', '艮', '离', '坎', '坤', '震', '巽'];
const GRID_POS = {
  巽: [0, 0], 离: [0, 1], 坤: [0, 2], 震: [1, 0], 中: [1, 1], 兑: [1, 2], 艮: [2, 0], 坎: [2, 1], 乾: [2, 2],
};
function entryStar(year) {
  const base = 1984, diff = year - base;
  let cyc = ((diff % 180) + 180) % 180;
  const azi = cyc < 60 ? 7 : (cyc < 120 ? 1 : 4);
  const seq = cyc % 60;
  let s = ((azi - seq) % 9 + 9) % 9;
  return s === 0 ? 9 : s;
}
function yearStars(year) {
  const inStar = entryStar(year), out = {};
  TRAIL.forEach((p, i) => { let s = (inStar + i) % 9; if (s === 0) s = 9; out[p] = s; });
  return out;
}
function flyingGridSvg(year, stars, focusStars, ysGoodDirs) {
  const pad = 14, cell = 96, gap = 8, W = pad * 2 + cell * 3 + gap * 2, H = W;
  const jxColor = s => {
    const j = STARS[s].jx;
    if (j === '大吉') return 'var(--tw-g)';
    if (j === '吉') return 'var(--tw-g2)';
    if (j === '大凶') return 'var(--tw-r)';
    if (j === '凶') return 'var(--tw-y)';
    return 'var(--tw-gray)';
  };
  let cells = '';
  for (const pal of Object.keys(GRID_POS)) {
    const [r, c] = GRID_POS[pal], x = pad + c * (cell + gap), y = pad + r * (cell + gap);
    const s = stars[pal], P = PALACE[pal], focused = focusStars.includes(s), ysHit = ysGoodDirs.includes(P.dir);
    const jx = jxColor(s);
    let fill = 'var(--tw-card)', stroke = 'var(--tw-line-2)', sw = 1.5;
    if (focused) { stroke = 'var(--tw-accent)'; sw = 3; fill = 'var(--tw-glow)'; }
    else if (ysHit && s !== 5) { stroke = 'var(--tw-g)'; sw = 2; }
    cells +=
      '<g transform="translate(' + x + ',' + y + ')">' +
        '<rect x="1" y="1" width="' + cell + '" height="' + cell + '" rx="10" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
        '<text x="' + cell / 2 + '" y="30" text-anchor="middle" font-size="12" font-weight="700" fill="' + jx + '">' + s + ' ' + STARS[s].name + '</text>' +
        '<text x="' + cell / 2 + '" y="52" text-anchor="middle" font-size="10" fill="var(--tw-ink-3)">' + P.dir + ' · ' + P.wx + '</text>' +
        (focused ? '<text x="' + cell / 2 + '" y="74" text-anchor="middle" font-size="9" font-weight="700" fill="var(--tw-accent)">本期重点</text>'
                 : '<text x="' + cell / 2 + '" y="74" text-anchor="middle" font-size="9" fill="var(--tw-ink-3)">' + STARS[s].tag.split('·')[0] + '</text>') +
        (ysHit && !focused ? '<text x="' + cell / 2 + '" y="90" text-anchor="middle" font-size="9" fill="var(--tw-g)">用神方位</text>' : '') +
      '</g>';
  }
  return '<figure class="tw-fs-fig"><svg viewBox="0 0 ' + W + ' ' + H + '" class="tw-fs-svg" role="img" aria-label="' + year + '年九宫飞星图">' + cells + '</svg>' +
    '<figcaption>面向正南 · 上南下北 · ' + year + '年（丙午）九宫飞星图</figcaption></figure>';
}

/* ============================================================
   1.5) 综合方位罗盘（八宅吉凶 + 用神方位 + 周边建筑叠加）
   ------------------------------------------------------------
   以用户为中心，8 方位扇区把吉凶方位、用神宜位、四周建筑
   叠在同一张图上，一图胜千言。
   ============================================================ */
function polar(cx, cy, R, deg) {
  const t = deg * Math.PI / 180;
  return [+(cx + R * Math.sin(t)).toFixed(1), +(cy - R * Math.cos(t)).toFixed(1)];
}
function annSec(cx, cy, rin, rout, a1, a2) {
  const [xo1, yo1] = polar(cx, cy, rout, a1);
  const [xo2, yo2] = polar(cx, cy, rout, a2);
  const [xi2, yi2] = polar(cx, cy, rin, a2);
  const [xi1, yi1] = polar(cx, cy, rin, a1);
  const large = (a2 - a1) > 180 ? 1 : 0;
  return 'M ' + xo1 + ' ' + yo1 + ' A ' + rout + ' ' + rout + ' 0 ' + large + ' 1 ' + xo2 + ' ' + yo2 +
    ' L ' + xi2 + ' ' + yi2 + ' A ' + rin + ' ' + rin + ' 0 ' + large + ' 0 ' + xi1 + ' ' + yi1 + ' Z';
}
function baguaCompassSvg(mg, bz, ys, zg, surr) {
  if (!mg || !bz) {
    return '<figure class="tw-fs-fig"><div class="tw-fs-compass-empty">完成个人命盘推演（含命卦）后，这里会显示你的专属方位罗盘：八宅吉凶方位、用神有利方位与周边建筑一目了然。</div><figcaption>方位罗盘 · 待命卦</figcaption></figure>';
  }
  const cx = 160, cy = 160, rin = 60, rout = 132;
  const starByDir = {};
  for (const [s, d] of Object.entries(bz)) starByDir[d] = s;
  const ysGood = ys ? YS[ys].good.map(dirKey) : [];
  const ysBad = ys ? YS[ys].bad.map(dirKey) : [];
  const wxColor = { 水: '#3f6f8f', 木: '#3f6f5f', 路: '#9a9282', 建: '#b0a48c', 土: '#b0833f', 火: '#b04a3a' };
  let sectors = '';
  DIR8.forEach((d, i) => {
    const star = starByDir[d] || '';
    const good = !star || GOOD_STARS.includes(star);
    const isYsGood = ysGood.includes(d);
    const isYsBad = ysBad.includes(d);
    const a1 = i * 45 - 22.5, a2 = i * 45 + 22.5;
    const fill = good ? 'color-mix(in srgb, var(--tw-g) 15%, transparent)' : 'color-mix(in srgb, var(--tw-r) 13%, transparent)';
    const stroke = isYsGood ? 'var(--tw-accent)' : (isYsBad ? 'var(--tw-g)' : 'var(--tw-line-2)');
    const sw = isYsGood ? 3 : (isYsBad ? 2 : 1.5);
    sectors += '<path d="' + annSec(cx, cy, rin, rout, a1, a2) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
    const [dx, dy] = polar(cx, cy, rout - 14, i * 45);
    sectors += '<text x="' + dx + '" y="' + (dy + 4) + '" text-anchor="middle" font-size="11" font-weight="700" fill="var(--tw-ink-3)">' + d + '</text>';
    const [sx, sy] = polar(cx, cy, rin + 18, i * 45);
    sectors += '<text x="' + sx + '" y="' + (sy + 4) + '" text-anchor="middle" font-size="12" font-weight="800" fill="' + (good ? 'var(--tw-g)' : 'var(--tw-r)') + '">' + star + '</text>';
    if (isYsGood) sectors += '<text x="' + sx + '" y="' + (sy - 9) + '" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--tw-accent)">用神宜</text>';
  });
  let marks = '';
  if (surr && surr.length) {
    const near = {};
    for (const it of surr) { if (!near[it.dir] || it.dist < near[it.dir].dist) near[it.dir] = it; }
    DIR8.forEach((d, i) => {
      const it = near[d]; if (!it) return;
      const [px, py] = polar(cx, cy, rout + 16, i * 45);
      marks += '<circle cx="' + px + '" cy="' + py + '" r="5" fill="' + (wxColor[it.wx] || 'var(--tw-accent)') + '" stroke="var(--tw-card)" stroke-width="1.5"/>';
    });
  }
  const match = zg ? (GUA_GRP[mg] === GUA_GRP[zg]) : null;
  const center =
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + rin + '" fill="var(--tw-card)" stroke="var(--tw-accent)" stroke-width="2"/>' +
    '<text x="' + cx + '" y="' + (cy - 14) + '" text-anchor="middle" font-size="11" fill="var(--tw-ink-3)">命卦</text>' +
    '<text x="' + cx + '" y="' + (cy + 7) + '" text-anchor="middle" font-size="20" font-weight="800" fill="var(--tw-accent)">' + mg + '</text>' +
    '<text x="' + cx + '" y="' + (cy + 25) + '" text-anchor="middle" font-size="10" font-weight="700" fill="' + (match === null ? 'var(--tw-ink-3)' : (match ? 'var(--tw-g)' : 'var(--tw-y)')) + '">' + (match === null ? '待宅卦' : (match ? '宅命相合' : '需调和')) + '</text>';
  return '<figure class="tw-fs-fig"><div class="tw-fs-compass"><svg viewBox="0 0 320 320" class="tw-fs-compass-svg" role="img" aria-label="方位罗盘：八宅吉凶与用神方位">' +
    sectors + marks + center + '</svg></div>' +
    '<figcaption>方位罗盘 · 上北下南；绿=吉位 红=凶位 金色描边=用神宜位 外圈彩点=四周建筑/地形</figcaption></figure>';
}

/* ============================================================
   3) 八字用神（保留）
   ============================================================ */
const YS = {
  木: { good: ['东方', '北方'], note: '水生木：喜东、北方，助你生发舒展。', bad: ['西方'], badNote: '西方属金克木，宜避重金之物。' },
  火: { good: ['南方', '东方'], note: '木生火：喜南、东方，助你热忱外放。', bad: ['北方'], badNote: '北方属水克火，宜避大面积深水色。' },
  土: { good: ['中央', '西南', '东北', '南方'], note: '火生土：喜中央与西南东北，南方亦可。', bad: ['正东'], badNote: '东方属木克土，宜避过多绿植重木。' },
  金: { good: ['西方', '西南', '东北'], note: '土生金：喜西、西南、东北，助你收敛成器。', bad: ['南方'], badNote: '南方属火克金，宜避过热红光。' },
  水: { good: ['北方', '西方'], note: '金生水：喜北、西方，助你流通汇纳。', bad: ['中央', '西南', '东北'], badNote: '中央与西南东北属土克水，宜避重土压抑。' },
};
const YS_COLOR = {
  木: { 主: '#3f6f52', 名: '青绿 · 墨绿', 饰: '#8a6b4a' }, 火: { 主: '#a84638', 名: '朱红 · 珊瑚', 饰: '#c9a44c' },
  土: { 主: '#b0833f', 名: '米黄 · 咖色', 饰: '#8a6a45' }, 金: { 主: '#cfc9bd', 名: '银灰 · 香槟', 饰: '#b08a3e' },
  水: { 主: '#2f4d63', 名: '深蓝 · 雾蓝', 饰: '#9fc4d0' },
};
const FOCUS = {
  wealth:  { label: '正财 · 置业', stars: [8, 6], note: '重点旺「八白」正财位，辅以「六白」偏财贵人。' },
  wealth2: { label: '偏财 · 贵人', stars: [6, 1], note: '重点旺「六白」偏财贵人，辅以「一白」偏财人缘。' },
  career:  { label: '事业 · 升迁', stars: [6, 8], note: '重点催「六白」权力贵人，配合「八白」财位。' },
  study:   { label: '文昌 · 学业', stars: [4, 1], note: '重点用「四绿」文昌位，辅以「一白」智慧。' },
  love:    { label: '桃花 · 姻缘', stars: [1, 9], note: '重点旺「一白」桃花，辅以「九紫」喜庆。' },
  health:  { label: '健康 · 平安', stars: [8, 1], note: '重点化解「五黄」「二黑」凶位，旺「八白」「一白」。' },
};
const SPACE_TIPS = {
  住宅: '全屋以「中宫一白」为能量核心，保持通光敞亮；吉位宜常用，凶位宜静置不设床炉。',
  卧室: '床头与睡位优先落「吉星位」，避开「五黄」「二黑」方位；卧室内少用电器与镜面冲床。',
  书房: '书桌面向「文昌位」或「四绿」方位，靠墙有靠，桌上用文房与绿植；避免背门对镜。',
  办公工位: '工位坐实朝虚、背有靠；将「财位/贵人位」作为主工作区，凶位作通道或储物。',
  客厅: '客厅主沙发宜坐「八白」「六白」方位、面朝吉位；凶位不放主位，保持敞亮聚气。',
};
const STAR_ADVICE = {
  1: '「一白」属水，主桃花、人缘、文昌与偏财。宜在此位保持明亮整洁，放圆形水器、水晶、小型鱼缸（水质要清），可旺人缘与偏财；忌堆放重物堵塞。',
  2: '「二黑」属土，为病符星。此位宜静，忌动土、喧闹、炉灶与红色；放铜葫芦、六帝钱或金属摆件以「金泄土气」，并保持干爽通风。',
  3: '「三碧」属木，主是非口舌。此位忌放绿植木器；以红色饰品或金属小物克制，宜静不宜喧，避免在此处争执。',
  4: '「四绿」属木，为文昌星。宜设书桌书柜、文房四宝，摆绿色植物或文昌塔，利学业、考试与创意灵感。',
  5: '「五黄」属土，为最凶之星，主灾祸血光。此位务必安静空置，忌动土装修、忌红色装饰；可放铜铃、铜葫芦、五帝钱泄土；本命年（属马）尤需注意。',
  6: '「六白」属金，主偏财、贵人与权力。宜明亮，放金属摆件、白水晶、金元宝或文昌塔，利升迁与贵人相助。',
  7: '「七赤」属金，主破财、盗贼与口舌。此位忌堆杂物、利器和尖锐金属；以红色饰品泄金，保持整洁通畅。',
  8: '「八白」属土，为当年第一大财星，主正财与置业。宜保持明亮整洁，放黄水晶、聚宝盆、发财树或貔貅；此位宜「动」以聚气（可开窗、放风扇），忌杂物与垃圾桶。',
  9: '「九紫」属火，主喜庆、姻缘与贵人。宜放红/粉水晶、鲜花或暖光灯，利姻缘喜事与人脉；忌用黑色冷色调压抑。',
};

/* ============================================================
   结果页
   ============================================================ */
function buildResult(ctx, S, stars, year, surr) {
  const ys = (ctx && ctx.wx && ctx.wx.ys) || null;
  const ysGoodDirs = ys ? (YS[ys]?.good || []) : [];
  const ysColor = ys ? YS_COLOR[ys] : null;
  const f = FOCUS[S.focus];
  const focusStars = f.stars;

  /* —— 定位 + 八宅 —— */
  const geo = getWxGeo();
  const gp = geo && geo.lat != null ? geoProfile(geo.lat, geo.lon) : null;
  const locLine = geo && geo.city
    ? '当前位置：' + esc(geo.city) + (geo.lat ? '（' + geo.lat + ', ' + geo.lon + '）' : '')
    : '未获取到定位，可按下方坐向手动测算；授权浏览器定位后会自动带出所在城市。';

  const isMale = ctx && ctx.gen === 'male';
  const mg = (ctx && ctx.by) ? mingGua(ctx.by, isMale) : null;   // 命卦
  const zg = ZUO_GUA[S.zuo] || null;                              // 宅卦
  const bz = mg && BAZHAI[mg];

  let html = '';

  /* 位置卡 */
  html += '<div class="tw-kicker">LOCATION · 当前定位</div>';
  html += '<div class="tw-fs-loc"><span class="pin">◎</span><b>' + locLine.split('：')[0] + '</b>' +
    '<span>' + (locLine.includes('：') ? locLine.split('：').slice(1).join('：') : locLine) + '</span></div>';
  if (gp) {
    html += '<div class="tw-fs-loc-meta">' +
      '<span class="tag">地域 · ' + gp.regionName + '（属' + gp.regionWx + '）</span>' +
      '<span class="tag">真太阳时差 ' + (gp.tzOffsetMin >= 0 ? '+' : '') + gp.tzOffsetMin + ' 分</span>' +
      '</div>';
  } else {
    html += '<div class="tw-fs-loc-meta"><span class="tag">授权定位后给出结合所在城市五行的深度分析</span></div>';
  }

  /* 八宅 */
  html += '<div class="tw-kicker">八宅 · 命卦 & 宅卦</div>';
  if (mg && zg && bz) {
    const match = GUA_GRP[mg] === GUA_GRP[zg];
    html += '<div class="tw-fs-dir-row">' +
      '<div class="tw-fs-dir' + (GUA_GRP[mg] === '东四' ? ' good' : '') + '"><span>你的命卦</span><b>' + mg + ' · ' + GUA_GRP[mg] + '</b><small>按出生年 ' + ctx.by + ' 年 · ' + (isMale ? '男' : '女') + ' 推得</small></div>' +
      '<div class="tw-fs-dir' + (GUA_GRP[zg] === '东四' ? ' good' : '') + '"><span>房屋宅卦</span><b>' + zg + ' · ' + GUA_GRP[zg] + '</b><small>' + esc(S.zuo) + '</small></div>' +
      '</div>';
    html += '<div class="tw-para">' +
      (match
        ? '✓ 你的命卦（' + GUA_GRP[mg] + '）与宅卦（' + GUA_GRP[zg] + '）同属，为「宅命相合」，主安稳顺遂，按下方个人吉位布局即可增益。'
        : '△ 你的命卦为' + GUA_GRP[mg] + '、宅卦为' + GUA_GRP[zg] + '，属「宅命不合」。无需搬动，通过强化「生气/延年」吉位、规避「绝命/五鬼」凶位，可有效调和。') +
      '</div>';
    html += baguaCompassSvg(mg, bz, ys, zg, surr);
    html += '<div class="tw-para" style="margin-top:2px">坐卧、书桌、厨房尽量落在四吉位；大门、睡床、炉灶避免正对四凶位，凶位保持空旷安静即可。金色描边方位为你的用神有利位，可重点布置主活动区。</div>';
  } else if (!mg) {
    html += '<div class="tw-para">完成个人推演后，可按你的出生年自动计算命卦与个人吉凶方位。</div>';
  } else {
    html += '<div class="tw-para">已算出你的命卦为「' + mg + '（' + GUA_GRP[mg] + '）」。请选择房屋坐向后再看宅命配合与吉凶位。</div>';
  }

  /* 位置 × 命理（结合具体城市五行生克） */
  if (gp) {
    html += '<div class="tw-kicker">LOCATION × DESTINY · 位置 × 命理</div>';
    let para = '你身处 <b>' + gp.regionName + '</b>，地域五行属 <b>' + gp.regionWx + '</b>。';
    if (ys) {
      const rel = wxRelate(gp.regionWx, ys);
      para += '你的用神为 <b>' + ys + '</b>，所在地气场对你用神属「' + rel + '」：';
      if (rel === '生')        para += '当地气场生旺你的用神，是天然加分项，宜把主打活动区（书桌、床位、工位）放在 ' + YS[ys].good.join('、') + ' 等用神方位，顺势承接。';
      else if (rel === '生我') para += '你的用神生旺当地气场，属「我生之地」，宜稳守多用 ' + YS[ys].good.join('、') + ' 位收纳能量，避免过度外耗。';
      else if (rel === '克')   para += '当地气场克制你的用神，属「我克之地」，须以 ' + YS[ys].good.join('、') + ' 用神方位做主位强补，凶位（' + YS[ys].bad.join('、') + '）保持空净。';
      else if (rel === '被克') para += '当地气场被你的用神所克，属「克我之地」，宜主动布置以动制静，重点催旺 ' + YS[ys].good.join('、') + '，并在 ' + YS[ys].bad.join('、') + ' 放金属 / 水器泄其压抑。';
      else                    para += '所在地与你用神比和，气场相合，按用神方位（' + YS[ys].good.join('、') + '）布局即安。';
    }
    if (mg) {
      const mw = GUA_WX[mg];
      const mr = wxRelate(gp.regionWx, mw);
      const mColor = mw === '木' ? '绿植' : mw === '火' ? '暖光红' : mw === '土' ? '米黄' : mw === '金' ? '银白金属' : '深蓝水景';
      para += '你的命卦属 <b>' + mg + '（' + mw + '）</b>，与所在地属「' + mr + '」：' +
        (mr === '克' ? '命卦受地气所克，宜在此方位多用 ' + mw + ' 行生旺（如 ' + mColor + '），化解地气之抑。'
         : mr === '被克' ? '你命卦克当地气场，可主动布局主导，把 ' + mw + ' 行方位作为你的主场。'
         : '命卦与地气相生相合，环境天然助你，保持 ' + mw + ' 行主位即可。');
    }
    para += '（地域五行按方位粗略划分，供环境调和参考；以现场罗盘与本地实际为准。）';
    html += '<div class="tw-para">' + para + '</div>';
  }

  /* 周边建筑与地形（按方位归类，叠加命理） */
  const sur = analyzeSurroundings(surr, ys, mg);
  html += '<div class="tw-kicker">SURROUNDINGS · 周边建筑与地形</div>';
  html += sur.html;

  /* 八字用神 */
  html += '<div class="tw-kicker">YOUR ELEMENT · 八字用神方位</div>';
  if (ys) {
    const y = YS[ys];
    html += '<div class="tw-para">你的用神为 <b>' + ys + '</b>。' + y.note + '</div>' +
      '<div class="tw-fs-dir-row">' +
        '<div class="tw-fs-dir good"><span>有利方位</span><b>' + y.good.join(' · ') + '</b><small>布置主力区 / 床位 / 书桌</small></div>' +
        '<div class="tw-fs-dir bad"><span>宜避方位</span><b>' + y.bad.join(' · ') + '</b><small>' + y.badNote + '</small></div>' +
      '</div>' +
      (ysColor ? '<div class="tw-fs-swatches"><span class="sw" style="background:' + ysColor.主 + '"></span><b>' + ys + '气色彩：</b>' + ysColor.名 +
        '<span class="dot" style="background:' + ysColor.饰 + '"></span> 饰物偏 ' + ysColor.饰 + ' 系</div>' : '');
  } else {
    html += '<div class="tw-para">尚未读取到命盘用神，以下仅按「九宫飞星」给出方位；完成个人推演后可叠加用神方位。</div>';
  }

  /* 九宫飞星 */
  html += '<div class="tw-kicker">FLYING STARS · ' + year + ' 九宫飞星</div>';
  html += flyingGridSvg(year, stars, focusStars, ysGoodDirs);
  html += '<div class="tw-para">' + year + '年入中为「一白贪狼」，' + f.note + '</div>';
  const focusCells = Object.keys(stars).filter(p => focusStars.includes(stars[p]));
  html += '<div class="tw-h3">本期重点 · ' + f.label + '</div>';
  html += focusCells.map(p => {
    const s = stars[p];
    return '<div class="tw-fs-card"><b>' + PALACE[p].dir + ' · ' + s + STARS[s].name + '（' + STARS[s].wx + '，' + STARS[s].jx + '）</b><p>' + STAR_ADVICE[s] + '</p></div>';
  }).join('');
  const goodCells = Object.keys(stars).filter(p => ['吉', '大吉'].includes(STARS[stars[p]].jx) && !focusStars.includes(stars[p]));
  const badCells = Object.keys(stars).filter(p => ['凶', '大凶'].includes(STARS[stars[p]].jx));
  html += '<div class="tw-h3">全局吉凶速览</div>';
  html += '<div class="tw-fs-list good"><b>宜催旺：</b>' + goodCells.map(p => '<span>' + PALACE[p].dir + '·' + STARS[stars[p]].name + '</span>').join('') + '</div>';
  html += '<div class="tw-fs-list bad"><b>宜化解：</b>' + badCells.map(p => '<span>' + PALACE[p].dir + '·' + STARS[stars[p]].name + '</span>').join('') + '</div>';
  html += badCells.map(p => {
    const s = stars[p];
    return '<div class="tw-fs-card bad"><b>⚠ ' + PALACE[p].dir + ' · ' + s + STARS[s].name + '（' + STARS[s].tag + '）</b><p>' + STAR_ADVICE[s] + '</p></div>';
  }).join('');

  /* 空间布局 */
  html += '<div class="tw-kicker">ROOM · ' + esc(S.space) + '布局</div>';
  let spacePara = SPACE_TIPS[S.space];
  let climate = '';
  if (gp) {
    const spaceKey = { 住宅: '客厅与卧室主区', 卧室: '床头与睡位', 书房: '书桌朝向', '办公工位': '主工作区', 客厅: '主沙发' }[S.space] || '主位';
    climate = gp.regionWx === '火' ? '本地偏燥热，注意通风降温、避免过多红色堆积'
            : gp.regionWx === '水' ? '本地偏寒湿，注意防潮保暖、可加暖光补足'
            : gp.regionWx === '金' ? '本地偏干爽，宜保持明亮整洁'
            : gp.regionWx === '木' ? '本地木气盛，宜采光通风、东方可略留空'
            : '本地土气厚，宜温润聚气、中央保持敞亮';
    spacePara += ' 你所在的' + gp.regionName + '，本次按「' + esc(S.zuo) + '」坐向：优先让' + (ys ? YS[ys].good.join('、') : '吉星') + '方位对应' + spaceKey + '；' + climate + '。';
  }
  html += '<div class="tw-para">' + spacePara + '</div>';

  /* 测算依据（结构化，供复核与 AI 解读上下文） */
  html += '<div class="tw-kicker">📐 测算依据 · 结构化参数</div>';
  html += '<div class="tw-fs-spec">';
  html += '<div><span>当前位置</span><b>' + (geo && geo.city ? esc(geo.city) + (geo.lat ? '（' + geo.lat + ', ' + geo.lon + '）' : '') : '未定位') + '</b></div>';
  if (gp) {
    html += '<div><span>地域五行</span><b>' + gp.regionName + ' · 属' + gp.regionWx + '</b></div>';
    html += '<div><span>真太阳时差</span><b>' + (gp.tzOffsetMin >= 0 ? '+' : '') + gp.tzOffsetMin + ' 分</b></div>';
  }
  if (mg) html += '<div><span>命卦</span><b>' + mg + '（' + GUA_GRP[mg] + '·' + GUA_WX[mg] + '）</b></div>';
  if (zg) html += '<div><span>宅卦</span><b>' + zg + '（' + GUA_GRP[zg] + '）</b></div>';
  if (mg && zg) html += '<div><span>宅命配合</span><b>' + (GUA_GRP[mg] === GUA_GRP[zg] ? '相合' : '不合·需调和') + '</b></div>';
  if (ys) html += '<div><span>用神</span><b>' + ys + '</b></div>';
  html += '<div><span>坐向</span><b>' + esc(S.zuo) + '</b></div>';
  html += '<div><span>年份</span><b>' + year + '（' + (stars['中'] || '') + ' 入中）</b></div>';
  html += '<div><span>本期重点</span><b>' + f.label + '</b></div>';
  html += '<div><span>空间类型</span><b>' + esc(S.space) + '</b></div>';
  html += '</div>';

  html += notice('<b>说明：</b>命卦按出生年（未按立春）粗算、宅卦按你填的坐向判定；飞星按「下元」与洛书轨迹逐年排布。方位以户型实际朝向为准，坐卧朝向请以现场罗盘复核。真太阳时差按经度估算、地域五行按方位粗略划分，供环境调和参考。吉凶用于环境整理与心态提醒，不替代现实判断与专业意见。');

  /* —— 给 AI 解读用的精简上下文：只含关键参数，避免大模型拿到冗长正文后泛泛而谈 —— */
  const focusDirs = focusCells.map(p => PALACE[p].dir + '（' + stars[p] + STARS[stars[p]].name + '）').join('、');

  /* 链接性：把风水大师内部的核心因果推理显式写出，供 AI 串联而非孤立罗列 */
  let locDestiny = '';
  if (gp && ys) {
    const rel = wxRelate(gp.regionWx, ys);
    const why = rel === '生' ? '当地气场生旺用神，宜把主活动区放在用神方位顺势承接'
              : rel === '生我' ? '用神生旺当地，宜在用神方位收纳能量、避免外耗'
              : rel === '克' ? '当地克制用神，须用神方位强补、凶位空净'
              : rel === '被克' ? '用神克当地，可主动布局主导、以动制静'
              : '所在地与用神比和，按用神方位布局即安';
    locDestiny = '位置×用神：所在' + gp.regionName + '属' + gp.regionWx + '，对你用神' + ys + '属「' + rel + '」——' + why + '。';
  }
  let surLink = '';
  if (surr && surr.length && ys) {
    const near = {};
    for (const it of surr) { if (!near[it.dir] || it.dist < near[it.dir].dist) near[it.dir] = it; }
    const present = DIR8.map(d => near[d]).filter(Boolean);
    const goodHit = present.filter(p => YS[ys].good.some(g => dirKey(g) === p.d));
    const badHit = present.filter(p => YS[ys].bad.some(b => dirKey(b) === p.d));
    if (goodHit.length) surLink = '周边×用神：' + goodHit.map(p => p.d + '向' + p.label).join('、') + '落在用神有利方位，宜重点布置主活动区。';
    else if (badHit.length) surLink = '周边×用神：' + badHit.map(p => p.d + '向' + p.label).join('、') + '落在用神宜避方位，宜静置或化解。';
  }

  const aiCtx = [
    '【风水大师 · 测算摘要】',
    '位置：' + (geo && geo.city ? geo.city + '（' + geo.lat + ', ' + geo.lon + '）' : '未定位') +
      (gp ? '，地域五行' + gp.regionWx + '（' + gp.regionName + '），真太阳时差' + (gp.tzOffsetMin >= 0 ? '+' : '') + gp.tzOffsetMin + '分' : ''),
    '坐向：' + S.zuo + (zg ? '，宅卦' + zg + '（' + GUA_GRP[zg] + '）' : ''),
    (mg ? '命卦：' + mg + '（' + GUA_GRP[mg] + '·' + GUA_WX[mg] + '）；宅命' + (zg ? (GUA_GRP[mg] === GUA_GRP[zg] ? '相合' : '不合需调和') : '未知')
        : '命卦：未推算（需先完成个人命盘）'),
    (ys ? '用神：' + ys + '；有利方位' + YS[ys].good.join('、') + '，宜避' + YS[ys].bad.join('、')
        : '用神：未读取'),
    locDestiny,
    '本期重点：' + f.label + '（聚焦：' + focusDirs + '）',
    '空间类型：' + S.space + (climate ? '；' + climate : ''),
    sur.text,
    surLink,
  ].filter(Boolean).join('\n');

  const spaceLabel = S.space === '办公工位' ? '办公区' : S.space;
  const aiExtra = '这是风水大师工具。用户已提供具体测算摘要（含「位置×用神」生克与「周边×用神」方位，见上方）。请只给一条最具体的可执行建议：以所在地五行与用神方位的生克关系为理由，结合坐向、宅卦、本期飞星重点方位，以及四周建筑/水体的具体方位，说明在他' + spaceLabel +
    '的哪个方位、放什么物件、为什么。必须引用摘要中至少两项具体参数，且须包含「位置×用神」生克或「周边×用神」方位其中一项；禁止泛泛而谈、禁止复述摘要。控制在150字以内。';

  /* —— 简易版：只给结论/用神方位/本期重点一条/周边一句/布局一句 —— */
  const match = mg && zg ? (GUA_GRP[mg] === GUA_GRP[zg]) : null;
  let head = '完成个人命盘并授权定位后，即可给出专属建议。';
  if (mg && zg) head = match ? '宅命相合（' + GUA_GRP[mg] + '），按吉位布局即可增益。' : '宅命不合（命' + GUA_GRP[mg] + '·宅' + GUA_GRP[zg] + '），强化吉位、规避凶位可调和。';
  else if (mg) head = '命卦 ' + mg + '（' + GUA_GRP[mg] + '）。';
  let simpleHtml = '<div class="tw-fs-simple-head">' + head + '</div>';
  if (mg && bz) simpleHtml += baguaCompassSvg(mg, bz, ys, zg, surr);
  if (ys) simpleHtml += '<div class="tw-fs-simple-row"><span class="k">用神</span><b>' + ys + '</b><span class="g">宜 ' + YS[ys].good.join('、') + '</span><span class="b">避 ' + YS[ys].bad.join('、') + '</span></div>';
  const fc0 = focusCells[0];
  if (fc0) { const s = stars[fc0]; simpleHtml += '<div class="tw-fs-simple-row"><span class="k">本期</span><b>' + f.label + '</b><span>' + PALACE[fc0].dir + '·' + s + STARS[s].name + '：' + STAR_ADVICE[s].split('，')[0] + '。</span></div>'; }
  if (sur && sur.text && !sur.text.startsWith('周边建筑：未获取到')) simpleHtml += '<div class="tw-fs-simple-row"><span class="k">周边</span><span>' + sur.text.replace('周边环境：', '') + '</span></div>';
  if (gp) simpleHtml += '<div class="tw-fs-simple-row"><span class="k">位置</span><span>' + gp.regionName + '（属' + gp.regionWx + '）' + (climate ? '，' + climate : '') + '</span></div>';
  simpleHtml += '<div class="tw-fs-simple-row"><span class="k">布局</span><span>' + SPACE_TIPS[S.space] + '</span></div>';

  const full = html;
  html = '<div class="tw-fs-toggle" role="tablist">' +
      '<button type="button" class="tw-fs-tg active" data-v="simple">简易版</button>' +
      '<button type="button" class="tw-fs-tg" data-v="detail">详细版</button>' +
    '</div>' +
    '<div class="tw-fs-simple">' + simpleHtml + '</div>' +
    '<div class="tw-fs-detail" hidden>' + full + '</div>';

  return { html, aiCtx, aiExtra };
}

/* ============================================================
   工具定义
   ============================================================ */
export const fengshui = {
  id: 'fengshui',
  name: '风水大师',
  cat: '日常决策',
  icon: '风',
  desc: '结合当前位置、房屋坐向与你的命卦/用神，加上当年九宫飞星，用 AI 算出适合你的居所与工位布局。',
  open(container) {
    const ctx = getCtx();
    const year = new Date().getFullYear();
    const stars = yearStars(year);
    const S = { space: '住宅', focus: 'wealth', zuo: '坐北朝南', compassTxt: '', locating: false, locErr: '' };

    const geoElId = 'twFGeoNote';
    const refreshLocUI = () => {
      const statusEl = container.querySelector('.tw-fs-status');
      const geo = getWxGeo();
      const city = geo && geo.city ? geo.city : '';
      const noteEl = container.querySelector('#' + geoElId);
      if (statusEl) statusEl.innerHTML = year + '年 · ' + (city ? '已定位 ' + esc(city) : (S.locating ? '正在定位…' : '未定位'));
      if (noteEl) noteEl.textContent = S.locErr
        ? '获取定位失败：' + S.locErr + '。可直接在下方手动选择房屋坐向。'
        : (city
          ? '已获取当前位置：' + city + (geo.lat ? '（' + geo.lat + ', ' + geo.lon + '）' : '')
          : (S.locating ? '正在获取定位…' : '未获取定位。点击「获取当前位置」授权后即可按所在城市测算。'));
    };

    /* 主动定位（供手动按钮 & 打开时自动尝试） */
    const doLocate = async () => {
      if (S.locating) return;
      S.locating = true; S.locErr = ''; refreshLocUI();
      const locBtn = container.querySelector('#twFLoc');
      if (locBtn) { locBtn.disabled = true; locBtn.textContent = '定位中…'; }
      try {
        await requestGeo();
      } catch (e) {
        S.locErr = (e && e.message ? e.message : '未知错误');
      }
      S.locating = false; refreshLocUI();
      if (locBtn) { locBtn.disabled = false; locBtn.textContent = '📍 获取当前位置'; }
    };

    const render = () => {
      const ys = (ctx && ctx.wx && ctx.wx.ys) || null;
      const geo = getWxGeo();
      const locNote = geo && geo.city ? '已定位 ' + esc(geo.city) : (S.locating ? '正在定位…' : '未定位（可点击「获取当前位置」授权，或手动选择坐向）');
      container.innerHTML =
        masthead(fengshui, { sub: fengshui.desc }) +
        viewShell(
          '<div class="tw-fs-status">' + year + '年 · ' + locNote + '</div>' +
          '<div class="tw-actions tw-fs-actions">' +
            '<button type="button" class="tw-btn tw-btn-ghost" id="twFLoc">📍 获取当前位置</button>' +
          '</div>' +
          '<div class="tw-fs-compass-note" id="' + geoElId + '">' + (geo && geo.city ? '已获取当前位置：' + esc(geo.city) + (geo.lat ? '（' + geo.lat + ', ' + geo.lon + '）' : '') : (S.locating ? '正在获取定位…' : '未获取定位。点击「获取当前位置」授权后即可按所在城市测算。')) + '</div>' +
          '<div class="tw-field-grid" style="margin-top:14px">' +
            '<div class="tw-field"><label>空间类型</label><select id="twFSpace">' +
              Object.keys(SPACE_TIPS).map(k => '<option' + (k === S.space ? ' selected' : '') + '>' + k + '</option>').join('') +
            '</select></div>' +
            '<div class="tw-field"><label>本期重点</label><select id="twFFocus">' +
              Object.entries(FOCUS).map(([k, v]) => '<option value="' + k + '"' + (k === S.focus ? ' selected' : '') + '>' + v.label + '</option>').join('') +
            '</select></div>' +
          '</div>' +
          '<div class="tw-field"><label>房屋坐向（宅卦按此判定）</label>' +
            '<select id="twFZuo">' +
              Object.keys(ZUO_GUA).map(k => '<option' + (k === S.zuo ? ' selected' : '') + '>' + k + '</option>').join('') +
            '</select></div>' +
          '<div class="tw-actions tw-fs-actions">' +
            '<button type="button" class="tw-btn tw-btn-ghost" id="twFCompass">🧭 用罗盘定向</button>' +
          '</div>' +
          '<div class="tw-fs-compass-note" id="twFCompassNote">' + esc(S.compassTxt) + '</div>' +
          '<div class="tw-actions" style="margin-top:8px"><button type="button" class="tw-btn tw-btn-primary" id="twFGen">AI 测算风水布局 →</button></div>' +
          notice('<b>AI 测算：</b>结果页会结合你授权定位后的「四周建筑/道路/水体」按方位拆解，并把这些与当前位置、坐向、命卦/宅卦、用神、九宫飞星一并交给 AI，给出一条结合你处境的具体建议。')
        );

      container.querySelector('#twFSpace')?.addEventListener('change', e => { S.space = e.target.value; });
      container.querySelector('#twFFocus')?.addEventListener('change', e => { S.focus = e.target.value; });
      container.querySelector('#twFZuo')?.addEventListener('change', e => { S.zuo = e.target.value; });

      /* 获取当前位置（主动定位） */
      container.querySelector('#twFLoc')?.addEventListener('click', doLocate);

      const note = container.querySelector('#twFCompassNote');
      container.querySelector('#twFCompass')?.addEventListener('click', async () => {
        const btn = container.querySelector('#twFCompass');
        btn.disabled = true; btn.textContent = '读取中…';
        try {
          const hd = await readCompass();                       // 面向角度
          const facing = headingToDir(hd);                       // 面向方位
          const zuoLabel = ZUO_LABEL[DIR_OPP[facing]] || S.zuo;  // 坐 = 向的对宫
          S.zuo = zuoLabel;
          const sel = container.querySelector('#twFZuo');
          if (sel) sel.value = zuoLabel;
          S.compassTxt = '罗盘读数 ' + Math.round(hd) + '°，面向 ' + facing + '，即「' + zuoLabel + '」。请手持设备面向大门前进方向测量更准。';
          if (note) note.textContent = S.compassTxt;
        } catch (e) {
          S.compassTxt = '未能读取罗盘（需在 HTTPS 且授权设备方向）。可在下方手动选择坐向，或用手机指南针测出门朝向。';
          if (note) note.textContent = S.compassTxt;
        }
        btn.disabled = false; btn.textContent = '🧭 用罗盘定向';
      });

      container.querySelector('#twFGen').addEventListener('click', async () => {
        const genBtn = container.querySelector('#twFGen');
        genBtn.disabled = true;
        genBtn.textContent = '正在分析周边环境…';
        const geo = getWxGeo();
        let surr = null;
        if (geo && geo.lat != null) {
          try { surr = await fetchSurroundings(geo.lat, geo.lon); } catch (_) { surr = null; }
        }
        const out = buildResult(ctx, S, stars, year, surr);
        goResult(container, fengshui.name, out.html, {
          getSource: () => out.aiCtx,
          aiExtraSystem: out.aiExtra,
          aiDepth: true,
        });
        /* 简易版 / 详细版 切换 */
        const tgs = container.querySelectorAll('.tw-fs-tg');
        tgs.forEach(btn => btn.addEventListener('click', () => {
          const v = btn.dataset.v;
          tgs.forEach(b => b.classList.toggle('active', b === btn));
          const simple = container.querySelector('.tw-fs-simple');
          const detail = container.querySelector('.tw-fs-detail');
          if (simple) simple.hidden = v !== 'simple';
          if (detail) detail.hidden = v !== 'detail';
        }));
        genBtn.disabled = false;
        genBtn.textContent = 'AI 测算风水布局 →';
      });
    };
    render();

    /* 打开工具时若已有定位则直接用；没有则自动尝试一次（可被用户拒绝，不影响手动选择） */
    if (!getWxGeo() || !getWxGeo().city) {
      setTimeout(doLocate, 400);
    }
  },
};

export default fengshui;
