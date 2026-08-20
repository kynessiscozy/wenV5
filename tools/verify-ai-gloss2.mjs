import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const findPos = async () => page.evaluate(() => {
  const walker = document.createTreeWalker(document.getElementById('p2Inner'), NodeFilter.SHOW_TEXT);
  let target = null;
  while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeValue && n.nodeValue.includes('用神') && n.parentElement?.offsetParent) { target = n; break; } }
  if (!target) return null;
  const range = document.createRange();
  const idx = target.nodeValue.indexOf('用神');
  range.setStart(target, Math.max(0, idx - 1));
  range.setEnd(target, Math.min(target.nodeValue.length, idx + 3));
  const r = range.getBoundingClientRect();
  return { x1: r.left - 4, x2: r.right + 4, y: r.top + r.height / 2 };
});
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);
  const pos = await findPos();
  if (!pos) { console.log('未找到用神'); await browser.close(); process.exit(0); }
  await page.evaluate(({y}) => { window.scrollTo(0, Math.max(0, y - 250)); }, pos);
  await sleep(500);
  const pos2 = await findPos();
  // 拖选
  await page.mouse.move(pos2.x1, pos2.y);
  await page.mouse.down();
  await page.mouse.move(pos2.x2, pos2.y, { steps: 8 });
  await page.mouse.up();
  await sleep(900);
  // A) 右键菜单含 AI 项
  await page.mouse.click(pos2.x1 + 10, pos2.y, { button: 'right' });
  await sleep(400);
  const menu = await page.evaluate(() => document.getElementById('glossCtx')?.innerText.replace(/\s+/g, ' ') || null);
  console.log('右键菜单:', menu);
  // B) 点菜单 AI 项 → 跳转问问大师
  await page.evaluate(() => document.querySelector('#glossCtx [data-act="ask"]')?.click());
  await sleep(1500);
  const ask = await page.evaluate(() => ({
    sheetOpen: document.getElementById('aiSheet')?.classList.contains('open'),
    overlayOpen: document.getElementById('aiOverlay')?.classList.contains('open'),
    bubbles: [...document.querySelectorAll('#askResult .bubble')].map(b => b.textContent.trim().slice(0, 40)),
  }));
  console.log('菜单AI跳转:', JSON.stringify(ask));
  // 关闭
  await page.evaluate(() => { if (typeof window.closeAsk === 'function') window.closeAsk(); });
  await sleep(500);
  // C) 双胶囊 → AI chip
  await page.mouse.move(pos2.x1, pos2.y);
  await page.mouse.down();
  await page.mouse.move(pos2.x2, pos2.y, { steps: 8 });
  await page.mouse.up();
  await sleep(900);
  const chips = await page.evaluate(() => ({ e: document.getElementById('glossChip')?.textContent, ai: document.getElementById('glossChipAi')?.textContent }));
  console.log('双胶囊:', JSON.stringify(chips));
  await page.evaluate(() => document.getElementById('glossChipAi')?.click());
  await sleep(1500);
  const ask2 = await page.evaluate(() => ({
    sheetOpen: document.getElementById('aiSheet')?.classList.contains('open'),
    bubbles: [...document.querySelectorAll('#askResult .bubble')].map(b => b.textContent.trim().slice(0, 40)),
  }));
  console.log('AI胶囊跳转:', JSON.stringify(ask2));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
