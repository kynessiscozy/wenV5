/* tools2 v2 验证：二级结果页交互 + 单页工具回归 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:5173/wenV2/';
const OUT = '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=480,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });

const results = [];
const report = (id, ok, note) => results.push({ id, ok, note });

try {
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(800);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);

  async function openTool(id) {
    await page.evaluate(i => window.openToolPage(i), id);
    await sleep(650);
  }
  async function closeTool() {
    await page.evaluate(() => window.closeToolPage());
    await sleep(300);
  }
  const hasSel = sel => page.evaluate(s => !!document.querySelector(s), sel);
  const clickSel = sel => page.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); return !!el; }, sel);

  /* —— 二级结果页工具 —— */
  const flow = [
    {
      id: 'career', act: () => clickSel('#twCGen'), wait: 700,
      expectForm: '#twCGen', expectResult: '.tw-view-result:not(.tw-view-hidden) .tw-result-page',
    },
    {
      id: 'layoff', act: () => clickSel('#twLGen'), wait: 700,
      expectForm: '#twLGen', expectResult: '.tw-view-result:not(.tw-view-hidden) .tw-result-page',
    },
    {
      id: 'name', act: () => clickSel('#twNGen'), wait: 700,
      expectForm: '#twNGen', expectResult: '.tw-view-result:not(.tw-view-hidden) .tw-result-page',
    },
    {
      id: 'lottery', act: () => clickSel('#twLotDraw'), wait: 900,
      expectForm: '#twLotDraw', expectResult: '.tw-view-result:not(.tw-view-hidden) .tw-result-page',
    },
    {
      id: 'oracle', act: () => clickSel('#twODraw'), wait: 3200,
      expectForm: '#twODraw', expectResult: '.tw-view-result:not(.tw-view-hidden) .tw-result-page',
    },
    {
      id: 'relation',
      act: async () => {
        await page.evaluate(() => {
          const el = document.querySelector('#twRDate');
          if (el) { el.value = '1992-08-20'; el.dispatchEvent(new Event('change', { bubbles: true })); }
        });
        await clickSel('#twRRun');
      },
      wait: 900,
      expectForm: '#twRRun', expectResult: '.tw-view-result:not(.tw-view-hidden) .tw-result-page',
    },
  ];

  for (const t of flow) {
    await openTool(t.id);
    const formOk = await hasSel(t.expectForm);
    await t.act();
    await sleep(t.wait);
    const resultOk = await hasSel(t.expectResult);
    // 关键：在结果页状态截图（验证二级结果页视觉）
    await page.screenshot({ path: OUT + '/v2-' + t.id + '-result.png' });
    // 再测返回
    await clickSel('.tw-result-page [data-gofrom]');
    await sleep(400);
    const backOk = await hasSel(t.expectForm);
    report(t.id, formOk && resultOk && backOk, `表单:${formOk} 结果:${resultOk} 返回:${backOk}`);
    await closeTool();
  }

  /* —— 单页工具回归 —— */
  const single = ['wealth', 'style', 'zodiac', 'daily', 'date', 'answerbook'];
  for (const id of single) {
    await openTool(id);
    const ok = await hasSel('.tw-mast-title');
    report(id, ok, ok ? '正常' : '未渲染');
    await page.screenshot({ path: OUT + '/v2-' + id + '.png' });
    await closeTool();
  }

  console.log('\n==== 二级结果页验证 ====');
  for (const r of results) console.log((r.ok ? '✅' : '❌') + ' ' + r.id + '  ' + r.note);
  console.log('JS 错误数:', errors.length);
  errors.slice(0, 6).forEach(e => console.log('  ERR:', e.slice(0, 150)));
} catch (e) {
  console.error('异常:', e.message);
} finally {
  await browser.close();
}
