import puppeteer from 'puppeteer';
const BASE=process.env.BASE_URL||'http://localhost:5173/';


const OUT = process.env.OUT || '/tmp/shots';
const fs = await import('node:fs');
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

async function setTheme(t) {
  await page.evaluate(t => {
    localStorage.setItem('tj_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, t);
}

for (const theme of ['light', 'dark']) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await setTheme(theme);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: `${OUT}/01-home-${theme}.png` });

  // 生成报告
  await page.evaluate(() => window.calc(true));
  await new Promise(r => setTimeout(r, 3800));
  await page.screenshot({ path: `${OUT}/02-report-${theme}.png` });

  // 运势 tab
  await page.evaluate(() => document.querySelector('.tab-item[data-sec="s-yun"]')?.click());
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: `${OUT}/03-yun-${theme}.png` });

  // 工具 tab
  await page.evaluate(() => document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: `${OUT}/04-tools-${theme}.png` });

  // AI 面板
  await page.evaluate(() => window.openAsk && window.openAsk());
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: `${OUT}/05-ask-${theme}.png` });
}

console.log(errors.length ? 'CONSOLE ERRORS:\n' + [...new Set(errors)].slice(0, 15).join('\n') : 'no console errors');
await browser.close();
