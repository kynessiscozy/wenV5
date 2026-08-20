/* ============================================================
   01 wealth · 现金流罗盘
   ------------------------------------------------------------
   保留原逻辑：收入/支出/储蓄 → 结余、结余率、应急金分层建议，
   并叠加命盘财运评分与流日周节奏提示。
   新形态：半圆仪表盘（结余率）+ 分层资金条（应急/长期/机动）
   + 滑块输入实时联动（增量更新，不重建 DOM）。
   ============================================================ */
import { masthead, notice, attachToolAI } from './runtime.js';
import { getCtx } from '../state/context.js';
import { calcLiuRi } from '../engines/liuri.js';

export const wealth = {
  id: 'wealth',
  name: '财运与理财罗盘',
  cat: '财富与事业',
  icon: '财',
  desc: '把命盘节奏和真实现金流放在一起看，先建立安全垫，再安排增长。',
  open(container) {
    const ctx = getCtx();
    const ws = (ctx && typeof ctx.ws === 'number') ? ctx.ws : 60;
    const ys = (ctx && ctx.wx && ctx.wx.ys) || '土';

    const S = { income: 15000, cost: 8000, cash: 60000 };

    const fmt = v => '¥ ' + Math.round(v).toLocaleString();
    const w10 = v => Math.round(v / 10000 * 10) / 10 + 'w';

    /* —— 半圆仪表 —— */
    const gaugeHtml = (pct, label) => {
      const cx = 150, cy = 132, r = 104;
      const rad = (pct / 100) * Math.PI;
      const x2 = cx + r * Math.cos(Math.PI - rad);
      const y2 = cy - r * Math.sin(Math.PI - rad);
      const large = pct > 50 ? 1 : 0;
      const arc = pct <= 0 ? '' :
        '<path d="M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 +
        '" fill="none" stroke="var(--tw-accent)" stroke-width="14" stroke-linecap="round" style="transition:all .5s cubic-bezier(.2,.7,.2,1)"/>';
      return '<div class="tw-w-gauge"><svg viewBox="0 0 300 152" style="max-width:300px">' +
        '<path d="M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 1 1 ' + (cx + r) + ' ' + cy + '" fill="none" stroke="var(--tw-line-2)" stroke-width="14"/>' +
        arc +
        '<text x="150" y="112" text-anchor="middle" font-size="36" font-weight="800" font-family="Noto Serif SC, serif" fill="var(--tw-ink)">' + label + '</text>' +
        '<text x="150" y="138" text-anchor="middle" font-size="10" letter-spacing="4" fill="var(--tw-ink-3)">MONTHLY RATE</text>' +
        '</svg></div>';
    };

    /* —— 当前计算结果 —— */
    const compute = () => {
      const surplus = Math.max(0, S.income - S.cost);
      const months = S.cost > 0 ? Math.floor(S.cash / S.cost) : 99;
      const rate = S.income > 0 ? Math.round(surplus / S.income * 100) : 0;
      const emTarget = S.cost * 6;
      const em = Math.min(S.cash, emTarget);
      const lg = Math.max(0, Math.min(S.cash - em, S.cost * 24 - em));
      const flex = Math.max(0, S.cash - em - lg);
      const total = Math.max(1, S.cash);
      return { surplus, months, rate, em, lg, flex, total, pct: v => Math.round(v / total * 100) };
    };

    const adviceOf = (c) => {
      if (c.months < 3) return { big: '先补足应急金', text: '储蓄覆盖 ' + c.months + ' 个月固定支出，低于 3 个月安全线。任何安排都以"先稳住"为前提，不建议新增高波动投入。' };
      if (c.rate < 20) return { big: '结余率偏低 · 先优化结构', text: '结余率 ' + c.rate + '%，低于 20% 建议线。优先优化固定支出或提升稳定收入，把结余先做出来。' };
      return { big: '结构健康 · 分层配置', text: '应急金已覆盖 ' + c.months + ' 个月支出，可在应急金外分层安排长期目标资金，避免留在活期被消耗。' };
    };

    /* —— 周节奏（流日引擎） —— */
    let weekAct = '按固定节奏推进财务动作，不因单日情绪改变计划。';
    try {
      if (ctx && ctx.b && ys) {
        const lr = calcLiuRi(ctx.b, ys);
        weekAct = lr.tone === 'flow' ? '本周推进阻力小，适合把账目整理、转存这类事项一次办完。'
          : lr.tone === 'steady' ? '本周按计划处理财务事项即可，不必临时加码。'
          : lr.tone === 'friction' ? '本周容易有临时变动，大额操作缓一缓，先核对信息。'
          : '本周宜收不宜动，财务决定往后放几天更稳。';
      }
    } catch (e) {}

    /* —— 初始渲染 —— */
    const c = compute();
    container.innerHTML =
      masthead(wealth, { sub: wealth.desc }) +
      '<div id="twWGauge">' + gaugeHtml(c.rate, c.rate + '%') + '</div>' +

      '<div class="tw-w-slider-row">' +
        '<div class="tw-w-slider-head"><span class="lbl">月到手收入</span><span class="val" id="twWInL">' + fmt(S.income) + '</span></div>' +
        '<input type="range" class="tw-w-range" id="twWIn" min="0" max="100000" step="1000" value="' + S.income + '">' +
      '</div>' +
      '<div class="tw-w-slider-row">' +
        '<div class="tw-w-slider-head"><span class="lbl">月固定支出</span><span class="val" id="twWCoL">' + fmt(S.cost) + '</span></div>' +
        '<input type="range" class="tw-w-range" id="twWCo" min="0" max="80000" step="500" value="' + S.cost + '">' +
      '</div>' +
      '<div class="tw-w-slider-row">' +
        '<div class="tw-w-slider-head"><span class="lbl">现有储蓄</span><span class="val" id="twWCaL">' + fmt(S.cash) + '</span></div>' +
        '<input type="range" class="tw-w-range" id="twWCa" min="0" max="500000" step="5000" value="' + S.cash + '">' +
      '</div>' +

      '<div class="tw-w-layers">' +
        '<div class="tw-h3">储蓄分层</div>' +
        '<div class="tw-w-layers-bar" id="twWBar">' +
          '<i style="width:' + c.pct(c.em) + '%;background:var(--tw-g)" title="应急"></i>' +
          '<i style="width:' + c.pct(c.lg) + '%;background:var(--tw-accent)" title="长期"></i>' +
          '<i style="width:' + c.pct(c.flex) + '%;background:var(--tw-b)" title="机动"></i>' +
        '</div>' +
        '<div class="tw-w-layers-legend" id="twWLegend">' +
          '<span><i style="background:var(--tw-g)"></i>应急 ' + w10(c.em) + '</span>' +
          '<span><i style="background:var(--tw-accent)"></i>长期 ' + w10(c.lg) + '</span>' +
          '<span><i style="background:var(--tw-b)"></i>机动 ' + w10(c.flex) + '</span>' +
        '</div>' +
      '</div>' +

      '<div class="tw-w-verdict" id="twWVerdict">' +
        '<div class="big">' + adviceOf(c).big + '</div>' +
        '<p>' + adviceOf(c).text + '</p>' +
      '</div>' +

      '<div class="tw-rule"></div>' +
      '<div class="tw-para" id="twWStat"><b>储蓄覆盖：</b>' + c.months + ' 个月固定支出　<b>本月节奏：</b>' + weekAct + '</div>' +
      '<div class="tw-para" style="margin-top:6px"><b>命盘财运参考：</b>' + ws + '/100' +
        (ws >= 70 ? '，当前节奏对积累相对有利，但仍以现实现金流为准。' : ws >= 50 ? '，节奏中性，重点在执行纪律而非择时。' : '，节奏偏守，减少动作、守住本金优先。') +
      '</div>' +
      '<div class="tw-actions" id="twWAI"></div>' +
      notice('<b>边界：</b>本工具不提供投资金额、收益率或具体产品推荐，仅帮助整理财富节奏。');

    /* —— 滑块联动：只更新动态区，不重建 DOM —— */
    const update = () => {
      const cc = compute();
      const g = container.querySelector('#twWGauge');
      if (g) g.innerHTML = gaugeHtml(cc.rate, cc.rate + '%');
      const set = (id, v) => { const el = container.querySelector(id); if (el) el.textContent = v; };
      set('#twWInL', fmt(S.income)); set('#twWCoL', fmt(S.cost)); set('#twWCaL', fmt(S.cash));
      const bar = container.querySelector('#twWBar');
      if (bar) bar.innerHTML =
        '<i style="width:' + cc.pct(cc.em) + '%;background:var(--tw-g)"></i>' +
        '<i style="width:' + cc.pct(cc.lg) + '%;background:var(--tw-accent)"></i>' +
        '<i style="width:' + cc.pct(cc.flex) + '%;background:var(--tw-b)"></i>';
      const legend = container.querySelector('#twWLegend');
      if (legend) legend.innerHTML =
        '<span><i style="background:var(--tw-g)"></i>应急 ' + w10(cc.em) + '</span>' +
        '<span><i style="background:var(--tw-accent)"></i>长期 ' + w10(cc.lg) + '</span>' +
        '<span><i style="background:var(--tw-b)"></i>机动 ' + w10(cc.flex) + '</span>';
      const vd = container.querySelector('#twWVerdict');
      if (vd) vd.innerHTML = '<div class="big">' + adviceOf(cc).big + '</div><p>' + adviceOf(cc).text + '</p>';
      const st = container.querySelector('#twWStat');
      if (st) st.innerHTML = '<b>储蓄覆盖：</b>' + cc.months + ' 个月固定支出　<b>本月节奏：</b>' + weekAct;
    };

    container.querySelector('#twWIn').addEventListener('input', e => { S.income = +e.target.value; update(); });
    container.querySelector('#twWCo').addEventListener('input', e => { S.cost = +e.target.value; update(); });
    container.querySelector('#twWCa').addEventListener('input', e => { S.cash = +e.target.value; update(); });

    attachToolAI({
      root: container,
      typeLabel: wealth.name,
      getSource: () => ((container.querySelector('#twWVerdict')?.innerText || '') + ' ' + (container.querySelector('#twWStat')?.innerText || '')).slice(0, 1800),
      slot: container.querySelector('#twWAI'),
    });
  },
};

export default wealth;
