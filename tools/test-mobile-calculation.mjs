import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { calcWesternChart } from '../src/engines/western.js';
import { spinFor } from './trait-picker-helper.mjs';

// These tests exercise real touch/keyboard events in mobile-sized Chromium.
// They deliberately do not claim to be a Safari or iOS device test.
const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function setup({ width = 390, height = 844, oldHasOwn = false, oldFocus = false, reduced = true } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height, isMobile: width <= 430, hasTouch: true });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (oldHasOwn) await page.evaluateOnNewDocument(() => { Object.hasOwn = undefined; });
  if (oldFocus) await page.evaluateOnNewDocument(() => {
    const original = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(options) {
      if (arguments.length) throw new TypeError('focus options unsupported');
      return original.call(this);
    };
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window.TJOpenForm === 'function' && window._tools2Ready === true &&
    document.getElementById('traitMachine')?.dataset.ready === 'true', { timeout: 15000 });
  await spinFor(page, 'wenwen');
  await page.waitForFunction(() => document.getElementById('traitSelection').hidden);
  await page.tap('#homeCtaMain');
  await page.waitForSelector('#formModal.open');
  return { page, context };
}
async function fillCity(page, text) {
  await page.tap('#cInp');
  await page.$eval('#cInp', el => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
  if (text) await page.keyboard.type(text);
  await page.waitForSelector('#cDD.show');
}
async function resultReady(page) {
  await page.waitForFunction(() => document.getElementById('calculationOverlay').dataset.calculationState === 'ready', { timeout: 12000 });
}
async function showReport(page) {
  await page.tap('#calculationContinue');
  await page.waitForFunction(() => document.body.classList.contains('report-active') && document.getElementById('calculationOverlay').hidden, { timeout: 10000 });
  await page.waitForSelector('#characterResultHero');
}
async function checkVisibleSubmit(page) {
  const placement = await page.evaluate(() => {
    const button = document.querySelector('.character-form-submit');
    const r = button.getBoundingClientRect();
    const dd = document.getElementById('cDD').getBoundingClientRect();
    const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
    return { hit: hit === button || button.contains(hit), button: r.toJSON(), dd: dd.toJSON(),
      date: document.getElementById('bDate').getBoundingClientRect().toJSON(),
      time: document.getElementById('bTime').getBoundingClientRect().toJSON(),
      sheet: document.querySelector('.form-modal-sheet').getBoundingClientRect().toJSON(),
      fontSize: parseFloat(getComputedStyle(document.getElementById('cInp')).fontSize) };
  });
  assert.ok(placement.hit, `候选列表不能挡住开始推演：${JSON.stringify(placement)}`);
  assert.ok(placement.dd.bottom <= placement.button.top || placement.dd.top >= placement.button.bottom,
    `候选列表不能覆盖提交按钮：${JSON.stringify(placement)}`);
  assert.ok(placement.date.right <= placement.sheet.right && placement.time.right <= placement.sheet.right,
    `日期时间控件不能溢出表单：${JSON.stringify(placement)}`);
  if (placement.button.width < 400) assert.ok(placement.fontSize >= 16, '手机输入框字号应避免 iOS 自动放大');
}

try {
  // The city popup remains tappable without intercepting submit on common
  // phone/tablet widths. An exact, unambiguous abbreviation is resolved.
  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024]]) {
    const { page, context } = await setup({ width, height });
    await fillCity(page, 'sh');
    // On very short screens the sheet scrolls, rather than clipping native
    // date/time controls or putting the submit button outside reach.
    await page.$eval('.character-form-submit', el => el.scrollIntoView({ block: 'nearest' }));
    await delay(100);
    await checkVisibleSubmit(page);
    if (width <= 360) assert.ok(await page.$eval('#bDate', el => el.getBoundingClientRect().width > 200), '窄屏日期必须完整显示');
    await page.tap('.character-form-submit');
    await resultReady(page);
    const state = await page.evaluate(() => ({ city: window._ctx.city.n, id: window._ctx.input.bp,
      input: document.getElementById('cInp').value, shown: !document.getElementById('calculationOverlay').hidden,
      pillars: [...document.querySelectorAll('[data-calculation-pillar]')].map(el => el.textContent),
      actual: ['Y', 'M', 'D', 'H'].map(k => window._ctx.b[k].g + window._ctx.b[k].z) }));
    assert.equal(state.city, '上海');
    assert.equal(state.id, 'shanghai');
    assert.equal(state.input, '上海');
    assert.ok(state.shown);
    assert.deepEqual(state.pillars, state.actual);
    await showReport(page);
    await context.close();
  }
  console.log('✓ 手机与平板尺寸的触屏提交、城市匹配、真实结果确认与报告');

  // Empty, unknown and ambiguous values never silently become Beijing. The
  // message stays visible, the data is retained, and a real touch can correct it.
  {
    const { page, context } = await setup();
    await page.$eval('#bDate', el => { el.value = '1995-06-15'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#bTime', el => { el.value = '00:30'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    for (const text of ['', 'unknown-place', 'sz']) {
      await fillCity(page, text);
      await page.tap('.character-form-submit');
      await page.waitForFunction(() => !document.getElementById('formError').hidden && document.getElementById('cInp').getAttribute('aria-invalid') === 'true');
      const state = await page.evaluate(() => ({
        error: document.getElementById('formError').textContent,
        text: document.getElementById('cInp').value, id: document.getElementById('bPlace').value,
        date: document.getElementById('bDate').value, time: document.getElementById('bTime').value,
        noResult: !window._ctx && document.getElementById('calculationOverlay').hidden,
      }));
      assert.match(state.error, /选择出生地点/);
      assert.equal(state.text, text);
      assert.equal(state.id, '');
      assert.equal(state.date, '1995-06-15');
      assert.equal(state.time, '00:30');
      assert.ok(state.noResult, `未选择城市不能开始推演：${text}`);
    }
    await delay(2900);
    assert.equal(await page.$eval('#formError', el => el.hidden), false, '错误不能几秒后自动消失');
    await page.evaluate(() => { window.TJCloseForm(); window.TJOpenForm(); });
    assert.deepEqual(await page.evaluate(() => [document.getElementById('cInp').value, document.getElementById('bPlace').value]), ['sz', ''], '关闭再打开应保留未完成的出生地');
    await page.tap('#cInp');
    await page.waitForSelector('#city-option-shenzhen');
    await page.tap('#city-option-shenzhen');
    assert.deepEqual(await page.evaluate(() => [document.getElementById('cInp').value, document.getElementById('bPlace').value,
      document.getElementById('cInp').getAttribute('aria-expanded'), document.getElementById('formError').hidden]), ['深圳', 'shenzhen', 'false', true]);
    await page.tap('.character-form-submit');
    await resultReady(page);
    assert.deepEqual(await page.evaluate(() => [window._ctx.city.n, window._ctx.input.bp, window._ctx.input.timeStr]), ['深圳', 'shenzhen', '00:30']);
    await showReport(page);
    await context.close();
  }
  console.log('✓ 空、未知和歧义城市明确反馈；输入保留，触屏选城后可重试');

  // A stale saved profile with an unknown city opens the form instead of
  // silently substituting coordinates. An exact Chinese city name can be
  // accepted without requiring another tap on the candidate.
  {
    const { page, context } = await setup();
    await page.evaluate(() => {
      document.getElementById('bPlace').value = 'deleted-city';
      document.getElementById('cInp').value = '';
      window.TJCloseForm();
      void window.calc();
    });
    await page.waitForFunction(() => document.getElementById('formModal').classList.contains('open') && !document.getElementById('formError').hidden);
    assert.equal(await page.$eval('#bPlace', el => el.value), 'deleted-city');
    assert.equal(await page.evaluate(() => !!window._ctx), false);
    await page.$eval('#cInp', el => { el.value = '北京市'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.tap('.character-form-submit');
    await resultReady(page);
    assert.deepEqual(await page.evaluate(() => [window._ctx.city.n, window._ctx.input.bp, document.getElementById('cInp').value]), ['北京', 'beijing', '北京']);
    await showReport(page);
    await context.close();
  }
  console.log('✓ 旧档案无效城市不会被替换；准确输入城市名称可直接推演');

  // Combobox supports keyboard selection and Escape must not dismiss the form.
  {
    const { page, context } = await setup();
    await fillCity(page, 'bei');
    assert.equal(await page.$eval('#cInp', el => el.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', isComposing: true, bubbles: true, cancelable: true,
    }))), true, '输入法组合期间的回车不能被城市选择器拦截');
    assert.equal(await page.$eval('#bPlace', el => el.value), '');
    await fillCity(page, 'sh');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => [document.getElementById('cInp').value, document.getElementById('bPlace').value,
      document.getElementById('cInp').getAttribute('aria-expanded')]), ['上海', 'shanghai', 'false']);
    await fillCity(page, 'sz');
    await page.keyboard.press('Enter');
    assert.match(await page.$eval('#formError', el => el.textContent), /选择出生地点/);
    assert.equal(await page.$eval('#bPlace', el => el.value), '');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.$eval('#cInp', el => el.getAttribute('aria-activedescendant')), 'city-option-suzhou');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => [document.getElementById('cInp').value, document.getElementById('bPlace').value]), ['苏州', 'suzhou']);
    await page.$eval('#cInp', el => el.blur());
    await page.focus('#cInp');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#cDD', el => el.classList.contains('show')), false);
    assert.equal(await page.$eval('#formModal', el => el.classList.contains('open')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#formModal', el => el.classList.contains('open')), false, '候选关闭后再次按 Escape 应关闭表单');
    await context.close();
  }
  console.log('✓ 城市键盘选择、读屏状态与 Escape');

  // Simulate the visible viewport shrinking when a software keyboard appears.
  // This exercises placement logic only; it is not an iOS keyboard test.
  {
    const { page, context } = await setup();
    await fillCity(page, 'sz');
    const placement = await page.evaluate(() => {
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: { offsetTop: 0, height: 500 } });
      window.dispatchEvent(new Event('resize'));
      return { input: document.getElementById('cInp').getBoundingClientRect().toJSON(),
        list: document.getElementById('cDD').getBoundingClientRect().toJSON() };
    });
    assert.ok(placement.list.top >= 0 && placement.list.bottom <= 500, '候选应位于模拟键盘上方的可见视口');
    assert.ok(placement.list.bottom <= placement.input.top, '空间不足时，短候选列表应贴合输入框上方');
    await context.close();
  }
  console.log('✓ 视口缩小时城市候选重新定位');

  // A missing date gets a persistent form error rather than silently doing
  // nothing. Once fixed, the same form can proceed.
  {
    const { page, context } = await setup();
    await page.$eval('#bDate', el => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.tap('.character-form-submit');
    await page.waitForFunction(() => !document.getElementById('formError').hidden);
    assert.match(await page.$eval('#formError', el => el.textContent), /出生日期/);
    assert.equal(await page.$eval('#bDate', el => el.getAttribute('aria-invalid')), 'true');
    await page.$eval('#bDate', el => { el.value = '1995-06-15'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#bTime', el => { el.value = '00:30'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.$eval('#formError', el => el.hidden), true);
    await page.tap('.character-form-submit');
    await resultReady(page);
    await showReport(page);
    const positions = await page.evaluate(() => window.__w3dData.astro.planets.slice(0, 3).map(p => p.absDegree));
    const midnight = calcWesternChart(1995, 6, 15, 0, 30, 121.5, 31.2).planets.slice(0, 3).map(p => p.absDegree);
    const noon = calcWesternChart(1995, 6, 15, 12, 30, 121.5, 31.2).planets.slice(0, 3).map(p => p.absDegree);
    positions.forEach((position, index) => assert.ok(Math.abs(position - midnight[index]) < 1e-9, '真实报告必须使用 00:30 而不是 12:30'));
    assert.ok(Math.abs(positions[2] - noon[2]) > 90, '午夜与中午的上升位置应有明显差别');
    await context.close();
  }
  console.log('✓ 缺少日期可修正；真实西方报告按午夜时间计算');

  // The optional scene should tolerate old browser focus options, a missing
  // presentation label and a failed matchMedia call without blocking results.
  {
    const { page, context } = await setup();
    await page.evaluate(() => {
      document.getElementById('calculationByline').id = 'calculationByline-test';
      const originalMatch = window.matchMedia;
      let fail = true;
      window.matchMedia = function(query) {
        if (fail && query === '(prefers-reduced-motion: reduce)') { fail = false; throw new Error('simulated old WebView'); }
        return originalMatch.call(this, query);
      };
      const originalFocus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function(options) {
        if (arguments.length) throw new TypeError('focus options unsupported');
        return originalFocus.call(this);
      };
      window.__restoreCompatibility = () => { window.matchMedia = originalMatch; HTMLElement.prototype.focus = originalFocus; };
    });
    await page.tap('.character-form-submit');
    await resultReady(page);
    assert.ok(await page.evaluate(() => !!window._ctx?.b && !document.getElementById('calculationContinue').hidden));
    await showReport(page);
    await page.evaluate(() => window.__restoreCompatibility());
    await context.close();
  }
  console.log('✓ 兼容旧式焦点选项、可选场景文案和媒体查询失败');

  // Old Safari versions lack Object.hasOwn. Removing just that API in Chromium
  // verifies our compatibility path, not the rest of Safari's behavior.
  {
    const { page, context } = await setup({ oldHasOwn: true, oldFocus: true });
    assert.equal(await page.evaluate(() => typeof Object.hasOwn), 'undefined');
    await page.tap('.character-form-submit');
    await resultReady(page);
    await showReport(page);
    assert.ok(await page.$('#characterResultHero'));
    await page.evaluate(() => window.openNoviceGuide());
    await page.waitForSelector('#noviceGuideModal.open');
    await context.close();
  }
  console.log('✓ 缺少 Object.hasOwn 或焦点选项时可选择特质、推演、阅读报告和打开指引');

  // A real rendering error restores the form and previous context; the
  // explanation stays visible until the user edits or retries.
  {
    const { page, context } = await setup();
    await page.evaluate(() => {
      window.__previousContext = { marker: 'previous' };
      window._ctx = window.__previousContext;
      window._formDirty = true;
      document.getElementById('bDate').value = '1992-09-21';
      document.getElementById('p2Inner').id = 'p2Inner-test';
    });
    await page.tap('.character-form-submit');
    await page.waitForFunction(() => !document.getElementById('formError').hidden && document.getElementById('formError').textContent.includes('推演未完成'));
    const state = await page.evaluate(() => ({ open: document.getElementById('formModal').classList.contains('open'),
      inert: document.getElementById('formModal').hasAttribute('inert'), hidden: document.getElementById('calculationOverlay').hidden,
      date: document.getElementById('bDate').value, city: document.getElementById('bPlace').value,
      previous: window._ctx === window.__previousContext, dirty: window._formDirty }));
    assert.deepEqual(state, { open: true, inert: false, hidden: true, date: '1992-09-21', city: 'shanghai', previous: true, dirty: true });
    await delay(2900);
    assert.equal(await page.$eval('#formError', el => el.hidden), false);
    await page.evaluate(() => { document.getElementById('p2Inner-test').id = 'p2Inner'; });
    await page.tap('.character-form-submit');
    await resultReady(page);
    await showReport(page);
    assert.equal(await page.evaluate(() => window._ctx.input.bd_raw), '1992-09-21');
    await context.close();
  }
  console.log('✓ 推演异常保留输入和旧数据、持久显示原因并可重试');

  assert.deepEqual(errors, [], `未捕获的页面异常：${errors.join('; ')}`);
} finally {
  await browser.close();
}
