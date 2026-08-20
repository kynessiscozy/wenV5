import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calhol', { recursive: true });
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
  await page.evaluate(() => document.querySelector('#calFab')?.click());
  await sleep(800);
  // 当前月（2026-08）无节日。切到 2026-10 看国庆节
  await page.evaluate(() => { for (let i = 0; i < 2; i++) document.querySelector('[data-nav="1"]')?.click(); });
  await sleep(600);
  const oct = await page.evaluate(() => {
    const days = [...document.querySelectorAll('.tw-cal-day:not(.blank)')];
    const holidayCells = days.filter(x => x.querySelector('.hol')).map(x => ({ d: x.querySelector('.d').textContent, hol: x.querySelector('.hol').textContent, cls: x.className.split(' ').slice(0,3).join('.') }));
    return { month: document.querySelector('.tw-cal-month').textContent, holidayCells };
  });
  console.log('2026年10月:', JSON.stringify(oct));
  // 点 10-1 → 详情含国庆节 tag + 心情选择器
  await page.evaluate(() => document.querySelector('.tw-cal-day[data-k="2026-10-01"]')?.click());
  await sleep(300);
  const detail = await page.evaluate(() => ({
    holTag: document.querySelector('.tw-cal-dt .hol-tag')?.textContent,
    moodTT: document.querySelector('.tw-cal-mood .tt')?.textContent,
    moodCount: document.querySelectorAll('.tw-cal-mood .opts .m').length,
  }));
  console.log('详情卡:', JSON.stringify(detail));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calhol/oct.png' });
  // 记录心情 😀
  await page.evaluate(() => document.querySelector('.tw-cal-mood [data-mood="great"]')?.click());
  await sleep(400);
  const mood = await page.evaluate(() => ({
    cellMood: document.querySelector('.tw-cal-day[data-k="2026-10-01"] .mood')?.textContent,
    stored: JSON.parse(localStorage.getItem('tj_cal_mood') || '{}'),
  }));
  console.log('心情记录:', JSON.stringify(mood));
  // 切到春节月份 2 月
  await page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('[data-nav="-1"]')?.click(); });
  await sleep(600);
  const feb = await page.evaluate(() => {
    const days = [...document.querySelectorAll('.tw-cal-day:not(.blank)')];
    const h = days.filter(x => x.querySelector('.hol')).map(x => x.querySelector('.d').textContent + ':' + x.querySelector('.hol').textContent).slice(0, 8);
    return { month: document.querySelector('.tw-cal-month').textContent, cells: h };
  });
  console.log('春节月:', JSON.stringify(feb));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calhol/feb.png' });
  // 切到调休月 5 月（5-9 调休上班）
  await page.evaluate(() => { for (let i = 0; i < 3; i++) document.querySelector('[data-nav="1"]')?.click(); });
  await sleep(600);
  const may = await page.evaluate(() => {
    const h = [...document.querySelectorAll('.tw-cal-day:not(.blank)')].filter(x => x.querySelector('.hol')).map(x => x.querySelector('.d').textContent + ':' + x.querySelector('.hol').textContent);
    return { month: document.querySelector('.tw-cal-month').textContent, cells: h };
  });
  console.log('劳动节月:', JSON.stringify(may));
  console.log('JS 错误:', errs.length, errs.slice(0, 3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
