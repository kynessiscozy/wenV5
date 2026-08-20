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
  // 工具中心
  await page.evaluate(() => document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
  await sleep(1200);
  const found = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#s-adv button, #s-adv .tool-tile, #s-adv a').forEach(b => {
      if (b.textContent.includes('日历') || (b.getAttribute('onclick')||'').includes('calendar')) out.push(b.textContent.trim().slice(0, 40));
    });
    const tiles = [...document.querySelectorAll('#s-adv .tool-tile')].map(t => t.textContent.trim().slice(0, 20));
    return { calMatches: out, tileCount: tiles.length, tiles };
  });
  console.log('工具中心:', JSON.stringify(found));
  // 全页找"日历模式"
  const anyCal = await page.evaluate(() => {
    const matches = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && el.textContent && el.textContent.includes('日历模式')) matches.push(el.parentElement?.className || el.className || el.tagName);
    });
    return matches.slice(0, 5);
  });
  console.log('全页含"日历模式"文本的元素:', JSON.stringify(anyCal));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
