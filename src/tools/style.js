import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';

function runStyleTool() {
  const scene = document.getElementById('styleScene').value;
  const d = getCtx();
  const map = {
    '重要沟通': '选择低饱和、有质感的 ' + d.wx.ys + ' 属性配色；桌面只保留沟通资料与纸笔。',
    '面试汇报': '穿搭强调整洁与可信赖感；工位或会议桌朝向明亮处，提前整理要点。',
    '专注工作': '使用 ' + d.wx.ys + ' 属性的小面积色彩作为提示，关闭无关通知并保持桌面留白。',
    '休息恢复': '减少视觉刺激，选择舒适材质与柔和光线，优先恢复睡眠和饮食节奏。'
  };

  setToolOutput({
    sections: [
      { type: 'row', label: '场景', value: scene },
      { type: 'row', label: '有利属性', value: d.wx.ys },
      { type: 'divider' },
      { type: 'text', label: '方案建议', value: map[scene] },
    ],
    note: '颜色与环境建议用于状态提醒，舒适、整洁和可持续使用优先。'
  });
}

export { runStyleTool };
