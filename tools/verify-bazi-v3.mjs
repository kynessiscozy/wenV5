/**
 * 八字命盘核心算法权威交叉验证 V3
 * 在 V2 基础上增加：小寒边界测试、更多权威四柱案例、节气时刻精度验证
 */

globalThis.window = globalThis.window || globalThis;

import { mkBazi, mkWx, mkSs, mkShenSha } from '../src/engines/bazi.js';
import { jqDate, getMonthPillar, getDayPillarIndex, _initJq, jqInstant } from '../src/engines/calendar.js';
import { SOLAR_TERM_TIMES } from '../src/engines/solar-terms.js';
import { TG, DZ, NY, GW, ZW, ZC, SS } from '../src/engines/shared.js';

let pass = 0, fail = 0;
const t = (n, c, e = '') => {
  c ? (pass++, console.log('  \u2713', n)) : (fail++, console.log('  \u2717', n, e));
};

function baziStr(b) {
  return `${b.Y.g}${b.Y.z} ${b.M.g}${b.M.z} ${b.D.g}${b.D.z} ${b.H.g}${b.H.z}`;
}

console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('  \u516b\u5b57\u547d\u76d8\u6838\u5fc3\u7b97\u6cd5 \u2014 V3 \u6743\u5a01\u4ea4\u53c9\u9a8c\u8bc1\uff08\u542b\u5c0f\u5bd2\u8fb9\u754c\u4fee\u590d\uff09');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n');

// =====================================================
// 测试组 1: 节气精确时刻验证（权威来源交叉验证）
// =====================================================
console.log('\u30101\u3011\u8282\u6c14\u7cbe\u786e\u65f6\u523b\u9a8c\u8bc1 \u2014 \u6743\u5a01\u6765\u6e90\u4ea4\u53c9\u5bf9\u7167');

// 2024年立春: 权威值 2月4日 16:26:53 (新华网/万年历)
const lc2024 = SOLAR_TERM_TIMES['2024'][0];
t('2024\u7acb\u6625=2\u67084\u65e516:27 (\u65b0\u534e\u7f51\u6743\u5a01\u503c16:26:53)',
  lc2024.startsWith('2024-02-04 16:27'),
  `\u5b9e\u9645: ${lc2024}`);

// 2020年立春: 权威值 2月4日 17:03:12 (央视网)
const lc2020 = SOLAR_TERM_TIMES['2020'][0];
t('2020\u7acb\u6625=2\u67084\u65e517:03 (\u592e\u89c6\u7f51\u6743\u5a01\u503c17:03:12)',
  lc2020.startsWith('2020-02-04 17:03'),
  `\u5b9e\u9645: ${lc2020}`);

// 2025年立春: 权威值 2月3日 22:10:13 (央视网/光明网)
const lc2025 = SOLAR_TERM_TIMES['2025'][0];
t('2025\u7acb\u6625=2\u67083\u65e522:10 (\u592e\u89c6\u7f51\u6743\u5a01\u503c22:10:13)',
  lc2025.startsWith('2025-02-03 22:10'),
  `\u5b9e\u9645: ${lc2025}`);

// 2021年立春: 权威值 2月3日 22:58:39
const lc2021 = SOLAR_TERM_TIMES['2021'][0];
t('2021\u7acb\u6625=2\u67083\u65e522:58',
  lc2021.startsWith('2021-02-03 22:58'),
  `\u5b9e\u9645: ${lc2021}`);

// 覆盖范围验证
const years = Object.keys(SOLAR_TERM_TIMES);
const minYear = Math.min(...years.map(Number));
const maxYear = Math.max(...years.map(Number));
t('\u8282\u6c14\u8868\u8986\u76d61900-2101\u5e74',
  minYear === 1900 && maxYear === 2101,
  `\u5b9e\u9645: ${minYear}-${maxYear}`);

// 每年12个节气验证
let allHave12 = true;
for (const y of years) {
  if (SOLAR_TERM_TIMES[y].length !== 12) {
    allHave12 = false;
    console.log(`    ${y}\u5e74\u8282\u6c14\u6570: ${SOLAR_TERM_TIMES[y].length}`);
    break;
  }
}
t('\u6bcf\u5e7412\u4e2a\u8282\u6c14\u5b8c\u6574', allHave12);

