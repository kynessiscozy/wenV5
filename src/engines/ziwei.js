/**
 * 紫微斗数排盘引擎(简化实现,纯函数)
 *
 * ⚠️ 实现深度说明(与 README 标注一致):
 *   - 农历日近似:以日柱六十甲子序号 % 30 近似农历日,未接入真实朔望历;
 *   - 十四主星安星(紫微系逆布、天府系顺布、天府取寅申轴对称)与
 *     文昌/文曲/左辅/右弼/天魁/天钺/地空/地劫等辅煞安法遵循通行口诀;
 *   - 擎羊/陀罗/火星/铃星采用线性简化公式(非禄位起法与寅午戌/申子辰双起点法);
 *   - 四化仅标注于十四主星(昌曲辅弼化科等情形未处理);
 *   - 未含:旬空/截路、生年博士十二神、飞星四化、大限小限流年斗君。
 *
 * 深度排盘在路线图中;任何改动须先通过 tools/ 下验证套件与本模块的
 * 新旧实现模糊等价对比。
 *
 * 本文件由早期压缩风格源码展开重构而来,导出签名与行为与重构前完全一致。
 */
import { TG, DZ, NY } from './shared.js';

/* 十二宫名(自命宫起逆布,数组顺序即 ps 下标顺序) */
const ZWG = '命宫,兄弟宫,夫妻宫,子女宫,财帛宫,疾厄宫,迁移宫,交友宫,事业宫,田宅宫,福德宫,父母宫'.split(',');

/* 五虎遁年上起月干基数(同 bazi.js MONTH_GAN_BASE):甲己丙首、乙庚戊头、丙辛庚起、丁壬壬位、戊癸甲寅 */
const MG_GAN_BASE = [2, 4, 6, 8, 0];

/* 纳音五行 → 五行局数:水二局、木三局、金四局、土五局、火六局 */
const WUXING_JU = { 金: 4, 木: 3, 水: 2, 火: 6, 土: 5 };

/* 紫微系主星及其相对紫微的宫位偏移(逆时针):
   紫微(0)、天机(-1)、空(-2)、太阳(-3)、武曲(-4)、天同(-5)、空(-6)、空(-7)、廉贞(-8) */
const ZIWEI_SERIES = ['紫微', '天机', null, '太阳', '武曲', '天同', null, null, '廉贞'];
const ZIWEI_OFFSETS = [0, -1, -2, -3, -4, -5, -6, -7, -8];

/* 天府系主星(自天府顺时针):天府、太阴、贪狼、巨门、天相、天梁、七杀、空×3、破军(+10) */
const TIANFU_SERIES = ['天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', null, null, null, null, '破军'];

/* 天魁/天钺(以年干查,即天乙贵人入斗数):甲戊庚牛羊、乙己鼠猴乡、丙丁猪鸡位、
   壬癸兔蛇藏、六辛逢马虎。值为 [天魁宫支序, 天钺宫支序] */
const KUIYUE_MAP = {
  0: [1, 7],  // 甲 → 丑未
  1: [0, 8],  // 乙 → 子申
  2: [11, 9], // 丙 → 亥酉
  3: [11, 9], // 丁 → 亥酉
  4: [1, 7],  // 戊 → 丑未
  5: [0, 8],  // 己 → 子申
  6: [7, 1],  // 庚 → 未丑
  7: [6, 2],  // 辛 → 午寅
  8: [3, 5],  // 壬 → 卯巳
  9: [3, 5],  // 癸 → 卯巳
};

