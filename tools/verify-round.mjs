import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage','--window-size=480,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
const OUT = '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/round';
import { mkdirSync } from 'fs'; mkdirSync(OUT, { recursive: true });
await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
await sleep(800);
await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
await sleep(3500);
const shots = [['career','#twCGen',800],['oracle','#twODraw',3000],['layoff','#twLGen',800],['name','#twNGen',800],['lottery','#twLotDraw',800],['zodiac',null,300],['wealth',null,300],['date',null,300]];
for (const [id, sel, wait] of shots) {
  await page.evaluate(i => window.openToolPage(i), id);
  await sleep(600);
  if (sel) { await page.evaluate(s => document.querySelector(s)?.click(), sel); await sleep(wait); }
  await page.screenshot({ path: OUT + '/' + id + '.png' });
  await page.evaluate(() => window.closeToolPage());
  await sleep(300);
}
console.log('errors:', errs.length, errs.slice(0,3).join(' | '));
await browser.close();
