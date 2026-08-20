import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  const r = await page.evaluate(() => {
    const q = s => { const el = document.querySelector(s); if (!el) return null; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height), bottom: Math.round(r.bottom), display: cs.display, fd: cs.flexDirection, jc: cs.justifyContent, ai: cs.alignItems, gap: cs.gap, mt: cs.marginTop, mb: cs.marginBottom, pt: cs.paddingTop, pb: cs.paddingBottom, minH: cs.minHeight }; };
    return {
      page1: q('#page1'), hero: q('.home-hero'), copy: q('.home-hero-copy'), sub: q('.home-hero-sub'), actions: q('.home-hero-actions'),
    };
  });
  console.log(JSON.stringify(r, null, 1));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
