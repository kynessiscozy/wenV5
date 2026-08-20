/* ============================================================
   11 relation · 双盘对照（二级结果页）
   ------------------------------------------------------------
   保留原逻辑：calcSynastry 引擎全量比对 + 沟通脚本 + 对象保存。
   流程：对方信息表单 → 开始合盘 → 独立结果页（契合度仪表/
   双盘对照/分组折叠/分享保存）。
   ============================================================ */
import { masthead, notice, esc, viewShell, goResult } from './runtime.js';
import { getCtx } from '../state/context.js';
import { calcSynastry } from '../engines/synastry.js';
import { saveSynastryPartner, partnerPickerHtml, bindPartnerPicker } from '../tools/synastry-share.js';
import { showToast } from '../ui/toast.js';

const HOUR_LABELS = ['子 23:00–00:59', '丑 01:00–02:59', '寅 03:00–04:59', '卯 05:00–06:59',
  '辰 07:00–08:59', '巳 09:00–10:59', '午 11:00–12:59', '未 13:00–14:59',
  '申 15:00–16:59', '酉 17:00–18:59', '戌 19:00–20:59', '亥 21:00–22:59'];

const FOCUS_ADVICE = {
  亲密关系: {
    he: '你们的默契是天然的，别把它当理所当然——把想法说出来，默契才不会退化成猜测。',
    mixed: '有合也有冲，说明你们不是「不合适」，而是需要把差异摆到台面上谈。',
    chong: '节奏差异明显。与其磨合性格，不如先约定几件具体的事：谁决定什么、多久沟通一次。',
  },
  朋友合作: {
    he: '配合顺畅，适合一起推进长期项目。建议尽早把分工与收益写清楚，保护这份默契。',
    mixed: '各有所长但工作方式不同，先明确交付标准，再谈协作细节。',
    chong: '容易在方向上分歧。建议只在明确边界的单个项目上合作，先跑通再谈深度绑定。',
  },
  家人沟通: {
    he: '沟通基础好，可以借这个关系去处理家里更难的议题。',
    mixed: '关心是真的，表达方式不同。把「我担心什么」说在前面，比讲道理有效。',
    chong: '容易一说就僵。先谈共同目标（稳定、健康），再谈各自能接受的做法。',
  },
};

const scoreLevel = s => s >= 80 ? { lvl: '契合度高', c: 'var(--tw-g)' } : s >= 65 ? { lvl: '整体顺畅', c: 'var(--tw-b)' }
  : s >= 50 ? { lvl: '有合有冲', c: 'var(--tw-o)' } : s >= 35 ? { lvl: '需要磨合', c: 'var(--tw-y)' } : { lvl: '差异明显', c: 'var(--tw-r)' };

function tone(r) {
  const pos = r.positives.length, neg = r.frictions.length;
  if (pos >= neg * 2 && pos > 0) return 'he';
  if (neg >= pos * 2 && neg > 0) return 'chong';
  return 'mixed';
}

