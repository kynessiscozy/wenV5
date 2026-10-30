import { getCtx } from '../state/context.js';
import { KB } from '../ai/kb.js';
import { KBSearch, smartAnswer, extractIntents, buildBaziContext, buildWesternContext } from '../ai/index.js';
import { calcWesternChart, calcNumerology } from '../engines/western.js';
import { generateAnswerFallback } from '../ai/fallback.js';
import { streamAskAnswer, probeConnection, getConnState, onConnChange, modelLabel } from '../ai/index.js';
import { getApiKey } from './ai-settings.js';
import { getResultStyle } from '../state/result-style.js';
import { renderSmartAnswer, renderRouteButtons, buildRelatedRoutes, formatStandardAnswer, formatAIText } from '../render/ai.js';
import {
  getEvolvePrompt, recordExperience, rateExperience, flagExperience,
  lastExperienceId, flagLastFollowUp, chartKeyOf, getGenome
} from '../evolve/index.js';
import { showToast } from './toast.js';
import { focusSafely } from './focus.js';
import { filterAiResponse } from '../ai/filter.js';
import { CHAT_MASTER, loadMasterPortraits, masterAvatarMarkup } from '../character/chat-master.js';

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
const _STATE_MAP = {
  unknown:  { dot: 'conn-unknown',  text: '未检测' },
  checking: { dot: 'conn-checking', text: '检测中…' },
  online:   { dot: 'conn-online',   text: 'AI 已连接' },
  badkey:   { dot: 'conn-offline',  text: '密钥无效' },
  offline:  { dot: 'conn-offline',  text: '离线模式' },
};

function _updateConnUI(state) {
  const bar = document.getElementById('aiConnBar');
  if (!bar) return;
  const cfg = !getApiKey() ? { dot: 'conn-offline', text: '未配置 AI' } : (_STATE_MAP[state] || _STATE_MAP.unknown);
  bar.className = 'ai-conn-bar ' + cfg.dot;
  bar.querySelector('.ai-conn-text').textContent = cfg.text;
  bar.querySelector('.ai-conn-hint')?.remove();
}

function _ensureConnBar() {
  if (document.getElementById('aiConnBar')) return;
  const statusRow = document.querySelector('#aiSheet .ai-status-row');
  if (!statusRow) return;
  const bar = document.createElement('div');
  bar.id = 'aiConnBar';
  bar.className = 'ai-conn-bar conn-unknown';
  bar.innerHTML =
    '<span class="ai-conn-dot"></span>' +
    '<span class="ai-conn-text">未检测</span>' +
    '<span class="ai-conn-model" id="aiConnModel"></span>';
  statusRow.prepend(bar);
  // 订阅状态变化
  onConnChange(_updateConnUI);
  // 立即显示当前状态
  _updateConnUI(getConnState());
}

// The illustration and chart summary are optional while the controls remain
// available. Keep the choice across openings, without interrupting a draft.
const LS_AI_HEADER_COLLAPSED = 'tj_ai_header_collapsed';

function _setHeaderCollapsed(collapsed) {
  const sheet = document.getElementById('aiSheet');
  const hero = document.getElementById('aiHero');
  const context = document.getElementById('aiContext');
  const toggle = document.getElementById('aiHeaderToggle');
  if (!sheet || !hero || !context || !toggle) return;

  const body = document.getElementById('askResult');
  const wasAtBottom = body && body.scrollHeight - body.scrollTop - body.clientHeight < 24;
  hero.hidden = collapsed;
  context.hidden = collapsed;
  sheet.classList.toggle('ai-header-collapsed', collapsed);
  toggle.setAttribute('aria-expanded', String(!collapsed));
  const label = collapsed ? '展开顶部' : '收起顶部';
  toggle.querySelector('span').textContent = label;
  toggle.title = label;
  if (!collapsed && sheet.classList.contains('open')) loadMasterPortraits(sheet);
  if (wasAtBottom && sheet.classList.contains('open')) body.scrollTop = body.scrollHeight;
}

