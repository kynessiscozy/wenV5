import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  const info = await page.evaluate(() => {
    const top = document.querySelector('.p2-top') || document.querySelector('.p2-head') || document.querySelector('#page2 > div');
    const els = [...document.querySelectorAll('#page2 .p2-back, #page2 .mode-top-group, #page2 .p2-actions, #page2 .p2-act, #page2 .cal-fab')].map(el => {
      const r = el.getBoundingClientRect();
      return { cls: (el.className || '').toString().slice(0, 30), w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) };
    });
    return { viewW: window.innerWidth, els };
  });
  console.log('顶栏元素:', JSON.stringify(info));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/top-crowd.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
