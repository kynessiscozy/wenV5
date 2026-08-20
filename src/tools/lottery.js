import { setToolOutput } from './shared.js';

function runLotteryTool() {
  const t = document.getElementById('lotteryType').value;
  const count = +document.getElementById('lotteryCount').value;
  const unique = (n, max) => {
    const a = [];
    while (a.length < n) { const v = Math.floor(Math.random() * max) + 1; if (!a.includes(v)) a.push(v); }
    return a.sort((x, y) => x - y).map(x => String(x).padStart(2, '0')).join(' · ');
  };

  const sections = [];
  for (let i = 0; i < count; i++) {
    if (t === 'ssq') {
      sections.push({ type: 'text', label: '第 ' + (i + 1) + ' 注', value: '<span style="color:var(--red)">红球 ' + unique(6, 33) + '</span>　<span style="color:var(--teal)">蓝球 ' + unique(1, 16) + '</span>' });
    } else {
      sections.push({ type: 'text', label: '第 ' + (i + 1) + ' 注', value: '<span style="color:var(--red)">前区 ' + unique(5, 35) + '</span>　<span style="color:var(--teal)">后区 ' + unique(2, 12) + '</span>' });
    }
  }

  setToolOutput({
    sections,
    note: '随机组合不提高中奖概率，请仅使用可承受的娱乐预算。'
  });
}

export { runLotteryTool };
