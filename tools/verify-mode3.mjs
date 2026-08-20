import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/mode3', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  // 1) 三个按钮
  const btns = await page.evaluate(() => [...document.querySelectorAll('.mode-top-switch')].map(b => b.textContent));
  console.log('顶部按钮:', JSON.stringify(btns));
  // 2) 点「日历」
  await page.evaluate(() => document.querySelector('#modeCalendar')?.click());
  await sleep(900);
  const cal = await page.evaluate(() => ({
    activeBtn: document.querySelector('.mode-top-switch.active')?.textContent,
    toolOpen: document.querySelector('#toolModal')?.classList.contains('open'),
    calTitle: document.querySelector('.tw-mast-title')?.textContent,
    bodyBeginner: document.body.classList.contains('beginner-mode'),
  }));
  console.log('点日历:', JSON.stringify(cal));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/mode3/cal-open.png' });
  // 3) 关闭日历 → 恢复之前模式（默认 beginner）
  await page.evaluate(() => window.closeToolPage());
  await sleep(400);
  const restore = await page.evaluate(() => ({
    activeBtn: document.querySelector('.mode-top-switch.active')?.textContent,
    toolClosed: !document.querySelector('#toolModal')?.classList.contains('open'),
  }));
  console.log('关闭后恢复:', JSON.stringify(restore));
  // 4) 切到大师再开日历再关
  await page.evaluate(() => document.querySelector('#modeMaster')?.click());
  await sleep(300);
  await page.evaluate(() => document.querySelector('#modeCalendar')?.click());
  await sleep(800);
  await page.evaluate(() => window.closeToolPage());
  await sleep(400);
  const restore2 = await page.evaluate(() => document.querySelector('.mode-top-switch.active')?.textContent);
  console.log('大师→日历→关闭恢复:', restore2);
  // 5) 新手/大师切换正常
  await page.evaluate(() => document.querySelector('#modeBeginner')?.click());
  await sleep(300);
  const beginner = await page.evaluate(() => ({ active: document.querySelector('.mode-top-switch.active')?.textContent, cls: document.body.classList.contains('beginner-mode') }));
  console.log('切新手:', JSON.stringify(beginner));
  console.log('JS 错误:', errs.length, errs.slice(0,3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
