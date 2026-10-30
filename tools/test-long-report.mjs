import assert from 'node:assert';
import { calcWesternChart, calcNumerology } from '../src/engines/western.js';
import { TG, DZ, NY, getNayin } from '../src/engines/shared.js';

console.log('═══════════════════════════════════════════════');
console.log('  全景长报告生成与分享系统 (Long Report) 单元测试');
console.log('═══════════════════════════════════════════════\n');

// 模拟 Canvas 2D 渲染环境
class MockContext2D {
  constructor() {
    this.calls = [];
    this.textCalls = [];
    this.fillStyles = [];
  }
  setTransform() {}
  scale() {}
  clearRect() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  arcTo() {}
  stroke() {}
  fill() { this.fillStyles.push(this.fillStyle); }
  fillRect() {}
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  setLineDash() {}
  fillText(text, x, y, maxWidth) { this.calls.push(text); this.textCalls.push({ text, x, y, maxWidth }); }
  quadraticCurveTo() {}
  bezierCurveTo() {}
  measureText(str) {
    return { width: (str || '').length * 12 };
  }
  createRadialGradient() {
    return { addColorStop() {} };
  }
  createLinearGradient() {
    return { addColorStop() {} };
  }
}

class MockCanvas {
  constructor() {
    this.width = 1680;
    this.height = 3000;
    this.ctx = new MockContext2D();
  }
  getContext(type) {
    return type === '2d' ? this.ctx : null;
  }
  toDataURL() {
    return 'data:image/png;base64,mockLongReportData';
  }
  toBlob(cb) {
    cb(new Blob(['mock'], { type: 'image/png' }));
  }
}

// 模拟 DOM 环境
global.document = {
  documentElement: {
    getAttribute: () => 'light'
  },
  body: {
    getAttribute: () => 'eastern',
    appendChild: () => {},
    classList: { contains: () => true }
  },
  createElement: (tag) => {
    if (tag === 'canvas') return new MockCanvas();
    return {
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      querySelector: () => null,
      querySelectorAll: () => []
    };
  },
  getElementById: () => null
};

global.window = {
  innerWidth: 1200,
  innerHeight: 800,
  devicePixelRatio: 2,
  print: () => {},
  addEventListener: () => {}
};

