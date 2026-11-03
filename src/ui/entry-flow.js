/* 漏斗单一入口的交互状态机。
 *
 * funnel.html 是唯一入口，也是唯一的填表互动；主应用内的旧表单与特质
 * 老虎机已彻底移除，出生信息只剩两条数据通道：
 *   1. 漏斗问卷的一次性交接（wen_funnel_v1，未 applied 时）
 *   2. 档案载入（wen_load_profile_v1 / 档案库点选）
 * 两条通道都直接把数据交给 calc()，不再经过任何表单 DOM。
 *
 * 所有跨层切换只经过这里的一个 surface 状态：
 *
 *   boot ──app-ready──▶ intent | profile | handoff | idle
 *   handoff/profile ──calc──▶ calculating ──ok──▶ report
 *        └────────────────失败──▶ idle / report（已有报告时）
 *   idle = 兜底入口卡（永远不会是空白屏；主按钮回漏斗页填写）
 *   report ──重新推演──▶ funnel.html（整页离开，不在本页重开表单）
 *
 * 主应用通过 window.__wenFlow 的显式回调报告状态变化，不再由定时器反查 DOM。
 * 唯一保留的定时器是交接的兜底超时：任何异常 20 秒后揭开遮罩并给出可操作界面。
 */

import { focusSafely } from './focus.js';
import {
  PANEL_ACTIONS, PAYLOAD_KEY, PROFILE_KEY,
  isPendingPayload, markApplied, planEntry,
} from './entry-plan.js';
import { personaFor } from './entry-personas.js';
import { goToFunnel } from './funnel-link.js';

const VEIL_ID = 'funnelVeil';
const FALLBACK_ID = 'entryFallback';
const HANDOFF_TIMEOUT_MS = 20000;
const VEIL_FADE_MS = 420;

let surface = 'boot';           // boot | idle | calculating | report
let teaserOpen = false;
let handoffActive = false;
let handoffTimer = null;
let appReady = false;
let failed = false;
let fallback = null;
let statusMessage = '';

/* ------------------------------ storage ------------------------------ */

function readPayload() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PAYLOAD_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) { return null; }
}
function writePayload(payload) {
  try { localStorage.setItem(PAYLOAD_KEY, JSON.stringify(payload)); } catch (_) {}
}
function readProfileId() {
  try { return localStorage.getItem(PROFILE_KEY); } catch (_) { return null; }
}
function removeProfileId() {
  try { localStorage.removeItem(PROFILE_KEY); } catch (_) {}
}
function bumpStat(key) {
  try {
    const stats = JSON.parse(localStorage.getItem('wen_funnel_stats_v1') || '{}');
    stats[key] = (stats[key] || 0) + 1;
    localStorage.setItem('wen_funnel_stats_v1', JSON.stringify(stats));
  } catch (_) {}
}

/* --------------------------- visible surfaces --------------------------- */

