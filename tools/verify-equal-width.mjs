import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/equalw', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
const check = () => page.evaluate(() => {
  const main = document.querySelector('#homeCtaMain').getBoundingClientRect();
  const cal = document.querySelector('#homeCtaCal').getBoundingClientRect();
  const ccs = getComputedStyle(document.querySelector('#homeCtaCal'));
  return {
    main: { w: Math.round(main.width), h: Math.round(main.height) },
    cal: { w: Math.round(cal.width), h: Math.round(cal.height) },
    equal: Math.round(main.width) === Math.round(cal.width),
    radius: ccs.borderRadius,
    hasSvg: !!document.querySelector('#homeCtaCal svg'),
    text: document.querySelector('#homeCtaCal').textContent.trim(),
  };
});
try {
  // 移动端
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const m = await check();
  console.log('移动端:', JSON.stringify(m));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/equalw/mobile.png' });
  // 桌面端
  await page.setViewport({ width: 1280, height: 900 });
  await sleep(500);
  const d = await check();
  console.log('桌面端:', JSON.stringify(d));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/equalw/desktop.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
