import { getCtx } from '../state/context.js';
import { KB } from '../ai/kb.js';
import { KBSearch, smartAnswer, extractIntents, buildBaziContext } from '../ai/smart-answer.js';
import { generateAnswerFallback } from '../ai/fallback.js';
import { streamAskAnswer, probeConnection, getConnState, onConnChange, modelLabel } from '../ai/index.js';
import { getApiKey } from './ai-settings.js';
import { getResultStyle } from '../state/result-style.js';
import { renderSmartAnswer, renderRouteButtons, buildRelatedRoutes, formatStandardAnswer } from '../render/ai.js';

/* ============================================================
   问问大师 · 重构版 — ChatGPT 气泡式对话
   含：AI 模型触发机制 + 连接状态面板
   ============================================================ */

// —— 时间格式 ——
function _ts() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ============================================================
   连接状态 UI
   ============================================================ */
// 光写「离线」用户不知道意味着什么、还能不能用；补一句说明与 title。
const _STATE_MAP = {
  unknown:  { dot: 'conn-unknown',  text: '未检测',  hint: '' },
  checking: { dot: 'conn-checking', text: '检测中…', hint: '' },
  online:   { dot: 'conn-online',   text: 'AI 已连接', hint: '可以自由提问' },
  offline:  { dot: 'conn-offline',  text: '离线模式', hint: '仍可查术语与命盘解读，接入 AI 后回答更贴合你的提问' },
};

function _updateConnUI(state) {
  const bar = document.getElementById('aiConnBar');
  if (!bar) return;
  const cfg = _STATE_MAP[state] || _STATE_MAP.unknown;
  bar.className = 'ai-conn-bar ' + cfg.dot;
  bar.querySelector('.ai-conn-text').textContent = cfg.text;
  let hintEl = bar.querySelector('.ai-conn-hint');
  if (cfg.hint) {
    if (!hintEl) {
      hintEl = document.createElement('span');
      hintEl.className = 'ai-conn-hint';
      bar.appendChild(hintEl);
    }
    hintEl.textContent = cfg.hint;
    bar.title = cfg.text + '：' + cfg.hint;
  } else {
    hintEl?.remove();
    bar.removeAttribute('title');
  }
}

function _ensureConnBar() {
  if (document.getElementById('aiConnBar')) return;
  const head = document.querySelector('#aiSheet .ai-head');
  if (!head) return;
  const bar = document.createElement('div');
  bar.id = 'aiConnBar';
  bar.className = 'ai-conn-bar conn-unknown';
  bar.innerHTML =
    '<span class="ai-conn-dot"></span>' +
    '<span class="ai-conn-text">未检测</span>' +
    '<span class="ai-conn-model" id="aiConnModel"></span>';
  head.appendChild(bar);
  // 订阅状态变化
  onConnChange(_updateConnUI);
  // 立即显示当前状态
  _updateConnUI(getConnState());
}

function _setModelLabel(modelId) {
  const el = document.getElementById('aiConnModel');
  if (!el) return;
  if (modelId) {
    el.textContent = modelLabel(modelId);
    el.title = modelId;
  } else {
    el.textContent = '';
  }
}



/* ============================================================
   渲染函数
   ============================================================ */

/* ------------------------------------------------------------
   会话持久化：此前刷新即丢，回来像第一次见面。
   存最近 30 条气泡的 HTML，超过 240KB 自动丢最旧的。
   ------------------------------------------------------------ */
const HIST_KEY = 'tj_ai_history_v2';
let _histCache = null;
function _histLoad() {
  if (_histCache) return _histCache;
  try {
    const a = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    _histCache = Array.isArray(a) ? a : [];
  } catch (e) { _histCache = []; }
  return _histCache;
}
function _histClear() { _histCache = []; try { localStorage.removeItem(HIST_KEY); } catch (e) {} }
function _persistMsg(msgDiv) {
  if (!msgDiv) return;
  try {
    const arr = _histLoad();
    arr.push({ h: msgDiv.outerHTML });
    while (arr.length > 30) arr.shift();
    let s = JSON.stringify(arr);
    while (s.length > 240000 && arr.length > 1) { arr.shift(); s = JSON.stringify(arr); }
    localStorage.setItem(HIST_KEY, s);
  } catch (e) {}
}
function _persistLast() {
  const el = document.getElementById('askResult');
  const last = el && el.querySelector('.chat-msg:last-child');
  _persistMsg(last);
}
function _restoreHistory(el) {
  const arr = _histLoad();
  if (!arr.length) return false;
  el.innerHTML = arr.map(x => x.h).join('');
  // 工具跳转按钮的事件随 HTML 序列化丢失，按 data-tool 重新绑定
  el.querySelectorAll('.chat-tool-btn[data-tool]').forEach(b => {
    b.onclick = () => {
      window._returnToAI = true;
      closeAsk();
      setTimeout(() => { if (window.openToolPage) window.openToolPage(b.dataset.tool); }, 180);
    };
  });
  _scrollToBottom(el);
  return true;
}

