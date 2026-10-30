// Mock DOM environment for testing renderAll
const elements = {};
function createMockEl(id) {
  return {
    id,
    classList: { add: () => {}, remove: () => {}, toggle: () => false, contains: () => false },
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: () => {},
    prepend: () => {},
    remove: () => {},
    insertAdjacentElement: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    dataset: {},
    style: {},
    innerHTML: '',
    textContent: ''
  };
}

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
globalThis.MutationObserver = globalThis.MutationObserver || class {
  observe() {}
  disconnect() {}
};

globalThis.window = globalThis.window || {
  localStorage: { getItem: () => null, setItem: () => {} },
  addEventListener: () => {},
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: (fn) => setTimeout(fn, 0)
};
globalThis.document = globalThis.document || {
  getElementById: (id) => elements[id] || (elements[id] = createMockEl(id)),
  querySelector: (sel) => null,
  querySelectorAll: () => [],
  createElement: (tag) => createMockEl(tag),
  documentElement: { setAttribute: () => {}, getAttribute: () => 'light' },
  body: createMockEl('body'),
  addEventListener: () => {}
};

const { resolveBirthDateTime } = await import('../src/engines/calendar.js');
const { mkBazi, mkWx, mkSs, mkShenSha, mkDy, mkLn, getLiuYue } = await import('../src/engines/bazi.js');
const { mkZw } = await import('../src/engines/ziwei.js');
const { solarToLunar } = await import('../src/engines/lunar.js');
const { mkQm } = await import('../src/engines/qimen.js');
const { mkMh } = await import('../src/engines/meihua.js');
const { mkSi } = await import('../src/engines/sizhi.js');
const { CD } = await import('../src/engines/cities.js');
const { buildContext } = await import('../src/state/context.js');
const { CURR_YEAR } = await import('../src/engines/shared.js');
const { renderAll } = await import('../src/render/report.js');

console.log('Testing calculation pipeline with various dates...');

const testCases = [
  { bd: '1995-06-15', timeStr: '09:00', bp: 'beijing', gen: 'male', q: '事业' },
  { bd: '2000-01-01', timeStr: '00:30', bp: 'shanghai', gen: 'female', q: '感情' },
  { bd: '1988-12-31', timeStr: '23:45', bp: 'guangzhou', gen: 'male', q: '财运' },
  { bd: '2024-02-04', timeStr: '16:30', bp: 'chengdu', gen: 'female', q: '健康' },
];

for (const tc of testCases) {
  const [y, m, d] = tc.bd.split('-').map(Number);
  const [hh, mm] = tc.timeStr.split(':').map(Number);
  const city = CD[tc.bp] || { n: '北京', o: 116.4, a: 39.9, tz: 8 };

  const resolved = resolveBirthDateTime(y, m, d, hh, mm, false, city.o, city.tz);
  const b = mkBazi(resolved.year, resolved.month, resolved.day, resolved.hourZhi, resolved.hour, resolved.minute, resolved.instant);
  const wx = mkWx(b), ss = mkSs(b), dy = mkDy(b, tc.gen, y, m, d), ln = mkLn(CURR_YEAR), zw = mkZw(b, solarToLunar(resolved.year, resolved.month, resolved.day)), qm = mkQm(b), mh = mkMh(b), si = mkSi(b);
  const shensha = mkShenSha(b);
  const liuyue = getLiuYue(CURR_YEAR);
  b._meta = { hourZhi: resolved.hourZhi, useTrueSolar: false, by: y, bm: m, bd: d };
  const _input = { by: y, bm: m, bd: d, bd_raw: tc.bd, timeStr: tc.timeStr, bp: tc.bp, gen: tc.gen, q: tc.q, useTrueSolar: false };
  const _preCtx = buildContext({ b, wx, ss, dy, ln, zw, qm, mh, si, shensha, liuyue, P: null, gen: tc.gen, q: tc.q, city, input: _input });
  globalThis.window._ctx = _preCtx;

  console.log(`Testing renderAll for ${tc.bd} ${tc.timeStr}...`);
  renderAll(b, wx, ss, dy, ln, zw, qm, mh, si, tc.gen, tc.q, city, y, shensha, liuyue, _preCtx);
  if (globalThis.window._ctx !== _preCtx) throw new Error('renderAll should reuse the prepared context');
  console.log(`  ✓ renderAll passed for ${tc.bd}`);
}

console.log('\nAll calculation pipelines passed without errors!');
