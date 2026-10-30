/* ============================================================
   tools2 · 工具 AI 解读挂载 + 依据流派选择 + 多轮追问
   ------------------------------------------------------------
   为任意工具结果区挂载「AI 解读」能力：
     - 支持【✦ 东方命理】与【✦ 西方星相】双参考依据无缝切换
     - 自动根据工具类型智能预选默认依据（如西方大师默认星相，传统工具默认命理）
     - 实时展示当前依据命盘与星盘要素
     - 支持多轮流式连续追问
   ============================================================ */

import { askToolInsight, streamAskAnswer } from '../ai/index.js';
import { getApiKey } from '../ui/ai-settings.js';
import { getWesternProfile } from '../engines/western-context.js';
import { escWithBreaks as escapeHtml } from './escape.js';

/* —— 东方命理依据摘要 —— */
function getEasternSummary(ctx) {
  if (!ctx?.b?.Y || !ctx.b.M || !ctx.b.D || !ctx.b.H || !ctx.wx) return '尚未完成个人报告，暂无法生成命理依据。';
  const b = ctx.b;
  const cDy = ctx.cDy || { g: '—', z: '' };
  const cLn = ctx.cLn || { g: '—', z: '' };
  const ys = ctx.wx.ys || '—';
  const st = typeof ctx.wx.st === 'boolean' ? (ctx.wx.st ? '身旺' : '身弱') : '强弱未定';
  return `【东方命理依据】四柱：${b.Y.g}${b.Y.z}年 ${b.M.g}${b.M.z}月 ${b.D.g}${b.D.z}日 ${b.H.g}${b.H.z}时 ｜ 日主：${ctx.dg || '—'}${ctx.dw || ''}（${st}） ｜ 用神：${ys} ｜ 当前大运：${cDy.g}${cDy.z} ｜ 当年流年：${cLn.g}${cLn.z}`;
}

/* —— 西方星相依据摘要：缺少信息时不使用示例出生资料 —— */
function getWesternSummary(ctx) {
  const profile = getWesternProfile(ctx);
  if (!profile) return '尚未提供完整出生信息，暂无法生成星相依据。';
  const { chart, numerology: num } = profile;
  return `【西方星相依据】太阳：${chart.sun.name} (${chart.sun.elem}象) ｜ 上升：${chart.asc.name} ｜ 月亮：${chart.moon.name} ｜ 四象主导：${chart.dominantElem.name} ｜ 毕达哥拉斯主命数：${num.lifePath}号（${num.archetype.name}） ｜ 流年周期：第${num.personalYear}年`;
}

function followUpPrompt(typeLabel, source, basis, basisSummary) {
  const isWestern = basis === 'western';
  const role = isWestern
    ? '你是一位精通西方现代占星学、荣格心理学与生命灵数的资深决策咨询大师。'
    : '你是一位温暖、清醒、通晓东方传统八字命理与五行生克的决策咨询陪伴者。';

  return `${role} 用户基于「${typeLabel}」工具结果继续追问。` +
    `请结合下方【工具测算结果】与【${isWestern ? '西方星相与灵数参考依据' : '东方命理参考依据'}】，并结合对话历史作答：` +
    `先接住用户的具体困惑，再给出一至两条清晰直接、可落地的实操建议。` +
    `控制在 160 字以内，使用自然中文，不要重复上一轮已说过的内容，不要堆砌生僻术语。` +
    `不把推演说成必然事实，不制造恐惧或夸张承诺；如果没有个人依据，不得虚构出生资料、星盘或命盘。涉及健康、财务、法律或重大人际决定时，提醒结合现实情况与专业意见。` +
    `\n\n【参考依据】：${basisSummary}\n【工具测算结果】：${source}`;
}