export const relation = {
  id: 'relation',
  name: '八字合盘 · 关系分析',
  cat: '关系与沟通',
  icon: '合',
  desc: '为对方真实排盘，比对日主、五行与干支关系，并给出可直接使用的沟通方案。',
  open(container) {
    const ctx = getCtx();
    const S = { focus: '亲密关系', pname: '', bdate: '', bhour: '', issue: '', goal: '' };

    const ring = (score, color) => {
      const r = 40, c = 2 * Math.PI * r;
      const pct = Math.max(0, Math.min(100, score));
      return '<div class="tw-r-ring-wrap"><div class="ring">' +
        '<svg viewBox="0 0 92 92"><circle cx="46" cy="46" r="' + r + '" fill="none" stroke="var(--tw-line-2)" stroke-width="8"/>' +
        '<circle cx="46" cy="46" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="butt" ' +
        'stroke-dasharray="' + (c * pct / 100) + ' ' + c + '" style="transition:stroke-dasharray .6s cubic-bezier(.2,.7,.2,1)"/></svg>' +
        '<div class="num">' + score + '<small>契合度</small></div></div>' +
        '<div class="copy"><div class="lab">COMPATIBILITY</div>' +
        '<div class="lvl" style="color:' + color + '">' + scoreLevel(score).lvl + '</div>' +
        '<div class="meta" id="twRStat"></div></div></div>';
    };

    const grp = (id, title, sub, body, open) =>
      '<section class="tw-r-grp' + (open ? ' open' : '') + '" data-g="' + id + '">' +
        '<button type="button" class="tw-r-grp-hd" aria-expanded="' + open + '">' +
          '<span class="tt">' + title + '</span>' +
          (sub ? '<span class="sub">' + sub + '</span>' : '') +
          '<span class="arrow">›</span>' +
        '</button>' +
        '<div class="tw-r-grp-bd"><div class="tw-r-grp-in"><div class="inner">' + body + '</div></div></div>' +
      '</section>';

    const rows = arr => '<div class="tw-r-rows">' + arr.map(x =>
      '<div class="it"><b>' + x[0] + '</b>　' + x[1] + '</div>').join('') + '</div>';

    const pillarBlock = (p, label) =>
      '<div class="tw-r-pillar"><div class="k">' + label + '</div>' +
      '<div class="g">' + esc(p.g) + '</div><div class="z">' + esc(p.z) + '</div></div>';

    const renderForm = () => {
      const picker = partnerPickerHtml();
      container.innerHTML =
        masthead(relation, { sub: relation.desc }) +
        viewShell(
          '<div class="tw-field-grid">' +
            '<div class="tw-field"><label>关系类型</label><select id="twRFocus">' +
              ['亲密关系', '朋友合作', '家人沟通'].map(f => '<option' + (f === S.focus ? ' selected' : '') + '>' + f + '</option>').join('') +
            '</select></div>' +
            '<div class="tw-field"><label>对方称呼（可不填）</label><input type="text" id="twRName" placeholder="例如：阿雯" maxlength="12" value="' + esc(S.pname) + '"></div>' +
          '</div>' +
          (picker ? '<div class="tw-r-picker" style="margin-bottom:14px">' + picker + '</div>' : '') +
          '<div class="tw-field-grid">' +
            '<div class="tw-field"><label>对方出生日期</label><input type="date" id="twRDate" value="' + S.bdate + '"></div>' +
            '<div class="tw-field"><label>对方出生时辰</label><select id="twRHour">' +
              '<option value="">时辰不详 · 用三柱比对</option>' +
              HOUR_LABELS.map((h, i) => '<option value="' + i + '"' + (S.bhour === String(i) ? ' selected' : '') + '>' + h + '</option>').join('') +
            '</select></div>' +
          '</div>' +
          '<div class="tw-field"><label>当前卡点（可不填）</label><textarea id="twRIssue" placeholder="例如：对方不回复、分工不清、总是争吵" maxlength="80"></textarea></div>' +
          '<div class="tw-field"><label>希望改善（可不填）</label><input type="text" id="twRGoal" placeholder="例如：把需求说清楚" maxlength="40"></div>' +
          '<div class="tw-actions"><button type="button" class="tw-btn tw-btn-primary" id="twRRun">开始合盘 →</button></div>' +
          notice('<b>精度：</b>不知道对方时辰也能算——日柱（夫妻宫）不依赖时辰，仍为精确计算，核心结论成立；缺时柱主要影响子女宫与晚年节奏的判断。')
        );

      bindPartnerPicker(container, p => {
        S.pname = p.name;
        const set = (id, v) => { const el = container.querySelector(id); if (el) el.value = v; };
        set('#twRName', p.name);
        set('#twRDate', p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0'));
        set('#twRHour', p.hourZhi == null ? '' : String(p.hourZhi));
        if (p.relation) set('#twRFocus', p.relation);
        showToast('已填入「' + p.name + '」');
      }, () => renderForm());

      container.querySelector('#twRFocus')?.addEventListener('change', e => { S.focus = e.target.value; });
      container.querySelector('#twRName')?.addEventListener('input', e => { S.pname = e.target.value; });
      container.querySelector('#twRDate')?.addEventListener('change', e => { S.bdate = e.target.value; });
      container.querySelector('#twRHour')?.addEventListener('change', e => { S.bhour = e.target.value; });
      container.querySelector('#twRIssue')?.addEventListener('input', e => { S.issue = e.target.value; });
      container.querySelector('#twRGoal')?.addEventListener('input', e => { S.goal = e.target.value; });

      container.querySelector('#twRRun').addEventListener('click', run);
    };

    const run = () => {
      if (!S.bdate) { showToast('请填写对方出生日期'); return; }
      const [py, pm, pd] = S.bdate.split('-').map(Number);
      if (!py || !pm || !pd) { showToast('出生日期格式有误'); return; }
      if (py < 1900 || py > new Date().getFullYear()) { showToast('出生年份超出可计算范围'); return; }

      let r;
      try {
        r = calcSynastry({
          myChart: ctx.b,
          myPillars: ['Y', 'M', 'D', 'H'],
          myYongShen: ctx.wx.ys,
          partner: { y: py, m: pm, d: pd, hourZhi: S.bhour === '' ? null : Number(S.bhour) },
        });
      } catch (e) {
        console.error('synastry failed', e);
        showToast('合盘计算失败，请检查输入');
        return;
      }

      const lv = scoreLevel(r.score);
      const partnerGZ = r.partnerPillars.map(k => r.partnerChart[k].g + r.partnerChart[k].z).join(' ');
      const myGZ = ['Y', 'M', 'D', 'H'].map(k => ctx.b[k].g + ctx.b[k].z).join(' ');

      const dp = r.dayPair, dn = [];
      if (dp.same) dn.push('<b>日柱相同</b>，价值观与生活节奏高度接近，容易一拍即合，也容易同时陷入同一个盲区。');
      if (dp.heZhi) dn.push('<b>日支六合</b>——合婚中最被看重的一项，日常相处会自然合拍。');
      if (dp.heGan) dn.push('<b>日干相合</b>，两人表达和决策的方式容易同步。');
      if (dp.chongZhi) dn.push('<b>日支相冲</b>，夫妻宫直接对冲：不代表不能在一起，但生活习惯与安全感需求差别大，需要明确规则而非靠默契。');
      if (dp.chongGan) dn.push('<b>日干相冲</b>，容易在观点上针锋相对。');
      if (dp.haiZhi) dn.push('<b>日支相害</b>，容易因小事累积不满，要有及时说开的习惯。');

      const goalText = S.goal || '把一件事说清楚';
      const scriptHtml = rows([
        ['开场', '“我想把这件事说清楚，不是为了争输赢，而是希望我们更好配合。”'],
        ['表达', '描述事实 → 说出感受 → 提出一个具体请求：' + esc(goalText)],
        ['边界', '如果现在不适合沟通，约定一个明确的回看时间，而不是无限等待。'],
      ]);

      const focusAdvice = (FOCUS_ADVICE[S.focus] || FOCUS_ADVICE['亲密关系'])[tone(r)];

      let H = ring(r.score, lv.c);
      H += grp('chart', '双方命盘', r.precision === 'day' ? '对方时辰不详' : '',
        '<div class="tw-r-panels">' +
          '<div class="tw-r-panel"><div class="hd"><span>你</span><b>' + myGZ + '</b></div>' +
          '<div class="gz">' + ['Y', 'M', 'D', 'H'].map(k => pillarBlock(ctx.b[k], { Y: '年', M: '月', D: '日', H: '时' }[k])).join('') + '</div></div>' +
          '<div class="tw-r-panel"><div class="hd"><span>' + (S.pname || '对方') + '</span><b>' + partnerGZ + '</b></div>' +
          '<div class="gz">' + ['Y', 'M', 'D', 'H'].map(k => r.partnerChart[k] ? pillarBlock(r.partnerChart[k], { Y: '年', M: '月', D: '日', H: '时' }[k]) : '<div class="tw-r-pillar"><div class="k">时</div><div class="g">—</div><div class="z">—</div></div>').join('') + '</div></div>' +
        '</div>', true);

      const core = [];
      core.push(['夫妻宫（日柱）', dn.length ? dn.join('<br>') : '无直接刑冲合害提示，日柱关系中性。']);
      core.push(['五行互补 · 用神「' + r.comp.yongShen + '」', r.comp.text]);
      core.push(['五行占比', ['木', '火', '土', '金', '水'].map(w => w + ' ' + r.myWx.pct[w] + '%/' + r.theirWx.pct[w] + '%').join('　')]);
      H += grp('core', '关键结论', (dn.length ? dn.length + ' 项' : ''), rows(core), true);

      const detail = [];
      if (r.positives.length) detail.push(['相合之处', r.positives.slice(0, 4).map(h => '· ' + h.text + '<span class="tw-tag">' + h.where + '</span>').join('<br>')]);
      if (r.frictions.length) detail.push(['需要留意', r.frictions.slice(0, 4).map(h => '· ' + h.text + '<span class="tw-tag">' + h.where + '</span>').join('<br>')]);
      if (detail.length) H += grp('detail', '逐项依据', (r.positives.length + r.frictions.length) + ' 条', rows(detail), false);

      H += grp('script', '下一次沟通怎么开口', '3 步', scriptHtml, false);

      H += '<div class="tw-rule"></div>';
      H += '<div class="tw-para"><b>接下来怎么做：</b>' + focusAdvice + '</div>';

      if (r.precision === 'day') H += '<div class="tw-rule"></div><div class="tw-para">未填对方时辰，本次用年月日<b>三柱</b>比对。日柱（夫妻宫）不依赖时辰，仍为精确计算，核心结论成立。</div>';

      H += '<div class="tw-actions" style="margin-top:18px">' +
        '<button type="button" class="tw-btn tw-btn-primary" id="twRShare">生成合盘卡</button>' +
        '<button type="button" class="tw-btn tw-btn-ghost" id="twRSave">保存这个人</button>' +
        '<button type="button" class="tw-btn tw-btn-ghost" id="twRText">文字分享</button>' +
      '</div>';

      window._lastSynastry = { name: S.pname, relation: S.focus, result: r, y: py, m: pm, d: pd, hourZhi: S.bhour === '' ? null : Number(S.bhour), score: r.score };

      const result = goResult(container, relation.name, H);

      const stat = result.querySelector('#twRStat');
      if (stat) stat.innerHTML = r.counts.he + ' 处相合 / ' + r.counts.chong + ' 处相冲' + (r.counts.other ? ' / ' + r.counts.other + ' 处刑害' : '') + ' · ' + (r.precision === 'full' ? '四柱比对' : '三柱比对');

      result.querySelectorAll('.tw-r-grp-hd').forEach(hd => {
        hd.addEventListener('click', () => {
          const g = hd.closest('.tw-r-grp');
          const open = g.classList.toggle('open');
          hd.setAttribute('aria-expanded', open);
        });
      });

      result.querySelector('#twRShare').addEventListener('click', async () => {
        const btn = result.querySelector('#twRShare');
        btn.disabled = true; btn.textContent = '生成中…';
        try {
          const { renderShareCard, exportShareCard } = await import('../share/card.js');
          const now = new Date();
          const card = renderShareCard({
            kicker: '八字合盘 · ' + S.focus,
            title: '和「' + (S.pname || '对方') + '」的契合度 ' + r.score + ' 分',
            sub: now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日',
            rows: [
              { k: '日主关系', v: r.dm.myDayGan + ' 见 ' + r.dm.theirDayGan + '（' + r.dm.ss + '）— ' + r.dm.title },
              { k: '相合之处', v: r.positives.slice(0, 2).map(h => h.text).join('；') || '—' },
              { k: '需要留意', v: r.frictions.slice(0, 2).map(h => h.text).join('；') || '—' },
            ],
            quote: r.dm.desc,
            foot: '合盘用于理解差异、找到沟通方式，不预测关系结局。',
          });
          exportShareCard(card, '问问大师_八字合盘');
        } catch (e) { showToast('分享卡生成失败'); }
        btn.disabled = false; btn.textContent = '生成合盘卡';
      });

      result.querySelector('#twRSave').addEventListener('click', () => {
        const rec = saveSynastryPartner({ name: S.pname, y: py, m: pm, d: pd, hourZhi: S.bhour === '' ? null : Number(S.bhour), relation: S.focus, score: r.score });
        if (rec) renderForm();
      });

      result.querySelector('#twRText').addEventListener('click', async () => {
        try {
          const { shareSynastry } = await import('../tools/synastry-share.js');
          shareSynastry({ name: S.pname, relation: S.focus, result: r });
        } catch (e) {}
      });
    };

    renderForm();
  },
};

export default relation;
