/* ============================================================
   问问大师 · 自进化存储
   ------------------------------------------------------------
   IndexedDB：经历、个人知识、基因组。失败时基因组退回 localStorage。
   不存出生日期、不上传。
   ============================================================ */

import { defaultGenome, mergeGenome } from './genome.js';
import { sanitizeRecord } from './knowledge.js';

const DB_NAME = 'TJ_Evolve';
const DB_VER = 1;
const LS_GENOME = 'tj_evolve_genome';
const MAX_EXPERIENCES = 200;
const MAX_KNOWLEDGE = 40;

let _db = null;
let _memoryGenome = null;
let _memoryExp = [];
let _memoryKnow = [];

function openDB() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no indexedDB'));
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onerror = () => rej(r.error);
    r.onsuccess = e => res(e.target.result);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('experiences')) {
        const s = d.createObjectStore('experiences', { keyPath: 'id', autoIncrement: true });
        s.createIndex('createdAt', 'createdAt');
      }
      if (!d.objectStoreNames.contains('knowledge')) {
        d.createObjectStore('knowledge', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function txDone(tx) {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

function reqOf(r) {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function openEvolveStore() {
  if (_db) return _db;
  try {
    _db = await openDB();
    return _db;
  } catch (e) {
    _db = null;
    return null;
  }
}

function lsReadGenome() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_GENOME) || 'null');
    return mergeGenome(raw);
  } catch (e) {
    return defaultGenome();
  }
}

function lsWriteGenome(g) {
  try { localStorage.setItem(LS_GENOME, JSON.stringify(g)); } catch (e) {}
}

export async function loadGenome() {
  const db = await openEvolveStore();
  if (!db) {
    _memoryGenome = _memoryGenome || lsReadGenome();
    return mergeGenome(_memoryGenome);
  }
  try {
    const rec = await reqOf(db.transaction('meta').objectStore('meta').get('genome'));
    const g = mergeGenome(rec && rec.value);
    _memoryGenome = g;
    return g;
  } catch (e) {
    return lsReadGenome();
  }
}

export async function saveGenome(genome) {
  const g = mergeGenome(genome);
  _memoryGenome = g;
  lsWriteGenome(g);
  const db = await openEvolveStore();
  if (!db) return g;
  try {
    const tx = db.transaction('meta', 'readwrite');
    tx.objectStore('meta').put({ key: 'genome', value: g });
    await txDone(tx);
  } catch (e) {}
  return g;
}

function stripExp(exp) {
  return sanitizeRecord({
    q: String(exp.q || '').slice(0, 180),
    a: String(exp.a || '').slice(0, 360),
    source: exp.source || 'ai',
    intents: Array.isArray(exp.intents) ? exp.intents.slice(0, 4) : [],
    faqId: exp.faqId || null,
    style: exp.style || '',
    chartKey: String(exp.chartKey || '').slice(0, 16),
    rating: exp.rating === 1 || exp.rating === -1 ? exp.rating : 0,
    flags: {
      copy: !!(exp.flags && exp.flags.copy),
      retry: !!(exp.flags && exp.flags.retry),
      followUp: !!(exp.flags && exp.flags.followUp)
    },
    answerLen: Math.max(0, parseInt(exp.answerLen, 10) || 0),
    createdAt: exp.createdAt || Date.now()
  });
}

export async function addExperience(exp) {
  const rec = stripExp(exp);
  const db = await openEvolveStore();
  if (!db) {
    rec.id = (_memoryExp[_memoryExp.length - 1]?.id || 0) + 1;
    _memoryExp.push(rec);
    if (_memoryExp.length > MAX_EXPERIENCES) _memoryExp = _memoryExp.slice(-MAX_EXPERIENCES);
    return rec.id;
  }
  const tx = db.transaction('experiences', 'readwrite');
  const id = await reqOf(tx.objectStore('experiences').add(rec));
  await txDone(tx);
  return id;
}

export async function updateExperience(id, patch) {
  if (id == null) return null;
  const db = await openEvolveStore();
  if (!db) {
    const rec = _memoryExp.find(x => x.id === id);
    if (!rec) return null;
    Object.assign(rec, patch || {});
    return rec;
  }
  const tx = db.transaction('experiences', 'readwrite');
  const store = tx.objectStore('experiences');
  const rec = await reqOf(store.get(id));
  if (!rec) { await txDone(tx); return null; }
  Object.assign(rec, patch || {});
  store.put(rec);
  await txDone(tx);
  return rec;
}

