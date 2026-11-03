import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { HOME_THEMES } from '../src/ui/home-theme.js';

// 旧首页老虎机选角与出生信息表单已彻底删除：funnel.html 是唯一入口，
// 人物与出生信息都经 wen_funnel_v1 交接。本测试覆盖主应用侧的新契约：
// 无旧入口 DOM、默认月白主题、交接人物→主题映射、待机卡回漏斗、
// 待消费交接自动推演且只消费一次。
const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];

async function newPage({ payload = null } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 390, height: 844 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (payload) {
    await page.evaluateOnNewDocument(p => {
      try { localStorage.setItem('wen_funnel_v1', JSON.stringify(p)); } catch (e) {}
    }, payload);
  }
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.dataset.homeReady === 'true' && !!window.__wenFlow, { timeout: 15000 });
  return { page, context };
}

try {
  // 1) 全新访客：无老虎机/旧表单，默认月白主题与文案，待机卡可见。
  {
    const { page, context } = await newPage();
    const state = await page.evaluate(() => ({
      picker: !!document.getElementById('traitSelection'),
      form: !!document.getElementById('formModal'),
      summary: !!document.getElementById('homeTraitSummary'),
      openForm: typeof window.TJOpenForm,
      theme: document.documentElement.dataset.homeTheme,
      traitColor: getComputedStyle(document.documentElement).getPropertyValue('--trait-color').trim(),
      fallback: !document.getElementById('entryFallback').hidden,
    }));
    assert.deepEqual(
      { picker: state.picker, form: state.form, summary: state.summary, openForm: state.openForm },
      { picker: false, form: false, summary: false, openForm: 'undefined' },
      '老虎机与旧表单必须彻底移除');
    assert.equal(state.theme, 'moonfox', '首屏默认月白主题');
    assert.equal(state.traitColor.toLowerCase(), HOME_THEMES.moonfox.trait.color.toLowerCase(), '主题色跟随当前人物');
    assert.ok(state.fallback, '无交接时停在待机卡');
    await context.close();
  }
  console.log('✓ 无旧入口 DOM，默认月白主题与待机卡');

  // 2) 待机卡主按钮回唯一入口 funnel.html 重新录入。
  {
    const { page, context } = await newPage();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('#entryFallback .ef-primary'),
    ]);
    assert.ok(page.url().includes('funnel.html'), '应回漏斗首屏重新录入');
    await context.close();
  }
  console.log('✓ 待机卡主按钮回漏斗首屏');

  // 3) 已消费交接只应用主题（含 xiyao→xingling 映射），不重复推演。
  for (const [trait, theme] of [['diyan', 'diyan'], ['xiyao', 'xingling'], ['moonfox', 'moonfox']]) {
    const { page, context } = await newPage({ payload: { v: 1, applied: 1, trait } });
    const state = await page.evaluate(() => ({
      theme: document.documentElement.dataset.homeTheme,
      overlay: document.getElementById('calculationOverlay').hidden,
      report: document.body.classList.contains('report-active'),
    }));
    assert.equal(state.theme, theme, `${trait} 应映射到 ${theme} 主题`);
    assert.ok(state.overlay && !state.report, '已消费交接不重复推演');
    await context.close();
  }
  console.log('✓ 交接人物驱动主题（含汐瑶主题映射）');

  // 4) 待消费交接：自动写入出生信息并推演到报告，只消费一次。
  {
    const { page, context } = await newPage({
      payload: { v: 1, applied: 0, trait: 'moonfox', bd: '1995-06-15', timeStr: '09:30', cityName: '杭州市', gen: 'female', ts: Date.now() },
    });
    await page.waitForFunction(() => document.getElementById('calculationOverlay')?.dataset.calculationState === 'ready', { timeout: 20000 });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.homeTheme), 'moonfox');
    assert.equal(await page.evaluate(() => window._ctx.input.bd_raw), '1995-06-15', '推演使用交接生日');
    assert.equal(await page.evaluate(() => window._ctx.input.bp), 'hangzhou', '自由填写城市按名称解析');
    await page.click('#calculationContinue');
    await page.waitForFunction(() => document.body.classList.contains('report-active'), { timeout: 15000 });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wen_funnel_v1')).applied), 1, '交接应标记已消费');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.homeReady === 'true' && !!window.__wenFlow, { timeout: 15000 });
    const afterReload = await page.evaluate(() => ({
      overlay: document.getElementById('calculationOverlay').hidden,
      report: document.body.classList.contains('report-active'),
    }));
    assert.ok(afterReload.overlay && !afterReload.report, '刷新后不重复推演');
    await context.close();
  }
  console.log('✓ 待消费交接自动推演且只消费一次');

  assert.deepEqual(errors, [], '页面不应有未捕获错误');
  console.log('✓ 新入口契约（月白优先/主题跟随/回漏斗/自动推演）全部通过');
} finally {
  await browser.close();
}
