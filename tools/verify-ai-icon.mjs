import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/aiicon', { recursive: true });
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
  if (!pos) { console.log('未找到'); await browser.close(); process.exit(0); }
  await page.evaluate(({y}) => { window.scrollTo(0, Math.max(0, y - 250)); }, pos);
  await sleep(500);
  const pos2 = await findPos();
  await page.mouse.move(pos2.x1, pos2.y);
  await page.mouse.down();
  await page.mouse.move(pos2.x2, pos2.y, { steps: 8 });
  await page.mouse.up();
  await sleep(900);
  const chips = await page.evaluate(() => ({
    explain: document.getElementById('glossChip')?.textContent,
    aiText: document.getElementById('glossChipAi')?.textContent,
    aiHasSvg: !!document.getElementById('glossChipAi')?.querySelector('svg'),
    aiLabel: document.getElementById('glossChipAi')?.getAttribute('aria-label'),
    aiSize: document.getElementById('glossChipAi') ? getComputedStyle(document.getElementById('glossChipAi')).width : '',
  }));
  console.log('双胶囊:', JSON.stringify(chips));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/aiicon/chips.png' });
  // 解释弹窗按钮
  await page.evaluate(() => document.getElementById('glossChip')?.click());
  await sleep(300);
  const pop = await page.evaluate(() => ({
    tt: document.getElementById('glossPopTt')?.textContent,
    aiText: document.getElementById('glossPopAi')?.textContent,
    aiHasSvg: !!document.getElementById('glossPopAi')?.querySelector('svg'),
    aiLabel: document.getElementById('glossPopAi')?.getAttribute('aria-label'),
  }));
  console.log('解释弹窗:', JSON.stringify(pop));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/aiicon/pop.png' });
  await page.evaluate(() => document.getElementById('glossPop')?.classList.remove('open'));
  // 右键菜单
  await page.mouse.click(pos2.x1 + 10, pos2.y, { button: 'right' });
  await sleep(400);
  const menu = await page.evaluate(() => {
    const m = document.getElementById('glossCtx');
    const ask = m?.querySelector('[data-act="ask"]');
    return { items: [...(m?.querySelectorAll('.gloss-ctx-item') || [])].map(i => i.textContent.trim() || (i.querySelector('svg') ? '[SVG图标]' : '')), aiHasSvg: !!ask?.querySelector('svg') };
  });
  console.log('右键菜单:', JSON.stringify(menu));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/aiicon/ctx.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
