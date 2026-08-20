import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';

function runWealthTool() {
  const income = +document.getElementById('wealthIncome').value;
  const cost = +document.getElementById('wealthCost').value;
  const cash = +document.getElementById('wealthCash').value;
  const d = getCtx();

  if (!income || cost < 0) {
    setToolOutput('请先填写有效的月到手收入与固定支出。');
    return;
  }

  const surplus = Math.max(0, income - cost);
  const months = cost ? Math.floor(cash / cost) : 0;
  const rate = Math.round(surplus / income * 100);
  const advice = months < 3
    ? '先补足 3—6 个月应急金，再考虑高波动配置。'
    : rate < 20
      ? '先优化固定支出或提升收入，把结余率提升至 20% 以上。'
      : '可在应急金外分层安排长期目标资金。';

  setToolOutput({
    sections: [
      { type: 'hero', label: '每月结余', value: '¥ ' + surplus.toLocaleString(), sub: '结余率 ' + rate + '%' },
      { type: 'divider' },
      { type: 'row', label: '月到手收入', value: '¥ ' + income.toLocaleString() },
      { type: 'row', label: '月固定支出', value: '¥ ' + cost.toLocaleString() },
      { type: 'row', label: '储蓄覆盖月数', value: months + ' 个月' },
      { type: 'row', label: '命盘财运参考', value: d.ws + ' / 100' },
      { type: 'divider' },
      { type: 'text', label: '优先行动', value: advice },
    ],
    note: '命盘评分仅用于节奏提醒，不替代理财规划。'
  });
}

export { runWealthTool };
