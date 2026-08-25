/* ============================================================
   western.js · 西方星相与生命灵数高精天文算法引擎
   ------------------------------------------------------------
   纯函数设计，不依赖 DOM，算法包含：
     1. 儒略日 (Julian Day) 与视太阳时精确换算
     2. 开普勒开普勒行星开普勒摄动模型 (Keplerian Orbital Model)
        - 太阳真黄经 (True Solar Longitude)
        - 月亮真黄经 (Perturbed Lunar Longitude · 出差/二均差/变差)
        - 八大行星地心视黄经 (Geocentric Tropical Longitudes)
     3. 恒星时 (GMST/LMST) 与三角几何上升点 (Ascendant) / 天顶 (MC) 精算
     4. 托勒密主要几何相位 (Major Ptolemaic Aspects: 0°/60°/90°/120°/180°)
     5. 毕达哥拉斯生命灵数 (Pythagorean Numerology: 主命数/卓越数11,22,33/流年周期)
   ============================================================ */

import { SIGNS, getSunSignByDate } from '../tools2/horoscope.js';

/* —— 基础天文数学辅助函数 —— */
function norm360(d) {
  let res = d % 360;
  return res < 0 ? res + 360 : res;
}
function rad(d) { return d * Math.PI / 180; }
function deg(r) { return r * 180 / Math.PI; }

/** 计算儒略日 (Julian Day) */
export function calcJulianDay(y, m, d, h = 12, min = 0, tzOffset = 8) {
  let year = Number(y) || 1995;
  let month = Number(m) || 6;
  const day = Number(d) || 15;
  const hour = Number(h) || 12;
  const minute = Number(min) || 0;

  // 转换为 UTC 历法时间
  const utcHour = hour + minute / 60 - tzOffset;
  const dayFraction = day + utcHour / 24;

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + dayFraction + B - 1524.5;
}

/** 太阳真黄经精算 (True Sun Longitude) */
export function calcSunLongitude(jd) {
  const n = jd - 2451545.0;
  const L = norm360(280.460 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n);
  const lambda = norm360(L + 1.915 * Math.sin(rad(g)) + 0.020 * Math.sin(rad(2 * g)));
  return lambda;
}

/** 月亮真黄经精算 (Lunar Perturbations Longitude) */
export function calcMoonLongitude(jd) {
  const n = jd - 2451545.0;
  const L_prime = norm360(218.316 + 13.176396 * n);
  const M_prime = norm360(134.963 + 13.064993 * n);
  const D = norm360(297.850 + 12.190749 * n);
  const g = norm360(357.528 + 0.9856003 * n);
  const F = norm360(93.272 + 13.229350 * n);

  const lambda = L_prime +
    6.289 * Math.sin(rad(M_prime)) -
    1.274 * Math.sin(rad(M_prime - 2 * D)) +
    0.658 * Math.sin(rad(2 * D)) -
    0.214 * Math.sin(rad(2 * M_prime)) -
    0.186 * Math.sin(rad(g)) -
    0.114 * Math.sin(rad(2 * F));
  return norm360(lambda);
}

/** 行星地心视黄经精算 (Geocentric Planetary Longitude) */
const PLANET_KEPLER_ELEMENTS = {
  Mercury: { L0: 252.2509, rate: 4.0923344, a: 0.387098, e: 0.20563 },
  Venus:   { L0: 181.9798, rate: 1.6021303, a: 0.723332, e: 0.00677 },
  Mars:    { L0: 355.4330, rate: 0.5240330, a: 1.523688, e: 0.09340 },
  Jupiter: { L0: 34.3515,  rate: 0.0830853, a: 5.202603, e: 0.04849 },
  Saturn:  { L0: 50.0774,  rate: 0.0334441, a: 9.554909, e: 0.05551 },
  Uranus:  { L0: 314.0550, rate: 0.0117283, a: 19.21845, e: 0.04630 },
  Neptune: { L0: 304.3487, rate: 0.0059810, a: 30.11039, e: 0.00946 },
  Pluto:   { L0: 238.9290, rate: 0.0039640, a: 39.48212, e: 0.24881 }
};

