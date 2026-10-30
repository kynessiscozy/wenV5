import { setToolOutput } from './shared.js';
import { drawLotteryRows } from '../engines/lottery.js';

function runLotteryTool() {
  const t = document.getElementById('lotteryType').value;
  const count = +document.getElementById('lotteryCount').value;
  const format = numbers => numbers.map(x => String(x).padStart(2, '0')).join(' · ');
  // The historical for-loop rounded a positive fractional count up.
  const sections = drawLotteryRows(t, Math.ceil(count)).map(row => {
    const redLabel = t === 'ssq' ? '红球 ' : '前区 ';
    const blueLabel = t === 'ssq' ? '蓝球 ' : '后区 ';
    return { type: 'text', label: '第 ' + row.idx + ' 注', value: '<span style="color:var(--red)">' + redLabel + format(row.red) + '</span>　<span style="color:var(--teal)">' + blueLabel + format(row.blue) + '</span>' };
  });

  setToolOutput({
    sections,
    note: '随机组合不提高中奖概率，请仅使用可承受的娱乐预算。'
  });
}

export { runLotteryTool };
