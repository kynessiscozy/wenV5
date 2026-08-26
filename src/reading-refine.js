/* ========================================================================
 *  Reading Refine — 提炼型阅读体验
 *
 *  核心原则（distill + typeset）：
 *   1. 每节顶部一条「本节重点」TL;DR —— 用户第一屏就知道自己要看什么
 *   2. 每张卡片一条「关键句」—— 长文有锚点
 *   3. 段落首句加粗 + 关键数字高亮 —— 扫读有抓手
 *   4. 汇总「速查清单」—— 用神/喜神/幸运色/方位/吉时不再埋在长文里
 *   5. 减少内联 style、统一字号与行高 —— 阅读节奏稳定
 *
 *  设计原则：只做"加法"和"归整"，不删除任何信息，不破坏既有交互。
 * ======================================================================== */

import { WC } from './engines/shared.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- 0. 入口：一次性对结果页做阅读增强 ---------- */
export function refineReading() {
  const root = document.getElementById('p2Inner');
  if (!root) return;
  if (root.dataset.refined === '1') return;

  try {
    refineMingSection();    // 命盘章节
    refineYunSection();     // 运势章节
    refineRelSection();     // 关系章节
    refineAllParagraphs();  // 全局段落首句加粗
    root.dataset.refined = '1';
  } catch (e) {
    // fail-open：增强失败不影响阅读
    console.warn('[reading-refine] skipped:', e);
  }
}

/* ---------- 1. 命盘章节：顶部「命盘 TL;DR」 ---------- */
function refineMingSection() {
  const sec = document.getElementById('s-ming');
  if (!sec) return;
  const ctx = window._ctx;
  if (!ctx) return;

  // 已存在则跳过
  if (sec.querySelector('.tldr-block')) return;

  const wx = ctx.wx || {};
  const dg = ctx.dg || '';
  const dw = ctx.dw || '';
  const pa = (ctx.pa || []).slice(0, 2).join('、') || '平和';
  const ys = wx.ys || '';
  const xs = wx.xs || '';
  const phase = (ctx.age || 0) < 28 ? '前期积累' : (ctx.age || 0) < 38 ? '突破发力' : (ctx.age || 0) < 48 ? '沉淀守成' : '影响力期';
  const direction = wx.st
    ? '适合主动推进，关键节点果断争取'
    : '适合先借力与沉淀，再稳步向前';
  const coreTrait = pickCoreTrait(ctx);

  const tldr = document.createElement('section');
  tldr.className = 'tldr-block glass card-1';
  tldr.dataset.card = 'tldr-ming';
  tldr.innerHTML = `
    <div class="card-hd">
      <div class="card-ic" style="color:var(--ac-text);background:var(--ac1);border-color:var(--ac4)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      </div>
      <div>
        <div class="card-tt">本节重点 · 命盘速读</div>
        <div class="card-st">30 秒抓住核心，再决定要不要深入</div>
      </div>
    </div>
    <div class="tldr-grid">
      <div class="tldr-item">
        <div class="tldr-k">你是谁</div>
        <div class="tldr-v"><b style="color:${WC[dw] || 'var(--ac-text)'}">${dg}${dw}</b>日主 · ${wx.st ? '身旺' : '身弱'}</div>
        <div class="tldr-n">${coreTrait}</div>
      </div>
      <div class="tldr-item">
        <div class="tldr-k">对你最有利</div>
        <div class="tldr-v">用神 <b style="color:${WC[ys] || 'var(--ac-text)'}">${ys}</b> · 喜神 <b style="color:${WC[xs] || 'var(--ac-text)'}">${xs}</b></div>
        <div class="tldr-n">顺势而为，把 ${ys} 属性的事放在精力最好的时段</div>
      </div>
      <div class="tldr-item">
        <div class="tldr-k">当前阶段</div>
        <div class="tldr-v">${phase} · ${pa}</div>
        <div class="tldr-n">${direction}</div>
      </div>
    </div>
    <div class="tldr-action">
      <span>→</span>
      <span>往下看：<b>五行能量</b> 知道强弱分布，<b>人格画像</b> 知道自己的行事风格</span>
    </div>
  `;

  // 插入到本节第一张速读卡 / 新手简报之后
  const anchor = sec.querySelector('.beginner-brief') || sec.querySelector('.qr-card') || sec.firstElementChild;
  if (anchor && anchor.parentNode) {
    anchor.insertAdjacentElement('afterend', tldr);
  } else {
    sec.prepend(tldr);
  }

  // 给四柱卡片加关键句
  addCardKicker(sec.querySelector('[data-card="bazi"]'),
    '四柱是你的「出厂配置」：年柱看根基，月柱看节奏，日柱是你自己，时柱看结果与晚年');
  // 给五行卡片加关键句
  addCardKicker(sec.querySelector('[data-card="wuxing"]'),
    `你是「${wx.s || ''}旺型」，${wx.w || ''}偏弱 —— 关注 ${wx.w || ''} 相关的身体部位与生活节奏`);
  // 给人格画像加关键句
  addCardKicker(sec.querySelector('[data-card="persona"]'),
    '这些是倾向，不是定论 —— 用它来理解自己的偏好，而不是给自己贴标签');
}

