/* ============================================================
   八字合盘引擎（synastry）
   ------------------------------------------------------------
   与旧版 relation.js 的区别：旧版只回显了用户自己的分数，
   并未真正为对方排盘。本模块会用 mkBazi 为对方排出真实命盘，
   再逐项比对干支关系。

   精度分级：
     full  —— 已知出生时辰，四柱全排
     day   —— 仅知年月日，三柱（年/月/日）比对；日柱仍可精确计算，
               而日柱正是合婚中最关键的「夫妻宫」，因此结论依然成立
   缺时辰只影响「时柱」相关判断（子女宫、晚年节奏），
   UI 会明确标注，不做无依据的补全。
   ============================================================ */

import { TG, DZ, WX, GW, ZW, ZC, SS } from './shared.js';
import { mkBazi, mkWx } from './bazi.js';

/* —— 干支关系表 —— */
// 天干五合
const GAN_HE = { 甲:'己', 己:'甲', 乙:'庚', 庚:'乙', 丙:'辛', 辛:'丙', 丁:'壬', 壬:'丁', 戊:'癸', 癸:'戊' };
// 天干相冲（相隔七位）
const GAN_CHONG = { 甲:'庚', 庚:'甲', 乙:'辛', 辛:'乙', 丙:'壬', 壬:'丙', 丁:'癸', 癸:'丁' };
// 地支六合
const ZHI_HE = { 子:'丑', 丑:'子', 寅:'亥', 亥:'寅', 卯:'戌', 戌:'卯', 辰:'酉', 酉:'辰', 巳:'申', 申:'巳', 午:'未', 未:'午' };
// 地支六冲
const ZHI_CHONG = { 子:'午', 午:'子', 丑:'未', 未:'丑', 寅:'申', 申:'寅', 卯:'酉', 酉:'卯', 辰:'戌', 戌:'辰', 巳:'亥', 亥:'巳' };
// 地支相害
const ZHI_HAI = { 子:'未', 未:'子', 丑:'午', 午:'丑', 寅:'巳', 巳:'寅', 卯:'辰', 辰:'卯', 申:'亥', 亥:'申', 酉:'戌', 戌:'酉' };
// 地支三合局
const ZHI_SANHE = [
  { set: ['申','子','辰'], wx: '水' },
  { set: ['亥','卯','未'], wx: '木' },
  { set: ['寅','午','戌'], wx: '火' },
  { set: ['巳','酉','丑'], wx: '金' },
];
// 地支相刑
const ZHI_XING = [
  { set: ['寅','巳','申'], n: '无恩之刑' },
  { set: ['丑','戌','未'], n: '恃势之刑' },
  { set: ['子','卯'],      n: '无礼之刑' },
];

const PILLAR_LABEL = { Y: '年柱', M: '月柱', D: '日柱', H: '时柱' };
// 各柱在关系判断中的权重：日柱为夫妻宫，权重最高
const PILLAR_WEIGHT = { D: 3.0, M: 1.6, Y: 1.0, H: 1.0 };

/* ------------------------------------------------------------
   为「对方」排盘
   注意：不能调用 mkDy()，它内部直接读取页面上本人的 bDate 输入框。
------------------------------------------------------------ */
export function buildPartnerChart({ y, m, d, hourZhi }) {
  const known = Number.isInteger(hourZhi) && hourZhi >= 0 && hourZhi <= 11;
  // 时辰未知时用午时(6)占位仅为让 mkBazi 返回完整结构，
  // 后续所有比对都会跳过 H 柱，占位值不参与任何结论。
  const b = mkBazi(y, m, d, known ? hourZhi : 6);
  return {
    b,
    precision: known ? 'full' : 'day',
    pillars: known ? ['Y', 'M', 'D', 'H'] : ['Y', 'M', 'D'],
  };
}

