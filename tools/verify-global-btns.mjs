import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage','--window-size=480,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  // 首页按钮
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  // 报告页顶栏 + 工具中心
  await page.evaluate(() => document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
  await sleep(1200);
  const zero = await page.evaluate(() => {
    const out = [];
    const targets = document.querySelectorAll('#page2 button, .p2-top button, .ig-dock button, .home-menu-btn, .p2-back, .mode-top-switch, .back-to-top, .theme-toggle, .ai-fab, .tool-tile');
    targets.forEach(b => {
      const r = getComputedStyle(b).borderRadius;
      if (r === '0px') out.push((b.className || b.id || b.tagName).toString().slice(0, 50));
    });
    return out;
  });
  console.log('全局圆角0按钮:', zero.length ? zero.join(', ') : '无');
  // 打开一个工具弹窗内的所有按钮（含结果页）
  await page.evaluate(() => window.openToolPage('relation'));
  await sleep(600);
  await page.evaluate(() => { const el = document.querySelector('#twRDate'); if (el) { el.value = '1992-08-20'; el.dispatchEvent(new Event('change', { bubbles: true })); } document.querySelector('#twRRun')?.click(); });
  await sleep(1000);
  const zero2 = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#toolModalContent button').forEach(b => {
      if (getComputedStyle(b).borderRadius === '0px') out.push((b.className || b.id).toString().slice(0, 40));
    });
    return out;
  });
  console.log('relation 弹窗圆角0按钮:', zero2.length ? zero2.join(', ') : '无');
  await page.evaluate(() => window.closeToolPage());
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
