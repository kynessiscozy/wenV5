import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.BASE_URL || 'http://localhost:5173/index.html';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const views = new Set();
let reference;
try {
  for (const [key, theme, focus] of [
    ['diyan', 'diyan', '行动与优先级'], ['yuchen', 'yuchen', '节奏与资源'],
    ['moonfox', 'moonfox', '线索与依据'], ['xiyao', 'xingling', '关系与沟通'],
  ]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluateOnNewDocument(persona => {
      localStorage.setItem('wen_funnel_v1', JSON.stringify({ trait: persona, bd: '1990-06-15', applied: 1, teasered: 1 }));
    }, key);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(id => document.documentElement.dataset.homeTheme === id && typeof window.TJOpenForm === 'function', { timeout: 20000 }, theme);
    await page.evaluate(() => window.TJOpenForm());
    await page.waitForSelector('#formModal.open');
    await page.$eval('#bDate', el => { el.value = '1990-06-15'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#bTime', el => { el.value = '11:23'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('.character-form-submit');
    await page.waitForFunction(() => document.querySelector('#calculationOverlay')?.dataset.calculationState === 'ready', { timeout: 20000 });
    await page.click('#calculationContinue');
    await page.waitForFunction(() => document.body.classList.contains('report-active') && !!document.querySelector('.guide-perspective'), { timeout: 20000 });
    const result = await page.evaluate(() => {
      const ctx = window._ctx;
      const astro = window.__w3dData?.astro;
      return {
        values: {
          pillars: ['Y', 'M', 'D', 'H'].map(k => ({ g: ctx.b[k].g, z: ctx.b[k].z })),
          wx: ctx.wx, scores: ctx.scores, cDy: ctx.cDy, cLn: ctx.cLn,
          sun: astro?.sun?.name, moon: astro?.moon?.name, asc: astro?.asc?.name,
        },
        title: document.querySelector('.guide-perspective-title').textContent,
        prompt: document.querySelector('.guide-perspective-prompt').textContent,
        evidence: document.querySelector('.guide-perspective-facts.sys-eastern').textContent,
        note: document.querySelector('.guide-perspective-note').textContent,
      };
    });
    assert.equal(result.title, focus);
    assert.match(result.evidence, /^命盘线索：/);
    assert.match(result.note, /不改变排盘或评分/);
    views.add(result.prompt);
    if (reference) assert.deepEqual(result.values, reference, '引路人不得改变真实排盘、分数或星盘');
    else reference = result.values;
    await page.evaluate(() => window.setSystemMode('western'));
    const western = await page.$eval('.guide-perspective-facts.sys-western', el => ({ text: el.textContent, visible: getComputedStyle(el).display !== 'none' }));
    assert.ok(western.visible && western.text.startsWith('星盘线索：'), '西方视图使用实际星盘线索');
    await context.close();
  }
  assert.equal(views.size, 4, '四位引路人的阅读建议必须不同');
  assert.deepEqual(errors, []);
  console.log('✓ 四位引路人提供不同阅读建议，真实八字、评分和星盘保持一致');
} finally {
  await browser.close();
}