// —— 欢迎消息 ——
function _renderWelcome(el) {
  const ctx = window._ctx;
  const hour = new Date().getHours();
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
  let contextLine = '可以问事业、关系、财务与近期选择；我会先讲依据，再陪你把问题落到下一步。';
  if (ctx) {
    contextLine = '我已连接你的命盘（' + ctx.dg + ctx.dw + '），随时可以聊。';
  }
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-welcome';
  msgDiv.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai">' +
        '<div class="chat-welcome-greeting">' + greeting + '！我是问问大师 ✦</div>' +
        '<div class="chat-welcome-desc">' + contextLine + '</div>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
}

// —— 用户气泡 ——
function _renderUserBubble(el, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-user';
  msgDiv.innerHTML =
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-user">' + _escHtml(text) + '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
  _persistMsg(msgDiv);
  _scrollToBottom(el);
}

// —— Typing indicator ——
function _showTyping(el, hint) {
  let indicator = el.querySelector('.chat-typing');
  if (indicator) {
    // 更新提示文字
    const hintEl = indicator.querySelector('.typing-hint');
    if (hintEl && hint) hintEl.textContent = hint;
    return indicator;
  }
  indicator = document.createElement('div');
  indicator.className = 'chat-msg chat-msg-ai chat-typing';
  indicator.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai">' +
        '<div class="typing-dots"><span></span><span></span><span></span></div>' +
        '<div class="typing-hint">' + (hint || '') + '</div>' +
      '</div>' +
    '</div>';
  el.appendChild(indicator);
  _scrollToBottom(el);
  return indicator;
}
function _hideTyping(el) {
  const indicator = el.querySelector('.chat-typing');
  if (indicator) indicator.remove();
}

// —— AI 回复气泡 ——
function _createAiBubble(el) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  msgDiv.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai"><div class="chat-ai-text"></div></div>' +
      '<div class="chat-actions">' +
        '<button type="button" data-act="copy" title="复制回答">复制</button>' +
        '<button type="button" data-act="retry" title="重新回答">重试</button>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
  _scrollToBottom(el);
  return msgDiv.querySelector('.chat-ai-text');
}

// —— KB 信息库气泡 ——
function _renderKbBubble(el, kbRes, q) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  const kbHtml = renderSmartAnswer(kbRes, q);
  msgDiv.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai chat-bubble-kb">' + kbHtml + '</div>' +
      '<div class="chat-actions">' +
        '<button type="button" data-act="copy" title="复制回答">复制</button>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
  _scrollToBottom(el);
}

// —— 工具调用气泡 ——
function _renderToolCallBubble(el, short, toolId) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  msgDiv.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai">' +
        '可以，直接开始这个小工具，填完后我再帮你看结果。' +
        '<button class="chat-tool-btn" type="button" data-tool="' + toolId + '">开始 · ' + short + ' →</button>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  msgDiv.querySelector('.chat-tool-btn').onclick = () => {
    window._returnToAI = true;
    closeAsk();
    setTimeout(() => { if (window.openToolPage) window.openToolPage(toolId); }, 180);
  };
  el.appendChild(msgDiv);
  _persistMsg(msgDiv);
  _scrollToBottom(el);
}

// —— 无命盘提示 ——
function _renderNeedChart(el) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  msgDiv.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai">' +
        '请先完成命盘排盘，我才能给出有针对性的建议。' +
        '<button class="chat-tool-btn" type="button" onclick="closeAsk();goBack();">前往填写出生信息 →</button>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
  _persistMsg(msgDiv);
  _scrollToBottom(el);
}

// —— 辅助 ——
function _escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _scrollToBottom(el) { requestAnimationFrame(() => { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }); }
function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ============================================================
   公开 API
   ============================================================ */

