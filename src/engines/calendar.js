/**
 * 历法与节气引擎(纯函数,不触碰 DOM)
 *
 * 职责:节气日期/时刻查询、月柱判定(以节气时刻为界)、日柱 60 甲子序号、
 *       时区换算、真太阳时校正、出生时间 → 时辰地支解析。
 *
 * 节气数据三级回退链(jqDate / jqInstant):
 *   1. SOLAR_TERM_TIMES —— 精确节气时刻表(1900–2101,中国标准时间 UTC+8,含时分秒)
 *   2. JQ_STR —— base64 打包的节气「日」查找表(每个节气 2 字节:月-1、日-1,自 1900 年起)
 *   3. solarTermDate —— 寿星天文历通式估算(超出上述数据范围时回退)
 *
 * 本文件由早期压缩风格源码展开重构而来,导出签名与行为与重构前完全一致
 * (等价性经新旧实现全范围模糊对比验证,覆盖 1895–2105 年、多时区与夏令时边界)。
 */
import { SOLAR_TERM_TIMES } from './solar-terms.js';

/* ============================================================
 * 节气查找表(base64 打包)
 * ============================================================ */

/* base64 解码后为字节数组:每 2 字节表示一个节气的 (月-1, 日-1),
   自 1900 年起按 [年][12 节] 顺序紧密排列(顺序同 JIE_NAMES:
   立春/惊蛰/清明/立夏/芒种/小暑/立秋/白露/寒露/立冬/大雪/小寒)。 */
const JQ_STR="AQMCBQMEBAQFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQMCBQMEBAUFBQYGBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMDBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBAMDBAQFBAYGBwYIBgkHCgYLBgAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBAYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCAwMDBAMFBAYFBwUIBgkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCAwMDBAMFBAYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCAwMDBAMFAwYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCAwMDBAMFAwYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICAwMCBAMFAwYEBwUIBQkGCgULBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYFBwYIBgkHCgYLBgAE";

/* 节气查找表缓存:模块内变量,不挂浏览器全局,Node 单测可直接使用 */
let _jqArr = null;
let _jqMaxYear = 0;

/** 解码 JQ_STR 为字节数组并计算覆盖的最大年份(懒初始化,由 jqDate 首次调用触发)。 */
function _initJq() {
  const bin = atob(JQ_STR);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  _jqArr = arr;
  // 每年 12 节气 × 2 字节 = 24 字节/年,自 1900 年起
  _jqMaxYear = 1900 + Math.floor(arr.length / 24) - 1;
}

/* ============================================================
 * 节气查询
 * ============================================================ */

/**
 * 寿星通式估算节气日期(21 世纪精度):day = INT(Y×0.2422 + C) − INT((Y−1)/4)。
 * 注意闰年修正必须用 (diff−1)/4:2000 年本身是闰年,其 2/29 不应计入扣除项,
 * 否则 diff 为 4 的倍数的年份全部会早算一天。
 * @param {number} year 公历年
 * @param {number} n 节气序号:0=立春 1=惊蛰 2=清明 3=立夏 4=芒种 5=小暑
 *                   6=立秋 7=白露 8=寒露 9=立冬 10=大雪 11=小寒(返回 year 当年 1 月的小寒)
 * @returns {[number, number]} [公历月, 公历日]
 */
function solarTermDate(year, n) {
  const M = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1];
  const D = [3.87, 5.63, 4.81, 5.52, 5.678, 7.105, 7.5, 7.646, 8.318, 7.438, 7.18, 5.4055];
  const diff = year - 2000;
  const day = Math.floor(D[n] + 0.2422 * diff - Math.floor((diff - 1) / 4));
  return [M[n], day];
}

/**
 * 查询某年第 n 个节的日期(日精度)。
 * 回退链:精确时刻表(1900–2101)→ base64 查找表 → 寿星通式估算。
 * @returns {[number, number]} [公历月, 公历日]
 */
function jqDate(y, n) {
  // 1) 优先使用项目内置的精确节气时刻表(1900–2101,含时分秒)
  const row = SOLAR_TERM_TIMES[y];
  if (row && row[n]) {
    const p = row[n].split(' ')[0].split('-');
    if (p.length === 3) return [Number(p[1]), Number(p[2])];
  }
  // 2) 其次使用 base64 查找表(2 字节/节气:月-1、日-1)
  if (y >= 1900) {
    if (!_jqArr) _initJq();
    if (y <= _jqMaxYear) {
      const off = ((y - 1900) * 12 + n) * 2;
      if (off + 1 < _jqArr.length) return [_jqArr[off] + 1, _jqArr[off + 1] + 1];
    }
  }
  // 3) 超出数据范围时回退到公式估算
  return solarTermDate(y, n);
}

