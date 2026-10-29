import { HOME_THEMES } from '../ui/home-theme.js';
import { focusSafely } from '../ui/focus.js';
import { renderTraitPoster } from './poster.js';

let activeStudio = null;

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      if (canvas.toBlob) return canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片生成失败')), 'image/png');
      const data = canvas.toDataURL('image/png').split(',')[1];
      const binary = atob(data), bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      resolve(new Blob([bytes], { type: 'image/png' }));
    } catch (error) { reject(error); }
  });
}

function usableFile(blob, filename) {
  try { return new File([blob], `${filename}.png`, { type: 'image/png' }); }
  catch (_) { return null; }
}

function canShareFile(file) {
  if (!file || typeof navigator.share !== 'function') return false;
  try { return !navigator.canShare || navigator.canShare({ files: [file] }); }
  catch (_) { return false; }
}

/** One accessible preview and export flow for character posters and tool cards. */
function createStudio({ opener, title, filename, characterPoster, render }) {
  activeStudio?.close(false);
  const root = document.createElement('div');
  root.className = 'share-studio';
  root.id = 'shareStudio';
  root.innerHTML = `
    <div class="share-studio-backdrop" aria-hidden="true"></div>
    <section class="share-studio-sheet" role="dialog" aria-modal="true" aria-labelledby="shareStudioTitle" tabindex="-1">
      <header class="share-studio-header">
        <div><p class="share-studio-eyebrow">A MOMENT TO SHARE</p><h2 id="shareStudioTitle"></h2></div>
        <button type="button" class="share-studio-close" aria-label="关闭分享">×</button>
      </header>
      <div class="share-studio-body">
        <div class="share-studio-preview-wrap">
          <div class="share-studio-preview" aria-busy="true"><div class="share-studio-placeholder">正在准备海报…</div></div>
          <p class="share-studio-preview-hint">图片在本机生成，可长按预览保存</p>
        </div>
        <div class="share-studio-controls">
          <div class="share-studio-intro"><h3>把这一刻，分享出去</h3><p></p></div>
          <div class="share-studio-poster-controls">
            <div class="share-studio-field"><span class="share-studio-label">海报比例</span>
              <div class="share-studio-options" role="group" aria-label="海报比例">
                <button type="button" data-format="portrait" aria-pressed="true">竖版 <small>4:5</small></button>
                <button type="button" data-format="square" aria-pressed="false">方形 <small>1:1</small></button>
              </div>
            </div>
            <div class="share-studio-field share-studio-system-field"><span class="share-studio-label">摘要内容</span>
              <div class="share-studio-options" role="group" aria-label="摘要体系">
                <button type="button" data-system="eastern" aria-pressed="false">东方命理</button>
                <button type="button" data-system="western" aria-pressed="false">西方星相</button>
              </div>
            </div>
            <label class="share-studio-check"><span><strong>显示少量结果</strong><small>可关闭，只分享人物与特质</small></span><input type="checkbox" checked aria-label="显示少量结果"><i aria-hidden="true"></i></label>
          </div>
        </div>
      </div>
      <footer class="share-studio-footer">
        <div class="share-studio-actions">
          <button type="button" class="share-studio-share" disabled><span aria-hidden="true">↗</span> 分享图片</button>
          <button type="button" class="share-studio-save" disabled><span aria-hidden="true">↓</span> 保存图片</button>
          <button type="button" class="share-studio-copy" disabled>复制图片</button>
        </div>
        <p class="share-studio-status" role="status" aria-live="polite"></p>
      </footer>
    </section>`;
  root.querySelector('#shareStudioTitle').textContent = title;
  const panel = root.querySelector('.share-studio-sheet');
  const preview = root.querySelector('.share-studio-preview');
  const status = root.querySelector('.share-studio-status');
  const share = root.querySelector('.share-studio-share');
  const save = root.querySelector('.share-studio-save');
  const copy = root.querySelector('.share-studio-copy');
  const details = root.querySelector('.share-studio-poster-controls');
  const intro = root.querySelector('.share-studio-intro p');
  details.hidden = !characterPoster;
  intro.textContent = characterPoster ? '只展示特质与少量摘要，不包含姓名、出生时间或地点。' : '先预览，再选择分享或保存。';
  document.body.appendChild(root);

  let disposed = false, serial = 0, objectURL = '', blob = null, file = null;
  const downloading = new Set();
  const releaseURL = url => {
    if (!url) return;
    // Keep a just-clicked download alive long enough for mobile browsers to
    // start reading it even if the user immediately changes or closes preview.
    if (downloading.has(url)) setTimeout(() => { URL.revokeObjectURL(url); downloading.delete(url); }, 10000);
    else URL.revokeObjectURL(url);
  };
  const previousFocus = opener || document.activeElement;
  const shielded = [];
  const shield = el => {
    if (el.nodeType !== 1 || el === root || ['SCRIPT', 'STYLE', 'LINK'].includes(el.tagName) || shielded.some(item => item.el === el)) return;
    shielded.push({ el, inert: el.hasAttribute('inert'), aria: el.getAttribute('aria-hidden') });
    el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true');
  };
  Array.from(document.body.children).forEach(shield);
  const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(shield)));
  observer.observe(document.body, { childList: true });

  const setStatus = text => { status.textContent = text; };
  const controls = () => [...panel.querySelectorAll('button:not([disabled]), input:not([disabled])')].filter(el => el.getClientRects().length);
  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key !== 'Tab') return;
    const items = controls();
    if (!items.length) { event.preventDefault(); focusSafely(panel); return; }
    if (event.shiftKey && (document.activeElement === items[0] || !panel.contains(document.activeElement))) {
      event.preventDefault(); focusSafely(items[items.length - 1]);
    } else if (!event.shiftKey && (document.activeElement === items[items.length - 1] || !panel.contains(document.activeElement))) {
      event.preventDefault(); focusSafely(items[0]);
    }
  }
  function close(restore = true) {
    if (disposed) return;
    disposed = true; serial++; observer.disconnect();
    document.removeEventListener('keydown', onKey, true);
    shielded.forEach(({ el, inert, aria }) => {
      if (!inert) el.removeAttribute('inert');
      if (aria === null) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', aria);
    });
    root.remove();
    if (objectURL) releaseURL(objectURL);
    if (activeStudio?.root === root) activeStudio = null;
    if (restore) {
      const fallback = document.body.classList.contains('report-active') ? document.getElementById('p2ShareBtn') : document.getElementById('homeCtaMain');
      focusSafely(previousFocus?.isConnected && previousFocus.getClientRects().length ? previousFocus : fallback);
    }
  }
  root.querySelector('.share-studio-close').addEventListener('click', () => close());
  root.querySelector('.share-studio-backdrop').addEventListener('click', () => close());
  document.addEventListener('keydown', onKey, true);
  activeStudio = { root, close };
  focusSafely(root.querySelector('.share-studio-close'));

  async function update() {
    const request = ++serial;
    blob = null; file = null;
    share.disabled = save.disabled = copy.disabled = true;
    preview.setAttribute('aria-busy', 'true');
    preview.replaceChildren(Object.assign(document.createElement('div'), { className: 'share-studio-placeholder', textContent: '正在准备海报…' }));
    if (objectURL) { releaseURL(objectURL); objectURL = ''; }
    setStatus('');
    try {
      const canvas = await render(root);
      // A quick format/summary change can supersede an image while assets are
      // loading. Skip the expensive PNG encoding for that stale render.
      if (disposed || request !== serial) return;
      const nextBlob = await canvasBlob(canvas);
      if (disposed || request !== serial) return;
      blob = nextBlob; file = usableFile(blob, filename);
      objectURL = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.className = 'share-studio-image'; img.alt = title + '预览'; img.src = objectURL;
      preview.replaceChildren(img); preview.setAttribute('aria-busy', 'false');
      save.disabled = false;
      share.disabled = !canShareFile(file);
      copy.disabled = !(navigator.clipboard?.write && typeof window.ClipboardItem === 'function');
      if (share.disabled) setStatus('当前浏览器可先保存图片，再发送给朋友。');
    } catch (error) {
      if (disposed || request !== serial) return;
      preview.setAttribute('aria-busy', 'false');
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'share-studio-retry'; retry.textContent = '图片暂时无法生成，点击重试';
      retry.addEventListener('click', update); preview.replaceChildren(retry);
      setStatus(error?.message || '生成失败，请重试。');
    }
  }

  share.addEventListener('click', () => {
    if (!file || !canShareFile(file)) { setStatus('当前浏览器不支持直接分享，请先保存图片。'); return; }
    // The file is prepared before the click: mobile Web Share requires an
    // immediate, user-activated navigator.share call, not an awaited toBlob.
    setStatus('');
    try {
      Promise.resolve(navigator.share({ title, files: [file] })).then(() => setStatus('分享完成。')).catch(error => {
        if (error?.name !== 'AbortError') setStatus('未能直接分享，请保存或长按预览后发送。');
      });
    } catch (_) { setStatus('未能直接分享，请保存或长按预览后发送。'); }
  });
  save.addEventListener('click', () => {
    if (!objectURL) return;
    downloading.add(objectURL);
    const link = document.createElement('a'); link.href = objectURL; link.download = `${filename}.png`;
    document.body.appendChild(link); link.click(); link.remove();
    setStatus('已尝试保存；手机也可长按上方图片保存。');
  });
  copy.addEventListener('click', () => {
    if (!blob || !navigator.clipboard?.write || typeof window.ClipboardItem !== 'function') return;
    try {
      const item = new ClipboardItem({ 'image/png': blob });
      Promise.resolve(navigator.clipboard.write([item])).then(() => setStatus('图片已复制，可以粘贴发送。'))
        .catch(() => setStatus('未能复制，请保存或长按预览。'));
    } catch (_) { setStatus('未能复制，请保存或长按预览。'); }
  });
  return { root, update, close };
}

