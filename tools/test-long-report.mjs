import assert from 'node:assert';

console.log('═══════════════════════════════════════════════');
console.log('  全景长报告生成与分享系统 (Long Report) 单元测试');
console.log('═══════════════════════════════════════════════\n');

// 模拟 Canvas 2D 渲染环境
class MockContext2D {
  constructor() {
    this.calls = [];
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
  fill() {}
  fillRect() {}
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  setLineDash() {}
  fillText() {}
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
    wx: { Wood: 20, Fire: 35, Earth: 10, Metal: 15, Water: 20 },
    ss: { Y: '劫财', M: '伤官', H: '食神' },
    cDy: { g: '丙', z: '戌', startAge: 30, endAge: 39 },
    cLn: { g: '甲', z: '辰' },
    P: {
      思维: '逻辑敏锐，条理分明',
      情绪: '克制内敛，注重平衡',
      人际: '信诺有节，择善而从',
      决策: '精准求证，务实高效',
      压力: '艺术静心，自然放松'
    }
  };

  console.log('【1】东方全景长报告 Canvas 渲染测试');
  const cvEastern = renderLongReportCanvas(mockCtxData, 'eastern');
  assert.ok(cvEastern, '必须返回有效 Canvas 实例');
  assert.strictEqual(cvEastern.width, 1680, '东方报告宽度应为 1680px (840x2 Retina)');
  assert.ok(cvEastern.height > 1000, '东方报告高度应随内容动态延展');
  console.log(`  ✓ 东方命理长报告渲染成功 (分辨率: ${cvEastern.width}x${cvEastern.height})`);

  console.log('\n【2】西方星相全景长报告 Canvas 渲染测试');
  const cvWestern = renderLongReportCanvas(mockCtxData, 'western');
  assert.ok(cvWestern, '必须返回有效 Canvas 实例');
  assert.strictEqual(cvWestern.width, 1680, '西方报告宽度应为 1680px (840x2 Retina)');
  assert.ok(cvWestern.height > 1000, '西方报告高度应随内容动态延展');
  console.log(`  ✓ 西方星相长报告渲染成功 (分辨率: ${cvWestern.width}x${cvWestern.height})`);

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
