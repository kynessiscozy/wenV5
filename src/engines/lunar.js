/**
 * 农历(朔望历)换算引擎(纯函数,不触碰 DOM)
 *
 * 职责:公历日期 → 农历年/月/日(含闰月)与农历年干支,供紫微斗数等
 * 以农历为输入的引擎使用。
 *
 * 数据:lunar-table.js(1900–2100,由 tools/gen-lunar-table.mjs 生成,
 * 经 tools/verify-lunar-v1.mjs 与 lunar-javascript 1901–2099 逐日全量比对一致)。
 * 算法:经典位打包月历表 + 距锚点日偏移量逐年逐月行走。
 *
 * 有效范围:公历 1900-01-31(庚子年正月初一)至农历 2100 年岁末;
 * 超出范围返回 null,调用方需自行降级处理。
 *
 * 注意:农历年以正月初一为界(民俗/紫微体系),与八字引擎以立春为界
 * (calendar.js getMonthPillar)是两套约定,勿混用。
 */
import { LUNAR_INFO, LUNAR_INFO_START_YEAR, LUNAR_INFO_END_YEAR } from './lunar-table.js';
import { TG, DZ } from './shared.js';

const MS_PER_DAY = 86400000;
/* 历法锚点:公历 1900-01-31 = 农历庚子年正月初一 */
const ANCHOR_UTC = Date.UTC(1900, 0, 31);

const info = (ly) => LUNAR_INFO[ly - LUNAR_INFO_START_YEAR];

/** 农历年 ly 的闰月月份(0=无闰月)。 */
function leapMonth(ly) {
  return info(ly) & 0xf;
}

/** 农历年 ly 第 m 月(1–12,不含闰月)的天数(29 或 30)。 */
function monthDays(ly, m) {
  return (info(ly) & (0x10000 >> m)) ? 30 : 29;
}

/** 农历年 ly 闰月的天数(无闰月返回 0)。 */
function leapDays(ly) {
  return leapMonth(ly) ? ((info(ly) & 0x10000) ? 30 : 29) : 0;
}

/** 农历年 ly 全年天数。 */
function lunarYearDays(ly) {
  let sum = leapDays(ly);
  for (let m = 1; m <= 12; m++) sum += monthDays(ly, m);
  return sum;
}

/**
 * 公历 → 农历。
 * @param {number} y 公历年
 * @param {number} m 公历月(1–12)
 * @param {number} d 公历日
 * @returns {{year:number, month:number, day:number, isLeap:boolean,
 *            yearGanIdx:number, yearZhiIdx:number, yearGan:string, yearZhi:string,
 *            yearGanZhi:string, monthZhiIdx:number}|null}
 *   year=农历年数(干支纪年数);month=农历月(1–12);day=农历日(1–29/30);
 *   isLeap=是否闰月;yearGanIdx/yearZhiIdx=农历年干支序号(以正月初一为界);
 *   monthZhiIdx=月支序号(正月=寅=2,闰月与本月同支)。
 *   超出数据范围(1900-01-31 前或农历 2100 年岁末后)返回 null。
 */
function solarToLunar(y, m, d) {
  if (!Number.isFinite(y) || y < 1900 || y > LUNAR_INFO_END_YEAR + 1) return null;

  let offset = Math.round((Date.UTC(y, m - 1, d) - ANCHOR_UTC) / MS_PER_DAY);
  if (offset < 0) return null; // 早于 1900-01-31

  // 逐年行走定位农历年
  let ly = LUNAR_INFO_START_YEAR;
  while (ly <= LUNAR_INFO_END_YEAR) {
    const days = lunarYearDays(ly);
    if (offset < days) break;
    offset -= days;
    ly++;
  }
  if (ly > LUNAR_INFO_END_YEAR) return null; // 超出农历 2100 年岁末

  // 逐月行走定位农历月/日(闰月插在其本月之后)
  const leap = leapMonth(ly);
  let month = 0;
  let isLeap = false;
  for (let i = 1; i <= 12; i++) {
    let dim = monthDays(ly, i);
    if (offset < dim) { month = i; break; }
    offset -= dim;
    if (i === leap) {
      dim = leapDays(ly);
      if (offset < dim) { month = i; isLeap = true; break; }
      offset -= dim;
    }
  }
  const day = offset + 1;

  // 农历年干支(以正月初一为界;与八字立春纪年不同)
  const yearGanIdx = ((ly - 4) % 10 + 10) % 10;
  const yearZhiIdx = ((ly - 4) % 12 + 12) % 12;

  return {
    year: ly,
    month,
    day,
    isLeap,
    yearGanIdx,
    yearZhiIdx,
    yearGan: TG[yearGanIdx],
    yearZhi: DZ[yearZhiIdx],
    yearGanZhi: TG[yearGanIdx] + DZ[yearZhiIdx],
    monthZhiIdx: (month + 1) % 12, // 正月=寅(2) … 腊月=丑(1);闰月与本月同支
  };
}

/** 农历日期的中文惯用写法(如「七月初一」「闰六月十五」),供展示层使用。 */
function lunarDateLabel(lunar) {
  if (!lunar) return '';
  const DAY_NAMES = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
  const MONTH_NAMES = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
  return (lunar.isLeap ? '闰' : '') + MONTH_NAMES[lunar.month - 1] + '月' + (DAY_NAMES[lunar.day - 1] || lunar.day);
}

export { solarToLunar, lunarDateLabel, leapMonth, monthDays, leapDays, lunarYearDays };
