import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);
  // 直接模拟 askMasterGloss 的调用路径（用 window.doAsk 已验证，这里直接调函数）
  const q = await page.evaluate(() => { window.askMasterGloss('用神'); return 'called'; });
  await sleep(1800);
  const r = await page.evaluate(() => ({
    sheetOpen: document.getElementById('aiSheet')?.classList.contains('open'),
    userBubbles: [...document.querySelectorAll('#askResult .chat-bubble-user')].map(b => b.textContent.trim().slice(0, 50)),
  }));
  console.log('跳转结果:', JSON.stringify(r));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