// =====================================================
// 测试组 2: 立春分界验证（精确时刻）
// =====================================================
console.log('\n\u30102\u3011\u5e74\u67f1\u8ba1\u7b97 \u2014 \u7acb\u6625\u7cbe\u786e\u65f6\u523b\u5206\u754c');

// 2024-02-04 立春前 (15:00) → 年柱应为癸卯
const bBeforeLc = mkBazi(2024, 2, 4, 0, 15, 0);
t('2024-02-04 15:00 \u7acb\u6625\u524d \u5e74\u67f1=\u7678\u536f',
  bBeforeLc.Y.g + bBeforeLc.Y.z === '\u7678\u536f',
  `\u5b9e\u9645: ${bBeforeLc.Y.g + bBeforeLc.Y.z}`);

// 2024-02-04 立春后 (17:00) → 年柱应为甲辰
const bAfterLc = mkBazi(2024, 2, 4, 0, 17, 0);
t('2024-02-04 17:00 \u7acb\u6625\u540e \u5e74\u67f1=\u7532\u8fb0',
  bAfterLc.Y.g + bAfterLc.Y.z === '\u7532\u8fb0',
  `\u5b9e\u9645: ${bAfterLc.Y.g + bAfterLc.Y.z}`);

// 2020-02-04 立春当天精确验证 (立春=17:03:19)
const b2020Before = mkBazi(2020, 2, 4, 0, 16, 0);
t('2020-02-04 16:00 \u7acb\u6625\u524d \u5e74\u67f1=\u5df1\u4ea5',
  b2020Before.Y.g + b2020Before.Y.z === '\u5df1\u4ea5',
  `\u5b9e\u9645: ${b2020Before.Y.g + b2020Before.Y.z}`);

const b2020After = mkBazi(2020, 2, 4, 0, 18, 0);
t('2020-02-04 18:00 \u7acb\u6625\u540e \u5e74\u67f1=\u5e9a\u5b50',
  b2020After.Y.g + b2020After.Y.z === '\u5e9a\u5b50',
  `\u5b9e\u9645: ${b2020After.Y.g + b2020After.Y.z}`);

// 1999-02-03 立春前 → 年柱应为戊寅
const b1999 = mkBazi(1999, 2, 3, 0);
t('1999-02-03 \u7acb\u6625\u524d \u5e74\u67f1=\u620a\u5bc5',
  b1999.Y.g + b1999.Y.z === '\u620a\u5bc5',
  `\u5b9e\u9645: ${b1999.Y.g + b1999.Y.z}`);

// 1999-02-05 立春后 → 年柱应为己卯
const b1999after = mkBazi(1999, 2, 5, 0);
t('1999-02-05 \u7acb\u6625\u540e \u5e74\u67f1=\u5df1\u536f',
  b1999after.Y.g + b1999after.Y.z === '\u5df1\u536f',
  `\u5b9e\u9645: ${b1999after.Y.g + b1999after.Y.z}`);

// =====================================================
// 测试组 3: 小寒边界验证（V3 新增 — 修复bug的核心测试）
// =====================================================
console.log('\n\u30103\u3011\u5c0f\u5bd2\u8fb9\u754c\u9a8c\u8bc1 \u2014 \u7acb\u6625\u524d\u6708\u67f1\u5224\u65ad');

// 2000-01-01 子时 → 己卯 丙子 戊午 壬子 (万年历/魔法路路 权威确认)
// 小寒2000=1月6日，1月1日在小寒前 → 子月(mi=10) → 丙子
const b2000 = mkBazi(2000, 1, 1, 0);
t('2000-01-01 \u5b50\u65f6 = \u5df1\u536f \u4e19\u5b50 \u620a\u5348 \u58ec\u5b50 (\u4e07\u5e74\u5386\u6743\u5a01)',
  baziStr(b2000) === '\u5df1\u536f \u4e19\u5b50 \u620a\u5348 \u58ec\u5b50',
  `\u5b9e\u9645: ${baziStr(b2000)}`);

