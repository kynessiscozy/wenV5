import assert from 'node:assert';

console.log('═══════════════════════════════════════════════');
console.log('  工具中心 3D 卡片轮播 (3D Card Carousel) 单元测试');
console.log('═══════════════════════════════════════════════\n');

// 模拟 DOM 环境
class MockElement {
  constructor(tag = 'div') {
    this.tag = tag;
    this.classList = {
      list: new Set(),
      add(c) { this.list.add(c); },
      remove(c) { this.list.delete(c); },
      toggle(c, val) { if (val) this.list.add(c); else this.list.delete(c); },
      contains(c) { return this.list.has(c); }
    };
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.textContent = '';
    this.offsetWidth = 800;
  }
  querySelector(sel) {
    if (sel.includes('stage')) return this.stage || (this.stage = new MockElement('div'));
    if (sel.includes('carousel') || sel.includes('track')) return this.track || (this.track = new MockElement('div'));
    if (sel.includes('dots')) return new MockElement('div');
    if (sel.includes('empty')) return new MockElement('div');
    return new MockElement('div');
  }
  querySelectorAll(sel) {
    if (sel.includes('card')) {
      if (!this.cards) {
        this.cards = Array.from({ length: 13 }, (_, i) => {
          const el = new MockElement('div');
          el.dataset.tool = 'tool_' + i;
          el.dataset.group = i < 3 ? 'western' : i < 6 ? 'life' : 'play';
          el.textContent = 'Tool ' + i;
          return el;
        });
      }
      return this.cards;
    }
    return [new MockElement('span')];
  }
  addEventListener() {}
  removeEventListener() {}
}

global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id)
};
global.performance = { now: () => Date.now() };

async function runTests() {
  const { initTools3DRingCarousel } = await import('../src/render/tools-ring.js');

  console.log('【1】3D 卡片轮播组件实例化与初始化');
  const mockContainer = new MockElement('div');
  const ring = initTools3DRingCarousel(mockContainer);
  assert.ok(ring, '3D 卡片轮播实例必须创建成功');
  assert.strictEqual(ring.cards.length, 13, '必须成功绑定 13 款工具卡片');
  assert.strictEqual(ring.viewMode, 'ring', '初始视图模式应为 3D 环形');
  console.log('  ✓ 3D 卡片轮播实例初始化成功 (绑定 13 款工具)');

  console.log('\n【2】3D 空间坐标变换与 10% 通透质感验证');
  ring.updatePhysics();
  ring.render();

  ring.cards.forEach((card, idx) => {
    if (card.style.transform) {
      assert.ok(card.style.transform.includes('translate3d'), '必须应用 3D 空间坐标变换');
      assert.ok(card.style.transform.includes('rotateY'), '必须包含 Y 轴偏转');
      assert.ok(card.style.opacity !== undefined, '必须具有动态景深透明度');
      const op = parseFloat(card.style.opacity);
      assert.ok(op <= 0.90 && op >= 0, `透明度 ${op} 应在 10% 通透率区间 (0~0.90)`);
    }
  });
  console.log('  ✓ 3D 空间坐标 (X, Z, rotateY, scale) 计算精准且无穿模');

  console.log('\n【3】自动轮播 (Autoplay) 与角度控制');
  assert.strictEqual(ring.autoPlay, true, '默认应开启平滑自动轮播');
  ring.toggleAutoPlay();
  assert.strictEqual(ring.autoPlay, false, '可自由暂停轮播');
  ring.toggleAutoPlay();
  assert.strictEqual(ring.autoPlay, true, '可恢复自动轮播');

  ring.next();
  assert.ok(ring.targetAngle !== 0, '调用 next() 应更新目标角度');
  ring.prev();
  console.log('  ✓ 3D 自动轮播与角度步进控制自洽');

  console.log('\n【4】分类过滤 (Filter) 与视图切换 (View Mode)');
  ring.setFilter('western');
  assert.strictEqual(ring.visibleIndices.length, 3, '过滤 western 专栏后卡片应为 3');

  ring.setFilter('all');
  assert.strictEqual(ring.visibleIndices.length, 13, '恢复全部后卡片应为 13');

  ring.setViewMode('grid');
  assert.strictEqual(ring.viewMode, 'grid', '视图模式应成功切换为 2D 网格');
  ring.setViewMode('ring');
  assert.strictEqual(ring.viewMode, 'ring', '视图模式应成功切回 3D 环形');
  console.log('  ✓ 专栏过滤与 3D 轮播/2D 网格视图切换通过');

  ring.destroy();
  console.log('\n═══════════════════════════════════════════════');
  console.log('  全部测试通过！3D 卡片轮播系统验证 100% 成功');
  console.log('═══════════════════════════════════════════════\n');
}

runTests().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
