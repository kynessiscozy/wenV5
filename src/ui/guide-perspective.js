/* 引路人只决定阅读线索与反思问题，不参与排盘、评分或输入数据。
   此模块只读已计算结果；数据缺失时不编造依据。 */
const GUIDES = Object.freeze({
  diyan: Object.freeze({ name: '焱绒', focus: '行动与优先级',
    prompt: '从眼前最重要的一件事开始：把它拆成一个今天可以尝试的小步骤。' }),
  yuchen: Object.freeze({ name: '玉宸', focus: '节奏与资源',
    prompt: '看看现在有哪些支持与空间：安排下一步时，也给休息和调整留出余地。' }),
  moonfox: Object.freeze({ name: '月白', focus: '线索与依据',
    prompt: '先比较这些线索，再打开报告中的详细依据；哪些描述与你的实际经历相符？' }),
  xingling: Object.freeze({ name: '夕瑶', focus: '关系与沟通',
    prompt: '结合自己的实际关系想一想：有什么需要可以更清楚地表达或商量？' }),
});

const text = value => typeof value === 'string' ? value.trim() : '';
const pillar = value => [text(value?.g), text(value?.z)].join('');
const fact = (label, value) => value ? `${label} ${value}` : '';

/** Generate presentation-only prompts; never modify ctx or western. */
export function buildGuidePerspective(themeId, ctx = {}, western = {}) {
  const guide = GUIDES[themeId];
  if (!guide) return null; // Older traits continue to use their existing presentation.
  const day = [text(ctx?.dg), text(ctx?.dw)].join('');
  const chart = western?.astro || {};
  const sun = text(chart.sun?.name), moon = text(chart.moon?.name), asc = text(chart.asc?.name);
  let eastern, westernFacts;
  switch (themeId) {
    case 'diyan':
      eastern = [fact('日主', day), fact('用神', text(ctx?.wx?.ys))];
      westernFacts = [fact('太阳', sun), fact('上升', asc)];
      break;
    case 'yuchen':
      eastern = [fact('当前大运', pillar(ctx?.cDy)), fact('流年', pillar(ctx?.cLn))];
      westernFacts = [fact('月亮', moon), fact('太阳', sun)];
      break;
    case 'moonfox':
      eastern = [fact('月柱', pillar(ctx?.b?.M)), fact('日柱', pillar(ctx?.b?.D))];
      westernFacts = [fact('太阳', sun), fact('月亮', moon)];
      break;
    case 'xingling':
      eastern = [fact('日支', text(ctx?.b?.D?.z)), fact('日主', day)];
      westernFacts = [fact('月亮', moon), fact('上升', asc)];
      break;
  }
  return {
    ...guide,
    eastern: eastern.filter(Boolean).join(' · '),
    western: westernFacts.filter(Boolean).join(' · '),
  };
}
