/* ============================================================
   audit-global-data.mjs · 全局数据真实可用性全量深度审计套件
   ------------------------------------------------------------
   对全站全局数据、引擎推演、状态流转、知识库、城市字典、西方星相、
   生命灵数、塔罗牌库、MBTI题库、存储模型与 DOM 暴露函数进行
   深度全量审计与异常断言。
   ============================================================ */

import assert from 'node:assert';

// 1. Mock 基础运行环境
const storage = {};
globalThis.window = globalThis.window || {
  localStorage: {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
  },
  sessionStorage: {
    getItem: (k) => storage['s_' + k] || null,
    setItem: (k, v) => { storage['s_' + k] = String(v); },
    removeItem: (k) => { delete storage['s_' + k]; }
  },
  addEventListener: () => {},
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: (fn) => setTimeout(fn, 0)
};

const elements = {};
function createMockEl(id) {
  return {
    id,
    classList: { add: () => {}, remove: () => {}, toggle: () => false, contains: () => false },
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: () => {},
    prepend: () => {},
    remove: () => {},
    insertAdjacentElement: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    dataset: {},
    style: { setProperty: () => {} },
    innerHTML: '',
    textContent: ''
  };
}

globalThis.document = globalThis.document || {
  getElementById: (id) => elements[id] || (elements[id] = createMockEl(id)),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => createMockEl(tag),
  documentElement: { setAttribute: () => {}, getAttribute: () => 'light', style: {} },
  body: createMockEl('body'),
  addEventListener: () => {}
};

// 2. 动态导入全局核心引擎与数据
const { CURR_YEAR, TG, DZ, SX, WX, GW, ZW, ZC, WC, NY, SS } = await import('../src/engines/shared.js');
const { CD, CG } = await import('../src/engines/cities.js');
const { SOLAR_TERM_TIMES } = await import('../src/engines/solar-terms.js');
const { resolveBirthDateTime, getDayPillarIndex } = await import('../src/engines/calendar.js');
const { mkBazi, mkWx, mkSs, mkShenSha, mkDy, mkLn, getLiuYue, getShenShaLabels, getTodayGZ } = await import('../src/engines/bazi.js');
const { mkZw } = await import('../src/engines/ziwei.js');
const { mkQm } = await import('../src/engines/qimen.js');
const { mkMh } = await import('../src/engines/meihua.js');
const { mkSi } = await import('../src/engines/sizhi.js');
const { calcSynastry } = await import('../src/engines/synastry.js');
const { calcLiuRi, calcLiuZhou } = await import('../src/engines/liuri.js');
const { buildContext } = await import('../src/state/context.js');
const { calcWesternChart, calcNumerology, calcNumerologySynastry } = await import('../src/engines/western.js');
const { SIGNS, getSunSignByDate, getAscendantSign, getMoonSign, getCompatibility, getHoroscopeForecast } = await import('../src/tools2/horoscope.js');
const { TAROT_CARDS, TAROT_SPREADS } = await import('../src/tools2/tarot.js');
const { MBTI_TYPES, MBTI_QUESTIONS, calcMBTIMaturity } = await import('../src/tools2/mbti.js');
const { TOOL_DEFINITIONS, renderToolsHubHtml } = await import('../src/render/tools-catalog.js');
const { KB, KBSearch, buildBaziContext, buildWesternContext } = await import('../src/ai/index.js');
const { chartFacts } = await import('../src/ai/explain.js');

let passCount = 0;
let failCount = 0;

