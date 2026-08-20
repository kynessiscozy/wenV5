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
  // 找"日主"文本节点的位置
  const pos = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.getElementById('p2Inner'), NodeFilter.SHOW_TEXT);
    let target = null;
    while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeValue && n.nodeValue.includes('日主') && n.parentElement?.offsetParent) { target = n; break; } }
    if (!target) return null;
    const range = document.createRange();
    const idx = target.nodeValue.indexOf('日主');
    range.setStart(target, idx);
    range.setEnd(target, idx + 2);
    const rect = range.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width, h: rect.height };
  });
  console.log('目标位置:', JSON.stringify(pos));
  if (!pos) { console.log('未找到可见的日主文本'); await browser.close(); process.exit(0); }
  // 滚动到可见
  await page.evaluate(({y}) => { window.scrollTo(0, Math.max(0, y - 200)); }, pos);
  await sleep(500);
  // 鼠标拖选
  await page.mouse.move(pos.x, pos.y);
  await page.mouse.down();
  await page.mouse.move(pos.x + Math.min(pos.w + 20, 40), pos.y, { steps: 5 });
  await page.mouse.up();
  await sleep(800);
  const selText = await page.evaluate(() => window.getSelection()?.toString() || '');
  const chip = await page.evaluate(() => document.getElementById('glossChip')?.textContent || null);
  console.log('拖选文本:', JSON.stringify(selText));
  console.log('chip:', chip);
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