export function openAsk() {
  if (document.getElementById('aiSheet')?.classList.contains('open')) { closeAsk(); return; }

  const fab = document.getElementById('aiFab');
  if (fab) { fab.classList.remove('fab-pop'); void fab.offsetWidth; fab.classList.add('fab-pop'); fab.addEventListener('animationend', () => fab.classList.remove('fab-pop'), { once: true }); }

  document.getElementById('aiOverlay').classList.add('open');
  document.getElementById('aiSheet').classList.add('open');

  // 上下文
  const context = document.getElementById('aiContext');
  const d = window._ctx;
  if (context && d) {
    context.innerHTML = '<span>✦ 当前命盘</span><b>' + d.dg + d.dw + ' · ' + (d.wx.st ? '行动型节奏' : '蓄力型节奏') + '</b>';
  }

  // 连接状态栏
  _ensureConnBar();

  // 首次打开：恢复上次的对话（刷新不再失忆），没有历史才欢迎
  const body = document.getElementById('askResult');
  if (body && !body.querySelector('.chat-msg')) {
    if (!_restoreHistory(body)) _renderWelcome(body);
    // 启动连接探测
    probeConnection(getApiKey());
  }

  setTimeout(() => document.getElementById('askInput')?.focus(), 300);
}

export function closeAsk() {
  document.getElementById('aiOverlay').classList.remove('open');
  document.getElementById('aiSheet').classList.remove('open');
  document.getElementById('aiSuggest')?.classList.remove('show');
}

export function newAskChat() {
  window._aiConversation = [];
  _histClear();
  const result = document.getElementById('askResult');
  const input = document.getElementById('askInput');
  const sug = document.getElementById('aiSuggest');
  if (result) { result.innerHTML = ''; _renderWelcome(result); }
  if (input) { input.value = ''; input.style.height = 'auto'; input.focus(); }
  if (sug) { sug.innerHTML = ''; sug.classList.remove('show'); }
  _setModelLabel('');
}

export function aiToolRequest(q) {
  const x = String(q || '').trim();
  if (!/(打开|使用|开始|做一下|帮我|调用|进入|测一下|测评)/.test(x)) return false;
  const rules = [
    [/财运|理财|现金流|财富/, 'wealth', '财运与理财罗盘'],
    [/转行|副业|职业选择|换工作/, 'career', '转行与副业测评'],
    [/裁员|失业|职场风险/, 'layoff', '裁员风险检测'],
    [/关系沟通|伴侣沟通|感情沟通/, 'relation', '关系沟通分析'],
    [/穿搭|工位|环境|颜色|风水/, 'style', '能量穿搭与工位风水'],
    [/择日|重要事项|安排日期/, 'date', '重要事项择日助手'],
    [/今日日签|今日提醒|日签/, 'daily', '今日日签'],
    [/起名|取名|名字/, 'name', '智能起名工具'],
    [/摇签|问卜|抽签/, 'oracle', '摇签问卜'],
    [/彩票|双色球|大乐透|选号/, 'lottery', '娱乐选号'],
    [/生肖合冲|生肖关系/, 'zodiac', '生肖合冲分析']
  ];
  const hit = rules.find(([re]) => re.test(x));
  if (!hit) return false;
  const el = document.getElementById('askResult');
  if (!el) return false;
  const short = { wealth: '财运', career: '转行', layoff: '职场风险', relation: '关系沟通', style: '环境', date: '择日', daily: '日签', name: '起名', oracle: '摇签', lottery: '选号', zodiac: '生肖' }[hit[1]] || '工具';
  _renderToolCallBubble(el, short, hit[1]);
  return true;
}

// —— 闲聊检测 ——
function _handleCasualChat(q, el) {
  const x = (q || '').trim();
  if (!/^(你好|嗨|哈喽|在吗|有人吗|早上好|晚上好|晚安|谢谢|感谢|哈哈|好的|明白了)[！!。？?\s]*$/.test(x)) return false;
  let reply;
  if (/谢谢|感谢/.test(x)) reply = '不用客气。你想继续聊刚才的事，还是换一个话题？';
  else if (/晚安|晚上好/.test(x)) reply = '晚上好。今天如果已经很累了，先把事情放一放，休息本身也是一种推进。';
  else if (/好的|明白了/.test(x)) reply = '好。如果你之后想到新的细节，直接接着说就行，我会沿着当前话题继续。';
  else reply = '我在。你可以先随便说说最近发生了什么，不一定要整理成一个正式问题。';

  _showTyping(el);
  _delay(300 + Math.random() * 300).then(() => {
    const textEl = _createAiBubble(el);
    textEl.textContent = reply;
    _persistLast();
    _scrollToBottom(el);
  });
  return true;
}

