/* ============================================================
   问问大师 · AI 提供方门面
   ------------------------------------------------------------
   统一导出，调用方无需感知底层是 DeepSeek 还是 OpenRouter。
   默认提供方：deepseek（可在设置中切换为 openrouter）。
   切换状态存于 localStorage['tj_ai_provider']。
   ============================================================ */

import * as openrouter from './openrouter.js';
import * as deepseek from './deepseek.js';

const LS_PROVIDER = 'tj_ai_provider';

export function getProvider() {
  try { return localStorage.getItem(LS_PROVIDER) || 'deepseek'; } catch (_) { return 'deepseek'; }
}
export function setProvider(p) {
  if (p !== 'deepseek' && p !== 'openrouter') return;
  try { localStorage.setItem(LS_PROVIDER, p); } catch (_) {}
}
function active() { return getProvider() === 'openrouter' ? openrouter : deepseek; }

/* —— 自动路由到当前提供方（签名一致）—— */
export const streamAskAnswer = (opts) => active().streamAskAnswer(opts);
export const askToolInsight  = (opts) => active().askToolInsight(opts);
export const probeConnection = (key) => active().probeConnection(key);
export const getConnState    = () => active().getConnState();
export const modelLabel      = (id) => active().modelLabel(id);

// 连接状态监听同时挂到两个提供方，保证切换后 UI 仍能收到更新
export function onConnChange(fn) {
  openrouter.onConnChange(fn);
  deepseek.onConnChange(fn);
}

/* —— 提供方常量（供设置页读取）—— */
export const DEEPSEEK_BASE        = deepseek.DEEPSEEK_BASE;
export const DEEPSEEK_ASK_MODELS  = deepseek.ASK_MODELS;
export const DEEPSEEK_TOOL_MODELS = deepseek.TOOL_MODELS;
export const OPENROUTER_BASE      = openrouter.OPENROUTER_BASE;
export const ASK_MODELS           = openrouter.ASK_MODELS;
export const TOOL_MODELS          = openrouter.TOOL_MODELS;
export const MODEL_LABELS         = openrouter.MODEL_LABELS;

/* —— 命理/知识库能力（与提供方无关）—— */
export { KB } from './kb.js';
export { KBSearch, smartAnswer, extractIntents, buildBaziContext } from './smart-answer.js';
export { getLayoffAstroRisk } from './risk.js';
export { generateAnswerFallback } from './fallback.js';
