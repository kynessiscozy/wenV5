/* ============================================================
   问问大师 · 自进化基因组
   ------------------------------------------------------------
   纯函数：不碰 DOM、不碰存储。进化周期与提示词都从这里长出来。
   基因组描述的是「这位用户更吃什么样的回答」，不是命盘本身。
   ============================================================ */

export const TONE_KEYS = ['companion', 'rigorous', 'traditional', 'advisory'];

export const TONE_LABEL = {
  companion: '陪伴',
  rigorous: '严谨',
  traditional: '传统',
  advisory: '建议'
};

export const TONE_HINT = {
  companion: '先接住感受再拆下一步',
  rigorous: '先列依据再给克制判断',
  traditional: '保留术语但每词跟一句白话',
  advisory: '少铺陈，直接给选项与风险'
};

export function defaultGenome() {
  return {
    version: 1,
    generation: 0,
    evolvedAt: 0,
    enabled: true,
    tone: { companion: 0.40, rigorous: 0.20, traditional: 0.15, advisory: 0.25 },
    lengthBias: 0,
    naturalBias: 0.6,
    cautionBias: 0.55,
    topics: {},
    lessons: [],
    faqBoost: {},
    stats: {
      asks: 0, up: 0, down: 0, retry: 0, copy: 0,
      distilled: 0, kbHits: 0, aiHits: 0, fallbackHits: 0, personalHits: 0
    }
  };
}