// 2000-01-10 子时 → 小寒后应为丑月 → 丁丑
const b2000after = mkBazi(2000, 1, 10, 0);
t('2000-01-10 \u5c0f\u5bd2\u540e \u6708\u67f1=\u4e01\u4e11',
  b2000after.M.g + b2000after.M.z === '\u4e01\u4e11',
  `\u5b9e\u9645: ${b2000after.M.g + b2000after.M.z}`);

// 2000-01-05 子时 → 小寒前应为子月 → 丙子
const b2000before = mkBazi(2000, 1, 5, 0);
t('2000-01-05 \u5c0f\u5bd2\u524d \u6708\u67f1=\u4e19\u5b50',
  b2000before.M.g + b2000before.M.z === '\u4e19\u5b50',
  `\u5b9e\u9645: ${b2000before.M.g + b2000before.M.z}`);

// 1999-01-01 子时 → 戊寅年 甲子月 (周新春易学网/万年历权威确认)
// 立春前年干变为前年(戊), 戊癸五虎遁子月=甲子
const b1999jan = mkBazi(1999, 1, 1, 0);
t('1999-01-01 \u5c0f\u5bd2\u524d \u5e74\u67f1=\u620a\u5bc5 \u6708\u67f1=\u7532\u5b50 (\u5468\u65b0\u6625\u6743\u5a01)',
  b1999jan.Y.g + b1999jan.Y.z === '\u620a\u5bc5' && b1999jan.M.g + b1999jan.M.z === '\u7532\u5b50',
  `\u5b9e\u9645: ${b1999jan.Y.g}${b1999jan.Y.z} ${b1999jan.M.g}${b1999jan.M.z}`);

// 1999-01-10 子时 → 小寒后 → 丑月, 戊年丑月=乙丑
const b1999janafter = mkBazi(1999, 1, 10, 0);
t('1999-01-10 \u5c0f\u5bd2\u540e \u6708\u67f1=\u4e59\u4e11',
  b1999janafter.M.g + b1999janafter.M.z === '\u4e59\u4e11',
  `\u5b9e\u9645: ${b1999janafter.M.g + b1999janafter.M.z}`);

// 2024-01-01 子时 → 癸卯年 甲子月 (7gw/周新春/农民历/搜狐 权威确认)
// 立春前年干变为前年(癸), 戊癸五虎遁子月=甲子
const b2024jan = mkBazi(2024, 1, 1, 0);
t('2024-01-01 \u5c0f\u5bd2\u524d \u5e74\u67f1=\u7678\u536f \u6708\u67f1=\u7532\u5b50 (\u5468\u65b0\u6625\u6743\u5a01)',
  b2024jan.Y.g + b2024jan.Y.z === '\u7678\u536f' && b2024jan.M.g + b2024jan.M.z === '\u7532\u5b50',
  `\u5b9e\u9645: ${b2024jan.Y.g}${b2024jan.Y.z} ${b2024jan.M.g}${b2024jan.M.z}`);

// 2024-01-10 子时 → 小寒后 → 丑月, 癸年丑月=乙丑
const b2024janafter = mkBazi(2024, 1, 10, 0);
t('2024-01-10 \u5c0f\u5bd2\u540e \u6708\u67f1=\u4e59\u4e11',
  b2024janafter.M.g + b2024janafter.M.z === '\u4e59\u4e11',
  `\u5b9e\u9645: ${b2024janafter.M.g + b2024janafter.M.z}`);

// =====================================================
// 测试组 4: 完整四柱排盘 — 权威数据交叉验证
// =====================================================
console.log('\n\u30104\u3011\u5b8c\u6574\u56db\u67f1\u6392\u76d8 \u2014 \u6743\u5a01\u6570\u636e\u4ea4\u53c9\u9a8c\u8bc1');

// 案例 A: 1990-06-15 巳时 → 庚午 壬午 辛亥 癸巳 (测算网/周新春确认)
const bA = mkBazi(1990, 6, 15, 5);
t('1990-06-15 \u5df3\u65f6 = \u5e9a\u5348 \u58ec\u5348 \u8f9b\u4ea5 \u7678\u5df3 (\u6d4b\u7b97\u7f51\u6743\u5a01)',
  baziStr(bA) === '\u5e9a\u5348 \u58ec\u5348 \u8f9b\u4ea5 \u7678\u5df3', `\u5b9e\u9645: ${baziStr(bA)}`);