/* ------------------------------------------------------------
   五行分布（按可用柱数计算，避免把占位时柱算进去）
------------------------------------------------------------ */
function wuxingOf(b, pillars) {
  const c = { 木:0, 火:0, 土:0, 金:0, 水:0 };
  pillars.forEach(k => {
    c[GW[b[k].g]] += 1;
    c[ZW[b[k].z]] += 1;
    const cg = ZC[b[k].z] || [];
    if (cg[0]) c[GW[cg[0]]] += 0.6;
    if (cg[1]) c[GW[cg[1]]] += 0.3;
    if (cg[2]) c[GW[cg[2]]] += 0.1;
  });
  const total = Object.values(c).reduce((a, v) => a + v, 0) || 1;
  const pct = {};
  WX.forEach(w => pct[w] = Math.round(c[w] / total * 100));
  return { count: c, pct, total };
}

/* ------------------------------------------------------------
   核心：逐柱比对，产出加权互动清单
------------------------------------------------------------ */
function pillarInteractions(mine, theirs, pillarsA, pillarsB) {
  const hits = [];
  const push = (kind, score, pa, pb, text) => hits.push({
    kind, score, text,
    where: `我${PILLAR_LABEL[pa]} × 对方${PILLAR_LABEL[pb]}`,
    weight: (PILLAR_WEIGHT[pa] + PILLAR_WEIGHT[pb]) / 2,
  });

  for (const pa of pillarsA) {
    for (const pb of pillarsB) {
      const A = mine[pa], B = theirs[pb];

      // —— 天干 ——
      if (GAN_HE[A.g] === B.g) {
        push('he', 6, pa, pb, `天干「${A.g}${B.g}」相合，表达方式容易同步`);
      }
      if (GAN_CHONG[A.g] === B.g) {
        push('chong', -4, pa, pb, `天干「${A.g}${B.g}」相冲，观点容易正面碰撞`);
      }

      // —— 地支 ——
      if (ZHI_HE[A.z] === B.z) {
        push('he', 7, pa, pb, `地支「${A.z}${B.z}」六合，相处自然、彼此愿意迁就`);
      }
      if (ZHI_CHONG[A.z] === B.z) {
        push('chong', -7, pa, pb, `地支「${A.z}${B.z}」相冲，节奏与需求容易错位`);
      }
      if (ZHI_HAI[A.z] === B.z) {
        push('hai', -4, pa, pb, `地支「${A.z}${B.z}」相害，细节上易生嫌隙`);
      }
      for (const x of ZHI_XING) {
        if (x.set.includes(A.z) && x.set.includes(B.z) && A.z !== B.z) {
          push('xing', -3, pa, pb, `地支「${A.z}${B.z}」相刑（${x.n}），压力下易互相消耗`);
        }
      }
      // 三合（两支半合）
      for (const s of ZHI_SANHE) {
        if (s.set.includes(A.z) && s.set.includes(B.z) && A.z !== B.z) {
          push('sanhe', 5, pa, pb, `地支「${A.z}${B.z}」半合${s.wx}局，共同目标上容易形成合力`);
        }
      }
    }
  }
  return hits;
}

/* ------------------------------------------------------------
   五行互补：对方是否补到我的用神 / 是否加重我的忌神
------------------------------------------------------------ */
function complementarity(myWx, myYongShen, theirPct) {
  const supply = theirPct[myYongShen] || 0;
  let level, text, score;
  if (supply >= 30) {
    level = 'strong'; score = 12;
    text = `对方命局中「${myYongShen}」占 ${supply}%，正是你需要补的方向，相处时你会明显觉得放松、被托住。`;
  } else if (supply >= 18) {
    level = 'good'; score = 7;
    text = `对方「${myYongShen}」占 ${supply}%，能补到你需要的部分，属于互补型组合。`;
  } else if (supply >= 8) {
    level = 'mild'; score = 2;
    text = `对方「${myYongShen}」占 ${supply}%，补益有限，但也不冲突。`;
  } else {
    level = 'weak'; score = -3;
    text = `对方「${myYongShen}」仅占 ${supply}%，你需要的能量对方给不了太多，得靠各自的生活方式去补。`;
  }
  return { level, score, supply, text, yongShen: myYongShen };
}

