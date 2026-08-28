import puppeteer from 'puppeteer';
const URL = 'https://afec98a9e4eec3cc8.bj10.agentos-app.net';
const out = '/root/.codebuddy/artifact';
const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/chromium', args: ['--no-sandbox','--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 900));

// 顶部调色盘按钮
const pal = await page.$('#homeOrbPaletteBtn');
if (pal) { const b = await pal.boundingBox(); if (b) await page.screenshot({ path: `${out}/cap_palette_btn.png`, clip: { x: Math.max(0,b.x-8), y: Math.max(0,b.y-8), width: b.width+16, height: b.height+16 } }); }

// 强制显示底部 DOCK 并截图
await page.evaluate(() => { const d=document.querySelector('.ig-dock.tab-bar'); if(d) d.classList.add('show'); });
await new Promise(r => setTimeout(r, 400));
const dock = await page.$('.ig-dock.tab-bar');
if (dock) { const b = await dock.boundingBox(); if (b) await page.screenshot({ path: `${out}/cap_dock.png`, clip: { x: b.x, y: b.y, width: b.width, height: b.height } }); }

// 逐个 tab 按钮截图
const items = await page.$$('.ig-dock .tab-item, .ig-dock .ai-fab');
let i = 0;
for (const it of items) {
  const b = await it.boundingBox();
  if (b) await page.screenshot({ path: `${out}/cap_dock_item${i}.png`, clip: { x: b.x, y: b.y, width: b.width, height: b.height } });
  i++;
}
console.log('dock items:', i);
await browser.close();
