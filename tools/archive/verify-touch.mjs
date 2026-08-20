import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
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
  return { x1: r.left - 4, x2: r.right + 4, y: r.top + r.height / 2, rTop: r.top, rBottom: r.bottom };
});
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);
  const pos = await findPos();
  if (!pos) { console.log('未找到'); await browser.close(); process.exit(0); }
  await page.evaluate(({y}) => { window.scrollTo(0, Math.max(0, y - 250)); }, pos);
  await sleep(500);
  const pos2 = await findPos();
  // 触摸拖选（touch 环境用 mouse 模拟）
  await page.mouse.move(pos2.x1, pos2.y); await page.mouse.down();
  await page.mouse.move(pos2.x2, pos2.y, { steps: 8 });
  await page.mouse.up();
  await sleep(1100);
  const info = await page.evaluate(() => {
    const chip = document.getElementById('glossChip');
    if (!chip) return { err: 'no chip' };
    const r = chip.getBoundingClientRect();
    return {
      chipTop: Math.round(r.top), chipBottom: Math.round(r.bottom),
      chipVisible: r.top > 0 && r.bottom < window.innerHeight,
      isTouchDetected: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
    };
  });
  // 选区位置
  const selRect = await page.evaluate(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    return { selTop: Math.round(r.top), selBottom: Math.round(r.bottom) };
  });
  console.log('移动端检测:', JSON.stringify(info));
  console.log('选区:', JSON.stringify(selRect));
  console.log('结论: 胶囊在选区' + (info.chipTop && selRect && info.chipTop >= selRect.selBottom ? '下方 ✓ (未被上方系统菜单遮蔽)' : '上方/异常'));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