/* —— 解读成功后的多轮追问区 —— */
function mountFollowUp({ box, root, typeLabel, getSource, firstAnswer, basis, basisSummary }) {
  const turns = [{ role: 'assistant', content: firstAnswer }];

  const wrap = document.createElement('div');
  wrap.className = 'tw-fu';
  wrap.innerHTML =
    '<div class="tw-fu-flow" aria-live="polite"></div>' +
    '<div class="tw-fu-row">' +
      '<input class="tw-fu-input" type="text" placeholder="继续追问，例如：结合我的依据，我该如何具体落地？" aria-label="追问" maxlength="120">' +
      '<button type="button" class="tw-btn tw-btn-ai tw-fu-send" aria-label="发送追问">发送</button>' +
    '</div>';
  box.appendChild(wrap);

  const flow = wrap.querySelector('.tw-fu-flow');
  const input = wrap.querySelector('.tw-fu-input');
  const sendBtn = wrap.querySelector('.tw-fu-send');

  const renderTurn = (who, text) => {
    const div = document.createElement('div');
    div.className = 'tw-fu-turn ' + who;
    div.textContent = text;
    flow.appendChild(div);
    return div;
  };

  const ask = async () => {
    const q = input.value.trim();
    if (!q) return;
    const key = getApiKey();
    if (!key) {
      renderTurn('ai', '尚未配置 AI 密钥，请在「AI 设置」中填写后重试。');
      return;
    }
    turns.push({ role: 'user', content: q });
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    const u = renderTurn('user', q);
    const ai = renderTurn('ai', '正在思考…');
    const _set = t => { ai.textContent = t; };

    try {
      const source = (getSource ? getSource() : (root.innerText || '')).slice(0, 1800);
      const systemPrompt = followUpPrompt(typeLabel, source, basis, basisSummary);

      const result = await streamAskAnswer({
        apiKey: key,
        systemPrompt,
        chartContext: basisSummary,
        question: q,
        aiPrefs: { natural: true, length: 'short' },
        previousTurns: turns.slice(0, -1),
        onDelta: (partial) => {
          ai.innerHTML = escapeHtml(partial);
        },
      });
      ai.innerHTML = escapeHtml(result.text);
      turns.push({ role: 'assistant', content: result.text });
    } catch (e) {
      _set('追问暂时无法连接，请检查网络或「AI 设置」后重试。问题已保留。');
      turns.pop();
      u.remove();
      input.value = q;
    }
    input.disabled = false;
    sendBtn.disabled = false;
    // Keep the restored draft and its send button clear of the sticky footer.
    try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
    try { input.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) { input.scrollIntoView(); }
  };

  sendBtn.addEventListener('click', ask);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ask(); } });
}

/**
 * @param {object} o
 * @param {HTMLElement} o.root   工具容器（用于定位结果文本）
 * @param {string}      o.typeLabel 工具名（用于 AI 提示词）
 * @param {() => string} o.getSource 返回当前结果文本（实时读取 DOM）
 * @param {HTMLElement} [o.slot] 放置 AI 按钮的容器；不传则追加到 root
 */
