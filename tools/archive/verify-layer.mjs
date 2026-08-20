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
  await page.evaluate(() => window.openToolPage('relation'));
  await sleep(600);
  await page.evaluate(() => { const el = document.querySelector('#twRDate'); if (el) { el.value = '1992-08-20'; el.dispatchEvent(new Event('change', { bubbles: true })); } document.querySelector('#twRRun')?.click(); });
  await sleep(1000);
  const info = await page.evaluate(() => {
    const sheet = document.querySelector('.tool-sheet').getBoundingClientRect();
    const bar = document.querySelector('.tw-result-bar').getBoundingClientRect();
    const ops = document.querySelector('.tw-result-ops').getBoundingClientRect();
    const barCss = getComputedStyle(document.querySelector('.tw-result-bar'));
    const opsCss = getComputedStyle(document.querySelector('.tw-result-ops'));
    return {
      sheet: { w: Math.round(sheet.width), left: Math.round(sheet.left) },
      bar: { w: Math.round(bar.width), left: Math.round(bar.left), radius: barCss.borderRadius },
      ops: { w: Math.round(ops.width), left: Math.round(ops.left), radius: opsCss.borderRadius },
    };
  });
  console.log('适配检查:', JSON.stringify(info));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/ux/layer-fit.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