export function calcPlanetLongitude(jd, planetKey, sunLong) {
  const n = jd - 2451545.0;
  const sunRad = rad(sunLong);
  const xEarth = Math.cos(sunRad + Math.PI);
  const yEarth = Math.sin(sunRad + Math.PI);

  const el = PLANET_KEPLER_ELEMENTS[planetKey];
  if (!el) return 0;

  const M = norm360(el.L0 + el.rate * n);
  const v = M + deg(2 * el.e * Math.sin(rad(M)));
  const r = el.a * (1 - el.e * el.e) / (1 + el.e * Math.cos(rad(v - M)));

  const vRad = rad(v);
  const xHeliocentric = r * Math.cos(vRad);
  const yHeliocentric = r * Math.sin(vRad);

  const xGeo = xHeliocentric - xEarth;
  const yGeo = yHeliocentric - yEarth;

  const lambdaGeo = deg(Math.atan2(yGeo, xGeo));
  return norm360(lambdaGeo);
}

/** 恒星时与三角几何上升点精算 (Trigonometric Ascendant) */
export function calcTrueAscendant(jd, lat = 39.9, lon = 116.4) {
  const T = (jd - 2451545.0) / 36525.0;
  // 格林威治平恒星时 (GMST)
  const gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T);
  const ramc = norm360(gmst + lon);
  const eps = 23.4392911 - 0.0130042 * T; // 黄赤交角

  const sinRAMC = Math.sin(rad(ramc));
  const cosRAMC = Math.cos(rad(ramc));
  const sinEps = Math.sin(rad(eps));
  const cosEps = Math.cos(rad(eps));
  const tanLat = Math.tan(rad(lat));

  const y = cosRAMC;
  const x = -sinRAMC * cosEps - tanLat * sinEps;
  const ascDeg = norm360(deg(Math.atan2(y, x)));
  return ascDeg;
}

/* —— 符号与名称元数据 —— */
const PLANET_METAS = {
  Sun:     { zh: '太阳', symbol: '☉', mean: '核心本我 · 意志驱动' },
  Moon:    { zh: '月亮', symbol: '☽', mean: '内心情绪 · 安全感源泉' },
  Asc:     { zh: '上升', symbol: 'AC', mean: '外在面具 · 人生第一名片' },
  Mercury: { zh: '水星', symbol: '☿', mean: '思维逻辑 · 沟通表达' },
  Venus:   { zh: '金星', symbol: '♀', mean: '审美喜好 · 情感互动' },
  Mars:    { zh: '火星', symbol: '♂', mean: '行动魄力 · 竞争欲望' },
  Jupiter: { zh: '木星', symbol: '♃', mean: '幸运机遇 · 扩张格局' },
  Saturn:  { zh: '土星', symbol: '♄', mean: '责任边界 · 长期磨砺' },
  Uranus:  { zh: '天王星', symbol: '♅', mean: '独创变革 · 跳跃灵感' },
  Neptune: { zh: '海王星', symbol: '♆', mean: '灵性直觉 · 艺术梦幻' },
  Pluto:   { zh: '冥王星', symbol: '♇', mean: '深层洞察 · 蜕变重生' }
};

const HOUSES = [
  { num: 1, name: '第一宫 · 命宫 (上升)', theme: '自我形象 · 人格面具 · 生命原动力' },
  { num: 2, name: '第二宫 · 财帛宫', theme: '个人资源 · 赚钱能力 · 物质安全感' },
  { num: 3, name: '第三宫 · 兄弟宫', theme: '思维沟通 · 早期学习 · 近距离社交' },
  { num: 4, name: '第四宫 · 田宅宫 (天底)', theme: '家庭根基 · 内心归宿 · 晚年环境' },
  { num: 5, name: '第五宫 · 男女宫', theme: '创造力 · 恋爱浪漫 · 娱乐与自我展现' },
  { num: 6, name: '第六宫 · 疾厄宫', theme: '日常工作 · 健康管理 · 细节服务' },
  { num: 7, name: '第七宫 · 夫妻宫 (下降)', theme: '深度关系 · 伴侣合作 · 契约同盟' },
  { num: 8, name: '第八宫 · 疾厄宫 (蜕变)', theme: '他人资源 · 亲密深度 · 危机转化' },
  { num: 9, name: '第九宫 · 迁移宫', theme: '高等智慧 · 哲学信仰 · 跨国远行' },
  { num: 10, name: '第十宫 · 官禄宫 (中天)', theme: '社会地位 · 事业巅峰 · 公众成就' },
  { num: 11, name: '第十一宫 · 福德宫', theme: '社群圈层 · 远大理想 · 朋友互助' },
  { num: 12, name: '第十二宫 · 玄秘宫', theme: '潜意识 · 隐秘沉淀 · 心灵修行' }
];

