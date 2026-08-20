import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/caltext', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
const check = () => page.evaluate(() => {
  const cal = document.querySelector('#homeCtaCal');
  const main = document.querySelector('#homeCtaMain');
  const cr = cal.getBoundingClientRect(), mr = main.getBoundingClientRect();
  const ccs = getComputedStyle(cal);
  return {
    calText: cal.textContent.trim(),
    calW: Math.round(cr.width), calH: Math.round(cr.height),
    calOverflow: cal.scrollWidth > cal.clientWidth,
    calFontSize: ccs.fontSize,
    equal: Math.round(cr.width) === Math.round(mr.width),
    hasSvg: !!cal.querySelector('svg'),
  };
});
try {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  console.log('移动端:', JSON.stringify(await check()));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/caltext/mobile.png' });
  await page.setViewport({ width: 1280, height: 900 });
  await sleep(500);
  console.log('桌面端:', JSON.stringify(await check()));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/caltext/desktop.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
