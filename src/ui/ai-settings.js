import { probeConnection, getProvider, setProvider } from '../ai/index.js';
import { mountEvolveSettings } from '../evolve/ui.js';
import { applyFontSize, getFontSizeKey } from '../font-size.js';

const defaults = { natural: true, context: true, length: 'short' };

const BUILTIN_KEY          = import.meta.env.VITE_API_KEY || '';
const BUILTIN_DEEPSEEK_KEY = import.meta.env.VITE_DEEPSEEK_KEY || '';
const LS_KEY      = 'tj_ai_settings';
const LS_APIKEY   = 'tj_ai_apikey';

/* ============================================================
   获取当前生效的 API Key
   优先级：用户自定义 > 内置（跟随当前提供方）
   ============================================================ */
export function getApiKey() {
  try {
    const custom = localStorage.getItem(LS_APIKEY);
    if (custom && custom.trim()) return custom.trim();
  } catch (_) {}
  return getProvider() === 'deepseek' ? BUILTIN_DEEPSEEK_KEY : BUILTIN_KEY;
}

export function getAISettings() {
  try {
    return Object.assign({}, defaults, JSON.parse(localStorage.getItem(LS_KEY) || '{}'));
  } catch (e) {
    return { ...defaults };
  }
}

/* ============================================================
   弹窗开关
   ============================================================ */
export function toggleAISettings() {
  const modal = document.getElementById('aiSettingsModal');
  if (!modal) return;
  if (modal.classList.contains('open')) {
    closeAISettingsModal();
  } else {
    openAISettingsModal();
  }
}

export function openAISettingsModal() {
  const modal = document.getElementById('aiSettingsModal');
  if (!modal) return;
  const panel = document.getElementById('aiSettingsPanel');
  if (panel && !panel.children.length) {
    _buildPanel(panel);
  }
  modal.classList.add('open');
  document.querySelector('.ai-settings')?.setAttribute('aria-expanded', 'true');
}

export function closeAISettingsModal() {
  const modal = document.getElementById('aiSettingsModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.querySelector('.ai-settings')?.setAttribute('aria-expanded', 'false');
}

window.closeAISettingsModal = closeAISettingsModal;

/* 提供方对应密钥说明 */
function _providerInfo(p) {
  if (p === 'deepseek') {
    return 'Key 保存在本地浏览器，不会上传。<br>获取地址：<a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">platform.deepseek.com/api_keys</a>';
  }
  return 'Key 保存在本地浏览器，不会上传。<br>获取地址：<a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a>';
}

/* ============================================================
   构建设置面板 DOM
   ============================================================ */
function _buildPanel(container) {
  const v = getAISettings();
  const savedKey = _getSavedCustomKey();
  const maskedKey = savedKey ? _maskKey(savedKey) : '';
  const hasCustom = !!savedKey;
  const p = getProvider();

  container.innerHTML = `
    <div class="ai-setting-section">
      <div class="ai-setting-section-title">服务提供商</div>
      <select id="aiProviderSelect" class="ai-provider-select">
        <option value="deepseek"${p === 'deepseek' ? ' selected' : ''}>DeepSeek（默认）</option>
        <option value="openrouter"${p === 'openrouter' ? ' selected' : ''}>OpenRouter</option>
      </select>
      <div class="ai-setting-hint">不同服务商需对应密钥，切换后会自动重新检测连接。</div>
    </div>

    <div class="ai-setting-section">
      <div class="ai-setting-section-title">API Key</div>
      <div class="ai-key-status" id="aiKeyStatus">
        ${hasCustom
          ? '<span class="ai-key-badge custom">自定义</span><span class="ai-key-masked">' + maskedKey + '</span>'
          : BUILTIN_KEY || BUILTIN_DEEPSEEK_KEY
            ? '<span class="ai-key-badge builtin">内置</span><span class="ai-key-hint">使用内置 Key</span>'
            : '<span class="ai-key-badge none">未配置</span><span class="ai-key-hint">请输入 Key 才能使用 AI</span>'
        }
      </div>
      <div class="ai-key-input-row" id="aiKeyInputRow" style="display:none">
        <input type="password" id="aiKeyInput" class="ai-key-input"
               placeholder="sk-..." autocomplete="off" spellcheck="false" />
        <button type="button" id="aiKeySave" class="ai-key-save">保存</button>
      </div>
      <div class="ai-key-actions">
        <button type="button" id="aiKeyEditBtn" class="ai-key-action">${hasCustom ? '更换 Key' : '自定义 Key'}</button>
        ${hasCustom ? '<button type="button" id="aiKeyResetBtn" class="ai-key-action danger">恢复内置</button>' : ''}
      </div>
      <div class="ai-key-note" id="aiKeyNote">${_providerInfo(p)}</div>
    </div>

    <div class="ai-setting-section">
      <div class="ai-setting-section-title">对话偏好</div>
      <label class="ai-setting-row"><span>自然对话</span><input id="aiSettingNatural" type="checkbox" ${v.natural ? 'checked' : ''}></label>
      <label class="ai-setting-row"><span>结合上下文</span><input id="aiSettingContext" type="checkbox" ${v.context ? 'checked' : ''}></label>
      <label class="ai-setting-row"><span>回复长度</span><select id="aiSettingLength"><option value="short">简洁</option><option value="standard">标准</option></select></label>
    </div>

    <div class="ai-setting-section">
      <div class="ai-setting-section-title">文字大小</div>
      <div class="ai-font-size-opts">
        <button type="button" class="ai-fs-opt" data-key="small">
          <span class="ai-fs-a">A</span>
          <span class="ai-fs-l">小</span>
        </button>
        <button type="button" class="ai-fs-opt" data-key="standard">
          <span class="ai-fs-a">A</span>
          <span class="ai-fs-l">标准</span>
        </button>
        <button type="button" class="ai-fs-opt" data-key="large">
          <span class="ai-fs-a">A</span>
          <span class="ai-fs-l">大</span>
        </button>
        <button type="button" class="ai-fs-opt" data-key="xlarge">
          <span class="ai-fs-a">A</span>
          <span class="ai-fs-l">特大</span>
        </button>
      </div>
      <div class="ai-setting-hint">仅调整聊天文字显示大小，不影响推演结果</div>
    </div>

    <div class="ai-settings-note">设置只影响后续 AI 回复，不会修改已有对话。</div>
  `;

  container.querySelector('#aiSettingLength').value = v.length;

  // —— 对话偏好监听 ——
  container.querySelectorAll('#aiSettingNatural,#aiSettingContext,#aiSettingLength').forEach(x =>
    x.addEventListener('change', () => {
      const n = {
        natural: container.querySelector('#aiSettingNatural').checked,
        context: container.querySelector('#aiSettingContext').checked,
        length:  container.querySelector('#aiSettingLength').value
      };
      try { localStorage.setItem(LS_KEY, JSON.stringify(n)); } catch (e) {}
    })
  );

  // —— 文字大小设置 ——
  const currentFsKey = getFontSizeKey();
  container.querySelectorAll('.ai-fs-opt').forEach(btn => {
    if (btn.dataset.key === currentFsKey) btn.classList.add('active');
    btn.addEventListener('click', () => {
      container.querySelectorAll('.ai-fs-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFontSize(btn.dataset.key);
    });
  });

  // —— 服务商切换 ——
  const provSel = container.querySelector('#aiProviderSelect');
  provSel.addEventListener('change', () => {
    const np = provSel.value;
    setProvider(np);
    container.querySelector('#aiKeyNote').innerHTML = _providerInfo(np);
    _refreshKeyStatus(container);
    probeConnection(getApiKey());
  });

  // —— API Key 交互 ——
  const editBtn  = container.querySelector('#aiKeyEditBtn');
  const resetBtn = container.querySelector('#aiKeyResetBtn');
  const inputRow = container.querySelector('#aiKeyInputRow');
  const input    = container.querySelector('#aiKeyInput');
  const saveBtn  = container.querySelector('#aiKeySave');

  editBtn.addEventListener('click', () => {
    inputRow.style.display = inputRow.style.display === 'none' ? 'flex' : 'none';
    if (inputRow.style.display !== 'none') {
      input.value = '';
      input.type = 'text';
      setTimeout(() => input.focus(), 80);
    }
  });

  saveBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) return;
    try { localStorage.setItem(LS_APIKEY, val); } catch (_) {}
    inputRow.style.display = 'none';
    _refreshKeyStatus(container);
    probeConnection(val);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      try { localStorage.removeItem(LS_APIKEY); } catch (_) {}
      inputRow.style.display = 'none';
      _refreshKeyStatus(container);
      probeConnection(getApiKey());
    });
  }

  mountEvolveSettings(container);
  return container;
}