export function doAsk(q) {
  if (!document.getElementById('aiSheet').classList.contains('open')) openAsk();
  const input = document.getElementById('askInput');
  if (input) { input.value = ''; input.style.height = 'auto'; }
  const countEl = document.getElementById('aiCount');
  if (countEl) countEl.textContent = '0 / 500';
  document.getElementById('aiSuggest')?.classList.remove('show');
  try { sessionStorage.setItem('tj_ai_draft', ''); } catch (e) {}

  const el = document.getElementById('askResult');
  _renderUserBubble(el, q);
  if (_handleCasualChat(q, el)) return;
  if (aiToolRequest(q)) return;
  generateAnswer(q);
}

export function doAskCustom() {
  const input = document.getElementById('askInput');
  const q = input?.value.trim();
  if (!q) return;
  input.value = '';
  input.style.height = 'auto';
  const countEl = document.getElementById('aiCount');
  if (countEl) countEl.textContent = '0 / 500';
  document.getElementById('aiSuggest')?.classList.remove('show');
  try { sessionStorage.setItem('tj_ai_draft', ''); } catch (e) {}

  const el = document.getElementById('askResult');
  _renderUserBubble(el, q);
  if (_handleCasualChat(q, el)) return;
  if (aiToolRequest(q)) return;
  generateAnswer(q);
}

// —— 分类 ——
export function aiSwitchCat(el) { document.querySelectorAll('.ai-cat').forEach(c => c.classList.remove('active')); el.classList.add('active'); aiRefreshChips(el.dataset.cat); }
export function aiRefreshChips(cat) {
  const wrap = document.getElementById('aiChips'); if (!wrap) return;
  let list = [];
  if (cat === 'hot') { const seen = new Set(); ['事业', '财富', '感情', '健康', '学业', '居住', '玄学'].forEach(it => { const f = KB.faqs.find(x => x.intent === it && !seen.has(x.id)); if (f) { list.push(f); seen.add(f.id); } }); }
  else if (cat === '玄学') { list = KBSearch.byIntent('玄学'); }
  else { list = KBSearch.byIntent(cat); }
  wrap.innerHTML = list.map(f => `<div class="ai-chip" onclick="doAsk('${f.q.replace(/'/g, "\\'")}')">${f.q}</div>`).join('');
  if (cat === '玄学') { wrap.innerHTML += '<div class="ai-divider">术语速查</div>'; wrap.innerHTML += KB.terms.slice(0, 12).map(t => `<div class="ai-chip term" onclick="doAsk('${t.t}')">${t.t}</div>`).join(''); }
}
export function aiOnInputSuggest() { const sug = document.getElementById('aiSuggest'); if (sug) { sug.innerHTML = ''; sug.classList.remove('show'); } }

/* ============================================================
   核心：generateAnswer — 三层触发机制
   ============================================================ */
