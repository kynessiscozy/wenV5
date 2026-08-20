/* ============================================================
   05 layoff · 风险仪表（二级结果页）
   ------------------------------------------------------------
   保留原逻辑：公司信号 / 现金流缓冲 / 求职准备度 → 综合风险分
   （含命盘节奏修正）。
   流程：信号选择（表单内实时预览风险环）→ 生成预案 → 结果页。
   ============================================================ */
import { masthead, notice, esc, viewShell, goResult } from './runtime.js';
import { getCtx } from '../state/context.js';

const SIGNALS = {
  company: {
    label: '公司信号', color: 'var(--tw-r)',
    opts: [
      { v: 1, t: '稳定增长，岗位核心' },
      { v: 2, t: '业务调整，工作可交接' },
      { v: 3, t: '部门收缩或冻结' },
      { v: 4, t: '已出现明确裁撤信号' },
    ],
  },
  buffer: {
    label: '现金流缓冲', color: 'var(--tw-y)',
    opts: [
      { v: 1, t: '6 个月以上' },
      { v: 2, t: '3—6 个月' },
      { v: 3, t: '不足 3 个月' },
    ],
  },
  ready: {
    label: '求职准备度', color: 'var(--tw-b)',
    opts: [
      { v: 1, t: '随时可投递' },
      { v: 2, t: '部分准备' },
      { v: 3, t: '尚未准备' },
    ],
  },
};

const LEVEL = {
  high: { label: '需要立即准备', badge: 'high', actions: ['48 小时内更新简历与作品材料', '整理劳动合同、绩效与项目成果', '建立不少于 3 个外部机会'] },
  mid:  { label: '建议提前预案', badge: 'mid', actions: ['本周更新简历并联系 2 位行业联系人', '盘点可迁移技能和现金流'] },
  low:  { label: '保持观察', badge: 'low', actions: ['每月更新一次成果材料', '保持外部人脉与能力积累'] },
};

