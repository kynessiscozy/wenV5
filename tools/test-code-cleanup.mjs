import assert from 'node:assert/strict';
import {
  TG, DZ, NY, getNayin, WX_SHENG, WX_KE, WX_MOTHER, WX_OVERCOMER,
  GAN_HE, ZHI_HE, ZHI_CHONG, ZHI_HAI,
} from '../src/engines/shared.js';
import * as horoscopeCore from '../src/engines/horoscope.js';
import { SIGNS } from '../src/engines/zodiac-data.js';
import { LOTTERY_GAMES, pickLotteryNumbers, drawLotteryRows } from '../src/engines/lottery.js';
import { esc, escWithBreaks } from '../src/tools2/escape.js';
import { getLayoffAstroRisk } from '../src/ai/risk.js';

// Calculation and data modules must not depend on a browser or the tools UI.
assert.equal(typeof window, 'undefined');
assert.equal(typeof document, 'undefined');
assert.equal(horoscopeCore.SIGNS, SIGNS);
for (const [name, table, length] of [
  ['天干五合', GAN_HE, 10], ['地支六合', ZHI_HE, 12],
  ['地支六冲', ZHI_CHONG, 12], ['地支六害', ZHI_HAI, 12],
]) {
  assert.equal(Object.keys(table).length, length, `${name}表不完整`);
  for (const [a, b] of Object.entries(table)) assert.equal(table[b], a, `${name}须双向一致`);
}
for (const wx of ['木', '火', '土', '金', '水']) {
  assert.equal(WX_MOTHER[WX_SHENG[wx]], wx);
  assert.equal(WX_OVERCOMER[WX_KE[wx]], wx);
}
for (let g = 0; g < TG.length; g++) for (let z = 0; z < DZ.length; z++) {
  const actual = getNayin(TG[g] + DZ[z]);
  if (g % 2 !== z % 2) assert.equal(actual, '');
  else {
    const index = ((6 * g - 5 * z) % 60 + 60) % 60;
    assert.equal(actual, NY[index]);
  }
}
console.log('✓ 共享五行、干支关系及 120 种纳音有效/无效组合一致');

for (const zhi of DZ) {
  const risk = getLayoffAstroRisk({
    b: { M: { z: zhi } }, cs: 60,
    cLn: { z: ZHI_CHONG[zhi] }, cDy: { z: ZHI_CHONG[zhi] },
  });
  assert.equal(risk.score, 42);
  assert.ok(risk.reasons.includes('流年冲月柱，工作环境易变'));
  assert.ok(risk.reasons.includes('大运冲月柱，组织关系处于变动期'));
}
assert.equal(getLayoffAstroRisk(null).label, '信息不足');
console.log('✓ 职场趋势对 12 地支沿用共享六冲关系');

const legacyHoroscope = await import('../src/tools2/horoscope.js');
const publicNames = [
  'SIGNS', 'getSunSignByDate', 'getAscendantSign', 'getMoonSign',
  'calcElementBreakdown', 'getCompatibility', 'getHoroscopeForecast',
];
for (const name of publicNames) assert.equal(legacyHoroscope[name], horoscopeCore[name], `旧星座入口 ${name} 不兼容`);
assert.equal(legacyHoroscope.default, legacyHoroscope.horoscope);
assert.equal(legacyHoroscope.horoscope.id, 'horoscope');
console.log('✓ 星座纯计算无需 DOM，旧命名导出和默认工具入口保持兼容');

const html = `<img src="x" onerror='alert(1)'>&`;
assert.equal(esc(html), '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;');
assert.equal(escWithBreaks(`${html}\n\n下一行`), '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;<br>下一行');
for (const value of [null, undefined, '']) {
  assert.equal(esc(value), '');
  assert.equal(escWithBreaks(value), '');
}
assert.equal(esc(0), '0');
assert.equal(esc(false), 'false');
assert.equal(escWithBreaks('a\r\nb\n'), 'a\r<br>b<br>');
const runtime = await import('../src/tools2/runtime.js');
assert.equal(runtime.esc, esc, '旧 runtime.esc 导出须指向同一个实现');
console.log('✓ 转义保留旧入口、防注入、空值、数字和换行语义');

function seeded(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}
assert.deepEqual(pickLotteryNumbers(3, 5, (() => {
  const values = [0, 0, 0.99, 0.4];
  return () => values.shift();
})()), [1, 3, 5], '重复抽中号码应继续抽取并升序排列');
for (const [type, def] of Object.entries(LOTTERY_GAMES)) {
  for (const count of [1, 3, 5]) {
    const rows = drawLotteryRows(type, count, seeded(count));
    assert.equal(rows.length, count);
    rows.forEach((row, i) => {
      assert.equal(row.idx, i + 1);
      for (const [field, rule] of [['red', def.red], ['blue', def.blue]]) {
        const numbers = row[field];
        assert.equal(numbers.length, rule.n);
        assert.equal(new Set(numbers).size, rule.n);
        assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
        assert.ok(numbers.every(n => Number.isInteger(n) && n >= 1 && n <= rule.max));
      }
    });
  }
}
assert.deepEqual(drawLotteryRows('unknown', 3, seeded(9)), drawLotteryRows('dlt', 3, seeded(9)), '旧入口未知类型回退大乐透');
assert.deepEqual(drawLotteryRows('ssq', 0, seeded(1)), []);
console.log('✓ 两种玩法的注数、去重、范围、排序与旧类型回退一致');
