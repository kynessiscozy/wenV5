import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const r = await page.evaluate(() => {
    const main = document.querySelector('#homeCtaMain');
    const mr = main.getBoundingClientRect();
    return { w: Math.round(mr.width), h: Math.round(mr.height), fs: getComputedStyle(main).fontSize };
  });
  console.log('桌面输入信息按钮:', JSON.stringify(r));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
