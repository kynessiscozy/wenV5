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
  return { x1: r.left - 4, x2: r.right + 4, y: r.top + r.height / 2, rTop: r.top, rBottom: r.bottom, rLeft: r.left };
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
  await page.mouse.move(pos2.x1, pos2.y);
  await page.mouse.down();
  await page.mouse.move(pos2.x2, pos2.y, { steps: 8 });
  await page.mouse.up();
  await sleep(600);
  // 1) 冷却期内点击 → 应无效（Dock 仍为操作模式）
  const armState = await page.evaluate(() => ({
    armed: document.querySelector('.ig-dock .tab-bar-inner')?.classList.contains('dock-gloss-arm'),
  }));
  console.log('冷却期内状态:', JSON.stringify(armState));
  await page.evaluate(() => document.querySelector('.dock-gloss-x')?.click());
  await sleep(200);
  const during = await page.evaluate(() => ({
    popOpen: document.getElementById('glossPop')?.classList.contains('open'),
    dockMode: document.querySelector('.ig-dock .tab-bar-inner')?.classList.contains('dock-gloss-mode'),
  }));
  console.log('冷却期内点击:', JSON.stringify(during), during.popOpen ? '❌ 误触!' : '✅ 已拦截');
  // 2) 冷却结束（等 500ms+）→ 点解释 → 弹窗出现在选区旁
  await sleep(800);
  await page.evaluate(() => document.querySelector('.dock-gloss-x')?.click());
  await sleep(300);
  const after = await page.evaluate(() => {
    const pop = document.getElementById('glossPop');
    if (!pop?.classList.contains('open')) return { open: false };
    const pr = pop.getBoundingClientRect();
    return { open: true, popTop: Math.round(pr.top), popLeft: Math.round(pr.left), popBottom: Math.round(pr.bottom) };
  });
  console.log('冷却后点解释:', JSON.stringify(after));
  console.log('选区位置: top=' + Math.round(pos2.rTop) + ' bottom=' + Math.round(pos2.rBottom) + ' left=' + Math.round(pos2.rLeft));
  console.log('结论: 弹窗' + (after.popTop >= pos2.rTop && after.popTop <= pos2.rBottom + 140 ? '位于选区附近 ✓' : '未靠近选区'));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/dockgloss/pop-anchor.png' });
  // 3) 问问大师冷却同样有效
  await page.evaluate(() => { document.getElementById('glossPop')?.classList.remove('open'); document.getSelection().removeAllRanges(); });
  await sleep(400);
  await page.mouse.move(pos2.x1, pos2.y);
  await page.mouse.down();
  await page.mouse.move(pos2.x2, pos2.y, { steps: 8 });
  await page.mouse.up();
  await sleep(600);
  await page.evaluate(() => document.querySelector('.dock-gloss-ai')?.click());
  await sleep(200);
  const askDuring = await page.evaluate(() => document.getElementById('aiSheet')?.classList.contains('open'));
  console.log('冷却期内点问问大师(应拦截):', !askDuring ? '✅ 已拦截' : '❌ 误触');
  await sleep(800);
  await page.evaluate(() => document.querySelector('.dock-gloss-ai')?.click());
  await sleep(1500);
  const askAfter = await page.evaluate(() => ({ open: document.getElementById('aiSheet')?.classList.contains('open'), bubble: document.querySelector('#askResult .chat-bubble-user')?.textContent.slice(0, 20) || '' }));
  console.log('冷却后点问问大师:', JSON.stringify(askAfter));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
