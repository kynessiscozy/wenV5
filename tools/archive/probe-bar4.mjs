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
    const sheet = document.querySelector('.tool-sheet');
    const bar = document.querySelector('.tw-result-bar');
    const content = document.querySelector('.tw-content');
    const cs = getComputedStyle(sheet);
    const br = bar.getBoundingClientRect();
    const sr = sheet.getBoundingClientRect();
    return {
      sheetPaddingTop: cs.paddingTop,
      sheetBorderTop: cs.borderTopWidth,
      sheetPosition: cs.position,
      barTop: Math.round(br.top), sheetTop: Math.round(sr.top),
      gap: Math.round(br.top - sr.top),
      contentPaddingTop: getComputedStyle(content).paddingTop,
    };
  });
  console.log(JSON.stringify(info));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
