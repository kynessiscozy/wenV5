import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage','--window-size=480,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);

  // 1. 检查报告是否还有下划线术语
  const terms = await page.evaluate(() => document.querySelectorAll('#page2 .glossary-term').length);
  console.log('报告中的 .glossary-term 数量:', terms, terms === 0 ? '✅ 已取消下划线标注' : '❌ 仍有标注');

  // 2. 选中一段包含术语的文字（找含"日主"的文本节点）
  await page.evaluate(() => {
    const walker = document.createTreeWalker(document.getElementById('p2Inner'), NodeFilter.SHOW_TEXT);
    let target = null;
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.nodeValue && n.nodeValue.includes('日主')) { target = n; break; }
    }
    if (target) {
      const range = document.createRange();
      const idx = target.nodeValue.indexOf('日主');
      range.setStart(target, Math.max(0, idx - 1));
      range.setEnd(target, idx + 2);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      // 触发 selectionchange
      document.dispatchEvent(new Event('selectionchange'));
    }
    window.__selTarget = target ? target.parentElement.getBoundingClientRect() : null;
  });
  await sleep(600);
  const chip = await page.evaluate(() => {
    const c = document.getElementById('glossChip');
    return c ? c.textContent : null;
  });
  console.log('选区浮动 chip:', chip ? '「' + chip + '」✅' : '未出现');

  // 3. 点 chip → 应弹解释
  if (chip) {
    await page.evaluate(() => document.getElementById('glossChip')?.click());
    await sleep(300);
    const pop = await page.evaluate(() => {
      const p = document.getElementById('glossPop');
      return p && p.classList.contains('open') ? { tt: document.getElementById('glossPopTt').textContent, bd: document.getElementById('glossPopBd').textContent.slice(0, 40) } : null;
    });
    console.log('解释弹窗:', pop ? `「${pop.tt}」→ ${pop.bd}... ✅` : '未弹出');
    // 关闭
    await page.evaluate(() => document.getElementById('glossPop')?.classList.remove('open'));
  }

  // 4. 右键（contextmenu）在选区处触发 → 自定义菜单
  await page.evaluate(() => {
    // 重新选中
    const walker = document.createTreeWalker(document.getElementById('p2Inner'), NodeFilter.SHOW_TEXT);
    let target = null;
    while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeValue && n.nodeValue.includes('正官')) { target = n; break; } }
    if (target) {
      const range = document.createRange();
      const idx = target.nodeValue.indexOf('正官');
      range.setStart(target, Math.max(0, idx - 1));
      range.setEnd(target, idx + 2);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    }
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2) || document.body;
    const rect = el.getBoundingClientRect();
    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: rect.left + 60, clientY: rect.top + 60 });
    document.dispatchEvent(evt);
  });
  await sleep(400);
  const ctxMenu = await page.evaluate(() => {
    const m = document.getElementById('glossCtx');
    return m ? m.innerText.replace(/\s+/g, ' ') : null;
  });
  console.log('右键自定义菜单:', ctxMenu ? `「${ctxMenu}」✅` : '未出现');

  console.log('JS 错误数:', errs.length);
  errs.slice(0, 4).forEach(e => console.log('ERR:', e.slice(0, 130)));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