/* —— 西方本命星盘排盘全量推演 —— */
export function calcWesternChart(year = 1995, month = 6, day = 15, hour = 12, minute = 0, lon = 116.4, lat = 39.9, tzOffset = 8) {
  const y = Number(year) || 1995, m = Number(month) || 6, d = Number(day) || 15;
  const h = Number(hour) || 12, min = Number(minute) || 0;

  const jd = calcJulianDay(y, m, d, h, min, tzOffset);

  // 1. 精确计算太阳、月亮与上升黄经
  const sunAbsDeg = calcSunLongitude(jd);
  const moonAbsDeg = calcMoonLongitude(jd);
  const ascAbsDeg = calcTrueAscendant(jd, lat, lon);

  const sunSignIdx = Math.floor(sunAbsDeg / 30) % 12;
  const moonSignIdx = Math.floor(moonAbsDeg / 30) % 12;
  const ascSignIdx = Math.floor(ascAbsDeg / 30) % 12;

  const sun = SIGNS[sunSignIdx];
  const moon = SIGNS[moonSignIdx];
  const asc = SIGNS[ascSignIdx];

  // 2. 精确计算 8 大行星地心黄经
  const planetKeys = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const planets = [
    { key: 'Sun', ...PLANET_METAS.Sun, sign: sun, absDegree: sunAbsDeg, degree: (sunAbsDeg % 30).toFixed(1) + '°' },
    { key: 'Moon', ...PLANET_METAS.Moon, sign: moon, absDegree: moonAbsDeg, degree: (moonAbsDeg % 30).toFixed(1) + '°' },
    { key: 'Asc', ...PLANET_METAS.Asc, sign: asc, absDegree: ascAbsDeg, degree: (ascAbsDeg % 30).toFixed(1) + '°' }
  ];

  planetKeys.forEach(pKey => {
    const absDeg = calcPlanetLongitude(jd, pKey, sunAbsDeg);
    const sIdx = Math.floor(absDeg / 30) % 12;
    planets.push({
      key: pKey,
      ...PLANET_METAS[pKey],
      sign: SIGNS[sIdx],
      absDegree: absDeg,
      degree: (absDeg % 30).toFixed(1) + '°'
    });
  });

  // 3. 计算 12 宫位分配
  const houseOccupants = Array.from({ length: 12 }, (_, i) => ({
    house: HOUSES[i],
    sign: SIGNS[(ascSignIdx + i) % 12],
    planets: []
  }));

  planets.forEach(p => {
    const houseIdx = Math.floor(norm360(p.absDegree - ascAbsDeg) / 30) % 12;
    p.houseNum = houseIdx + 1;
    if (houseOccupants[houseIdx]) {
      houseOccupants[houseIdx].planets.push(p);
    }
  });

  // 4. 计算行星几何相位 (Major Ptolemaic Aspects)
  const aspects = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i], p2 = planets[j];
      const diff = Math.min(Math.abs(p1.absDegree - p2.absDegree), 360 - Math.abs(p1.absDegree - p2.absDegree));

      let aspect = null;
      if (diff <= 8) {
        aspect = { p1, p2, angle: 0, name: '合相', symbol: '☌', orb: diff.toFixed(1), nature: '融合', color: '#d4a04a', type: 'conjunction', strokeStyle: 'solid' };
      } else if (Math.abs(diff - 60) <= 6) {
        aspect = { p1, p2, angle: 60, name: '六分相', symbol: '⚹', orb: Math.abs(diff - 60).toFixed(1), nature: '调和契机', color: '#3a8696', type: 'sextile', strokeStyle: 'dashed' };
      } else if (Math.abs(diff - 90) <= 7) {
        aspect = { p1, p2, angle: 90, name: '四分相', symbol: '□', orb: Math.abs(diff - 90).toFixed(1), nature: '挑战动力', color: '#d97757', type: 'square', strokeStyle: 'dashed' };
      } else if (Math.abs(diff - 120) <= 8) {
        aspect = { p1, p2, angle: 120, name: '三分相', symbol: '△', orb: Math.abs(diff - 120).toFixed(1), nature: '顺畅天赋', color: '#7ab648', type: 'trine', strokeStyle: 'solid' };
      } else if (Math.abs(diff - 180) <= 8) {
        aspect = { p1, p2, angle: 180, name: '对分相', symbol: '☍', orb: Math.abs(diff - 180).toFixed(1), nature: '对立张力', color: '#d4654a', type: 'opposition', strokeStyle: 'solid' };
      }

      if (aspect) aspects.push(aspect);
    }
  }

  // 5. 四象与三态统计
  const elemCount = { fire: 0, earth: 0, air: 0, water: 0 };
  const modeCount = { '开创': 0, '固定': 0, '变动': 0 };
  planets.forEach(p => {
    elemCount[p.sign.elemKey] = (elemCount[p.sign.elemKey] || 0) + 1;
    modeCount[p.sign.mode] = (modeCount[p.sign.mode] || 0) + 1;
  });

  const totalPlanets = planets.length;
  const elemBreakdown = [
    { key: 'fire', name: '火象', iconKey: 'fire', pct: Math.round(elemCount.fire / totalPlanets * 100), count: elemCount.fire, color: '#e05a47' },
    { key: 'earth', name: '土象', iconKey: 'earth', pct: Math.round(elemCount.earth / totalPlanets * 100), count: elemCount.earth, color: '#5c8d62' },
    { key: 'air', name: '风象', iconKey: 'air', pct: Math.round(elemCount.air / totalPlanets * 100), count: elemCount.air, color: '#d4a34b' },
    { key: 'water', name: '水象', iconKey: 'water', pct: Math.round(elemCount.water / totalPlanets * 100), count: elemCount.water, color: '#5e7fa2' }
  ].sort((a, b) => b.pct - a.pct);

  return {
    sun, moon, asc,
    planets,
    aspects,
    houseOccupants,
    elemBreakdown,
    modeCount,
    dominantElem: elemBreakdown[0],
    deficitElem: elemBreakdown[elemBreakdown.length - 1]
  };
}

