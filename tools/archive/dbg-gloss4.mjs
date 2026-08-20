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
  const pos = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.getElementById('p2Inner'), NodeFilter.SHOW_TEXT);
    let target = null;
    while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeValue && n.nodeValue.includes('日主') && n.parentElement?.offsetParent) { target = n; break; } }
    if (!target) return null;
    const range = document.createRange();
    const idx = target.nodeValue.indexOf('日主');
    range.setStart(target, Math.max(0, idx - 1));
    range.setEnd(target, Math.min(target.nodeValue.length, idx + 3));
    const r = range.getBoundingClientRect();
    return { x1: r.left, x2: r.right, y: r.top + r.height / 2 };
  });
  if (!pos) { console.log('未找到'); await browser.close(); process.exit(0); }
  await page.evaluate(({y}) => { window.scrollTo(0, Math.max(0, y - 250)); }, pos);
  await sleep(500);
  // 重新获取位置（滚动后）
  const pos2 = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.getElementById('p2Inner'), NodeFilter.SHOW_TEXT);
    let target = null;
    while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeValue && n.nodeValue.includes('日主') && n.parentElement?.offsetParent) { target = n; break; } }
    if (!target) return null;
    const range = document.createRange();
    const idx = target.nodeValue.indexOf('日主');
    range.setStart(target, Math.max(0, idx - 1));
    range.setEnd(target, Math.min(target.nodeValue.length, idx + 3));
    const r = range.getBoundingClientRect();
    return { x1: r.left - 4, x2: r.right + 4, y: r.top + r.height / 2 };
  });
  // 拖选
  await page.mouse.move(pos2.x1, pos2.y);
  await page.mouse.down();
  await page.mouse.move(pos2.x2, pos2.y, { steps: 8 });
  await page.mouse.up();
  await sleep(900);
  const selText = await page.evaluate(() => window.getSelection()?.toString().trim() || '');
  const chip = await page.evaluate(() => document.getElementById('glossChip')?.textContent || null);
  console.log('拖选文本:', JSON.stringify(selText));
  console.log('浮动chip:', chip);

  // 右键菜单：在选区上右键
  if (chip) {
    await page.mouse.click(pos2.x1 + 10, pos2.y, { button: 'right' });
    await sleep(400);
    const menu = await page.evaluate(() => document.getElementById('glossCtx')?.innerText.replace(/\s+/g, ' ') || null);
    console.log('右键菜单:', menu);
    // 点解释
    await page.evaluate(() => document.querySelector('#glossCtx [data-act=explain]')?.click());
    await sleep(300);
    const pop = await page.evaluate(() => {
      const p = document.getElementById('glossPop');
      return p?.classList.contains('open') ? document.getElementById('glossPopTt').textContent + ' → ' + document.getElementById('glossPopBd').textContent.slice(0, 30) : null;
    });
    console.log('解释弹窗:', pop);
  }
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
