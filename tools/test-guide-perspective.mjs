import assert from 'node:assert/strict';
import { buildGuidePerspective } from '../src/ui/guide-perspective.js';

const ctx = Object.freeze({
  dg: '甲', dw: '木', wx: Object.freeze({ ys: '水' }),
  b: Object.freeze({ M: Object.freeze({ g: '丙', z: '寅' }), D: Object.freeze({ g: '甲', z: '子' }) }),
  cDy: Object.freeze({ g: '丁', z: '卯' }), cLn: Object.freeze({ g: '丙', z: '午' }),
  scores: Object.freeze({ career: 61, love: 77 }),
});
const western = Object.freeze({ astro: Object.freeze({ sun: Object.freeze({ name: '双子座' }),
  moon: Object.freeze({ name: '处女座' }), asc: Object.freeze({ name: '天秤座' }) }) });
const before = JSON.stringify({ ctx, western });
const guides = ['diyan', 'yuchen', 'moonfox', 'xingling'].map(id => buildGuidePerspective(id, ctx, western));
assert.deepEqual(guides.map(guide => guide.focus), ['行动与优先级', '节奏与资源', '线索与依据', '关系与沟通']);
assert.equal(new Set(guides.map(guide => guide.prompt)).size, 4);
assert.ok(guides[0].eastern.includes('日主 甲木') && guides[0].eastern.includes('用神 水'));
assert.ok(guides[1].eastern.includes('大运 丁卯') && guides[1].eastern.includes('流年 丙午'));
assert.ok(guides[2].eastern.includes('月柱 丙寅') && guides[2].eastern.includes('日柱 甲子'));
assert.ok(guides[3].eastern.includes('日支 子'));
assert.ok(guides[3].western.includes('月亮 处女座') && guides[3].western.includes('上升 天秤座'));
assert.equal(JSON.stringify({ ctx, western }), before, '不同视角不得修改计算结果或输入');
assert.equal(buildGuidePerspective('unknown', ctx, western), null);
const empty = buildGuidePerspective('moonfox');
assert.equal(empty.eastern, '');
assert.equal(empty.western, '');
assert.ok(empty.prompt, '缺少数据仍可显示阅读方式，但不虚构命盘');
console.log('✓ 四种引路人视角各不相同，只读取现有依据且不改变命盘');
