/* 明暗双主题工具截图验证 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:5173/wenV2/';
const OUT = '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/theme';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=480,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));

try {
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(800);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);

  const tools = ['wealth', 'career', 'date', 'style', 'layoff', 'daily', 'name', 'oracle', 'lottery', 'zodiac', 'relation', 'answerbook'];

  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => { localStorage.setItem('tj_theme', t); location.reload(); }, theme);
    await sleep(2500);
    await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
    await sleep(3500);

    for (const id of tools) {
      await page.evaluate(i => window.openToolPage(i), id);
      await sleep(600);
      // 二级页工具进入结果页
      const map = { career: '#twCGen', layoff: '#twLGen', name: '#twNGen', lottery: '#twLotDraw', oracle: '#twODraw', relation: '#twRRun' };
      if (map[id]) {
        if (id === 'relation') {
          await page.evaluate(() => {
            const el = document.querySelector('#twRDate');
            if (el) { el.value = '1992-08-20'; el.dispatchEvent(new Event('change', { bubbles: true })); }
          });
        }
        await page.evaluate(s => document.querySelector(s)?.click(), map[id]);
        await sleep(id === 'oracle' ? 3000 : 800);
      }
      await page.screenshot({ path: OUT + '/' + theme + '-' + id + '.png' });
      await page.evaluate(() => window.closeToolPage());
      await sleep(300);
    }
  }

  console.log('JS 错误数:', errors.length);
  errors.slice(0, 5).forEach(e => console.log('ERR:', e.slice(0, 130)));
} catch (e) {
  console.error('异常:', e.message);
} finally {
  await browser.close();
}
