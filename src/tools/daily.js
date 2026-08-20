import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';
import { getTodayGZ } from '../engines/bazi.js';

function runDailyTool() {
  const f = document.getElementById('dailyFocus').value;
  const d = getCtx();
  const map = {
    '推进工作': '先完成一项关键推进，再处理零散消息；沟通时用事实和下一步说话。',
    '关系沟通': '选一个双方不疲惫的时间，先表达感受，再提出一个具体期待。',
    '学习积累': '只选一个主题，完成 25 分钟深度输入并记下一个可应用点。',
    '休息恢复': '减少额外安排，保证睡眠与规律饮食，让身体先回到稳定节奏。'
  };

  setToolOutput({
    sections: [
      { type: 'hero', label: '今日干支', value: getTodayGZ() },
      { type: 'row', label: '聚焦方向', value: f },
      { type: 'row', label: '有利元素', value: d.wx.ys },
      { type: 'divider' },
      { type: 'text', label: '今日指引', value: map[f] },
      { type: 'list', label: '行动清单', value: ['只定一件最重要的事', '留出 20 分钟无干扰时间', '晚上复盘是否完成'] },
    ]
  });
}

export { runDailyTool };