/* ============================================================
   辅助函数
   ============================================================ */
function _getSavedCustomKey() {
  try { return localStorage.getItem(LS_APIKEY) || ''; } catch (_) { return ''; }
}

function _maskKey(key) {
  if (!key || key.length < 12) return '••••••••';
  return key.slice(0, 8) + '••••' + key.slice(-4);
}

function _refreshKeyStatus(container) {
  const statusEl = container.querySelector('#aiKeyStatus');
  const editBtn  = container.querySelector('#aiKeyEditBtn');
  const actionsEl = container.querySelector('.ai-key-actions');
  const savedKey = _getSavedCustomKey();
  const hasCustom = !!savedKey;

  if (hasCustom) {
    statusEl.innerHTML = '<span class="ai-key-badge custom">自定义</span><span class="ai-key-masked">' + _maskKey(savedKey) + '</span>';
    editBtn.textContent = '更换 Key';
    if (!actionsEl.querySelector('#aiKeyResetBtn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'aiKeyResetBtn';
      btn.className = 'ai-key-action danger';
      btn.textContent = '恢复内置';
      btn.addEventListener('click', () => {
        try { localStorage.removeItem(LS_APIKEY); } catch (_) {}
        container.querySelector('#aiKeyInputRow').style.display = 'none';
        _refreshKeyStatus(container);
        probeConnection(getApiKey());
      });
      actionsEl.appendChild(btn);
    }
  } else {
    statusEl.innerHTML = (BUILTIN_KEY || BUILTIN_DEEPSEEK_KEY)
      ? '<span class="ai-key-badge builtin">内置</span><span class="ai-key-hint">使用内置 Key</span>'
      : '<span class="ai-key-badge none">未配置</span><span class="ai-key-hint">请输入 Key 才能使用 AI</span>';
    editBtn.textContent = '自定义 Key';
    const oldReset = actionsEl.querySelector('#aiKeyResetBtn');
    if (oldReset) oldReset.remove();
  }
}

/* ============================================================
   初始化
   ============================================================ */
export function initAISettings() {
  window.getAISettings = getAISettings;
  window.getApiKey = getApiKey;
  window.toggleAISettings = toggleAISettings;
  window.openAISettingsModal = openAISettingsModal;
  window.closeAISettingsModal = closeAISettingsModal;
}