export async function generateAnswer(q) {
  const d = getCtx();
  const el = document.getElementById('askResult');
  const conversation = window._aiConversation || (window._aiConversation = []);
  const aiPrefs = window.getAISettings ? window.getAISettings() : { natural: true, context: true, length: 'short' };
  const previousTurns = aiPrefs.context ? conversation.slice(-6) : [];

  const contextualFollowUp = previousTurns.length > 0 && (
    q.trim().length <= 18 || /^(那|然后|所以|具体|继续|怎么办|怎么做|为什么|他|她|这个|那我|我呢|可以吗|要不要)/.test(q.trim())
  );

  // ———— 无命盘 ————
  if (!d) {
    _showTyping(el);
    await _delay(600);
    _renderNeedChart(el);
    return;
  }

  // ———— 第 1 层：KB 信息库匹配（本地，零延迟）————
  const kbRes = contextualFollowUp ? null : smartAnswer(q, d);
  if (kbRes) {
    _showTyping(el, '信息库匹配中…');
    await _delay(400 + Math.random() * 300);
    _renderKbBubble(el, kbRes, q);
    _persistLast();
    conversation.push({ role: 'user', content: q });
    conversation.push({ role: 'assistant', content: (kbRes.sections || []).map(s => s.content || '').join(' ').slice(0, 180) });
    return;
  }

  // ———— 第 2 层：AI API 流式调用 ————
  _showTyping(el, '正在连接 AI…');
  _setModelLabel('');

  const ctx = buildBaziContext(d);
  const resultStyle=getResultStyle(d.input?.resultStyle);
  const systemPrompt = `你是「问问」，一位温暖、清醒、有分寸的命理陪伴者。
当前结果风格：${resultStyle.label}。${resultStyle.prompt}你的工作不是替用户宣布命运，而是把传统命理当作观察倾向和整理问题的语言，再帮助用户回到现实选择。请严格遵守以下约束：
① 先对照下方【用户命盘】再作答——所有命理判断必须基于真实数据（日主、五行强弱、十神、用神喜忌、当前大运/流年、各项评分），只选与问题最相关的两三项，不要罗列无关字段，也不要每次复述整张命盘。
② 回答结构自然但完整：先接住用户正在面对的事，再说明一条清楚的命盘依据，然后给出一到两个现实行动。控制在100–220字，使用自然中文，不堆砌术语，不用空泛鸡汤。
③ 解释术语时先翻译成人话，再说明它如何映射到用户的问题；不要只贴标签。涉及事业、财务、健康、法律或关系重大决定时，明确提醒用户结合事实、专业意见和当事人沟通。
④ 自我核对：落笔前确认每句话都符合命盘；一旦发现与数据矛盾（如五行、十神、大运年份、流年写错），立即用一句「更正：…」当场修正，绝不臆造或含糊带过。
⑤ 结合对话历史理解省略指代（「那我呢」「这个机会」「他/她」等）；只在信息确实不足时问一个最关键的问题。
⑥ 不把命理说成事实，不承诺必然结果，不制造恐惧，不鼓励高风险投资、迷信消费或替代医疗。拿不准就坦诚说「我不确定」。`;

  let usedModel = '';

  // 7 秒慢速提示
  const slowTimer = setTimeout(() => {
    _showTyping(el, '模型响应较慢，正在尝试…');
  }, 7000);

  try {
    let textEl = null;
    const _mkBubble = () => {
      if (textEl) return textEl;
      textEl = _createAiBubble(el);
      return textEl;
    };

    const result = await streamAskAnswer({
      apiKey: getApiKey(),
      systemPrompt,
      chartContext: ctx,
      question: q,
      aiPrefs,
      previousTurns,
      onModelSwitch: (m) => {
        usedModel = m;
        _setModelLabel(m);
        _showTyping(el, '正在调用 ' + modelLabel(m) + '…');
      },
      onDelta: (partial) => {
        _mkBubble().innerHTML = formatStandardAnswer(partial);
        _scrollToBottom(el);
      }
    });

    clearTimeout(slowTimer);

    _setModelLabel(result.model);

    conversation.push({ role: 'user', content: q });
    conversation.push({ role: 'assistant', content: result.text.slice(0, 500) });

    const intents = extractIntents(q);
    const links = buildRelatedRoutes(intents);
    if (links.length && textEl) {
      const routeHtml = renderRouteButtons(links, '前往相关页面查看');
      textEl.closest('.chat-bubble').insertAdjacentHTML('beforeend', routeHtml);
    }
    _persistLast();
    _scrollToBottom(el);

  } catch (e) {
    clearTimeout(slowTimer);

    // ———— 第 3 层：离线兜底 ————
    _hideTyping(el);
    _setModelLabel('');
    _generateAnswerFallbackChat(q, d, el);
    _persistLast();
    conversation.push({ role: 'user', content: q });
    conversation.push({ role: 'assistant', content: '已基于当前话题给出建议。' });
  }
}

// —— Fallback 气泡渲染 ——
function _generateAnswerFallbackChat(q, d, el) {
  const textEl = _createAiBubble(el);
  const temp = document.createElement('div');
  generateAnswerFallback(q, d, temp);
  const fallbackText = temp.querySelector('.ai-dialogue-text')?.innerHTML
    || temp.textContent
    || '抱歉，我暂时无法连接到 AI 服务。请稍后再试。';
  textEl.innerHTML = fallbackText;
  _scrollToBottom(el);
}
