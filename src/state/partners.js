/* ============================================================
   合盘对象档案（partners）
   ------------------------------------------------------------
   命盘档案（profiles）已用 IndexedDB 持久化；合盘对象是一份
   轻量得多的数据（姓名 + 生日 + 可选时辰），用 localStorage 即可，
   也避免与 profiles 的 schema 纠缠。

   记录形如：
     { id, name, y, m, d, hourZhi|null, relation, lastScore, updatedAt }
   ============================================================ */

const KEY = 'tj_partners_v1';
const MAX = 20;

function _read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (e) { return []; }
}

function _write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    return true;
  } catch (e) { return false; }
}

/** 按最近使用排序返回全部对象 */
export function listPartners() {
  return _read().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getPartner(id) {
  return _read().find(p => p.id === id) || null;
}

/**
 * 保存 / 更新一个合盘对象。
 * 同名 + 同生日视为同一人，直接更新而不是产生重复条目。
 */
export function savePartner({ name, y, m, d, hourZhi, relation, lastScore }) {
  const list = _read();
  const nm = (name || '').trim() || '未命名';
  const same = p => p.name === nm && p.y === y && p.m === m && p.d === d;
  const existing = list.find(same);

  const rec = {
    id: existing ? existing.id : (Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
    name: nm, y, m, d,
    hourZhi: (hourZhi === null || hourZhi === undefined) ? null : hourZhi,
    relation: relation || '',
    lastScore: (typeof lastScore === 'number') ? lastScore : null,
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now(),
  };

  const next = existing ? list.map(p => same(p) ? rec : p) : [rec, ...list];
  return _write(next) ? rec : null;
}

export function deletePartner(id) {
  return _write(_read().filter(p => p.id !== id));
}

/** 供 UI 展示的一行摘要 */
export function partnerSummary(p) {
  const date = `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  const hour = (p.hourZhi === null || p.hourZhi === undefined)
    ? '时辰不详'
    : '子丑寅卯辰巳午未申酉戌亥'.charAt(p.hourZhi) + '时';
  return [date, hour, p.relation].filter(Boolean).join(' · ');
}
