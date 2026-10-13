/**
 * 紫微斗数排盘引擎(标准安星 · 纯函数)
 *
 * V5.1 升级:接入真实朔望历(lunar.js)取代「日柱甲子序 % 30」近似农历日;
 * 安星规则对齐通行标准实现(以 iztro, MIT 为交叉验证 oracle,
 * 见 tools/verify-ziwei-v1.mjs 全量比对):
 *   - 命宫/身宫:寅起正月顺数至生月,再起子时逆/顺数至生时(农历月;
 *     闰月上半月归前月、下半月归后月,即 iztro fixLeap 默认约定)
 *   - 命宫干支:五虎遁;五行局:命宫纳音
 *   - 紫微定位:商数-借数法(农历日÷局数,借至整除,奇借减偶借加,寅宫起数)
 *   - 天府:与紫微关于寅申轴对称;两系主星顺逆布列
 *   - 辅星:文昌(戌起子时逆)/文曲(辰起子时顺)/左辅(辰起正月顺)/右弼(戌起正月逆)/
 *     天魁天钺(年干)/禄存(年干禄位)/天马(年支三合)
 *   - 煞星:擎羊(禄存前一位)/陀罗(禄存后一位)/火铃(年支分组双起点+时支)/
 *     地空(亥起子时逆)/地劫(亥起子时顺)
 *   - 生年四化:标注于十四主星与昌曲辅弼(己干依 iztro 学派:武曲禄/贪狼权/天梁科/文曲忌)
 *
 * 仍未含(路线图):天刑/天姚/红鸾/天喜/孤辰/寡宿等杂曜、博士十二神、
 * 飞星四化(宫干)、大限/小限/流年斗君、星曜亮度(庙旺利陷)。
 *
 * 年界约定:紫微斗数以农历正月初一为年界(与八字引擎的立春年界不同),
 * 四化/禄马/火铃等按农历年干支取用。
 */
import { TG, DZ, NY } from './shared.js';

/* 十二宫名(自命宫起逆时针布列) */
const ZWG = '命宫,兄弟宫,夫妻宫,子女宫,财帛宫,疾厄宫,迁移宫,交友宫,事业宫,田宅宫,福德宫,父母宫'.split(',');

/* 五虎遁年上起月干基数:甲己丙首、乙庚戊头、丙辛庚起、丁壬壬位、戊癸甲寅 */
const MG_GAN_BASE = [2, 4, 6, 8, 0];

/* 纳音五行 → 五行局数:水二局、木三局、金四局、土五局、火六局 */
const WUXING_JU = { 金: 4, 木: 3, 水: 2, 火: 6, 土: 5 };

/* 紫微系主星及其相对紫微的宫位偏移(逆时针) */
const ZIWEI_SERIES = ['紫微', '天机', null, '太阳', '武曲', '天同', null, null, '廉贞'];
const ZIWEI_OFFSETS = [0, -1, -2, -3, -4, -5, -6, -7, -8];

/* 天府系主星(自天府顺时针,破军居 +10) */
const TIANFU_SERIES = ['天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', null, null, null, '破军'];

/* 禄存(以农历年干查,即临官禄位):甲寅 乙卯 丙戊巳 丁己午 庚申 辛酉 壬亥 癸子 */
const LUCUN_MAP = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];

/* 天马(以农历年支三合局查):寅午戌马在申、申子辰马在寅、巳酉丑马在亥、亥卯未马在巳 */
const TIANMA_MAP = {
  2: 8, 6: 8, 10: 8,   // 寅午戌 → 申
  8: 2, 0: 2, 4: 2,    // 申子辰 → 寅
  5: 11, 9: 11, 1: 11, // 巳酉丑 → 亥
  11: 5, 3: 5, 7: 5,   // 亥卯未 → 巳
};

/* 天魁/天钺(以农历年干查,即天乙贵人入斗数):
   甲戊庚牛羊、乙己鼠猴乡、丙丁猪鸡位、壬癸兔蛇藏、六辛逢马虎。
   值为 [天魁宫支序, 天钺宫支序] */
const KUIYUE_MAP = {
  0: [1, 7],  // 甲 → 魁丑 钺未
  1: [0, 8],  // 乙 → 魁子 钺申
  2: [11, 9], // 丙 → 魁亥 钺酉
  3: [11, 9], // 丁 → 魁亥 钺酉
  4: [1, 7],  // 戊 → 魁丑 钺未
  5: [0, 8],  // 己 → 魁子 钺申
  6: [1, 7],  // 庚 → 魁丑 钺未
  7: [6, 2],  // 辛 → 魁午 钺寅
  8: [3, 5],  // 壬 → 魁卯 钺巳
  9: [3, 5],  // 癸 → 魁卯 钺巳
};

