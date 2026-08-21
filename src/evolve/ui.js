/* ============================================================
   问问大师 · 自进化界面
   ------------------------------------------------------------
   设置面板里的开关 / 代数 / 记忆；聊天顶栏代数徽章。
   ============================================================ */

import { showToast } from '../ui/toast.js';
import {
  onEvolveChange, getEvolveSnapshot, setEvolveEnabled,
  exportEvolve, wipeEvolve, initEvolve
} from './index.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderBody(snap) {
  const topics = Object.entries(snap.topics || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const lesson = (snap.lessons && snap.lessons[0] && snap.lessons[0].text) || '';
  const gen = snap.generation || 0;
  const st = snap.stats || {};
  return `
    <label class="ai-setting-row">
      <span>记住我的偏好</span>
      <input id="evolveEnabled" type="checkbox" ${snap.enabled ? 'checked' : ''}>
    </label>
    <div class="evolve-stats">
      <div class="evolve-stat"><b>${gen}</b><span>代</span></div>
      <div class="evolve-stat"><b>${st.asks || 0}</b><span>问答</span></div>
      <div class="evolve-stat"><b>${st.up || 0}</b><span>有用</span></div>
      <div class="evolve-stat"><b>${snap.knowledgeCount || 0}</b><span>记得</span></div>
    </div>
    <div class="evolve-note">
      ${gen < 1
        ? '多问几次、点「有用」或「不准」，问问会慢慢更懂你。记忆只存在这台设备。'
        : (topics.length ? '近期关注：' + topics.map(([k]) => esc(k)).join('、') + '。' : '已经开始记住你的提问节奏。')
          + (lesson ? '<br>' + esc(lesson) : '')}
    </div>
    <div class="evolve-actions">
      <button type="button" class="ai-key-action" id="evolveExport">导出记忆</button>
      <button type="button" class="ai-key-action danger" id="evolveWipe">清空</button>
    </div>
  `;
}

function bind(section, snap) {
  const sw = section.querySelector('#evolveEnabled');
  if (sw) sw.addEventListener('change', async () => {
    await setEvolveEnabled(sw.checked);
    showToast(sw.checked ? '自进化已开启' : '自进化已关闭');
  });
  section.querySelector('#evolveExport')?.addEventListener('click', async () => {
    try {
      const data = await exportEvolve();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '问问大师_自进化记忆_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('已导出本地记忆');
    } catch (e) {
      showToast('导出失败');
    }
  });
  section.querySelector('#evolveWipe')?.addEventListener('click', () => {
    if (typeof window.showConfirm === 'function') {
      window.showConfirm({
        title: '清空自进化记忆',
        text: '会忘掉代数、偏好和个人知识，不影响命盘档案。此操作不可恢复。',
        okText: '清空',
        cancelText: '取消',
        onOk: async () => {
          await wipeEvolve();
          showToast('已清空本地记忆');
        }
      });
    } else if (confirm('清空自进化记忆？不影响命盘档案。')) {
      wipeEvolve().then(() => showToast('已清空本地记忆'));
    }
  });
}

export function mountEvolveSettings(panel) {
  if (!panel || panel.querySelector('#evolveSection')) return;
  const snap = getEvolveSnapshot();
  const section = document.createElement('div');
  section.className = 'ai-setting-section evolve-section';
  section.id = 'evolveSection';
  section.innerHTML = `<div class="ai-setting-section-title">自进化</div>` + renderBody(snap);
  const note = panel.querySelector('.ai-settings-note');
  if (note) panel.insertBefore(section, note);
  else panel.appendChild(section);
  bind(section, snap);

  onEvolveChange(next => {
    const el = document.getElementById('evolveSection');
    if (!el) return;
    const title = el.querySelector('.ai-setting-section-title');
    el.innerHTML = (title ? title.outerHTML : '<div class="ai-setting-section-title">自进化</div>') + renderBody(next);
    bind(el, next);
  });
}

function ensureBadge() {
  let badge = document.getElementById('evolveGenBadge');
  if (badge) return badge;
  const title = document.querySelector('#aiSheet .ai-title');
  if (!title) return null;
  badge = document.createElement('span');
  badge.id = 'evolveGenBadge';
  badge.className = 'evolve-gen';
  badge.hidden = true;
  title.appendChild(badge);
  return badge;
}

function paintBadge(snap) {
  const badge = ensureBadge();
  if (!badge) return;
  const gen = snap.generation || 0;
  if (!snap.enabled || gen < 1) {
    badge.hidden = true;
    badge.textContent = '';
    return;
  }
  badge.hidden = false;
  badge.textContent = '第' + gen + '代';
  badge.title = '问问已根据你的反馈进化到第' + gen + '代，记忆只存在这台设备';
}

let _lastGen = -1;

export function initEvolveUI() {
  onEvolveChange(snap => {
    paintBadge(snap);
    if (snap.generation > _lastGen && _lastGen >= 0 && snap.generation > 0) {
      showToast('问问又懂你一点了 · 第' + snap.generation + '代');
    }
    _lastGen = snap.generation || 0;
  });
  initEvolve().catch(() => {});
}
