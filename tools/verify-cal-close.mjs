import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  // 打开日历 → 检查 × 隐藏
  await page.evaluate(() => document.querySelector('#calFab')?.click());
  await sleep(800);
  const hidden = await page.evaluate(() => ({
    noClose: document.querySelector('#toolModal')?.classList.contains('no-close'),
    btnDisplay: getComputedStyle(document.querySelector('.tool-sheet-close')).display,
  }));
  console.log('日历模式关闭按钮:', JSON.stringify(hidden), hidden.btnDisplay === 'none' ? '✅ 已隐藏' : '❌');
  // 点空白（遮罩）→ 应关闭
  await page.evaluate(() => document.querySelector('.tool-modal-bg')?.click());
  await sleep(400);
  const closed = await page.evaluate(() => ({
    modalOpen: document.querySelector('#toolModal')?.classList.contains('open'),
    noCloseRemoved: !document.querySelector('#toolModal')?.classList.contains('no-close'),
  }));
  console.log('点空白关闭:', JSON.stringify(closed), !closed.modalOpen ? '✅ 已关闭' : '❌');
  // 其他工具仍有 ×
  await page.evaluate(() => window.openToolPage('wealth'));
  await sleep(700);
  const wealth = await page.evaluate(() => ({
    noClose: document.querySelector('#toolModal')?.classList.contains('no-close'),
    btnDisplay: getComputedStyle(document.querySelector('.tool-sheet-close')).display,
  }));
  console.log('其他工具关闭按钮:', JSON.stringify(wealth), wealth.btnDisplay === 'flex' || wealth.btnDisplay !== 'none' ? '✅ 正常显示' : '❌');
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
