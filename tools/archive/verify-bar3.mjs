import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  await page.evaluate(() => window.openToolPage('career'));
  await sleep(600);
  await page.evaluate(() => document.querySelector('#twCGen')?.click());
  await sleep(800);
  await page.evaluate(() => { document.querySelector('.tool-sheet').scrollTop = 500; });
  await sleep(400);
  const info = await page.evaluate(() => {
    const bar = document.querySelector('.tw-result-bar');
    const r = bar.getBoundingClientRect();
    const sheet = document.querySelector('.tool-sheet').getBoundingClientRect();
    const done = getComputedStyle(document.querySelector('.tw-result-ops .tw-btn-primary'));
    const refill = getComputedStyle(document.querySelector('.tw-result-ops .tw-btn-ghost'));
    return {
      barTopGap: Math.round(r.top - sheet.top),
      barHasBg: bar.classList.contains('tw-bar-scrolled'),
      doneBg: done.backgroundColor, doneRadius: done.borderRadius,
      refillRadius: refill.borderRadius, refillBg: refill.backgroundColor,
    };
  });
  console.log(JSON.stringify(info));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
