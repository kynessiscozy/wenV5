import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const r = await page.evaluate(() => {
    const main = document.querySelector('#homeCtaMain').getBoundingClientRect();
    const ghost = document.querySelector('#homeCtaGhost').getBoundingClientRect();
    const cal = document.querySelector('#homeCtaCal').getBoundingClientRect();
    return { main: {top:Math.round(main.top),h:Math.round(main.height)}, ghost: {top:Math.round(ghost.top),h:Math.round(ghost.height)}, cal: {top:Math.round(cal.top),h:Math.round(cal.height)} };
  });
  console.log(JSON.stringify(r));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
