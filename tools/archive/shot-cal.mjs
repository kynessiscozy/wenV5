import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calnav', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(800);
  const r = await page.evaluate(() => {
    const bar = document.querySelector('.tw-cal-bar');
    const back = document.querySelector('.tw-cal-back');
    const month = document.querySelector('.tw-cal-month');
    const navs = document.querySelector('.tw-cal-navs');
    const br = bar.getBoundingClientRect(), mr = month.getBoundingClientRect(), nr = navs.getBoundingClientRect();
    return {
      barW: Math.round(br.width),
      backRect: back && back.getBoundingClientRect(),
      monthRect: { left: Math.round(mr.left), right: Math.round(mr.right), cx: Math.round(mr.left+mr.width/2) },
      navRect: { left: Math.round(nr.left), right: Math.round(nr.right), cx: Math.round(nr.left+nr.width/2) },
      backText: back && back.textContent.trim(),
    };
  });
  console.log('布局:', JSON.stringify(r));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calnav/current.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
