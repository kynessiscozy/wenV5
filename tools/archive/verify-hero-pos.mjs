import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/heropos', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
const pos = () => page.evaluate(() => {
  const t = document.querySelector('.home-hero-title').getBoundingClientRect();
  const a = document.querySelector('.home-hero-actions').getBoundingClientRect();
  return {
    viewH: window.innerHeight,
    titleTop: Math.round(t.top), actionsTop: Math.round(a.top), actionsBottom: Math.round(a.bottom),
    centerGap: Math.round(Math.abs((a.top + a.height / 2) - window.innerHeight / 2)),
  };
});
try {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  console.log('移动端:', JSON.stringify(await pos()));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/heropos/mobile.png' });
  await page.setViewport({ width: 1280, height: 900 });
  await sleep(600);
  console.log('桌面端:', JSON.stringify(await pos()));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/heropos/desktop.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
