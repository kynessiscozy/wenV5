import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  await page.evaluate(() => document.querySelector('#calFab')?.click());
  await sleep(800);
  await page.evaluate(() => { for (let i = 0; i < 2; i++) document.querySelector('[data-nav="1"]')?.click(); });
  await sleep(600);
  // 点击 10-1
  const before = await page.evaluate(() => document.querySelector('.tw-cal-dt .l')?.textContent);
  await page.evaluate(() => document.querySelector('.tw-cal-day[data-k="2026-10-1"]')?.click());
  await sleep(300);
  const after = await page.evaluate(() => ({
    dt: document.querySelector('.tw-cal-dt .l')?.textContent,
    hol: document.querySelector('.tw-cal-dt .hol-tag')?.textContent,
    selCell: document.querySelector('.tw-cal-day.sel')?.dataset.k,
  }));
  console.log('点击前详情:', before);
  console.log('点击后:', JSON.stringify(after));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