/* 火星/铃星起点(以农历年支分组,自起点顺数生时):
   寅午戌:火起丑、铃起卯;申子辰:火起寅、铃起戌;
   巳酉丑:火起卯、铃起戌;亥卯未:火起酉、铃起戌 */
const HUOLING_BASE = {
  2: [1, 3], 6: [1, 3], 10: [1, 3],   // 寅午戌
  8: [2, 10], 0: [2, 10], 4: [2, 10], // 申子辰
  5: [3, 10], 9: [3, 10], 1: [3, 10], // 巳酉丑
  11: [9, 10], 3: [9, 10], 7: [9, 10] // 亥卯未 (铃星依 iztro 通行实现统一起戌)
};

/* 生年四化(以农历年干查):[化禄, 化权, 化科, 化忌]
   己干依 iztro 学派取「武曲禄/贪狼权/天梁科/文曲忌」(另有破军忌一说) */
const SIHUA_MAP = {
  甲: ['廉贞', '破军', '武曲', '太阳'],
  乙: ['天机', '天梁', '紫微', '太阴'],
  丙: ['天同', '天机', '文昌', '廉贞'],
  丁: ['太阴', '天同', '天机', '巨门'],
  戊: ['贪狼', '太阴', '右弼', '天机'],
  己: ['武曲', '贪狼', '天梁', '文曲'],
  庚: ['太阳', '武曲', '太阴', '天同'],
  辛: ['巨门', '太阳', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左辅', '武曲'],
  癸: ['破军', '巨门', '太阴', '贪狼'],
};

/**
 * 排紫微斗数盘(标准安星)。
 * @param {object} b mkBazi 的返回值(取 H.zi 时支;降级路径用 Y/M/dj)
 * @param {object|null} lunar solarToLunar(y, m, d) 的返回值(排盘日期的农历信息)。
 *   为 null(超出农历表范围 1900–2100)时降级为旧近似算法并在返回值标记 approximate。
 * @returns {{ps:Array<{n:string,g:string,m:string[],a:string[],s:string[]}>,
 *            bp:number, mingGongZhi:number, bodyGongZhi:number,
 *            ju:number, juName:string, mingGongGZ:string,
 *            lunar:object|null, approximate:boolean}}
 *   ps=十二宫(下标即宫位地支序 0=子),每宫 {n 宫名, g 宫干, m 主星(含四化后缀), a 辅星, s 煞星};
 *   ju/juName=五行局数/名;mingGongGZ=命宫干支;lunar=所用农历信息;
 *   bp 为历史保留字段(现无消费方)。
 */
function mkZw(b, lunar) {
  const approximate = !lunar;
  const hourZhi = b.H.zi;

  // 农历输入:正常走真实朔望历;越界时降级为旧近似(甲子序折算),保证不崩溃
  const lunarDay = approximate ? (b.dj % 30) + 1 : lunar.day;
  const lunarMonth = approximate ? ((b.M.zi - 2 + 12) % 12) + 1 : lunar.month;
  const isLeap = approximate ? false : lunar.isLeap;
  const yearGanIdx = approximate ? b.Y.gi : lunar.yearGanIdx;
  const yearZhiIdx = approximate ? b.Y.zi : lunar.yearZhiIdx;

  // 闰月修正:闰月上半月(≤15 日)归前月、下半月归后月(iztro fixLeap 默认约定)
  const leapAdj = (isLeap && lunarDay > 15) ? 1 : 0;
  const effMonth = lunarMonth + leapAdj; // 用于安宫的等效月数

  // 命宫:寅起正月顺数至生月,再由生月宫起子时逆数至生时(子-0 支序 = 月数+1-时支)
  const mingGongZhi = (effMonth + 1 - hourZhi + 24) % 12;
  // 身宫:同法顺数至生时
  const bodyGongZhi = (effMonth + 1 + hourZhi) % 12;

  // 命宫天干:五虎遁(农历年干 → 寅宫起干,顺数至命宫)
  const mingGongGanIdx = (MG_GAN_BASE[yearGanIdx % 5] + ((mingGongZhi - 2 + 12) % 12)) % 10;
  const mingGongGZ = TG[mingGongGanIdx] + DZ[mingGongZhi];
  // 由干支序号还原六十甲子序号(x ≡ g mod 10 且 x ≡ z mod 12 → x = 6g − 5z mod 60),取纳音定五行局
  const mingGongNaYin = NY[((6 * mingGongGanIdx - 5 * mingGongZhi) % 60 + 60) % 60] || '大驿土';
  const ju = WUXING_JU[mingGongNaYin.charAt(mingGongNaYin.length - 1)] || 5;
  const JU_NAMES = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };

  // 紫微定位(商数-借数法):求最小非负借数 offset 使 (农历日+offset) 被局数整除;
  // 商 q=(日+借)/局(取模 12);自寅宫数 q 位(q-1 步),借数为偶则加、为奇则减
  let offset = 0;
  while ((lunarDay + offset) % ju !== 0) offset++;
  const quotient = (((lunarDay + offset) / ju) % 12);
  const ziWeiPos = ((quotient + 1) + (offset % 2 === 0 ? offset : -offset) + 24) % 12; // 寅=2 起点换算为子-0 支序

  // 十二宫骨架(下标 = 地支序),宫干由五虎遁自寅宫顺布
  const palaces = [];
  for (let i = 0; i < 12; i++) {
    const ganIdx = (MG_GAN_BASE[yearGanIdx % 5] + ((i - 2 + 12) % 12)) % 10;
    palaces.push({ n: '', g: TG[ganIdx], m: [], a: [], s: [] });
  }
  // 宫名:自命宫逆时针布列(兄弟宫在命宫支序-1,依此类推)
  for (let k = 0; k < 12; k++) {
    palaces[(mingGongZhi - k + 12) % 12].n = ZWG[k];
  }

  /* —— 十四主星 —— */
  // 紫微系:自紫微逆布
  ZIWEI_SERIES.forEach((star, i) => {
    if (!star) return;
    palaces[((ziWeiPos + ZIWEI_OFFSETS[i]) % 12 + 12) % 12].m.push(star);
  });
  // 天府系:天府与紫微关于寅申轴对称(天府 = (4 − 紫微) mod 12),自天府顺布
  const tianFuPos = ((4 - ziWeiPos) % 12 + 12) % 12;
  TIANFU_SERIES.forEach((star, i) => {
    if (!star) return;
    palaces[(tianFuPos + i) % 12].m.push(star);
  });

  /* —— 辅星 —— */
  palaces[(10 - hourZhi + 12) % 12].a.push('文昌');   // 戌宫起子时逆数
  palaces[(hourZhi + 4) % 12].a.push('文曲');          // 辰宫起子时顺数
  palaces[(effMonth + 3) % 12].a.push('左辅');         // 辰宫起正月顺数(闰月按等效月)
  palaces[((11 - effMonth) % 12 + 12) % 12].a.push('右弼'); // 戌宫起正月逆数
  palaces[KUIYUE_MAP[yearGanIdx][0]].a.push('天魁');
  palaces[KUIYUE_MAP[yearGanIdx][1]].a.push('天钺');
  palaces[LUCUN_MAP[yearGanIdx]].a.push('禄存');       // 年干禄位
  palaces[TIANMA_MAP[yearZhiIdx]].a.push('天马');      // 年支三合

  /* —— 煞星 —— */
  const luPos = LUCUN_MAP[yearGanIdx];
  palaces[(luPos + 1) % 12].s.push('擎羊');            // 禄存前一位
  palaces[(luPos + 11) % 12].s.push('陀罗');           // 禄存后一位
  const [huoBase, lingBase] = HUOLING_BASE[yearZhiIdx];
  palaces[(huoBase + hourZhi) % 12].s.push('火星');    // 年支分组起点顺数生时
  palaces[(lingBase + hourZhi) % 12].s.push('铃星');
  palaces[(11 - hourZhi + 12) % 12].s.push('地空');    // 亥宫起子时逆数
  palaces[(hourZhi + 11) % 12].s.push('地劫');         // 亥宫起子时顺数

  /* —— 生年四化:标注于十四主星与昌曲辅弼 —— */
  const siHua = SIHUA_MAP[TG[yearGanIdx]] || [];
  const markMutagen = (list) => {
    list.forEach((star, idx) => {
      if (siHua[0] === star) list[idx] += '·禄';
      if (siHua[1] === star) list[idx] += '·权';
      if (siHua[2] === star) list[idx] += '·科';
      if (siHua[3] === star) list[idx] += '·忌';
    });
  };
  palaces.forEach((p) => { markMutagen(p.m); markMutagen(p.a); });

  return {
    ps: palaces,
    bp: (mingGongZhi + hourZhi + 2) % 12, // 历史保留字段
    mingGongZhi,
    bodyGongZhi,
    ju,
    juName: JU_NAMES[ju] || '',
    mingGongGZ,
    lunar: approximate ? null : lunar,
    approximate,
  };
}

export { mkZw };
