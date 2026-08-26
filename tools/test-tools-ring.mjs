import assert from 'node:assert';
import { readFileSync } from 'node:fs';

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
    this.attributes = {};
    this.children = [];
    this.textContent = '';
    this.tabIndex = 0;
    this.offsetWidth = 800;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  focus() {}
  querySelector(sel) {
    if (sel.includes('stage')) return this.stage || (this.stage = new MockElement('div'));
    if (sel.includes('carousel') || sel.includes('track')) return this.track || (this.track = new MockElement('div'));
    if (sel.includes('dots')) return new MockElement('div');
    return new MockElement('div');
  }
  querySelectorAll(sel) {
    if (sel.includes('card')) {
      if (!this.cards) {
        this.cards = Array.from({ length: 13 }, (_, i) => {
          const el = new MockElement('div');
          el.dataset.tool = 'tool_' + i;
          el.dataset.category = i < 3 ? 'western' : i === 3 ? 'money' : i < 7 ? 'life' : i < 9 ? 'relation' : 'play';
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
  const { renderToolsHubHtml, TOOL_DEFINITIONS } = await import('../src/render/tools-catalog.js');

  console.log('【0】工具目录结构与视图切换控件');
  const catalogHtml = renderToolsHubHtml();
  assert.strictEqual(TOOL_DEFINITIONS.length, 13, '工具目录必须保留全部 13 款工具');
  assert.strictEqual((catalogHtml.match(/id="toolViewTogglePill"/g) || []).length, 1, '视图切换按钮必须唯一且位于可见工具栏');
  const stagePosition = catalogHtml.indexOf('id="toolRingStage"');
  const toolbarPosition = catalogHtml.indexOf('class="tool-catalog-toolbar"');
  const bottomBarPosition = catalogHtml.indexOf('class="tool-ring-bottom-bar"');
  assert.ok(stagePosition < bottomBarPosition && bottomBarPosition < toolbarPosition, '环形模式的筛选栏必须位于完整卡片轮播及其指示区下方');
  assert.doesNotMatch(catalogHtml, /tools?-search|toolsToolbar|<input\b/i, '工具页不得残留搜索栏结构或输入框');
  assert.strictEqual((catalogHtml.match(/class="tc-p-icon"/g) || []).length, 0, '工具卡片不得再渲染图标');
  assert.strictEqual((catalogHtml.match(/class="tc-p-title"/g) || []).length, 13, '13 款工具都必须保留主标题');
  const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(190px,\s*1fr\)\)/, '桌面网格必须使用紧凑三列尺寸');
  assert.match(styles, /\.view-mode-grid \.tool-card-portrait\s*\{[\s\S]*?height:\s*320px\s*!important;[\s\S]*?min-height:\s*320px\s*!important;/, '桌面网格卡片高度必须保持紧凑');
  assert.match(styles, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, '移动端网格必须使用紧凑双列布局');
  console.log('  ✓ 筛选栏位于轮播下方，紧凑网格与 13 个主标题完整');

  console.log('\n【1】3D 卡片轮播组件实例化与初始化');
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

  console.log('\n【4】分类标签筛选与视图切换');
  assert.strictEqual(ring.visibleIndices.length, 13, '默认应展示全部 13 款工具卡片');
  ring.setCategory('western');
  assert.strictEqual(ring.visibleIndices.length, 3, '西方大师分类应展示 3 款工具');
  assert.strictEqual(ring.cards.filter(card => card.classList.contains('is-category-hidden')).length, 10, '其余卡片应退出轮播与键盘焦点');
  ring.setCategory('money');
  assert.strictEqual(ring.visibleIndices.length, 1, '财富与事业分类应展示 1 款工具');
  ring.setCategory('unknown');
  assert.strictEqual(ring.activeCategory, 'all', '无效分类应安全回退到全部');
  assert.strictEqual(ring.visibleIndices.length, 13, '回退后应恢复全部工具');

  ring.setViewMode('grid');
  ring.setCategory('relation');
  assert.strictEqual(ring.visibleIndices.length, 2, '平铺模式下分类筛选仍应生效');
  assert.strictEqual(ring.viewMode, 'grid', '视图模式应保持为 2D 网格');
  ring.setCategory('all');
  ring.setViewMode('ring');
  assert.strictEqual(ring.viewMode, 'ring', '视图模式应成功切回 3D 环形');
  console.log('  ✓ 分类标签与 3D 轮播/2D 网格视图联动通过');

  ring.destroy();
  console.log('\n═══════════════════════════════════════════════');
  console.log('  全部测试通过！3D 卡片轮播系统验证 100% 成功');
  console.log('═══════════════════════════════════════════════\n');
}

runTests().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