/**
 * 查询某年第 n 个节的精确时刻(Date 对象)。
 * 节气表以中国标准时间(UTC+8)保存,统一转为 UTC 时刻以便比较。
 * @returns {Date|null}
 */
function jqInstant(year, index) {
  const row = SOLAR_TERM_TIMES[year];
  if (row && row[index]) {
    return new Date(row[index].replace(' ', 'T') + '+08:00');
  }
  const d = jqDate(year, index);
  if (!d) return null;
  // solarTermDate/jqDate 对 index===11 已返回当年 1 月的小寒日期,这里无需再偏移年份
  return new Date(Date.UTC(year, d[0] - 1, d[1], 0, 0, 0) - 8 * 3600000);
}

/* ============================================================
 * 月柱判定
 * ============================================================ */

/** 将「中国标准时间墙上时钟」的出生年月日时分秒转为绝对时刻(UTC 纪元毫秒语义)。 */
function birthAsChinaStandardInstant(year, month, day, hour = 12, minute = 0, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - 8 * 3600000);
}

/**
 * 月柱判定:按节气「具体时刻」切换月序,不再按公历日期零点切换。
 * @param {Date|null} birthInstant 精确出生时刻(如已做真太阳时/时区换算);
 *                                 为 null 时按中国标准时间解释 year/month/day/hour/minute/second
 * @returns {{mi:number, yp:number}} mi=月序号(0=寅月 … 11=丑月),yp=干支纪年
 *          (立春前出生归属上一年)
 */
function getMonthPillar(year, month, day, hour = 12, minute = 0, second = 0, birthInstant = null) {
  const birth = birthInstant
    ? new Date(birthInstant)
    : birthAsChinaStandardInstant(year, month, day, hour, minute, second);

  const lichun = jqInstant(year, 0);
  if (!lichun) return { mi: 2, yp: year }; // 数据异常兜底

  const beforeLichun = birth < lichun;
  const yp = beforeLichun ? year - 1 : year;

  if (beforeLichun) {
    // 立春前的 1 月出生者,应与当年 1 月的小寒比较,而非上一年 1 月的小寒。
    // SOLAR_TERM_TIMES[year][11] 存的就是该年 1 月的小寒时刻。
    const xiaohan = jqInstant(year, 11);
    return { mi: xiaohan && birth >= xiaohan ? 11 : 10, yp };
  }

  // 立春后:顺扫十二节,取「最后一个不晚于出生时刻的节」
  let mi = 10;
  for (let i = 0; i <= 10; i++) {
    const term = jqInstant(year, i);
    if (term && birth >= term) mi = i;
    else if (term) break; // 节气时刻表按时间升序,遇到晚于出生的节即可停止
  }
  return { mi, yp };
}

/* ============================================================
 * 时区与真太阳时
 * ============================================================ */

/** 用 Intl 按 IANA 时区拆解绝对时刻的墙上时钟(年月日时分秒)。 */
function zoneParts(date, tz) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(
    f.formatToParts(date).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)])
  );
  // 某些引擎会把午夜格式化为 24:00,统一成次日 00:00 之前的可比较形式。
  if (p.hour === 24) p.hour = 0;
  return p;
}