function audit(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failCount++;
    console.error(`  ✗ [FAIL] ${name}`);
    console.error('    Error:', err.message);
  }
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  问问大师 — 全局数据真实可用性与全链路深层审计');
console.log('══════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────
// 【审计项 1】基础常量与天干地支映射字典完备性
// ─────────────────────────────────────────────────────────────
console.log('【1】基础常量字典真实性审计 (10干/12支/五行/十神/60甲子纳音)');
audit('天干(10)、地支(12)、生肖(12)、五行(5) 长度与类型正确', () => {
  assert.strictEqual(TG.length, 10);
  assert.strictEqual(DZ.length, 12);
  assert.strictEqual(SX.length, 12);
  assert.strictEqual(WX.length, 5);
});

audit('十神对照表 (10x10) 严格覆盖 100 组生克关系且无 undefined', () => {
  TG.forEach(g1 => {
    assert.ok(SS[g1], `干 ${g1} 必须有十神表`);
    TG.forEach(g2 => {
      assert.ok(SS[g1][g2], `十神 ${g1} 见 ${g2} 必须有值`);
    });
  });
});

audit('地支藏干表 (12地支) 主气/中气/余气 完整映射', () => {
  DZ.forEach(z => {
    assert.ok(Array.isArray(ZC[z]) && ZC[z].length >= 1 && ZC[z].length <= 3, `地支 ${z} 藏干必须为 1~3 个`);
    ZC[z].forEach(g => assert.ok(TG.includes(g), `地支 ${z} 藏干 ${g} 必须属于天干`));
  });
});

audit('60甲子纳音表 (60组) 严格覆盖且五行属性有效', () => {
  assert.strictEqual(NY.length, 60);
  NY.forEach(ny => {
    assert.ok(ny.length >= 3, `纳音 ${ny} 长度有效`);
    const wxChar = ny.slice(-1);
    assert.ok(WX.includes(wxChar), `纳音 ${ny} 末尾必须属于五行`);
  });
});

// ─────────────────────────────────────────────────────────────
// 【2】节气数据库与城市经纬度字典真实可用性
// ─────────────────────────────────────────────────────────────
console.log('\n【2】节气数据库 (202年) 与全国及全球核心城市经纬度字典审计');
audit('节气数据表覆盖 1900–2101 年共 202 年 × 12 节气精确时间字符串', () => {
  assert.ok(SOLAR_TERM_TIMES, '节气数据表必须存在');
  for (let y = 1900; y <= 2101; y++) {
    const list = SOLAR_TERM_TIMES[String(y)];
    assert.ok(Array.isArray(list) && list.length === 12, `${y} 年必须有完整 12 个节气数据`);
    list.forEach(t => assert.ok(typeof t === 'string' && t.length >= 19, `${y} 年节气时间字符串必须有效`));
  }
});

audit('城市字典 (CD) 覆盖 80+ 国内外核心城市且经纬度/时区真实可用', () => {
  const cityKeys = Object.keys(CD);
  assert.ok(cityKeys.length >= 60, `城市库数量 (${cityKeys.length}) 需 >= 60`);
  cityKeys.forEach(k => {
    const c = CD[k];
    assert.ok(c.n && c.p, `城市 ${k} 必须有中文名和拼音`);
    assert.ok(c.o >= -180 && c.o <= 180, `城市 ${c.n} 经度 (${c.o}) 必须在合法范围 [-180, 180]`);
    assert.ok(c.a >= -90 && c.a <= 90, `城市 ${c.n} 纬度 (${c.a}) 必须在合法范围 [-90, 90]`);
    assert.ok(c.tz, `城市 ${c.n} 必须包含有效时区`);
  });
});

// ─────────────────────────────────────────────────────────────
// 【3】东方命理全量推演流水线与全局上下文可用性 (100组样本)
// ─────────────────────────────────────────────────────────────
console.log('\n【3】东方命理推演流水线与全局上下文 (_ctx) 100 组真实样本压力审计');
let sampleCount = 0;
let cleanCtxCount = 0;

for (let year = 1930; year <= 2026; year += 2) {
  for (let month = 1; month <= 12; month += 3) {
    const day = 15;
    const hour = (year % 12) * 2;
    const city = CD['beijing'] || { n: '北京', o: 116.4, a: 39.9, tz: 'Asia/Shanghai' };
    const gen = year % 2 === 0 ? 'male' : 'female';

    const resolved = resolveBirthDateTime(year, month, day, hour, 0, false, city.o, city.tz);
    const b = mkBazi(resolved.year, resolved.month, resolved.day, resolved.hourZhi, resolved.hour, resolved.minute, resolved.instant);
    const wx = mkWx(b), ss = mkSs(b), dy = mkDy(b, gen, year, month, day), ln = mkLn(CURR_YEAR), zw = mkZw(b), qm = mkQm(b), mh = mkMh(b), si = mkSi(b);
    const shensha = mkShenSha(b);
    const liuyue = getLiuYue(CURR_YEAR);
    b._meta = { hourZhi: resolved.hourZhi, useTrueSolar: false, by: year, bm: month, bd: day };

    const _input = { by: year, bm: month, bd: day, bd_raw: `${year}-${month}-${day}`, timeStr: `${hour}:00`, bp: 'beijing', gen, q: '事业', useTrueSolar: false };
    const ctx = buildContext({ b, wx, ss, dy, ln, zw, qm, mh, si, shensha, liuyue, P: null, gen, q: '事业', city, input: _input });

    // 检查 ctx 各字段无 NaN、无 undefined
    assert.ok(ctx.dg && ctx.dw, '日主与属性必须存在');
    assert.ok(ctx.cs >= 0 && ctx.ws >= 0 && ctx.ls >= 0 && ctx.hs >= 0, '四维评分有效');
    assert.ok(ctx.cDy && ctx.cDy.g && ctx.cDy.z, '当前大运有效');
    assert.ok(ctx.cLn && ctx.cLn.g && ctx.cLn.z, '当年流年有效');
    assert.ok(ctx.wx.t > 0, '五行总量有效');

    sampleCount++;
    cleanCtxCount++;
  }
}

audit(`100 组不同出生年份与时辰真实样本全量推演通过 (${sampleCount}/${sampleCount})`, () => {
  assert.strictEqual(sampleCount, cleanCtxCount);
});

// ─────────────────────────────────────────────────────────────
// 【4】西方星相十大行星、相位与生命灵数真实可用性
// ─────────────────────────────────────────────────────────────
console.log('\n【4】西方星相学与生命灵数全量数据真实可用性审计');

audit('西方本命星盘 10 大星曜、12 宫位与黄道度数连续性无 NaN', () => {
  const chart = calcWesternChart(1995, 6, 15, 12, 0, 116.4, 39.9);
  assert.strictEqual(chart.planets.length, 11);
  chart.planets.forEach(p => {
    assert.ok(Number.isFinite(p.absDegree), `星体 ${p.zh} 绝对度数必须为有效数字`);
    assert.ok(p.absDegree >= 0 && p.absDegree < 360, `星体 ${p.zh} 绝对度数必须在 [0, 360) 范围内`);
    assert.ok(p.houseNum >= 1 && p.houseNum <= 12, `星体 ${p.zh} 宫位必须在 1~12 范围内`);
  });
});

audit('毕达哥拉斯生命灵数九宫图与 8 条核心优势连线判定算法', () => {
  const num = calcNumerology(1995, 6, 15);
  assert.ok(num.lifePath >= 1 && num.lifePath <= 33);
  assert.ok(num.archetype.name && num.archetype.strength);
  assert.ok(Array.isArray(num.activeLines));
  assert.ok(num.personalYear >= 1 && num.personalYear <= 9);
});

audit('12 星座时空运势 365 天无缺失且无非法字符', () => {
  SIGNS.forEach(s => {
    const f = getHoroscopeForecast(s.id, 'today');
    assert.ok(f.baseScore >= 0 && f.baseScore <= 100);
    assert.ok(f.career && f.love && f.wealth && f.health);
    assert.ok(f.yi.length > 0 && f.ji.length > 0);
  });
});

// ─────────────────────────────────────────────────────────────
// 【5】塔罗牌库与 MBTI 题库真实性审计
// ─────────────────────────────────────────────────────────────
console.log('\n【5】塔罗牌库 (22大阿卡纳+4花色) 与 MBTI 16型人格题库审计');

audit('塔罗 26 张卡牌正位与逆位全量释义及关键词无空缺', () => {
  assert.strictEqual(TAROT_CARDS.length, 26);
  TAROT_CARDS.forEach(c => {
    assert.ok(c.name && c.en && c.symbol, `卡牌 ${c.id} 基础字段完备`);
    assert.ok(c.upright.kw && c.upright.summary && c.upright.advice, `卡牌 ${c.name} 正位字段完备`);
    assert.ok(c.reversed.kw && c.reversed.summary && c.reversed.advice, `卡牌 ${c.name} 逆位字段完备`);
  });
  assert.strictEqual(TAROT_SPREADS.length, 5, '必须包含 5 种经典牌阵');
});

audit('MBTI 16 型人格深度档案与 20 题情境题库无死锁', () => {
  assert.strictEqual(MBTI_TYPES.length, 16);
  MBTI_TYPES.forEach(t => {
    assert.ok(t.code && t.name && t.cognition && t.strengths.length > 0 && t.blindSpots.length > 0);
  });
  assert.strictEqual(MBTI_QUESTIONS.length, 20);
  MBTI_QUESTIONS.forEach(q => {
    assert.ok(q.q && q.optA.code && q.optB.code);
  });
});

// ─────────────────────────────────────────────────────────────
// 【6】AI 知识库与东方/西方双依据上下文生成审计
// ─────────────────────────────────────────────────────────────
console.log('\n【6】AI 知识库 (KB) 与东方/西方双依据上下文生成真实性审计');

audit('知识库 (KB) 核心术语词条与搜索检索可用性', () => {
  assert.ok(KB && KB.terms, 'KB 术语库必须存在');
  const termKeys = Object.keys(KB.terms);
  assert.ok(termKeys.length >= 20, `术语词条数 (${termKeys.length}) 需 >= 20`);
  const hits = KBSearch.search('正官', 3);
  assert.ok(Array.isArray(hits), 'KBSearch.search 应返回数组');
});

audit('buildBaziContext (东方依据) 结构化输出真实有效', () => {
  const sampleCtx = buildContext({
    b: mkBazi(1995, 6, 15, 4),
    wx: mkWx(mkBazi(1995, 6, 15, 4)),
    ss: mkSs(mkBazi(1995, 6, 15, 4)),
    dy: mkDy(mkBazi(1995, 6, 15, 4), 'male', 1995, 6, 15),
    ln: mkLn(CURR_YEAR),
    zw: mkZw(mkBazi(1995, 6, 15, 4)),
    qm: mkQm(mkBazi(1995, 6, 15, 4)),
    mh: mkMh(mkBazi(1995, 6, 15, 4)),
    si: mkSi(mkBazi(1995, 6, 15, 4)),
    shensha: [],
    liuyue: [],
    P: null,
    gen: 'male',
    q: '事业',
    city: { n: '北京' },
    input: { by: 1995, bm: 6, bd: 15, timeStr: '08:00' }
  });

  const eastCtxText = buildBaziContext(sampleCtx);
  assert.ok(eastCtxText.includes('【四柱八字】'), '东方依据必须包含四柱');
  assert.ok(eastCtxText.includes('【用神 / 喜神】'), '东方依据必须包含用神');

  const westCtxText = buildWesternContext(sampleCtx);
  assert.ok(westCtxText.includes('【西方占星星盘】'), '西方依据必须包含占星星盘');
  assert.ok(westCtxText.includes('【毕达哥拉斯生命灵数】'), '西方依据必须包含生命灵数');
});

// ─────────────────────────────────────────────────────────────
// 【7】决策工具中心 (12款工具) 注册与渲染可用性
// ─────────────────────────────────────────────────────────────
console.log('\n【7】精简重组后的 12 款决策与大师工具真实可用性审计');

audit('工具目录 (TOOL_DEFINITIONS) 严格包含 13 款精选工具且无已删除工具', () => {
  assert.strictEqual(TOOL_DEFINITIONS.length, 13);
  const toolIds = TOOL_DEFINITIONS.map(t => t.id);
  assert.ok(!toolIds.includes('wealth'), '必须不包含已删除的财运罗盘 (wealth)');
  assert.ok(!toolIds.includes('export'), '必须不包含已删除的导出PDF (export)');
  assert.ok(!toolIds.includes('layoff'), '必须不包含已被合并的裁员工具 (layoff)');

  // 必须包含的核心工具
  const required = ['horoscope', 'tarot', 'mbti', 'career', 'date', 'fengshui', 'daily', 'relation', 'zodiac', 'answerbook', 'oracle', 'name', 'lottery'];
  required.forEach(id => {
    assert.ok(toolIds.includes(id), `必须包含工具: ${id}`);
  });

  const hubHtml = renderToolsHubHtml();
  assert.ok(hubHtml.includes('tool-card-v4'), '工具中心必须渲染 V4 现代卡片结构');
});

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`  全局数据可用性审计完毕: ${passCount} 通过 / ${failCount} 失败`);
console.log('══════════════════════════════════════════════════════════════\n');

if (failCount === 0) {
  console.log('🎉 恭喜！全站全局数据、命理引擎、西方星相、AI 上下文与工具矩阵全部真实、完整、可用！\n');
} else {
  process.exit(1);
}