export function attachToolAI({ root, typeLabel, getSource, slot, extraSystem = '', depth = false }) {
  const mount = slot || root;
  if (!mount || !root) return;
  if (mount.querySelector(':scope > .tw-ai-mount-container')) return; // 幂等

  // 默认依据判断：西方大师专栏工具默认西方星相，其余默认东方命理
  const isWesternTool = ['星座', '塔罗', '人格', 'MBTI'].some(label => typeLabel.includes(label));
  let currentBasis = isWesternTool ? 'western' : 'eastern';

  const wrap = document.createElement('div');
  wrap.className = 'tw-ai-mount-container';
  wrap.setAttribute('data-ai-btn', '');

  // 依据选择器胶囊 + 依据摘要行 + AI 解读按钮
  wrap.innerHTML =
    '<div class="tw-ai-basis-panel">' +
      '<div class="tw-ai-basis-header">' +
        '<span class="label">参考依据：</span>' +
        '<div class="tw-ai-basis-pill-group" role="radiogroup" aria-label="AI 解读参考依据">' +
          '<button type="button" class="tw-ai-basis-chip' + (currentBasis === 'eastern' ? ' active' : '') + '" role="radio" aria-checked="' + String(currentBasis === 'eastern') + '" data-b="eastern">✦ 东方命理</button>' +
          '<button type="button" class="tw-ai-basis-chip' + (currentBasis === 'western' ? ' active' : '') + '" role="radio" aria-checked="' + String(currentBasis === 'western') + '" data-b="western">✦ 西方星相</button>' +
        '</div>' +
      '</div>' +
      '<div class="tw-ai-basis-hint" id="twAiBasisHint"></div>' +
    '</div>' +
    '<div class="tw-ai-act-row">' +
      '<button type="button" class="tw-btn tw-btn-ai" id="twAiMainBtn">✦ 问问大师深度解读</button>' +
    '</div>';

  mount.appendChild(wrap);

  const existingCtx = window._ctx || window._baziData;
  const ctx = existingCtx?.isDemoPreview ? null : existingCtx;
  const hintEl = wrap.querySelector('#twAiBasisHint');
  const btn = wrap.querySelector('#twAiMainBtn');

  const syncHint = () => {
    if (!hintEl) return;
    if (currentBasis === 'western') {
      const wSummary = getWesternSummary(ctx);
      hintEl.innerHTML = '<span class="k">星相依据</span> <b>' + escapeHtml(wSummary.replace('【西方星相依据】', '')) + '</b>';
    } else {
      const eSummary = getEasternSummary(ctx);
      hintEl.innerHTML = '<span class="k">命理依据</span> <b>' + escapeHtml(eSummary.replace('【东方命理依据】', '')) + '</b>';
    }
  };
  syncHint();

  // 绑定依据切换
  wrap.querySelectorAll('.tw-ai-basis-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentBasis = chip.dataset.b;
      wrap.querySelectorAll('.tw-ai-basis-chip').forEach(c => {
        c.classList.toggle('active', c === chip);
        c.setAttribute('aria-checked', String(c === chip));
      });
      syncHint();
    });
  });

  // 输出盒：放在 mount 之后（同级），复用已存在的
  let box = mount.parentElement && mount.parentElement.querySelector(':scope > .tw-ai-box');
  if (!box) {
    box = document.createElement('div');
    box.className = 'tw-ai-box';
    box.hidden = true;
    mount.after(box);
  }

  btn.addEventListener('click', async () => {
    const key = getApiKey();
    if (!key) {
      box.hidden = false;
      box.innerHTML = '<div class="tw-ai-err">尚未配置 AI 密钥。请在「AI 设置」中填入 API Key 后重试。</div>';
      return;
    }

    const label0 = btn.textContent;
    const basis = currentBasis;
    const basisSummary = basis === 'western' ? getWesternSummary(ctx) : getEasternSummary(ctx);
    const hasBasis = basis === 'western' ? !!getWesternProfile(ctx) : !!(ctx?.b?.Y && ctx?.b?.M && ctx?.b?.D && ctx?.b?.H && ctx?.wx);
    const chips = wrap.querySelectorAll('.tw-ai-basis-chip');
    chips.forEach(chip => { chip.disabled = true; });
    btn.disabled = true;
    btn.textContent = 'AI 深度整理中…';
    box.hidden = false;
    box.innerHTML = '<div class="tw-ai-loading"><span class="dot"></span>' + (hasBasis
      ? '正在结合【' + (basis === 'western' ? '西方星相与灵数' : '东方命理') + '】依据深入分析…'
      : '正在整理工具结果（尚无个人命盘依据）…') + '</div>';

    try {
      const source = (getSource ? getSource() : (root.innerText || '')).slice(0, 1800);
      const customExtraSystem = extraSystem + (!hasBasis
        ? '\n用户尚未提供完整个人命盘，只能分析工具结果，绝不能编造出生资料、星盘或命盘。'
        : basis === 'western'
          ? '\n请以【西方现代占星学与生命灵数】为核心视点进行深度剖析。'
          : '\n请以【中国传统八字与五行大运】为核心视点进行深度剖析。');

      const answer = await askToolInsight({
        apiKey: key,
        typeLabel,
        source,
        chartSummary: basisSummary,
        extraSystem: customExtraSystem,
        depth,
      });

      box.innerHTML =
        '<div class="tw-ai-head">' +
          '<div class="tt">✦ 问问大师深度解读</div>' +
          '<div class="basis-badge">' + (!hasBasis ? '未提供个人命盘依据' : basis === 'western' ? '依据：西方星相与灵数' : '依据：东方八字命理') + '</div>' +
        '</div>' +
        '<div class="tw-ai-text">' + escapeHtml(answer) + '</div>';

      wrap.querySelector('.tw-ai-act-row')?.remove();

      // 追加多轮追问
      mountFollowUp({
        box,
        root,
        typeLabel,
        getSource,
        firstAnswer: answer,
        basis,
        basisSummary
      });
    } catch (e) {
      box.innerHTML = '<div class="tw-ai-err">AI 暂时无法连接，请检查网络或「AI 设置」后重试。</div>';
      chips.forEach(chip => { chip.disabled = false; });
      btn.disabled = false;
      btn.textContent = label0;
    }
  });
}