const headerToggle = document.getElementById('aiHeaderToggle');
if (headerToggle) {
  let collapsed = false;
  try { collapsed = localStorage.getItem(LS_AI_HEADER_COLLAPSED) === '1'; } catch (e) {}
  _setHeaderCollapsed(collapsed);
  headerToggle.addEventListener('click', () => {
    const next = headerToggle.getAttribute('aria-expanded') === 'true';
    _setHeaderCollapsed(next);
    try { localStorage.setItem(LS_AI_HEADER_COLLAPSED, next ? '1' : '0'); } catch (e) {}
  });
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
let _homeChat = false;
let _homePending = false;
let _returnFocus = null;
let _backgroundPage = null;
let _pageWasInert = false;
let _focusTimer = 0;

function _setAiStreaming(active) {
  window.dispatchEvent(new CustomEvent('tj:ai-stream', { detail: { active } }));
}
function _personalChart() {
  const chart = getCtx();
  return chart && !chart.isDemoPreview ? chart : null;
}
function _goFillChart() {
  closeAsk();
  if (document.body.classList.contains('report-active')) window.goBack?.();
  window.TJOpenForm?.();
}

/** Neutral status, not a simulated response: the user can chat without a chart. */
function _updateHomeIntro() {
  if (!_homeChat) return;
  const body = document.getElementById('askResult');
  if (!body) return;
  const hasChart = !!_personalChart();
  const hasKey = !!getApiKey();
  document.body.classList.toggle('character-chat-has-chart', hasChart);
  let intro = document.getElementById('homeChatIntro');
  if (!intro) {
    intro = document.createElement('div');
    intro.id = 'homeChatIntro';
    intro.className = 'chat-home-intro';
    intro.setAttribute('role', 'status');
    body.prepend(intro);
  }
  const heading = document.createElement('div');
  heading.className = 'chat-home-intro-title';
  heading.textContent = hasKey ? '准备好了' : '开始之前';
  const message = document.createElement('p');
  message.textContent = !hasKey
    ? (hasChart ? '配置 AI 后可以开始对话。' : '配置 AI 后可以开始对话；如需命盘解读，也可以先填写出生信息。')
    : (hasChart ? '已载入你的命盘，可以直接提问。' : '还未提供命盘，可以先聊聊；填写出生信息后可获得命盘解读。');
  const actions = document.createElement('div');
  actions.className = 'chat-home-actions';
  if (!hasKey) {
    const settings = document.createElement('button');
    settings.type = 'button';
    settings.textContent = '配置 AI';
    settings.addEventListener('click', () => window.openAISettingsModal?.());
    actions.appendChild(settings);
  }
  if (!hasChart) {
    const fill = document.createElement('button');
    fill.type = 'button';
    fill.textContent = '填写出生信息';
    fill.addEventListener('click', _goFillChart);
    actions.appendChild(fill);
  }
  intro.replaceChildren(heading, message, actions);
}

// A suggestion is only a draft: it never submits or replaces existing text.
const STARTER_PROMPTS = [
  ['聊聊迷茫', '我最近有些迷茫，可以陪我理一理吗？'],
  ['关系困惑', '我想聊聊关系里遇到的困惑。'],
  ['做个选择', '我想理清一个正在面对的选择。'],
];

function _syncStarters() {
  const body = document.getElementById('askResult');
  const group = body?.querySelector('.chat-starters');
  if (!group) return;
  const hasConversation = !!body.querySelector('.chat-msg:not(.chat-welcome)');
  group.hidden = hasConversation || !!document.getElementById('askInput')?.value.trim();
}

function _renderStarters(body) {
  if (!body) return;
  const existing = body.querySelector('.chat-starters');
  if (body.querySelector('.chat-msg:not(.chat-welcome)')) {
    existing?.remove();
    return;
  }
  if (!existing) {
    const group = document.createElement('div');
    group.className = 'chat-starters';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', '提问灵感');
    const title = document.createElement('div');
    title.className = 'chat-starters-title';
    title.textContent = '不知道从哪开始？';
    const list = document.createElement('div');
    list.className = 'chat-starters-list';
    STARTER_PROMPTS.forEach(([label, prompt]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => {
        const input = document.getElementById('askInput');
        if (!input) return;
        if (!input.value.trim()) {
          input.value = prompt;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        focusSafely(input);
      });
      list.appendChild(button);
    });
    group.append(title, list);
    body.appendChild(group);
  } else {
    // The same panel may be reopened from a report after a home session.
    // Keep the welcome message ahead of its optional prompts in both contexts.
    body.appendChild(existing);
  }
  _syncStarters();
}

function _showHomeError(question, missingKey = false) {
  const body = document.getElementById('askResult');
  if (!body) return;
  body.querySelector('.chat-home-error')?.remove();
  const notice = document.createElement('div');
  notice.className = 'chat-home-error';
  notice.setAttribute('role', 'status');
  const message = document.createElement('p');
  message.textContent = missingKey
    ? '请先配置 AI，你的问题已保留。'
    : '暂时无法连接 AI，你的问题已保留。请检查网络或设置后重试。';
  const actions = document.createElement('div');
  actions.className = 'chat-home-actions';
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.textContent = 'AI 设置';
  settings.addEventListener('click', () => window.openAISettingsModal?.());
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = '重试这条问题';
  retry.addEventListener('click', () => _sendHomeQuestion(question, false));
  actions.appendChild(settings);
  if (!missingKey) actions.appendChild(retry);
  notice.append(message, actions);
  body.appendChild(notice);
  _scrollToBottom(body);
}

function _recoverHomeQuestion(question) {
  const input = document.getElementById('askInput');
  // Do not overwrite a different message typed while the request was in flight.
  if (input && !input.value.trim()) {
    input.value = question;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  _showHomeError(question);
}

window.addEventListener('tj:ai-settings-changed', () => {
  if (_homeChat && document.getElementById('aiSheet')?.classList.contains('open')) _updateHomeIntro();
});
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
  // Older saved conversations may still contain the former star avatar.
  el.querySelectorAll('.chat-msg-ai .chat-avatar').forEach(avatar => {
    avatar.classList.add('chat-avatar--twins');
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = masterAvatarMarkup();
  });
  // 工具跳转按钮的事件随 HTML 序列化丢失，按 data-tool 重新绑定
  el.querySelectorAll('.chat-tool-btn[data-tool]').forEach(b => {
    b.onclick = () => {
      window._returnToAI = true;
      closeAsk();
      setTimeout(() => { if (window.openToolPage) window.openToolPage(b.dataset.tool); }, 180);
    };
  });
  el.querySelectorAll('.chat-chart-btn').forEach(button => { button.onclick = _goFillChart; });
  _scrollToBottom(el);
  return true;
}

// —— 欢迎消息 ——
function _renderWelcome(el) {
  const ctx = window._ctx;
  const hour = new Date().getHours();
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
  let contextLine = '可以问事业、关系、财务与近期选择；我会先讲依据，再陪你把问题落到下一步。';
  if (ctx && !ctx.isDemoPreview) {
    contextLine = '我已连接你的命盘（' + ctx.dg + ctx.dw + '），随时可以聊。';
  }
  const gen = (getGenome() && getGenome().generation) || 0;
  if (gen > 0) contextLine += ' 我已经和你相处到第' + gen + '代，会记得你更在意什么。';
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-welcome';
  msgDiv.innerHTML =
    '<div class="chat-avatar chat-avatar--twins" aria-hidden="true">' + masterAvatarMarkup() + '</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai">' +
        '<div class="chat-welcome-greeting">' + greeting + '！我是问问大师</div>' +
        '<div class="chat-welcome-desc">' + contextLine + '</div>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
}

// —— 用户气泡 ——
function _renderUserBubble(el, text) {
  el.querySelector('.chat-starters')?.remove();
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
  const sheet = document.getElementById('aiSheet');
  if (sheet?.classList.contains('open')) sheet.classList.add('ai-master-thinking');
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
    '<div class="chat-avatar chat-avatar--twins" aria-hidden="true">' + masterAvatarMarkup() + '</div>' +
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
  document.getElementById('aiSheet')?.classList.remove('ai-master-thinking');
  const indicator = el.querySelector('.chat-typing');
  if (indicator) indicator.remove();
}

function _chatActionsHtml(retry) {
  return '<div class="chat-actions">' +
    '<button type="button" data-act="up" title="有帮助">有用</button>' +
    '<button type="button" data-act="down" title="不太对">不准</button>' +
    '<button type="button" data-act="copy" title="复制回答">复制</button>' +
    (retry ? '<button type="button" data-act="retry" title="重新回答">重试</button>' : '') +
  '</div>';
}
function _plainFrom(node) {
  return String(node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
}
async function _remember(msgDiv, payload) {
  try {
    const id = await recordExperience(payload);
    if (msgDiv && id != null) msgDiv.dataset.eid = String(id);
  } catch (e) {}
}

// —— AI 回复气泡 ——
function _createAiBubble(el, q) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  msgDiv.innerHTML =
    '<div class="chat-avatar chat-avatar--twins" aria-hidden="true">' + masterAvatarMarkup() + '</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai"><div class="chat-ai-text"></div></div>' +
      _chatActionsHtml(true) +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  if (q) msgDiv.dataset.q = q;
  el.appendChild(msgDiv);
  _scrollToBottom(el);
  const textEl = msgDiv.querySelector('.chat-ai-text');
  textEl._msg = msgDiv;
  return textEl;
}

// —— KB 信息库气泡 ——
function _renderKbBubble(el, kbRes, q) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  const kbHtml = renderSmartAnswer(kbRes, q);
  msgDiv.innerHTML =
    '<div class="chat-avatar chat-avatar--twins" aria-hidden="true">' + masterAvatarMarkup() + '</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai chat-bubble-kb">' + kbHtml + '</div>' +
      _chatActionsHtml(false) +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  if (q) msgDiv.dataset.q = q;
  el.appendChild(msgDiv);
  _scrollToBottom(el);
  return msgDiv;
}

