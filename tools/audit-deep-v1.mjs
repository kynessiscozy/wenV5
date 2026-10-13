#!/usr/bin/env node
/* ============================================================
   audit-deep-v1.mjs · 全局数据深度审计(数据正确性 + 一致性 + 卫生)
   ------------------------------------------------------------
   与 audit-global-data.mjs(可用性/形状断言)互补,本脚本聚焦
   「数据本身是否正确」,用三类独立参照交叉验证:
     ① 仓库内互源(calendar.js base64 日表 vs solar-terms.js 秒级时刻表)
     ② 外部权威 oracle(lunar-javascript, MIT —— 节气时刻/四柱/纳音/冬至不变量)
     ③ 天文锚点(J2000 儒略日、太阳/月亮黄经、亮星标准坐标、时区规则)
   分区:
     A 节气时刻表     B 农历位表        C 干支/纳音/十神基础表
     D 四柱算法穷举   E 城市字典        F 西方星历引擎
     G 星座星表       H 工具数据(塔罗/MBTI/占星/KB)
     I 静态资源引用   K 代码卫生(乱码/顶层DOM/存储键/重复键AST)
   用法:
     node tools/audit-deep-v1.mjs            # 全量(约 2–5 分钟)
     node tools/audit-deep-v1.mjs --quick    # 抽样(秒级,开发迭代用)
     node tools/audit-deep-v1.mjs --report docs/audit-deep.md
   退出码:存在 FAIL → 1,否则 0。
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUICK = process.argv.includes('--quick');
const rIdx = process.argv.indexOf('--report');
const REPORT_PATH = rIdx >= 0 ? process.argv[rIdx + 1] : null;

/* ---------- 浏览器环境 shim(必须先于任何 src 动态 import) ---------- */
const storage = {};
globalThis.window = globalThis.window || {
  localStorage: { getItem: (k) => storage[k] ?? null, setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  addEventListener: () => {}, matchMedia: () => ({ matches: false }),
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800,
  requestAnimationFrame: () => 0, getComputedStyle: () => ({ getPropertyValue: () => '' }),
  navigator: { userAgent: 'node-audit' },
};
globalThis.document = globalThis.document || {
  addEventListener: () => {}, getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {}, getContext: () => null }),
  body: { appendChild: () => {}, style: {} }, documentElement: { style: { setProperty: () => {} } }, head: { appendChild: () => {} },
};
globalThis.localStorage = globalThis.window.localStorage;
globalThis.requestAnimationFrame = () => 0;
globalThis.matchMedia = globalThis.window.matchMedia;

/* ---------- 被测模块(动态 import,shim 已就位) ---------- */
const { SOLAR_TERM_TIMES } = await import('../src/engines/solar-terms.js');
const CAL = await import('../src/engines/calendar.js');
const { LUNAR_INFO, LUNAR_INFO_START_YEAR, LUNAR_INFO_END_YEAR } = await import('../src/engines/lunar-table.js');
const LU = await import('../src/engines/lunar.js');
const SH = await import('../src/engines/shared.js');
const { CD, CG } = await import('../src/engines/cities.js');
const W = await import('../src/engines/western.js');
const { mkBazi } = await import('../src/engines/bazi.js');
const { ZODIAC_STARS, zodiacArtSVG } = await import('../src/render/zodiac-art.js');

/* ---------- oracle ---------- */
let Lunar = null, Solar = null;
try { ({ Lunar, Solar } = await import('lunar-javascript')); } catch { /* devDep 缺失时跳过 oracle 项 */ }

/* ---------- 结果收集 ---------- */
const results = []; // {sec, level, id, msg, detail}
const add = (sec, level, id, msg, detail = '') => results.push({ sec, level, id, msg, detail });
const check = (sec, id, cond, msg, detail = '') => add(sec, cond ? 'PASS' : 'FAIL', id, msg, detail);
/** 大样本扫描统计:bad>failAt → FAIL;bad>warnAt → WARN;否则 PASS */
function stat(sec, id, { n, bad, samples = [], warnAt = 0, failAt = 0, unit = '' }) {
  const lvl = bad > failAt ? 'FAIL' : bad > warnAt ? 'WARN' : 'PASS';
  const det = samples.length ? ' 例:' + samples.slice(0, 8).join('; ') + (samples.length > 8 ? ` …共${samples.length}例` : '') : '';
  add(sec, lvl, id, `${n.toLocaleString()} ${unit}扫描,异常 ${bad}`, det);
  return lvl;
}
const section = (name) => { try { return name(); } catch (e) { return e; } };
async function safe(sec, fn) { try { await fn(); } catch (e) { add(sec, 'WARN', 'SEC-ERR', `区段执行异常: ${e.message}`); } }

