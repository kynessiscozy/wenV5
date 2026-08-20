import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(700);
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(700);
  const r = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const cal = document.querySelector('.tw-cal');
    const grid = document.querySelector('.tw-cal-grid');
    const days = [...document.querySelectorAll('.tw-cal-day')];
    const cr = cal.getBoundingClientRect();
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const d0 = days.find(d=>!d.classList.contains('blank'))?.getBoundingClientRect();
    // 检测日柱文字溢出
    let overflowDays = 0;
    days.forEach(d=>{ if(d.scrollWidth > d.clientWidth+1) overflowDays++; });
    const detail = document.querySelector('.tw-cal-detail');
    const dr = detail.getBoundingClientRect();
    const gz = document.querySelector('.tw-cal-day:not(.blank) .gz');
    const ops = document.querySelector('.tw-cal-ops').getBoundingClientRect();
    return {
      vw, vh,
      docScrollW: document.scrollingElement.scrollWidth, horizontalScroll: document.scrollingElement.scrollWidth > vw,
      calW: Math.round(cr.width), calLeft: Math.round(cr.left), calRight: Math.round(cr.right),
      calFits: Math.round(cr.right) <= vw+1 && Math.round(cr.left) >= -1,
      gridCols: cols,
      dayW: d0 ? Math.round(d0.width) : null, dayH: d0 ? Math.round(d0.height) : null,
      dayFontPx: gz ? getComputedStyle(gz).fontSize : null,
      overflowDays,
      opsTop: Math.round(ops.top),
      detailH: Math.round(dr.height), detailTop: Math.round(dr.top),
      calBottom: Math.round(cr.bottom),
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calnav/diag-mobile.png', fullPage: false });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
