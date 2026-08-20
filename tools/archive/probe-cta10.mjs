import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  const r = await page.evaluate(() => {
    const el = document.querySelector('.home-hero-actions');
    const out = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (const rule of rules) {
        if (rule.style && rule.style.marginTop && rule.selectorText && el.matches(rule.selectorText)) {
          out.push(rule.selectorText + ' => ' + rule.style.marginTop + '  [' + (sheet.href || 'inline').split('/').pop() + ']');
        }
        if (rule.cssRules) {
          for (const r2 of rule.cssRules) {
            if (r2.style && r2.style.marginTop && r2.selectorText && el.matches(r2.selectorText)) {
              out.push(r2.selectorText + ' => ' + r2.style.marginTop + '  [' + (sheet.href || 'inline').split('/').pop() + ']');
            }
          }
        }
      }
    }
    return out;
  });
  console.log('匹配规则:', JSON.stringify(r, null, 1));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
