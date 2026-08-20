import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 120)));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const t1 = await page.evaluate(() => ({ hasOpenAsk: typeof window.openAsk === 'function', openAskSrc: (window.openAsk || '').toString().slice(0, 80) }));
  console.log('openAsk:', JSON.stringify(t1));
  const r1 = await page.evaluate(() => { window.openAsk(); return true; });
  await sleep(600);
  const s1 = await page.evaluate(() => document.getElementById('aiSheet')?.classList.contains('open'));
  console.log('直接 openAsk 后面板:', s1);
  await page.evaluate(() => { if (typeof window.closeAsk === 'function') window.closeAsk(); });
  await sleep(300);
  // 走 askMasterGloss 等效路径
  const r2 = await page.evaluate(() => {
    window.openAsk();
    setTimeout(() => { if (typeof window.doAsk === 'function') window.doAsk('「用神」是什么意思？'); }, 260);
    return true;
  });
  await sleep(1500);
  const s2 = await page.evaluate(() => ({ open: document.getElementById('aiSheet')?.classList.contains('open'), bubble: document.querySelector('#askResult .chat-bubble-user')?.textContent?.slice(0, 20) }));
  console.log('等效路径:', JSON.stringify(s2));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
