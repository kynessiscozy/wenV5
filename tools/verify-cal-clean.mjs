import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calclean', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  await page.evaluate(() => document.querySelector('#calFab')?.click());
  await sleep(900);
  const r = await page.evaluate(() => {
    const content = document.querySelector('#toolModalContent')?.innerText || '';
    return {
      hasDailyGroup: content.includes('日常决策'),
      hasName: content.includes('日历模式'),
      hasDesc: content.includes('把应用当作日历'),
      hasMonth: content.includes('年') && content.includes('月'),
      hasGrid: document.querySelectorAll('.tw-cal-day:not(.blank)').length,
    };
  });
  console.log('日历内容检查:', JSON.stringify(r));
  console.log('结论:', !r.hasDailyGroup && !r.hasName && !r.hasDesc ? '✅ 字样已去除' : '❌ 仍有残留');
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calclean/clean.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
