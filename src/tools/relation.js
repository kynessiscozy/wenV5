import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';
import { calcSynastry } from '../engines/synastry.js';
import { showToast } from '../ui/toast.js';

/* ============================================================
   合盘（关系分析）
   旧版只回显了用户自己的分数；现在会真正为对方排盘并逐柱比对。
   ============================================================ */

const FOCUS_ADVICE = {
  亲密关系: {
    he:    '你们的默契是天然的，别把它当理所当然——把想法说出来，默契才不会退化成猜测。',
    mixed: '有合也有冲，说明你们不是「不合适」，而是需要把差异摆到台面上谈。',
    chong: '节奏差异明显。与其磨合性格，不如先约定几件具体的事：谁决定什么、多久沟通一次。',
  },
  朋友合作: {
    he:    '配合顺畅，适合一起推进长期项目。建议尽早把分工与收益写清楚，保护这份默契。',
    mixed: '各有所长但工作方式不同，先明确交付标准，再谈协作细节。',
    chong: '容易在方向上分歧。建议只在明确边界的单个项目上合作，先跑通再谈深度绑定。',
  },
  家人沟通: {
    he:    '沟通基础好，可以借这个关系去处理家里更难的议题。',
    mixed: '关心是真的，表达方式不同。把「我担心什么」说在前面，比讲道理有效。',
    chong: '容易一说就僵。先谈共同目标（healthy、稳定），再谈各自能接受的做法。',
  },
};

function _tone(r) {
  const pos = r.positives.length, neg = r.frictions.length;
  if (pos >= neg * 2 && pos > 0) return 'he';
  if (neg >= pos * 2 && neg > 0) return 'chong';
  return 'mixed';
}

function _scoreLabel(s) {
  if (s >= 80) return '契合度高';
  if (s >= 65) return '整体顺畅';
  if (s >= 50) return '有合有冲';
  if (s >= 35) return '需要磨合';
  return '差异明显';
}

function runRelationTool() {
  const d = getCtx();
  if (!d) { showToast('请先完成个人推演'); return; }

  const name = (document.getElementById('relName')?.value || '').trim() || '对方';
  const focus = document.getElementById('relFocus')?.value || '亲密关系';
  const dateStr = document.getElementById('relDate')?.value || '';
  const hourSel = document.getElementById('relHour')?.value;

  if (!dateStr) { showToast('请填写对方出生日期'); return; }
  const [y, m, dd] = dateStr.split('-').map(Number);
  if (!y || !m || !dd) { showToast('出生日期格式有误'); return; }
  if (y < 1900 || y > new Date().getFullYear()) { showToast('出生年份超出可计算范围'); return; }

  const hourZhi = (hourSel === '' || hourSel == null) ? null : Number(hourSel);

  let r;
  try {
    r = calcSynastry({
      myChart: d.b,
      myPillars: ['Y', 'M', 'D', 'H'],
      myYongShen: d.wx.ys,
      partner: { y, m, d: dd, hourZhi },
    });
  } catch (e) {
    console.error('synastry failed', e);
    showToast('合盘计算失败，请检查输入');
    return;
  }

  const pb = r.partnerChart;
  const gz = k => pb[k].g + pb[k].z;
  const partnerGZ = r.partnerPillars.map(gz).join(' ');
  const myGZ = [d.b.Y, d.b.M, d.b.D, d.b.H].map(p => p.g + p.z).join(' ');

  const sections = [];

  // —— 契合度 ——
  sections.push({
    type: 'hero',
    label: `与「${name}」的${focus}契合度`,
    value: r.score + ' 分',
    sub: _scoreLabel(r.score) + ' · ' +
         `${r.counts.he} 处相合 / ${r.counts.chong} 处相冲` +
         (r.counts.other ? ` / ${r.counts.other} 处刑害` : ''),
  });

  // —— 双方命盘 ——
  sections.push({ type: 'row', label: '你的四柱', value: myGZ });
  sections.push({
    type: 'row',
    label: r.precision === 'full' ? '对方四柱' : '对方三柱',
    value: partnerGZ + (r.precision === 'day' ? '（时柱未知）' : ''),
  });

  // —— 日主关系（夫妻宫核心）——
  sections.push({ type: 'divider' });
  sections.push({
    type: 'text',
    label: `日主关系 · ${r.dm.myDayGan} 见 ${r.dm.theirDayGan}（${r.dm.ss}）`,
    value: `<b>${r.dm.title}</b><br>${r.dm.desc}`,
  });

  // —— 日柱直接互动 ——
  const dp = r.dayPair, dayNotes = [];
  if (dp.same)     dayNotes.push('双方<b>日柱相同</b>，价值观与生活节奏高度接近，容易一拍即合，也容易同时陷入同一个盲区。');
  if (dp.heZhi)    dayNotes.push('<b>日支六合</b>——这是合婚中最被看重的一项，日常相处会自然合拍。');
  if (dp.heGan)    dayNotes.push('<b>日干相合</b>，两人表达和决策的方式容易同步。');
  if (dp.chongZhi) dayNotes.push('<b>日支相冲</b>，夫妻宫直接对冲：不代表不能在一起，但生活习惯与安全感需求差别大，需要明确规则而非靠默契。');
  if (dp.chongGan) dayNotes.push('<b>日干相冲</b>，容易在观点上针锋相对。');
  if (dp.haiZhi)   dayNotes.push('<b>日支相害</b>，容易因小事累积不满，要有及时说开的习惯。');
  if (dayNotes.length) {
    sections.push({ type: 'text', label: '夫妻宫（日柱）直接关系', value: dayNotes.join('<br>') });
  }

  // —— 五行互补 ——
  sections.push({ type: 'divider' });
  sections.push({ type: 'text', label: `五行互补 · 你的用神是「${r.comp.yongShen}」`, value: r.comp.text });
  sections.push({
    type: 'row',
    label: '五行占比对照',
    value: ['木','火','土','金','水']
      .map(w => `${w} ${r.myWx.pct[w]}%/${r.theirWx.pct[w]}%`).join('　'),
  });

  // —— 相合之处 ——
  if (r.positives.length) {
    sections.push({ type: 'divider' });
    sections.push({
      type: 'list',
      label: '相合之处',
      value: r.positives.slice(0, 5).map(h => `${h.text}<span class="tr-tag" style="margin-left:6px">${h.where}</span>`),
    });
  }

  // —— 需要留意 ——
  if (r.frictions.length) {
    sections.push({
      type: 'list',
      label: '需要留意',
      value: r.frictions.slice(0, 5).map(h => `${h.text}<span class="tr-tag" style="margin-left:6px">${h.where}</span>`),
    });
  }

  // —— 行动建议 ——
  sections.push({ type: 'divider' });
  sections.push({
    type: 'text',
    label: '接下来怎么做',
    value: (FOCUS_ADVICE[focus] || FOCUS_ADVICE['亲密关系'])[_tone(r)],
  });

  // —— 精度说明 ——
  if (r.precision === 'day') {
    sections.push({
      type: 'text',
      label: '关于精度',
      value: '未填写对方出生时辰，本次使用<b>年、月、日三柱</b>比对。日柱（夫妻宫）不依赖时辰，仍为精确计算，' +
             '因此核心结论成立；缺少的时柱主要影响<b>子女宫与晚年节奏</b>的判断。补上时辰可得到完整四柱结果。',
    });
  }

  setToolOutput({
    sections,
    note: '合盘用于理解彼此差异、找到沟通方式，不预测关系结局，也不构成是否要开始或结束一段关系的建议。',
  });
}

export { runRelationTool };
