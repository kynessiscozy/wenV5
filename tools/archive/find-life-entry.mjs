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
  // 工具中心 + 全 tab
  await page.evaluate(() => document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
  await sleep(1200);
  const r = await page.evaluate(() => {
    const res = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const n = walk.currentNode;
      if (n.nodeValue && n.nodeValue.includes('日常决策')) {
        const p = n.parentElement;
        res.push((p.className || p.id || p.tagName) + ' :: ' + n.nodeValue.trim().slice(0, 30));
      }
    }
    return res.slice(0, 10);
  });
  console.log('含"日常决策"文本:', JSON.stringify(r));
  // 打开 AI 面板看有没有工具引导列表
  await page.evaluate(() => window.openAsk());
  await sleep(800);
  const ai = await page.evaluate(() => {
    const txt = document.getElementById('aiSheet')?.innerText || '';
    return { hasCal: txt.includes('日历'), hasDaily: txt.includes('日常决策'), len: txt.length };
  });
  console.log('AI 面板:', JSON.stringify(ai));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
