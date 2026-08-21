/* ============================================================
   问问大师 · 个人知识蒸馏
   ------------------------------------------------------------
   把用户点过「有用」的 AI 回答收成自己的 FAQ。
   匹配与蒸馏都是纯函数，方便单测。
   ============================================================ */

import { keywordsFromQuestion } from './genome.js';

export function similar(a, b) {
  a = String(a || '').toLowerCase();
  b = String(b || '').toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > Math.max(m, n) * 0.6) return 0;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

export function scoreKnowledgeItem(q, item) {
  const ql = String(q || '').trim().toLowerCase();
  if (!ql || !item) return 0;
  let sc = similar(ql, item.q) * 8;
  (item.kw || []).forEach(k => {
    if (k && ql.includes(String(k).toLowerCase())) sc += 3;
  });
  if (item.intent && ql.includes(String(item.intent))) sc += 2;
  if (item.score) sc += Math.min(2, item.score * 0.4);
  if (item.hits) sc += Math.min(1.5, item.hits * 0.15);
  return sc;
}

export function rankKnowledge(q, items, topK = 3) {
  return (items || [])
    .map(item => ({ item, sc: scoreKnowledgeItem(q, item) }))
    .filter(x => x.sc >= 8)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, topK);
}

/**
 * 只有被明确点赞、且来自模型/兜底的回答才蒸馏。
 * 内置 KB / 术语 / 已经是个人知识的，不再重复收。
 */
export function distillFromExperience(exp) {
  if (!exp || exp.rating !== 1) return null;
  if (exp.source !== 'ai' && exp.source !== 'fallback') return null;
  const a = String(exp.a || '').replace(/\s+/g, ' ').trim();
  const q = String(exp.q || '').replace(/\s+/g, ' ').trim();
  if (q.length < 4 || a.length < 24 || a.length > 420) return null;
  return {
    q: q.slice(0, 80),
    kw: keywordsFromQuestion(q),
    intent: (exp.intents && exp.intents[0]) || '综合',
    answer: a.slice(0, 280),
    score: 1,
    hits: 0,
    sourceExpId: exp.id || 0,
    createdAt: Date.now()
  };
}

export function toSmartAnswer(item) {
  if (!item) return null;
  return {
    kind: 'personal',
    title: item.q,
    sections: [{ title: '记得你', content: item.answer }],
    links: [],
    related: [],
    knowledgeId: item.id
  };
}

/** 导出前清洗：丢掉可能误入的出生信息字段。 */
const FORBIDDEN = /^(bd|bDate|birth|birthday|timeStr|bPlace|bp|idCard|phone|email)$/i;

export function sanitizeRecord(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  Object.keys(obj).forEach(k => {
    if (FORBIDDEN.test(k)) return;
    const v = obj[k];
    if (v && typeof v === 'object') out[k] = sanitizeRecord(v);
    else out[k] = v;
  });
  return out;
}

export function containsBirthLeak(payload) {
  const s = JSON.stringify(payload || {});
  return /"bd"\s*:|"bDate"\s*:|"birth"\s*:|"timeStr"\s*:/.test(s);
}
