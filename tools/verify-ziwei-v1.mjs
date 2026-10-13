/**
 * 紫微斗数排盘全量交叉验证:与 iztro(MIT)标准实现逐盘比对
 *
 * 比对维度:命宫地支/天干、身宫地支、五行局、十二宫(按地支)的
 * 主星/辅星/煞星集合(含生年四化标注),仅比对本引擎已实现的星曜集合。
 *
 * 采样:
 *   [1] 1902–2098 每 23 天 × 3 时辰(广域扫描)
 *   [2] 2020/2023/2025 闰月全月 × 3 时辰(闰月上半月/下半月修正专测)
 *   [3] 2026 全年逐日 × 2 时辰(农历日 1–30 × 五行局组合密集覆盖)
 *
 * 用法:npm run verify:ziwei   (需要 devDependencies 中的 iztro)
 */
import { mkBazi } from '../src/engines/bazi.js';
import { solarToLunar } from '../src/engines/lunar.js';
import { mkZw } from '../src/engines/ziwei.js';

const { astro } = await import('iztro');

const DZ = '子丑寅卯辰巳午未申酉戌亥'.split('');
const MAJOR = new Set('紫微,天机,太阳,武曲,天同,廉贞,天府,太阴,贪狼,巨门,天相,天梁,七杀,破军'.split(','));
const AUX = new Set('文昌,文曲,左辅,右弼,天魁,天钺,禄存,天马'.split(','));
const SHA = new Set('擎羊,陀罗,火星,铃星,地空,地劫'.split(','));
const IMPLEMENTED = new Set([...MAJOR, ...AUX, ...SHA]);

let pass = 0;
const fails = [];
function check(cond, msg) {
  if (cond) pass++;
  else if (fails.length < 12) fails.push(msg);
  else fails.push('…');
}

function refChart(y, m, d, hourZhi) {
  const a = astro.bySolar(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, hourZhi, '女');
  const byBranch = {};
  a.palaces.forEach((p) => {
    const zhi = DZ.indexOf(p.earthlyBranch);
    const stars = {};
    [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].forEach((s) => {
      if (IMPLEMENTED.has(s.name)) stars[s.name] = s.mutagen ? `${s.name}·${s.mutagen}` : s.name;
    });
    byBranch[zhi] = { name: p.name, stem: p.heavenlyStem, stars, isBody: p.isBodyPalace };
  });
  return { a, byBranch };
}

function compareOne(y, m, d, hourZhi) {
  const lunar = solarToLunar(y, m, d);
  if (!lunar) { check(true, ''); return; } // 超出农历表范围,引擎走降级路径,不在比对范围
  const b = mkBazi(y, m, d, hourZhi, 12, 0);
  const mine = mkZw(b, lunar);
  const ctx = `${y}-${m}-${d} ${DZ[hourZhi]}时`;

  let ref;
  try { ref = refChart(y, m, d, hourZhi); } catch (e) { check(false, `${ctx}: iztro 异常 ${e.message}`); return; }

  // 命宫/身宫/五行局
  const mingRef = Object.entries(ref.byBranch).find(([, v]) => v.name === '命宫');
  check(Number(mingRef[0]) === mine.mingGongZhi, `${ctx}: 命宫 我=${DZ[mine.mingGongZhi]} iztro=${mingRef[1] && DZ[Number(mingRef[0])]}`);
  check(mingRef[1].stem + DZ[Number(mingRef[0])] === mine.mingGongGZ, `${ctx}: 命宫干支 我=${mine.mingGongGZ} iztro=${mingRef[1].stem}${DZ[Number(mingRef[0])]}`);
  const bodyRef = Object.entries(ref.byBranch).find(([, v]) => v.isBody);
  check(Number(bodyRef[0]) === mine.bodyGongZhi, `${ctx}: 身宫 我=${DZ[mine.bodyGongZhi]} iztro=${DZ[Number(bodyRef[0])]}`);
  check(ref.a.fiveElementsClass === mine.juName, `${ctx}: 五行局 我=${mine.juName} iztro=${ref.a.fiveElementsClass}`);

  // 十二宫星曜集合(含四化标注)
  for (let zhi = 0; zhi < 12; zhi++) {
    const p = mine.ps[zhi];
    const mineStars = [...p.m, ...p.a, ...p.s].filter((s) => IMPLEMENTED.has(s.replace(/·.$/, ''))).sort();
    const refStars = Object.values(ref.byBranch[zhi].stars).sort();
    check(mineStars.join(',') === refStars.join(','),
      `${ctx} ${DZ[zhi]}宫: 我=[${mineStars}] iztro=[${refStars}]`);
  }
}

console.log('[1] 广域扫描 1902–2098 每23天 × 子/巳/亥时 …');
const QUICK = process.env.QUICK === '1';
const start = Date.UTC(1902, 0, 1), end = Date.UTC(QUICK ? 1960 : 2098, 11, 31);
let n1 = 0;
for (let t = start; t <= end; t += (QUICK ? 61 : 23) * 86400000) {
  const dt = new Date(t);
  for (const hz of (QUICK ? [0, 6] : [0, 5, 11])) { compareOne(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), hz); n1++; }
}
console.log(`    ${n1} 盘`);

console.log('[2] 闰月专测:2020闰四/2023闰二/2025闰六 全月 × 子/未/亥时 …');
const leapWindows = [[2020, 5, 23, 2020, 6, 20], [2023, 3, 22, 2023, 4, 19], [2025, 7, 25, 2025, 8, 22]];
let n2 = 0;
for (const [sy, sm, sd, ey, em, ed] of leapWindows) {
  for (let t = Date.UTC(sy, sm - 1, sd); t <= Date.UTC(ey, em - 1, ed); t += 86400000) {
    const dt = new Date(t);
    for (const hz of [0, 7, 11]) { compareOne(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), hz); n2++; }
  }
}
console.log(`    ${n2} 盘`);

console.log('[3] 2026 全年逐日 × 寅/申时 …');
let n3 = 0;
for (let t = Date.UTC(2026, 0, 1); t <= Date.UTC(2026, 11, 31); t += 86400000) {
  const dt = new Date(t);
  for (const hz of [2, 8]) { compareOne(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), hz); n3++; }
}
console.log(`    ${n3} 盘`);

const realFails = fails.filter((f) => f !== '…');
console.log(`\n验证结果: ${pass} 通过 / ${pass ? fails.length : 0} 失败(共 ${n1 + n2 + n3} 盘 × 16 项)`);
if (fails.length) {
  realFails.slice(0, 12).forEach((f) => console.log('  ✗ ' + f));
  if (fails.length > 12) console.log(`  … 其余 ${fails.length - 12} 条省略`);
  process.exit(1);
}
console.log('🌟 紫微斗数标准排盘与 iztro 全量一致!');