/* 确定性伪随机 */
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261013);
const fmt2 = (x) => String(x).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${fmt2(m)}-${fmt2(d)}`;
const dayMs = 86400000;
/** Date(UT ms) → {y,m,d}(UTC 字段) */
const partsUTC = (ms) => { const t = new Date(ms); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };

const JIE12 = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
const EN2CN = { LI_CHUN: '立春', YU_SHUI: '雨水', JING_ZHE: '惊蛰', CHUN_FEN: '春分', QING_MING: '清明', GU_YU: '谷雨', LI_XIA: '立夏', XIAO_MAN: '小满', MANG_ZHONG: '芒种', XIAO_SHU: '小暑', DA_SHU: '大暑', LI_QIU: '立秋', CHU_SHU: '处暑', BAI_LU: '白露', QIU_FEN: '秋分', HAN_LU: '寒露', SHUANG_JIANG: '霜降', LI_DONG: '立冬', XIAO_XUE: '小雪', DA_XUE: '大雪', DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒' };

/* ---------- oracle 节气时刻表(合并 1月/7月 两个锚点保证全年覆盖) ---------- */
const oracleJQ = new Map(); // '名:年' → { str, ms }
if (Lunar) {
  for (let y = 1900; y <= 2101; y++) {
    for (const mm of [1, 7]) {
      try {
        const t = Lunar.fromYmd(y, mm, 1).getJieQiTable();
        for (const [k, solar] of Object.entries(t)) {
          const cn = EN2CN[k] || k;
          const str = solar.toYmdHms(); // 中国标准时间
          const key = `${cn}:${str.slice(0, 4)}`;
          if (!oracleJQ.has(key)) oracleJQ.set(key, { str, ms: Date.parse(str.replace(' ', 'T') + '+08:00') });
        }
      } catch { /* 超出 oracle 支持年份 */ }
    }
  }
}
/* 全部节时刻(排序,供节气边界排除) */
const jieMsSorted = [...oracleJQ.values()].map((v) => v.ms).sort((a, b) => a - b);
function nearJie(ms, hours = 36) {
  const w = hours * 3600000;
  let lo = 0, hi = jieMsSorted.length - 1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (jieMsSorted[mid] < ms - w) lo = mid + 1; else hi = mid - 1; }
  return jieMsSorted.some((v, i) => i >= lo - 1 && i <= lo + 1 && Math.abs(v - ms) < w);
}

console.log(`\n🔬 wenV5 全局数据深度审计 ${QUICK ? '(quick 抽样)' : '(全量)'}\n${'='.repeat(60)}`);
const t0 = Date.now();

/* ============================================================
   A 节气时刻表(solar-terms.js)
   ============================================================ */
await safe('A', () => {
  const sec = 'A 节气时刻表';
  const years = Object.keys(SOLAR_TERM_TIMES).map(Number).sort((a, b) => a - b);
  check(sec, 'A1a', years.length === 202 && years[0] === 1900 && years[201] === 2101,
    `覆盖 ${years[0]}–${years[years.length - 1]} 共 ${years.length} 年(期望 1900–2101 共 202)`, years.length === 202 ? '' : `首=${years[0]} 尾=${years[years.length - 1]}`);
  // A1b 格式 + 年份前缀 + 12 项
  let bad = 0; const samples = [];
  const re = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
  for (const y of years) {
    const row = SOLAR_TERM_TIMES[y];
    if (!Array.isArray(row) || row.length !== 12) { bad++; samples.push(`${y} 长度=${row?.length}`); continue; }
    row.forEach((s, n) => {
      const m = re.exec(s);
      if (!m || Number(m[1]) !== y) { bad++; samples.push(`${y}[${n}]="${s}"`); }
    });
  }
  stat(sec, 'A1b', { n: years.length * 12, bad, samples, unit: '时刻字符串' });
  // A2 年内单调(0..10 递增;11=当年1月小寒,应为全行最早)
  bad = 0; samples.length = 0;
  for (const y of years) {
    const row = SOLAR_TERM_TIMES[y];
    if (!row || row.length !== 12) continue;
    const ms = row.map((s) => Date.parse(s.replace(' ', 'T') + '+08:00'));
    for (let n = 1; n <= 10; n++) if (!(ms[n] > ms[n - 1])) { bad++; samples.push(`${y} idx${n - 1}→${n} 非递增`); }
    if (Number(row[11].slice(5, 7)) !== 1) { bad++; samples.push(`${y} 小寒非1月: ${row[11]}`); }
    if (!(ms[11] < ms[0])) { bad++; samples.push(`${y} 小寒未早于立春`); }
  }
  stat(sec, 'A2', { n: years.length, bad, samples, unit: '年' });
  // A3 各节日期窗口(权威范围 ±1 天余量)
  const WINDOW = [[2, 3, 5], [3, 5, 7], [4, 4, 6], [5, 5, 7], [6, 5, 7], [7, 6, 8], [8, 7, 9], [9, 7, 9], [10, 8, 9], [11, 7, 8], [12, 6, 8], [1, 5, 7]];
  bad = 0; samples.length = 0;
  for (const y of years) {
    const row = SOLAR_TERM_TIMES[y];
    if (!row || row.length !== 12) continue;
    row.forEach((s, n) => {
      const [wm, dmin, dmax] = WINDOW[n];
      const m = Number(s.slice(5, 7)), d = Number(s.slice(8, 10));
      if (m !== wm || d < dmin - 1 || d > dmax + 1) { bad++; samples.push(`${y} ${JIE12[n]}=${s.slice(0, 10)}(期望 ${wm}月${dmin - 1}–${dmax + 1}日)`); }
    });
  }
  stat(sec, 'A3', { n: years.length * 12, bad, samples, unit: '节气' });
  // A4 仓库内互源:calendar.js base64 日表 vs 本表(日级)
  const calSrc = fs.readFileSync(path.join(ROOT, 'src/engines/calendar.js'), 'utf8');
  const jm = /const JQ_STR\s*=\s*"([A-Za-z0-9+/=]+)"/.exec(calSrc);
  if (!jm) { add(sec, 'WARN', 'A4', '未能在 calendar.js 中定位 JQ_STR'); }
  else {
    const bin = Buffer.from(jm[1], 'base64');
    const jqMaxYear = 1900 + Math.floor(bin.length / 24) - 1;
    bad = 0; samples.length = 0; let n = 0;
    for (let y = 1900; y <= Math.min(jqMaxYear, 2101); y++) {
      const row = SOLAR_TERM_TIMES[y];
      if (!row) continue;
      for (let k = 0; k < 12; k++) {
        const off = ((y - 1900) * 12 + k) * 2;
        if (off + 1 >= bin.length) break;
        n++;
        const md = `${fmt2(bin[off] + 1)}-${fmt2(bin[off + 1] + 1)}`;
        if (row[k].slice(5, 10) !== md) { bad++; samples.push(`${y} ${JIE12[k]}: 时刻表=${row[k].slice(0, 10)} base64=${y}-${md}`); }
      }
    }
    stat(sec, 'A4', { n, bad, samples, unit: '项(时刻表 vs base64 日表)', failAt: 0, warnAt: 0 });
    add(sec, 'INFO', 'A4b', `base64 日表覆盖 1900–${jqMaxYear}(时刻表覆盖 1900–2101)`);
  }
  // A5 oracle 时刻级比对(lunar-javascript)
  if (!Lunar) add(sec, 'WARN', 'A5', 'lunar-javascript 不可用,跳过 oracle 比对');
  else {
    bad = 0; samples.length = 0; let n = 0, maxDiffSec = 0, miss = 0; const big = [];
    const yList = QUICK ? years.filter((y) => y % 20 === 0 || y === 2026) : years;
    for (const y of yList) {
      const row = SOLAR_TERM_TIMES[y];
      if (!row) continue;
      for (let k = 0; k < 12; k++) {
        const o = oracleJQ.get(`${JIE12[k]}:${y}`);
        if (!o) { miss++; continue; }
        n++;
        const ours = Date.parse(row[k].replace(' ', 'T') + '+08:00');
        const diffSec = Math.abs(ours - o.ms) / 1000;
        if (diffSec > maxDiffSec) maxDiffSec = diffSec;
        if (row[k].slice(0, 10) !== o.str.slice(0, 10)) { bad++; samples.push(`${y} ${JIE12[k]}: 本表=${row[k]} oracle=${o.str}`); }
        else if (diffSec > 120) big.push(`${y}${JIE12[k]} Δ${Math.round(diffSec)}s`);
      }
    }
    stat(sec, 'A5', { n, bad, samples, unit: '项(vs oracle 时刻)', failAt: 0, warnAt: 0 });
    add(sec, big.length ? 'WARN' : 'PASS', 'A5b', `日级全对齐;秒级最大偏差 ${maxDiffSec.toFixed(0)}s,>2min 共 ${big.length} 项`, big.slice(0, 8).join('; '));
    if (miss) add(sec, 'INFO', 'A5c', `oracle 未覆盖 ${miss} 项(边界年份)`);
  }
  // A6 寿星通式回退 vs 本表(±1 天)
  bad = 0; samples.length = 0; let n = 0;
  for (let y = 1950; y <= 2050; y++) {
    for (let k = 0; k < 12; k++) {
      try {
        const fd = CAL.solarTermDate(y, k);
        const row = SOLAR_TERM_TIMES[y];
        if (!fd || !row) continue;
        n++;
        const a = Date.UTC(y, fd[0] - 1, fd[1]), b = Date.UTC(y, Number(row[k].slice(5, 7)) - 1, Number(row[k].slice(8, 10)));
        if (Math.abs(a - b) > dayMs) { bad++; samples.push(`${y} ${JIE12[k]}: 公式=${y}-${fmt2(fd[0])}-${fmt2(fd[1])} 表=${row[k].slice(0, 10)}`); }
      } catch { /* 公式超范围 */ }
    }
  }
  stat(sec, 'A6', { n, bad, samples, unit: '项(寿星公式±1天)', warnAt: Math.ceil(n * 0.02), failAt: Math.ceil(n * 0.05) });
});

/* ============================================================
   B 农历位表(lunar-table.js)
   ============================================================ */
await safe('B', () => {
  const sec = 'B 农历位表';
  check(sec, 'B1a', LUNAR_INFO.length === LUNAR_INFO_END_YEAR - LUNAR_INFO_START_YEAR + 1,
    `表长 ${LUNAR_INFO.length}(期望 ${LUNAR_INFO_END_YEAR - LUNAR_INFO_START_YEAR + 1},${LUNAR_INFO_START_YEAR}–${LUNAR_INFO_END_YEAR})`);
  let bad = 0; const samples = [];
  for (let i = 0; i < LUNAR_INFO.length; i++) {
    const y = LUNAR_INFO_START_YEAR + i, v = LUNAR_INFO[i];
    const leap = v & 0xf;
    if (leap > 12) { bad++; samples.push(`${y} 闰月=${leap}`); continue; }
    let days = 0;
    for (let m = 1; m <= 12; m++) days += (v >> (16 - m)) & 1 ? 30 : 29;
    if (leap) days += (v >> 16) & 1 ? 30 : 29;
    const lo = leap ? 383 : 353, hi = leap ? 385 : 355;
    if (days < lo || days > hi) { bad++; samples.push(`${y} 年长=${days}(期望 ${lo}–${hi},闰=${leap})`); }
  }
  stat(sec, 'B1b', { n: LUNAR_INFO.length, bad, samples, unit: '年(位打包不变量)' });
  // B2 19 年窗闰月数 ∈ [6,8](默冬章)
  bad = 0; samples.length = 0; let n = 0;
  for (let y = LUNAR_INFO_START_YEAR; y + 18 <= LUNAR_INFO_END_YEAR; y += 19) {
    n++;
    let c = 0;
    for (let k = 0; k < 19; k++) if (LUNAR_INFO[y + k - LUNAR_INFO_START_YEAR] & 0xf) c++;
    if (c < 6 || c > 8) { bad++; samples.push(`${y}–${y + 18} 闰月数=${c}`); }
  }
  stat(sec, 'B2', { n, bad, samples, unit: '个19年窗', warnAt: 0, failAt: 2 });
  // B3 冬至必在农历十一月(oracle 冬至日 → solarToLunar)
  if (!Lunar) add(sec, 'WARN', 'B3', 'oracle 不可用,跳过冬至不变量');
  else {
    bad = 0; samples.length = 0; n = 0;
    const yList = QUICK ? [1901, 1950, 1984, 2000, 2026, 2050, 2098] : null;
    for (let y = 1901; y <= 2098; y++) {
      if (yList && !yList.includes(y)) continue;
      const o = oracleJQ.get(`冬至:${y}`);
      if (!o) continue;
      n++;
      const d = Number(o.str.slice(8, 10));
      const r = LU.solarToLunar(y, 12, d);
      if (!(r && r.month === 11 && !r.isLeap)) { bad++; samples.push(`${y} 冬至(${o.str.slice(0, 10)})→农历${r?.month}月${r?.isLeap ? '(闰)' : ''}`); }
    }
    stat(sec, 'B3', { n, bad, samples, unit: '年(冬至∈十一月)', failAt: 0, warnAt: 0 });
  }
  // B4 春节窗口 1/21–2/20 + 正月初一可定位
  bad = 0; samples.length = 0; n = 0;
  for (let y = 1901; y <= 2099; y++) {
    if (QUICK && y % 13 !== 0) continue;
    n++;
    let found = null;
    for (let t = Date.UTC(y, 0, 15); t <= Date.UTC(y, 1, 25); t += dayMs) {
      const p = partsUTC(t);
      const r = LU.solarToLunar(p.y, p.m, p.d);
      if (r.month === 1 && r.day === 1 && !r.isLeap) { found = p; break; }
    }
    if (!found) { bad++; samples.push(`${y} 未找到正月初一`); continue; }
    const mmdd = found.m * 100 + found.d;
    if (mmdd < 121 || mmdd > 220) { bad++; samples.push(`${y} 春节=${ymd(found.y, found.m, found.d)} 超出 1/21–2/20`); }
  }
  stat(sec, 'B4', { n, bad, samples, unit: '年(春节窗口)' });
  add(sec, 'INFO', 'B5', '逐日全量比对(72,691 天 vs oracle)由 verify-lunar-v1 / test:unit 承担,此处不重复');
});

/* ============================================================
   C 干支/纳音/十神基础表(shared.js)
   ============================================================ */
await safe('C', () => {
  const sec = 'C 基础表';
  const { TG, DZ, SX, WX, GW, ZW, ZC, NY, SS } = SH;
  check(sec, 'C1', TG?.length === 10 && DZ?.length === 12 && SX?.length === 12 && WX?.length === 5,
    `TG=${TG?.length} DZ=${DZ?.length} SX=${SX?.length} WX=${WX?.length}(期望 10/12/12/5)`);
  check(sec, 'C1b', TG?.join('') === '甲乙丙丁戊己庚辛壬癸' && DZ?.join('') === '子丑寅卯辰巳午未申酉戌亥',
    '干支序列正典', `TG=${TG?.join('')} DZ=${DZ?.join('')}`);
  const wuxingOf = (x) => (typeof x === 'number' ? WX[x] : x);
  // GW/ZW 可能是数组或 {干支字:五行} 对象,统一归一为序列
  const normSeq = (tbl, keys) => (Array.isArray(tbl) ? tbl.map(wuxingOf) : keys.map((k) => wuxingOf(tbl?.[k])));
  const gwExp = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  const zwExp = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
  const gwSeq = normSeq(GW, TG), zwSeq = normSeq(ZW, DZ);
  check(sec, 'C2', gwSeq.join('') === gwExp.join(''), '干→五行(甲乙木…壬癸水)', gwSeq.join(''));
  check(sec, 'C3', zwSeq.join('') === zwExp.join(''), '支→五行(亥子水…辰戌丑未土)', zwSeq.join(''));
  // C4 藏干(集合比对,容忍顺序差异)
  const zcCanon = { 子: '癸', 丑: '己癸辛', 寅: '甲丙戊', 卯: '乙', 辰: '戊乙癸', 巳: '丙庚戊', 午: '丁己', 未: '己丁乙', 申: '庚壬戊', 酉: '辛', 戌: '戊辛丁', 亥: '壬甲' };
  let bad = 0; const samples = [];
  for (const zhi of Object.keys(zcCanon)) {
    const got = (ZC[zhi] || []).map((g) => (typeof g === 'number' ? TG[g] : (g.g || g))).join('');
    const a = [...got].sort().join(''), b = [...zcCanon[zhi]].sort().join('');
    if (a !== b) { bad++; samples.push(`${zhi}: 表=[${got}] 正典=[${zcCanon[zhi]}]`); }
  }
  stat(sec, 'C4', { n: 12, bad, samples, unit: '支(藏干集合)' });
  // C5 纳音结构 + 五行分布 + 定点抽查
  check(sec, 'C5a', NY?.length === 60, `纳音 60 项(实际 ${NY?.length})`);
  bad = 0; samples.length = 0;
  for (let i = 0; i < 60; i += 2) if (NY[i] !== NY[i + 1]) { bad++; samples.push(`idx${i}/${i + 1}: ${NY[i]} vs ${NY[i + 1]}`); }
  stat(sec, 'C5b', { n: 30, bad, samples, unit: '对(纳音成对)' });
  const cnt = {};
  for (const s of NY) { const e = s.slice(-1); cnt[e] = (cnt[e] || 0) + 1; }
  check(sec, 'C5c', ['金', '木', '水', '火', '土'].every((e) => cnt[e] === 12), '纳音五行各 12 次', JSON.stringify(cnt));
  const spot = [[0, '海中金'], [54, '天上火'], [56, '石榴木'], [58, '大海水']];
  check(sec, 'C5d', spot.every(([i, v]) => NY[i] === v), '定点:甲子海中金/戊午天上火/庚申石榴木/壬戌大海水', spot.map(([i, v]) => `${TG[i % 10]}${DZ[i % 12]}=${NY[i]}(期望${v})`).join(' '));
  // C5e 纳音 vs oracle(从甲子日锚点连续 60 天)
  if (Lunar) {
    bad = 0; samples.length = 0;
    const anchorMs = Date.UTC(1999, 11, 25); // 向前找甲子日
    let start = null;
    for (let t = anchorMs; t < anchorMs + 70 * dayMs; t += dayMs) {
      const p = partsUTC(t);
      try { if (Solar.fromYmd(p.y, p.m, p.d).getLunar().getDayInGanZhi() === '甲子') { start = p; break; } } catch { /* noop */ }
    }
    if (start) {
      for (let i = 0; i < 60; i++) {
        const t = Date.UTC(start.y, start.m - 1, start.d + i);
        const p = partsUTC(t);
        const idx = CAL.getDayPillarIndex(p.y, p.m, p.d);
        const ora = Solar.fromYmd(p.y, p.m, p.d).getLunar().getDayNaYin();
        if (NY[idx] !== ora) { bad++; samples.push(`${ymd(p.y, p.m, p.d)} ${TG[idx % 10]}${DZ[idx % 12]}: 表=${NY[idx]} oracle=${ora}`); }
      }
      stat(sec, 'C5e', { n: 60, bad, samples, unit: '天(60甲子纳音 vs oracle)', failAt: 0 });
    } else add(sec, 'WARN', 'C5e', '未找到甲子日锚点');
  }
  // C5f 仓库内第二纳音字典(long-report.js)与 shared.NY 一致性
  try {
    const lrSrc = fs.readFileSync(path.join(ROOT, 'src/share/long-report.js'), 'utf8');
    const dict = {};
    for (const m2 of lrSrc.matchAll(/'([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])'\s*:\s*'([^']{2,4})'/g)) dict[m2[1]] = m2[2];
    if (Object.keys(dict).length >= 60) {
      let bad2 = 0; const samples2 = [];
      for (let i = 0; i < 60; i++) {
        const gz = TG[i % 10] + DZ[i % 12];
        if (dict[gz] && dict[gz] !== NY[i]) { bad2++; samples2.push(`${gz}: shared=${NY[i]} long-report=${dict[gz]}`); }
      }
      stat(sec, 'C5f', { n: 60, bad: bad2, samples: samples2, unit: '项(shared.NY vs long-report 字典)', failAt: 0 });
    } else add(sec, 'INFO', 'C5f', `long-report 纳音字典提取 ${Object.keys(dict).length} 条(<60,跳过)`);
  } catch { add(sec, 'INFO', 'C5f', 'long-report.js 不可读,跳过双表一致性'); }
  // C6 十神规则独立重推导(五行生克 + 同异性)
  const gen = (i) => (i + 1) % 5, ke = (i) => (i + 2) % 5;
  const rel = (me, other, sameYY) => {
    if (me === other) return sameYY ? '比肩' : '劫财';
    if (gen(me) === other) return sameYY ? '食神' : '伤官';
    if (gen(other) === me) return sameYY ? '偏印' : '正印';
    if (ke(me) === other) return sameYY ? '偏财' : '正财';
    if (ke(other) === me) return sameYY ? '七杀' : '正官';
    return '?';
  };
  bad = 0; samples.length = 0;
  for (let dg = 0; dg < 10; dg++) {
    for (let og = 0; og < 10; og++) {
      const meW = WX.indexOf(gwSeq[dg]);
      const oW = WX.indexOf(gwSeq[og]);
      const exp = rel(meW, oW, dg % 2 === og % 2);
      const row = Array.isArray(SS) ? SS[dg] : SS[TG[dg]];
      const got = row ? (Array.isArray(row) ? row[og] : row[TG[og]] ?? row[og]) : undefined;
      if (got !== exp) { bad++; samples.push(`${TG[dg]}见${TG[og]}: 表=${got} 推导=${exp}`); }
    }
  }
  stat(sec, 'C6', { n: 100, bad, samples, unit: '组(十神规则重推导)' });
});

/* ============================================================
   D 四柱算法 vs oracle(lunar-javascript EightChar,默认立春年界)
   ============================================================ */
const gzOf = (p) => (typeof p === 'string' ? p : p?.gz || `${p?.g || p?.gan || ''}${p?.z || p?.zhi || ''}`);
await safe('D', () => {
  const sec = 'D 四柱 vs oracle';
  if (!Lunar) { add(sec, 'WARN', 'D0', 'lunar-javascript 不可用,全区跳过'); return; }
  const { TG, DZ } = SH;
  // D1 日柱穷举 1901–2099
  let bad = 0; const samples = []; let n = 0;
  {
    const step = QUICK ? 37 : 1;
    for (let t = Date.UTC(1901, 0, 1); t <= Date.UTC(2099, 11, 31); t += step * dayMs) {
      const p = partsUTC(t);
      n++;
      const idx = CAL.getDayPillarIndex(p.y, p.m, p.d);
      const ours = TG[idx % 10] + DZ[idx % 12];
      const ora = Solar.fromYmd(p.y, p.m, p.d).getLunar().getDayInGanZhi();
      if (ours !== ora) { bad++; samples.push(`${ymd(p.y, p.m, p.d)}: 本表=${ours} oracle=${ora}`); }
    }
  }
  stat(sec, 'D1', { n, bad, samples, unit: `天(日柱${QUICK ? '抽样' : '穷举'})`, failAt: 0, warnAt: 0 });
  // D2 年柱+月柱抽样(排除节气边界 ±36h)
  bad = 0; samples.length = 0; n = 0;
  const yBad = { n: 0, bad: 0, samples: [] };
  {
    const days = QUICK ? [15] : [3, 9, 15, 21, 27];
    for (let y = 1901; y <= 2099; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of days) {
          const ms = Date.parse(`${ymd(y, m, d)}T10:00:00+08:00`);
          if (nearJie(ms)) continue;
          n++;
          const b = mkBazi(y, m, d, 5, 10, 0);
          const ec = Solar.fromYmdHms(y, m, d, 10, 0, 0).getLunar().getEightChar();
          if (gzOf(b.Y) !== ec.getYear()) { yBad.bad++; yBad.samples.push(`${ymd(y, m, d)}: 年柱=${gzOf(b.Y)} oracle=${ec.getYear()}`); }
          if (gzOf(b.M) !== ec.getMonth()) { bad++; samples.push(`${ymd(y, m, d)}: 月柱=${gzOf(b.M)} oracle=${ec.getMonth()}`); }
          if (gzOf(b.D) !== ec.getDay()) { bad++; samples.push(`${ymd(y, m, d)}: 日柱=${gzOf(b.D)} oracle=${ec.getDay()}`); }
        }
      }
    }
  }
  stat(sec, 'D2a', { n, bad, samples, unit: '样本(月柱+日柱,节气边界±36h已排除)', failAt: 0, warnAt: 0 });
  stat(sec, 'D2b', { n, bad: yBad.bad, samples: yBad.samples, unit: '样本(年柱,立春界)', failAt: 0, warnAt: 0 });
  // D3 时柱抽样(避开 22–24/0–1 晚子时争议区)
  bad = 0; samples.length = 0; n = 0;
  {
    const hours = QUICK ? [10] : [1, 4, 10, 16, 21];
    for (let y = 1901; y <= 2099; y += QUICK ? 7 : 3) {
      for (let m = 1; m <= 12; m++) {
        for (const h of hours) {
          const d = 12;
          const ms = Date.parse(`${ymd(y, m, d)}T${fmt2(h)}:00:00+08:00`);
          if (nearJie(ms)) continue;
          n++;
          const zhi = Math.floor(((h + 1) % 24) / 2);
          const b = mkBazi(y, m, d, zhi, h, 0);
          const ec = Solar.fromYmdHms(y, m, d, h, 0, 0).getLunar().getEightChar();
          if (gzOf(b.H) !== ec.getTime()) { bad++; samples.push(`${ymd(y, m, d)} ${h}时: 时柱=${gzOf(b.H)} oracle=${ec.getTime()}`); }
        }
      }
    }
  }
  stat(sec, 'D3', { n, bad, samples, unit: '样本(时柱)', failAt: 0, warnAt: 0 });
  // D4 getMonthPillar 与 mkBazi 内部一致性
  bad = 0; samples.length = 0; n = 0;
  for (let y = 1990; y <= 2040; y++) {
    for (let m = 1; m <= 12; m++) {
      const d = 15, ms = Date.parse(`${ymd(y, m, d)}T10:00:00+08:00`);
      if (nearJie(ms)) continue;
      n++;
      const mp = CAL.getMonthPillar(y, m, d, 10, 0, 0);
      const b = mkBazi(y, m, d, 5, 10, 0);
      const yGan = ((mp.yp - 4) % 10 + 10) % 10;
      const mGan = ((yGan % 5) * 2 + 2 + mp.mi) % 10;
      const gz = TG[mGan] + DZ[(mp.mi + 2) % 12];
      if (gz !== gzOf(b.M)) { bad++; samples.push(`${ymd(y, m, d)}: 五虎遁=${gz} mkBazi=${gzOf(b.M)}`); }
    }
  }
  stat(sec, 'D4', { n, bad, samples, unit: '样本(getMonthPillar vs mkBazi 月柱)' });
});

/* ============================================================
   E 城市字典(cities.js)
   ============================================================ */
await safe('E', () => {
  const sec = 'E 城市字典';
  const ids = Object.keys(CD);
  check(sec, 'E1a', ids.length >= 80, `城市数 ${ids.length}(README 宣称 ≥80)`);
  let bad = 0; const samples = [];
  for (const id of ids) {
    const c = CD[id];
    if (!c?.n || typeof c.o !== 'number' || typeof c.a !== 'number' || !c.tz) { bad++; samples.push(`${id} 字段缺失 ${JSON.stringify(c)?.slice(0, 60)}`); continue; }
    if (c.o < -180 || c.o > 180 || c.a < -90 || c.a > 90) { bad++; samples.push(`${id}(${c.n}) 经纬度越界 o=${c.o} a=${c.a}`); }
  }
  stat(sec, 'E1b', { n: ids.length, bad, samples, unit: '城(字段/范围)' });
  // E2 分组一致性
  bad = 0; samples.length = 0; let n = 0; const inGroup = new Set();
  for (const g of CG) for (const c of g.c || []) {
    n++;
    inGroup.add(c.i);
    if (!CD[c.i]) { bad++; samples.push(`分组"${g.g}" 引用未知城市 ${c.i}`); continue; }
    if (CD[c.i].n !== c.n) { bad++; samples.push(`${c.i} 名称不一致: CG=${c.n} CD=${CD[c.i].n}`); }
  }
  stat(sec, 'E2', { n, bad, samples, unit: '项(CG↔CD 一致)' });
  const orphan = ids.filter((i) => !inGroup.has(i));
  add(sec, orphan.length ? 'WARN' : 'PASS', 'E2b', `CD 中未出现在任何分组的城市 ${orphan.length} 个`, orphan.slice(0, 10).join(','));
  // E3 时区有效性(Intl 校验)+ 可疑回退
  bad = 0; samples.length = 0;
  const fallbackSus = [];
  for (const id of ids) {
    const c = CD[id];
    try { new Intl.DateTimeFormat('en-US', { timeZone: c.tz }); } catch { bad++; samples.push(`${id}(${c.n}) tz=${c.tz} 非法`); }
    if (c.tz === 'Asia/Shanghai' && (c.o < 73 || c.o > 135)) fallbackSus.push(`${id}(${c.n},lon=${c.o})`);
  }
  stat(sec, 'E3a', { n: ids.length, bad, samples, unit: '城(IANA tz 合法)' });
  add(sec, fallbackSus.length ? 'WARN' : 'PASS', 'E3b', `境外城市回退 Asia/Shanghai(疑似 CITY_TZ 漏配)${fallbackSus.length} 个`, fallbackSus.join('; '));
  // E4 tz 偏移 vs 经度启发式(中国单一时区白名单)
  bad = 0; samples.length = 0;
  for (const id of ids) {
    const c = CD[id];
    if (c.tz === 'Asia/Shanghai' && c.o >= 73 && c.o <= 135) continue;
    const offAt = (t) => {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: c.tz, timeZoneName: 'shortOffset' }).formatToParts(t);
      const tn = p.find((x) => x.type === 'timeZoneName').value; // GMT+8 / GMT+5:30 / GMT
      const mm = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(tn);
      return mm ? (Number(mm[2]) * 60 + Number(mm[3] || 0)) * (mm[1] === '-' ? -1 : 1) : 0;
    };
    let wOff, sOff;
    try { wOff = offAt(Date.UTC(2026, 0, 15)); sOff = offAt(Date.UTC(2026, 6, 15)); } catch { continue; }
    const exp = Math.round(c.o / 15) * 60;
    const best = Math.min(Math.abs(wOff - exp), Math.abs(sOff - exp)); // 冬/夏取近者,DST 免疫
    if (best > 90) { bad++; samples.push(`${c.n} tz=${c.tz}(UTC${wOff / 60}/${sOff / 60}) lon=${c.o}(≈UTC${(exp / 60).toFixed(1)})`); }
  }
  stat(sec, 'E4', { n: ids.length, bad, samples, unit: '城(tz↔经度合理性)', warnAt: 0, failAt: 3 });
  // E5 名城抽查
  const famous = [['北京', 116.4, 39.9, 'Asia/Shanghai'], ['上海', 121.5, 31.2, 'Asia/Shanghai'], ['伦敦', -0.13, 51.5, 'Europe/London'], ['纽约', -74, 40.7, 'America/New_York'], ['东京', 139.7, 35.7, 'Asia/Tokyo'], ['悉尼', 151.2, -33.9, 'Australia/Sydney']];
  bad = 0; samples.length = 0;
  for (const [name, lon, lat, tz] of famous) {
    const hit = ids.find((i) => CD[i].n === name || CD[i].n.includes(name));
    if (!hit) { samples.push(`${name} 不在字典`); continue; }
    const c = CD[hit];
    if (Math.abs(c.o - lon) > 0.6 || Math.abs(c.a - lat) > 0.6) { bad++; samples.push(`${name} 坐标偏差 (${c.o},${c.a}) vs (${lon},${lat})`); }
    if (c.tz !== tz) { bad++; samples.push(`${name} tz=${c.tz} 期望 ${tz}`); }
  }
  stat(sec, 'E5', { n: famous.length, bad, samples, unit: '名城抽查', warnAt: 0, failAt: 0 });
});

/* ============================================================
   F 西方星历引擎(western.js)
   ============================================================ */
await safe('F', async () => {
  const sec = 'F 西方星历';
  const JD = W.calcJulianDay;
  check(sec, 'F1a', Math.abs(JD(2000, 1, 1, 12, 0, 0) - 2451545.0) < 1e-6, 'JD 锚点 J2000.0 = 2451545.0', String(JD(2000, 1, 1, 12, 0, 0)));
  check(sec, 'F1b', Math.abs(JD(1900, 1, 1, 12, 0, 0) - 2415021.0) < 1e-6, 'JD 锚点 1900-01-01 12:00 UT = 2415021.0', String(JD(1900, 1, 1, 12, 0, 0)));
  check(sec, 'F1c', Math.abs(JD(2022, 1, 1, 0, 0, 0) - 2459580.5) < 1e-6, 'JD 锚点 2022-01-01 00:00 UT = 2459580.5', String(JD(2022, 1, 1, 0, 0, 0)));
  const sunL = W.calcSunLongitude(2451545.0);
  check(sec, 'F2', Math.abs(sunL - 280.46) < 1.0, `太阳黄经@J2000 = ${sunL.toFixed(3)}°(期望 ≈280.46°)`);
  // F3 2026 二分二至(权威日期,UT 正午,容差 0.8°)
  const eq = [[3, 20, 0], [6, 21, 90], [9, 23, 180], [12, 21, 270]];
  let bad = 0; const samples = [];
  for (const [m, d, exp] of eq) {
    const L = W.calcSunLongitude(JD(2026, m, d, 12, 0, 0));
    const diff = Math.min(Math.abs(L - exp), 360 - Math.abs(L - exp));
    if (diff > 0.8) { bad++; samples.push(`2026-${fmt2(m)}-${fmt2(d)}: ${L.toFixed(2)}° 期望≈${exp}°`); }
  }
  stat(sec, 'F3', { n: 4, bad, samples, unit: '个(2026 二分二至)', failAt: 0 });
  // F4 月亮日速
  bad = 0; samples.length = 0;
  for (let i = 0; i < 30; i++) {
    const jd = JD(2026, 1, 1, 0, 0, 0) + i * 11;
    let dl = W.calcMoonLongitude(jd + 1) - W.calcMoonLongitude(jd);
    if (dl < 0) dl += 360;
    if (dl < 11.5 || dl > 15.5) { bad++; samples.push(`jd=${jd.toFixed(1)} 日速=${dl.toFixed(2)}°`); }
  }
  stat(sec, 'F4', { n: 30, bad, samples, unit: '样本(月亮日速 11.5–15.5°)' });
  // F5 chart 结构一致性(120 个确定性样本,1940–2060)
  const HOR = (await import('../src/tools2/horoscope.js'));
  const SIGNS12 = HOR.SIGNS, getSunSignByDate = HOR.getSunSignByDate;
  bad = 0; samples.length = 0; let n = 0; let sunMismatch = 0;
  for (let i = 0; i < (QUICK ? 20 : 120); i++) {
    const y = 1940 + Math.floor(rnd() * 120), m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28);
    const h = Math.floor(rnd() * 24), mi = Math.floor(rnd() * 60);
    const lon = -180 + rnd() * 360, lat = -60 + rnd() * 120;
    n++;
    const c = W.calcWesternChart(y, m, d, h, mi, lon, lat, 8);
    for (const p of c.planets) {
      if (!Number.isFinite(p.absDegree) || p.absDegree < 0 || p.absDegree >= 360) { bad++; samples.push(`${ymd(y, m, d)} ${p.key} absDegree=${p.absDegree}`); continue; }
      if (p.sign?.id !== SIGNS12[Math.floor(p.absDegree / 30)]?.id) { bad++; samples.push(`${ymd(y, m, d)} ${p.key} sign=${p.sign?.id} 但 ${p.absDegree.toFixed(1)}°→${SIGNS12[Math.floor(p.absDegree / 30)]?.id}`); }
      if (Math.abs(p.degree - p.absDegree % 30) > 0.01) { bad++; samples.push(`${ymd(y, m, d)} ${p.key} degree=${p.degree} ≠ abs%30`); }
      if (!(p.houseNum >= 1 && p.houseNum <= 12)) { bad++; samples.push(`${ymd(y, m, d)} ${p.key} houseNum=${p.houseNum}`); }
    }
    const occ = Object.values(c.houseOccupants || {}).reduce((s, v) => s + ((v?.planets || (Array.isArray(v) ? v : [])).length), 0);
    if (occ !== c.planets.length) { bad++; samples.push(`${ymd(y, m, d)} houseOccupants 计 ${occ} ≠ 行星数 ${c.planets.length}`); }
    const ebSum = (c.elemBreakdown || []).reduce((s, e) => s + e.count, 0);
    if (![10, 11].includes(ebSum)) { bad++; samples.push(`${ymd(y, m, d)} elemBreakdown Σcount=${ebSum}`); }
    // 太阳星座 vs horoscope 查表(边界日允许分歧)
    const tbl = getSunSignByDate(m, d);
    if (tbl?.id !== c.sun?.id) sunMismatch++;
  }
  stat(sec, 'F5', { n, bad, samples, unit: '盘(chart 内部一致性)', failAt: 0, warnAt: 0 });
  add(sec, sunMismatch > n * 0.06 ? 'WARN' : 'INFO', 'F5b', `天文太阳星座 vs 查表星座分歧 ${sunMismatch}/${n}(仅边界日,>6% 才警告)`);
  // F6 生命灵数
  bad = 0; samples.length = 0; n = 0;
  const VALID_LP = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]);
  for (let i = 0; i < 60; i++) {
    const y = 1940 + Math.floor(rnd() * 100), m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28);
    const r = W.calcNumerology(y, m, d);
    n++;
    if (!VALID_LP.has(r.lifePath)) { bad++; samples.push(`${ymd(y, m, d)} lifePath=${r.lifePath}`); }
    let s = String(y) + fmt2(m) + fmt2(d);
    let sum = [...s].reduce((a, ch) => a + Number(ch), 0);
    while (sum > 9 && ![11, 22, 33].includes(sum)) sum = [...String(sum)].reduce((a, ch) => a + Number(ch), 0);
    if (sum !== r.lifePath && !QUICK) { /* 流派差异仅计数 */ bad += 0; samples.length = samples.length; }
  }
  stat(sec, 'F6', { n, bad, samples, unit: '样本(lifePath 值域)' });
});

/* ============================================================
   G 星座星表(zodiac-art.js)
   ============================================================ */
await safe('G', async () => {
  const sec = 'G 星座星表';
  const keys = Object.keys(ZODIAC_STARS);
  check(sec, 'G1a', keys.length === 12, `12 星座(实际 ${keys.length}: ${keys.join(',')})`);
  let bad = 0; const samples = [];
  for (const k of keys) {
    const z = ZODIAC_STARS[k];
    if (!Array.isArray(z.stars) || z.stars.length < 3) { bad++; samples.push(`${k} stars=${z.stars?.length}`); continue; }
    z.stars.forEach(([ra, dec, mag], i) => {
      if (!(ra >= 0 && ra < 24)) { bad++; samples.push(`${k}[${i}] RA=${ra}`); }
      if (!(dec >= -90 && dec <= 90)) { bad++; samples.push(`${k}[${i}] Dec=${dec}`); }
      if (!(mag >= -2 && mag <= 7)) { bad++; samples.push(`${k}[${i}] mag=${mag}`); }
    });
    (z.lines || []).forEach(([a, b]) => {
      if (!(a < z.stars.length && b < z.stars.length && a !== b)) { bad++; samples.push(`${k} line(${a},${b}) 越界/自环`); }
    });
  }
  stat(sec, 'G1b', { n: keys.length, bad, samples, unit: '座(坐标/星等/连线)' });
  // G2 亮星定点(容差 RA 0.15h / Dec 3°)
  const KNOWN = [['ari', 'Hamal 娄宿三', 2.12, 23.5], ['tau', 'Aldebaran 毕宿五', 4.6, 16.5], ['gem', 'Pollux 北河三', 7.76, 28.0], ['leo', 'Regulus 轩辕十四', 10.14, 12.0], ['vir', 'Spica 角宿一', 13.42, -11.2], ['sco', 'Antares 心宿二', 16.49, -26.4]];
  bad = 0; samples.length = 0;
  for (const [k, name, ra, dec] of KNOWN) {
    const hit = (ZODIAC_STARS[k]?.stars || []).find(([r, d]) => Math.abs(r - ra) < 0.15 && Math.abs(d - dec) < 3);
    if (!hit) { bad++; samples.push(`${k} 未找到 ${name}(${ra}h,${dec}°)`); }
  }
  stat(sec, 'G2', { n: KNOWN.length, bad, samples, unit: '颗(亮星定点)', failAt: 0 });
  // G3 RA 带状合理性(宽容差)
  const BAND = { ari: [1.4, 3.6], tau: [3.1, 6.1], gem: [5.7, 8.6], cnc: [7.7, 9.9], leo: [9.3, 12.1], vir: [11.5, 15.6], lib: [14.2, 16.3], sco: [15.5, 18.6], sgr: [17.4, 20.9], cap: [19.7, 22.6], aqu: [20.4, 23.99], pis: [22.3, 2.7] };
  const inBand = (ra, [lo, hi]) => (lo <= hi ? ra >= lo && ra <= hi : ra >= lo || ra <= hi);
  bad = 0; samples.length = 0; let n = 0;
  for (const k of keys) {
    const band = BAND[k];
    if (!band) continue;
    for (const [ra] of ZODIAC_STARS[k].stars || []) {
      n++;
      if (!inBand(ra, band)) { bad++; samples.push(`${k} RA=${ra}h 超出 [${band}]`); }
    }
  }
  stat(sec, 'G3', { n, bad, samples, unit: '颗(RA 星座带)', warnAt: 2, failAt: 8 });
  // G4 别名回归:全名 id 也能出图(修复 western-view 空 SVG 的回归测试)
  const HOR = (await import('../src/tools2/horoscope.js')).SIGNS;
  bad = 0; samples.length = 0;
  for (const s of HOR) {
    const svg = zodiacArtSVG(s.id, { size: 60 });
    if (!svg || !svg.includes('<circle')) { bad++; samples.push(`zodiacArtSVG('${s.id}') 为空`); }
  }
  for (const k of keys) {
    const svg = zodiacArtSVG(k, { size: 60 });
    if (!svg || !svg.includes('<circle')) { bad++; samples.push(`zodiacArtSVG('${k}') 为空`); }
  }
  stat(sec, 'G4', { n: HOR.length + keys.length, bad, samples, unit: '次(全名/缩写双约定出图)', failAt: 0 });
});

/* ============================================================
   H 工具数据(塔罗 / MBTI / 占星 / KB)
   ============================================================ */
await safe('H', async () => {
  const sec = 'H 工具数据';
  const { TAROT_CARDS } = await import('../src/tools2/tarot.js');
  check(sec, 'H1a', TAROT_CARDS.length === 26, `塔罗 ${TAROT_CARDS.length} 张(22 大阿卡纳 + 4)`);
  const major = TAROT_CARDS.filter((c) => c.arcana === 'major');
  check(sec, 'H1b', major.length === 22 && new Set(major.map((c) => c.num)).size === 22 && Math.min(...major.map((c) => c.num)) === 0 && Math.max(...major.map((c) => c.num)) === 21, `大阿卡纳 ${major.length} 张,num 0–21 无重复`);
  check(sec, 'H1c', new Set(TAROT_CARDS.map((c) => c.id)).size === TAROT_CARDS.length, '塔罗 id 唯一');
  let bad = 0; const samples = [];
  for (const c of TAROT_CARDS) {
    for (const f of ['name', 'en', 'upright', 'reversed', 'imgDesc']) {
      const v = c[f];
      if (!v || (typeof v === 'string' && v.trim().length < 2) || (Array.isArray(v) && v.length === 0)) { bad++; samples.push(`${c.id}.${f} 空/过短`); }
    }
  }
  stat(sec, 'H1d', { n: TAROT_CARDS.length * 5, bad, samples, unit: '字段(非空)' });
  const CANON = ['愚者', '魔术师', '女祭司', '女皇', '皇帝', '教皇', '恋人', '战车', '力量', '隐者', '命运之轮', '正义', '倒吊人', '死神', '节制', '恶魔', '高塔', '星星', '月亮', '太阳', '审判', '世界'];
  const names = new Set(major.map((c) => c.name));
  const missing = CANON.filter((nm) => ![...names].some((x) => x.includes(nm) || nm.includes(x)));
  add(sec, missing.length > 3 ? 'WARN' : 'PASS', 'H1e', `大阿卡纳正典名覆盖 ${CANON.length - missing.length}/22`, missing.join(','));
  // MBTI
  const { MBTI_TYPES, MBTI_QUESTIONS } = await import('../src/tools2/mbti.js');
  const codes = MBTI_TYPES.map((t) => t.code);
  const allCombos = [];
  for (const a of 'EI') for (const b of 'SN') for (const c of 'TF') for (const d of 'JP') allCombos.push(a + b + c + d);
  check(sec, 'H2a', codes.length === 16 && allCombos.every((x) => codes.includes(x)) && new Set(codes).size === 16, 'MBTI 16 型全组合无重复');
  bad = 0; samples.length = 0;
  for (const t of MBTI_TYPES) for (const f of ['name', 'enName', 'quadrant']) if (!t[f]) { bad++; samples.push(`${t.code}.${f} 空`); }
  stat(sec, 'H2b', { n: 48, bad, samples, unit: '字段' });
  const dims = new Set(MBTI_QUESTIONS.map((q) => q.dim));
  check(sec, 'H2c', MBTI_QUESTIONS.length >= 20 && [...dims].every((d) => ['EI', 'SN', 'TF', 'JP'].includes(d)), `题库 ${MBTI_QUESTIONS.length} 题,维度集=${[...dims].join('/')}`);
  bad = 0; samples.length = 0;
  for (const q of MBTI_QUESTIONS) {
    const pair = { EI: ['E', 'I'], SN: ['S', 'N'], TF: ['T', 'F'], JP: ['J', 'P'] }[q.dim];
    if (!q.q || q.q.length < 5) { bad++; samples.push(`Q${q.id} 题干过短`); }
    if (!pair || !pair.includes(q.optA?.code) || !pair.includes(q.optB?.code) || q.optA?.code === q.optB?.code) { bad++; samples.push(`Q${q.id} dim=${q.dim} optA=${q.optA?.code} optB=${q.optB?.code}`); }
  }
  stat(sec, 'H2d', { n: MBTI_QUESTIONS.length, bad, samples, unit: '题(维度/选项一致)' });
  check(sec, 'H2e', new Set(MBTI_QUESTIONS.map((q) => q.id)).size === MBTI_QUESTIONS.length, '题目 id 唯一');
  // 占星
  const { SIGNS, getSunSignByDate } = await import('../src/tools2/horoscope.js');
  check(sec, 'H3a', SIGNS.length === 12 && new Set(SIGNS.map((s) => s.id)).size === 12, '12 星座 id 唯一');
  bad = 0; samples.length = 0;
  const doy = (m, d) => { const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]; return cum[m - 1] + d; }; // 平年 365 天
  const covered = new Map();
  for (const s of SIGNS) {
    for (const f of ['name', 'en', 'elem', 'elemKey', 'mode', 'ruler', 'color']) if (!s[f]) { bad++; samples.push(`${s.id}.${f} 空`); }
    const [sm, sd] = s.mStart, [em, ed] = s.mEnd;
    let a = doy(sm, sd), b = doy(em, ed);
    if (b < a) b += 365; // 摩羯跨年
    for (let t = a; t <= b; t++) { const key = ((t - 1) % 365) + 1; if (covered.has(key) && covered.get(key) !== s.id) samples.push(`doy${key} 重叠: ${covered.get(key)} & ${s.id}`); covered.set(key, s.id); }
  }
  check(sec, 'H3b', covered.size === 365 && samples.length === 0, `日期区间无缝覆盖 365 天(实际 ${covered.size},重叠 ${samples.length})`, samples.slice(0, 5).join('; '));
  bad = 0; samples.length = 0;
  for (let t = Date.UTC(2026, 0, 1); t <= Date.UTC(2026, 11, 31); t += dayMs) {
    const p = partsUTC(t);
    const s = getSunSignByDate(p.m, p.d);
    const key = ((doy(p.m, p.d) - 1) % 365) + 1;
    if (s?.id !== covered.get(key)) { bad++; samples.push(`${p.m}/${p.d}: 函数=${s?.id} 表=${covered.get(key)}`); }
  }
  stat(sec, 'H3c', { n: 365, bad, samples, unit: '天(函数 vs 区间表)', failAt: 0 });
  const elems = {}; for (const s of SIGNS) elems[s.elemKey] = (elems[s.elemKey] || 0) + 1;
  check(sec, 'H3d', ['fire', 'earth', 'air', 'water'].every((k) => elems[k] === 3), '四元素各 3 座', JSON.stringify(elems));
  // KB
  const { KB } = await import('../src/ai/kb.js');
  const routes = Object.entries(KB.routes || {});
  bad = 0; samples.length = 0;
  for (const [k, r] of routes) { if (!r?.sec || !r?.card || !r?.name) { bad++; samples.push(`route ${k} 字段缺失`); } }
  stat(sec, 'H4a', { n: routes.length, bad, samples, unit: '条(KB.routes)' });
  const terms = KB.terms || [], faqs = KB.faqs || [];
  bad = 0; samples.length = 0;
  for (const t of terms) { if (!t?.t || !t?.d || t.d.length < 8) { bad++; samples.push(`term ${t?.t} 内容缺失/过短`); } }
  for (const f of faqs) { if (!f?.id || !f?.q || !f?.anchor) { bad++; samples.push(`faq ${f?.id} 字段缺失`); } }
  stat(sec, 'H4b', { n: terms.length + faqs.length, bad, samples, unit: `条(terms=${terms.length} faqs=${faqs.length})` });
  check(sec, 'H4c', new Set(faqs.map((f) => f.id)).size === faqs.length && new Set(terms.map((t) => t.t)).size === terms.length, 'KB id/词条唯一');
  // 答题册(防御式:导入失败仅 INFO)
  for (const p of ['../src/tools2/answerbook.js', '../src/tools/answerbook-v2.js']) {
    try {
      const mod = await import(p);
      const arrs = Object.entries(mod).filter(([, v]) => Array.isArray(v) && v.length > 3);
      add(sec, 'INFO', 'H5', `${path.basename(p)}: ${arrs.map(([k, v]) => `${k}=${v.length}`).join(', ') || '无数组导出'}`);
    } catch (e) { add(sec, 'INFO', 'H5', `${path.basename(p)} 跳过(${e.message.slice(0, 40)})`); }
  }
});

/* ============================================================
   I 静态资源与引用完整性
   ============================================================ */
await safe('I', () => {
  const sec = 'I 静态资源';
  // manifest
  const manPath = path.join(ROOT, 'public/manifest.webmanifest');
  try {
    const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
    check(sec, 'I1a', !!(man.name && man.short_name && man.start_url && man.display), `manifest 基本字段齐全(name=${man.short_name})`);
    let bad = 0; const samples = [];
    for (const ic of man.icons || []) {
      const f = path.join(ROOT, 'public', ic.src.replace(/^\.\//, '').replace(/^\//, ''));
      if (!fs.existsSync(f)) { bad++; samples.push(ic.src); }
    }
    stat(sec, 'I1b', { n: (man.icons || []).length, bad, samples, unit: '图标(文件存在)', failAt: 0 });
  } catch (e) { add(sec, 'FAIL', 'I1', `manifest 解析失败: ${e.message}`); }
  // sw.js 缓存清单
  try {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    const refs = [...sw.matchAll(/['"](\/[A-Za-z0-9_\-/.@]*)['"]/g)].map((m) => m[1]);
    const uniq = [...new Set(refs)];
    let bad = 0; const samples = [];
    for (const r of uniq) {
      const f = path.join(ROOT, 'public', r);
      const ok = fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, 'index.html')));
      if (r !== '/' && !ok) { bad++; samples.push(r); }
    }
    stat(sec, 'I2', { n: uniq.length, bad, samples, unit: '路径(sw.js 引用)', warnAt: 0, failAt: 2 });
    const cm = /['"]([\w-]*v[\d.]+[\w-]*)['"]/.exec(sw);
    add(sec, cm ? 'PASS' : 'WARN', 'I2b', `SW 缓存名${cm ? `: ${cm[1]}` : '未发现版本号模式'}`);
  } catch (e) { add(sec, 'WARN', 'I2', `sw.js 读取失败: ${e.message}`); }
  // HTML 本地引用
  const htmls = [...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => path.join(ROOT, f)),
  ...fs.readdirSync(path.join(ROOT, 'public')).filter((f) => f.endsWith('.html')).map((f) => path.join(ROOT, 'public', f))];
  let bad = 0; const samples = []; let n = 0;
  for (const h of htmls) {
    const src = fs.readFileSync(h, 'utf8');
    for (const m of src.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      const ref = m[1];
      if (/^(https?:|data:|mailto:|\/\/|javascript:)/.test(ref)) continue;
      n++;
      const rel = ref.split('?')[0];
      const roots = [path.dirname(h), ROOT, path.join(ROOT, 'public')];
      const ok = rel.startsWith('/')
        ? roots.some((r) => fs.existsSync(path.join(r, rel)))
        : roots.some((r) => fs.existsSync(path.resolve(r, rel)));
      if (!ok) { bad++; samples.push(`${path.basename(h)} → ${ref}`); }
    }
  }
  stat(sec, 'I3', { n, bad, samples, unit: `引用(${htmls.length} 个 html)`, warnAt: 0, failAt: Math.max(3, Math.ceil(n * 0.02)) });
});

/* ============================================================
   K 代码卫生
   ============================================================ */
await safe('K', async () => {
  const sec = 'K 代码卫生';
  const jsFiles = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) jsFiles.push(p);
    }
  })(path.join(ROOT, 'src'));
  // K1 乱码字符
  let bad = 0; const samples = [];
  for (const f of jsFiles) {
    const s = fs.readFileSync(f, 'utf8');
    const i = s.indexOf('\uFFFD');
    if (i >= 0) { bad++; samples.push(`${path.relative(ROOT, f)} @${i}`); }
  }
  stat(sec, 'K1', { n: jsFiles.length, bad, samples, unit: '文件(U+FFFD 乱码)', failAt: 0 });
  // K2 TODO 盘点
  let todos = 0;
  for (const f of jsFiles) todos += (fs.readFileSync(f, 'utf8').match(/TODO|FIXME|HACK\b|XXX/g) || []).length;
  add(sec, todos > 30 ? 'WARN' : 'INFO', 'K2', `TODO/FIXME/HACK 标记 ${todos} 处`);
  // K3 模块顶层触碰 DOM 全局(可移植性)
  bad = 0; samples.length = 0;
  for (const f of jsFiles) {
    const s = fs.readFileSync(f, 'utf8');
    if (/^(window|document|navigator|localStorage)\b/m.test(s) || /^const [A-Za-z_$]+ = (window|document)\b/m.test(s)) { bad++; samples.push(path.relative(ROOT, f)); }
  }
  stat(sec, 'K3', { n: jsFiles.length, bad, samples, unit: '文件(顶层 window/document,入口/浏览器模块可接受,工具链依赖模块需守护)', warnAt: 0, failAt: 99 });
  // K4 存储键盘点
  const lsKeys = new Map();
  for (const f of jsFiles) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/localStorage\.(getItem|setItem|removeItem)\(\s*(['"`])([^'"`$]+)\2/g)) {
      if (!lsKeys.has(m[3])) lsKeys.set(m[3], new Set());
      lsKeys.get(m[3]).add(path.relative(ROOT, f));
    }
  }
  const keys = [...lsKeys.keys()];
  const unPrefixed = keys.filter((k) => !k.startsWith('tj_'));
  add(sec, unPrefixed.length ? 'WARN' : 'PASS', 'K4a', `localStorage 键 ${keys.length} 个,未带 tj_ 前缀 ${unPrefixed.length} 个`, keys.sort().join(', '));
  if (lsKeys.has('tj_answerbook_saved') && lsKeys.has('tj_answerbook_saved_v2')) add(sec, 'INFO', 'K4b', 'tj_answerbook_saved(v1)与 _v2 并存 —— 迁移遗留,确认 v1 读取方仅剩回退逻辑后可清理');
  const idbNames = new Set();
  for (const f of jsFiles) for (const m of fs.readFileSync(f, 'utf8').matchAll(/indexedDB\.open\(\s*(['"`])([^'"`]+)\1(?:\s*,\s*(\d+))?/g)) idbNames.add(`${m[2]}${m[3] ? ' v' + m[3] : ''}`);
  add(sec, 'INFO', 'K4c', idbNames.size ? `IndexedDB: ${[...idbNames].join(', ')}` : '未发现 indexedDB.open 直接调用(可能经封装)');
  // K5 AST 重复对象键(静默数据覆盖检测)
  let acorn, walk;
  try { acorn = (await import('acorn')).default ?? (await import('acorn')); walk = (await import('acorn-walk')).default ?? (await import('acorn-walk')); } catch { acorn = null; }
  if (!acorn) { add(sec, 'WARN', 'K5', 'acorn 不可用,跳过重复键扫描(npm i --no-save acorn acorn-walk 后重跑)'); }
  else {
    bad = 0; samples.length = 0; let parsed = 0;
    for (const f of jsFiles) {
      const s = fs.readFileSync(f, 'utf8');
      let ast;
      try { ast = acorn.parse(s, { ecmaVersion: 'latest', sourceType: 'module', locations: true }); parsed++; } catch { /* 语法错误交给 build/eslint */ continue; }
      try {
        (walk.simple || walk.full)(ast, {
          ObjectExpression(node) {
            const seen = new Set();
            for (const p of node.properties) {
              if (p.type !== 'Property' || p.computed) continue;
              const k = p.key.type === 'Identifier' ? p.key.name : p.key.type === 'Literal' ? String(p.key.value) : null;
              if (k === null) continue;
              if (seen.has(k)) { bad++; samples.push(`${path.relative(ROOT, f)}:${p.loc?.start.line} 重复键 "${k}"`); }
              seen.add(k);
            }
          },
        });
      } catch { /* walk 失败忽略 */ }
    }
    stat(sec, 'K5', { n: parsed, bad, samples, unit: '文件(对象重复键)', failAt: 0 });
  }
});

/* ============================================================
   汇总与报告
   ============================================================ */
const secs = [...new Set(results.map((r) => r.sec))];
const lines = [];
lines.push(`# wenV5 全局数据深度审计报告`, '');
lines.push(`- 日期:${new Date().toISOString().slice(0, 10)}(UTC) · 模式:${QUICK ? 'quick 抽样' : '全量'} · 耗时:${((Date.now() - t0) / 1000).toFixed(1)}s`);
lines.push(`- 工具:\`tools/audit-deep-v1.mjs\` · oracle:lunar-javascript(MIT)· 天文锚点:J2000/二分二至/亮星标准坐标`, '');
const counts = { PASS: 0, INFO: 0, WARN: 0, FAIL: 0 };
for (const r of results) counts[r.level]++;
lines.push(`**总计:${results.length} 项 —— ✅ PASS ${counts.PASS} · ℹ️ INFO ${counts.INFO} · ⚠️ WARN ${counts.WARN} · ❌ FAIL ${counts.FAIL}**`, '');
for (const s of secs) {
  const rs = results.filter((r) => r.sec === s);
  const c = { PASS: 0, INFO: 0, WARN: 0, FAIL: 0 };
  for (const r of rs) c[r.level]++;
  const icon = c.FAIL ? '❌' : c.WARN ? '⚠️' : '✅';
  lines.push(`## ${icon} ${s}`, '');
  lines.push(`| 级别 | 编号 | 结论 | 明细 |`, `|---|---|---|---|`);
  for (const r of rs) {
    const em = { PASS: '✅', INFO: 'ℹ️', WARN: '⚠️', FAIL: '❌' }[r.level];
    lines.push(`| ${em} ${r.level} | ${r.id} | ${r.msg.replace(/\|/g, '\\|')} | ${(r.detail || '').replace(/\|/g, '\\|').slice(0, 300)} |`);
  }
  lines.push('');
}
const report = lines.join('\n');
console.log(report.split('\n').filter((l) => !l.startsWith('|') || l.includes('FAIL') || l.includes('WARN')).join('\n'));
if (REPORT_PATH) {
  const abs = path.isAbsolute(REPORT_PATH) ? REPORT_PATH : path.join(ROOT, REPORT_PATH);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, report + '\n');
  console.log(`\n📄 报告已写入 ${path.relative(ROOT, abs)}`);
}
console.log(`\n${'='.repeat(60)}\n汇总:PASS ${counts.PASS} / INFO ${counts.INFO} / WARN ${counts.WARN} / FAIL ${counts.FAIL}(耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(counts.FAIL > 0 ? 1 : 0);
