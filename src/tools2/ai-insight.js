/* ============================================================
   tools2 · 工具 AI 解读挂载
   ------------------------------------------------------------
   为任意工具结果区挂载「AI 解读」能力：在指定挂载点插入按钮，
   点击后结合用户命盘调用 askToolInsight，输出主题化解读卡片。
   设计要点：
   - 幂等：同一挂载点已存在按钮则跳过（兼容交互式工具反复重渲染）。
   - 实时：getSource 在点击时读取当前 DOM，始终反映最新结果。
   - 容错：无密钥 / 失败均给出友好提示，不阻断工具本身。
   ============================================================ */
import { askToolInsight } from '../ai/index.js';
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

/**
 * @param {object} o
 * @param {HTMLElement} o.root   工具容器（用于定位结果文本）
 * @param {string}      o.typeLabel 工具名（用于 AI 提示词）
 * @param {() => string} o.getSource 返回当前结果文本（实时读取 DOM）
 * @param {HTMLElement} [o.slot] 放置 AI 按钮的容器；不传则追加到 root
 */
export function attachToolAI({ root, typeLabel, getSource, slot }) {
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
      const answer = await askToolInsight({
        apiKey: key,
        typeLabel,
        source: ((getSource ? getSource() : (root.innerText || '')).slice(0, 1800)),
        chartSummary: chartSummary(),
      });
      box.innerHTML =
        '<div class="tw-ai-head">✦ AI 解读</div>' +
        '<div class="tw-ai-text">' + escapeHtml(answer) + '</div>';
      btn.remove();
    } catch (e) {
      box.innerHTML = '<div class="tw-ai-err">AI 暂时无法连接，请检查网络或「AI 设置」后重试。</div>';
      btn.disabled = false;
      btn.textContent = label0;
    }
  });
}
