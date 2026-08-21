/* ============================================================
   问问大师 · 自进化门面
   ------------------------------------------------------------
   本地记忆 + 偏好进化 + 个人知识库。
   全部发生在用户浏览器里，不上传。
   ============================================================ */

import { mergeGenome, evolveFromExperiences, buildEvolvePrompt, chartKeyOf } from './genome.js';
import { rankKnowledge, distillFromExperience, toSmartAnswer } from './knowledge.js';
import {
  openEvolveStore, loadGenome, saveGenome,
  addExperience, updateExperience, listExperiences,
  addKnowledge, listKnowledge, bumpKnowledgeHit,
  pruneExperiences, pruneKnowledge, wipeAll, exportAll
} from './store.js';
import { installEvolveHooks } from '../ai/smart-answer.js';

let _genome = null;
let _knowledge = [];
let _ready = false;
let _lastExpId = null;
let _pendingSinceEvolve = 0;
const _listeners = [];

function emit() {
  const snap = getEvolveSnapshot();
  _listeners.forEach(fn => { try { fn(snap); } catch (e) {} });
}

export function onEvolveChange(fn) {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i >= 0) _listeners.splice(i, 1);
  };
}

export function isEvolveEnabled() {
  return _ready && _genome && _genome.enabled !== false;
}

export function getGenome() {
  return _genome;
}

export function getEvolvePrompt() {
  if (!isEvolveEnabled()) return '';
  return buildEvolvePrompt(_genome);
}

export function getPersonalKnowledge() {
  return isEvolveEnabled() ? _knowledge : [];
}

export function getFaqBoostMap() {
  if (!isEvolveEnabled() || !_genome) return {};
  return _genome.faqBoost || {};
}

export function matchEvolvedAnswer(q) {
  if (!isEvolveEnabled()) return null;
  const hit = rankKnowledge(q, _knowledge, 1)[0];
  if (!hit) return null;
  bumpKnowledgeHit(hit.item.id).catch(() => {});
  if (_genome && _genome.stats) _genome.stats.personalHits = (_genome.stats.personalHits || 0) + 1;
  saveGenome(_genome).catch(() => {});
  return toSmartAnswer(hit.item);
}

export function getEvolveSnapshot() {
  const g = mergeGenome(_genome);
  return {
    ready: _ready,
    enabled: g.enabled !== false,
    generation: g.generation,
    evolvedAt: g.evolvedAt,
    topics: g.topics,
    lessons: g.lessons || [],
    stats: g.stats,
    knowledgeCount: _knowledge.length,
    tone: g.tone,
    lengthBias: g.lengthBias
  };
}

export async function initEvolve() {
  try {
    await openEvolveStore();
    _genome = await loadGenome();
    _knowledge = await listKnowledge();
    _ready = true;
    installEvolveHooks({
      matchEvolved: (q) => matchEvolvedAnswer(q),
      faqBoost: () => getFaqBoostMap()
    });
    emit();
  } catch (e) {
    _genome = mergeGenome(null);
    _knowledge = [];
    _ready = true;
    emit();
  }
  return _genome;
}

function bumpStat(key) {
  if (!_genome) return;
  _genome.stats = _genome.stats || {};
  _genome.stats[key] = (_genome.stats[key] || 0) + 1;
}

export async function recordExperience(input) {
  if (!isEvolveEnabled()) return null;
  const id = await addExperience({
    q: input.q,
    a: input.a,
    source: input.source,
    intents: input.intents,
    faqId: input.faqId,
    style: input.style,
    chartKey: input.chartKey || chartKeyOf(input.ctx),
    rating: 0,
    flags: {},
    answerLen: input.answerLen || String(input.a || '').length,
    createdAt: Date.now()
  });
  _lastExpId = id;
  bumpStat('asks');
  if (input.source === 'kb' || input.source === 'term') bumpStat('kbHits');
  else if (input.source === 'ai') bumpStat('aiHits');
  else if (input.source === 'fallback') bumpStat('fallbackHits');
  else if (input.source === 'personal') bumpStat('personalHits');
  _pendingSinceEvolve += 1;
  await saveGenome(_genome);
  if (_pendingSinceEvolve >= 6) maybeEvolve().catch(() => {});
  emit();
  return id;
}

export async function rateExperience(id, rating) {
  if (!isEvolveEnabled() || id == null) return null;
  const rec = await updateExperience(id, { rating: rating === 1 ? 1 : rating === -1 ? -1 : 0 });
  if (!rec) return null;
  if (rating === 1) bumpStat('up');
  else if (rating === -1) bumpStat('down');
  if (rating === 1) {
    const distilled = distillFromExperience(rec);
    if (distilled) {
      const saved = await addKnowledge(distilled);
      _knowledge.push(saved);
      bumpStat('distilled');
      await pruneKnowledge();
    }
  }
  await saveGenome(_genome);
  emit();
  maybeEvolve().catch(() => {});
  return rec;
}

export async function flagExperience(id, flag, value = true) {
  if (!isEvolveEnabled() || id == null) return null;
  const rec = await updateExperience(id, {});
  if (!rec) return null;
  rec.flags = rec.flags || {};
  rec.flags[flag] = !!value;
  const next = await updateExperience(id, { flags: rec.flags });
  if (flag === 'copy') bumpStat('copy');
  if (flag === 'retry') bumpStat('retry');
  await saveGenome(_genome);
  emit();
  return next;
}

export function lastExperienceId() {
  return _lastExpId;
}

export async function flagLastFollowUp() {
  if (_lastExpId == null) return;
  await flagExperience(_lastExpId, 'followUp', true);
}

export async function maybeEvolve() {
  if (!isEvolveEnabled()) return null;
  const exps = await listExperiences(40);
  const ratedOrFlagged = exps.filter(e => e.rating !== 0 || (e.flags && (e.flags.retry || e.flags.copy)));
  if (exps.length < 3) return null;
  if (ratedOrFlagged.length < 2 && _pendingSinceEvolve < 8) return null;
  const prevGen = _genome.generation;
  const { genome, changed } = evolveFromExperiences(_genome, exps);
  if (!changed) return null;
  _genome = genome;
  _pendingSinceEvolve = 0;
  await saveGenome(_genome);
  await pruneExperiences();
  emit();
  return { from: prevGen, to: _genome.generation };
}

export async function setEvolveEnabled(on) {
  if (!_genome) _genome = mergeGenome(null);
  _genome.enabled = !!on;
  await saveGenome(_genome);
  emit();
  return _genome.enabled;
}

export async function exportEvolve() {
  return exportAll();
}

export async function wipeEvolve() {
  await wipeAll();
  _genome = mergeGenome(null);
  _knowledge = [];
  _lastExpId = null;
  _pendingSinceEvolve = 0;
  await saveGenome(_genome);
  emit();
}

export { chartKeyOf, buildEvolvePrompt };
