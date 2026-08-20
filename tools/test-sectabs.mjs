import puppeteer from 'puppeteer';
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
await p.evaluate(() => window.calc(true)); await new Promise(r => setTimeout(r, 4200));
await p.evaluate(() => document.getElementById('modeMaster')?.click());
await new Promise(r => setTimeout(r, 2600));

let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? (pass++, console.log('  ✓ ' + n)) : (fail++, console.log('  ✗ ' + n + ' ' + x)); };

for (const [sec, name, before] of [['s-ming', '命盘', 2143], ['s-yun', '运势', 1534], ['s-rel', '关系', 2797]]) {
  await p.evaluate(x => document.querySelector(`.tab-item[data-sec="${x}"]`)?.click(), sec);
  await new Promise(r => setTimeout(r, 1100));
  try { await p.waitForSelector(`#${sec} .sec-tabs-wrap .sec-tab`, { timeout: 6000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 400));
  const r = await p.evaluate(s => {
    const el = document.getElementById(s), sc = document.getElementById('p2Scroll');
    const wrap = el.querySelector(':scope > .sec-tabs-wrap');
    return {
      total: sc.scrollHeight, view: sc.clientHeight,
      tabs: wrap ? [...wrap.querySelectorAll('.sec-tab')].map(x => x.textContent) : [],
      active: wrap ? [...wrap.querySelectorAll('.sec-pane')].filter(x => x.classList.contains('active')).length : -1,
      pinned: [...el.children].filter(c => c.classList?.contains('beginner-brief') || c.classList?.contains('qr-card')).length,
    };
  }, sec);
  console.log(`\n[${name}] ${before}px → ${r.total}px（${(r.total / r.view).toFixed(1)} 屏）`);
  console.log(`   标签: ${r.tabs.join(' / ')}`);
  t(`${name} 生成标签`, r.tabs.length >= 2, JSON.stringify(r.tabs));
  t(`${name} 同时只显示一个面板`, r.active === 1, '实际 ' + r.active);
  t(`${name} 速读常驻`, r.pinned >= 1, '实际 ' + r.pinned);
  // 命盘首个标签「命盘结构」本身就有 1026px，属内容固有高度；
  // 阈值按各区实际可压缩空间设定
  const limit = sec === 's-ming' ? 0.90 : 0.75;
  t(`${name} 高度下降`, r.total < before * limit, `${r.total} vs ${before}`);
}

// 切换交互
console.log('\n[切换]');
await p.evaluate(() => document.querySelector('.tab-item[data-sec="s-rel"]')?.click());
await new Promise(r => setTimeout(r, 900));
await p.waitForSelector('#s-rel .sec-tabs-wrap .sec-tab', { timeout: 6000 });
const sw = await p.evaluate(() => {
  const w = document.querySelector('#s-rel .sec-tabs-wrap');
  const tabs = [...w.querySelectorAll('.sec-tab')];
  tabs[2].click();
  return new Promise(r => setTimeout(() => r({
    activeIdx: tabs.findIndex(x => x.classList.contains('active')),
    aria: tabs[2].getAttribute('aria-selected'),
    visible: [...w.querySelectorAll('.sec-pane')].findIndex(x => x.classList.contains('active')),
  }), 500));
});
t('点击切换生效', sw.activeIdx === 2 && sw.visible === 2, JSON.stringify(sw));
t('aria-selected 同步', sw.aria === 'true');

// 记忆
await p.evaluate(() => document.querySelector('.tab-item[data-sec="s-ming"]')?.click());
await new Promise(r => setTimeout(r, 700));
await p.evaluate(() => document.querySelector('.tab-item[data-sec="s-rel"]')?.click());
await new Promise(r => setTimeout(r, 900));
const mem = await p.evaluate(() => [...document.querySelectorAll('#s-rel .sec-tab')].findIndex(x => x.classList.contains('active')));
t('记住上次选中的标签', mem === 2, '实际 ' + mem);

await p.screenshot({ path: '/tmp/sectabs.png' });
console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
console.log('错误:', errs.length ? [...new Set(errs)].join(' | ') : '无');
await b.close();
process.exit(fail ? 1 : 0);
