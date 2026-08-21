/* ============================================================
   tools2 · 工具 AI 解读挂载 + 多轮追问
   ------------------------------------------------------------
   为任意工具结果区挂载「AI 解读」能力：在指定挂载点插入按钮，
   点击后结合用户命盘调用 askToolInsight，输出主题化解读卡片；
   解读完成后下方出现追问输入框，可基于当前结果 + 对话历史
   连续追问（流式输出）。
   设计要点：
   - 幂等：同一挂载点已存在按钮则跳过（兼容交互式工具反复重渲染）。
   - 实时：getSource 在点击时读取当前 DOM，始终反映最新结果。
   - 容错：无密钥 / 失败均给出友好提示，不阻断工具本身。
   ============================================================ */
import { askToolInsight, streamAskAnswer } from '../ai/index.js';
import { getApiKey } from '../ui/ai-settings.js';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))
    .replace(/\n+/g, '<br>');
}

function chartSummary() {
  const ctx = window._ctx || window._baziData || {};
  const ys = (ctx.wx && ctx.wx.ys) || '—';
  return `日主${ctx.dg || '—'}，有利方向${ys}，事业${ctx.cs ?? '—'}/100，财富${ctx.ws ?? '—'}/100`;
}

function followUpPrompt(typeLabel, source) {
  return `你是一位温暖、清醒、有分寸的决策助理。用户基于「${typeLabel}」工具结果继续追问。` +
    `请结合下方工具结果与对话历史作答：先接住用户的问题，再给一条清晰直接、可执行的说明或建议。` +
    `控制在140字以内，不要重复上一轮已说过的内容，不要堆砌术语。` +
    `涉及健康、财务、法律或关系重大决定时，提醒结合现实信息与专业意见。` +
    `不把命理说成事实，不制造恐惧或夸张承诺。` +
    `工具结果：${source}`;
}

/* —— 解读成功后的多轮追问区 —— */
function mountFollowUp({ box, root, typeLabel, getSource, firstAnswer, chartCtx }) {
  const turns = [{ role: 'assistant', content: firstAnswer }]; // 会话历史（首轮=解读）

  const wrap = document.createElement('div');
  wrap.className = 'tw-fu';
  wrap.innerHTML =
    '<div class="tw-fu-flow" aria-live="polite"></div>' +
    '<div class="tw-fu-row">' +
      '<input class="tw-fu-input" type="text" placeholder="继续追问，例如：那我书桌应该摆在哪？" aria-label="追问" maxlength="120">' +
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
    const _set = t => { ai.textContent = t; u.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };

    try {
      const result = await streamAskAnswer({
        apiKey: key,
        systemPrompt: followUpPrompt(typeLabel, (getSource ? getSource() : (root.innerText || '')).slice(0, 1800)),
        chartContext: chartCtx,
        question: q,
        aiPrefs: { natural: true, length: 'short' },
        previousTurns: turns.slice(0, -1), // 不含当前问题
        onDelta: (partial) => {
          ai.innerHTML = escapeHtml(partial); // 流式，支持 <br>
        },
      });
      ai.innerHTML = escapeHtml(result.text);
      turns.push({ role: 'assistant', content: result.text });
    } catch (e) {
      _set('追问暂时无法连接，请检查网络或「AI 设置」后重试。');
      turns.pop(); // 撤回失败的提问，保留会话干净
    }
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
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
  if (mount.querySelector(':scope > [data-ai-btn]')) return; // 已挂载，幂等

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tw-btn tw-btn-ai';
  btn.setAttribute('data-ai-btn', '');
  btn.innerHTML = '✦ AI 解读';
  mount.appendChild(btn);

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
      box.innerHTML = '<div class="tw-ai-err">尚未配置 AI 密钥。请在「AI 设置」中填入 DeepSeek Key 后重试。</div>';
      return;
    }
    const label0 = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'AI 解读中…';
    box.hidden = false;
    box.innerHTML = '<div class="tw-ai-loading"><span class="dot"></span>AI 正在结合你的命盘整理…</div>';
    try {
      const source = ((getSource ? getSource() : (root.innerText || '')).slice(0, 1800));
      const answer = await askToolInsight({
        apiKey: key,
        typeLabel,
        source,
        chartSummary: chartSummary(),
        extraSystem,
        depth,
      });
      box.innerHTML =
        '<div class="tw-ai-head">✦ AI 解读</div>' +
        '<div class="tw-ai-text">' + escapeHtml(answer) + '</div>';
      btn.remove();
      // 追加多轮追问
      mountFollowUp({ box, root, typeLabel, getSource, firstAnswer: answer, chartCtx: chartSummary() });
    } catch (e) {
      box.innerHTML = '<div class="tw-ai-err">AI 暂时无法连接，请检查网络或「AI 设置」后重试。</div>';
      btn.disabled = false;
      btn.textContent = label0;
    }
  });
}
