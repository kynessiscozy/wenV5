import assert from 'node:assert';

// Mock localStorage for Node test
const storage = {};
globalThis.window = globalThis.window || {
  localStorage: {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
  }
};
globalThis.document = globalThis.document || {
  getElementById: () => null,
  documentElement: { getAttribute: () => 'light' }
};

const {
  MBTI_TYPES,
  MBTI_QUESTIONS,
  calcMBTIMaturity,
  getMBTIHistory,
  saveMBTIHistoryItem,
  deleteMBTIHistoryItem,
  clearMBTIHistory
} = await import('../src/tools2/mbti.js');

console.log('\n═══════════════════════════════════════════════');
console.log('  人格大师 (MBTI) 核心数据与算法单元测试');
console.log('═══════════════════════════════════════════════\n');

// 1. 16型人格数据完整性
console.log('【1】16型人格基础数据完整性验证');
assert.strictEqual(MBTI_TYPES.length, 16, '必须包含完整 16 型人格');
const quadrants = new Set(MBTI_TYPES.map(t => t.quadrant));
assert.strictEqual(quadrants.size, 4, '必须覆盖四大阵营 (analyst, diplomat, sentinel, explorer)');

MBTI_TYPES.forEach(t => {
  assert.ok(t.code && t.name && t.enName && t.quadrant && t.color, `${t.code} 基础信息必须完整`);
  assert.ok(t.cognition && t.summary && t.tag, `${t.code} 八维与性格画像必须完整`);
  assert.ok(t.strengths.length >= 3 && t.blindSpots.length >= 3, `${t.code} 优势与盲区必须完整`);
  assert.ok(t.career && t.love && t.celebrities.length > 0, `${t.code} 职场、情感与名人代表必须完整`);
});
console.log('  ✓ 16 型人格数据全部完备，四大阵营覆盖率 100%');

// 2. 20题精选问卷维度分布验证
console.log('\n【2】20 题情境心理学问卷维度验证');
assert.strictEqual(MBTI_QUESTIONS.length, 20, '问卷必须包含 20 道精选题');
const dimCounts = { EI: 0, SN: 0, TF: 0, JP: 0 };
MBTI_QUESTIONS.forEach(q => {
  assert.ok(q.id && q.q && q.optA && q.optB, `第 ${q.id} 题结构必须完整`);
  assert.ok(dimCounts[q.dim] !== undefined, `第 ${q.id} 题维度必须属于四大维度之一`);
  dimCounts[q.dim]++;
});
assert.strictEqual(dimCounts.EI, 5, 'E/I 维度必须有 5 题');
assert.strictEqual(dimCounts.SN, 5, 'S/N 维度必须有 5 题');
assert.strictEqual(dimCounts.TF, 5, 'T/F 维度必须有 5 题');
assert.strictEqual(dimCounts.JP, 5, 'J/P 维度必须有 5 题');
console.log('  ✓ 问卷四大维度 (EI, SN, TF, JP) 各 5 题完美均衡分布');

// 3. 成熟度等级评定模型测试
console.log('\n【3】MBTI 成熟度等级评定模型验证');
// 平衡高分样本 (如各维度 55:45)
const matHigh = calcMBTIMaturity({ e: 55, i: 45, s: 52, n: 48, t: 54, f: 46, j: 53, p: 47 });
assert.ok(matHigh.score >= 88, '各维度平衡成熟时得分应 >= 88');
assert.strictEqual(matHigh.level.includes('Lv.4'), true, '高分应达到 Lv.4 宗师级');

// 极化初显样本 (如各维度 95:5)
const matLow = calcMBTIMaturity({ e: 95, i: 5, s: 95, n: 5, t: 95, f: 5, j: 95, p: 5 });
assert.ok(matLow.score <= 65, '极化偏好时成熟度分在原型或功能期');
assert.ok(matLow.growthAdvice && matLow.growthAdvice.length > 0, '必须包含进阶成长建议');
console.log('  ✓ 人格成熟度等级评定及进阶指南计算正确');

// 4. 历史记录持久化功能验证
console.log('\n【4】历史测试记录持久化与管理测试');
clearMBTIHistory();
assert.strictEqual(getMBTIHistory().length, 0, '清空后历史记录应为空');

const sampleReport = {
  type: MBTI_TYPES[0],
  scores: { e: 20, i: 80, s: 30, n: 70, t: 85, f: 15, j: 75, p: 25 },
  maturity: matHigh,
  note: '单测模拟报告'
};

saveMBTIHistoryItem(sampleReport);
let hist = getMBTIHistory();
assert.strictEqual(hist.length, 1, '保存后应有 1 条记录');
assert.strictEqual(hist[0].type.code, 'INTJ', '保存的 MBTI 类型应为 INTJ');
assert.ok(hist[0].id && hist[0].date, '历史记录必须包含 ID 与时间戳');

const savedId = hist[0].id;
deleteMBTIHistoryItem(savedId);
assert.strictEqual(getMBTIHistory().length, 0, '删除后记录应被移除');
console.log('  ✓ 历史测试记录保存、读取、单条删除与清空功能全量通过');

console.log('\n═══════════════════════════════════════════════');
console.log('  全部测试通过！人格大师核心功能 100% 验证成功');
console.log('═══════════════════════════════════════════════\n');
