import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/cal', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  // 有命盘场景（示例推演已生成 _ctx）
  await page.evaluate(() => window.openToolPage('calendar'));
  await sleep(800);
  const info = await page.evaluate(() => ({
    month: document.querySelector('.tw-cal-month')?.textContent,
    days: document.querySelectorAll('.tw-cal-day:not(.blank)').length,
    today: document.querySelector('.tw-cal-day.today .d')?.textContent,
    pill: document.querySelector('.tw-cal-pill')?.textContent,
    detail: document.querySelector('.tw-cal-dt .r')?.textContent,
    score: document.querySelector('.tw-cal-score .n')?.textContent,
    rows: [...document.querySelectorAll('.tw-cal-rows .it b')].map(b => b.textContent),
  }));
  console.log('日历(有命盘):', JSON.stringify(info));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/cal/with-chart.png' });
  // 点一个非今天日期
  await page.evaluate(() => document.querySelectorAll('.tw-cal-day:not(.blank):not(.today)')[3]?.click());
  await sleep(300);
  const sel = await page.evaluate(() => ({
    selDay: document.querySelector('.tw-cal-day.sel .d')?.textContent,
    detail: document.querySelector('.tw-cal-dt .l')?.textContent,
  }));
  console.log('点击选中:', JSON.stringify(sel));
  // 切月份
  await page.evaluate(() => document.querySelector('[data-nav="1"]')?.click());
  await sleep(400);
  const next = await page.evaluate(() => document.querySelector('.tw-cal-month')?.textContent);
  console.log('下月:', next);
  await page.evaluate(() => document.querySelector('[data-today]')?.click());
  await sleep(400);
  const back = await page.evaluate(() => document.querySelector('.tw-cal-month')?.textContent);
  console.log('回今天:', back);
  await page.evaluate(() => window.closeToolPage());
  await sleep(300);
  // 无命盘场景：直接打开（未排盘时 _ctx 无 b？示例已生成——用新会话直接开工具）
  await page.evaluate(() => { window._ctx = null; window._baziData = null; window.openToolPage('calendar'); });
  await sleep(800);
  const noChart = await page.evaluate(() => ({
    pill: document.querySelector('.tw-cal-pill')?.textContent,
    hasScore: !!document.querySelector('.tw-cal-score'),
    rows: [...document.querySelectorAll('.tw-cal-rows .it b')].map(b => b.textContent),
    dayGz: document.querySelector('.tw-cal-day .gz')?.textContent,
  }));
  console.log('日历(无命盘):', JSON.stringify(noChart));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/cal/no-chart.png' });
  console.log('JS 错误:', errs.length, errs.slice(0,3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
