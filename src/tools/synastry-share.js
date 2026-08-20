/* ============================================================
   合盘结果的「保存对象」与「分享」
   ------------------------------------------------------------
   三个入口（报告页 / 工具中心 / 旧 relation 工具）共用这里的逻辑，
   避免再次出现多套实现各自漂移的情况。
   ============================================================ */

import { showToast } from '../ui/toast.js';
import { savePartner, listPartners, deletePartner, partnerSummary } from '../state/partners.js';

/** 把一次合盘结果压成可分享的纯文本（不含隐私细节，只给结论） */
export function buildShareText({ name, relation, result }) {
  const r = result;
  const who = (name || '对方').trim();
  const lines = [
    `我和「${who}」的八字合盘`,
    `契合度 ${r.score} 分 · ${r.counts.he} 处相合 / ${r.counts.chong} 处相冲`,
    '',
    `日主关系：${r.dm.myDayGan} 见 ${r.dm.theirDayGan}（${r.dm.ss}）— ${r.dm.title}`,
  ];
  if (r.positives.length) lines.push('', '相合：' + r.positives.slice(0, 2).map(h => h.text).join('；'));
  if (r.frictions.length) lines.push('留意：' + r.frictions.slice(0, 2).map(h => h.text).join('；'));
  if (r.precision === 'day') lines.push('', '（未知对方时辰，按三柱比对）');
  lines.push('', '合盘用于理解差异、找到沟通方式，不预测关系结局。', '— 问问大师');
  return lines.join('\n');
}

/**
 * 分享：原生分享 → 剪贴板 API → execCommand → 可选中文本弹层。
 * 逐级降级，保证任何环境下用户都拿得到这段文字，
 * 而不是只收到一句「不支持分享」。
 */
export async function shareSynastry(payload) {
  const text = buildShareText(payload);

  if (navigator.share) {
    try { await navigator.share({ title: '八字合盘结果', text }); return; }
    catch (e) {
      // AbortError = 用户主动取消，不再继续降级
      if (e && e.name === 'AbortError') return;
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('合盘结果已复制，可以发给对方');
      return;
    } catch (e) { /* 继续降级 */ }
  }

  if (_legacyCopy(text)) {
    showToast('合盘结果已复制，可以发给对方');
    return;
  }

  _showTextFallback(text);
}

/** 老式 execCommand 复制 */
function _legacyCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

/** 最终兜底：把文本摆出来让用户自己复制 */
function _showTextFallback(text) {
  document.getElementById('tjShareFallback')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'tjShareFallback';
  wrap.className = 'tj-share-fallback';
  wrap.innerHTML =
    '<div class="tj-share-fallback-bg"></div>' +
    '<div class="tj-share-fallback-sheet">' +
      '<div class="tj-share-fallback-title">长按或全选下方文字即可复制</div>' +
      '<textarea class="tj-share-fallback-text" readonly rows="10"></textarea>' +
      '<button type="button" class="tj-share-fallback-close">关闭</button>' +
    '</div>';
  wrap.querySelector('.tj-share-fallback-text').value = text;
  const close = () => wrap.remove();
  wrap.querySelector('.tj-share-fallback-bg').addEventListener('click', close);
  wrap.querySelector('.tj-share-fallback-close').addEventListener('click', close);
  document.body.appendChild(wrap);
  const ta = wrap.querySelector('.tj-share-fallback-text');
  ta.focus(); ta.select();
}

/** 保存本次合盘的对象，便于下次直接选用 */
export function saveSynastryPartner({ name, y, m, d, hourZhi, relation, score }) {
  const nm = (name || '').trim();
  if (!nm) { showToast('请先填写对方称呼再保存'); return null; }
  const rec = savePartner({ name: nm, y, m, d, hourZhi, relation, lastScore: score });
  showToast(rec ? `已保存「${rec.name}」，下次可直接选择` : '保存失败，存储空间可能已满');
  return rec;
}

/** 渲染「最近合盘对象」快捷选择区；点击后回填表单 */
export function partnerPickerHtml() {
  const list = listPartners();
  if (!list.length) return '';
  return '<div class="tj-partner-picker">' +
    '<div class="tj-partner-picker-title">最近合盘对象</div>' +
    '<div class="tj-partner-list">' +
    list.slice(0, 6).map(p =>
      '<button type="button" class="tj-partner-chip" data-partner="' + p.id + '">' +
        '<span class="tj-partner-name">' + _esc(p.name) + '</span>' +
        '<span class="tj-partner-meta">' + _esc(partnerSummary(p)) + '</span>' +
        (typeof p.lastScore === 'number' ? '<span class="tj-partner-score">' + p.lastScore + '</span>' : '') +
        '<span class="tj-partner-del" data-del="' + p.id + '" title="删除" aria-label="删除">×</span>' +
      '</button>'
    ).join('') +
    '</div></div>';
}

function _esc(x) {
  return String(x == null ? '' : x).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
}

/**
 * 绑定选择器交互。
 * @param root      容器元素
 * @param onPick    (partner) => void  选中回调，用于回填表单
 * @param onChange  () => void         列表变动（删除）后回调，用于重绘
 */
export function bindPartnerPicker(root, onPick, onChange) {
  if (!root) return;
  root.addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.preventDefault(); e.stopPropagation();
      deletePartner(del.getAttribute('data-del'));
      showToast('已删除');
      onChange && onChange();
      return;
    }
    const chip = e.target.closest('[data-partner]');
    if (!chip) return;
    const id = chip.getAttribute('data-partner');
    const p = listPartners().find(x => x.id === id);
    if (p) onPick && onPick(p);
  });
}

export { listPartners, partnerSummary };
