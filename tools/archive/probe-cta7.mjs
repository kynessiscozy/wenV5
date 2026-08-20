import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/equalw', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 320, height: 720, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  const r = await page.evaluate(() => {
    const main = document.querySelector('#homeCtaMain');
    const cal = document.querySelector('#homeCtaCal');
    const actions = document.querySelector('.home-hero-actions');
    const mr = main.getBoundingClientRect(), ar = actions.getBoundingClientRect();
    return {
      viewW: window.innerWidth,
      mainW: Math.round(mr.width), calW: Math.round(cal.getBoundingClientRect().width),
      equal: Math.round(mr.width) === Math.round(cal.getBoundingClientRect().width),
      overflow: main.scrollWidth > main.clientWidth,
      outOfView: mr.right > window.innerWidth || mr.left < 0,
    };
  });
  console.log('320px:', JSON.stringify(r));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/equalw/final-mobile.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
