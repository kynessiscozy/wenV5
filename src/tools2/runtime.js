/* ============================================================
   tools2 · 工具运行时
   ------------------------------------------------------------
   全新工具系统：每个工具注册后由 openTool/closeTool 统一调度。
   所有工具使用 tw- 前缀类名与独立视觉，彻底脱离旧 tj-tool-v3
   统一模板。保留旧全局入口 openToolPage / closeToolPage 兼容。
   ============================================================ */
import { attachToolAI } from './ai-insight.js';
export { attachToolAI };

const TOOLS = new Map();
let _current = null;        // 当前打开的 tool id
let _cleanup = null;        // 当前工具的卸载回调

/* —— 注册 / 查询 —— */
export function register(tool) {
  if (!tool || !tool.id) return;
  TOOLS.set(tool.id, tool);
}
export function getTool(id) { return TOOLS.get(id) || null; }
export function listTools() { return [...TOOLS.values()]; }

/* —— 历史记录（localStorage） —— */
const HIST_KEY = 'tj_tool_history_v3';
function readHistory() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); }
  catch (e) { return []; }
}
function saveHistory(id) {
  try {
    const t = TOOLS.get(id);
    if (!t) return;
    const list = readHistory().filter(x => x.type !== id);
    list.unshift({ type: id, title: t.name, cat: t.cat, at: Date.now() });
    localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 8)));
  } catch (e) {}
}

/* —— 打开工具 —— */
export function openTool(id) {
  const tool = TOOLS.get(id);
  if (!tool) return;
  const modal = document.getElementById('toolModal');
  const content = document.getElementById('toolModalContent');
  if (!modal || !content) return;

  if (_cleanup) { try { _cleanup(); } catch (e) {} _cleanup = null; }

  _current = id;
  window._activeTool = id;

  // 容器切换到杂志风
  content.className = 'tw-content tw-tool-' + id;
  modal.classList.add('open');
  const sheet = modal.querySelector('.tool-sheet');
  if (sheet) { sheet.classList.remove('result-open'); sheet.scrollTop = 0; }

  // 调用工具自身的渲染，返回可选卸载回调
  try {
    const ret = tool.open(content);
    if (typeof ret === 'function') _cleanup = ret;
  } catch (e) {
    console.error('[tools2] 工具打开失败:', id, e);
    content.innerHTML = '<div class="tw-error">工具加载失败，请刷新页面重试。</div>';
  }

  saveHistory(id);
  setTimeout(() => {
    const first = content.querySelector('input, select, textarea, button');
    if (first && first.focus && !first.disabled) first.focus({ preventScroll: true });
  }, 140);
}

/* —— 关闭工具 —— */
export function closeTool() {
  const modal = document.getElementById('toolModal');
  const content = document.getElementById('toolModalContent');
  if (content) content.className = '';
  if (modal) {
    modal.classList.remove('open');
    modal.querySelector('.tool-sheet')?.classList.remove('result-open');
  }
  if (_cleanup) { try { _cleanup(); } catch (e) {} _cleanup = null; }
  if (_barScrollCleanup) { _barScrollCleanup(); _barScrollCleanup = null; }
  _current = null;
  window._activeTool = null;
  // 兼容 AI 发起工具时的返回链
  if (window._returnToAI) {
    window._returnToAI = false;
    setTimeout(() => { if (typeof window.openAsk === 'function') window.openAsk(); }, 140);
  }
}

/* —— 历史记录 HTML（工具输入页底部） —— */
export function historyStrip() {
  const list = readHistory();
  if (!list.length) return '';
  return '<div class="tw-history">' +
    '<div class="tw-history-tt">最近使用</div>' +
    '<div class="tw-history-row">' +
    list.slice(0, 5).map(x =>
      '<button type="button" class="tw-history-chip" data-open="' + x.type + '">' +
      esc(x.title) + '</button>').join('') +
    '</div></div>';
}
export function bindHistory(root) {
  root.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => openTool(btn.dataset.open));
  });
}

/* —— 工具标题条（各工具顶部共用，可选用） —— */
export function masthead(tool, opts = {}) {
  const { step, sub } = opts;
  return '<header class="tw-mast">' +
    '<div class="tw-mast-top">' +
      '<span class="tw-mast-cat">' + esc(tool.cat) + '</span>' +
      (step ? '<span class="tw-mast-step">' + esc(step) + '</span>' : '') +
    '</div>' +
    '<h2 class="tw-mast-title">' + esc(tool.name) + '</h2>' +
    (sub ? '<p class="tw-mast-sub">' + esc(sub) + '</p>' : '') +
  '</header>';
}

