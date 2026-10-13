/**
 * 奇门遁甲排盘引擎(高度简化实现,纯函数)
 *
 * ⚠️ 实现深度说明(与 README 标注一致):
 *   - 阴阳遁以「月支」判定(寅–巳月阳遁、午–亥月阴遁),真实奇门应以
 *     冬至/夏至的具体时刻分界;
 *   - 局数以日柱六十甲子序号线性折算,真实时家奇门应按节气三元
 *     (上/中/下元)与符头定局;
 *   - 八门/九星/八神以局数为起点做线性偏移布宫,未实现值符值使随
 *     时干支转盘/飞盘的完整规则;
 *   - 无天地盘三奇六仪布列、无马星/空亡/入墓等判断。
 *
 *   本模块定位为「九宫速览展示」,深度排盘在路线图中。
 *
 * 本文件由早期压缩风格源码展开重构而来,导出签名与行为与重构前完全一致。
 */

/* 八门(洛书八宫顺序布列) */
const QD = '休门,生门,伤门,杜门,景门,死门,惊门,开门'.split(',');
/* 九星 */
const QS = '天蓬,天任,天冲,天辅,天英,天芮,天柱,天心,天禽'.split(',');
/* 八神 */
const QG = '值符,腾蛇,太阴,六合,白虎,玄武,九地,九天'.split(',');
/* 九宫名(洛书:坎一 → 离九,第 5 项为中五宫) */
const QP = '坎一宫,坤二宫,震三宫,巽四宫,中五宫,乾六宫,兑七宫,艮八宫,离九宫'.split(',');

/* 阳遁月支(简化版):子–巳(0–5)为阳遁、午–亥(6–11)为阴遁 */
const YANG_DUN_MONTH_ZHI = [0, 1, 2, 3, 4, 5];

/**
 * 排奇门遁甲盘(简化版)。
 * @param {object} b mkBazi 的返回值(取 M.zi 月支、H.gi 时干序、dj 日柱甲子序)
 * @returns {{ps:Array<{p:string,d:string,s:string,g:string,cc:boolean}>,
 *            ju:number, yangDun:boolean}}
 *   ps=九宫,每宫 {p 宫名, d 八门, s 九星, g 八神, cc 是否中五宫};
 *   ju=局数(1–9);yangDun=是否阳遁。
 */
function mkQm(b) {
  const monthZhi = b.M.zi;

  // 阴阳遁:冬至后用阳遁、夏至后用阴遁(简化:阳遁为子–巳月,阴遁为午–亥月)
  const yangDun = YANG_DUN_MONTH_ZHI.includes(monthZhi);

  // 局数:由日柱六十甲子序号线性折算,归一到 1–9
  const juBase = yangDun ? (b.dj % 9 + 1) : (10 - b.dj % 9);
  const ju = ((juBase - 1) % 9) + 1;

  // 时干序:八神自时干起布(简化)
  const shiGan = b.H.gi;

  const palaces = [];
  for (let i = 0; i < 9; i++) {
    // 八门:阳遁自局数顺行(模 8),阴遁逆行
    const doorIdx = yangDun ? (ju - 1 + i) % 8 : ((ju - 1 - i) % 8 + 8) % 8;
    // 九星:阳遁以局数为起点、步长 2 顺行(模 9),阴遁逆行
    const starIdx = yangDun ? (ju - 1 + i * 2) % 9 : ((ju - 1 - i * 2) % 9 + 9) % 9;
    palaces.push({
      p: QP[i],             // 宫名
      d: QD[doorIdx],       // 八门
      s: QS[starIdx],       // 九星
      g: QG[(shiGan + i) % 8], // 八神(自时干顺布)
      cc: i === 4,          // 中五宫标记
    });
  }

  return { ps: palaces, ju, yangDun };
}

export { mkQm };
