import assert from 'node:assert';

globalThis.window = globalThis.window || {
  localStorage: { getItem: () => null, setItem: () => {} }
};
globalThis.document = globalThis.document || {
  getElementById: () => null,
  documentElement: { getAttribute: () => 'light' }
};

const {
  SIGNS,
  getSunSignByDate,
  getAscendantSign,
  getMoonSign,
  calcElementBreakdown,
  getCompatibility,
  getHoroscopeForecast
} = await import('../src/tools2/horoscope.js');

console.log('\n═══════════════════════════════════════════════');
console.log('  星座大师 (Horoscope) 核心算法与数据单元测试');
console.log('═══════════════════════════════════════════════\n');

// 1. 12星座数据完整性
console.log('【1】12星座数据完整性验证');
assert.strictEqual(SIGNS.length, 12, '必须有 12 个星座');
SIGNS.forEach(s => {
  assert.ok(s.id && s.name && s.en && s.symbol, `${s.name} 基础信息必须完整`);
  assert.ok(s.elem && s.elemKey && s.mode && s.ruler, `${s.name} 占星属性必须完整`);
  assert.ok(s.keywords.length >= 3, `${s.name} 关键词必须完整`);
  assert.ok(s.radar && typeof s.radar.action === 'number', `${s.name} 雷达图数值必须完整`);
  assert.ok(s.nobleSigns && s.nobleSigns.length > 0, `${s.name} 贵人星座必须存在`);
});
console.log('  ✓ 12 星座数据结构完整且字段完备');

// 2. 太阳星座日期分界推算
console.log('\n【2】太阳星座日期分界推算');
assert.strictEqual(getSunSignByDate(3, 21).id, 'aries', '3月21日应为白羊座');
assert.strictEqual(getSunSignByDate(4, 19).id, 'aries', '4月19日应为白羊座');
assert.strictEqual(getSunSignByDate(4, 20).id, 'taurus', '4月20日应为金牛座');
assert.strictEqual(getSunSignByDate(5, 21).id, 'gemini', '5月21日应为双子座');
assert.strictEqual(getSunSignByDate(6, 22).id, 'cancer', '6月22日应为巨蟹座');
assert.strictEqual(getSunSignByDate(7, 23).id, 'leo', '7月23日应为狮子座');
assert.strictEqual(getSunSignByDate(8, 23).id, 'virgo', '8月23日应为处女座');
assert.strictEqual(getSunSignByDate(9, 23).id, 'libra', '9月23日应为天秤座');
assert.strictEqual(getSunSignByDate(10, 24).id, 'scorpio', '10月24日应为天蝎座');
assert.strictEqual(getSunSignByDate(11, 23).id, 'sagittarius', '11月23日应为射手座');
assert.strictEqual(getSunSignByDate(12, 22).id, 'capricorn', '12月22日应为摩羯座（跨年起点）');
assert.strictEqual(getSunSignByDate(1, 1).id, 'capricorn', '1月1日应为摩羯座（跨年终点）');
assert.strictEqual(getSunSignByDate(1, 20).id, 'aquarius', '1月20日应为水瓶座');
assert.strictEqual(getSunSignByDate(2, 19).id, 'pisces', '2月19日应为双鱼座');
console.log('  ✓ 12 星座全部交界日推算精确无误');

// 3. 上升星座与月亮星座推算
console.log('\n【3】上升星座与月亮星座推算');
const ascSample1 = getAscendantSign('aries', 6, 0); // 早上6点日出，上升与太阳相同
assert.strictEqual(ascSample1.id, 'aries', '早晨 6 点出生，上升星座与太阳星座相同');
const ascSample2 = getAscendantSign('aries', 12, 0); // 中午12点，前进约3个星座
assert.strictEqual(ascSample2.id, 'cancer', '中午 12 点出生，上升星座为巨蟹座');

const moonSample = getMoonSign(1995, 6, 15);
assert.ok(moonSample && moonSample.name, '月亮星座应被正确估算');
console.log('  ✓ 上升星座与月亮星座推算自洽且稳定');

// 4. 四象能量配比
console.log('\n【4】四象能量与调和分析');
const elemResult = calcElementBreakdown(SIGNS[0], SIGNS[4], SIGNS[8]); // 全火象 (白羊+狮子+射手)
assert.strictEqual(elemResult.firePct, 100, '全火象输入，火象比例应为 100%');
assert.strictEqual(elemResult.dominant.key, 'fire', '主导能量应为火象');
assert.ok(elemResult.balanceAdvice.length > 0, '应生成针对性的调和建议');
console.log('  ✓ 四象元素能量分布与调和建议生成正确');

// 5. 星座配对契合度算法 (12x12)
console.log('\n【5】12x12 星座契合度配对算法');
const matchSame = getCompatibility('aries', 'aries');
assert.ok(matchSame.score >= 80, '相同星座契合度应较高');
assert.ok(matchSame.tag.includes('共鸣') || matchSame.tag.includes('镜像'), '同星座应为共鸣');

const matchTrine = getCompatibility('aries', 'leo'); // 同火象
assert.ok(matchTrine.score >= 90, '同元素三分相契合度应极高 (>=90)');

const matchSextile = getCompatibility('aries', 'gemini'); // 火+风
assert.ok(matchSextile.score >= 85, '火风互补契合度应很高 (>=85)');

const matchOpposite = getCompatibility('aries', 'libra'); // 对宫
assert.ok(matchOpposite.score >= 80, '对宫星座应有高心动与吸引力');

const matchChallenge = getCompatibility('aries', 'cancer'); // 火+水
assert.ok(matchChallenge.score <= 75, '火水组合应有磨合提示');
assert.ok(matchChallenge.frictionBreak.length > 0, '挑战型组合应给出破冰建议');
console.log('  ✓ 星座契合度算法覆盖同象、相生、对宫、磨合全场景');

// 6. 周期时空运势生成
console.log('\n【6】周期时空运势生成');
const fToday = getHoroscopeForecast('aries', 'today');
const fWeek = getHoroscopeForecast('aries', 'week');
const fMonth = getHoroscopeForecast('aries', 'month');
const fYear = getHoroscopeForecast('aries', 'year');

assert.ok(fToday.baseScore >= 0 && fToday.baseScore <= 100, '今日运势分在 0-100 之间');
assert.ok(fToday.career && fToday.love && fToday.wealth && fToday.health, '四大运势维度必须完备');
assert.ok(fToday.yi.length >= 2 && fToday.ji.length >= 2, '宜忌提示必须完备');
assert.strictEqual(fToday.title.includes('今日'), true);
assert.strictEqual(fWeek.title.includes('本周'), true);
assert.strictEqual(fMonth.title.includes('本月'), true);
assert.strictEqual(fYear.title.includes('年度'), true);
console.log('  ✓ 今日/本周/本月/年度 四重运势生成完整');

console.log('\n═══════════════════════════════════════════════');
console.log('  全部测试通过！星座大师核心算法与功能 100% 验证成功');
console.log('═══════════════════════════════════════════════\n');
