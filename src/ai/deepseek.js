/* ============================================================
   问问大师 · DeepSeek 提供方（OpenAI 兼容 / SSE 流式）
   ------------------------------------------------------------
   端点：https://api.deepseek.com/chat/completions
   模型：deepseek-v4-flash（主）/ deepseek-chat (V3) / deepseek-reasoner (R1)
   说明：浏览器直连，密钥仅存本地；CORS 已确认支持跨域。
   接口签名与 openrouter.js 保持一致，便于门面层无缝切换。
   ============================================================ */

export const DEEPSEEK_BASE = 'https://api.deepseek.com';
export const ASK_MODELS = ['deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'];
export const TOOL_MODELS = ['deepseek-v4-flash', 'deepseek-chat'];

export const MODEL_LABELS = {
  'deepseek-v4-flash': 'DeepSeek V4 Flash',
  'deepseek-chat': 'DeepSeek V3',
  'deepseek-reasoner': 'DeepSeek R1'
};
export function modelLabel(id) {
  return MODEL_LABELS[id] || (id ? id.replace(/^deepseek-/, 'DeepSeek ') : id);
}

/* ============================================================
   连接状态探针 — GET /user/balance 检测密钥有效性与可达性
   ============================================================ */
let _connState = 'unknown';   // unknown | checking | online | offline
let _connListeners = [];

export function getConnState() { return _connState; }
export function onConnChange(fn) { _connListeners.push(fn); return () => { _connListeners = _connListeners.filter(x => x !== fn); }; }
function _notifyConn(s) { _connState = s; _connListeners.forEach(fn => { try { fn(s); } catch (_) {} }); }

export async function probeConnection(apiKey) {
  if (!apiKey) { _notifyConn('offline'); return 'offline'; }
  _notifyConn('checking');
  try {
    const resp = await fetchWithTimeout(DEEPSEEK_BASE + '/user/balance', {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + apiKey }
    }, 6000);
    // 200 = 密钥有效；401/403 = 可达但密钥无效；其余网络错误走 catch
    const ok = resp.status === 200;
    _notifyConn(ok ? 'online' : 'offline');
    return ok ? 'online' : 'offline';
  } catch (_) {
    _notifyConn('offline');
    return 'offline';
  }
}

/* ============================================================
   通用工具
   ============================================================ */
function withHeaders(apiKey) {
  return {
    Authorization: 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  };
}

function fetchWithTimeout(url, options, timeoutMs = 22000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function cleanTurns(turns) {
  return (turns || []).slice(-6).map(x => ({
    role: x.role === 'assistant' ? 'assistant' : 'user',
    content: String(x.content || '').slice(0, 700)
  })).filter(x => x.content);
}

function buildAskSystemPrompt({ systemPrompt, aiPrefs, chartContext }) {
  return systemPrompt
    + '\n回复偏好：'
    + (aiPrefs?.natural ? '使用自然口语。' : '直接、少寒暄。')
    + (aiPrefs?.length === 'standard' ? '回复可放宽到180至260字。' : '保持简洁。')
    + '\n用户命盘：\n'
    + String(chartContext || '').slice(0, 5000)
    + '\n当前时间：'
    + new Date().toLocaleString('zh-CN');
}

/* ============================================================
   流式问答 — 返回 { text, model }
   ============================================================ */
export async function streamAskAnswer({
  apiKey,
  systemPrompt,
  chartContext,
  question,
  aiPrefs = { natural: true, length: 'short' },
  previousTurns = [],
  models = ASK_MODELS,
  onDelta,
  onModelSwitch
}) {
  if (!apiKey) throw new Error('missing DeepSeek API key');

  let full = '';
  for (const model of models) {
    try {
      full = '';
      onModelSwitch?.(model);
      const resp = await fetchWithTimeout(DEEPSEEK_BASE + '/chat/completions', {
        method: 'POST',
        headers: withHeaders(apiKey),
        body: JSON.stringify({
          model,
          stream: true,
          temperature: aiPrefs?.temperature ?? 0.55,
          max_tokens: aiPrefs?.length === 'standard' ? 360 : 280,
          messages: [
            { role: 'system', content: buildAskSystemPrompt({ systemPrompt, aiPrefs, chartContext }) },
            ...cleanTurns(previousTurns),
            { role: 'user', content: question }
          ]
        })
      });

      if (!resp.ok || !resp.body) {
        let body = '';
        try { body = await resp.text(); } catch (_) {}
        throw new Error('HTTP ' + resp.status + ' ' + body.slice(0, 80));
      }

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith('data:')) continue;
          const raw = s.slice(5).trim();
          if (raw === '[DONE]') continue;
          let js;
          try { js = JSON.parse(raw); } catch (_) { continue; }
          if (js.error) throw new Error('provider:' + (js.error.message || '').slice(0, 80));
          const delta = js.choices?.[0]?.delta;
          const content = delta?.content;
          if (content) {
            full += content;
            onDelta?.(full, content, model);
          }
        }
      }

      if (buf.trim().startsWith('data:')) {
        const raw = buf.trim().slice(5).trim();
        if (raw && raw !== '[DONE]') {
          try {
            const js = JSON.parse(raw);
            const content = js.choices?.[0]?.delta?.content || '';
            if (content) { full += content; onDelta?.(full, content, model); }
          } catch (_) {}
        }
      }
      if (full.trim()) {
        _notifyConn('online');
        return { text: full, model };
      }
    } catch (_) {
      // 单模型失败（限流/不可用），自动尝试下一个
    }
  }

  _notifyConn('offline');
  throw new Error('all DeepSeek models failed');
}

/* ============================================================
   工具旁白 — 非流式短回复
   ============================================================ */
export async function askToolInsight({
  apiKey,
  typeLabel,
  source,
  chartSummary,
  models = TOOL_MODELS
}) {
  if (!apiKey) throw new Error('missing DeepSeek API key');
  const prompt = `你是一位温暖、清醒、有分寸的决策助理。用户刚完成「${typeLabel}」工具。请把工具结果翻译成自然中文：先接住用户的处境，再指出一条最重要的现实重点，最后给一个今天就能完成的小动作。只引用与结果直接相关的依据，不要重复整份结果，不把命理说成事实，不制造恐惧或夸张承诺；涉及健康、财务、法律和关系重大决定时，提醒结合现实信息与专业意见。控制在140字以内。工具结果：${source}。用户命盘参考：${chartSummary}。`;

  for (const model of models) {
    try {
      const resp = await fetchWithTimeout(DEEPSEEK_BASE + '/chat/completions', {
        method: 'POST',
        headers: withHeaders(apiKey),
        body: JSON.stringify({
          model,
          temperature: 0.65,
          max_tokens: 180,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!resp.ok) continue;
      const json = await resp.json();
      const answer = json.choices?.[0]?.message?.content?.trim() || '';
      if (answer) return answer;
    } catch (_) {}
  }

  throw new Error('all DeepSeek tool models failed');
}