// —— 工具调用气泡 ——
function _renderToolCallBubble(el, short, toolId) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  msgDiv.innerHTML =
    '<div class="chat-avatar chat-avatar--twins" aria-hidden="true">' + masterAvatarMarkup() + '</div>' +
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
    '<div class="chat-avatar chat-avatar--twins" aria-hidden="true">' + masterAvatarMarkup() + '</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai">' +
        '请先完成命盘排盘，我才能给出有针对性的建议。' +
        '<button class="chat-tool-btn chat-chart-btn" type="button">前往填写出生信息 →</button>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  msgDiv.querySelector('.chat-chart-btn').addEventListener('click', _goFillChart);
  el.appendChild(msgDiv);
  _persistMsg(msgDiv);
  _scrollToBottom(el);
}

// —— 辅助 ——
function _escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _scrollToBottom(el) { requestAnimationFrame(() => { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }); }
function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ============================================================
   依据体系管理：东方命理 vs 西方星相
   ============================================================ */
const LS_AI_BASIS = 'tj_ai_basis';

export function getAiBasis() {
  try {
    const saved = localStorage.getItem(LS_AI_BASIS);
    if (saved === 'western' || saved === 'eastern') return saved;
  } catch (e) {}
  const sys = document.body.getAttribute('data-system-mode') || document.documentElement.getAttribute('data-system-mode') || 'eastern';
  return sys === 'western' ? 'western' : 'eastern';
}

