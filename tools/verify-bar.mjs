import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage','--window-size=480,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('https://afec98a9e4eec3cc8.bj10.agentos-app.net/', { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1200);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  await page.evaluate(() => window.openToolPage('career'));
  await sleep(700);
  await page.evaluate(() => document.querySelector('#twCGen')?.click());
  await sleep(900);
  const info = await page.evaluate(() => {
    const bar = document.querySelector('.tw-result-bar');
    if (!bar) return { error: 'no bar' };
    const cs = getComputedStyle(bar);
    // 模拟滚动：先滚动结果区看 bar 是否跟随
    const page2 = document.getElementById('p2Scroll') || document.querySelector('.tool-sheet');
    return {
      position: cs.position,
      top: cs.top,
      zIndex: cs.zIndex,
      background: cs.backgroundImage,
      sheetScrollHeight: document.querySelector('.tool-sheet')?.scrollHeight,
      sheetClientHeight: document.querySelector('.tool-sheet')?.clientHeight,
    };
  });
  console.log('返回栏样式:', JSON.stringify(info));
  // 滚动 tool-sheet 到底部
  await page.evaluate(() => {
    const s = document.querySelector('.tool-sheet');
    if (s) s.scrollTop = 600;
  });
  await sleep(400);
  const posAfter = await page.evaluate(() => {
    const bar = document.querySelector('.tw-result-bar');
    if (!bar) return null;
    const r = bar.getBoundingClientRect();
    const sheet = document.querySelector('.tool-sheet').getBoundingClientRect();
    return { barTop: Math.round(r.top), sheetTop: Math.round(sheet.top), relative: Math.round(r.top - sheet.top) };
  });
  console.log('滚动后返回栏位置:', JSON.stringify(posAfter));
  // 检查加载的 css 文件名
  const cssName = await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href.split('/').pop()));
  console.log('CSS 文件:', JSON.stringify(cssName));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
