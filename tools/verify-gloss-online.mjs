import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('https://afec98a9e4eec3cc8.bj10.agentos-app.net/', { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1500);
  const n = await page.evaluate(() => Object.keys(window.__TJ_GLOSSARY__ || {}).length);
  const sample = await page.evaluate(() => (window.__TJ_GLOSSARY__ || {})['八门'] || '缺失');
  console.log('线上术语数:', n, '| 八门解释:', sample.slice(0, 30));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