export function setAiBasis(basis) {
  const isWestern = basis === 'western';
  const val = isWestern ? 'western' : 'eastern';
  try { localStorage.setItem(LS_AI_BASIS, val); } catch (e) {}

  const btnE = document.getElementById('aiBasisEastern');
  const btnW = document.getElementById('aiBasisWestern');
  if (btnE && btnW) {
    btnE.classList.toggle('active', !isWestern);
    btnW.classList.toggle('active', isWestern);
    btnE.setAttribute('aria-checked', !isWestern ? 'true' : 'false');
    btnW.setAttribute('aria-checked', isWestern ? 'true' : 'false');
    btnE.tabIndex = isWestern ? -1 : 0;
    btnW.tabIndex = isWestern ? 0 : -1;
  }

  _syncAiContext();
}
window.setAiBasis = setAiBasis;

// Keep the radiogroup usable with arrows as well as touch and clicks.
document.querySelector('#aiSheet .ai-basis-pills')?.addEventListener('keydown', event => {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  const basis = event.key === 'Home' ? 'eastern' : event.key === 'End' ? 'western'
    : getAiBasis() === 'eastern' ? 'western' : 'eastern';
  setAiBasis(basis);
  focusSafely(document.getElementById(basis === 'western' ? 'aiBasisWestern' : 'aiBasisEastern'));
});

function _syncAiContext() {
  const context = document.getElementById('aiContext');
  const d = _homeChat ? _personalChart() : window._ctx;
  const basis = getAiBasis();
  const isWestern = basis === 'western';

  const btnE = document.getElementById('aiBasisEastern');
  const btnW = document.getElementById('aiBasisWestern');
  if (btnE && btnW) {
    btnE.classList.toggle('active', !isWestern);
    btnW.classList.toggle('active', isWestern);
    btnE.setAttribute('aria-checked', String(!isWestern));
    btnW.setAttribute('aria-checked', String(isWestern));
    btnE.tabIndex = isWestern ? -1 : 0;
    btnW.tabIndex = isWestern ? 0 : -1;
  }

  if (context) {
    if (!d) {
      context.innerHTML = '<span>命盘</span><b>尚未提供出生信息</b>';
    } else if (isWestern) {
      const input = d.input || d._input || {};
      const y = input.by || 1995, m = input.bm || 6, dDate = input.bd || 15;
      const [h, min] = (input.timeStr || '12:00').split(':').map(Number);
      const chart = calcWesternChart(y, m, dDate, h || 12, min || 0);
      const num = calcNumerology(y, m, dDate);
      context.innerHTML = `<span>西方星相依据</span><b>太阳 ${chart.sun.name} ｜ 上升 ${chart.asc.name} ｜ 月亮 ${chart.moon.name} ｜ 主命数 ${num.lifePath}号</b>`;
    } else {
      context.innerHTML = `<span>东方命理依据</span><b>${d.dg}${d.dw} · ${d.wx.st ? '身旺' : '身弱'} ｜ 大运 ${d.cDy.g}${d.cDy.z} ｜ 用神 ${d.wx.ys}</b>`;
    }
  }
}

/* ============================================================
   公开 API
   ============================================================ */

