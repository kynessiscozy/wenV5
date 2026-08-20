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
  // 找含"用神"的可视文本
  const pos = await page.evaluate(() => {
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
  console.log('目标:', JSON.stringify(pos));
  if (!pos) { console.log('未找到用神文本'); await browser.close(); process.exit(0); }
  await page.evaluate(({y}) => { window.scrollTo(0, Math.max(0, y - 250)); }, pos);
  await sleep(500);
  const pos2 = await page.evaluate(() => {
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
  await page.mouse.move(pos2.x1, pos2.y);
  await page.mouse.down();
  await page.mouse.move(pos2.x2, pos2.y, { steps: 8 });
  await page.mouse.up();
  await sleep(900);
  const chips = await page.evaluate(() => ({
    explain: document.getElementById('glossChip')?.textContent || null,
    ai: document.getElementById('glossChipAi')?.textContent || null,
  }));
  console.log('双胶囊:', JSON.stringify(chips));
  // 1) 点解释 → 弹窗含 AI 按钮
  await page.evaluate(() => document.getElementById('glossChip')?.click());
  await sleep(300);
  const pop = await page.evaluate(() => {
    const p = document.getElementById('glossPop');
    return p?.classList.contains('open') ? { tt: document.getElementById('glossPopTt').textContent, ai: document.getElementById('glossPopAi')?.textContent } : null;
  });
  console.log('解释弹窗:', JSON.stringify(pop));
  // 2) 点弹窗内 AI 按钮 → 应打开问问大师并发送问题
  await page.evaluate(() => document.getElementById('glossPopAi')?.click());
  await sleep(1200);
  const ask = await page.evaluate(() => {
    const a = document.getElementById('askPanel') || document.querySelector('.ask-panel') || document.querySelector('#p2');
    const input = document.getElementById('askInput') || document.querySelector('.ask-input textarea, .ask-input input, #askPanel input, #askPanel textarea');
    const val = input?.value || '';
    return { panelOpen: !!a, panelId: a?.id || a?.className || '', inputVal: val, bodyClass: document.body.className };
  });
  console.log('问问大师状态:', JSON.stringify(ask));
  // 3) 右键菜单含 AI 项（重新选中）
  await page.mouse.click(pos2.x1 + 10, pos2.y, { button: 'right' });
  await sleep(400);
  const menu = await page.evaluate(() => document.getElementById('glossCtx')?.innerText.replace(/\s+/g, ' ') || null);
  console.log('右键菜单:', menu);
  await page.evaluate(() => document.getElementById('glossCtx')?.remove());
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
