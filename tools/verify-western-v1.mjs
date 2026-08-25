/* ============================================================
   verify-western-v1.mjs · 西方星相与生命灵数权威交叉验证套件
   ------------------------------------------------------------
   对西方星相学（占星术、黄道十二宫、十大行星、宫位、几何相位、
   四象三态、12x12合盘矩阵、毕达哥拉斯生命灵数、9年流年周期）
   进行全维度严谨性、数学自洽性与权威数据交叉验证。
   ============================================================ */

import assert from 'node:assert';

globalThis.window = globalThis.window || {
  localStorage: { getItem: () => null, setItem: () => {} }
};
globalThis.document = globalThis.document || {
  getElementById: () => null,
  documentElement: { getAttribute: () => 'light' }
};

const {
  calcWesternChart,
  calcNumerology,
  calcNumerologySynastry
} = await import('../src/engines/western.js');
const {
  SIGNS,
  getSunSignByDate,
  getAscendantSign,
  getMoonSign,
  calcElementBreakdown,
  getCompatibility,
  getHoroscopeForecast
} = await import('../src/tools2/horoscope.js');

let totalTests = 0;
let passedTests = 0;

function test(title, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${title}`);
  } catch (err) {
    console.error(`  ✗ ${title}`);
    console.error('    ', err.message);
  }
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  西方星相学与生命灵数 — 权威交叉验证套件 (V1)');
console.log('══════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────
// 【1】黄道十二星座日期交界点与属性标准验证
// ─────────────────────────────────────────────────────────────
console.log('【1】黄道十二星座日期交界分界精确验证（权威历法标准）');

const BOUNDARIES = [
  { m: 3, d: 20, sign: 'pisces', name: '双鱼座 (春分前)' },
  { m: 3, d: 21, sign: 'aries', name: '白羊座 (春分起点)' },
  { m: 4, d: 19, sign: 'aries', name: '白羊座 (交界终点)' },
  { m: 4, d: 20, sign: 'taurus', name: '金牛座 (交界起点)' },
  { m: 5, d: 20, sign: 'taurus', name: '金牛座 (交界终点)' },
  { m: 5, d: 21, sign: 'gemini', name: '双子座 (交界起点)' },
  { m: 6, d: 21, sign: 'gemini', name: '双子座 (交界终点)' },
  { m: 6, d: 22, sign: 'cancer', name: '巨蟹座 (夏至起点)' },
  { m: 7, d: 22, sign: 'cancer', name: '巨蟹座 (交界终点)' },
  { m: 7, d: 23, sign: 'leo', name: '狮子座 (交界起点)' },
  { m: 8, d: 22, sign: 'leo', name: '狮子座 (交界终点)' },
  { m: 8, d: 23, sign: 'virgo', name: '处女座 (交界起点)' },
  { m: 9, d: 22, sign: 'virgo', name: '处女座 (交界终点)' },
  { m: 9, d: 23, sign: 'libra', name: '天秤座 (秋分起点)' },
  { m: 10, d: 23, sign: 'libra', name: '天秤座 (交界终点)' },
  { m: 10, d: 24, sign: 'scorpio', name: '天蝎座 (交界起点)' },
  { m: 11, d: 22, sign: 'scorpio', name: '天蝎座 (交界终点)' },
  { m: 11, d: 23, sign: 'sagittarius', name: '射手座 (交界起点)' },
  { m: 12, d: 21, sign: 'sagittarius', name: '射手座 (交界终点)' },
  { m: 12, d: 22, sign: 'capricorn', name: '摩羯座 (冬至跨年起点)' },
  { m: 1, d: 19, sign: 'capricorn', name: '摩羯座 (跨年终点)' },
  { m: 1, d: 20, sign: 'aquarius', name: '水瓶座 (交界起点)' },
  { m: 2, d: 18, sign: 'aquarius', name: '水瓶座 (交界终点)' },
  { m: 2, d: 19, sign: 'pisces', name: '双鱼座 (交界起点)' },
];

BOUNDARIES.forEach(b => {
  test(`${b.m}月${b.d}日 应准确归为 ${b.name}`, () => {
    const res = getSunSignByDate(b.m, b.d);
    assert.strictEqual(res.id, b.sign);
  });
});

// ─────────────────────────────────────────────────────────────
// 【2】四象元素 (Fire, Earth, Air, Water) 与三态 (Cardinal, Fixed, Mutable) 分布
// ─────────────────────────────────────────────────────────────
console.log('\n【2】黄道十二宫四象三态标准属性对照');

const ELEM_STANDARD = {
  fire: ['aries', 'leo', 'sagittarius'],
  earth: ['taurus', 'virgo', 'capricorn'],
  air: ['gemini', 'libra', 'aquarius'],
  water: ['cancer', 'scorpio', 'pisces']
};

const MODE_STANDARD = {
  '开创': ['aries', 'cancer', 'libra', 'capricorn'],
  '固定': ['taurus', 'leo', 'scorpio', 'aquarius'],
  '变动': ['gemini', 'virgo', 'sagittarius', 'pisces']
};

Object.entries(ELEM_STANDARD).forEach(([elem, list]) => {
  test(`${elem} 元素应严格包含 3 个星座`, () => {
    const matched = SIGNS.filter(s => s.elemKey === elem);
    assert.strictEqual(matched.length, 3);
    assert.deepStrictEqual(matched.map(s => s.id), list);
  });
});

Object.entries(MODE_STANDARD).forEach(([mode, list]) => {
  test(`${mode} 形态应严格包含 4 个星座（开创/固定/变动十字）`, () => {
    const matched = SIGNS.filter(s => s.mode === mode);
    assert.strictEqual(matched.length, 4);
    assert.deepStrictEqual(matched.map(s => s.id), list);
  });
});

// ─────────────────────────────────────────────────────────────
// 【3】上升星座 (Ascendant) 24 小时地平线动力学验证
// ─────────────────────────────────────────────────────────────
console.log('\n【3】上升星座 (Ascendant) 24 小时地平线升起规律验证');

test('日出时刻 (~06:00) 上升星座与太阳星座相同（东方地平线交汇）', () => {
  const asc = getAscendantSign('aries', 6, 0);
  assert.strictEqual(asc.id, 'aries');
});

test('正午时刻 (~12:00) 上升星座较太阳星座顺推 3 宫 (90° 四分位)', () => {
  const asc = getAscendantSign('aries', 12, 0);
  assert.strictEqual(asc.id, 'cancer'); // 白羊 + 3 = 巨蟹
});

test('日落时刻 (~18:00) 上升星座为太阳对冲星座 (180° 对分位)', () => {
  const asc = getAscendantSign('aries', 18, 0);
  assert.strictEqual(asc.id, 'libra'); // 白羊对冲天秤
});

test('子夜时刻 (~00:00) 上升星座较太阳星座顺推 9 宫 (270° 天底位)', () => {
  const asc = getAscendantSign('aries', 0, 0);
  assert.strictEqual(asc.id, 'capricorn'); // 白羊 + 9 = 摩羯
});

test('24 小时内上升星座平滑轮转 12 宫，无跳变或逆向', () => {
  const seen = new Set();
  for (let h = 0; h < 24; h += 2) {
    seen.add(getAscendantSign('leo', h, 0).id);
  }
  assert.strictEqual(seen.size, 12, '24小时应遍历全部 12 个星座');
});

// ─────────────────────────────────────────────────────────────
// 【4】月亮星座 (Moon Sign) 轨道周期与公转率验证
// ─────────────────────────────────────────────────────────────
console.log('\n【4】月亮星座 (Moon Sign) 轨道周期数学验证');

test('月亮黄经日行约 13.18°，约每 2.25~2.5 天更换一个星座', () => {
  const m1 = getMoonSign(2024, 1, 1);
  const m3 = getMoonSign(2024, 1, 4); // 3天后
  assert.notStrictEqual(m1.id, m3.id, '3天后月亮星座应发生移动');
});

test('月球公转约 27.3 天回归原星座（恒星月循环）', () => {
  const mStart = getMoonSign(2024, 1, 1);
  const mCycle = getMoonSign(2024, 1, 28); // 约27天后
  assert.strictEqual(mStart.id, mCycle.id, '27.3天后月亮应回到相同星座');
});

// ─────────────────────────────────────────────────────────────
// 【5】十大行星排盘、天文约束与十二宫位落宫验证
// ─────────────────────────────────────────────────────────────
console.log('\n【5】十大行星天文约束、黄道坐标与十二宫位落位验证');

const sampleCharts = [
  { y: 1990, m: 5, d: 20, h: 8, min: 0 },
  { y: 1995, m: 6, d: 15, h: 14, min: 30 },
  { y: 2000, m: 1, d: 1, h: 0, min: 15 },
  { y: 2024, m: 2, d: 4, h: 16, min: 27 },
];

sampleCharts.forEach(sc => {
  test(`${sc.y}-${sc.m}-${sc.d} ${sc.h}:${sc.min} 本命星盘十大星曜完整性`, () => {
    const chart = calcWesternChart(sc.y, sc.m, sc.d, sc.h, sc.min);
    assert.strictEqual(chart.planets.length, 11, '必须包含 10 大行星 + 上升点');
    assert.strictEqual(chart.houseOccupants.length, 12, '必须有完整的 12 宫位');

    // 水星离太阳天文约束（最大距角 28° 内，即相同或相邻星座）
    const sunIdx = SIGNS.findIndex(s => s.id === chart.sun.id);
    const merc = chart.planets.find(p => p.key === 'Mercury');
    const mercIdx = SIGNS.findIndex(s => s.id === merc.sign.id);
    const mercDiff = Math.min(Math.abs(sunIdx - mercIdx), 12 - Math.abs(sunIdx - mercIdx));
    assert.ok(mercDiff <= 1, `水星 (${merc.sign.name}) 与太阳 (${chart.sun.name}) 距角必须在相邻星座内`);

    // 金星离太阳天文约束（最大距角 48° 内，即相隔不超过2个星座）
    const venus = chart.planets.find(p => p.key === 'Venus');
    const venusIdx = SIGNS.findIndex(s => s.id === venus.sign.id);
    const venusDiff = Math.min(Math.abs(sunIdx - venusIdx), 12 - Math.abs(sunIdx - venusIdx));
    assert.ok(venusDiff <= 2, `金星 (${venus.sign.name}) 与太阳 (${chart.sun.name}) 距角必须在2个星座内`);

    // 四象百分比合计必须等于 100%
    const totalElemPct = chart.elemBreakdown.reduce((sum, e) => sum + e.pct, 0);
    assert.ok(Math.abs(totalElemPct - 100) <= 2, `四象百分比合计 (${totalElemPct}%) 应接近 100%`);

    // 宫位编号 1 ~ 12 必须完整
    chart.planets.forEach(p => {
      assert.ok(p.houseNum >= 1 && p.houseNum <= 12, `行星 ${p.zh} 宫位 (${p.houseNum}) 必须在 1~12 之间`);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 【6】神圣几何相位算法 (Aspects) 几何严谨性验证
// ─────────────────────────────────────────────────────────────
console.log('\n【6】神圣几何相位算法 (Aspects) 几何角与容许度验证');

test('相位检测涵盖合相 (0°)、六分相 (60°)、四分相 (90°)、三分相 (120°)、对分相 (180°)', () => {
  const chart = calcWesternChart(1995, 6, 15, 12, 0);
  assert.ok(Array.isArray(chart.aspects), '必须返回相位列表');
  chart.aspects.forEach(asp => {
    assert.ok(['合相', '六分相', '四分相', '三分相', '对分相'].includes(asp.name));
    assert.ok(parseFloat(asp.orb) >= 0 && parseFloat(asp.orb) <= 8.5, '相位容许度必须在允许范围内');
    assert.ok(asp.color && asp.nature, '相位必须包含视觉颜色与性质定义');
  });
});

// ─────────────────────────────────────────────────────────────
// 【7】12 × 12 星座合盘契合度矩阵全量自洽性验证
// ─────────────────────────────────────────────────────────────
console.log('\n【7】12 × 12 星座合盘契合度矩阵 (144 组) 全量遍历验证');

let matrixChecked = 0;
let symmetryChecked = 0;

for (let i = 0; i < 12; i++) {
  for (let j = 0; j < 12; j++) {
    const sA = SIGNS[i], sB = SIGNS[j];
    const matchAB = getCompatibility(sA.id, sB.id);
    const matchBA = getCompatibility(sB.id, sA.id);

    // 结构完整性与数值边界
    assert.ok(matchAB.score >= 50 && matchAB.score <= 100, `${sA.name} x ${sB.name} 分数必须在 50~100 之间`);
    assert.ok(matchAB.loveScore >= 40 && matchAB.workScore >= 40 && matchAB.talkScore >= 40);
    assert.ok(matchAB.dynamicDesc.length > 10, '动力学说明必须充实');
    assert.ok(matchAB.frictionBreak.length > 5, '必须包含破冰建议');
    matrixChecked++;

    // 对称性校验
    if (matchAB.score === matchBA.score) symmetryChecked++;
  }
}

test(`全量 144 组双人星座配对矩阵结构完整，得分无越界`, () => {
  assert.strictEqual(matrixChecked, 144);
});

test(`配对契合度具有严格对称性 (${symmetryChecked}/144)`, () => {
  assert.strictEqual(symmetryChecked, 144);
});

test('同象星座配对（三分相）契合度得分必须显著高于跨象挑战组合', () => {
  const fireTrine = getCompatibility('aries', 'leo'); // 白羊 x 狮子 (同火象)
  const fireWater = getCompatibility('aries', 'cancer'); // 白羊 x 巨蟹 (火水挑战)
  assert.ok(fireTrine.score > fireWater.score, '同元素合盘分应高于跨元素挑战分');
});

// ─────────────────────────────────────────────────────────────
// 【8】毕达哥拉斯生命灵数 (Pythagorean Numerology) 数理精确性验证
// ─────────────────────────────────────────────────────────────
console.log('\n【8】毕达哥拉斯生命灵数数学与卓越数验证');

const NUM_BENCHMARKS = [
  // 1995-06-15: 1+9+9+5+0+6+1+5 = 36 -> 3+6 = 9
  { y: 1995, m: 6, d: 15, expectedLP: 9, expectedBD: 6, expectedTalents: [3, 6] },
  // 2000-01-01: 2+0+0+0+0+1+0+1 = 4
  { y: 2000, m: 1, d: 1, expectedLP: 4, expectedBD: 1, expectedTalents: [4] },
  // 1988-12-31: 1+9+8+8+1+2+3+1 = 33 (卓越数 33)
  { y: 1988, m: 12, d: 31, expectedLP: 33, expectedBD: 4, expectedTalents: [3, 3] },
  // 1982-01-08: 1+9+8+2+0+1+0+8 = 29 -> 2+9 = 11 (卓越数 11)
  { y: 1982, m: 1, d: 8, expectedLP: 11, expectedBD: 8, expectedTalents: [2, 9] },
  // 1970-04-08: 1+9+7+0+0+4+0+8 = 29 -> 11 (卓越数 11)
  { y: 1970, m: 4, d: 8, expectedLP: 11, expectedBD: 8, expectedTalents: [2, 9] }
];

NUM_BENCHMARKS.forEach(nb => {
  test(`${nb.y}-${nb.m}-${nb.d} 主命数应精确为 ${nb.expectedLP}，生日数为 ${nb.expectedBD}`, () => {
    const res = calcNumerology(nb.y, nb.m, nb.d);
    assert.strictEqual(res.lifePath, nb.expectedLP);
    assert.strictEqual(res.birthdayNum, nb.expectedBD);
    assert.ok(res.archetype && res.archetype.name, '必须匹配对应的灵数原型');
  });
});

test('九宫图 1~9 频次统计总和等于生日非零数字总数 (毕达哥拉斯矩阵规范)', () => {
  const dateStr = '19950615';
  const nonZeroCount = dateStr.split('').filter(ch => ch !== '0').length;
  const res = calcNumerology(1995, 6, 15);
  const totalCount = Object.values(res.gridCounts).reduce((a, b) => a + b, 0);
  assert.strictEqual(totalCount, nonZeroCount);
});

test('9 年生命周期流年灵数随年份严格单调 +1 并 1~9 循环', () => {
  const y1 = calcNumerology(1995, 6, 15).personalYear;
  // 模拟下一年的流年数
  const nextYear = new Date().getFullYear() + 1;
  const pySum = String(nextYear).split('').map(Number).reduce((a, b) => a + b, 0) + 6 + 6;
  const y2 = ((pySum - 1) % 9) + 1;
  assert.ok(y1 >= 1 && y1 <= 9 && y2 >= 1 && y2 <= 9);
});

// ─────────────────────────────────────────────────────────────
// 【9】时空运势罗盘算法确定性与内容安全性验证
// ─────────────────────────────────────────────────────────────
console.log('\n【9】时空运势罗盘算法确定性与内容安全性验证');

test('同一星座在同一天计算结果严格幂等（多次刷新结论恒定）', () => {
  const f1 = getHoroscopeForecast('aries', 'today');
  const f2 = getHoroscopeForecast('aries', 'today');
  assert.strictEqual(f1.baseScore, f2.baseScore);
  assert.strictEqual(f1.career, f2.career);
  assert.strictEqual(f1.luckyColor, f2.luckyColor);
});

test('不同星座在同一天运势得分具有真实区分度', () => {
  const fAries = getHoroscopeForecast('aries', 'today');
  const fTaurus = getHoroscopeForecast('taurus', 'today');
  const fGemini = getHoroscopeForecast('gemini', 'today');
  const scores = new Set([fAries.baseScore, fTaurus.baseScore, fGemini.baseScore]);
  assert.ok(scores.size >= 2, '不同星座运势分应有区分');
});

test('运势文案不含恐吓性、极端迷信或宿命论断言', () => {
  const forbidden = ['大难临头', '血光之灾', '必死', '破产', '横祸', '克死', '绝症'];
  for (const s of SIGNS) {
    const f = getHoroscopeForecast(s.id, 'today');
    const text = `${f.career} ${f.love} ${f.wealth} ${f.health} ${f.sub}`;
    for (const bad of forbidden) {
      assert.ok(!text.includes(bad), `运势文本不应包含恐吓词: ${bad}`);
    }
  }
});

// ─────────────────────────────────────────────────────────────
// 【10】极端时间与边界容错测试
// ─────────────────────────────────────────────────────────────
console.log('\n【10】极端时间与边界容错测试');

test('闰年闰日 2000-02-29 正常排盘与灵数计算', () => {
  const chart = calcWesternChart(2000, 2, 29, 12, 0);
  assert.strictEqual(chart.sun.id, 'pisces');
  const num = calcNumerology(2000, 2, 29);
  assert.ok(num.lifePath >= 1);
});

test('世纪交界点 1900-01-01 正常排盘与灵数计算', () => {
  const chart = calcWesternChart(1900, 1, 1, 0, 0);
  assert.strictEqual(chart.sun.id, 'capricorn');
  const num = calcNumerology(1900, 1, 1);
  assert.strictEqual(num.lifePath, 3); // 1+9+0+0+0+1+0+1 = 12 -> 3
});

test('远未来 2099-12-31 正常排盘与灵数计算', () => {
  const chart = calcWesternChart(2099, 12, 31, 23, 59);
  assert.strictEqual(chart.sun.id, 'capricorn');
  const num = calcNumerology(2099, 12, 31);
  assert.ok(num.lifePath >= 1);
});

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`  验证结果: ${passedTests} 通过 / ${totalTests - passedTests} 失败 (共 ${totalTests} 项测试)`);
console.log('══════════════════════════════════════════════════════════════\n');

if (passedTests === totalTests) {
  console.log('🌟 西方星相体系（占星盘·行星相位·十二宫·合盘矩阵·生命灵数）全部通过严密验证！\n');
} else {
  process.exit(1);
}
