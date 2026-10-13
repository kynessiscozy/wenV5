/**
 * 农历引擎全量验证:与 lunar-javascript(MIT, 6tail)逐日交叉比对
 * 范围:1901-01-01 至 2099-12-31(约 7.2 万天),比对农历年/月/日/闰月/年干支。
 * 用法:npm run verify:lunar
 */
import { createRequire } from 'node:module';
import { solarToLunar } from '../src/engines/lunar.js';

const require = createRequire(import.meta.url);
const { Lunar, Solar } = require('lunar-javascript');

let pass = 0;
const fails = [];
function check(cond, msg) { if (cond) pass++; else fails.push(msg); }

// [1] 逐日全量比对(1901–2099)
const start = Date.UTC(1901, 0, 1), end = Date.UTC(2099, 11, 31);
let days = 0;
for (let t = start; t <= end; t += 86400000) {
  const dt = new Date(t);
  const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
  const mine = solarToLunar(y, m, d);
  const ref = Solar.fromYmd(y, m, d).getLunar();
  days++;
  const ok = mine
    && mine.year === ref.getYear()
    && mine.month === Math.abs(ref.getMonth())
    && mine.isLeap === (ref.getMonth() < 0)
    && mine.day === ref.getDay()
    && mine.yearGanZhi === ref.getYearInGanZhi();
  if (!ok && fails.length < 10) fails.push(`${y}-${m}-${d}: mine=${JSON.stringify(mine)} ref=${ref.getYear()}/${ref.getMonth()}/${ref.getDay()}/${ref.getYearInGanZhi()}`);
  if (ok) pass++;
}
console.log(`[1] 逐日全量比对 1901–2099(${days} 天):${days - fails.length} 一致`);

// [2] 公开万年历事实锚点
const facts = [
  [2000, 8, 16, 2000, 7, 17, false, '庚辰'],  // 与 lunar-javascript 探针一致
  [2025, 1, 29, 2025, 1, 1, false, '乙巳'],   // 2025 春节
  [2026, 2, 17, 2026, 1, 1, false, '丙午'],   // 2026 春节
  [2025, 7, 25, 2025, 6, 1, true, '乙巳'],    // 2025 闰六月初一
  [1900, 1, 31, 1900, 1, 1, false, '庚子'],   // 表锚点
];
for (const [y, m, d, ey, em, ed, el, egz] of facts) {
  const got = solarToLunar(y, m, d);
  check(got && got.year === ey && got.month === em && got.day === ed && got.isLeap === el && got.yearGanZhi === egz,
    `锚点 ${y}-${m}-${d} 预期 ${egz}年${el ? '闰' : ''}${em}月${ed}日,实际 ${got && got.yearGanZhi}/${got && got.month}/${got && got.day}/${got && got.isLeap}`);
}

// [3] 越界返回 null
check(solarToLunar(1900, 1, 30) === null, '1900-01-30 应为 null');
check(solarToLunar(1899, 12, 31) === null, '1899 应为 null');

console.log(`\n验证结果: ${pass} 通过 / ${fails.length} 失败`);
if (fails.length) { fails.slice(0, 10).forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('🌙 农历引擎与 lunar-javascript 全量一致!');
