import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => window.openAsk());
  await sleep(400);
  await page.evaluate(() => window.doAsk('「用神」是什么意思？能用大白话给我讲讲吗'));
  await sleep(1500);
  const r = await page.evaluate(() => ({
    sheetOpen: document.getElementById('aiSheet')?.classList.contains('open'),
    userBubbles: [...document.querySelectorAll('#askResult .chat-bubble-user')].map(b => b.textContent.trim().slice(0, 45)),
  }));
  console.log('doAsk 验证:', JSON.stringify(r));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
