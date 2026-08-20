import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage','--window-size=480,900'] });
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
  const bg0 = await page.evaluate(() => getComputedStyle(document.querySelector('.tw-result-bar')).backgroundColor);
  console.log('未滚动返回栏背景:', bg0);
  await page.evaluate(() => { document.querySelector('.tool-sheet').scrollTop = 400; });
  await sleep(400);
  const r1 = await page.evaluate(() => ({
    bg: getComputedStyle(document.querySelector('.tw-result-bar')).backgroundColor,
    scrolled: document.querySelector('.tw-result-bar').classList.contains('tw-bar-scrolled'),
    opsBg: getComputedStyle(document.querySelector('.tw-result-ops')).backgroundColor,
    opsBlur: getComputedStyle(document.querySelector('.tw-result-ops')).backdropFilter,
  }));
  console.log('滚动后:', JSON.stringify(r1));
  // 返回表单
  await page.evaluate(() => document.querySelector('.tw-result-page [data-gofrom]')?.click());
  await sleep(300);
  const cleaned = await page.evaluate(() => !!document.querySelector('.tw-result-bar'));
  console.log('返回表单后返回栏已移除:', !cleaned);
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
