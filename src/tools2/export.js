/* ============================================================
   tools2 · 报告完整导出 PDF 工具
   ------------------------------------------------------------
   使用浏览器原生 print 引擎导出 PDF，无需外部库。
   - 自动注入打印样式表，隐藏 UI、保留报告内容
   - 支持视觉完整版（保留卡片样式）和纯文本版（精简）
   - 分页控制：每张卡片不跨页断裂
   ============================================================ */

import { showToast } from '../ui/toast.js';

/* 打印样式表 ID，用于注入和清理 */
const PRINT_STYLE_ID = 'tw-print-pdf-style';
const PRINT_CLS = 'tw-printing';

/**
 * 构建打印样式表
 * @param {'visual'|'text'} mode
 */
function buildPrintCSS(mode) {
  const isText = mode === 'text';

  return `
@media print {
  /* ===== 隐藏所有 UI 壳，只保留报告 ===== */
  .mesh, .tab-bar, .p2-top, .ld-ov, .ai-overlay, .ai-sheet,
  .modal, .toast, .tools-toolbar, .tool-search, .tool-filter,
  .nav-back, .p2-fab, .floating-btns, .fab-stack,
  #page1, #toolModal, .tw-tool-export,
  .sec-plain > .close-btn, .qr-close,
  button[class*="close"], .modal-close,
  .tj-sign-actions, .tj-result-actions,
  .tw-export-btn, .tw-history-placeholder {
    display: none !important;
  }

  /* ===== 重置页面布局 ===== */
  @page {
    size: A4 portrait;
    margin: 14mm 12mm 16mm 12mm;
  }

  html, body {
    background: #ffffff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  #page2 {
    position: static !important;
    transform: none !important;
    opacity: 1 !important;
    display: block !important;
    width: 100% !important;
  }

  .p2-scroll {
    overflow: visible !important;
    padding: 0 !important;
    max-height: none !important;
    height: auto !important;
  }

  .p2-inner {
    padding: 0 !important;
    max-width: none !important;
    width: 100% !important;
  }

  /* ===== 强制浅色主题（深色主题打印效果差） ===== */
  :root, [data-theme="dark"], [data-theme="auto"] {
    --c-bg: #ffffff !important;
    --c-surface: #faf9f5 !important;
    --c-surface-2: #f3f1ec !important;
    --c-text-hi: #1a1a1a !important;
    --c-text: #333333 !important;
    --c-text-3: #666666 !important;
    --c-text-4: #999999 !important;
    --c-border: #e0ddd6 !important;
    --ac-text: #b85d3a !important;
    --ac2: #f5ede4 !important;
    --ac4: #d97757 !important;
    background: #ffffff !important;
    color: #1a1a1a !important;
  }

  /* ===== 卡片：避免分页断裂 ===== */
  .glass, .card-1, .card-2, .card-3,
  .beginner-brief, .qr-card, .tl-card {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: 1px solid #e0ddd6 !important;
    margin-bottom: 12px !important;
    border-radius: 8px !important;
    background: #faf9f5 !important;
  }

  /* 每个大分区之间允许分页 */
  .sec {
    break-after: auto;
  }

  /* ===== 视觉模式：保留颜色 ===== */
  ${!isText ? '' : `
  /* ===== 纯文本模式：移除装饰、只留文字 ===== */
  .glass, .card-1, .card-2, .card-3,
  .beginner-brief, .qr-card {
    background: #ffffff !important;
    border: 1px solid #ccc !important;
    box-shadow: none !important;
  }
  .card-ic, .card-ic svg, .tool-icon, .tool-icon svg,
  .qr-icon, .tj-oracle-stage, .tj-oracle-scene,
  .answer-book-cover, .tw-mast-top,
  .tj-score, .sg-up, .sg-down, .sg-mid,
  .demo-report-note span,
  .canvas-chart, .fx-canvas, .ti-anim,
  .gradient-bg, .mesh-bg {
    display: none !important;
  }
  .card-hd {
    border-bottom: 1px solid #ddd !important;
    padding: 8px 12px !important;
  }
  .card-tt {
    font-size: 14pt !important;
    font-weight: 700 !important;
    color: #1a1a1a !important;
  }
  .card-st {
    color: #666 !important;
    font-size: 10pt !important;
  }
  /* 展开所有折叠卡片 */
  .glass[data-card] .card-body,
  .glass[data-collapsible] .card-body {
    max-height: none !important;
    overflow: visible !important;
    display: block !important;
  }
  .glass.collapsed .card-body {
    display: block !important;
  }
  `}

  /* ===== 打印头部 ===== */
  .tw-print-header {
    display: block !important;
    text-align: center;
    padding-bottom: 8px;
    border-bottom: 2px solid #d97757;
    margin-bottom: 16px;
  }
  .tw-print-header h1 {
    font-size: 18pt;
    font-weight: 700;
    margin: 0 0 4px 0;
    color: #1a1a1a;
  }
  .tw-print-header p {
    font-size: 10pt;
    color: #666;
    margin: 0;
  }

  /* ===== 打印页脚（CSS @page 无法动态写页码，用浏览器自带） ===== */
  .tw-print-footer {
    display: block !important;
    text-align: center;
    padding-top: 12px;
    margin-top: 20px;
    border-top: 1px solid #e0ddd6;
    font-size: 8pt;
    color: #999;
  }
}

/* 仅在打印时显示的元素 */
.tw-print-header, .tw-print-footer {
  display: none;
}
`;
}