function ensureFallback() {
  if (fallback) return fallback;
  const el = document.createElement('div');
  el.id = FALLBACK_ID;
  el.className = 'entry-fallback';
  el.hidden = true;
  el.innerHTML = `
    <div class="ef-card" role="main" aria-label="开始推演">
      <p class="ef-kicker">问 问 大 师</p>
      <h1 class="ef-title">从出生信息开始</h1>
      <p class="ef-desc"></p>
      <button class="ef-btn ef-primary" type="button"><span>填写出生信息</span><span aria-hidden="true">→</span></button>
      <button class="ef-btn ef-ghost ef-retry" type="button" hidden>重新加载</button>
      <div class="ef-links">
        <button type="button" data-panel="guide">使用指南</button>
        <button type="button" data-panel="about">关于问问大师</button>
        <button type="button" data-panel="disclaimer">免责声明</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  fallback = el;

  // 填写动作只发生在漏斗页；这里不再打开任何本页表单。
  el.querySelector('.ef-primary').addEventListener('click', goToFunnel);
  el.querySelector('.ef-retry').addEventListener('click', () => location.reload());
  el.querySelectorAll('[data-panel]').forEach(button => {
    button.addEventListener('click', () => {
      const fn = PANEL_ACTIONS[button.dataset.panel];
      if (fn && typeof window[fn] === 'function') window[fn]();
    });
  });
  return el;
}

function showFallback(message, loadFailed) {
  const el = ensureFallback();
  if (typeof message === 'string') statusMessage = message;
  if (typeof loadFailed === 'boolean') failed = loadFailed;
  el.querySelector('.ef-desc').textContent = statusMessage ||
    '回入口页回答几个小问题，即可生成一份完整的命盘报告。';
  const isFailed = typeof loadFailed === 'boolean' ? loadFailed : failed;
  el.querySelector('.ef-primary').disabled = isFailed;
  el.querySelector('.ef-retry').hidden = !isFailed;
  el.hidden = false;
}

function hideFallback() {
  if (fallback) fallback.hidden = true;
}

/** One rule decides whether the base surface is visible. No DOM guessing. */
function sync() {
  const busy = surface === 'calculating' || surface === 'report' || teaserOpen;
  if (busy) hideFallback();
  else showFallback();
}

function focusTarget() {
  if (surface === 'report') return document.getElementById('p2MenuBtn');
  if (!fallback?.hidden) {
    return failed ? fallback.querySelector('.ef-retry') : fallback.querySelector('.ef-primary');
  }
  return null;
}

/* ------------------------------- veil -------------------------------- */

function paintVeil(persona) {
  const veil = document.getElementById(VEIL_ID);
  if (!veil) return;
  const portrait = veil.querySelector('[data-veil-portrait]');
  const line = veil.querySelector('[data-veil-line]');
  if (portrait) portrait.src = persona.poster;
  if (line) line.textContent = persona.byline;
}

function removeVeil() {
  document.documentElement.dataset.handoff = 'done';
  const veil = document.getElementById(VEIL_ID);
  if (!veil || veil.dataset.leaving) return;
  veil.dataset.leaving = '1';
  veil.classList.add('is-leaving');
  setTimeout(() => veil.remove(), VEIL_FADE_MS);
}

/* ---------------------------- transitions ---------------------------- */

function restoreReport() {
  if (typeof window.showPage2 === 'function') window.showPage2();
  surface = 'report';
  sync();
  focusSafely(document.getElementById('p2MenuBtn'));
}

function startHandoff(payload) {
  handoffActive = true;
  paintVeil(personaFor(payload.trait));
  // Consume immediately: a refresh or a failed module load must never replay
  // this questionnaire as an automatic calculation.
  writePayload(markApplied(payload));
  const result = window.applyEntryPayload?.(payload);
  if (result?.warning) console.info('[entry]', result.warning);
  bumpStat('app_arrive');
  clearTimeout(handoffTimer);
  handoffTimer = setTimeout(() => {
    handoffActive = false;
    removeVeil();
    surface = document.body.classList.contains('report-active') ? 'report' : 'idle';
    sync();
    showFallback('推演还没完成，可以回入口页重新填写，再试一次。');
  }, HANDOFF_TIMEOUT_MS);
  window.calc?.();
}

function onReady() {
  if (appReady) return;
  appReady = true;
  const intent = window.__wenEntryIntent || {};
  const payload = readPayload();
  const profileId = readProfileId();
  const plan = planEntry({ intent, payload, profileId, appReady: true });

  if (plan.consumePayload && isPendingPayload(payload)) writePayload(markApplied(payload));

  switch (plan.type) {
    case 'intent': {
      surface = 'idle';
      sync();
      if (plan.menu) window.toggleHomeMenu?.(true);
      if (plan.panel) window[PANEL_ACTIONS[plan.panel]]?.();
      break;
    }
    case 'profile': {
      surface = 'calculating';
      sync();
      removeProfileId();
      // IndexedDB opens asynchronously; loadProfile() is only useful once the
      // profile store is ready. main.js exposes that single promise.
      Promise.resolve(window.__wenProfilesReady).catch(() => {}).then(() => {
        window.loadProfile?.(plan.id);
      });
      break;
    }
    case 'handoff': {
      startHandoff(plan.payload);
      break;
    }
    default: {
      surface = 'idle';
      sync();
    }
  }
}

/* --------------------------- public callbacks --------------------------- */

export function initEntryFlow() {
  if (window.__wenFlow) return window.__wenFlow;

  const api = {
    get state() { return surface; },
    isAutoAdvance: () => handoffActive,
    focusTarget,

    onCalcStart() {
      surface = 'calculating';
      sync();
    },
    onReportReady() {
      clearTimeout(handoffTimer);
      handoffActive = false;
      removeVeil();
      surface = 'report';
      sync();
    },
    onCalcFailed() {
      clearTimeout(handoffTimer);
      handoffActive = false;
      removeVeil();
      // Keep an already visible report; otherwise return to the idle card.
      if (document.body.classList.contains('report-active')) { restoreReport(); return; }
      surface = 'idle';
      sync();
    },
    onTeaserOpen() { teaserOpen = true; sync(); },
    onTeaserClosed() { teaserOpen = false; removeVeil(); sync(); },
    onMenuToggle(open) { if (open) hideFallback(); else sync(); },
    onAppLoadFailed() {
      clearTimeout(handoffTimer);
      handoffActive = false;
      removeVeil();
      surface = 'idle';
      showFallback('应用加载失败，请检查网络后重新加载。', true);
      focusSafely(fallback?.querySelector('.ef-retry'));
    },
  };

  window.__wenFlow = api;
  ensureFallback();
  sync();
  if (window.__wenAppReady) queueMicrotask(onReady);
  else window.addEventListener('tj:app-ready', onReady, { once: true });
  return api;
}
