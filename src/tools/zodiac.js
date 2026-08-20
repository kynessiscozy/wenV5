import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';

function runZodiacTool() {
  const d = getCtx();
  const other = document.getElementById('zodiacOther').value;
  const self = d.b.sx;
  const clash = { 鼠:'马', 牛:'羊', 虎:'猴', 兔:'鸡', 龙:'狗', 蛇:'猪', 马:'鼠', 羊:'牛', 猴:'虎', 鸡:'兔', 狗:'龙', 猪:'蛇' };
  const six = { 鼠:'牛', 牛:'鼠', 虎:'猪', 猪:'虎', 兔:'狗', 狗:'兔', 龙:'鸡', 鸡:'龙', 蛇:'猴', 猴:'蛇', 马:'羊', 羊:'马' };
  const groups = [['鼠','龙','猴'], ['牛','蛇','鸡'], ['虎','马','狗'], ['兔','羊','猪']];

  let label, msg;
  if (clash[self] === other) { label = '相冲'; msg = '传统关系中张力较明显，适合把规则、边界和沟通频率提前说清。'; }
  else if (six[self] === other) { label = '六合'; msg = '较容易形成互补与信任，仍需落实到现实分工和回应。'; }
  else if (groups.some(g => g.includes(self) && g.includes(other))) { label = '三合'; msg = '协作与默契基础较好，适合共同推进长期目标。'; }
  else if (self === other) { label = '同属相'; msg = '容易有共鸣，也可能在相似的固执点上拉扯。'; }
  else { label = '平和'; msg = '没有直接合冲提示，关键仍是价值观、沟通方式与现实配合。'; }

  setToolOutput({
    sections: [
      { type: 'hero', label: '关系判定', value: label },
      { type: 'divider' },
      { type: 'row', label: '你', value: self },
      { type: 'row', label: '对方', value: other },
      { type: 'divider' },
      { type: 'text', label: '解读', value: msg },
    ],
    note: '生肖仅是传统参考，不应替代对具体关系的观察。'
  });
}

export { runZodiacTool };