/* ------------------------------------------------------------
   日主十神关系：对方日主之于我，是什么角色
------------------------------------------------------------ */
const SS_ROLE = {
  比肩: { t: '同频伙伴', d: '你们本质相似，容易理解彼此，但也容易在同一件事上同时倔强。' },
  劫财: { t: '竞争同伴', d: '互相激励，但涉及资源与主导权时要提前说清楚。' },
  食神: { t: '放松出口', d: '对方让你愿意表达、放下防备，是能让你松弛下来的类型。' },
  伤官: { t: '灵感刺激', d: '对方常带来新想法，也可能挑战你的既有节奏，新鲜感与摩擦并存。' },
  偏财: { t: '开阔视野', d: '对方带你接触更广的人与机会，相处轻快，但要留意分寸与承诺。' },
  正财: { t: '务实经营', d: '关系落在实处，谈具体安排比谈感受更顺畅。' },
  七杀: { t: '推动压力', d: '对方会推着你成长，强度较高，需要你有足够的心理空间。' },
  正官: { t: '秩序稳定', d: '对方带来规则与安全感，关系稳定，但要避免变成单向管理。' },
  偏印: { t: '精神共鸣', d: '你们在思想与内在世界上能对话，但现实事务上要多确认。' },
  正印: { t: '照顾支持', d: '对方给你支持与包容，是让你安心的类型，注意不要过度依赖。' },
};

function dayMasterRelation(myDayGan, theirDayGan) {
  const ss = SS[myDayGan][theirDayGan];
  const role = SS_ROLE[ss] || { t: ss, d: '' };
  return { ss, title: role.t, desc: role.d, theirDayGan, myDayGan };
}

/* ------------------------------------------------------------
   主入口
------------------------------------------------------------ */
export function calcSynastry({ myChart, myPillars, myYongShen, partner }) {
  const p = buildPartnerChart(partner);
  const pillarsA = myPillars || ['Y', 'M', 'D', 'H'];
  const pillarsB = p.pillars;

  const hits = pillarInteractions(myChart, p.b, pillarsA, pillarsB);
  const myWx = wuxingOf(myChart, pillarsA);
  const theirWx = wuxingOf(p.b, pillarsB);
  const comp = complementarity(myWx, myYongShen, theirWx.pct);
  const dm = dayMasterRelation(myChart.D.g, p.b.D.g);

  // —— 日柱直接关系（夫妻宫，单独强调）——
  const dayPair = {
    heGan:    GAN_HE[myChart.D.g] === p.b.D.g,
    chongGan: GAN_CHONG[myChart.D.g] === p.b.D.g,
    heZhi:    ZHI_HE[myChart.D.z] === p.b.D.z,
    chongZhi: ZHI_CHONG[myChart.D.z] === p.b.D.z,
    haiZhi:   ZHI_HAI[myChart.D.z] === p.b.D.z,
    same:     myChart.D.g === p.b.D.g && myChart.D.z === p.b.D.z,
  };

  // —— 计分 ——
  let raw = 0;
  hits.forEach(h => { raw += h.score * h.weight; });
  raw += comp.score * 2;

  // 归一到 0~100：以经验区间 [-60, 60] 映射，避免极端值
  const score = Math.max(5, Math.min(97, Math.round(50 + raw * 0.78)));

  // 去重：两柱干支相同时（如月柱=日柱）会产生文案完全一致的条目，
  // 展示层只保留权重最高的一条，避免「同一句话说两遍」。
  const dedupe = list => {
    const seen = new Map();
    for (const h of list) {
      const prev = seen.get(h.text);
      if (!prev || Math.abs(h.score * h.weight) > Math.abs(prev.score * prev.weight)) seen.set(h.text, h);
    }
    return [...seen.values()];
  };

  const positives = dedupe(hits.filter(h => h.score > 0))
    .sort((a, b) => b.score * b.weight - a.score * a.weight);
  const frictions = dedupe(hits.filter(h => h.score < 0))
    .sort((a, b) => a.score * a.weight - b.score * b.weight);

  return {
    score,
    precision: p.precision,
    partnerChart: p.b,
    partnerPillars: pillarsB,
    myWx, theirWx,
    comp, dm, dayPair,
    positives, frictions,
    counts: {
      he: hits.filter(h => h.kind === 'he' || h.kind === 'sanhe').length,
      chong: hits.filter(h => h.kind === 'chong').length,
      other: hits.filter(h => h.kind === 'hai' || h.kind === 'xing').length,
    },
  };
}

export { PILLAR_LABEL };
