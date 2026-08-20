import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage','--window-size=480,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);

  const tools = ['wealth','career','date','style','layoff','daily','name','oracle','lottery','zodiac','relation','answerbook'];
  const map = { career:'#twCGen', layoff:'#twLGen', name:'#twNGen', lottery:'#twLotDraw', oracle:'#twODraw', relation:'#twRRun' };
  const zeroButtons = new Map();

  for (const id of tools) {
    await page.evaluate(i => window.openToolPage(i), id);
    await sleep(600);
    if (map[id]) {
      if (id === 'relation') await page.evaluate(() => { const el = document.querySelector('#twRDate'); if (el) { el.value = '1992-08-20'; el.dispatchEvent(new Event('change', { bubbles: true })); } });
      await page.evaluate(s => document.querySelector(s)?.click(), map[id]);
      await sleep(id === 'oracle' ? 3200 : 900);
    }
    const found = await page.evaluate(tid => {
      const out = [];
      document.querySelectorAll('#toolModalContent button, #toolModalContent [role=button], #toolModalContent input[type=submit]').forEach(b => {
        const r = getComputedStyle(b).borderRadius;
        if (r === '0px' || r === '0px 0px 0px 0px') {
          out.push(b.className || b.id || b.tagName);
        }
      });
      return out;
    }, id);
    if (found.length) zeroButtons.set(id, found);
    await page.evaluate(() => window.closeToolPage());
    await sleep(300);
  }
  console.log('=== 圆角为 0 的按钮 ===');
  let total = 0;
  for (const [id, list] of zeroButtons) { total += list.length; console.log(id + ':', list.join(', ')); }
  console.log('总计:', total);
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
