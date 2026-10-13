/**
 * 农历数据表生成脚本
 *
 * 以 lunar-javascript(MIT, 6tail)公开 API 为数据源,生成经典 lunarInfo
 * 位打包表(1900–2100)写入 src/engines/lunar-table.js。
 *
 * 位打包格式(每个农历年一个整数):
 *   bit 16      闰月是否大月(30 天=1,29 天=0)
 *   bit 15..4   正月..腊月是否大月(30 天=1,29 天=0)
 *   bit 3..0    闰月月份(0=无闰月)
 *
 * 用法:npm run gen:lunar   (需要 devDependencies 中的 lunar-javascript)
 * 生成后必须运行 npm run verify:lunar 全量比对(1901–2099 逐日)确认一致。
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { LunarYear, LunarMonth, Lunar, Solar } = require('lunar-javascript');

const START = 1900;
const END = 2100;

// 锚点自检:农历 1900 年正月初一 = 公历 1900-01-31(庚子年)
const anchor = Lunar.fromYmd(1900, 1, 1).getSolar();
if (anchor.toYmd() !== '1900-01-31') {
  throw new Error(`锚点校验失败:1900 正月初一 = ${anchor.toYmd()},预期 1900-01-31`);
}

const table = [];
for (let ly = START; ly <= END; ly++) {
  const leap = LunarYear.fromYear(ly).getLeapMonth() || 0; // 0=无闰月
  let info = 0;
  for (let m = 1; m <= 12; m++) {
    const dim = LunarMonth.fromYm(ly, m).getDayCount();
    if (dim !== 29 && dim !== 30) throw new Error(`异常月天数 ${ly}-${m}: ${dim}`);
    if (dim === 30) info |= 1 << (16 - m);
  }
  if (leap > 0) {
    const ldim = LunarMonth.fromYm(ly, -leap).getDayCount();
    if (ldim !== 29 && ldim !== 30) throw new Error(`异常闰月天数 ${ly}-闰${leap}: ${ldim}`);
    if (ldim === 30) info |= 1 << 16;
    info |= leap;
  }
  table.push(info);
}

// 用 2026-02-17(丙午年正月初一,公开万年历可查)做第二道自检
const probe = Solar.fromYmd(2026, 2, 17).getLunar();
if (!(probe.getYear() === 2026 && probe.getMonth() === 1 && probe.getDay() === 1)) {
  throw new Error(`第二锚点校验失败:2026-02-17 = ${probe.toString()}`);
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'engines', 'lunar-table.js');
const rows = [];
for (let i = 0; i < table.length; i += 10) {
  const yearLabel = START + i;
  rows.push(`  /* ${yearLabel}–${Math.min(yearLabel + 9, END)} */ ` + table.slice(i, i + 10).map((v) => '0x' + v.toString(16).padStart(5, '0')).join(', ') + ',');
}

writeFileSync(out, `/**
 * 农历月历数据表(1900–2100,共 ${table.length} 年)
 *
 * 由 tools/gen-lunar-table.mjs 生成,请勿手工修改。
 * 数据源:lunar-javascript(MIT License, (c) 6tail)公开 API;
 * 生成后经 tools/verify-lunar-v1.mjs 与数据源 1901–2099 逐日全量比对一致。
 *
 * 位打包格式(每年一个整数):
 *   bit 16      闰月是否大月(30 天=1)
 *   bit 15..4   正月..腊月是否大月(30 天=1,29 天=0)
 *   bit 3..0    闰月月份(0=无闰月)
 *
 * 历法锚点:公历 1900-01-31 = 农历庚子年正月初一。
 */
const LUNAR_INFO = [
${rows.join('\n')}
];

const LUNAR_INFO_START_YEAR = ${START};
const LUNAR_INFO_END_YEAR = ${END};

export { LUNAR_INFO, LUNAR_INFO_START_YEAR, LUNAR_INFO_END_YEAR };
`, 'utf8');

console.log(`✅ 已生成 ${out}(${table.length} 年)`);
