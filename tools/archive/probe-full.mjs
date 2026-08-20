import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(800);
  const r = await page.evaluate(() => {
    const sheet = document.querySelector('.tool-sheet').getBoundingClientRect();
    const modal = document.querySelector('.tool-modal').getBoundingClientRect();
    const cs = getComputedStyle(document.querySelector('.tool-sheet'));
    return { modal: {w:Math.round(modal.width),h:Math.round(modal.height)}, sheet: {w:Math.round(sheet.width),h:Math.round(sheet.height),top:Math.round(sheet.top)}, maxH: cs.maxHeight, height: cs.height, margin: cs.margin };
  });
  console.log(JSON.stringify(r));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