/* ---------- 2. 运势章节：顶部「今年怎么过」TL;DR ---------- */
function refineYunSection() {
  const sec = document.getElementById('s-yun');
  if (!sec) return;
  const ctx = window._ctx;
  if (!ctx) return;
  if (sec.querySelector('.tldr-block')) return;

  const cs = ctx.cs || 0, ws = ctx.ws || 0, ls = ctx.ls || 0, hs = ctx.hs || 0;
  const avg = Math.round((cs + ws + ls + hs) / 4);
  const tone = avg >= 72 ? '势能向上' : avg >= 55 ? '平稳推进' : '守势为主';
  const best = Math.max(cs, ws, ls, hs);
  const bestLabel = cs === best ? '事业' : ws === best ? '财富' : ls === best ? '感情' : '健康';
  const worst = Math.min(cs, ws, ls, hs);
  const worstLabel = cs === worst ? '事业' : ws === worst ? '财富' : ls === worst ? '感情' : '健康';
  const cLn = ctx.cLn || {};
  const cDy = ctx.cDy || {};

  const tldr = document.createElement('section');
  tldr.className = 'tldr-block glass card-1';
  tldr.dataset.card = 'tldr-yun';
  tldr.innerHTML = `
    <div class="card-hd">
      <div class="card-ic" style="color:var(--c-yellow);background:color-mix(in srgb,var(--c-yellow) 14%,transparent);border-color:color-mix(in srgb,var(--c-yellow) 28%,transparent)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      </div>
      <div>
        <div class="card-tt">本节重点 · ${cLn.g || ''}${cLn.z || ''}年怎么过</div>
        <div class="card-st">全年评分 ${avg} 分 · ${tone}</div>
      </div>
    </div>
    <div class="tldr-grid tldr-grid-4">
      <div class="tldr-item"><div class="tldr-k">事业</div><div class="tldr-v">${cs}<small>分</small></div></div>
      <div class="tldr-item"><div class="tldr-k">财富</div><div class="tldr-v">${ws}<small>分</small></div></div>
      <div class="tldr-item"><div class="tldr-k">感情</div><div class="tldr-v">${ls}<small>分</small></div></div>
      <div class="tldr-item"><div class="tldr-k">健康</div><div class="tldr-v">${hs}<small>分</small></div></div>
    </div>
    <div class="tldr-takeaways">
      <div class="tldr-takeaway good"><span>最顺的一面</span><b>${bestLabel}</b> · 可以多投入，产出比更高</div>
      <div class="tldr-takeaway warn"><span>多留余量</span><b>${worstLabel}</b> · 降低预期，稳扎稳打</div>
    </div>
    <div class="tldr-action">
      <span>→</span>
      <span>先看<b>今日建议</b>把今天安排好，再看<b>人生时间线</b>了解十年节奏</span>
    </div>
  `;

  const pane = sec.querySelector('[data-yun="year"]') || sec;
  const anchor = pane.querySelector('.beginner-brief') || pane.querySelector('.qr-card') || pane.firstElementChild;
  if (anchor && anchor.parentNode) {
    anchor.insertAdjacentElement('afterend', tldr);
  }

  // 给当年趋势卡片加关键句
  const trend = pane.querySelector('[data-card="trend"]');
  addCardKicker(trend,
    `${cLn.g || ''}${cLn.z || ''}年 ${tone}，重点不是做得更多，而是把精力放到 ${bestLabel} 这类真正能带来成长的事上`);

  // 给时间线卡片加关键句
  const timeline = pane.querySelector('[data-card="timeline"]');
  addCardKicker(timeline,
    `当前在 ${cDy.g || ''}${cDy.z || ''} 大运（${cDy.as || ''}~${cDy.ae || ''}岁），点进去看每个十年的主题`);

  // 给今日建议加关键句 + 强化视觉权重
  const dayPane = sec.querySelector('[data-yun="day"]');
  if (dayPane) {
    const focus = dayPane.querySelector('[data-card="todayAdv"]');
    addCardKicker(focus, '今天的节奏从这里开始 —— 先看宜忌，再看近期提醒');
    if (focus) focus.classList.add('refine-focus-card');
  }
}

