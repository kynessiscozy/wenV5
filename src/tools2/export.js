/* ============================================================
   tools2 · 报告完整导出 PDF 工具
   ------------------------------------------------------------
   新工具：把当前完整报告（#p2Inner）高质量导出为多页 PDF。
   - 使用 html2canvas + jsPDF（CDN 动态加载，无需预装）
   - 自动分页、保持视觉风格（跟随当前主题）
   - 包含全部卡片、图表、文字
   - 提供“仅文本纯净版”和“视觉完整版”两种模式
   ============================================================ */

import { showToast } from '../ui/toast.js';

let _loaded = false;
let jsPDF = null;
let html2canvas = null;

async function ensureLibs() {
  if (_loaded && jsPDF && html2canvas) return;
  // 动态加载 CDN（生产环境可换成本地）
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  try {
    // jsPDF 2.x UMD
    if (!window.jspdf) {
      await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
    }
    jsPDF = window.jspdf?.jsPDF || window.jsPDF;

    // html2canvas
    if (!window.html2canvas) {
      await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
    }
    html2canvas = window.html2canvas;

    _loaded = true;
  } catch (e) {
    console.error('PDF libs load failed', e);
    throw new Error('无法加载导出库，请检查网络或稍后重试');
  }
}

function getReportContainer() {
  return document.getElementById('p2Inner') || document.querySelector('#page2 .p2-inner') || document.querySelector('#page2');
}

async function captureElementToCanvas(el, opts = {}) {
  if (!html2canvas) throw new Error('html2canvas 未就绪');
  const canvas = await html2canvas(el, {
    scale: opts.scale || 2,
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--c-bg') || '#faf9f5',
    logging: false,
    useCORS: true,
    ...opts
  });
  return canvas;
}

async function exportPDF(mode = 'visual') {
  const container = getReportContainer();
  if (!container) {
    showToast('请先完成推演，生成报告后再导出');
    return;
  }

  const btns = document.querySelectorAll('.tw-export-btn, [data-export-pdf]');
  btns.forEach(b => { b.disabled = true; b.textContent = '正在生成 PDF...'; });

  try {
    await ensureLibs();
    if (!jsPDF || !html2canvas) throw new Error('导出库加载失败');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;

    const title = '问问大师 · 完整命理报告';
    const sub = new Date().toLocaleDateString('zh-CN') + ' · 基于当前推演结果';

    // 标题页
    doc.setFontSize(18);
    doc.text(title, pageW / 2, 25, { align: 'center' });
    doc.setFontSize(11);
    doc.text(sub, pageW / 2, 33, { align: 'center' });
    doc.setFontSize(9);
    doc.text('仅供自我整理与行动参考，不构成投资、医疗、法律或职业决策依据', pageW / 2, 42, { align: 'center' });

    doc.setDrawColor(200);
    doc.line(margin, 48, pageW - margin, 48);

    let y = 55;

    // 视觉完整模式：按卡片/分区截图
    if (mode === 'visual') {
      // 找到所有主要区块
      const sections = container.querySelectorAll('.sec, .glass, .card-1, .card-2, .beginner-brief, .qr-card');
      let captured = 0;

      for (const sec of sections) {
        if (sec.offsetParent === null || sec.getBoundingClientRect().height < 20) continue;

        const c = await captureElementToCanvas(sec, { scale: 1.8 });

        const imgW = pageW - margin * 2;
        const ratio = c.height / c.width;
        let imgH = imgW * ratio;

        // 如果当前页放不下，开新页
        if (y + imgH > pageH - margin - 10) {
          doc.addPage();
          y = margin + 8;
        }

        const imgData = c.toDataURL('image/jpeg', 0.92);
        doc.addImage(imgData, 'JPEG', margin, y, imgW, imgH);
        y += imgH + 6;
        captured++;

        // 每隔几张提示进度
        if (captured % 3 === 0) {
          // 轻微滚动提示（用户可见）
        }
      }

      if (captured === 0) {
        // 兜底：整块截图
        const c = await captureElementToCanvas(container, { scale: 1.6 });
        const imgW = pageW - margin * 2;
        const ratio = c.height / c.width;
        let imgH = Math.min(pageH - y - margin, imgW * ratio);

        const imgData = c.toDataURL('image/jpeg', 0.9);
        doc.addImage(imgData, 'JPEG', margin, y, imgW, imgH);
      }
    } else {
      // 纯文本模式：提取文字，结构化输出（更小更干净）
      const textContent = extractReportText(container);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(textContent, pageW - margin * 2);
      doc.text(lines, margin, y);
    }

    // 页脚
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(`问问大师 · 第 ${i}/${totalPages} 页  |  完整报告导出`, pageW / 2, pageH - 8, { align: 'center' });
    }

    const fileName = `问问大师_完整报告_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
    showToast('PDF 已导出（' + (mode === 'visual' ? '视觉完整版' : '纯文本版') + '）');

  } catch (err) {
    console.error('PDF export error', err);
    showToast('导出失败：' + (err.message || '请重试或使用浏览器打印功能'));
    // 兜底：使用浏览器打印（用户可“另存为 PDF”）
    try { window.print(); } catch (e) {}
  } finally {
    btns.forEach(b => { b.disabled = false; b.textContent = '导出完整 PDF'; });
  }
}

function extractReportText(root) {
  // 提取关键文字，结构化
  let out = '【问问大师 完整报告】\n\n';
  const cards = root.querySelectorAll('.glass, .card-1, .card-2, .beginner-brief, .qr-card, .tl-card');
  cards.forEach((card, idx) => {
    const title = card.querySelector('.card-tt, .bb-title, .qr-title')?.textContent?.trim() || '区块';
    const txt = (card.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 420);
    out += `${idx + 1}. ${title}\n${txt}\n\n`;
  });
  return out + '\n—— 由问问大师生成 · 仅供参考';
}

export const exportPdfTool = {
  id: 'export',
  name: '报告完整导出PDF',
  cat: '工具',
  icon: '📄',
  desc: '将当前完整命理报告导出为多页高质量 PDF，支持视觉完整版和纯文本版。',
  open(container) {
    const d = window._ctx || window._baziData || window._reportData;
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
            <small>只保留关键文字，文件更小</small>
          </button>
        </div>

        <div class="tw-export-note">
          <p>• 视觉版会按卡片顺序分页，尽量还原你在页面上看到的样式。</p>
          <p>• 导出后可直接分享、打印或存档。</p>
          <p>• 如导出卡顿，可尝试先关闭新手模式或折叠部分卡片。</p>
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
      // 复用 runtime 的历史（动态加载避免循环）
      import('./runtime.js').then(m => {
        if (hist && m.historyStrip) hist.innerHTML = m.historyStrip();
        if (hist && m.bindHistory) m.bindHistory(hist);
      }).catch(()=>{});
    }

    return () => {};
  }
};