export function openAsk() {
  const sheet = document.getElementById('aiSheet');
  if (sheet?.classList.contains('open')) { closeAsk(); return; }
  if (!sheet) return;
  if (!sheet.classList.contains('ai-header-collapsed')) loadMasterPortraits(sheet);

  const page = document.getElementById('page1');
  _homeChat = !!page && !page.classList.contains('hidden');
  _returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  // Both entries now open the same modal conversation room.
  _backgroundPage = _homeChat ? page : document.getElementById('page2');
  _pageWasInert = !!_backgroundPage?.inert;
  if (_backgroundPage) _backgroundPage.inert = true;
  sheet.setAttribute('aria-modal', 'true');
  if (_homeChat) {
    document.body.classList.add('character-chat-open');
  } else {
    const fab = document.getElementById('aiFab');
    if (fab) { fab.classList.remove('fab-pop'); void fab.offsetWidth; fab.classList.add('fab-pop'); fab.addEventListener('animationend', () => fab.classList.remove('fab-pop'), { once: true }); }
  }
  document.getElementById('aiTitleText').textContent = _homeChat ? `和${CHAT_MASTER.name}聊聊` : CHAT_MASTER.title;
  sheet.inert = false;
  sheet.setAttribute('aria-hidden', 'false');
  document.getElementById('aiOverlay').classList.add('open');
  sheet.classList.add('open');

  _syncAiContext();
  _ensureConnBar();
  const body = document.getElementById('askResult');
  if (body && !body.querySelector('.chat-msg') && !body.querySelector('.chat-home-intro')) {
    if (!_restoreHistory(body) && !_homeChat) _renderWelcome(body);
    probeConnection(getApiKey());
  }
  if (_homeChat) _updateHomeIntro();
  else {
    body?.querySelector('.chat-home-intro')?.remove();
    if (body && !body.querySelector('.chat-msg')) _renderWelcome(body);
  }
  const input = document.getElementById('askInput');
  if (input && !input.value) {
    try { input.value = sessionStorage.getItem('tj_ai_draft') || ''; } catch (e) {}
  }
  _renderStarters(body);
  clearTimeout(_focusTimer);
  _focusTimer = setTimeout(() => {
    if (!sheet.classList.contains('open') || sheet.inert) return;
    // Do not summon the mobile keyboard until the user taps the composer.
    const target = window.matchMedia('(max-width: 650px)').matches
      ? document.getElementById('aiTitleText') : input;
    focusSafely(target);
  }, 80);
}

export function closeAsk() {
  const sheet = document.getElementById('aiSheet');
  if (!sheet?.classList.contains('open')) return;
  clearTimeout(_focusTimer);
  _setAiStreaming(false);
  document.getElementById('aiOverlay').classList.remove('open');
  sheet.classList.remove('open', 'ai-master-thinking');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.removeAttribute('aria-modal');
  sheet.inert = true;
  document.getElementById('aiSuggest')?.classList.remove('show');
  if (_backgroundPage) _backgroundPage.inert = _pageWasInert;
  _backgroundPage = null;
  document.body.classList.remove('character-chat-open', 'character-chat-has-chart');
  _homeChat = false;
  const target = _returnFocus;
  _returnFocus = null;
  if (target?.isConnected && target.getClientRects().length) focusSafely(target);
}

