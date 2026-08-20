/* ============================================================
   文字显示大小调节 —— 仅作用于「问问大师」聊天界面
   原理：--font-scale 只写入聊天弹层 #aiSheet（不写 html，避免影响全站）。
   聊天正文/气泡均为 em 体系，#aiSheet 基准字号 = 15px × --font-scale，
   根一缩放即整段聊天内容联动。入口按钮挂在聊天工具栏内。
   ============================================================ */

const KEY = 'tj_font_scale';
const PRESETS = [
  { key: 'small',    label: '小',   scale: 0.88 },
  { key: 'standard', label: '标准', scale: 1.00 },
  { key: 'large',    label: '大',   scale: 1.18 },
  { key: 'xlarge',   label: '特大', scale: 1.40 },
];

const ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<text x="2.5" y="17" font-size="13" font-weight="700" font-family="serif" fill="currentColor" stroke="none">A</text>' +
  '<text x="12" y="21" font-size="8" font-weight="700" font-family="serif" fill="currentColor" stroke="none">a</text>' +
  '</svg>';

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
  document.querySelectorAll('.fs-opt').forEach(o => o.classList.toggle('active', o.dataset.key === p.key));
  document.querySelectorAll('.fs-toggle').forEach(b => {
    b.setAttribute('aria-label', '文字大小：' + p.label);
    b.setAttribute('title', '文字大小：' + p.label);
  });
  return p;
}

function closePanel() {
  const panel = document.getElementById('fsPanel');
  if (panel) panel.classList.remove('open');
}

function togglePanel() {
  const panel = document.getElementById('fsPanel');
  if (panel) panel.classList.toggle('open');
}

function _mountToggle(cls, parentSel) {
  if (document.querySelector('.' + cls)) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fs-toggle ' + cls;
  btn.innerHTML = ICON;
  btn.addEventListener('click', e => { e.stopPropagation(); togglePanel(); });
  if (parentSel) {
    const parent = document.querySelector(parentSel);
    if (parent) parent.insertBefore(btn, parent.firstChild);
  } else {
    document.body.appendChild(btn);
  }
}

function _buildPanel() {
  let panel = document.getElementById('fsPanel');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'fsPanel';
  panel.className = 'fs-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '文字大小');
  panel.innerHTML =
    '<div class="fs-panel-tt">文字大小</div>' +
    '<div class="fs-opts">' +
      PRESETS.map(p =>
        '<button type="button" class="fs-opt" data-key="' + p.key + '">' +
          '<span class="fs-opt-a">A</span>' +
          '<span class="fs-opt-l">' + p.label + '</span>' +
        '</button>'
      ).join('') +
    '</div>' +
    '<div class="fs-panel-hint">仅调整显示大小，不会改变推演结果</div>';
  document.body.appendChild(panel);
  panel.querySelectorAll('.fs-opt').forEach(btn => {
    btn.addEventListener('click', () => { applyFontSize(btn.dataset.key); closePanel(); });
  });
  return panel;
}

export function initFontSize() {
  // 应用已保存偏好（仅作用于聊天界面 #aiSheet）
  applyFontSize(getFontSizeKey());

  _buildPanel();
  // 入口按钮挂在聊天工具栏内（与 ＋ / 设置 / × 并列），不暴露到全站
  _mountToggle('fs-toggle-chat', '.ai-actions');

  // 点击外部关闭面板
  document.addEventListener('click', e => {
    const panel = document.getElementById('fsPanel');
    if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !e.target.closest('.fs-toggle')) {
      closePanel();
    }
  });
}
