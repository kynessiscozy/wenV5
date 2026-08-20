import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calnav', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
const check = async () => page.evaluate(() => {
  const bar = document.querySelector('.tw-cal-bar');
  const wrap = document.querySelector('.tw-cal-monthwrap');
  const month = document.querySelector('.tw-cal-month');
  const navs = document.querySelectorAll('.tw-cal-nav');
  const br = bar.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), mr = month.getBoundingClientRect();
  const n0 = navs[0].getBoundingClientRect(), n1 = navs[1].getBoundingClientRect();
  return {
    barW: Math.round(br.width), barLeft: Math.round(br.left),
    wrapCx: Math.round(wr.left + wr.width/2),
    wrapCentered: Math.abs((wr.left+wr.width/2) - (br.left+br.width/2)) < 4,
    monthCx: Math.round(mr.left+mr.width/2),
    prevNavRightGap: Math.round(mr.left - n0.right),
    nextNavLeftGap: Math.round(n1.left - mr.right),
    navCount: navs.length,
  };
});
try {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(700); await page.evaluate(() => document.querySelector('#homeCtaCal')?.click()); await sleep(700);
  console.log('移动端:', JSON.stringify(await check()));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calnav/after-mobile.png' });
  await page.setViewport({ width: 1280, height: 900 });
  await sleep(500);
  console.log('桌面端:', JSON.stringify(await check()));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calnav/after-desktop.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