async function runTests() {
  const { renderLongReportCanvas } = await import('../src/share/long-report.js');

  const mockCtxData = {
    input: { by: 1990, bm: 6, bd: 15, timeStr: '09:00' },
    city: { n: '上海', o: 121.47, a: 31.23 },
    gl: '乾造',
    dg: '辛',
    dw: '金',
    pa: { name: '偏财格' },
    b: {
      Y: { g: '庚', z: '午', ny: '路旁土', cs: '沐浴' },
      M: { g: '壬', z: '午', ny: '杨柳木', cs: '沐浴' },
      D: { g: '辛', z: '亥', ny: '钗钏金', cs: '沐浴' },
      H: { g: '癸', z: '巳', ny: '长流水', cs: '死' }
    },
    wx: { c: { 木: 3, 火: 4, 土: 2, 金: 0, 水: 3 }, ys: '土', xs: '水' },
    ss: { yg: '劫财', mg: '伤官', hg: '食神', yzc: [{ g: '丁', s: '七杀' }] },
    pa: ['印绶格', '财星格'],
    cDy: { g: '丙', z: '戌', as: 12, ae: 21 },
    cLn: { g: '甲', z: '辰' }, cLnSS: '正财', cs: 0, ws: 65, ls: 71,
    zw: { mingGongZhi: 2, ps: [null, null, { m: ['太阴', '天梁'] }] },
    qm: { yangDun: true, ju: 4 }, mh: { benName: '水山蹇' },
    shensha: [{ n: '空亡', v: '寅卯', t: '用于辅助观察' }],
    P: { 辛: {
      core: '逻辑敏锐，条理分明', career: '克制内敛，注重平衡',
      money: '信诺有节，择善而从', love: '精准求证，务实高效', social: '艺术静心，自然放松'
    } }
  };

  console.log('【1】东方全景长报告 Canvas 渲染测试');
  const cvEastern = renderLongReportCanvas(mockCtxData, 'eastern');
  assert.ok(cvEastern, '必须返回有效 Canvas 实例');
  assert.strictEqual(cvEastern.width, 1680, '东方报告宽度应为 1680px (840x2 Retina)');
  assert.ok(cvEastern.height > 1000, '东方报告高度应随内容动态延展');
  const eastCalls = cvEastern.ctx.calls;
  assert.ok(eastCalls.some(text => String(text).includes('命格 印绶格、财星格')));
  for (const expected of ['藏干 丁·七杀', '丙戌 (12~21岁)', '甲辰 · 正财', '0 分', '太阴、天梁', '阳遁4局', '水山蹇']) {
    assert.ok(eastCalls.includes(expected), `东方长报告缺少真实数据 ${expected}`);
  }
  assert.ok(!cvEastern.ctx.fillStyles.includes('#c9a227'), '五行零占比不能画出非零色条');
  assert.ok(!eastCalls.some(text => ['紫微天府', '天辅生门', '风火家人'].includes(text)), '不能用示例三式冒充个人数据');
  assert.throws(() => renderLongReportCanvas({ input: {} }, 'eastern'), /出生信息/);
  console.log(`  ✓ 东方命理长报告渲染成功 (分辨率: ${cvEastern.width}x${cvEastern.height})`);
  console.log('  ✓ 格局、大运年龄、藏干、三式及零值使用真实数据，缺少命盘不生成示例');

  // Exercise the actual drawing path for all 60 pillars, not a copied lookup table.
  const pillarKeys = ['Y', 'M', 'D', 'H'];
  for (let start = 0; start < 60; start += 4) {
    const pillars = Object.fromEntries(pillarKeys.map((key, offset) => {
      const i = start + offset;
      return [key, { ...mockCtxData.b[key], g: TG[i % 10], z: DZ[i % 12] }];
    }));
    const canvas = renderLongReportCanvas({ ...mockCtxData, b: pillars }, 'eastern');
    const printed = canvas.ctx.calls.filter(text => String(text).startsWith('纳音 '));
    assert.deepStrictEqual(printed, NY.slice(start, start + 4).map(ny => '纳音 ' + ny));
  }
  const invalidPillars = Object.fromEntries(pillarKeys.map(key => [key, { ...mockCtxData.b[key], g: '甲', z: '丑' }]));
  const invalidCanvas = renderLongReportCanvas({ ...mockCtxData, b: invalidPillars }, 'eastern');
  assert.deepStrictEqual(invalidCanvas.ctx.calls.filter(text => String(text).startsWith('纳音 ')), Array(4).fill('纳音 —'));
  for (const invalid of ['', '甲丑', '未知', '甲子额外', null, undefined]) assert.strictEqual(getNayin(invalid), '');
  console.log('  ✓ 实际画布绘制覆盖 60 甲子纳音与非法组合回退');

  console.log('\n【2】西方星相全景长报告 Canvas 渲染测试');
  const cvWestern = renderLongReportCanvas(mockCtxData, 'western');
  assert.ok(cvWestern, '必须返回有效 Canvas 实例');
  assert.strictEqual(cvWestern.width, 1680, '西方报告宽度应为 1680px (840x2 Retina)');
  assert.ok(cvWestern.height > 1000, '西方报告高度应随内容动态延展');
  console.log(`  ✓ 西方星相长报告渲染成功 (分辨率: ${cvWestern.width}x${cvWestern.height})`);

  // The drawing pass and its dry run must use the same real midnight and city
  // as the interactive report, rather than a default noon or Beijing chart.
  const midnightCtx = { ...mockCtxData,
    input: { by: 1995, bm: 6, bd: 15, timeStr: '00:30' },
    city: { n: '上海', o: 121.5, a: 31.2 } };
  const midnightImage = renderLongReportCanvas(midnightCtx, 'western');
  const asc = calcWesternChart(1995, 6, 15, 0, 30, 121.5, 31.2).asc.name;
  const noonAsc = calcWesternChart(1995, 6, 15, 12, 30, 121.5, 31.2).asc.name;
  const ascIndex = midnightImage.ctx.calls.indexOf('上升 · 第一名片');
  assert.ok(ascIndex >= 0);
  assert.strictEqual(midnightImage.ctx.calls[ascIndex + 1], asc);
  assert.notStrictEqual(asc, noonAsc);
  assert.throws(() => renderLongReportCanvas({ input: {}, city: {} }, 'western'), /出生信息/);
  assert.ok(midnightImage.ctx.calls.some(text => String(text).includes('Asia/Shanghai')));
  console.log('  ✓ 长报告使用真实午夜与出生地点，缺少信息不生成示例星盘');

  // Use a different sign and a real zero element to catch static/sample data.
  const chartCtx = { ...midnightCtx, input: { ...midnightCtx.input, bm: 7, bd: 12 } };
  const chart = calcWesternChart(1995, 7, 12, 0, 30, 121.5, 31.2);
  const numbers = calcNumerology(1995, 7, 12);
  const calls = renderLongReportCanvas(chartCtx, 'western').ctx.calls;
  const pStart = calls.indexOf('十大星曜落座与宫位');
  const pEnd = calls.indexOf('四象能量与太阳星座模板');
  const planetText = calls.slice(pStart, pEnd);
  const actualPlanets = chart.planets.filter(p => p.key !== 'Asc');
  assert.strictEqual(actualPlanets.length, 10);
  for (const planet of actualPlanets) {
    assert.ok(planetText.includes(planet.zh), `长报告缺少${planet.zh}`);
    assert.ok(planetText.includes(`第${planet.houseNum}宫 · ${planet.degree}`), `${planet.zh}宫位或度数不一致`);
  }
  assert.ok(!planetText.includes('上升'), '上升点不能替代十大行星中的冥王星');
  assert.ok(chart.elemBreakdown.some(e => e.pct === 0));
  assert.ok(calls.includes('0%'), '零占比不能被默认值替换');
  for (const [label, key] of [['行动力', 'action'], ['同理心', 'empathy'], ['洞察力', 'insight'], ['逻辑力', 'logic'], ['创造力', 'creative'], ['坚韧度', 'grit']]) {
    const i = calls.indexOf(label, pEnd);
    assert.strictEqual(calls[i + 1], String(chart.sun.radar[key]), `${label}应与报告太阳星座模板一致`);
  }
  assert.ok(calls.some(text => String(text).includes(`天赋数 ${numbers.talentNums.join('、')} ｜ 生日数 ${numbers.birthdayNum}`)));
  const layout = renderLongReportCanvas(chartCtx, 'western').ctx.textCalls;
  const heading = layout.find(item => item.text === '本命星盘 · 星座与生命灵数');
  assert.equal(heading.maxWidth, 840 - 48 * 2, '标题必须限定在安全宽度内');
  const trioStart = layout.findIndex(item => item.text === '太阳 · 本我驱动');
  const gridTitle = layout.findIndex(item => item.text === '十大星曜落座与宫位');
  const elementTitle = layout.findIndex(item => item.text === '四象能量与太阳星座模板');
  assert.ok(layout.slice(trioStart, gridTitle - 1).every(item => item.y < layout[gridTitle].y - 20), '三核文字不得侵入下一分区');
  assert.ok(layout.slice(gridTitle + 1, elementTitle - 1).every(item => item.y < layout[elementTitle].y - 20), '行星文字不得侵入下一分区');
  const yearStart = calls.findIndex(text => String(text).startsWith('9 年周期流年'));
  const footerStart = calls.findIndex(text => String(text).includes('报告仅供自我探索'));
  assert.ok(calls.slice(yearStart, footerStart).join('').includes(numbers.personalYearGuide.advice), '流年建议应来自同一灵数资料并完整显示');
  console.log('  ✓ 长报告行星、宫位、零占比、六维模板和灵数均与报告数据一致');
  console.log('  ✓ 标题、三核描述、行星与灵数建议留出足够空间');

  console.log('\n【3】多渠道导出接口与容错验证');
  const { exportFullReportImage, copyFullReportImage } = await import('../src/share/long-report.js');
  assert.strictEqual(typeof exportFullReportImage, 'function');
  assert.strictEqual(typeof copyFullReportImage, 'function');
  console.log('  ✓ 导出与复制接口完备');

  console.log('\n═══════════════════════════════════════════════');
  console.log('  全部测试通过！全景长报告分享系统验证 100% 成功');
  console.log('═══════════════════════════════════════════════\n');
}

runTests().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