/* 生年四化(以年干查):[化禄, 化权, 化科, 化忌] 对应主星 */
const SIHUA_MAP = {
  甲: ['廉贞', '破军', '武曲', '太阳'],
  乙: ['天机', '天梁', '紫微', '太阴'],
  丙: ['天同', '天机', '文昌', '廉贞'],
  丁: ['太阴', '天同', '天机', '巨门'],
  戊: ['贪狼', '太阴', '右弼', '天机'],
  己: ['武曲', '贪狼', '天梁', '破军'],
  庚: ['太阳', '武曲', '太阴', '天同'],
  辛: ['巨门', '太阳', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左辅', '武曲'],
  癸: ['破军', '巨门', '太阴', '贪狼'],
};

/**
 * 排紫微斗数盘(简化版)。
 * @param {object} b mkBazi 的返回值(取 Y.gi/Y.g/Y.zi、M.zi、H.zi、dj)
 * @returns {{ps:Array<{n:string,m:string[],a:string[],s:string[]}>,
 *            bp:number, mingGongZhi:number, bodyGongZhi:number}}
 *   ps=十二宫(下标即宫支序),每宫 {n 宫名, m 主星(含四化后缀), a 辅星, s 煞星};
 *   mingGongZhi/bodyGongZhi=命宫/身宫地支序;bp 为历史保留字段(现无消费方)。
 */
function mkZw(b) {
  const palaces = ZWG.map((n) => ({ n, m: [], a: [], s: [] }));

  // 农历日近似:日柱六十甲子序号 % 30 + 1(简化,非真实朔望历)
  const lunarDay = (b.dj % 30) + 1;
  const monthZhi = b.M.zi; // 月支序(正月=寅=2)
  const hourZhi = b.H.zi;  // 时支序(子=0)

  // 命宫:寅起正月顺数至生月,再由生月宫起子时逆数至生时 → 月支 - 时支
  const mingGongZhi = (monthZhi - hourZhi + 12) % 12;
  // 身宫:同法顺数至生时 → 月支 + 时支
  const bodyGongZhi = (monthZhi + hourZhi) % 12;

  // 命宫干支:天干由年干五虎遁,把命宫支当作「月位」自寅(2)起数
  const mingGongGanIdx = (MG_GAN_BASE[b.Y.gi % 5] + ((mingGongZhi - 2 + 12) % 12)) % 10;
  // 由干支序号还原六十甲子序号(x ≡ g mod 10 且 x ≡ z mod 12 → x = 6g − 5z mod 60),取纳音
  const mingGongNaYin = NY[((6 * mingGongGanIdx - 5 * mingGongZhi) % 60 + 60) % 60] || '大驿土';

  // 五行局:取命宫纳音的五行属性
  const ju = WUXING_JU[mingGongNaYin.charAt(mingGongNaYin.length - 1)] || 5;

  // 紫微落宫(简化取法):农历日除以局数向上取整 × 局数,自命宫起数
  const ziWeiPos = (Math.ceil(lunarDay / ju) * ju + mingGongZhi) % 12;

  // 紫微系:自紫微逆布(偏移见 ZIWEI_OFFSETS)
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
  palaces[(10 - hourZhi + 12) % 12].a.push('文昌'); // 戌宫起子时逆数
  palaces[(hourZhi + 4) % 12].a.push('文曲');        // 辰宫起子时顺数
  palaces[(monthZhi + 2) % 12].a.push('左辅');       // 辰宫起正月顺数
  palaces[((12 - monthZhi) + 12) % 12].a.push('右弼'); // 戌宫起正月逆数
  // 天魁/天钺(年干查表)
  palaces[KUIYUE_MAP[b.Y.gi][0]].a.push('天魁');
  palaces[KUIYUE_MAP[b.Y.gi][1]].a.push('天钺');

  /* —— 煞星(线性简化公式,见文件头说明) —— */
  palaces[(b.Y.gi + 3) % 12].s.push('擎羊');
  palaces[(b.Y.gi + 1) % 12].s.push('陀罗');
  palaces[(b.Y.zi * 3 + 2) % 12].s.push('火星');
  palaces[(b.Y.zi * 2 + 10) % 12].s.push('铃星');
  palaces[(11 - hourZhi + 12) % 12].s.push('地空'); // 亥宫起子时逆数
  palaces[(hourZhi + 11) % 12].s.push('地劫');      // 亥宫起子时顺数

  /* —— 生年四化:仅标注于十四主星(昌曲辅弼之化暂不处理) —— */
  const siHua = SIHUA_MAP[b.Y.g] || [];
  palaces.forEach((p) => {
    p.m.forEach((star, idx) => {
      if (siHua[0] === star) p.m[idx] += '·禄';
      if (siHua[1] === star) p.m[idx] += '·权';
      if (siHua[2] === star) p.m[idx] += '·科';
      if (siHua[3] === star) p.m[idx] += '·忌';
    });
  });

  return { ps: palaces, bp: (mingGongZhi + hourZhi + 2) % 12, mingGongZhi, bodyGongZhi };
}

export { mkZw };
