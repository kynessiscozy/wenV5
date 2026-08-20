import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.removeItem('tj_onboarded_v1'));
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.onboard-overlay', { timeout: 5000 });
  const s = await page.evaluate(() => {
    const icon = document.querySelector('.onboard-icon');
    const title = document.querySelector('.onboard-title');
    const cs = getComputedStyle(icon), ts = getComputedStyle(title);
    return {
      icon: { color: cs.color, fontSize: cs.fontSize, opacity: cs.opacity, filter: cs.filter },
      title: { color: ts.color, fontSize: ts.fontSize, opacity: ts.opacity, visibility: ts.visibility },
      titleText: title?.textContent,
      iconText: icon?.textContent,
      tryHidden: document.querySelector('.onboard-try').hidden,
      tryDisplay: getComputedStyle(document.querySelector('.onboard-try')).display,
    };
  });
  console.log(JSON.stringify(s, null, 1));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
