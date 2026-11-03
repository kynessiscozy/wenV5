import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { submitBirth } from './theme-helper.mjs';

// 移动端真实触摸流程。出生信息不再有本页表单：由 funnel.html 经
// wen_funnel_v1 交接（或 applyEntryPayload 通道）写入后推演。
// 这里覆盖多尺寸触屏进入报告、自由填写城市的名称解析、无效输入反馈、
// 旧浏览器 API 兼容与推演异常可重试。
// They deliberately do not claim to be a Safari or iOS device test.
const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];

async function setup({ width = 390, height = 844, payload = null, oldHasOwn = false, oldFocus = false } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height, isMobile: width <= 430, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (oldHasOwn) await page.evaluateOnNewDocument(() => { Object.hasOwn = undefined; });
  if (oldFocus) await page.evaluateOnNewDocument(() => {
    const original = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function () {
      if (arguments.length) throw new TypeError('focus options unsupported');
      return original.call(this);
    };
  });
  if (payload) {
    await page.evaluateOnNewDocument(p => {
      try { localStorage.setItem('wen_funnel_v1', JSON.stringify(p)); } catch (e) {}
    }, payload);
  }
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window._tools2Ready === true && typeof window.calc === 'function', { timeout: 15000 });
  return { page, context };
}

async function resultReady(page) {
  await page.waitForFunction(() => document.getElementById('calculationOverlay').dataset.calculationState === 'ready', { timeout: 15000 });
}
async function showReport(page) {
  await page.tap('#calculationContinue');
  await page.waitForFunction(() => document.body.classList.contains('report-active') && document.getElementById('calculationOverlay').hidden, { timeout: 10000 });
  await page.waitForSelector('#characterResultHero');
}

try {
  // 多种手机/平板尺寸：交接自动推演 → 触屏确认 → 报告，四柱为真实计算。
  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024]]) {
    const { page, context } = await setup({
      width, height,
      payload: { v: 1, applied: 0, trait: 'moonfox', bd: '1990-06-15', timeStr: '09:00', cityName: '上海市', gen: 'male', ts: Date.now() },
    });
    await resultReady(page);
    const state = await page.evaluate(() => ({
      city: window._ctx.city.n, id: window._ctx.input.bp,
      shown: !document.getElementById('calculationOverlay').hidden,
      pillars: [...document.querySelectorAll('[data-calculation-pillar]')].map(el => el.textContent),
      actual: ['Y', 'M', 'D', 'H'].map(k => window._ctx.b[k].g + window._ctx.b[k].z),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    assert.equal(state.city, '上海');
    assert.equal(state.id, 'shanghai');
    assert.ok(state.shown);
    assert.deepEqual(state.pillars, state.actual);
    assert.equal(state.overflow, false, `${width}x${height} 推演场景不应横向溢出`);
    await showReport(page);
    await context.close();
  }
  console.log('✓ 手机与平板尺寸的交接推演、触屏确认与报告');

  // 自由填写的城市名按名称解析（含行政区后缀）；未知城市回退上海并继续，
  // 绝不静默卡死在录入环节。
  for (const [cityName, id, label] of [['深圳市', 'shenzhen', '深圳'], ['北京市', 'beijing', '北京'], ['unknown-place', 'shanghai', '上海']]) {
    const { page, context } = await setup({
      payload: { v: 1, applied: 0, trait: 'moonfox', bd: '1995-06-15', timeStr: '00:30', cityName, gen: 'female', ts: Date.now() },
    });
    await resultReady(page);
    assert.deepEqual(await page.evaluate(() => [window._ctx.city.n, window._ctx.input.bp, window._ctx.input.timeStr]),
      [label, id, '00:30'], `${cityName} 应解析为 ${label}`);
    await showReport(page);
    await context.close();
  }
  console.log('✓ 自由填写城市名称解析与未知城市回退');

  // 无效生日：明确提示、不产生结果；修正后同一通道可继续。
  {
    const { page, context } = await setup();
    await submitBirth(page, { bd: '' });
    await page.waitForFunction(() => document.querySelector('.tj-toast')?.textContent.length > 0, { timeout: 5000 });
    assert.equal(await page.evaluate(() => !!window._ctx), false, '缺少日期不能开始推演');
    assert.equal(await page.$eval('#calculationOverlay', el => el.hidden), true);
    await submitBirth(page, { bd: '1995-06-15', timeStr: '00:30' });
    await resultReady(page);
    assert.equal(await page.evaluate(() => window._ctx.input.bd_raw), '1995-06-15');
    await showReport(page);
    await context.close();
  }
  console.log('✓ 缺少日期明确反馈，修正后可推演');

  // 旧浏览器 API 缺失（Object.hasOwn / focus 选项）时交接推演与报告仍可用。
  {
    const { page, context } = await setup({
      oldHasOwn: true, oldFocus: true,
      payload: { v: 1, applied: 0, trait: 'diyan', bd: '1988-02-24', timeStr: '14:30', cityName: '广州市', gen: 'male', ts: Date.now() },
    });
    await resultReady(page);
    await showReport(page);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.homeTheme), 'diyan');
    await context.close();
  }
  console.log('✓ 缺少 Object.hasOwn 或焦点选项时可推演并阅读报告');

  // 渲染异常：提示保留、旧上下文不被污染、修正后可重试。
  {
    const { page, context } = await setup();
    await page.evaluate(() => {
      window.__previousContext = { marker: 'previous' };
      window._ctx = window.__previousContext;
      document.getElementById('p2Inner').id = 'p2Inner-for-test';
    });
    await submitBirth(page, { bd: '1992-09-21' });
    await page.waitForFunction(() => document.querySelector('.tj-toast')?.textContent.includes('推演出错'), { timeout: 10000 });
    assert.equal(await page.evaluate(() => window._ctx === window.__previousContext), true);
    assert.equal(await page.$eval('#calculationOverlay', el => el.hidden), true);
    await page.evaluate(() => { document.getElementById('p2Inner-for-test').id = 'p2Inner'; });
    await submitBirth(page, { bd: '1992-09-21' });
    await resultReady(page);
    assert.equal(await page.evaluate(() => window._ctx.input.bd_raw), '1992-09-21');
    await showReport(page);
    await context.close();
  }
  console.log('✓ 推演异常保留旧数据并可重试');

  assert.deepEqual(errors, [], '移动端流程不应有未捕获错误');
} finally {
  await browser.close();
}