/** Main report: a portrait-first poster with an optional, small real summary. */
export function openPosterShare({ kind = 'report', opener } = {}) {
  const ctx = window._ctx;
  const theme = HOME_THEMES[document.documentElement.dataset.homeTheme];
  if (!ctx || !theme) throw new Error('请先选择特质并完成推演');
  const state = { format: 'portrait', system: document.documentElement.dataset.systemMode === 'western' ? 'western' : 'eastern', includeSummary: true };
  if (kind !== 'report') state.system = 'eastern';
  const isDemo = document.querySelector('#characterResultHero')?.dataset.reportDemo === 'true';
  const studio = createStudio({ opener, title: '分享海报', filename: '问问大师_同行海报', characterPoster: true,
    render: async () => (await renderTraitPoster({ theme, ctx, western: window.__w3dData,
      kind, system: state.system, format: state.format, includeSummary: state.includeSummary, isDemo })).canvas });
  const { root, update } = studio;
  root.querySelector('.share-studio-system-field').hidden = kind !== 'report';
  const sync = () => {
    root.querySelectorAll('[data-format]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.format === state.format)));
    root.querySelectorAll('[data-system]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.system === state.system)));
  };
  root.querySelectorAll('[data-format]').forEach(btn => btn.addEventListener('click', () => {
    if (state.format === btn.dataset.format) return;
    state.format = btn.dataset.format; sync(); update();
  }));
  root.querySelectorAll('[data-system]').forEach(btn => btn.addEventListener('click', () => {
    if (state.system === btn.dataset.system) return;
    state.system = btn.dataset.system; sync(); update();
  }));
  root.querySelector('.share-studio-check input').addEventListener('change', event => {
    state.includeSummary = event.target.checked; update();
  });
  sync(); update();
  return studio;
}

/** Tool results keep their own facts while using the same preview/export UI. */
export function openCanvasShare(canvas, filename = '问问大师_分享卡', opener) {
  if (!canvas?.getContext) throw new Error('没有可分享的图片');
  const safeName = String(filename).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 80) || '问问大师_分享卡';
  const studio = createStudio({ opener, title: '分享结果', filename: safeName, characterPoster: false, render: async () => canvas });
  studio.update();
  return studio;
}