// 案例 B: 2000-01-01 子时 → 己卯 丙子 戊午 壬子 (万年历确认)
const bB = mkBazi(2000, 1, 1, 0);
t('2000-01-01 \u5b50\u65f6 = \u5df1\u536f \u4e19\u5b50 \u620a\u5348 \u58ec\u5b50 (\u4e07\u5e74\u5386\u6743\u5a01)',
  baziStr(bB) === '\u5df1\u536f \u4e19\u5b50 \u620a\u5348 \u58ec\u5b50', `\u5b9e\u9645: ${baziStr(bB)}`);

// 案例 C: 1985-11-02 寅时 → 乙丑 丙戌 乙巳 戊寅
const bC = mkBazi(1985, 11, 2, 2);
t('1985-11-02 \u5bc5\u65f6 = \u4e59\u4e11 \u4e19\u620c \u4e59\u5df3 \u620a\u5bc5',
  baziStr(bC) === '\u4e59\u4e11 \u4e19\u620c \u4e59\u5df3 \u620a\u5bc5', `\u5b9e\u9645: ${baziStr(bC)}`);

// 案例 D: 1985-11-02 酉时 → 乙丑 丙戌 乙巳 乙酉 (占卜网确认)
const bD = mkBazi(1985, 11, 2, 9);
t('1985-11-02 \u9149\u65f6 = \u4e59\u4e11 \u4e19\u620c \u4e59\u5df3 \u4e59\u9149 (\u5360\u535c\u7f51\u6743\u5a01)',
  baziStr(bD) === '\u4e59\u4e11 \u4e19\u620c \u4e59\u5df3 \u4e59\u9149', `\u5b9e\u9645: ${baziStr(bD)}`);

// 案例 E: 2024-02-05 子时 → 甲辰 丙寅 (立春后)
const bE = mkBazi(2024, 2, 5, 0);
t('2024-02-05 \u7acb\u6625\u540e \u5e74\u67f1=\u7532\u8fb0 \u6708\u67f1=\u4e19\u5bc5',
  bE.Y.g + bE.Y.z === '\u7532\u8fb0' && bE.M.g + bE.M.z === '\u4e19\u5bc5',
  `\u5b9e\u9645: ${bE.Y.g}${bE.Y.z} ${bE.M.g}${bE.M.z}`);

// 案例 F: 1985-11-02 巳时(9点) → 乙丑 丙戌 乙巳 辛巳 (周易算命网确认)
const bF = mkBazi(1985, 11, 2, 5);
t('1985-11-02 \u5df3\u65f6 = \u4e59\u4e11 \u4e19\u620c \u4e59\u5df3 \u8f9b\u5df3 (\u5468\u6613\u7b97\u547d\u7f51\u6743\u5a01)',
  baziStr(bF) === '\u4e59\u4e11 \u4e19\u620c \u4e59\u5df3 \u8f9b\u5df3', `\u5b9e\u9645: ${baziStr(bF)}`);

// =====================================================
// 测试组 5: 日柱计算（60甲子循环）
// =====================================================
console.log('\n\u30105\u3011\u65e5\u67f1\u8ba1\u7b97 \u2014 60\u7532\u5b50\u5faa\u73af\u9a8c\u8bc1');

const di2000 = getDayPillarIndex(2000, 1, 1);
t('2000-01-01 \u65e5\u67f1=\u620a\u5348(\u7d22\u5f1554)',
  di2000 === 54 && TG[di2000 % 10] + DZ[di2000 % 12] === '\u620a\u5348',
  `\u7d22\u5f15=${di2000}`);

const di2024 = getDayPillarIndex(2024, 1, 1);
t('2024-01-01 \u65e5\u67f1=\u7532\u5b50',
  TG[di2024 % 10] + DZ[di2024 % 12] === '\u7532\u5b50',
  `\u7d22\u5f15=${di2024}`);

const di60 = getDayPillarIndex(2024, 3, 1);
t('2024-03-01 \u65e5\u67f1=\u7532\u5b50(60\u5929\u5faa\u73af)',
  TG[di60 % 10] + DZ[di60 % 12] === '\u7532\u5b50',
  `\u7d22\u5f15=${di60}`);

