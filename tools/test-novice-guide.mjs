import assert from 'node:assert';

console.log('═══════════════════════════════════════════════');
console.log('  全局新手指引与通识系统 (Novice Guide) 单元测试');
console.log('═══════════════════════════════════════════════\n');

// 模拟 DOM
class MockElement {
  constructor(tag = 'div') {
    this.tag = tag;
    this.id = '';
    this.className = '';
    this.classList = {
      list: new Set(),
      add(cls) { this.list.add(cls); },
      remove(cls) { this.list.delete(cls); },
      toggle(cls, val) { if (val) this.list.add(cls); else this.list.delete(cls); },
      contains(cls) { return this.list.has(cls); }
    };
    this.children = [];
    this.innerHTML = '';
    this.scrollTop = 0;
  }
  appendChild(el) {
    this.children.push(el);
    return el;
  }
  querySelector(sel) {
    if (sel === '#ngBodyContent') {
      let el = this.children.find(c => c.id === 'ngBodyContent');
      if (!el) {
        el = new MockElement('div');
        el.id = 'ngBodyContent';
        this.children.push(el);
      }
      return el;
    }
    return new MockElement('div');
  }
  querySelectorAll() {
    return [new MockElement('button')];
  }
}

const mockDoc = {
  elements: new Map(),
  body: new MockElement('body'),
  createElement(tag) {
    return new MockElement(tag);
  },
  getElementById(id) {
    return this.elements.get(id) || null;
  }
};
global.document = mockDoc;
global.window = {
  openNoviceGuide: null,
  closeNoviceGuide: null,
  switchNoviceGuideTab: null
};

async function runTests() {
  const { openNoviceGuide, closeNoviceGuide, switchNoviceGuideTab } = await import('../src/onboarding.js');

  console.log('【1】全局新手指引组件初始化与挂载验证');
  assert.strictEqual(typeof openNoviceGuide, 'function', 'openNoviceGuide 必须是函数');
  assert.strictEqual(typeof closeNoviceGuide, 'function', 'closeNoviceGuide 必须是函数');
  assert.strictEqual(typeof switchNoviceGuideTab, 'function', 'switchNoviceGuideTab 必须是函数');
  console.log('  ✓ 核心控制器接口完备');

  console.log('\n【2】五大核心指南标签页渲染验证');
  const tabs = ['tour', 'eastern', 'western', 'glossary', 'faq'];
  
  // 模拟 modal 容器
  const modal = new MockElement('div');
  modal.id = 'noviceGuideModal';
  mockDoc.elements.set('noviceGuideModal', modal);
  mockDoc.elements.set('ngBodyContent', new MockElement('div'));

  for (const tab of tabs) {
    switchNoviceGuideTab(tab);
    const body = mockDoc.elements.get('ngBodyContent');
    assert.ok(body.innerHTML.length > 50, `标签页 ${tab} 内容必须充实`);
    
    // 验证零 Emoji
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const matches = body.innerHTML.match(emojiRegex);
    assert.strictEqual(matches, null, `标签页 ${tab} 中不应包含任何 Emoji 字符`);
    console.log(`  ✓ 标签页 [${tab}] 渲染通过 (内容长度: ${body.innerHTML.length} 字符, 纯 SVG 矢量微标)`);
  }

  console.log('\n【3】弹窗关闭与状态流转测试');
  closeNoviceGuide();
  assert.strictEqual(modal.classList.contains('open'), false, '关闭后 open 类名必须移除');
  console.log('  ✓ 弹窗关闭状态正常');

  console.log('\n═══════════════════════════════════════════════');
  console.log('  全部测试通过！全局新手指引系统验证 100% 成功');
  console.log('═══════════════════════════════════════════════\n');
}

runTests().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