/* —— 毕达哥拉斯生命灵数 (Pythagorean Numerology) —— */
const NUM_ARCHETYPES = {
  1: { name: '开创者 / 领袖', tag: '独立 · 魄力 · 决断 · 原创',
       strength: '拥有极强的主动性与开拓力，勇于开创新局，天生具有领袖风范与行动力。',
       growth: '学会倾听与团队协作，避免过于独断或急躁冲动。' },
  2: { name: '协调者 / 和平使者', tag: '合作 · 细腻 · 同理 · 默契',
       strength: '极具同理心与外交斡旋智慧，善于倾听、协调矛盾，是团队中温暖的粘合剂。',
       growth: '建立坚定的自我边界，学会表达自身需求，避免委曲求全。' },
  3: { name: '表达者 / 创意之星', tag: '表达 · 灵感 · 乐观 · 艺术',
       strength: '天生的沟通与创意天才，思维活跃、幽默感强，善于用语言和艺术感染周围。',
       growth: '强化专注与落地韧性，避免力量分散与三分钟热度。' },
  4: { name: '建设者 / 稳固基石', tag: '秩序 · 务实 · 严谨 · 坚韧',
       strength: '条理清晰、自律可靠，懂得循序渐进搭建扎实结构，是极为值得信赖的建设者。',
       growth: '保持思维弹性，接纳生活中的变化与不完美，适当给自己减压。' },
  5: { name: '探险家 / 自由之风', tag: '自由 · 冒险 · 灵活 · 突破',
       strength: '拥抱变化与新鲜体验，适应力极强，总能在多变环境中迅速找到突破口。',
       growth: '培养长期主义耐性，在探索的同时建立生活与财务锚点。' },
  6: { name: '滋养者 / 爱与守护', tag: '关怀 · 责任 · 和谐 · 奉献',
       strength: '极具家庭关怀与服务精神，追求美与和谐，乐于为他人提供支持与庇护。',
       growth: '在照顾他人的同时优先滋养自己，避免过度牺牲或控制欲。' },
  7: { name: '求索者 / 哲思智者', tag: '洞察 · 探究 · 直觉 · 智慧',
       strength: '深邃的直觉与钻研精神，不随波逐流，致力于探索万物背后的底层逻辑与真理。',
       growth: '适度向外敞开心扉，把深层智慧转化为与世界连接的温暖桥梁。' },
  8: { name: '统帅者 / 丰盛成就', tag: '魄力 · 财富 · 统筹 · 显化',
       strength: '对宏观大局、商业价值与资源整合拥有卓越眼光，敢于承担大任并显化丰硕成果。',
       growth: '保持精神追求与物质收获的平衡，以利他之心驾驭力量。' },
  9: { name: '博爱者 / 慈悲智者', tag: '宏大 · 慈悲 · 奉献 · 圆满',
       strength: '胸怀天下、大爱无疆，拥有跨越格局的包容力与人道关怀，是天然的精神引路人。',
       growth: '学会放下过去的执念与救世主情结，脚踏实地做好当下的具体事。' },
  11: { name: '灵性梦想家 (卓越数 11/2)', tag: '直觉启蒙 · 灵性共振 · 愿景之光',
        strength: '兼具 1 的开创与 2 的细腻，拥有极高的灵性直觉与感召力，能点亮他人内心。',
        growth: '将高维愿景落地到现实实践中，保持身心接地气。' },
  22: { name: '宏图大建筑师 (卓越数 22/4)', tag: '宏大建构 · 战略远见 · 丰功伟绩',
        strength: '兼具 2 的外交智慧与 4 的钢铁执行力，擅长将最宏大的理想建构成现实大厦。',
        growth: '管理好巨大的内在压力，避免过于严苛而透支精力。' },
  33: { name: '慈悲大宗师 (卓越数 33/6)', tag: '无私大爱 · 疗愈赋能 · 精神灯塔',
        strength: '具备最高阶的情感滋养与精神疗愈能量，能无私赋能并照亮广大群体。',
        growth: '设立健康的能量保护机制，避免被外界负能量过度损耗。' }
};