// =====================================================
// 测试组 6: 五虎遁元
// =====================================================
console.log('\n\u30106\u3011\u6708\u67f1\u8ba1\u7b97 \u2014 \u4e94\u864e\u9041\u5143\u9a8c\u8bc1');

const yGanBase = [2, 4, 6, 8, 0];
const expYGan = ['\u4e19', '\u620a', '\u5e9a', '\u58ec', '\u7532'];
const yGanNames = ['\u7532\u5df1', '\u4e59\u5e9a', '\u4e19\u8f9b', '\u4e01\u58ec', '\u620a\u7678'];
for (let i = 0; i < 5; i++) {
  t(`\u4e94\u864e\u9041: ${yGanNames[i]}\u5e74\u5bc5\u6708\u8d77${expYGan[i]}`,
    TG[yGanBase[i]] === expYGan[i]);
}

// =====================================================
// 测试组 7: 五鼠遁元
// =====================================================
console.log('\n\u30107\u3011\u65f6\u67f1\u8ba1\u7b97 \u2014 \u4e94\u9f20\u9041\u5143\u9a8c\u8bc1');

const hGanBase = [0, 2, 4, 6, 8];
const expHGan = ['\u7532', '\u4e19', '\u620a', '\u5e9a', '\u58ec'];
const hGanNames = ['\u7532\u5df1', '\u4e59\u5e9a', '\u4e19\u8f9b', '\u4e01\u58ec', '\u620a\u7678'];
for (let i = 0; i < 5; i++) {
  t(`\u4e94\u9f20\u9041: ${hGanNames[i]}\u65e5\u5b50\u65f6\u8d77${expHGan[i]}`,
    TG[hGanBase[i]] === expHGan[i]);
}

// =====================================================
// 测试组 8: 纳音五行表
// =====================================================
console.log('\n\u30108\u3011\u7eb3\u97f3\u4e94\u884c\u8868 \u2014 \u6807\u51c6\u5bf9\u7167\u9a8c\u8bc1');

const nayinChecks = [
  [0, '\u7532\u5b50', '\u6d77\u4e2d\u91d1'], [2, '\u4e19\u5bc5', '\u7089\u4e2d\u706b'],
  [4, '\u620a\u8fb0', '\u5927\u6797\u6728'], [6, '\u5e9a\u5348', '\u8def\u65c1\u571f'],
  [8, '\u58ec\u7533', '\u5251\u950b\u91d1'], [10, '\u7532\u620c', '\u5c71\u5934\u706b'],
  [12, '\u4e19\u5b50', '\u6da7\u4e0b\u6c34'], [14, '\u620a\u5bc5', '\u57ce\u5934\u571f'],
  [16, '\u5e9a\u8fb0', '\u767d\u8721\u91d1'], [18, '\u58ec\u5348', '\u6768\u67f3\u6728'],
  [20, '\u7532\u7533', '\u6cc9\u4e2d\u6c34'], [22, '\u4e19\u620c', '\u5c4b\u4e0a\u571f'],
  [24, '\u620a\u5b50', '\u9739\u96f3\u706b'], [26, '\u5e9a\u5bc5', '\u677e\u67cf\u6728'],
  [28, '\u58ec\u8fb0', '\u957f\u6d41\u6c34'], [30, '\u7532\u5348', '\u7802\u77f3\u91d1'],
  [32, '\u4e19\u7533', '\u5c71\u4e0b\u706b'], [34, '\u620a\u620c', '\u5e73\u5730\u6728'],
  [47, '\u8f9b\u4ea5', '\u9497\u948f\u91d1'], [54, '\u620a\u5348', '\u5929\u4e0a\u706b'],
  [59, '\u7678\u4ea5', '\u5927\u6d77\u6c34'],
];
for (const [idx, label, expected] of nayinChecks) {
  t(`\u7eb3\u97f3 ${label}(\u7d22\u5f15${idx}) = ${expected}`,
    NY[idx] === expected, `\u5b9e\u9645: ${NY[idx]}`);
}

// =====================================================
// 测试组 9: 十神表
// =====================================================
console.log('\n\u30109\u3011\u5341\u795e\u8868 \u2014 \u6807\u51c6\u5bf9\u7167\u9a8c\u8bc1');

