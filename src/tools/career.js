import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';

function runCareerTool() {
  const goal = document.getElementById('careerGoal').value;
  const ready = +document.getElementById('careerReady').value;
  const d = getCtx();
  const score = Math.max(35, Math.min(92, Math.round((d.cs * 0.55) + (4 - ready) * 12 + (d.wx.st ? 8 : 2))));

  const steps = {
    1: '开始用小项目、投递或试单验证市场。',
    2: '用 4 周补齐作品、案例或目标行业访谈。',
    3: '先锁定一个细分方向，完成 3 次真实访谈再决定。'
  };

  setToolOutput({
    sections: [
      { type: 'hero', label: '准备度评估', value: score + ' / 100', sub: goal },
      { type: 'divider' },
      { type: 'text', label: '下一步行动', value: steps[ready] || steps[3] },
      { type: 'text', label: '风险提醒', value: '不建议裸辞或大额投入，先保留现金流与退出方案。' },
    ],
    note: '评分结合自评与命盘事业参考，仅供决策参考。'
  });
}

export { runCareerTool };
