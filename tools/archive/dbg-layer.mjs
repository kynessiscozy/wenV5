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
  const d = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const cs = s => { const e = q(s); if (!e) return null; const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { w: Math.round(r.width), left: Math.round(r.left), pl: c.paddingLeft, pr: c.paddingRight, ml: c.marginLeft, mr: c.marginRight, border: c.borderLeftWidth, pos: c.position, overflow: c.overflowY }; };
    return {
      modal: cs('.tool-modal'),
      sheet: cs('.tool-sheet'),
      view: cs('.tw-view'),
      vform: cs('.tw-view-result'),
      rpage: cs('.tw-result-page'),
      bar: cs('.tw-result-bar'),
      ops: cs('.tw-result-ops'),
      side: getComputedStyle(q('.tw-content')).getPropertyValue('--tw-side'),
    };
  });
  console.log(JSON.stringify(d, null, 1));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