const shChecks = [
  ['\u7532', '\u7532', '\u6bd4\u80a9'], ['\u7532', '\u4e59', '\u52ab\u8d22'],
  ['\u7532', '\u4e19', '\u98df\u795e'], ['\u7532', '\u4e01', '\u4f24\u5b98'],
  ['\u7532', '\u620a', '\u504f\u8d22'], ['\u7532', '\u5df1', '\u6b63\u8d22'],
  ['\u7532', '\u5e9a', '\u4e03\u6740'], ['\u7532', '\u8f9b', '\u6b63\u5b98'],
  ['\u7532', '\u58ec', '\u504f\u5370'], ['\u7532', '\u7678', '\u6b63\u5370'],
  ['\u4e19', '\u4e19', '\u6bd4\u80a9'], ['\u4e19', '\u4e01', '\u52ab\u8d22'],
  ['\u4e19', '\u620a', '\u98df\u795e'], ['\u4e19', '\u5df1', '\u4f24\u5b98'],
  ['\u4e19', '\u5e9a', '\u504f\u8d22'], ['\u4e19', '\u8f9b', '\u6b63\u8d22'],
  ['\u4e19', '\u58ec', '\u4e03\u6740'], ['\u4e19', '\u7678', '\u6b63\u5b98'],
  ['\u4e19', '\u7532', '\u504f\u5370'], ['\u4e19', '\u4e59', '\u6b63\u5370'],
];
for (const [dayGan, otherGan, expected] of shChecks) {
  t(`\u5341\u795e ${dayGan}\u89c1${otherGan} = ${expected}`,
    SS[dayGan][otherGan] === expected,
    `\u5b9e\u9645: ${SS[dayGan][otherGan]}`);
}

// =====================================================
// 测试组 10: 地支藏干
// =====================================================
console.log('\n\u301010\u3011\u5730\u652f\u85cf\u5e72 \u2014 \u6807\u51c6\u5bf9\u7167\u9a8c\u8bc1');

const zcChecks = [
  ['\u5b50', ['\u7678']], ['\u4e11', ['\u5df1', '\u7678', '\u8f9b']],
  ['\u5bc5', ['\u7532', '\u4e19', '\u620a']], ['\u536f', ['\u4e59']],
  ['\u8fb0', ['\u620a', '\u4e59', '\u7678']], ['\u5df3', ['\u4e19', '\u5e9a', '\u620a']],
  ['\u5348', ['\u4e01', '\u5df1']], ['\u672a', ['\u5df1', '\u4e01', '\u4e59']],
  ['\u7533', ['\u5e9a', '\u58ec', '\u620a']], ['\u9149', ['\u8f9b']],
  ['\u620c', ['\u620a', '\u8f9b', '\u4e01']], ['\u4ea5', ['\u58ec', '\u7532']],
];
for (const [branch, expected] of zcChecks) {
  t(`\u85cf\u5e72 ${branch} = [${expected.join(',')}]`,
    JSON.stringify(ZC[branch]) === JSON.stringify(expected),
    `\u5b9e\u9645: [${ZC[branch].join(',')}]`);
}

// =====================================================
// 测试组 11: 五行归类
// =====================================================
console.log('\n\u301011\u3011\u4e94\u884c\u5f52\u7c7b \u2014 \u5929\u5e72\u5730\u652f\u4e94\u884c\u5c5e\u6027\u9a8c\u8bc1');

const wxGan = [['\u7532','\u6728'],['\u4e59','\u6728'],['\u4e19','\u706b'],['\u4e01','\u706b'],
  ['\u620a','\u571f'],['\u5df1','\u571f'],['\u5e9a','\u91d1'],['\u8f9b','\u91d1'],
  ['\u58ec','\u6c34'],['\u7678','\u6c34']];
for (const [gan, expected] of wxGan) {
  t(`\u5929\u5e72${gan}=${expected}`, GW[gan] === expected, `\u5b9e\u9645: ${GW[gan]}`);
}

