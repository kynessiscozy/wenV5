import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage','--window-size=480,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const check = () => page.evaluate(() => {
  const out = [];
  document.querySelectorAll('button, [role=button], .tool-tile, .chip, .sec-tab, .mode-top-switch, .p2-back, .home-cta, .ai-fab, .tab-item, .pf-card').forEach(b => {
    const cs = getComputedStyle(b);
    const hasVisual = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderTopWidth !== '0px';
    if (hasVisual && cs.borderRadius === '0px') {
      out.push((b.className || b.id || b.tagName).toString().split(' ').slice(0,3).join('.'));
    }
  });
  return [...new Set(out)];
});
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  console.log('报告页有背景但圆角0:', (await check()).join(', ') || '无');
  await page.evaluate(() => document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
  await sleep(1000);
  console.log('工具中心有背景但圆角0:', (await check()).join(', ') || '无');
  // 各工具弹窗
  const tools = ['wealth','career','date','style','layoff','daily','name','oracle','lottery','zodiac','relation','answerbook'];
  const map = { career:'#twCGen', layoff:'#twLGen', name:'#twNGen', lottery:'#twLotDraw', oracle:'#twODraw', relation:'#twRRun' };
  for (const id of tools) {
    await page.evaluate(i => window.openToolPage(i), id);
    await sleep(550);
    if (map[id]) {
      if (id === 'relation') await page.evaluate(() => { const el = document.querySelector('#twRDate'); if (el) { el.value = '1992-08-20'; el.dispatchEvent(new Event('change', { bubbles: true })); } });
      await page.evaluate(s => document.querySelector(s)?.click(), map[id]);
      await sleep(id === 'oracle' ? 3200 : 900);
    }
    const r = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('#toolModalContent button, #toolModalContent .tw-n-card').forEach(b => {
        const cs = getComputedStyle(b);
        if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.borderRadius === '0px') out.push((b.className || b.id || '?').toString().split(' ')[0]);
      });
      return [...new Set(out)];
    });
    if (r.length) console.log('  ' + id + ':', r.join(', '));
    await page.evaluate(() => window.closeToolPage());
    await sleep(250);
  }
  console.log('=== 检查完成 ===');
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
