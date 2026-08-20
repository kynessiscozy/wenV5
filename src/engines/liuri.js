/* ============================================================
   流日引擎（今日 × 命盘）
   ------------------------------------------------------------
   目标：让每日内容真正建立在「当日干支 与 本人命盘」的互动上，
   而不是把预写片段按天轮换。

   竞品（Co-Star）被诟病的核心问题是：
     片段之间互不感知 —— 周一让你谨慎、周二让你大胆，
     因为它们抽自不同的池子，没有综合。
   这里的做法相反：先把当日与命盘的所有互动算出来，
   汇总成一个「基调」，再由基调统一决定所有文案，
   保证同一天内的建议自洽。

   刻意不做的事：
     · 不输出吉凶断言（今日大凶 / 必有贵人）
     · 不制造紧迫感来促使打开
     · 不给出无法验证的具体预言
   ============================================================ */

import { TG, DZ, GW, ZW, ZC, SS } from './shared.js';
import { getDayPillarIndex, getMonthPillar } from './calendar.js';

const ZHI_HE    = { 子:'丑', 丑:'子', 寅:'亥', 亥:'寅', 卯:'戌', 戌:'卯', 辰:'酉', 酉:'辰', 巳:'申', 申:'巳', 午:'未', 未:'午' };
const ZHI_CHONG = { 子:'午', 午:'子', 丑:'未', 未:'丑', 寅:'申', 申:'寅', 卯:'酉', 酉:'卯', 辰:'戌', 戌:'辰', 巳:'亥', 亥:'巳' };
const ZHI_HAI   = { 子:'未', 未:'子', 丑:'午', 午:'丑', 寅:'巳', 巳:'寅', 卯:'辰', 辰:'卯', 申:'亥', 亥:'申', 酉:'戌', 戌:'酉' };
const GAN_HE    = { 甲:'己', 己:'甲', 乙:'庚', 庚:'乙', 丙:'辛', 辛:'丙', 丁:'壬', 壬:'丁', 戊:'癸', 癸:'戊' };
const SHENG = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };
const KE    = { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' };

const PILLAR_LABEL = { Y:'年柱', M:'月柱', D:'日柱', H:'时柱' };
// 流日与哪一柱互动最要紧：日柱（自身）> 月柱（工作/环境）> 时柱 > 年柱
const PILLAR_WEIGHT = { D: 3.0, M: 1.8, H: 1.4, Y: 1.0 };

/** 取某一天的干支（默认今天） */
export function getDayGZ(date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const dji = getDayPillarIndex(y, m, d);
  const gan = TG[dji % 10], zhi = DZ[dji % 12];
  const mp = getMonthPillar(y, m, d);
  const mzi = (mp.mi + 2) % 12;
  const mgi = ([2, 4, 6, 8, 0][((((mp.yp - 4) % 10) + 10) % 10) % 5] + mp.mi) % 10;
  const ygi = (((mp.yp - 4) % 10) + 10) % 10, yzi = (((mp.yp - 4) % 12) + 12) % 12;
  return {
    gan, zhi, gz: gan + zhi,
    wx: GW[gan], zhiWx: ZW[zhi],
    month: { g: TG[mgi], z: DZ[mzi] },
    year:  { g: TG[ygi], z: DZ[yzi] },
    dateKey: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  };
}

/** 十神 → 今日适合处理的事务领域 */
const ROLE_DOMAIN = {
  比肩: { domain: '独立推进与自我主张', act: '适合自己动手把一件事推到底，不必等人配合。' },
  劫财: { domain: '竞争与资源分配',     act: '涉及分工、报价、归属的事今天讲清楚，别含糊过去。' },
  食神: { domain: '表达与产出',         act: '适合写东西、做方案、把想法变成可见的成果。' },
  伤官: { domain: '创新与突破',         act: '适合提出新做法，但对上沟通时先讲理由再讲结论。' },
  偏财: { domain: '机会与外部资源',     act: '适合对外联络、拓展渠道，留意别把摊子铺太大。' },
  正财: { domain: '收入与务实安排',     act: '适合处理账目、报销、合同这类需要精确的事。' },
  七杀: { domain: '压力与硬仗',         act: '适合啃最难的那件事，但强度别拉满，留出恢复。' },
  正官: { domain: '规则与责任',         act: '适合确认流程、推进审批、明确谁负责什么。' },
  偏印: { domain: '思考与内省',         act: '适合研究、复盘、独处消化，不适合密集社交。' },
  正印: { domain: '学习与支持',         act: '适合请教他人、整理资料、接受帮助。' },
};

/**
 * 计算今日与命盘的互动
 * @param chart   本人四柱 { Y,M,D,H }
 * @param yongShen 用神
 * @param date
 */
export function calcLiuRi(chart, yongShen, date = new Date()) {
  const day = getDayGZ(date);
  const myDayGan = chart.D.g;
  const role = SS[myDayGan][day.gan];
  const roleInfo = ROLE_DOMAIN[role] || { domain: '日常推进', act: '按既定节奏完成当天重点。' };

  // —— 逐柱互动 ——
  const hits = [];
  for (const k of ['Y', 'M', 'D', 'H']) {
    const P = chart[k];
    if (!P) continue;
    const w = PILLAR_WEIGHT[k];
    if (ZHI_HE[P.z] === day.zhi) {
      hits.push({ kind:'he', w, score: 6, pillar: k,
        text: `流日「${day.zhi}」与你${PILLAR_LABEL[k]}「${P.z}」六合` });
    }
    if (ZHI_CHONG[P.z] === day.zhi) {
      hits.push({ kind:'chong', w, score: -7, pillar: k,
        text: `流日「${day.zhi}」冲你${PILLAR_LABEL[k]}「${P.z}」` });
    }
    if (ZHI_HAI[P.z] === day.zhi) {
      hits.push({ kind:'hai', w, score: -3, pillar: k,
        text: `流日「${day.zhi}」与你${PILLAR_LABEL[k]}「${P.z}」相害` });
    }
    if (GAN_HE[P.g] === day.gan) {
      hits.push({ kind:'ganhe', w, score: 4, pillar: k,
        text: `流日天干「${day.gan}」与你${PILLAR_LABEL[k]}「${P.g}」相合` });
    }
  }

  // —— 用神关系：今天的五行对我是助力还是消耗 ——
  let wxRelation, wxScore;
  if (day.wx === yongShen)            { wxRelation = 'same';    wxScore = 8; }
  else if (SHENG[day.wx] === yongShen){ wxRelation = 'support'; wxScore = 5; }
  else if (KE[day.wx] === yongShen)   { wxRelation = 'drain';   wxScore = -5; }
  else                                { wxRelation = 'neutral'; wxScore = 0; }

  // —— 汇总为单一基调（关键：所有文案由它统一决定，避免自相矛盾）——
  let raw = wxScore * 1.5;
  hits.forEach(h => { raw += h.score * h.w * 0.5; });
  const energy = Math.max(10, Math.min(95, Math.round(55 + raw * 2.2)));

  let tone;
  if (energy >= 72)      tone = 'flow';    // 顺势
  else if (energy >= 55) tone = 'steady';  // 平稳
  else if (energy >= 38) tone = 'friction';// 有阻力
  else                   tone = 'rest';    // 宜收

  const chong = hits.filter(h => h.kind === 'chong');
  const he    = hits.filter(h => h.kind === 'he' || h.kind === 'ganhe');

  return {
    day, role, roleInfo, hits, he, chong,
    wxRelation, energy, tone,
    dayGanWx: day.wx,
    yongShen,
  };
}

/* ------------------------------------------------------------
   文案：由 tone 统一驱动，保证同一天内部自洽
------------------------------------------------------------ */
const TONE_COPY = {
  flow: {
    label: '顺势',
    headline: '今天推进阻力小，适合把想做的事往前推一步',
    pace: '状态在线，可以安排需要专注和判断力的事。',
  },
  steady: {
    label: '平稳',
    headline: '今天是稳步推进的一天，不需要用力过猛',
    pace: '按既定节奏走就好，把手上的事收个尾。',
  },
  friction: {
    label: '有阻力',
    headline: '今天容易被打断，把目标定小一点更容易完成',
    pace: '别排满，留出应对变化的余量。',
  },
  rest: {
    label: '宜收',
    headline: '今天更适合整理和恢复，不是硬推的日子',
    pace: '重要决定可以往后放一天，先把状态养回来。',
  },
};

/** 生成今日文案（纯函数，便于测试） */
export function buildDailyCopy(r) {
  const t = TONE_COPY[r.tone];
  const out = {
    label: t.label,
    headline: t.headline,
    energy: r.energy,
    gz: r.day.gz,
    role: r.role,
    domain: r.roleInfo.domain,
    sections: [],
  };

  // 今日适合做什么（由十神决定领域）
  out.sections.push({ k: '今天适合处理', v: r.roleInfo.act });

  // 节奏建议（由 tone 决定）
  out.sections.push({ k: '节奏', v: t.pace });

  // 具体互动 —— 这是「不可能套用到别人身上」的部分
  if (r.chong.length) {
    const top = r.chong.sort((a, b) => b.w - a.w)[0];
    const where = top.pillar === 'D' ? '你本人的状态和情绪'
                : top.pillar === 'M' ? '工作与所处环境'
                : top.pillar === 'H' ? '晚间安排与收尾'
                : '长辈、家庭或既有资源';
    out.sections.push({
      k: '今天要留意',
      v: `${top.text}——${where}容易出现临时变化。不必紧张，但今天不适合把行程排得太满，也别在这方面做不可逆的决定。`,
    });
  } else if (r.he.length) {
    const top = r.he.sort((a, b) => b.w - a.w)[0];
    const where = top.pillar === 'D' ? '你自己的判断和状态'
                : top.pillar === 'M' ? '同事、上级或工作环境'
                : top.pillar === 'H' ? '晚上的时间'
                : '家人或长期关系';
    out.sections.push({
      k: '今天的助力',
      v: `${top.text}——${where}比平时更容易配合。有需要沟通或请求协助的事，今天开口成本较低。`,
    });
  }

  // 五行与用神
  const wxText = {
    same:    `今日五行属${r.dayGanWx}，正是你的用神，做事更容易顺手。`,
    support: `今日五行属${r.dayGanWx}，能生助你的用神「${r.yongShen}」，是有利的一天。`,
    drain:   `今日五行属${r.dayGanWx}，会克耗你的用神「${r.yongShen}」，容易觉得费劲，属正常波动。`,
    neutral: `今日五行属${r.dayGanWx}，与你的用神「${r.yongShen}」关系中性，影响不大。`,
  }[r.wxRelation];
  out.sections.push({ k: '能量', v: wxText });

  return out;
}

/** 一句话摘要（用于卡片、通知、分享） */
export function dailyOneLiner(r) {
  const t = TONE_COPY[r.tone];
  return `${r.day.gz}日 · ${t.label} · ${r.roleInfo.domain}`;
}

/* ------------------------------------------------------------
   周运势：把本周七天的流日逐一算出，再汇总成周级别判断。
   与日签同源（同一天内容固定），保证日、周口径一致，
   不会出现「日签说好、周运说坏」的互相打架。
   ------------------------------------------------------------ */
const WEEK_SUMMARY = {
  flow: '本周与你命盘相合的日子偏多，适合把重要事项往前排，主动推进。',
  steady: '本周整体平稳，按计划把手上的事做完即可，不必强行提速。',
  friction: '本周容易遇到打断和反复，目标定小一点，关键安排多留余量。',
  rest: '本周更适合整理、复盘和恢复，能缓的大事先缓一缓，把状态养回来。',
};

export function calcLiuZhou(chart, yongShen, baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const dow = (start.getDay() + 6) % 7; // 周一 = 0
  start.setDate(start.getDate() - dow);

  const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const r = calcLiuRi(chart, yongShen, dt);
    days.push({
      date: dt,
      label: WD[dt.getDay()],
      short: (dt.getMonth() + 1) + '/' + dt.getDate(),
      isToday: dt.toDateString() === baseDate.toDateString(),
      ...r,
    });
  }

  const avg = Math.round(days.reduce((s, x) => s + x.energy, 0) / days.length);
  let best = days[0], worst = days[0];
  for (const x of days) {
    if (x.energy > best.energy) best = x;
    if (x.energy < worst.energy) worst = x;
  }

  // 周基调 = 七天里出现最多的基调；平票时取能量均值对应的档位
  const count = {};
  days.forEach(x => { count[x.tone] = (count[x.tone] || 0) + 1; });
  let dominant = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];

  return {
    start, end: new Date(start.getTime() + 6 * 864e5),
    days, best, worst, avg, dominant,
    summary: WEEK_SUMMARY[dominant],
  };
}

export { TONE_COPY, ROLE_DOMAIN };
