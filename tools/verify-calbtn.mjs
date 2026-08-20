import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calbtn', { recursive: true });
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
  // 1) 顶部按钮应为两档 + 右侧圆形日历按钮
  const btns = await page.evaluate(() => ({
    modes: [...document.querySelectorAll('.mode-top-switch')].map(b => b.textContent),
    calFab: !!document.querySelector('#calFab'),
    calFabTitle: document.querySelector('#calFab')?.title,
  }));
  console.log('顶部结构:', JSON.stringify(btns));
  // 2) 点日历按钮 → 打开日历，新手高亮不变
  await page.evaluate(() => document.querySelector('#calFab')?.click());
  await sleep(900);
  const open = await page.evaluate(() => ({
    toolOpen: document.querySelector('#toolModal')?.classList.contains('open'),
    calTitle: document.querySelector('.tw-mast-title')?.textContent,
    modeActive: document.querySelector('.mode-top-switch.active')?.textContent,
    fabActive: document.querySelector('#calFab')?.classList.contains('active'),
    beginner: document.body.classList.contains('beginner-mode'),
  }));
  console.log('打开日历:', JSON.stringify(open));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calbtn/open.png' });
  // 3) 关闭 → 日历按钮取消高亮，新手/大师不变
  await page.evaluate(() => window.closeToolPage());
  await sleep(400);
  const close = await page.evaluate(() => ({
    fabActive: document.querySelector('#calFab')?.classList.contains('active'),
    modeActive: document.querySelector('.mode-top-switch.active')?.textContent,
  }));
  console.log('关闭后:', JSON.stringify(close));
  // 4) 大师模式下开日历再关，模式保持大师
  await page.evaluate(() => document.querySelector('#modeMaster')?.click());
  await sleep(300);
  await page.evaluate(() => document.querySelector('#calFab')?.click());
  await sleep(800);
  await page.evaluate(() => window.closeToolPage());
  await sleep(400);
  const final = await page.evaluate(() => document.querySelector('.mode-top-switch.active')?.textContent);
  console.log('大师→日历→关闭 模式:', final);
  console.log('JS 错误:', errs.length, errs.slice(0,3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
