import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';

function runNameTool() {
  const s = document.getElementById('nameSurname').value.trim() || '你的姓氏';
  const style = document.getElementById('nameStyle').value;
  const d = getCtx();
  const chars = { 木: ['栩','森','苒'], 火: ['昭','昕','晗'], 土: ['安','屹','予'], 金: ['知','钰','书'], 水: ['澄','泓','沅'] }[d.wx.ys];
  const tails = style === '温润典雅' ? ['宁','言','清'] : style === '大气坚定' ? ['远','承','衡'] : ['然','一','可'];
  const names = chars.map((x, i) => s + x + tails[i]);

  setToolOutput({
    sections: [
      { type: 'row', label: '用字方向', value: d.wx.ys + ' 属性' },
      { type: 'row', label: '风格偏好', value: style },
      { type: 'divider' },
      { type: 'tag', label: '灵感推荐', value: names },
    ],
    note: '请进一步核对读音、重名、字义、家族习惯及当地命名规范。'
  });
}

export { runNameTool };
