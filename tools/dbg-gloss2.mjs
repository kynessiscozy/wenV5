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
  const r = await page.evaluate(() => {
    // 1. 检查 GLOSSARY 是否含"日主"
    const has = typeof GLOSSARY !== 'undefined' ? !!GLOSSARY['日主'] : 'GLOSSARY未定义';
    // 2. 选中文字
    const walker = document.createTreeWalker(document.getElementById('p2Inner'), NodeFilter.SHOW_TEXT);
    let target = null;
    while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeValue && n.nodeValue.includes('日主')) { target = n; break; } }
    let selText = '无目标';
    if (target) {
      const idx = target.nodeValue.indexOf('日主');
      const range = document.createRange();
      range.setStart(target, Math.max(0, idx - 1));
      range.setEnd(target, idx + 2);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      selText = sel.toString();
    }
    // 3. installSelectionGloss 是否加载（检查 window 上有无痕迹）
    const mainSrc = document.querySelector('script[type=module]') ? 'module' : 'none';
    return { hasGlossary: has, selText, mainSrc };
  });
  console.log(JSON.stringify(r));
  // 手动触发 selectionchange（真实事件）
  await page.evaluate(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
  await sleep(500);
  const chip = await page.evaluate(() => !!document.getElementById('glossChip'));
  console.log('手动 selectionchange 后 chip 存在:', chip);
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
