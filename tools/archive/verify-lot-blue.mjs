import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/lotblue', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  // light
  await page.evaluate(() => window.openToolPage('lottery'));
  await sleep(600);
  await page.evaluate(() => document.querySelector('#twLotDraw')?.click());
  await sleep(1200);
  const light = await page.evaluate(() => {
    const b = document.querySelector('.tw-l-ball.blue');
    return b ? getComputedStyle(b).backgroundImage : '无蓝球';
  });
  console.log('Light 蓝球背景:', light);
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/lotblue/light.png' });
  await page.evaluate(() => window.closeToolPage());
  // dark
  await page.evaluate(() => { document.querySelector('.theme-toggle')?.click(); });
  await sleep(400);
  await page.evaluate(() => window.openToolPage('lottery'));
  await sleep(600);
  await page.evaluate(() => document.querySelector('#twLotDraw')?.click());
  await sleep(1200);
  const dark = await page.evaluate(() => {
    const b = document.querySelector('.tw-l-ball.blue');
    return b ? getComputedStyle(b).backgroundImage : '无蓝球';
  });
  console.log('Dark 蓝球背景:', dark);
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/lotblue/dark.png' });
  await page.evaluate(() => window.closeToolPage());
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