function reduceNumber(num, keepMaster = true) {
  let cur = Number(num);
  while (cur > 9) {
    if (keepMaster && (cur === 11 || cur === 22 || cur === 33)) break;
    const digits = String(cur).split('').map(Number);
    cur = digits.reduce((a, b) => a + b, 0);
  }
  return cur;
}

export function calcNumerology(year = 1995, month = 6, day = 15) {
  const y = Number(year) || 1995, m = Number(month) || 6, d = Number(day) || 15;
  const nowYear = new Date().getFullYear();

  const fullStr = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
  const sum1 = fullStr.split('').map(Number).reduce((a, b) => a + b, 0);
  const lifePath = reduceNumber(sum1, true);
  const birthdayNum = reduceNumber(d, false);
  const talentNums = String(sum1).split('').map(Number);

  const gridCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  fullStr.split('').map(Number).forEach(digit => {
    if (digit >= 1 && digit <= 9) gridCounts[digit]++;
  });

  const LINES = [
    { key: '1-2-3', name: '艺术灵感线', nums: [1, 2, 3], desc: '具备极佳的审美、情感表达与艺术通感力' },
    { key: '4-5-6', name: '秩序执行线', nums: [4, 5, 6], desc: '做事极具条理、踏实可靠、注重落地执行' },
    { key: '7-8-9', name: '权力智慧线', nums: [7, 8, 9], desc: '拥有远大格局、贵人运旺、具备卓越谋略' },
    { key: '1-4-7', name: '务实物质线', nums: [1, 4, 7], desc: '重视安全感与现实基础、脚踏实地累积财富' },
    { key: '2-5-8', name: '同理情感线', nums: [2, 5, 8], desc: '富有同情心与人际亲和力、善解人意' },
    { key: '3-6-9', name: '智慧灵性线', nums: [3, 6, 9], desc: '聪明敏锐、善于思考形而上理念、理解力极强' },
    { key: '1-5-9', name: '事业主见线', nums: [1, 5, 9], desc: '意志坚定、追求自由与成就、不轻言放弃' },
    { key: '3-5-7', name: '直觉洞察线', nums: [3, 5, 7], desc: '拥有惊人的第六感与好奇心、善于捕捉机遇' },
  ];

  const activeLines = LINES.filter(l => l.nums.every(n => gridCounts[n] > 0));
  const missingNums = Object.entries(gridCounts).filter(([_, c]) => c === 0).map(([n]) => Number(n));

  const pySum = String(nowYear).split('').map(Number).reduce((a, b) => a + b, 0) +
                String(m).split('').map(Number).reduce((a, b) => a + b, 0) +
                String(d).split('').map(Number).reduce((a, b) => a + b, 0);
  const personalYear = reduceNumber(pySum, false);

  const PY_GUIDES = {
    1: { theme: '播种与全新开端', advice: '这是全新 9 年生命周期的第 1 年！适合大胆启动新计划、学习新技能，确立新方向。' },
    2: { theme: '合作与耐心蓄力', advice: '注重人际协作与关系维护，凡事不宜急进，以柔克刚、静待种子生根发芽。' },
    3: { theme: '表达与创意绽放', advice: '灵感充沛、社交活跃，适合拓展人脉、展示个人作品与才华，拥抱生活乐趣。' },
    4: { theme: '稳固基石与秩序落地', advice: '脚踏实地完善各项流程，看紧财务与健康，把过去两年的想法打牢地基。' },
    5: { theme: '转折与自由突破', advice: '9 年周期的中间转折点！会有突发变化或旅行远行机会，勇敢跳出舒适区。' },
    6: { theme: '家庭关怀与责任担当', advice: '重点回归家庭与亲密关系，适合处理房产、装点生活环境，传递爱与温暖。' },
    7: { theme: '向内探索与深层复盘', advice: '适合静心沉淀、读书学习、向内审视，不要盲目扩张，磨砺内在智慧。' },
    8: { theme: '丰盛收获与物质显化', advice: '迎来商业成果与权威认可的高光年份！敢于担当大项目，把握财富契机。' },
    9: { theme: '圆满收官与断舍离', advice: '9 年周期的总结之年。清理消耗你的人事物，做好收尾与复盘，为新循环蓄力。' }
  };

  const archetype = NUM_ARCHETYPES[lifePath] || NUM_ARCHETYPES[reduceNumber(lifePath, false)] || NUM_ARCHETYPES[1];

  return {
    lifePath,
    birthdayNum,
    talentNums,
    gridCounts,
    activeLines,
    missingNums,
    personalYear,
    personalYearGuide: PY_GUIDES[personalYear] || PY_GUIDES[1],
    archetype
  };
}

