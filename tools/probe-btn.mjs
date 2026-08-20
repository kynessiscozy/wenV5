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
  const info = await page.evaluate(() => {
    const sel = s => { const el = document.querySelector(s); if (!el) return null; const c = getComputedStyle(el); return { bg: c.backgroundColor, radius: c.borderRadius, color: c.color }; };
    return {
      done: sel('.tw-result-ops .tw-btn-primary'),
      refill: sel('.tw-result-ops .tw-btn-ghost'),
      barMarginTop: getComputedStyle(document.querySelector('.tw-result-bar')).marginTop,
      barTop: document.querySelector('.tw-result-bar').getBoundingClientRect().top,
      sheetTop: document.querySelector('.tool-sheet').getBoundingClientRect().top,
    };
  });
  console.log(JSON.stringify(info));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
