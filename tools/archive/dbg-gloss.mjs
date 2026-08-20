import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);
  const info = await page.evaluate(() => {
    const fnStr = (window.annotateGlossary || '').toString().slice(0, 60);
    const term = document.querySelector('#page2 .glossary-term');
    const termInfo = term ? { text: term.textContent, parent: term.parentElement.className, html: term.outerHTML.slice(0, 120) } : null;
    return { fnStr, termInfo, count: document.querySelectorAll('#page2 .glossary-term').length };
  });
  console.log(JSON.stringify(info, null, 1));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
