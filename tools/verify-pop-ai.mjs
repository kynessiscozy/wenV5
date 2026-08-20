import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/popai', { recursive: true });
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
  await page.evaluate(() => document.querySelector('.gloss-chip-x')?.click());
  await sleep(300);
  const pop = await page.evaluate(() => {
    const b = document.getElementById('glossPopAi');
    return { open: document.getElementById('glossPop')?.classList.contains('open'), aiText: b?.textContent, hasSvg: !!b?.querySelector('svg'), label: b?.getAttribute('aria-label') };
  });
  console.log('解释弹窗 AI 按钮:', JSON.stringify(pop));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/popai/pop.png' });
  // 点击仍可跳转
  await page.evaluate(() => document.getElementById('glossPopAi')?.click());
  await sleep(1500);
  const ask = await page.evaluate(() => ({ sheetOpen: document.getElementById('aiSheet')?.classList.contains('open'), bubble: document.querySelector('#askResult .chat-bubble-user')?.textContent.slice(0, 20) || '' }));
  console.log('点击跳转:', JSON.stringify(ask));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