/**
 * 注入打印样式表和页眉页脚
 */
function injectPrintAssets(mode) {
  // 移除旧的
  removePrintAssets();

  // 注入样式表
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = buildPrintCSS(mode);
  document.head.appendChild(style);

  // 注入页眉
  const header = document.createElement('div');
  header.className = 'tw-print-header';
  header.innerHTML = `
    <h1>问问大师 · 完整命理报告</h1>
    <p>${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} · 基于当前推演结果</p>
  `;

  // 注入页脚
  const footer = document.createElement('div');
  footer.className = 'tw-print-footer';
  footer.textContent = '本报告仅供自我整理与行动参考，不构成投资、医疗、法律或职业决策依据。';

  const container = getReportContainer();
  if (container) {
    container.insertBefore(header, container.firstChild);
    container.appendChild(footer);
  }

  document.body.classList.add(PRINT_CLS);
}

/**
 * 移除打印样式表和页眉页脚
 */
function removePrintAssets() {
  document.getElementById(PRINT_STYLE_ID)?.remove();
  document.querySelectorAll('.tw-print-header, .tw-print-footer').forEach(el => el.remove());
  document.body.classList.remove(PRINT_CLS);
}

/**
 * 获取报告容器
 */
function getReportContainer() {
  return document.getElementById('p2Inner') || document.querySelector('#page2 .p2-inner') || document.querySelector('#page2');
}

/**
 * 展开所有折叠卡片，确保完整内容可见
 */
function expandAllCards() {
  document.querySelectorAll('#page2 .glass.collapsed, #page2 [data-collapsible].collapsed').forEach(el => {
    el.classList.remove('collapsed');
    el.classList.add('was-collapsed');
    const body = el.querySelector('.card-body');
    if (body) {
      body.style.maxHeight = 'none';
      body.style.overflow = 'visible';
    }
  });
}

/**
 * 恢复折叠状态
 */
function restoreCollapsedCards() {
  document.querySelectorAll('#page2 .was-collapsed').forEach(el => {
    el.classList.add('collapsed');
    el.classList.remove('was-collapsed');
    const body = el.querySelector('.card-body');
    if (body) {
      body.style.maxHeight = '';
      body.style.overflow = '';
    }
  });
}

/**
 * 导出 PDF（通过浏览器打印对话框）
 * @param {'visual'|'text'} mode
 */