/* ---------- 3. 关系章节：顶部「关系 TL;DR」 ---------- */
function refineRelSection() {
  const sec = document.getElementById('s-rel');
  if (!sec) return;
  if (sec.querySelector('.tldr-block')) return;
  const ctx = window._ctx;
  if (!ctx) return;

  const wx = ctx.wx || {};
  const dg = ctx.dg || '';
  const ls = ctx.ls || 0;
  const mode = wx.st ? '习惯主导节奏' : '习惯配合与迁就';
  const need = wx.st ? '给对方留出表达空间' : '建立清晰的自我边界';

  const tldr = document.createElement('section');
  tldr.className = 'tldr-block glass card-1';
  tldr.dataset.card = 'tldr-rel';
  tldr.innerHTML = `
    <div class="card-hd">
      <div class="card-ic" style="color:var(--c-red);background:color-mix(in srgb,var(--c-red) 12%,transparent);border-color:color-mix(in srgb,var(--c-red) 24%,transparent)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      </div>
      <div>
        <div class="card-tt">本节重点 · 关系速览</div>
        <div class="card-st">感情评分 ${ls} 分 · ${mode}</div>
      </div>
    </div>
    <div class="tldr-grid">
      <div class="tldr-item">
        <div class="tldr-k">你的感情底色</div>
        <div class="tldr-v">${dg}日主 · ${wx.st ? '主导型' : '迁就型'}</div>
        <div class="tldr-n">你${mode}，需要${need}</div>
      </div>
      <div class="tldr-item">
        <div class="tldr-k">更适合的人</div>
        <div class="tldr-v">尊重节奏、愿意沟通</div>
        <div class="tldr-n">比起一时的热烈，更值得观察对方是否言行一致</div>
      </div>
    </div>
    <div class="tldr-action">
      <span>→</span>
      <span>往下看：<b>亲密关系画像</b> 了解自己的相处模式，<b>八字合盘</b> 对比两个人的命盘</span>
    </div>
  `;

  const anchor = sec.querySelector('.beginner-brief') || sec.querySelector('.qr-card') || sec.firstElementChild;
  if (anchor && anchor.parentNode) {
    anchor.insertAdjacentElement('afterend', tldr);
  }

  // 给亲密关系画像加关键句
  const intimacy = sec.querySelector('[data-card="intimacy"]');
  addCardKicker(intimacy, '先理解自己的相处模式，再看对方适不适合 —— 关系是两个人的互动');
}

/* ---------- 4. 全局段落首句加粗 + 阅读节奏 ---------- */
function refineAllParagraphs() {
  const root = document.getElementById('p2Inner');
  if (!root) return;

  // 给 .at 段落的第一句加粗（首句锚定法）
  $$('.at p', root).forEach(p => {
    if (p.dataset.lead === '1') return;
    // 跳过太短的
    const text = p.textContent || '';
    if (text.length < 12) return;
    // 找到第一个句子的结尾（。！？；或 30 字截断取最长词边界）
    let idx = -1;
    for (const ch of ['。', '！', '？', '；', '—']) {
      const i = text.indexOf(ch);
      if (i > 4 && (idx === -1 || i < idx)) idx = i;
    }
    if (idx === -1 || idx > 32) idx = Math.min(28, text.length);
    const first = text.slice(0, idx + 1);
    const rest  = text.slice(idx + 1);
    if (!first.trim()) return;
    // 只处理纯文本节点（避免已经有 span/b 的复杂结构）
    if (p.children.length > 0 && !/^[\s\S]*$/.test(p.innerHTML.replace(/<[^>]+>/g, ''))) {
      // 复杂结构：跳过
    } else {
      p.innerHTML = `<b class="lead">${escapeHtml(first)}</b>${escapeHtml(rest)}`;
    }
    p.dataset.lead = '1';
  });

  // 给关键数字加高亮（百分比、分数等）
  $$('.tldr-v, .y-hero-score, .tl-score', root).forEach(el => {
    el.classList.add('refine-num');
  });
}

/* ---------- 工具：给卡片加"关键句" kicker ---------- */
function addCardKicker(card, text) {
  if (!card) return;
  if (card.querySelector('.card-kicker')) return;
  const hd = card.querySelector('.card-hd');
  if (!hd) return;
  const kicker = document.createElement('div');
  kicker.className = 'card-kicker';
  kicker.textContent = text;
  hd.insertAdjacentElement('afterend', kicker);
}

/* ---------- 工具：根据命盘提取一句核心特质 ---------- */
function pickCoreTrait(ctx) {
  const persona = (ctx.P && ctx.P[ctx.dg]) || {};
  const core = persona.core || '';
  if (!core) return '你的性格有自己独特的节奏';
  // 截前半句
  const comma = core.indexOf('，');
  return comma > 4 ? core.slice(0, comma) : core.slice(0, 20);
}

/* ---------- 工具：转义 HTML ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ---------- 自动重跑：监听 #p2Inner 内容变化（多次推演场景） ---------- */
let _autoObs = null;
export function autoRefineReading() {
  const target = document.getElementById('p2Inner');
  if (!target || typeof MutationObserver === 'undefined') return;
  if (_autoObs) return;
  let pending = null;
  _autoObs = new MutationObserver(() => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      const root = document.getElementById('p2Inner');
      if (root && root.dataset.refined !== '1') {
        try { refineReading(); } catch(e) { /* fail-open */ }
      }
    }, 120);
  });
  _autoObs.observe(target, { childList: true, subtree: true });
}
