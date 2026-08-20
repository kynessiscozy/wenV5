import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const total = await page.evaluate(() => Object.keys(window.__TJ_GLOSSARY__ || {}).length);
  console.log('浏览器内 GLOSSARY 术语数:', total);
  // 验证新术语可通过工具函数命中
  const hit = await page.evaluate(() => {
    // 模拟选中"桃花"后的匹配逻辑（与 installSelectionGloss 相同口径）
    const keys = Object.keys(window.__TJ_GLOSSARY__).sort((a,b)=>b.length-a.length);
    const exact = keys.find(k => '命宫桃花' === k);
    const sub = keys.find(k => '命宫桃花'.includes(k));
    return { exact: !!exact, sub, def: window.__TJ_GLOSSARY__['命宫'], shensha: window.__TJ_GLOSSARY__['桃花'] };
  });
  console.log('命中检查:', JSON.stringify(hit));
  // 全链路：选中"桃花"拖选 → chip → 解释弹窗
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);
  const pos = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.getElementById('p2Inner'), NodeFilter.SHOW_TEXT);
    let target = null;
    while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeValue && n.nodeValue.includes('桃花') && n.parentElement?.offsetParent) { target = n; break; } }
    if (!target) return null;
    const range = document.createRange();
    const idx = target.nodeValue.indexOf('桃花');
    range.setStart(target, Math.max(0, idx - 1));
    range.setEnd(target, Math.min(target.nodeValue.length, idx + 3));
    const r = range.getBoundingClientRect();
    return { x1: r.left - 4, x2: r.right + 4, y: r.top + r.height / 2 };
  });
  if (pos) {
    await page.evaluate(({y}) => { window.scrollTo(0, Math.max(0, y - 250)); }, pos);
    await sleep(500);
    const pos2 = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.getElementById('p2Inner'), NodeFilter.SHOW_TEXT);
      let target = null;
      while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeValue && n.nodeValue.includes('桃花') && n.parentElement?.offsetParent) { target = n; break; } }
      if (!target) return null;
      const range = document.createRange();
      const idx = target.nodeValue.indexOf('桃花');
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
    const chip = await page.evaluate(() => document.getElementById('glossChip')?.textContent || null);
    console.log('拖选 chip:', chip);
    if (chip) {
      await page.evaluate(() => document.getElementById('glossChip')?.click());
      await sleep(300);
      const pop = await page.evaluate(() => {
        const p = document.getElementById('glossPop');
        return p?.classList.contains('open') ? document.getElementById('glossPopTt').textContent + ' → ' + document.getElementById('glossPopBd').textContent.slice(0, 36) : null;
      });
      console.log('解释弹窗:', pop);
    }
  } else { console.log('报告中未找到桃花文本（示例可能不含，无碍）'); }
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