/* —— 工具说明行 —— */
export function notice(text) {
  return '<div class="tw-note">' + text + '</div>';
}

/* ============================================================
   二级结果页支持
   ------------------------------------------------------------
   需要「输入 → 生成结果」流程的工具，用 viewShell 包裹：
     <div class="tw-view">
       <div class="tw-view-form"> 表单区 </div>
       <div class="tw-view-result"> 结果区（默认隐藏）</div>
     </div>
   进入结果视图：goResult(container, toolName, innerHtml)
   返回表单视图：goForm(container)，输入内容保留（未重建）。
   ============================================================ */
export function viewShell(formHtml) {
  return '<div class="tw-view">' +
    '<div class="tw-view-form">' + formHtml + '</div>' +
    '<div class="tw-view-result" aria-live="polite"></div>' +
  '</div>';
}

let _barScrollCleanup = null;

export function goResult(container, toolName, innerHtml) {
  const view = container.querySelector('.tw-view');
  if (!view) return;
  const form = view.querySelector('.tw-view-form');
  const result = view.querySelector('.tw-view-result');
  // 顶部返回条 + 主体 + 底部操作
  result.innerHTML =
    '<div class="tw-result-page">' +
      '<header class="tw-result-bar">' +
        '<button type="button" class="tw-result-back" data-gofrom aria-label="返回修改" title="返回修改">‹</button>' +
        '<div class="tw-result-meta">' +
          '<span class="tw-result-kicker">RESULT · 结果页</span>' +
          '<span class="tw-result-bar-title">' + esc(toolName || '结果') + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="tw-result-page-body">' + innerHtml + '</div>' +
      '<footer class="tw-result-ops">' +
        '<button type="button" class="tw-btn tw-btn-ghost" data-gofrom>重新填写</button>' +
        '<button type="button" class="tw-btn tw-btn-primary" data-close>完成</button>' +
      '</footer>' +
    '</div>';
  form.classList.add('tw-view-hidden');
  result.classList.remove('tw-view-hidden');
  result.scrollTop = 0;
  const page = result.querySelector('.tw-result-page');
  if (page) requestAnimationFrame(() => page.classList.add('tw-page-in'));

  result.querySelectorAll('[data-gofrom]').forEach(b => b.addEventListener('click', () => goForm(container)));
  result.querySelector('[data-close]')?.addEventListener('click', () => closeTool());

  /* —— 全面接入 AI：每个结果页底部统一挂「AI 解读」 —— */
  const footer = result.querySelector('.tw-result-ops');
  if (footer) {
    attachToolAI({
      root: result,
      typeLabel: toolName,
      getSource: () => (result.querySelector('.tw-result-page-body')?.innerText || '').slice(0, 1800),
      slot: footer,
    });
  }

  /* 返回栏图层：仅当内容滚动遮挡到返回栏下方时才出现 */
  if (_barScrollCleanup) { _barScrollCleanup(); _barScrollCleanup = null; }
  const sheet = container.closest('.tool-sheet');
  const bar = result.querySelector('.tw-result-bar');
  if (sheet && bar) {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        bar.classList.toggle('tw-bar-scrolled', sheet.scrollTop > 10);
      });
    };
    sheet.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    _barScrollCleanup = () => {
      sheet.removeEventListener('scroll', onScroll);
      bar.classList.remove('tw-bar-scrolled');
    };
  }
  return result;
}

export function goForm(container) {
  const view = container.querySelector('.tw-view');
  if (!view) return;
  const form = view.querySelector('.tw-view-form');
  const result = view.querySelector('.tw-view-result');
  result.classList.add('tw-view-hidden');
  result.innerHTML = '';
  form.classList.remove('tw-view-hidden');
  if (_barScrollCleanup) { _barScrollCleanup(); _barScrollCleanup = null; }
  const first = form.querySelector('input, select, textarea, button');
  if (first && first.focus) first.focus({ preventScroll: true });
}

/* —— 结果页内的滚动提示（合盘等长结果） —— */
export function backTopBtn() {
  return '<button type="button" class="tw-back-top" data-gofrom aria-label="返回顶部" style="display:none">↑</button>';
}

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* —— 旧入口兼容（由 index.js 覆盖） —— */
export function installGlobal() {
  window.openToolPage = function (type) { openTool(type); };
  window.closeToolPage = function () { closeTool(); };
}
