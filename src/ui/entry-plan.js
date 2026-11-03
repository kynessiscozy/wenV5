/* 入口决策：纯函数，不碰 DOM / localStorage，方便离线单测。
 *
 * 之前 index.html 里有三段各自 setInterval 轮询的内联脚本，谁先抢到
 * window.TJOpenForm 谁就决定打开什么，导致「漏斗交接 / 档案载入 / 菜单跳转 /
 * 普通访客」四种意图互相打架。现在只保留一个决策点，并且有明确优先级：
 *
 *   1. 显式深链意图（?menu=1 / ?panel=guide|about|disclaimer）
 *   2. 从漏斗菜单点选的命盘档案（wen_load_profile_v1）
 *   3. 一次性的漏斗交接（wen_funnel_v1，问卷答案尚未 applied）
 *   4. 默认：显示待机入口卡（由访客显式点「填写出生信息」再开表单）
 *
 * 高级意图会「消费」尚未执行的交接，避免残留的问卷数据在下一次访问时
 * 突然自动提交；只有真实问卷交接的推演可以展示该问卷的预告，
 * 档案和手动推演不会复用旧问卷预告。
 */

export const PAYLOAD_KEY = 'wen_funnel_v1';
export const PROFILE_KEY = 'wen_load_profile_v1';

export const PANEL_ACTIONS = Object.freeze({
  guide: 'openNoviceGuide',
  about: 'openAboutModal',
  disclaimer: 'openDisclaimerModal',
});

export function isPendingPayload(payload) {
  return !!(payload && !payload.applied && typeof payload.bd === 'string' && payload.bd);
}

/** A one-shot handoff must never run twice, even if the app fails to load. */
export function markApplied(payload) {
  return { ...payload, applied: 1 };
}

export function planEntry({ intent = {}, payload = null, profileId = null, appReady = false } = {}) {
  if (!appReady) return { type: 'wait' };

  const pending = isPendingPayload(payload);
  const panel = Object.prototype.hasOwnProperty.call(PANEL_ACTIONS, intent.panel) ? intent.panel : null;

  if (intent.menu || panel) {
    return { type: 'intent', menu: !!intent.menu, panel, consumePayload: pending };
  }

  const id = Number(profileId);
  if (profileId !== null && Number.isFinite(id) && id > 0) {
    return { type: 'profile', id, consumePayload: pending };
  }

  if (pending) return { type: 'handoff', payload };
  return { type: 'idle' };
}