/** 某绝对时刻在指定 IANA 时区的 UTC 偏移(分钟,含夏令时)。 */
function zoneOffsetMinutes(date, tz) {
  const p = zoneParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** 将某 IANA 时区的墙上时钟时间转为绝对时刻(迭代逼近处理夏令时切换)。 */
function zonedTimeToUtc(y, m, d, hour, minute, second, tz) {
  const wall = Date.UTC(y, m - 1, d, hour, minute, second);
  let utc = wall;
  // 两次迭代即可处理 IANA 时区的标准时与夏令时偏移。
  for (let i = 0; i < 3; i++) utc = wall - zoneOffsetMinutes(new Date(utc), tz) * 60000;
  return new Date(utc);
}

/**
 * 均时差(分钟,NOAA 近似式):真太阳时与平太阳时之差,年内约在 −14 ~ +16 分钟波动。
 * @param {number} doy 年内日序(1 月 1 日 = 1)
 */
function equationOfTimeMinutes(y, m, d) {
  const start = Date.UTC(y, 0, 0);
  const cur = Date.UTC(y, m - 1, d);
  const doy = Math.floor((cur - start) / 86400000);
  const B = 2 * Math.PI * (doy - 1) / 365;
  return 229.18 * (
    0.000075
    + 0.001868 * Math.cos(B)
    - 0.032077 * Math.sin(B)
    - 0.014615 * Math.cos(2 * B)
    - 0.040849 * Math.sin(2 * B)
  );
}

/**
 * 真太阳时校正:真太阳时 = UTC + 经度时间(每度 4 分钟)+ 均时差。
 * IANA 实际偏移已在 UTC 中处理,因而不再对 1986–1991 年按月份硬减一小时。
 * @param {Date} date 绝对时刻
 * @param {number} lon 出生地东经度数
 * @param {string} [tz='Asia/Shanghai'] IANA 时区
 */
function trueSolarTime(date, lon, tz = 'Asia/Shanghai') {
  const d = new Date(date);
  const p = zoneParts(d, tz);
  const correction = (lon * 4) + equationOfTimeMinutes(p.year, p.month, p.day);
  return new Date(d.getTime() + correction * 60000);
}

/* ============================================================
 * 出生时间 → 四柱入参解析
 * ============================================================ */

/**
 * 将用户输入的出生墙上时钟解析为排盘所需的日期与时辰地支。
 * 流程:时区换算(→绝对时刻)→(可选)真太阳时校正 → 时辰地支判定。
 * 时辰规则:23:00–24:00 为晚子时,日期进一位、时支记子(0);
 *           00:00–01:00 为早子时(0);01:00 起每两小时一个时辰(丑=1 … 亥=11)。
 * @param {boolean} useTrueSolar 是否启用真太阳时校正
 * @param {number} lon 出生地东经度数(配合 useTrueSolar)
 * @param {string} [tz='Asia/Shanghai'] 出生地 IANA 时区
 * @returns {{year:number,month:number,day:number,hour:number,minute:number,
 *            hourZhi:number,note:string,instant:number,tz:string}}
 */
function resolveBirthDateTime(y, m, d, hh, mm, useTrueSolar, lon, tz = 'Asia/Shanghai') {
  // 1) 墙上时钟 → 绝对时刻(含时区/夏令时)
  const civil = zonedTimeToUtc(y, m, d, hh, mm, 0, tz);

  // 2) 可选:真太阳时校正(按经度与均时差平移绝对时刻)
  const useSolar = useTrueSolar && Number.isFinite(lon);
  const solar = useSolar ? trueSolarTime(civil, lon, tz) : civil;

  // 3) 取用于排盘的墙上时钟分量:
  //    真太阳时路径读校正后时刻的 UTC 分量;否则按原时区拆解
  const p = useSolar
    ? {
        year: solar.getUTCFullYear(),
        month: solar.getUTCMonth() + 1,
        day: solar.getUTCDate(),
        hour: solar.getUTCHours(),
        minute: solar.getUTCMinutes(),
      }
    : zoneParts(civil, tz);

  let by = p.year;
  let bm = p.month;
  let bd = p.day;
  const ch = p.hour;
  const cmin = p.minute;

  // 4) 时辰地支判定(晚子时进日)
  const totalMin = ch * 60 + cmin;
  let hourZhi;
  if (totalMin >= 23 * 60) {
    hourZhi = 0; // 晚子时:时支记子,日期进一位
    const next = new Date(Date.UTC(by, bm - 1, bd + 1));
    by = next.getUTCFullYear();
    bm = next.getUTCMonth() + 1;
    bd = next.getUTCDate();
  } else if (totalMin < 60) {
    hourZhi = 0; // 早子时(00:00–00:59)
  } else {
    hourZhi = Math.floor((totalMin - 60) / 120) + 1; // 01:00 起每两小时一时辰
  }

  return {
    year: by, month: bm, day: bd,
    hour: ch, minute: cmin,
    hourZhi,
    note: useTrueSolar ? '已启用真太阳时换算（经度' + lon + '°）' : '',
    instant: civil.getTime(),
    tz,
  };
}

/* ============================================================
 * 日柱
 * ============================================================ */

/**
 * 日柱 60 甲子序号(0=甲子 … 59=癸亥)。
 * 锚点:2000-01-01 为戊午日(序号 54),按儒略日差线性推算,全球时区统一以 UTC 日期计。
 * @returns {number} 天干 = 返回值 % 10,地支 = 返回值 % 12
 */
function getDayPillarIndex(y, m, d) {
  const anchor = new Date(Date.UTC(2000, 0, 1)); // 戊午日,60 甲子序号 54
  const target = new Date(Date.UTC(y, m - 1, d));
  const diff = Math.round((target - anchor) / 86400000);
  return ((54 + diff) % 60 + 60) % 60;
}

export { _initJq, solarTermDate, jqDate, jqInstant, getMonthPillar, trueSolarTime, resolveBirthDateTime, getDayPillarIndex };
