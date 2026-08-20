import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calback', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  // 打开日历
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(900);
  const r = await page.evaluate(() => {
    const back = document.querySelector('.tw-cal-back');
    const bar = document.querySelector('.tw-cal-bar');
    const month = document.querySelector('.tw-cal-month');
    const navs = document.querySelectorAll('.tw-cal-nav').length;
    const br = back.getBoundingClientRect(), mr = month.getBoundingClientRect();
    const menuDisplay = getComputedStyle(document.getElementById('homeMenuBtn')).display;
    return {
      backText: back?.textContent, navs,
      monthCenter: Math.round(mr.left + mr.width / 2), viewCenter: Math.round(window.innerWidth / 2),
      backLeft: Math.round(br.left),
      hamburgerHidden: menuDisplay === 'none',
      fullscreen: document.querySelector('#toolModal')?.classList.contains('cal-fullscreen'),
    };
  });
  console.log('日历顶部:', JSON.stringify(r));
  console.log('月份居中偏差:', r.monthCenter - r.viewCenter, 'px');
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calback/top.png' });
  // 点返回 → 关闭日历 + 汉堡恢复
  await page.evaluate(() => document.querySelector('.tw-cal-back')?.click());
  await sleep(500);
  const closed = await page.evaluate(() => ({
    modalClosed: !document.querySelector('#toolModal')?.classList.contains('open'),
    hamburgerBack: getComputedStyle(document.getElementById('homeMenuBtn')).display !== 'none',
  }));
  console.log('点返回关闭:', JSON.stringify(closed));
  console.log('JS 错误:', errs.length, errs.slice(0,3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
