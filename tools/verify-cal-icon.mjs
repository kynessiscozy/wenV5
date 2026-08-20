import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calicon', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const r = await page.evaluate(() => {
    const cal = document.querySelector('#homeCtaCal');
    const main = document.querySelector('#homeCtaMain');
    const cr = cal.getBoundingClientRect(), mr = main.getBoundingClientRect();
    const actions = document.querySelector('.home-hero-actions').getBoundingClientRect();
    return {
      calText: cal.textContent.trim(),
      hasSvg: !!cal.querySelector('svg'),
      calW: Math.round(cr.width), calH: Math.round(cr.height),
      sameRow: Math.abs(cr.top - mr.top) < 2,
      inActions: cr.left >= actions.left && cr.right <= actions.right,
      iconOnly: !cal.textContent.trim() && !!cal.querySelector('svg'),
    };
  });
  console.log('日历按钮:', JSON.stringify(r));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calicon/home.png' });
  // 点击仍可打开日历
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(900);
  const opened = await page.evaluate(() => ({
    calOpen: document.querySelector('#toolModal')?.classList.contains('open'),
    fullscreen: document.querySelector('#toolModal')?.classList.contains('cal-fullscreen'),
  }));
  console.log('点击打开:', JSON.stringify(opened));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