// Keep keyboard navigation in the shared dialog, for both entry points.
document.getElementById('aiSheet')?.addEventListener?.('keydown', event => {
  if (!event.currentTarget.classList.contains('open') || event.currentTarget.inert || event.key !== 'Tab') return;
  const controls = [...event.currentTarget.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(el => el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[inert]'));
  if (!controls.length) return;
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
});

export function newAskChat() {
  if (_homePending) return;
  window._aiConversation = [];
  _histClear();
  const result = document.getElementById('askResult');
  const input = document.getElementById('askInput');
  const sug = document.getElementById('aiSuggest');
  if (result) {
    _hideTyping(result);
    result.innerHTML = '';
    if (_homeChat) _updateHomeIntro();
    else _renderWelcome(result);
  }
  if (input) { input.value = ''; input.style.height = 'auto'; input.focus(); }
  _renderStarters(result);
  const status = document.getElementById('aiLiveStatus');
  if (status) status.textContent = '';
  try { sessionStorage.removeItem('tj_ai_draft'); } catch (e) {}
  if (sug) { sug.innerHTML = ''; sug.classList.remove('show'); }
  _setModelLabel('');
}

export function aiToolRequest(q) {
  const x = String(q || '').trim();
  if (!/(打开|使用|开始|做一下|帮我|调用|进入|测一下|测评)/.test(x)) return false;
  const rules = [
    [/事业|转行|副业|职业选择|裁员|失业|职场风险/, 'career', '事业大师'],
    [/合盘|伴侣合盘|感情合盘|八字合盘/, 'relation', '合盘助手'],
    [/生肖|属相|生肖合冲|生肖关系/, 'zodiac', '生肖助手'],
    [/风水|环境|罗盘/, 'fengshui', '风水大师'],
    [/择日|选日子|重要事项|安排日期/, 'date', '择日助手'],
    [/今日日签|今日提醒|日签/, 'daily', '今日日签'],
    [/起名|取名|名字|选字/, 'name', '起名助手'],
    [/答案之书|翻答案/, 'answerbook', '答案之书'],
    [/摇签|问卜|抽签/, 'oracle', '摇签问卜'],
    [/彩票|双色球|大乐透|选号/, 'lottery', '娱乐选号'],
    [/星座|星盘|上升星座|月亮星座|太阳星座|占星/, 'horoscope', '星座大师'],
    [/塔罗|卡罗|塔罗牌|卡罗牌|抽牌|牌阵/, 'tarot', '塔罗大师'],
    [/mbti|MBTI|人格|16型|八维|性格测评|心理类型/, 'mbti', '人格大师']
  ];
  const hit = rules.find(([re]) => re.test(x));
  if (!hit) return false;
  const el = document.getElementById('askResult');
  if (!el) return false;
  const short = { career: '事业', relation: '合盘', zodiac: '生肖', date: '择日', daily: '日签', name: '起名', oracle: '摇签', answerbook: '答案之书', lottery: '选号', fengshui: '风水', horoscope: '星座', tarot: '塔罗', mbti: '人格' }[hit[1]] || '工具';
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

async function _sendHomeQuestion(q, showUserBubble = true) {
  const question = String(q || '').trim();
  if (!question || _homePending) return;
  const input = document.getElementById('askInput');
  if (!getApiKey()) {
    if (input && !input.value.trim()) {
      input.value = question;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    _updateHomeIntro();
    _showHomeError(question, true);
    return;
  }

  _homePending = true;
  const send = document.querySelector('#aiSheet .ai-send');
  const fresh = document.querySelector('#aiSheet .ai-new');
  if (send) send.disabled = true;
  if (fresh) fresh.disabled = true;
  document.querySelector('#askResult .chat-home-error')?.remove();
  if (input?.value.trim() === question) {
    input.value = '';
    input.style.height = 'auto';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const body = document.getElementById('askResult');
  body?.setAttribute('aria-busy', 'true');
  const liveStatus = document.getElementById('aiLiveStatus');
  if (liveStatus) liveStatus.textContent = '';
  if (showUserBubble) _renderUserBubble(body, question);
  try {
    await generateAnswer(question, { homeSession: true });
  } catch (error) {
    _hideTyping(body);
    _setAiStreaming(false);
    _recoverHomeQuestion(question);
  } finally {
    _homePending = false;
    body?.removeAttribute('aria-busy');
    if (send) send.disabled = false;
    if (fresh) fresh.disabled = false;
  }
}

export function doAsk(q) {
  if (!document.getElementById('aiSheet').classList.contains('open')) openAsk();
  if (_homeChat) { _sendHomeQuestion(q); return; }
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
  if (_homeChat) { _sendHomeQuestion(q); return; }
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
export function aiOnInputSuggest() {
  const sug = document.getElementById('aiSuggest');
  if (sug) { sug.innerHTML = ''; sug.classList.remove('show'); }
  const input = document.getElementById('askInput');
  if (input) {
    _syncStarters();
    try { sessionStorage.setItem('tj_ai_draft', input.value); } catch (e) {}
    input.style.height = 'auto';
    const max = parseFloat(getComputedStyle(input).maxHeight) || 132;
    input.style.height = Math.min(input.scrollHeight + 2, max) + 'px';
  }
}

/* ============================================================
   核心：generateAnswer — 三层触发机制
   ============================================================ */
export async function generateAnswer(q, { homeSession = _homeChat } = {}) {
  // Demo data is never sent as a personal chart from the landing page.
  const d = homeSession ? _personalChart() : getCtx();
  const el = document.getElementById('askResult');
  const conversation = window._aiConversation || (window._aiConversation = []);
  const aiPrefs = window.getAISettings ? window.getAISettings() : { natural: true, context: true, length: 'short' };
  const previousTurns = aiPrefs.context ? conversation.slice(-6) : [];

  const contextualFollowUp = previousTurns.length > 0 && (
    q.trim().length <= 18 || /^(那|然后|所以|具体|继续|怎么办|怎么做|为什么|他|她|这个|那我|我呢|可以吗|要不要)/.test(q.trim())
  );
  if (contextualFollowUp) flagLastFollowUp().catch(() => {});

  const expBase = {
    q,
    intents: extractIntents(q),
    style: d && d.input ? d.input.resultStyle : '',
    chartKey: chartKeyOf(d),
    ctx: d
  };

  // ———— 无命盘 ————
  if (!d && !homeSession) {
    _showTyping(el);
    await _delay(600);
    _renderNeedChart(el);
    return;
  }

  // 首页人物对话只使用真实 AI 回复，不用固定话术或本地模拟回答。
  const kbRes = homeSession || contextualFollowUp ? null : smartAnswer(q, d);
  if (kbRes) {
    _showTyping(el, '信息库匹配中…');
    await _delay(400 + Math.random() * 300);
    const msgDiv = _renderKbBubble(el, kbRes, q);
    const answer = (kbRes.sections || []).map(s => s.content || '').join(' ');
    await _remember(msgDiv, {
      ...expBase,
      a: answer,
      source: kbRes.kind === 'term' ? 'term' : kbRes.kind === 'personal' ? 'personal' : 'kb',
      faqId: kbRes.faqId || null,
      answerLen: answer.length
    });
    _persistLast();
    conversation.push({ role: 'user', content: q });
    conversation.push({ role: 'assistant', content: answer.slice(0, 180) });
    return;
  }

  // ———— 第 2 层：AI API 流式调用 ————
  _showTyping(el, '正在连接 AI…');
  _setModelLabel('');

  const basis = getAiBasis();
  const isWestern = basis === 'western';
  const resultStyle = getResultStyle(d?.input?.resultStyle);
  const evolveBlock = getEvolvePrompt();

  let ctx = '';
  let systemPrompt = '';

  if (!d) {
    ctx = '用户尚未提供命盘或出生信息。';
    systemPrompt = `你是「问问」，一位温暖、清醒、有分寸的对话伙伴。用户目前没有提供命盘或出生信息，请自然、简洁地回应眼前的问题；绝不能假称已经看到命盘，也不能虚构生辰八字、星盘、运势或其他个人资料。若问题确实需要命盘，说明信息不足，并可建议用户填写出生信息。涉及健康、法律或财务等重大决定时，提醒结合事实与专业意见。`;
  } else if (isWestern) {
    ctx = buildWesternContext(d);
    systemPrompt = `你是「问问」，一位精通西方现代占星学、本命星盘相位、十二宫位能量、黄道运势与毕达哥拉斯生命灵数的资深西方星相大师。
当前解读风格：${resultStyle.label}。${resultStyle.prompt}${evolveBlock ? '\n' + evolveBlock + '\n' : ''}
你的工作是以【西方星相与生命灵数体系】为核心依据，为用户提供深刻、包容、富于心理学启迪与落地行动的分析与解答。
请严格遵守以下约束：
① 严格对照下方【西方星盘与灵数数据】作答，结合用户的太阳、月亮、上升三核星座、十大行星落座落宫、四象元素（火/土/风/水）主导与短板、主要几何相位及生命灵数（主命数/天赋数/流年数）。
② 结合荣格原型心理学与现代占星学，将星盘配置转化为对用户当下生活、职场、情感的具体洞察与突破建议，控制在 120–260 字，使用自然中文，不堆砌生僻术语。
③ 不搞宿命论预言，以赋能、启发与自我整合为主旨；涉及事业、财务、健康等重大决定时，明确提醒用户结合现实情况与专业意见。
④ 自我核对：落笔前确认每句话都符合星盘数据，绝不臆造星盘配置。
⑤ 结合对话历史理解省略指代；只在信息确实不足时问一个最关键的问题。`;
  } else {
    ctx = buildBaziContext(d);
    systemPrompt = `你是「问问」，一位温暖、清醒、有分寸的传统命理咨询陪伴者。
当前结果风格：${resultStyle.label}。${resultStyle.prompt}${evolveBlock ? '\n' + evolveBlock + '\n' : ''}
你的工作是以【东方命理体系】（四柱八字、五行生克、十神、神煞、大运流年）为依据，把传统命理当作观察倾向和整理问题的语言，再帮助用户回到现实选择。
请严格遵守以下约束：
① 先对照下方【用户东方命盘】再作答——所有命理判断必须基于真实数据（日主、五行强弱、十神、用神喜忌、当前大运/流年、各项评分），只选与问题最相关的两三项，不要罗列无关字段，也不要每次复述整张命盘。
② 回答结构自然但完整：先接住用户正在面对的事，再说明一条清楚的命盘依据，然后给出一到两个现实行动。控制在 100–220 字，使用自然中文，不堆砌术语，不用空泛鸡汤。
③ 解释术语时先翻译成人话，再说明它如何映射到用户的问题；不要只贴标签。涉及事业、财务、健康、法律或关系重大决定时，明确提醒用户结合事实、专业意见和当事人沟通。
④ 自我核对：落笔前确认每句话都符合命盘；一旦发现与数据矛盾（如五行、十神、大运年份、流年写错），立即用一句「更正：…」当场修正，绝不臆造或含糊带过。
⑤ 结合对话历史理解省略指代（「那我呢」「这个机会」「他/她」等）；只在信息确实不足时问一个最关键的问题。
⑥ 不把命理说成事实，不承诺必然结果，不制造恐惧，不鼓励高风险投资、迷信消费或替代医疗。拿不准就坦诚说「我不确定」。`;
  }

  let usedModel = '';

  // 7 秒慢速提示
  const slowTimer = setTimeout(() => {
    _showTyping(el, '模型响应较慢，正在尝试…');
  }, 7000);

  let textEl = null;
  let speaking = false;
  try {
    const _mkBubble = () => {
      if (textEl) return textEl;
      textEl = _createAiBubble(el, q);
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
        if (homeSession && partial.trim() && _homeChat && document.getElementById('aiSheet')?.classList.contains('open') && !speaking) {
          speaking = true;
          _setAiStreaming(true);
        }
        _mkBubble().innerHTML = homeSession ? formatAIText(partial) : formatStandardAnswer(partial);
        _scrollToBottom(el);
      }
    });

    clearTimeout(slowTimer);
    if (speaking) { _setAiStreaming(false); speaking = false; }
    _hideTyping(el);

    // AI 输出兜底过滤：扫描最终文本中的黑名单词
    if (textEl) {
      const rendered = textEl.innerHTML;
      const { html: filteredHtml, filtered } = filterAiResponse(result.text, rendered);
      if (filtered) {
        textEl.innerHTML = filteredHtml;
        _scrollToBottom(el);
      }
    }

    _setModelLabel(result.model);
    if (homeSession && _homeChat && document.getElementById('aiSheet')?.classList.contains('open')) {
      const status = document.getElementById('aiLiveStatus');
      if (status && textEl) status.textContent = `${CHAT_MASTER.name}回复：${textEl.textContent}`;
    }

    conversation.push({ role: 'user', content: q });
    conversation.push({ role: 'assistant', content: result.text.slice(0, 500) });

    const intents = extractIntents(q);
    // Report routes are dock-bound and cannot navigate from the home dialog.
    const links = homeSession ? [] : buildRelatedRoutes(intents);
    if (links.length && textEl) {
      const routeHtml = renderRouteButtons(links, '前往相关页面查看');
      textEl.closest('.chat-bubble').insertAdjacentHTML('beforeend', routeHtml);
    }
    await _remember(textEl && textEl._msg, {
      ...expBase,
      a: result.text,
      source: 'ai',
      answerLen: result.text.length
    });
    _persistLast();
    _scrollToBottom(el);

  } catch (e) {
    clearTimeout(slowTimer);
    if (speaking) _setAiStreaming(false);
    _hideTyping(el);
    if (homeSession) {
      // Do not turn a network failure (including a partial stream) into a fabricated reply.
      textEl?._msg?.remove();
      _setModelLabel('');
      _recoverHomeQuestion(q);
      return;
    }

    // ———— 第 3 层：报告页保留原有离线兜底 ————
    _setModelLabel('');
    const fbMsg = _generateAnswerFallbackChat(q, d, el);
    const fbText = _plainFrom(fbMsg && fbMsg.querySelector('.chat-ai-text'));
    await _remember(fbMsg, {
      ...expBase,
      a: fbText,
      source: 'fallback',
      answerLen: fbText.length
    });
    _persistLast();
    conversation.push({ role: 'user', content: q });
    conversation.push({ role: 'assistant', content: '已基于当前话题给出建议。' });
  }
}

// —— Fallback 气泡渲染 ——
function _generateAnswerFallbackChat(q, d, el) {
  const textEl = _createAiBubble(el, q);
  const temp = document.createElement('div');
  generateAnswerFallback(q, d, temp);
  const fallbackText = temp.querySelector('.ai-dialogue-text')?.innerHTML
    || temp.textContent
    || '抱歉，我暂时无法连接到 AI 服务。请稍后再试。';
  textEl.innerHTML = fallbackText;
  _scrollToBottom(el);
  return textEl._msg;
}

document.addEventListener('click', async e => {
  const btn = e.target.closest?.('.chat-actions [data-act]');
  if (!btn) return;
  const msg = btn.closest('.chat-msg');
  if (!msg) return;
  const act = btn.dataset.act;
  const eid = msg.dataset.eid ? Number(msg.dataset.eid) : lastExperienceId();
  const q = msg.dataset.q || '';
  if (act === 'copy') {
    const text = _plainFrom(msg.querySelector('.chat-ai-text, .chat-bubble'));
    try { await navigator.clipboard.writeText(text); showToast('已复制'); }
    catch (err) { showToast('复制失败'); }
    if (eid != null) flagExperience(eid, 'copy', true).catch(() => {});
    return;
  }
  if (act === 'retry') {
    if (eid != null) flagExperience(eid, 'retry', true).catch(() => {});
    if (q && _homeChat) _sendHomeQuestion(q, false);
    else if (q) generateAnswer(q);
    return;
  }
  if (act === 'up' || act === 'down') {
    const rating = act === 'up' ? 1 : -1;
    msg.querySelectorAll('[data-act="up"],[data-act="down"]').forEach(b => {
      b.classList.toggle('on', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
    if (eid != null) {
      await rateExperience(eid, rating);
      showToast(rating > 0 ? '记下了，以后会更往这边靠' : '记下了，下次换个说法');
    }
  }
});
