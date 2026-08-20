import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';

function runLayoffTool() {
  const signal = +document.getElementById('layoffSignal').value;
  const buffer = +document.getElementById('layoffBuffer').value;
  const market = +document.getElementById('layoffMarket').value;
  const d = getCtx();
  const score = Math.min(95, Math.round(signal * 16 + buffer * 10 + market * 10 + (100 - d.cs) * 0.18));
  const level = score >= 65 ? '需要立即准备' : score >= 42 ? '建议提前预案' : '保持观察';
  const color = score >= 65 ? 'high' : score >= 42 ? 'mid' : 'low';

  const actions = score >= 65
    ? ['48 小时内更新简历与作品材料', '整理劳动合同、绩效与项目成果', '建立不少于 3 个外部机会']
    : score >= 42
      ? ['本周更新简历并联系 2 位行业联系人', '盘点可迁移技能和现金流']
      : ['每月更新一次成果材料', '保持外部人脉与能力积累'];

  setToolOutput({
    sections: [
      { type: 'hero', label: '综合预警', value: score + ' / 100', sub: level },
      { type: 'divider' },
      { type: 'list', label: '行动方案', value: actions },
    ],
    note: '结果用于风险规划，不代表裁员概率或法律结论。'
  });
}

export { runLayoffTool };
