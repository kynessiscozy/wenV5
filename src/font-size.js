/* ============================================================
   文字显示大小调节 —— 仅作用于「问问大师」聊天界面
   原理：--font-scale 只写入聊天弹层 #aiSheet（不写 html，避免影响全站）。
   聊天正文/气泡均为 em 体系，#aiSheet 基准字号 = 15px × --font-scale，
   根一缩放即整段聊天内容联动。设置入口已并入 AI 设置弹窗。
   ============================================================ */

const KEY = 'tj_font_scale';
const PRESETS = [
  { key: 'small',    label: '小',   scale: 0.88 },
  { key: 'standard', label: '标准', scale: 1.00 },
  { key: 'large',    label: '大',   scale: 1.18 },
  { key: 'xlarge',   label: '特大', scale: 1.40 },
];

export function getFontSizeKey() {
  try { return localStorage.getItem(KEY) || 'standard'; } catch (e) { return 'standard'; }
}

function presetOf(key) {
  return PRESETS.find(p => p.key === key) || PRESETS[1];
}

export function applyFontSize(key) {
  const p = presetOf(key);
  // 仅写入聊天界面 #aiSheet，不污染全站（html/body 仍保持默认 --font-scale=1）
  const target = document.getElementById('aiSheet') || document.documentElement;
  target.style.setProperty('--font-scale', String(p.scale));
  try { localStorage.setItem(KEY, p.key); } catch (e) {}
  // 同步 AI 设置弹窗中的按钮状态
  document.querySelectorAll('.ai-fs-opt').forEach(o => o.classList.toggle('active', o.dataset.key === p.key));
  return p;
}

export function initFontSize() {
  // 应用已保存偏好（仅作用于聊天界面 #aiSheet）
  applyFontSize(getFontSizeKey());
}
