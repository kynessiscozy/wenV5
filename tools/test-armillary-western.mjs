import assert from 'node:assert';

console.log('═══════════════════════════════════════════════');
console.log('  西方星相 3D 天象仪与黄道星盘引擎单元测试');
console.log('═══════════════════════════════════════════════\n');

// 模拟 Canvas 2D 渲染上下文
class MockContext2D {
  constructor() {
    this.calls = [];
  }
  setTransform() {}
  clearRect() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  stroke() {}
  fill() {}
  fillRect() {}
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  scale() {}
  setLineDash() {}
  fillText() {}
  quadraticCurveTo() {}
  bezierCurveTo() {}
  createRadialGradient() {
    return { addColorStop() {} };
  }
  createLinearGradient() {
    return { addColorStop() {} };
  }
}

class MockCanvas {
  constructor() {
    this.width = 1200;
    this.height = 800;
    this.ctx = new MockContext2D();
  }
  getContext(type) {
    return type === '2d' ? this.ctx : null;
  }
}

// 模拟浏览器全局环境
global.window = {
  innerWidth: 1200,
  innerHeight: 800,
  devicePixelRatio: 2,
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  performance: { now: () => Date.now() }
};
global.document = {
  documentElement: {
    getAttribute: () => 'dark'
  },
  body: {
    classList: { contains: () => true }
  },
  addEventListener: () => {}
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.performance = { now: () => Date.now() };

async function runTests() {
  const { initArmillaryWestern } = await import('../src/fx/armillary-western.js');

  console.log('【1】3D 天象仪引擎实例化与生命周期接口测试');
  const cv = new MockCanvas();
  const arm = initArmillaryWestern(cv, 'western');

  assert.strictEqual(typeof arm.start, 'function', 'start 必须是函数');
  assert.strictEqual(typeof arm.stop, 'function', 'stop 必须是函数');
  assert.strictEqual(typeof arm.surge, 'function', 'surge 必须是函数');
  assert.strictEqual(typeof arm.center, 'function', 'center 必须是函数');
  assert.strictEqual(typeof arm.setMode, 'function', 'setMode 必须是函数');
  assert.strictEqual(typeof arm.getMode, 'function', 'getMode 必须是函数');

  const center = arm.center();
  assert.strictEqual(typeof center.x, 'number', 'center.x 必须为有效数字');
  assert.strictEqual(typeof center.y, 'number', 'center.y 必须为有效数字');
  assert.ok(center.x > 0 && center.y > 0, '中心点坐标必须位于画布有效区域');
  console.log('  ✓ 核心生命周期接口完备 (start, stop, surge, center, setMode, getMode)');

  console.log('\n【2】多模式切换与状态验证');
  assert.strictEqual(arm.getMode(), 'western', '初始模式应为 western');
  
  arm.setMode('fusion');
  assert.strictEqual(arm.getMode(), 'fusion', '模式应成功切换为 fusion');

  arm.setMode('eastern');
  assert.strictEqual(arm.getMode(), 'eastern', '模式应成功切换为 eastern');

  arm.setMode('western');
  assert.strictEqual(arm.getMode(), 'western', '模式应成功切回 western');
  console.log('  ✓ 模式切换 (western -> fusion -> eastern -> western) 逻辑正确且自洽');

  console.log('\n【3】3D 投影与渲染管线触发测试');
  arm.start();
  arm.surge(1000);
  
  // 等待渲染帧执行
  await new Promise(r => setTimeout(r, 60));
  arm.stop();
  console.log('  ✓ 3D 投影流水线运行正常，无运行时异常');

  console.log('\n═══════════════════════════════════════════════');
  console.log('  全部测试通过！西方星相 3D 天象仪验证 100% 成功');
  console.log('═══════════════════════════════════════════════\n');
}

runTests().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
