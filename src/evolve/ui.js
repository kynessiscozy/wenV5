/* ============================================================
   问问大师 · 自进化界面
   ------------------------------------------------------------
   设置面板里的开关 / 代数 / 仪表盘；聊天顶栏代数徽章。
   ============================================================ */

import { showToast } from '../ui/toast.js';
import {
  onEvolveChange, getEvolveSnapshot, setEvolveEnabled,
  exportEvolve, wipeEvolve, initEvolve
} from './index.js';
import { TONE_KEYS, TONE_LABEL, TONE_HINT } from './genome.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---- 仪表盘：常问主题分布 ---- */
function renderTopicBars(topics) {
  const entries = Object.entries(topics || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!entries.length) return '<div class="evolve-empty">还没有足够的数据</div>';
  const max = entries[0][1];
  return entries.map(([k, v]) => {
    const pct = Math.round((v / max) * 100);
    return `<div class="evo-bar-row">
      <span class="evo-bar-label">${esc(k)}</span>
      <div class="evo-bar-track"><div class="evo-bar-fill" style="width:${pct}%"></div></div>
      <span class="evo-bar-val">${v}</span>
    </div>`;
  }).join('');
}

/* ---- 仪表盘：语气偏好雷达 ---- */
function renderToneBars(tone) {
  const t = tone || {};
  return TONE_KEYS.map(k => {
    const val = Math.round((t[k] || 0) * 100);
    return `<div class="evo-bar-row">
      <span class="evo-bar-label">${TONE_LABEL[k]}</span>
      <div class="evo-bar-track"><div class="evo-bar-fill evo-bar-tone" style="width:${val}%"></div></div>
      <span class="evo-bar-val">${val}%</span>
    </div>`;
  }).join('');
}

/* ---- 仪表盘：学到的课 ---- */
function renderLessons(lessons) {
  const list = (lessons || []).slice(0, 3);
  if (!list.length) return '';
  return list.map(l => `<div class="evo-lesson"><span class="evo-lesson-dot"></span>${esc(l.text)}</div>`).join('');
}

/* ---- 仪表盘：来源分布 ---- */
function renderSourceStats(st) {
  const items = [
    { k: 'AI 回答', v: st.aiHits || 0, cls: 'ai' },
    { k: '本地知识', v: st.kbHits || 0, cls: 'kb' },
    { k: '个人记忆', v: st.personalHits || 0, cls: 'personal' },
    { k: '离线兜底', v: st.fallbackHits || 0, cls: 'fallback' }
  ];
  const total = items.reduce((s, x) => s + x.v, 0) || 1;
  return items.map(x => {
    const pct = Math.round((x.v / total) * 100);
    return `<div class="evo-src-row">
      <span class="evo-src-label">${x.k}</span>
      <div class="evo-bar-track"><div class="evo-bar-fill evo-src-${x.cls}" style="width:${Math.max(pct, 2)}%"></div></div>
      <span class="evo-bar-val">${x.v}</span>
    </div>`;
  }).join('');
}

function renderBody(snap) {
  const gen = snap.generation || 0;
  const st = snap.stats || {};
  const hasData = gen >= 1 || (st.asks || 0) > 0;
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

    ${hasData ? `
    <div class="evo-dash">
      <div class="evo-dash-section">
        <div class="evo-dash-title">常问主题</div>
        ${renderTopicBars(snap.topics)}
      </div>
      <div class="evo-dash-section">
        <div class="evo-dash-title">语气偏好</div>
        ${renderToneBars(snap.tone)}
      </div>
      <div class="evo-dash-section">
        <div class="evo-dash-title">回答来源</div>
        ${renderSourceStats(st)}
      </div>
      ${renderLessons(snap.lessons) ? `
      <div class="evo-dash-section">
        <div class="evo-dash-title">学到了什么</div>
        ${renderLessons(snap.lessons)}
      </div>` : ''}
    </div>
    <div class="evolve-note">
      ${gen < 1
        ? '多问几次、点「有用」或「不准」，问问会慢慢更懂你。记忆只存在这台设备。'
        : '问问正在根据你的反馈调整回答方式。记忆只存在这台设备，不上传。'}
    </div>
    ` : `
    <div class="evolve-note">
      多问几次、点「有用」或「不准」，问问会慢慢更懂你。记忆只存在这台设备。
    </div>
    `}

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
