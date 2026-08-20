import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/motion', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  // 弹窗进入中（150ms 抓到半途）
  await page.evaluate(() => window.openToolPage('wealth'));
  await sleep(140);
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/motion/modal-in.png' });
  await sleep(600);
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/motion/modal-open.png' });
  await page.evaluate(() => window.closeToolPage());
  await sleep(400);
  // 工具中心 hover 上浮
  await page.evaluate(() => document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
  await sleep(900);
  const tile = await page.evaluate(() => { const t = document.querySelector('.tool-tile'); const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(tile.x, tile.y);
  await sleep(350);
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/motion/tile-hover.png' });
  console.log('截图完成');
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
