/* ============================================================
   问问大师 · AI 输出兜底过滤
   ------------------------------------------------------------
   在 AI 流式回答渲染完成后，对最终文本做关键词扫描。
   命中黑名单的词做打码处理，作为 system prompt 之外的第二道合规防线。
   ============================================================ */

// 黑名单词：吉凶断言、恐吓性表述、迷信消费诱导
const BLACKLIST = [
  '大凶', '必凶', '大灾', '必灾', '血光之灾', '破财消灾',
  '破财', '血光', '必有灾', '命犯太岁', '天煞孤星',
  '必死', '必亡', '绝后', '断子绝孙',
  '破镜重圆不可能', '必离婚', '必分手',
  '必发财', '必暴富', '一夜暴富',
  '必怀孕', '必生男', '必生女',
  '有邪祟', '有鬼祟', '撞鬼', '中邪',
  '必遭', '必有血光', '必有车祸',
  '必破财', '必破产', '必坐牢',
  '注定孤独', '注定失败', '命中注定'
];

const REPLACE_CHAR = '✦';

/**
 * 对纯文本做黑名单词替换。
 * 命中的词每个字符替换为 REPLACE_CHAR。
 */
export function sanitizeText(text) {
  let out = String(text || '');
  BLACKLIST.forEach(w => {
    if (!w) return;
    const masked = REPLACE_CHAR.repeat(w.length);
    // 用全局替换，不区分大小写（中文无大小写问题，英文部分加 flag）
    out = out.split(w).join(masked);
  });
  return out;
}

/**
 * 检查文本是否包含黑名单词。
 */
export function hasForbiddenContent(text) {
  const s = String(text || '');
  return BLACKLIST.some(w => s.includes(w));
}

/**
 * 对已渲染的 HTML 做扫描。
 * 只处理文本节点（textContent），不碰标签属性。
 * 返回处理后的 HTML 字符串。
 */
export function sanitizeHtml(html) {
  if (!html) return html;
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html);
  let hit = false;
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (hasForbiddenContent(node.textContent)) {
      nodes.push(node);
      hit = true;
    }
  }
  if (!hit) return html;
  nodes.forEach(n => {
    n.textContent = sanitizeText(n.textContent);
  });
  return tpl.innerHTML;
}

/**
 * 如果回答命中了过滤，在气泡末尾追加一条提示。
 */
export function filterNoticeHtml() {
  return '<div class="ai-filter-notice">部分表述已做合规过滤，命理仅供参考，不构成命运判定。</div>';
}

/**
 * 对 AI 最终文本做完整处理：净化 + 判断是否需要追加提示。
 * 返回 { html, filtered } 对象。
 */
export function filterAiResponse(text, renderedHtml) {
  const filtered = hasForbiddenContent(text);
  if (!filtered) return { html: renderedHtml, filtered: false };
  return {
    html: sanitizeHtml(renderedHtml) + filterNoticeHtml(),
    filtered: true
  };
}
