/* ============================================================
   「这段是什么意思」—— 带上下文的解释入口
   ------------------------------------------------------------
   竞品调研显示：新手最大的障碍不是排不出盘，而是
   「排出来看不懂，又不知道该怎么问」。直接问「我的八字怎么样」
   这类问题，AI 只能泛泛回答。

   本模块的职责：把用户点击的那张卡片，连同 **他自己的命盘数据**，
   组装成一个具体到不可能套用给别人的问题。

   反面教材（本模块第一版就犯过）：
     点「四柱八字」→ 提问「四柱八字这部分是什么意思？」
     → 命中术语词典 → 返回「八字：把出生年月日时换算成天干地支…」
   这是词典释义，不是解读「你的」命盘。
   ============================================================ */

import { getCtx } from '../state/context.js';

/**
 * 卡片 → 提问模板。
 * fields 决定这张卡要带哪些命盘事实进去；
 * ask(f) 用这些事实拼出问题。
 */
const CARD_TOPIC = {
  // 命盘类
  bazi: {
    name: '四柱八字',
    ask: f => `我的四柱是 ${f.pillars}，日主${f.dayMaster}。这组八字说明我是什么样的人？请用大白话讲，不要只解释「八字」这个词的定义。`,
  },
  'qr-card': {
    name: '命盘一览',
    ask: f => `我的命盘是：日主${f.dayMaster}、${f.strength}、用神${f.yongShen}、格局${f.pattern}。把这几项合起来看，对我意味着什么？`,
  },
  structure: {
    name: '命盘结构',
    ask: f => `我的四柱 ${f.pillars}，五行分布是 ${f.wuxing}。这个结构有什么特点？哪里强、哪里弱？`,
  },
  wuxing: {
    name: '五行能量',
    ask: f => `我的五行分布是 ${f.wuxing}，用神是${f.yongShen}。这说明我需要补什么、避什么？`,
  },
  persona: {
    name: '人格画像',
    ask: f => `我是${f.dayMaster}日主、${f.strength}、格局${f.pattern}。这样的组合通常是什么性格？有哪些容易踩的坑？`,
  },
  timeline: {
    name: '大运时间线',
    ask: f => `我现在走${f.dayun}大运（${f.dayunAge}），流年${f.liunian}。这个阶段我应该重点做什么？`,
  },
  reasoning: {
    name: '命局判读依据',
    ask: f => `请解释一下，为什么我的用神是${f.yongShen}、判为${f.strength}？依据是什么？`,
  },
  'three-styles': {
    name: '三式合参',
    ask: () => `紫微斗数、奇门遁甲、梅花易数这三套，和八字有什么区别？我该怎么参考它们？`,
  },
  ziwei:  { name: '紫微斗数', ask: () => '紫微盘这部分怎么理解？它和我的八字结论一致吗？' },
  qimen:  { name: '奇门遁甲', ask: () => '奇门这部分怎么理解？适合用来判断什么？' },
  meihua: { name: '梅花易数', ask: () => '梅花易数这部分怎么理解？适合用来问什么？' },

  // 运势类
  'beginner-brief': {
    name: '解读报告',
    ask: f => `我的命盘是日主${f.dayMaster}、${f.strength}、用神${f.yongShen}，当前${f.dayun}大运、流年${f.liunian}。报告说我「${f.excerpt}」——这个判断是怎么来的？我具体该怎么做？`,
  },

  // 关系类
  relAi:    { name: '八字合盘', ask: f => `合盘结果说明了什么？我的日主是${f.dayMaster}，请解释这个匹配结论。` },
  intimacy: { name: '亲密关系', ask: f => `我是${f.dayMaster}日主、${f.strength}。我在亲密关系里通常是什么模式？` },
  friends:  { name: '朋友关系', ask: f => `我是${f.dayMaster}日主、格局${f.pattern}。我的社交风格是怎样的？` },
  family:   { name: '亲人关系', ask: f => `我是${f.dayMaster}日主、${f.strength}。我和家人相处时要注意什么？` },
};