async function exportPDF(mode = 'visual') {
  const container = getReportContainer();
  if (!container) {
    showToast('请先完成推演，生成报告后再导出');
    return;
  }

  const btns = document.querySelectorAll('.tw-export-btn, [data-export-pdf]');
  const originalTexts = new Map();
  btns.forEach(b => {
    originalTexts.set(b, b.textContent);
    b.disabled = true;
    b.textContent = '正在准备打印...';
  });

  try {
    // 1. 展开所有折叠卡片
    expandAllCards();

    // 2. 注入打印样式和页眉页脚
    injectPrintAssets(mode);

    // 3. 等待浏览器重绘
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // 4. 调用打印
    showToast(mode === 'text' ? '正在打开纯文本版打印...' : '正在打开视觉完整版打印...');

    // 监听打印结束
    const afterPrint = () => {
      window.removeEventListener('afterprint', afterPrint);
      cleanup();
    };
    window.addEventListener('afterprint', afterPrint);

    // 超时兜底（某些浏览器不触发 afterprint）
    setTimeout(() => {
      if (document.getElementById(PRINT_STYLE_ID)) {
        cleanup();
      }
    }, 60000);

    function cleanup() {
      removePrintAssets();
      restoreCollapsedCards();
      btns.forEach(b => {
        b.disabled = false;
        b.textContent = originalTexts.get(b) || '导出完整 PDF';
      });
    }

    window.print();

  } catch (err) {
    console.error('PDF export error', err);
    showToast('导出失败：' + (err.message || '请重试'));
    removePrintAssets();
    restoreCollapsedCards();
    btns.forEach(b => { b.disabled = false; b.textContent = '导出完整 PDF'; });
  }
}

/**
 * 工具定义
 */
export const exportPdfTool = {
  id: 'export',
  name: '报告完整导出PDF',
  cat: '工具',
  icon: '📄',
  desc: '将当前完整命理报告导出为多页 PDF，使用浏览器原生打印引擎，支持视觉完整版和纯文本版。',
  open(container) {
    const hasReport = !!getReportContainer();

    container.innerHTML = `
      <div class="tw-tool-export">
        <div class="tw-mast">
          <div class="tw-mast-top">
            <span class="tw-mast-cat">工具</span>
          </div>
          <h2 class="tw-mast-title">📄 报告完整导出 PDF</h2>
          <p class="tw-mast-sub">把你刚刚推演的完整报告（所有卡片、图表、文字）导出为多页 PDF 文件。</p>
        </div>

        <div class="tw-export-status">
          ${hasReport
            ? '<div class="tw-ok">✓ 当前已有完整报告</div>'
            : '<div class="tw-warn">请先在首页完成推演，生成报告后再使用本工具。</div>'}
        </div>

        <div class="tw-export-modes">
          <button class="tw-btn tw-btn-primary tw-export-btn" data-mode="visual" ${!hasReport ? 'disabled' : ''}>
            导出视觉完整版 PDF
            <small>保留全部卡片样式、图表、颜色（推荐）</small>
          </button>

          <button class="tw-btn tw-btn-ghost tw-export-btn" data-mode="text" ${!hasReport ? 'disabled' : ''}>
            导出纯文本精简版 PDF
            <small>只保留关键文字，更省墨更干净</small>
          </button>
        </div>

        <div class="tw-export-note">
          <p>• 点击后弹出浏览器打印对话框，选择「另存为 PDF」即可保存。</p>
          <p>• 视觉版保留卡片颜色和图表，纯文本版去除装饰只留文字。</p>
          <p>• 建议在打印对话框中勾选「背景图形」以保留卡片底色。</p>
        </div>

        <div class="tw-history-placeholder"></div>
      </div>
    `;

    // 绑定按钮
    container.querySelectorAll('.tw-export-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        exportPDF(mode);
      });
    });

    // 历史记录
    const hist = container.querySelector('.tw-history-placeholder');
    if (hist) {
      import('./runtime.js').then(m => {
        if (hist && m.historyStrip) hist.innerHTML = m.historyStrip();
        if (hist && m.bindHistory) m.bindHistory(hist);
      }).catch(()=>{});
    }

    return () => {
      // 清理：确保打印样式不会残留
      removePrintAssets();
    };
  }
};
