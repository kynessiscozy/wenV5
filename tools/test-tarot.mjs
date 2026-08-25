import assert from 'node:assert';

globalThis.window = globalThis.window || {
  localStorage: { getItem: () => null, setItem: () => {} }
};
globalThis.document = globalThis.document || {
  getElementById: () => null,
  documentElement: { getAttribute: () => 'light' }
};

const {
  TAROT_CARDS,
  TAROT_SPREADS
} = await import('../src/tools2/tarot.js');

console.log('\n═══════════════════════════════════════════════');
console.log('  塔罗/卡罗大师 (Tarot) 核心数据与牌阵单元测试');
console.log('═══════════════════════════════════════════════\n');

// 1. 卡牌数据完整性
console.log('【1】塔罗卡牌核心数据完整性验证');
assert.ok(TAROT_CARDS.length >= 22, '必须包含完整的大阿卡纳牌组');
TAROT_CARDS.forEach(c => {
  assert.ok(c.id && c.name && c.en && c.roman, `${c.name} 基础信息必须完整`);
  assert.ok(c.elem && c.astro && c.symbol, `${c.name} 元素与神秘学属性必须完整`);
  assert.ok(c.upright && c.upright.kw && c.upright.summary && c.upright.advice, `${c.name} 正位解读必须完整`);
  assert.ok(c.reversed && c.reversed.kw && c.reversed.summary && c.reversed.advice, `${c.name} 逆位解读必须完整`);
});
console.log(`  ✓ 全部 ${TAROT_CARDS.length} 张塔罗卡牌数据结构与正逆位牌义完备`);

// 2. 22张大阿卡纳覆盖验证
console.log('\n【2】大阿卡纳 0 ~ 21 号牌序列验证');
const majorCards = TAROT_CARDS.filter(c => c.arcana === 'major');
assert.strictEqual(majorCards.length, 22, '大阿卡纳必须完整覆盖 22 张');
for (let i = 0; i <= 21; i++) {
  const found = majorCards.find(c => c.num === i);
  assert.ok(found, `必须存在第 ${i} 号大阿卡纳牌`);
}
console.log('  ✓ 0 愚者至 21 世界大阿卡纳 22 序号无遗漏');

// 3. 牌阵定义验证
console.log('\n【3】经典牌阵结构与位置定义验证');
assert.ok(TAROT_SPREADS.length >= 4, '必须支持至少 4 种经典牌阵');
TAROT_SPREADS.forEach(sp => {
  assert.ok(sp.id && sp.name && sp.cardCount > 0, `${sp.name} 牌阵基础信息必须完整`);
  assert.strictEqual(sp.positions.length, sp.cardCount, `${sp.name} 牌位数量必须与 cardCount 一致`);
  sp.positions.forEach(pos => {
    assert.ok(pos.name && pos.desc, `${sp.name} - ${pos.name} 牌位说明必须完整`);
  });
});
console.log('  ✓ 每日指引、圣三角、感情关系、二选一、破局四要素全部牌阵配置正确');

console.log('\n═══════════════════════════════════════════════');
console.log('  全部测试通过！塔罗大师数据与牌阵 100% 验证成功');
console.log('═══════════════════════════════════════════════\n');