/** 从当前命盘取出可用于提问的事实 */
export function chartFacts() {
  const d = getCtx();
  if (!d) return null;
  const p = d.b || {};
  const pillars = ['Y', 'M', 'D', 'H']
    .map(k => p[k] ? p[k].g + p[k].z : '')
    .filter(Boolean).join(' ');
  const wx = d.wx || {};
  const wuxingStr = wx.c
    ? ['木', '火', '土', '金', '水']
        .map(w => `${w}${Math.round((wx.c[w] || 0) / (wx.t || 1) * 100)}%`).join(' ')
    : '';
  return {
    pillars: pillars || '（未排盘）',
    dayMaster: (d.dg || '') + (d.dw || ''),
    strength: wx.st ? '身旺' : '身弱',
    yongShen: wx.ys || '',
    xiShen: wx.xs || '',
    pattern: (d.pa && d.pa.length) ? d.pa.join('、') : '未定格',
    dayun: d.cDy ? d.cDy.g + d.cDy.z : '',
    dayunAge: d.cDy && d.cDy.as != null ? `${d.cDy.as}–${d.cDy.ae}岁` : '',
    liunian: d.cLn ? d.cLn.g + d.cLn.z : '',
    wuxing: wuxingStr,
  };
}

/**
 * 组装「解释这一段」的问题。
 * 关键：一定要把命盘事实写进问题里，否则 AI 只会回答术语定义。
 */
export function buildExplainQuestion({ cardKey, heading, excerpt }) {
  const f = chartFacts();
  const topic = CARD_TOPIC[cardKey];

  if (f && topic && typeof topic.ask === 'function') {
    const clean = String(excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 50);
    try {
      return topic.ask({ ...f, excerpt: clean });
    } catch (e) { /* 落到下面的兜底 */ }
  }

  // 兜底：没有预设模板时，也要带上命盘，避免退化成词典查询
  const title = heading || (topic && topic.name) || '这部分内容';
  const clean = String(excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const ctxLine = f ? `我的命盘：${f.pillars}，日主${f.dayMaster}，${f.strength}，用神${f.yongShen}。` : '';
  if (clean) return `${ctxLine}报告里「${title}」写的是「${clean}」——这段结合我的命盘是什么意思？`;
  return `${ctxLine}报告里「${title}」这部分，结合我的命盘该怎么理解？`;
}

/** 找到某个元素所属卡片的标题与摘要 */
export function extractSection(el) {
  const card = el.closest('[data-card]') || el.closest('.qr-card')
            || el.closest('.beginner-brief') || el.closest('.glass');
  // data-card 优先；没有则退回可识别的类名（qr-card / beginner-brief）
  let cardKey = card ? (card.dataset.card || '') : '';
  if (!cardKey && card) {
    if (card.classList.contains('qr-card')) cardKey = 'qr-card';
    else if (card.classList.contains('beginner-brief')) cardKey = 'beginner-brief';
  }
  const heading =
    (card && (card.querySelector('.card-tt') || card.querySelector('.qr-title') || card.querySelector('.bb-title')))
      ?.textContent.trim() || '';

  // 注意：querySelector 传逗号列表时按「文档顺序」返回，不按选择器优先级，
  // 会先命中评分行等无关文本；必须逐个选择器依次尝试。
  let excerpt = '';
  if (card) {
    for (const sel of ['.bb-text', '.ai-sum-body', '.at', '.tr-text-body', 'p']) {
      const body = card.querySelector(sel);
      if (body && !body.closest('.explain-btn') && body.textContent.trim().length > 8) {
        excerpt = body.textContent.trim();
        break;
      }
    }
  }
  if (excerpt && heading && excerpt.startsWith(heading)) excerpt = '';
  return { cardKey, heading, excerpt };
}

export { CARD_TOPIC };
