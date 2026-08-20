import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calnodata', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  // 确保无推演数据
  await page.evaluate(() => { window._ctx = null; window._baziData = null; });
  // 打开日历
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(900);
  // 无命盘详情检查
  const noChart = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.tw-cal-rows .it b')].map(b => b.textContent);
    const detailText = document.querySelector('.tw-cal-detail')?.innerText || '';
    return {
      rows,
      hasSuitable: detailText.includes('今日适合'),
      hasRhythm: detailText.includes('节奏'),
      hasTip: detailText.includes('提示'),
      hasMood: !!document.querySelector('.tw-cal-mood'),
      hasTodo: !!document.querySelector('.tw-cal-todo'),
      hasGz: !!document.querySelector('.tw-cal-dt .r'),
      hasHolidayTag: !!document.querySelector('.tw-cal-dt .hol-tag'),
    };
  });
  console.log('未排盘详情:', JSON.stringify(noChart));
  console.log('结论:', !noChart.hasSuitable && !noChart.hasRhythm && !noChart.hasTip ? '✅ 无今日适合/节奏/提示' : '❌ 仍显示');
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calnodata/pure.png' });
  // 有命盘时仍显示（生成示例推演）
  await page.evaluate(() => document.querySelector('.tool-modal-bg')?.click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(900);
  const withChart = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.tw-cal-rows .it b')].map(b => b.textContent);
    return { rows, hasScore: !!document.querySelector('.tw-cal-score') };
  });
  console.log('有命盘详情:', JSON.stringify(withChart));
  console.log('JS 错误:', errs.length, errs.slice(0,3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