export function calcNumerologySynastry(lifePathA, lifePathB) {
  const numA = Number(lifePathA) || 1;
  const numB = Number(lifePathB) || 1;
  const baseA = reduceNumber(numA, false);
  const baseB = reduceNumber(numB, false);

  let score = 75;
  let dynamic = '互补共进';
  let advice = '';

  if (baseA === baseB) {
    score = 88;
    dynamic = '同频镜像 · 深刻共振';
    advice = '你们的核心人生课题高度一致，能瞬间理解对方的抱负与痛点。注意在分歧时彼此退后一步。';
  } else if ((baseA + baseB === 10) || (Math.abs(baseA - baseB) === 3)) {
    score = 94;
    dynamic = '天作之合 · 能量相生';
    advice = '你们的主命数能量形成天然的完美闭环，一个善于开拓一个善于滋养，极具长久成长性。';
  } else if ((baseA % 2) === (baseB % 2)) {
    score = 82;
    dynamic = '节奏和谐 · 默契相伴';
    advice = '同属于阳性（奇数）或阴性（偶数）能量，行事节奏与生活步调自然合拍。';
  } else {
    score = 70;
    dynamic = '跨界磨合 · 拓宽视野';
    advice = '差异带来强烈的吸引力，相处中多倾听对方不同的处事智慧，把差异转化为共同的财富。';
  }

  return {
    score,
    dynamic,
    advice,
    archetypeA: NUM_ARCHETYPES[numA] || NUM_ARCHETYPES[baseA],
    archetypeB: NUM_ARCHETYPES[numB] || NUM_ARCHETYPES[baseB]
  };
}