export const layoff = {
  id: 'layoff',
  name: '裁员风险检测',
  cat: '财富与事业',
  icon: '险',
  desc: '不做"会不会被裁"的确定性预测。综合公司信号、现金流缓冲与求职准备度，判断应观察、准备还是立即行动。',
  open(container) {
    const ctx = getCtx();
    const sel = { company: 2, buffer: 2, ready: 2 };

    const riskOf = () => {
      const cs = (ctx && typeof ctx.cs === 'number') ? ctx.cs : 60;
      const base = {
        1: 12, 2: 28, 3: 48, 4: 62,
      }[sel.company] + {
        1: 0, 2: 8, 3: 16,
      }[sel.buffer] + {
        1: 0, 2: 6, 3: 12,
      }[sel.ready] + Math.round((70 - cs) * 0.18);
      return Math.max(8, Math.min(92, base));
    };
    const levelOf = r => r >= 65 ? 'high' : r >= 42 ? 'mid' : 'low';

    const ring = (score, color, size) => {
      const r = size / 2 - 10, c = 2 * Math.PI * r;
      const pct = Math.max(0, Math.min(100, score));
      return '<div class="tw-l-ring" style="width:' + size + 'px;height:' + size + 'px">' +
        '<svg viewBox="0 0 ' + size + ' ' + size + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--tw-line-2)" stroke-width="9"/>' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="9" stroke-linecap="butt" ' +
        'stroke-dasharray="' + (c * pct / 100) + ' ' + c + '" style="transition:stroke-dasharray .6s cubic-bezier(.2,.7,.2,1)"/></svg>' +
        '<div class="num" style="font-size:' + (size > 120 ? 30 : 24) + 'px">' + score + '<small>风险指数</small></div></div>';
    };

    const colorOf = r => r >= 65 ? 'var(--tw-r)' : r >= 42 ? 'var(--tw-y)' : 'var(--tw-g)';

    const signalSelHtml = (key) => {
      const s = SIGNALS[key];
      return '<div class="tw-l-signal">' +
        '<div class="hd"><span class="lbl">' + s.label + '</span><span class="lv" id="twLLv-' + key + '">' +
          s.opts.find(o => o.v === sel[key]).t + '</span></div>' +
        '<div class="bar"><i style="width:' + ((sel[key]) / s.opts.length * 100) + '%;background:' + s.color + '"></i></div>' +
        '<div class="tw-l-sel">' + s.opts.map(o =>
          '<button type="button" class="' + (o.v === sel[key] ? 'on' : '') + '" data-k="' + key + '" data-v="' + o.v + '">' + o.t + '</button>').join('') +
        '</div></div>';
    };

    const render = () => {
      container.innerHTML =
        masthead(layoff, { sub: layoff.desc }) +
        viewShell(
          '<div style="display:flex;align-items:center;gap:16px;margin:4px 0 14px">' +
            ring(riskOf(), colorOf(riskOf()), 120) +
            '<div><div class="tw-l-badge ' + LEVEL[levelOf(riskOf())].badge + '">' + LEVEL[levelOf(riskOf())].label + '</div>' +
            '<div class="tw-para" style="margin-top:8px;font-size:12.5px">调整下方三组信号，实时预览风险等级；确定后生成完整预案。</div></div>' +
          '</div>' +
          signalSelHtml('company') + signalSelHtml('buffer') + signalSelHtml('ready') +
          '<div class="tw-actions" style="margin-top:20px">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twLGen">生成行动预案 →</button>' +
          '</div>' +
          notice('<b>方法：</b>现实证据优先，命理只作趋势参考（约 18% 权重）。结果用于风险规划，不代表裁员概率或法律结论。')
        );

      const refresh = () => {
        const form = container.querySelector('.tw-view-form');
        if (!form) return;
        const ringEl = form.querySelector('.tw-l-ring');
        if (ringEl) ringEl.outerHTML = ring(riskOf(), colorOf(riskOf()), 120);
        const badge = form.querySelector('.tw-l-badge');
        if (badge) { badge.className = 'tw-l-badge ' + LEVEL[levelOf(riskOf())].badge; badge.textContent = LEVEL[levelOf(riskOf())].label; }
      };

      container.querySelectorAll('[data-k]').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.k;
          sel[k] = +btn.dataset.v;
          container.querySelectorAll('[data-k="' + k + '"]').forEach(x => x.classList.toggle('on', +x.dataset.v === sel[k]));
          const lv = container.querySelector('#twLLv-' + k);
          if (lv) lv.textContent = SIGNALS[k].opts.find(o => o.v === sel[k]).t;
          const bar = btn.closest('.tw-l-signal').querySelector('.bar i');
          if (bar) bar.style.width = (sel[k] / SIGNALS[k].opts.length * 100) + '%';
          refresh();
        });
      });

      container.querySelector('#twLGen').addEventListener('click', () => {
        const r = riskOf();
        const lv = levelOf(r);
        const L = LEVEL[lv];
        const cs = (ctx && typeof ctx.cs === 'number') ? ctx.cs : 60;
        const color = colorOf(r);
        goResult(container, layoff.name,
          '<div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap">' +
            ring(r, color, 128) +
            '<div><span class="tw-l-badge ' + L.badge + '" style="font-size:15px">' + L.label + '</span>' +
            '<div class="tw-para" style="margin-top:8px">综合公司信号、现金流缓冲与求职准备度，当前风险指数 ' + r + '/100。</div></div>' +
          '</div>' +
          '<div class="tw-rule"></div>' +
          '<div class="tw-kicker">SIGNALS · 信号明细</div>' +
          '<div class="tw-r-rows">' +
            '<div class="it"><b>公司信号</b>　' + SIGNALS.company.opts.find(o => o.v === sel.company).t + '</div>' +
            '<div class="it"><b>现金流缓冲</b>　' + SIGNALS.buffer.opts.find(o => o.v === sel.buffer).t + '</div>' +
            '<div class="it"><b>求职准备度</b>　' + SIGNALS.ready.opts.find(o => o.v === sel.ready).t + '</div>' +
          '</div>' +
          '<div class="tw-rule"></div>' +
          '<div class="tw-kicker">ACTION · 行动方案</div>' +
          '<div class="tw-c-stage">' + L.actions.map((a, i) =>
            '<div class="tw-c-stage-item on"><div class="no">' + String(i + 1).padStart(2, '0') + '</div>' +
            '<p style="margin:0;font-size:13.5px;color:var(--tw-ink-2)">' + a + '</p></div>').join('') +
          '</div>' +
          '<div class="tw-rule"></div>' +
          '<div class="tw-para"><b>命盘节奏参考：</b>当前命盘事业节奏 ' + cs + '/100' +
            (cs >= 70 ? '，节奏支持主动争取，但仍以现实证据与现金安全为先。' : '，节奏偏蓄力，以稳住基本盘、留足缓冲为先。') +
            ' 命理仅作节奏参考，不替代现实证据。</div>'
        );
      });
    };
    render();
  },
};

export default layoff;
