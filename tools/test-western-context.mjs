import assert from 'node:assert/strict';
import { calcWesternChart } from '../src/engines/western.js';
import { getWesternProfile } from '../src/engines/western-context.js';
import { buildWesternContext } from '../src/ai/smart-answer.js';
import { CD } from '../src/engines/cities.js';

assert.equal(getWesternProfile(null), null);
assert.equal(getWesternProfile({}), null);
assert.equal(getWesternProfile({ input: { by: 1995, bm: 6, bd: 15, timeStr: '00:30' } }), null, '不能以默认地点冒充用户出生地');
assert.match(buildWesternContext({}), /尚未提供完整出生信息/);
for (const bad of [
  { by: 1995, bm: 2, bd: 29, timeStr: '00:30' },
  { by: 1995, bm: 6, bd: 15, timeStr: '' },
  { by: 1995, bm: 6, bd: 15, timeStr: '24:00' },
]) assert.equal(getWesternProfile({ input: bad, city: CD.shanghai }), null);

const ctx = { input: { by: 1995, bm: 6, bd: 15, timeStr: '00:30' }, city: CD.shanghai };
const midnight = getWesternProfile(ctx);
const expected = calcWesternChart(1995, 6, 15, 0, 30, CD.shanghai.o, CD.shanghai.a);
const wrongNoon = calcWesternChart(1995, 6, 15, 12, 30, CD.shanghai.o, CD.shanghai.a);
assert.deepEqual(midnight.chart.planets.map(p => p.absDegree), expected.planets.map(p => p.absDegree));
assert.notEqual(midnight.chart.asc.name, wrongNoon.asc.name, '测试样本的午夜和中午上升星座必须不同');
assert.strictEqual(getWesternProfile(ctx), midnight, '同一份报告可复用星盘与灵数');
assert.match(buildWesternContext(ctx), new RegExp('上升 .*' + expected.asc.name));
ctx.input.timeStr = '12:30';
const noon = getWesternProfile(ctx);
assert.notStrictEqual(noon, midnight, '时间变化后不能复用旧星盘');
assert.equal(noon.chart.asc.name, wrongNoon.asc.name);
ctx.input.timeStr = '00:30';
ctx.city = CD.newyork;
const moved = getWesternProfile(ctx);
assert.notStrictEqual(moved, midnight, '地点变化后不能复用旧星盘');
assert.equal(moved.chart.asc.name, calcWesternChart(1995, 6, 15, 0, 30, CD.newyork.o, CD.newyork.a, -4).asc.name);
console.log('✓ 西方依据不伪造出生资料，午夜与地点同源，缓存可随输入失效');
