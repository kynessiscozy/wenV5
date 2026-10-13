/**
 * 四时旺衰引擎(纯函数)
 *
 * 由月支判定季节与季节特征,再按「当令者旺、令生者相、生令者休、
 * 克令者囚、令克者死」的四时旺相休囚死体系,给出日主五行的季节状态。
 * 特例:辰戌丑未四季土旺月,土日主直接论旺。
 *
 * 本文件由早期压缩风格源码展开重构而来,导出签名与行为与重构前完全一致
 * (经新旧实现全组合模糊等价对比:12 月支 × 10 日干零差异)。
 */
import { GW } from './shared.js';

/* 月支 → 季节描述(s 名称 / se 当令五行 / sp 季节特征 / season 所属季) */
const MONTH_SEASON = {
  寅: { s: '春', se: '木', sp: '生发', season: '春' },
  卯: { s: '春', se: '木', sp: '生发', season: '春' },
  辰: { s: '春季末', se: '土', sp: '转化', season: '春' },
  巳: { s: '夏', se: '火', sp: '旺盛', season: '夏' },
  午: { s: '夏', se: '火', sp: '旺盛', season: '夏' },
  未: { s: '夏季末', se: '土', sp: '蕴藏', season: '夏' },
  申: { s: '秋', se: '金', sp: '收敛', season: '秋' },
  酉: { s: '秋', se: '金', sp: '收敛', season: '秋' },
  戌: { s: '秋季末', se: '土', sp: '肃杀', season: '秋' },
  亥: { s: '冬', se: '水', sp: '潜藏', season: '冬' },
  子: { s: '冬', se: '水', sp: '潜藏', season: '冬' },
  丑: { s: '冬季末', se: '土', sp: '待发', season: '冬' },
};

/* 四时旺相休囚死表:每季中五行各居其一态 */
const SEASON_STATE = {
  春: { 木: '旺', 火: '相', 土: '死', 金: '囚', 水: '休' },
  夏: { 火: '旺', 土: '相', 金: '死', 水: '囚', 木: '休' },
  秋: { 金: '旺', 水: '相', 木: '死', 火: '囚', 土: '休' },
  冬: { 水: '旺', 木: '相', 火: '死', 土: '囚', 金: '休' },
};

/**
 * 四时旺衰判定。
 * @param {object} b mkBazi 的返回值(取 M.z 月支、D.g 日干)
 * @returns {{s:string, se:string, sp:string, st:string, season:string}}
 *   s=季节名 / se=当令五行 / sp=季节特征 / st=日主旺衰状态 / season=所属季
 */
function mkSi(b) {
  const monthZhi = b.M.z;
  const rule = MONTH_SEASON[monthZhi] || { s: '冬季末', se: '土', sp: '待发', season: '冬' };

  let state = SEASON_STATE[rule.season][GW[b.D.g]];
  // 辰戌丑未四季月:土当令,土日主论旺
  if ('辰戌丑未'.includes(monthZhi) && GW[b.D.g] === '土') state = '旺';

  return { s: rule.s, se: rule.se, sp: rule.sp, st: state, season: rule.season };
}

export { mkSi };
