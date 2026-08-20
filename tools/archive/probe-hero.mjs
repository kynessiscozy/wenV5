import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  const r = await page.evaluate(() => {
    const hero = document.querySelector('.home-hero');
    const page1 = document.getElementById('page1');
    const cs = getComputedStyle(hero);
    const ps = getComputedStyle(page1);
    const hr = hero.getBoundingClientRect(), pr = page1.getBoundingClientRect();
    return {
      hero: { top: Math.round(hr.top), h: Math.round(hr.height), display: cs.display, fd: cs.flexDirection, jc: cs.justifyContent, minH: cs.minHeight, align: cs.alignItems },
      page1: { h: Math.round(pr.height), display: ps.display, overflow: ps.overflowY, fd: ps.flexDirection, jc: ps.justifyContent },
    };
  });
  console.log(JSON.stringify(r, null, 1));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
