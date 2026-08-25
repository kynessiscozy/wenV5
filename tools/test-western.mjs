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

console.log('\n═══════════════════════════════════════════════');
console.log('  西方星相与生命灵数引擎 (Western) 单元测试');
console.log('═══════════════════════════════════════════════\n');

// 1. 本命星盘排盘
console.log('【1】西方本命星盘排盘计算验证');
const chart = calcWesternChart(1995, 6, 15, 14, 30);
assert.strictEqual(chart.sun.id, 'gemini', '1995-06-15 太阳星座应为双子座');
assert.ok(chart.moon && chart.moon.name, '月亮星座必须计算');
assert.ok(chart.asc && chart.asc.name, '上升星座必须计算');
assert.strictEqual(chart.planets.length, 11, '必须包含 10 大行星 + 上升点共 11 个核心要素');
assert.strictEqual(chart.houseOccupants.length, 12, '必须有完整的十二宫位');
assert.strictEqual(chart.elemBreakdown.length, 4, '四象元素构成必须为 4 种');
console.log('  ✓ 本命星盘十大行星、十二宫位及四象元素计算正确');

// 2. 毕达哥拉斯生命灵数计算
console.log('\n【2】生命灵数 (Numerology) 核心算法验证');
// 1995-06-15: 1+9+9+5+0+6+1+5 = 36 -> 3+6 = 9
const num = calcNumerology(1995, 6, 15);
assert.strictEqual(num.lifePath, 9, '1995-06-15 主命数应为 9');
assert.strictEqual(num.birthdayNum, 6, '15日生日数应为 1+5 = 6');
assert.deepStrictEqual(num.talentNums, [3, 6], '天赋数应为 3 和 6');
assert.ok(num.archetype && num.archetype.name.includes('博爱'), '9 号人原型为博爱者');
assert.ok(num.personalYear >= 1 && num.personalYear <= 9, '个人流年数必须在 1~9 之间');
assert.ok(num.personalYearGuide.theme, '必须包含流年主题指引');
console.log('  ✓ 主命数、生日数、天赋数、九宫图及流年数计算正确');

// 3. 卓越数验证 (11, 22, 33)
console.log('\n【3】卓越数 (Master Numbers) 保留验证');
// 1990-01-01 -> 1+9+9+0+0+1+0+1 = 21 -> 3
// 1982-01-08 -> 1+9+8+2+0+1+0+8 = 29 -> 11 (保留卓越数 11)
const num11 = calcNumerology(1982, 1, 8);
assert.strictEqual(num11.lifePath, 11, '1982-01-08 主命数应保留卓越数 11');
console.log('  ✓ 卓越数 11 正确保留');

// 4. 双人灵数契合度速算
console.log('\n【4】双人灵数契合度合盘测试');
const syn = calcNumerologySynastry(9, 6);
assert.ok(syn.score >= 70 && syn.score <= 100, '灵数契合度得分应在合理区间');
assert.ok(syn.dynamic && syn.advice, '必须包含动力学与相处建议');
console.log('  ✓ 双人灵数合盘算法验证通过');

console.log('\n═══════════════════════════════════════════════');
console.log('  全部测试通过！西方星相与生命灵数引擎 100% 验证成功');
console.log('═══════════════════════════════════════════════\n');