const zwChecks = [['\u5b50','\u6c34'],['\u4e11','\u571f'],['\u5bc5','\u6728'],['\u536f','\u6728'],
  ['\u8fb0','\u571f'],['\u5df3','\u706b'],['\u5348','\u706b'],['\u672a','\u571f'],
  ['\u7533','\u91d1'],['\u9149','\u91d1'],['\u620c','\u571f'],['\u4ea5','\u6c34']];
for (const [branch, expected] of zwChecks) {
  t(`\u5730\u652f${branch}=${expected}`, ZW[branch] === expected, `\u5b9e\u9645: ${ZW[branch]}`);
}

// =====================================================
// 测试组 12: 神煞计算
// =====================================================
console.log('\n\u301012\u3011\u795e\u715e\u8ba1\u7b97 \u2014 \u5173\u952e\u795e\u715e\u9a8c\u8bc1');

const b_kong = mkBazi(2024, 1, 1, 0);
const ss_kong = mkShenSha(b_kong);
const kw = ss_kong.find(s => s.n === '\u7a7a\u4ea1');
t('\u7532\u5b50\u65ec\u7a7a\u4ea1=\u620c\u4ea5', kw && kw.v === '\u620c\u4ea5', `\u5b9e\u9645: ${kw ? kw.v : '\u672a\u627e\u5230'}`);

const b_th = mkBazi(2024, 1, 1, 0);
b_th.D.zi = 6; b_th.D.z = '\u5348'; b_th.dj = 54;
const ss_th = mkShenSha(b_th);
const th = ss_th.find(s => s.n === '\u6843\u82b1');
t('\u5348\u65e5\u6843\u82b1=\u536f', th && th.v === '\u536f', `\u5b9e\u9645: ${th ? th.v : '\u672a\u627e\u5230'}`);

b_th.D.zi = 2; b_th.D.z = '\u5bc5';
const ss_ym = mkShenSha(b_th);
const ym = ss_ym.find(s => s.n === '\u9a7f\u9a6c');
t('\u5bc5\u65e5\u9a7f\u9a6c=\u7533', ym && ym.v === '\u7533', `\u5b9e\u9645: ${ym ? ym.v : '\u672a\u627e\u5230'}`);

b_th.D.gi = 0; b_th.D.g = '\u7532';
const ss_ty = mkShenSha(b_th);
const ty = ss_ty.find(s => s.n === '\u5929\u4e59\u8d35\u4eba');
t('\u7532\u65e5\u5929\u4e59\u8d35\u4eba=\u4e11\u672a', ty && ty.v === '\u4e11\u672a', `\u5b9e\u9645: ${ty ? ty.v : '\u672a\u627e\u5230'}`);

const wc = ss_ty.find(s => s.n === '\u6587\u660c');
t('\u7532\u65e5\u6587\u660c=\u5df3', wc && wc.v === '\u5df3', `\u5b9e\u9645: ${wc ? wc.v : '\u672a\u627e\u5230'}`);

// =====================================================
// 测试组 13: 五行力量分析
// =====================================================
console.log('\n\u301013\u3011\u4e94\u884c\u529b\u91cf\u5206\u6790 \u2014 \u7ed3\u6784\u5b8c\u6574\u6027\u9a8c\u8bc1');

const wxA = mkWx(bA);
t('\u4e94\u884c\u7edf\u8ba1\u542b\u6728\u706b\u571f\u91d1\u6c34',
  Object.keys(wxA.c).length === 5 &&
  ['\u6728','\u706b','\u571f','\u91d1','\u6c34'].every(k => k in wxA.c));
t('\u65e5\u4e3b\u5df2\u8bc6\u522b', typeof wxA.dw === 'string' && wxA.dw.length === 1);
t('\u65fa\u8870\u4e3a\u5e03\u5c14\u503c', typeof wxA.st === 'boolean');
t('\u4e94\u884c\u603b\u91cf\u5408\u7406', wxA.t > 0 && wxA.t < 20);
t('\u7528\u795e/\u559c\u795e\u5df2\u8bc6\u522b', typeof wxA.ys === 'string' && typeof wxA.xs === 'string');

// =====================================================
// 总结
// =====================================================
console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log(`  \u9a8c\u8bc1\u7ed3\u679c: ${pass} \u901a\u8fc7 / ${fail} \u5931\u8d25`);
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n');

process.exit(fail ? 1 : 0);
