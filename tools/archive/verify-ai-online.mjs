import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('https://afec98a9e4eec3cc8.bj10.agentos-app.net/', { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1500);
  const n = await page.evaluate(() => Object.keys(window.__TJ_GLOSSARY__ || {}).length);
  // 全链路：选中→双胶囊→AI跳转
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);
  await page.evaluate(() => window.openAsk());
  await sleep(400);
  await page.evaluate(() => window.doAsk('「命宫」是什么意思？'));
  await sleep(1500);
  const r = await page.evaluate(() => ({
    sheetOpen: document.getElementById('aiSheet')?.classList.contains('open'),
    bubble: document.querySelector('#askResult .chat-bubble-user')?.textContent.trim().slice(0, 24) || '',
  }));
  console.log('线上术语数:', n, '| AI 面板:', r.sheetOpen ? '开 ✓' : '关 ✗', '| 问题气泡:', r.bubble);
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
