import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);
  const dockW0 = await page.evaluate(() => Math.round(document.querySelector('.ig-dock.tab-bar').getBoundingClientRect().width));
  // 滚动 p2Scroll
  await page.evaluate(() => { document.getElementById('p2Scroll').scrollTop = 800; });
  await sleep(400);
  const after = await page.evaluate(() => {
    const dock = document.querySelector('.ig-dock.tab-bar');
    return {
      dockW: Math.round(dock.getBoundingClientRect().width),
      dockH: Math.round(dock.getBoundingClientRect().height),
      scrollingClass: document.body.classList.contains('ig-dock-scrolling'),
      scaleVar: getComputedStyle(dock).getPropertyValue('--ig-dock-scale').trim() || '(未定义)',
      indicator: !!document.querySelector('.tab-indicator.ready'),
    };
  });
  console.log('滚动前 Dock 宽:', dockW0);
  console.log('滚动后:', JSON.stringify(after));
  console.log('结论:', after.scrollingClass ? '❌ 仍有收缩 class' : '✅ 无收缩 class', '| 宽度不变:', after.dockW === dockW0 ? '✅' : '❌');
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
