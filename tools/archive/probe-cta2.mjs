import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const r = await page.evaluate(() => {
    const main = document.querySelector('#homeCtaMain');
    const cal = document.querySelector('#homeCtaCal');
    const cs = getComputedStyle(main);
    const cc = getComputedStyle(cal);
    const mr = main.getBoundingClientRect();
    const cr = cal.getBoundingClientRect();
    return {
      main: { w: Math.round(mr.width), h: Math.round(mr.height), radius: cs.borderRadius, pad: cs.padding },
      cal: { w: Math.round(cr.width), h: Math.round(cr.height), radius: cc.borderRadius },
    };
  });
  console.log(JSON.stringify(r));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
