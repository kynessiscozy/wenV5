/* ============================================================
   工具共享 · toolPageShell + setToolOutput 结构化渲染
   ============================================================ */

/* —— 工具 → 配图映射 —— */
const B = import.meta.env.BASE_URL;
const TOOL_IMG = {
  wealth:  B + 'art/wealth.svg',
  career:  B + 'art/career.svg',
  date:    B + 'art/date.svg',
  style:   B + 'art/style.svg',
  layoff:  B + 'art/layoff.svg',
  daily:   B + 'art/daily.svg',
  name:    B + 'art/name.svg',
  oracle:  B + 'art/oracle.svg',
  lottery: B + 'art/lottery.svg',
  zodiac:  B + 'art/answerbook.svg',
  relation:B + 'art/relation.svg',
};
const TOOL_NAMES = {
  wealth: '财运与理财罗盘', career: '转行与副业测评',
  date: '重要事项择日助手', style: '能量穿搭与工位风水',
  layoff: '裁员风险检测', daily: '今日日签',
  name: '智能起名工具', oracle: '摇签问卜',
  lottery: '双色球 / 超级大乐透', zodiac: '生肖合冲分析',
  relation: '八字合盘 · 关系分析',
};

/**
 * toolPageShell — 工具输入页带头图
 */
function toolPageShell(title, sub, body) {
  const type = window._activeTool || '';
  const img = TOOL_IMG[type] || '';
  const banner = img
    ? '<div class="tool-banner" style="background-image:url(\'' + img + '\')">' +
        '<div class="tool-banner-overlay"></div>' +
        '<div class="tool-banner-text">' +
          '<div class="tool-banner-kicker">问问大师 · 工具</div>' +
          '<div class="tool-banner-title">' + title + '</div>' +
        '</div>' +
      '</div>'
    : '';
  return banner +
    '<div class="tool-page-body">' +
      (img ? '' : '<div class="tool-page-title">' + title + '</div>') +
      '<div class="tool-page-sub">' + sub + '</div>' +
      body +
    '</div>';
}

/**
 * setToolOutput — 结构化工具结果
 *
 * 接受两种调用方式：
 *   1. setToolOutput(htmlString)              — 兼容旧代码，自动排版纯文字
 *   2. setToolOutput({ sections, note })      — 结构化数据，分区块展示
 */
function setToolOutput(data) {
  const out = document.getElementById('toolModalContent');
  if (!out) return;

  const type = window._activeTool || '';
  const name = TOOL_NAMES[type] || '工具结果';
  const img = TOOL_IMG[type] || '';

  let bodyHtml;
  if (typeof data === 'string') {
    bodyHtml = _autoFormat(data);
  } else if (data && data.sections) {
    bodyHtml = _renderSections(data.sections);
    if (data.note) {
      bodyHtml += '<div class="tr-note">' + data.note + '</div>';
    }
  } else {
    bodyHtml = '<p style="color:var(--c-text-3)">暂无结果。</p>';
  }

  // 结果页顶部带图横幅
  const banner = img
    ? '<div class="tool-banner tool-banner-sm" style="background-image:url(\'' + img + '\')">' +
        '<div class="tool-banner-overlay"></div>' +
        '<div class="tool-banner-text">' +
          '<button class="tool-back-btn tool-back-on-banner" type="button" onclick="openToolPage(window._activeTool)" title="返回修改">←</button>' +
          '<div>' +
            '<div class="tool-banner-kicker">结果分析</div>' +
            '<div class="tool-banner-title">' + name + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    : '<div class="tool-result-top">' +
        '<button class="tool-back-btn" type="button" onclick="openToolPage(window._activeTool)" title="返回修改">←</button>' +
        '<div class="tool-result-top-info">' +
          '<div class="tool-result-kicker">结果分析</div>' +
          '<div class="tool-result-top-title">' + name + '</div>' +
        '</div>' +
      '</div>';

  out.innerHTML =
    '<div class="tool-result-page">' +
      banner +
      '<div class="tool-result-content">' +
        '<div class="tool-page-sub">以下结果结合你的输入与当前命盘参考生成。</div>' +
        '<div class="tool-result-body">' + bodyHtml + '</div>' +
        '<div class="tool-result-actions">' +
          '<button class="tool-secondary" onclick="openToolPage(window._activeTool)">← 返回修改</button>' +
          '<button class="tool-primary" onclick="closeToolPage()">完成</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* —— 结构化 section 渲染 —— */
function _renderSections(sections) {
  return sections.map(s => {
    const t = s.type || 'row';
    switch (t) {
      case 'hero':
        return '<div class="tr-hero">' +
          (s.label ? '<div class="tr-hero-label">' + s.label + '</div>' : '') +
          '<div class="tr-hero-value">' + s.value + '</div>' +
          (s.sub ? '<div class="tr-hero-sub">' + s.sub + '</div>' : '') +
        '</div>';
      case 'row':
        return '<div class="tr-row">' +
          '<span class="tr-row-label">' + (s.label || '') + '</span>' +
          '<span class="tr-row-value">' + (s.value || '') + '</span>' +
        '</div>';
      case 'text':
        return '<div class="tr-text">' +
          (s.label ? '<div class="tr-text-label">' + s.label + '</div>' : '') +
          '<div class="tr-text-body">' + (s.value || '') + '</div>' +
        '</div>';
      case 'list':
        const items = Array.isArray(s.value) ? s.value : String(s.value).split(/\n/).filter(Boolean);
        return '<div class="tr-list">' +
          (s.label ? '<div class="tr-text-label">' + s.label + '</div>' : '') +
          '<ol class="tr-list-items">' + items.map(x => '<li>' + x + '</li>').join('') + '</ol>' +
        '</div>';
      case 'tag':
        const tags = Array.isArray(s.value) ? s.value : [s.value];
        return '<div class="tr-tags">' +
          (s.label ? '<div class="tr-text-label">' + s.label + '</div>' : '') +
          '<div class="tr-tag-list">' + tags.map(t => '<span class="tr-tag">' + t + '</span>').join('') + '</div>' +
        '</div>';
      case 'divider':
        return '<div class="tr-divider"></div>';
      default:
        return '<div class="tr-text"><div class="tr-text-body">' + (s.value || '') + '</div></div>';
    }
  }).join('');
}

/* —— 旧字符串自动排版 —— */
function _autoFormat(html) {
  let cleaned = html
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '{{BREAK}}')
    .replace(/<br\s*\/?>/gi, '{{NL}}');
  const blocks = cleaned.split('{{BREAK}}').filter(b => b.trim());
  if (blocks.length <= 1 && !cleaned.includes('{{NL}}')) {
    return '<div class="tr-text"><div class="tr-text-body">' + html + '</div></div>';
  }
  return blocks.map(block => {
    const lines = block.split('{{NL}}').map(l => l.trim()).filter(Boolean);
    if (lines.length === 1) {
      return '<div class="tr-text"><div class="tr-text-body">' + lines[0] + '</div></div>';
    }
    const hasNumbers = lines.every(l => /^[①②③④⑤⑥⑦⑧⑨⑩\d]/.test(l));
    if (hasNumbers) {
      return '<div class="tr-list"><ol class="tr-list-items">' +
        lines.map(l => '<li>' + l.replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d]+[.、\s:：]*/, '') + '</li>').join('') +
      '</ol></div>';
    }
    return lines.map(l => '<div class="tr-text"><div class="tr-text-body">' + l + '</div></div>').join('');
  }).join('');
}

export { toolPageShell, setToolOutput };
