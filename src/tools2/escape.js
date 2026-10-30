/* 工具界面和 AI 流式文本共用的 HTML 转义。 */
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// 保持 AI 文字原有行为：连续换行合并为一个 <br>。
export function escWithBreaks(s) {
  return esc(s).replace(/\n+/g, '<br>');
}
