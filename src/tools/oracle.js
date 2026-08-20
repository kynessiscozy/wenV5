import { setToolOutput } from './shared.js';

function runOracleTool() {
  const q = document.getElementById('oracleQuestion').value.trim() || '你心中的问题';
  const area = document.getElementById('oracleArea').value;
  const pool = [
    '先做最小的一步，再观察反馈。',
    '信息未齐时，暂缓承诺比仓促决定更好。',
    '适合主动沟通，把期待说清楚。',
    '把注意力放回能控制的行动上。',
    '保持节奏，长期积累会带来答案。',
    '先完成准备，再要求结果。'
  ];
  const pick = () => pool[Math.floor(Math.random() * pool.length)];

  setToolOutput({
    sections: [
      { type: 'row', label: '问题领域', value: area },
      { type: 'row', label: '关于', value: '「' + q + '」' },
      { type: 'divider' },
      { type: 'text', label: '① 当下', value: pick() },
      { type: 'text', label: '② 行动', value: pick() },
      { type: 'text', label: '③ 提醒', value: pick() },
    ],
    note: '签文用于整理思路与自我反思，不替代事实判断。'
  });
}

export { runOracleTool };