export function clamp(n, lo, hi) {
  n = Number(n);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export function normalizeTone(tone) {
  const t = tone || {};
  let sum = 0;
  TONE_KEYS.forEach(k => { t[k] = clamp(t[k] == null ? 0.25 : t[k], 0.05, 0.75); sum += t[k]; });
  if (sum <= 0) {
    TONE_KEYS.forEach(k => { t[k] = 0.25; });
    return t;
  }
  TONE_KEYS.forEach(k => { t[k] = t[k] / sum; });
  return t;
}

export function mergeGenome(raw) {
  const base = defaultGenome();
  if (!raw || typeof raw !== 'object') return base;
  const g = {
    ...base,
    ...raw,
    tone: normalizeTone({ ...base.tone, ...(raw.tone || {}) }),
    stats: { ...base.stats, ...(raw.stats || {}) },
    topics: raw.topics && typeof raw.topics === 'object' ? { ...raw.topics } : {},
    lessons: Array.isArray(raw.lessons) ? raw.lessons.slice(0, 8) : [],
    faqBoost: raw.faqBoost && typeof raw.faqBoost === 'object' ? { ...raw.faqBoost } : {}
  };
  g.generation = Math.max(0, parseInt(g.generation, 10) || 0);
  g.lengthBias = clamp(g.lengthBias, -1, 1);
  g.naturalBias = clamp(g.naturalBias, 0, 1);
  g.cautionBias = clamp(g.cautionBias, 0.2, 0.9);
  g.enabled = g.enabled !== false;
  return g;
}

export function dominantTone(genome) {
  const tone = (genome && genome.tone) || {};
  return TONE_KEYS.slice().sort((a, b) => (tone[b] || 0) - (tone[a] || 0))[0] || 'companion';
}

export function topTopics(genome, n = 3) {
  const topics = (genome && genome.topics) || {};
  return Object.entries(topics)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

/** 从近期经历推导可写入提示词的「学会了什么」。 */
export function deriveLessons(experiences, genome) {
  const lessons = [];
  const topics = topTopics(genome, 2);
  if (topics[0] && topics[0][1] >= 3) {
    lessons.push({
      id: 'topic-' + topics[0][0],
      text: `用户近期反复问「${topics[0][0]}」，回答应更快落到这个主题的现实行动，少绕到无关领域。`,
      weight: 1
    });
  }
  const bias = genome && genome.lengthBias || 0;
  if (bias < -0.25) {
    lessons.push({
      id: 'len-short',
      text: '用户更认可短回答。控制在 80–140 字，先给结论再给一条今天能做的行动。',
      weight: 0.9
    });
  } else if (bias > 0.25) {
    lessons.push({
      id: 'len-long',
      text: '用户愿意看更完整的依据。可以给两条命盘依据，但仍要落到行动。',
      weight: 0.9
    });
  }
  const list = Array.isArray(experiences) ? experiences : [];
  const downs = list.filter(e => e.rating < 0);
  const ups = list.filter(e => e.rating > 0);
  if (downs.length >= 2) {
    lessons.push({
      id: 'avoid-generic',
      text: '被否定的回答往往空泛。每条判断必须引用命盘里的具体字段，并给今天能做的一步。',
      weight: 1
    });
  }
  if (ups.some(e => e.flags && e.flags.copy)) {
    lessons.push({
      id: 'copy-worthy',
      text: '用户会复制有用的句子。关键建议写成可直接照做的短句。',
      weight: 0.7
    });
  }
  const retries = list.filter(e => e.flags && e.flags.retry).length;
  if (retries >= 2) {
    lessons.push({
      id: 'retry-caution',
      text: '用户多次点了重试。先确认问题焦点，拿不准就问一个关键问题，不要一次铺开。',
      weight: 0.85
    });
  }
  const tone = dominantTone(genome);
  if ((genome.tone && genome.tone[tone] || 0) > 0.38) {
    lessons.push({
      id: 'tone-' + tone,
      text: `语气偏好${TONE_HINT[tone]}。`,
      weight: 0.8
    });
  }
  return lessons;
}

function mergeLessons(oldList, incoming) {
  const map = new Map();
  (oldList || []).forEach(l => { if (l && l.id) map.set(l.id, { ...l }); });
  (incoming || []).forEach(l => {
    if (!l || !l.id) return;
    const prev = map.get(l.id);
    map.set(l.id, prev ? { ...prev, ...l, weight: Math.max(prev.weight || 0, l.weight || 0) } : l);
  });
  return [...map.values()].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 8);
}

/**
 * 一次进化：用近期经历更新基因组。
 * 至少 3 条经历才进化，避免噪声把第一印象写死。
 */
export function evolveFromExperiences(genome, experiences) {
  const g = mergeGenome(genome);
  const recent = (experiences || []).slice(-40);
  if (recent.length < 3) return { genome: g, changed: false, lessons: [] };

  const topics = {};
  recent.forEach(e => {
    (e.intents || []).forEach(t => { topics[t] = (topics[t] || 0) + 1; });
  });
  g.topics = topics;

  const rated = recent.filter(e => e.rating === 1 || e.rating === -1);
  rated.forEach(e => {
    if (e.style && g.tone[e.style] != null) {
      g.tone[e.style] += e.rating > 0 ? 0.04 : -0.03;
    }
    if (e.answerLen) {
      const long = e.answerLen > 180;
      if (e.rating > 0) g.lengthBias += long ? 0.04 : -0.03;
      else g.lengthBias += long ? -0.05 : 0.03;
    }
  });
  g.tone = normalizeTone(g.tone);
  g.lengthBias = clamp(g.lengthBias, -1, 1);

  const retries = recent.filter(e => e.flags && e.flags.retry).length;
  if (retries >= 2) g.cautionBias = clamp(g.cautionBias + 0.05, 0.2, 0.9);

  rated.forEach(e => {
    if (!e.faqId) return;
    const cur = g.faqBoost[e.faqId] == null ? 1 : g.faqBoost[e.faqId];
    g.faqBoost[e.faqId] = clamp(cur + (e.rating > 0 ? 0.12 : -0.15), 0.5, 1.8);
  });

  const incoming = deriveLessons(recent, g);
  g.lessons = mergeLessons(g.lessons, incoming);
  g.generation += 1;
  g.evolvedAt = Date.now();
  return { genome: g, changed: true, lessons: incoming };
}

/** 写入系统提示的自进化记忆，控制在约 480 字以内。 */
export function buildEvolvePrompt(genome) {
  const g = mergeGenome(genome);
  if (!g.enabled || g.generation < 1) return '';
  const lines = [`【自进化记忆 · 第 ${g.generation} 代】`];
  const topics = topTopics(g, 3);
  if (topics.length) lines.push('近期关注：' + topics.map(([k]) => k).join('、') + '。');
  if (g.lengthBias < -0.2) lines.push('偏好更短、更落地的回答。');
  else if (g.lengthBias > 0.2) lines.push('偏好把依据讲完整，但仍要落到行动。');
  const tone = dominantTone(g);
  lines.push('语气偏向' + TONE_LABEL[tone] + '（' + TONE_HINT[tone] + '）。');
  (g.lessons || []).slice(0, 4).forEach(l => {
    if (l && l.text) lines.push('· ' + l.text);
  });
  return lines.join('\n').slice(0, 480);
}

/** 命盘指纹：只保留日主 + 当前大运，绝不写入出生日期。 */
export function chartKeyOf(ctx) {
  if (!ctx) return '';
  const dm = String(ctx.dg || '') + String(ctx.dw || '');
  const dy = ctx.cDy ? String(ctx.cDy.g || '') + String(ctx.cDy.z || '') : '';
  return (dm + ':' + dy).slice(0, 16);
}

export function keywordsFromQuestion(q) {
  const raw = String(q || '').trim();
  if (!raw) return [];
  const parts = raw
    .replace(/[，。？！、：；,.!?\s()（）【】「」""'']/g, ' ')
    .split(/\s+/)
    .filter(x => x.length >= 2 && x.length <= 12);
  const extra = [];
  // 中文问句常没有空格，抽 2~3 字滑动窗口里的实词感片段（过短的虚词丢掉）
  const compact = raw.replace(/\s+/g, '');
  if (compact.length >= 4 && parts.length < 2) {
    for (let i = 0; i < compact.length - 1 && extra.length < 6; i++) {
      const bi = compact.slice(i, i + 2);
      if (/[的了吗呢是在我你他她它]/.test(bi)) continue;
      extra.push(bi);
    }
  }
  return [...new Set(parts.concat(extra))].slice(0, 8);
}
