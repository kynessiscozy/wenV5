import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const r = await page.evaluate(() => {
    const cal = document.querySelector('#homeCtaCal');
    const cs = getComputedStyle(cal);
    const cr = cal.getBoundingClientRect();
    return { w: Math.round(cr.width), h: Math.round(cr.height), radius: cs.borderRadius, isCircle: Math.round(cr.width) === Math.round(cr.height) && cs.borderRadius === '50%' };
  });
  console.log('圆形检查:', JSON.stringify(r));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calicon/round.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
