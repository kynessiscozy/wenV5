import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/homecal', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  // 1) 首页三个按钮
  const btns = await page.evaluate(() => [...document.querySelectorAll('.home-hero-actions button')].map(b => b.textContent.trim() || '[图标]'));
  console.log('首页按钮:', JSON.stringify(btns));
  // 2) 无推演数据 → 点日历 → 全屏纯日历模式
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(900);
  const cal = await page.evaluate(() => {
    const modal = document.querySelector('#toolModal');
    const sheet = document.querySelector('.tool-sheet');
    const sr = sheet.getBoundingClientRect();
    return {
      open: modal?.classList.contains('open'),
      fullscreen: modal?.classList.contains('cal-fullscreen'),
      noClose: modal?.classList.contains('no-close'),
      sheetFill: Math.round(sr.width) >= window.innerWidth - 2 && Math.round(sr.height) >= window.innerHeight - 2,
      pill: document.querySelector('.tw-cal-pill')?.textContent,
      hasScore: !!document.querySelector('.tw-cal-score'),
    };
  });
  console.log('全屏日历(无推演):', JSON.stringify(cal));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/homecal/full.png' });
  // 3) 关闭 → 生成示例推演 → 再开日历（应显示个性化）
  await page.evaluate(() => document.querySelector('.tool-modal-bg')?.click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(900);
  const cal2 = await page.evaluate(() => ({
    open: document.querySelector('#toolModal')?.classList.contains('open'),
    fullscreen: document.querySelector('#toolModal')?.classList.contains('cal-fullscreen'),
    pill: document.querySelector('.tw-cal-pill')?.textContent,
    hasScore: !!document.querySelector('.tw-cal-score'),
    grid: document.querySelectorAll('.tw-cal-day:not(.blank)').length,
  }));
  console.log('全屏日历(有推演):', JSON.stringify(cal2));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/homecal/personal.png' });
  // 4) 关闭后其他工具恢复非全屏
  await page.evaluate(() => document.querySelector('.tool-modal-bg')?.click());
  await sleep(400);
  await page.evaluate(() => window.openToolPage('wealth'));
  await sleep(700);
  const wealth = await page.evaluate(() => ({
    fullscreen: document.querySelector('#toolModal')?.classList.contains('cal-fullscreen'),
    noClose: document.querySelector('#toolModal')?.classList.contains('no-close'),
    closeBtn: getComputedStyle(document.querySelector('.tool-sheet-close')).display,
  }));
  console.log('其他工具恢复:', JSON.stringify(wealth));
  console.log('JS 错误:', errs.length, errs.slice(0,3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
