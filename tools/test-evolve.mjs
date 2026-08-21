/* 自进化纯函数单测：不依赖 DOM / IndexedDB */
import {
  defaultGenome, mergeGenome, clamp, normalizeTone,
  evolveFromExperiences, deriveLessons, buildEvolvePrompt,
  chartKeyOf, dominantTone, keywordsFromQuestion
} from '../src/evolve/genome.js';
import {
  similar, scoreKnowledgeItem, rankKnowledge,
  distillFromExperience, toSmartAnswer,
  sanitizeRecord, containsBirthLeak
} from '../src/evolve/knowledge.js';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  ' + extra : '')); }
}

console.log('自进化基因组');
{
  const g = defaultGenome();
  ok('默认代数为 0', g.generation === 0);
  ok('默认开启', g.enabled === true);
  ok('语气和为 1', Math.abs(Object.values(g.tone).reduce((a, b) => a + b, 0) - 1) < 1e-9);
  ok('clamp 边界', clamp(9, 0, 1) === 1 && clamp(-2, 0, 1) === 0);
  const t = normalizeTone({ companion: 2, rigorous: 2, traditional: 0, advisory: 0 });
  ok('语气归一化', Math.abs(t.companion + t.rigorous + t.traditional + t.advisory - 1) < 1e-9);
  const merged = mergeGenome({ generation: '3', tone: { companion: 0.9 }, stats: { asks: 4 } });
  ok('merge 保留代数', merged.generation === 3);
  ok('merge 补全 stats', merged.stats.up === 0 && merged.stats.asks === 4);
}

console.log('经历不足不进化');
{
  const g = defaultGenome();
  const r = evolveFromExperiences(g, [
    { q: '事业', intents: ['事业'], rating: 1, style: 'companion', answerLen: 80 }
  ]);
  ok('少于 3 条不进化', r.changed === false && r.genome.generation === 0);
}

console.log('进化周期');
{
  const exps = [
    { q: '适合跳槽吗', intents: ['事业'], rating: 1, style: 'advisory', answerLen: 90, flags: {} },
    { q: '领导和我处不好', intents: ['事业'], rating: 1, style: 'advisory', answerLen: 100, flags: { copy: true } },
    { q: '今年事业怎么走', intents: ['事业'], rating: -1, style: 'traditional', answerLen: 240, flags: { retry: true } },
    { q: '还是工作的事', intents: ['事业'], rating: 1, style: 'advisory', answerLen: 70, faqId: 'c3', flags: {} }
  ];
  const r = evolveFromExperiences(defaultGenome(), exps);
  ok('代数 +1', r.changed && r.genome.generation === 1);
  ok('记录事业主题', r.genome.topics['事业'] >= 3);
  ok('建议型语气上升', r.genome.tone.advisory > defaultGenome().tone.advisory);
  ok('FAQ 加权', r.genome.faqBoost.c3 > 1);
  ok('短回答偏好', r.genome.lengthBias < 0);
  const lessons = deriveLessons(exps, r.genome);
  ok('主题课被写出', lessons.some(l => l.id === 'topic-事业'));
  const prompt = buildEvolvePrompt(r.genome);
  ok('提示词含代数', prompt.includes('第 1 代'));
  ok('提示词含事业', prompt.includes('事业'));
  ok('第 0 代不写提示', buildEvolvePrompt(defaultGenome()) === '');
  ok('主导语气存在', ['companion', 'rigorous', 'traditional', 'advisory'].includes(dominantTone(r.genome)));
}

console.log('命盘指纹不泄漏生日');
{
  const key = chartKeyOf({ dg: '辛', dw: '金', cDy: { g: '壬', z: '辰' }, input: { bd: '1990-06-15', timeStr: '09:00' } });
  ok('指纹含日主大运', key.includes('辛金') && key.includes('壬辰'));
  ok('指纹不含日期', !key.includes('1990') && !key.includes('06'));
}

console.log('个人知识蒸馏与匹配');
{
  ok('未点赞不蒸馏', distillFromExperience({ rating: 0, source: 'ai', q: '跳槽吗', a: '先拿 offer 再离职，这是底线。'.repeat(2) }) === null);
  ok('KB 来源不蒸馏', distillFromExperience({ rating: 1, source: 'kb', q: '跳槽吗', a: '先拿 offer 再离职，这是底线。'.repeat(2) }) === null);
  const d = distillFromExperience({
    rating: 1, source: 'ai', id: 7,
    q: '我现在适合跳槽吗？',
    a: '先把 offer 拿到手里再提离职。命盘今年官星动，但现实合同和现金流优先。今天把简历投给两家对口的公司。',
    intents: ['事业']
  });
  ok('点赞 AI 回答可蒸馏', d && d.intent === '事业' && d.answer.length > 20);
  ok('关键词抽出', keywordsFromQuestion('我现在适合跳槽吗').length >= 1);
  const item = { q: '我现在适合跳槽吗？', kw: ['跳槽'], intent: '事业', answer: d.answer, score: 1, hits: 2, id: 1 };
  ok('同类问题能匹配', rankKnowledge('我现在适合跳槽吗', [item]).length === 1);
  ok('无关问题不匹配', rankKnowledge('晚饭吃什么', [item]).length === 0);
  const sa = toSmartAnswer(item);
  ok('转成记得你', sa.kind === 'personal' && sa.sections[0].title === '记得你');
  ok('similar 对称', similar('跳槽', '跳槽') === 1);
}

console.log('隐私清洗');
{
  const dirty = { q: '跳槽吗', bd: '1990-06-15', timeStr: '09:00', nested: { bDate: 'x', answer: '先拿 offer' } };
  const clean = sanitizeRecord(dirty);
  ok('去掉 bd', clean.bd === undefined);
  ok('去掉 timeStr', clean.timeStr === undefined);
  ok('去掉嵌套生日', clean.nested.bDate === undefined);
  ok('保留问答', clean.q === '跳槽吗' && clean.nested.answer.includes('offer'));
  ok('泄漏检测命中', containsBirthLeak({ bd: '1990-01-01' }) === true);
  ok('泄漏检测放过干净数据', containsBirthLeak({ q: '跳槽', chartKey: '辛金:壬辰' }) === false);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
