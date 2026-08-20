import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  const r = await page.evaluate(() => {
    const title = document.querySelector('.home-hero-title').getBoundingClientRect();
    const actions = document.querySelector('.home-hero-actions').getBoundingClientRect();
    const copy = document.querySelector('.home-hero-copy');
    return {
      titleTop: Math.round(title.top), actionsTop: Math.round(actions.top),
      actionsBottom: Math.round(actions.bottom), viewH: window.innerHeight,
      copyPadTop: getComputedStyle(copy).paddingTop,
    };
  });
  console.log('当前:', JSON.stringify(r));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