export async function listExperiences(limit = 40) {
  const db = await openEvolveStore();
  if (!db) return _memoryExp.slice(-limit);
  const tx = db.transaction('experiences', 'readonly');
  const idx = tx.objectStore('experiences').index('createdAt');
  const rows = [];
  await new Promise((res, rej) => {
    const r = idx.openCursor(null, 'prev');
    r.onerror = () => rej(r.error);
    r.onsuccess = e => {
      const c = e.target.result;
      if (!c || rows.length >= limit) return res();
      rows.push(c.value);
      c.continue();
    };
  });
  return rows.reverse();
}

export async function pruneExperiences(keep = MAX_EXPERIENCES) {
  const db = await openEvolveStore();
  if (!db) {
    if (_memoryExp.length > keep) _memoryExp = _memoryExp.slice(-keep);
    return;
  }
  const all = await listExperiences(keep + 80);
  if (all.length <= keep) return;
  const drop = all.slice(0, all.length - keep);
  const tx = db.transaction('experiences', 'readwrite');
  const store = tx.objectStore('experiences');
  drop.forEach(r => { if (r.id != null) store.delete(r.id); });
  await txDone(tx);
}

export async function addKnowledge(item) {
  const rec = sanitizeRecord({
    q: String(item.q || '').slice(0, 80),
    kw: Array.isArray(item.kw) ? item.kw.slice(0, 8) : [],
    intent: item.intent || '综合',
    answer: String(item.answer || '').slice(0, 280),
    score: item.score || 1,
    hits: item.hits || 0,
    sourceExpId: item.sourceExpId || 0,
    createdAt: item.createdAt || Date.now()
  });
  const db = await openEvolveStore();
  if (!db) {
    rec.id = (_memoryKnow[_memoryKnow.length - 1]?.id || 0) + 1;
    _memoryKnow.push(rec);
    if (_memoryKnow.length > MAX_KNOWLEDGE) _memoryKnow = _memoryKnow.slice(-MAX_KNOWLEDGE);
    return rec;
  }
  const tx = db.transaction('knowledge', 'readwrite');
  const id = await reqOf(tx.objectStore('knowledge').add(rec));
  await txDone(tx);
  rec.id = id;
  return rec;
}

export async function listKnowledge() {
  const db = await openEvolveStore();
  if (!db) return _memoryKnow.slice();
  const tx = db.transaction('knowledge', 'readonly');
  const rows = await reqOf(tx.objectStore('knowledge').getAll());
  return Array.isArray(rows) ? rows : [];
}

export async function bumpKnowledgeHit(id) {
  if (id == null) return;
  const db = await openEvolveStore();
  if (!db) {
    const rec = _memoryKnow.find(x => x.id === id);
    if (rec) rec.hits = (rec.hits || 0) + 1;
    return;
  }
  const tx = db.transaction('knowledge', 'readwrite');
  const store = tx.objectStore('knowledge');
  const rec = await reqOf(store.get(id));
  if (!rec) { await txDone(tx); return; }
  rec.hits = (rec.hits || 0) + 1;
  store.put(rec);
  await txDone(tx);
}

export async function pruneKnowledge(keep = MAX_KNOWLEDGE) {
  const all = await listKnowledge();
  if (all.length <= keep) return;
  const ranked = all.slice().sort((a, b) => {
    const sa = (a.score || 0) + (a.hits || 0) * 0.2;
    const sb = (b.score || 0) + (b.hits || 0) * 0.2;
    return sa - sb;
  });
  const drop = ranked.slice(0, all.length - keep);
  const db = await openEvolveStore();
  if (!db) {
    const ids = new Set(drop.map(x => x.id));
    _memoryKnow = _memoryKnow.filter(x => !ids.has(x.id));
    return;
  }
  const tx = db.transaction('knowledge', 'readwrite');
  const store = tx.objectStore('knowledge');
  drop.forEach(r => { if (r.id != null) store.delete(r.id); });
  await txDone(tx);
}

export async function wipeAll() {
  _memoryGenome = defaultGenome();
  _memoryExp = [];
  _memoryKnow = [];
  try { localStorage.removeItem(LS_GENOME); } catch (e) {}
  const db = await openEvolveStore();
  if (!db) return;
  const tx = db.transaction(['meta', 'experiences', 'knowledge'], 'readwrite');
  tx.objectStore('meta').clear();
  tx.objectStore('experiences').clear();
  tx.objectStore('knowledge').clear();
  await txDone(tx);
}

export async function exportAll() {
  const genome = await loadGenome();
  const experiences = await listExperiences(MAX_EXPERIENCES);
  const knowledge = await listKnowledge();
  return sanitizeRecord({
    kind: 'tj-evolve',
    version: 1,
    exportedAt: Date.now(),
    genome,
    experiences,
    knowledge
  });
}
