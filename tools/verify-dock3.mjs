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
  return { x1: r.left - 4, x2: r.right + 4, y: r.top + r.height / 2 };
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
  await sleep(1000);
  const info = await page.evaluate(() => {
    const dock = document.querySelector('.ig-dock.tab-bar').getBoundingClientRect();
    const x = document.querySelector('.dock-gloss-x').getBoundingClientRect();
    const ai = document.querySelector('.dock-gloss-ai').getBoundingClientRect();
    const close = document.querySelector('.dock-gloss-close');
    const cr = close.getBoundingClientRect();
    const dockCenter = dock.left + dock.width / 2;
    const groupCenter = (x.left + ai.right) / 2;
    const cs = getComputedStyle(close);
    return {
      dockCenter: Math.round(dockCenter), groupCenter: Math.round(groupCenter),
      offset: Math.round(groupCenter - dockCenter),
      closeRadius: cs.borderRadius, closeBorder: cs.borderTopWidth,
      closeX: Math.round(cr.left), closeRight: Math.round(dock.right - cr.right),
    };
  });
  console.log('布局检查:', JSON.stringify(info));
  console.log('主按钮组居中偏差:', info.offset, 'px', Math.abs(info.offset) <= 3 ? '✅ 居中' : '❌ 偏移');
  console.log('关闭按钮外框:', info.closeBorder !== '0px' && info.closeRadius === '50%' ? '✅ 圆形外框' : '❌');
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/dockgloss/center.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
