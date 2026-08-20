import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const BASE = 'https://afec98a9e4eec3cc8.bj10.agentos-app.net';
const OUT = '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/onboard-theme/deploy';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const out = {};
try {
  for (const theme of ['light','dark']) {
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await page.evaluate(t => { localStorage.setItem('tj_theme', t); localStorage.removeItem('tj_onboarded_v1'); }, theme);
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.onboard-overlay', { timeout: 8000 });
    await sleep(500);
    await page.screenshot({ path: OUT + '/' + theme + '-s1.png' });
    out[theme] = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-theme'),
      title: document.querySelector('.onboard-title')?.textContent,
      nextBg: getComputedStyle(document.querySelector('.onboard-next')).backgroundColor,
      activeDot: getComputedStyle(document.querySelector('.onboard-dot.active')).backgroundColor,
    }));
  }
} catch (e) { out.error = e.message; }
finally { console.log(JSON.stringify(out, null, 1)); await browser.close(); }
