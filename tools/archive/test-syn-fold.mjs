import puppeteer from 'puppeteer';
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
await p.evaluate(() => window.calc(true)); await new Promise(r => setTimeout(r, 4200));
await p.evaluate(() => window.openToolPage('relation'));
await p.waitForSelector('#v3_bdate', { timeout: 5000 });
await p.evaluate(() => {
  document.getElementById('v3_pname').value = '阿雯';
  document.getElementById('v3_bdate').value = '1988-03-11';
});
await p.evaluate(() => window.TJToolRun('relation'));
await new Promise(r => setTimeout(r, 1400));

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { c ? (pass++, console.log('  ✓ ' + n)) : (fail++, console.log('  ✗ ' + n + ' ' + extra)); };

const m = await p.evaluate(() => {
  const res = document.getElementById('v3_result');
  const bodyEl = res.querySelector('.tj-result-body');
  const sheet = document.querySelector('#toolModal .tool-sheet');
  const gs = [...res.querySelectorAll('.syn-group')];
  return {
    h: res.scrollHeight, bodyH: bodyEl ? bodyEl.scrollHeight : res.scrollHeight, view: sheet.clientHeight,
    groups: gs.map(g => ({ id: g.dataset.syn, open: g.classList.contains('open'),
      title: g.querySelector('.syn-group-tt')?.textContent })),
    hasVerdict: !!res.querySelector('.syn-verdict'),
    score: res.querySelector('.syn-verdict-label')?.textContent.trim(),
    summary: res.querySelector('.syn-summary')?.textContent.trim().slice(0, 40),
  };
});
console.log(`\n结果正文 ${m.bodyH}px（改造前 810px）｜含外层壳 ${m.h}px，视口 ${m.view}px`);
console.log('分组:', m.groups.map(g => `${g.title}${g.open ? '[展开]' : '[收起]'}`).join(' '));
console.log('结论区:', m.score, '|', m.summary, '\n');

t('结论区常驻可见', m.hasVerdict && !!m.score);
t('共 4 个分组', m.groups.length === 4, `实际 ${m.groups.length}`);
t('结果正文收敛（<720px，改造前 810px）', m.bodyH < 720, `${m.bodyH}px`);
t('正文默认可一屏读完', m.bodyH <= m.view, `${m.bodyH} > ${m.view}`);
t('命盘与关键结论默认展开', m.groups.filter(g => g.open).map(g => g.id).join(',') === 'chart,core');
t('逐项依据与脚本默认收起', m.groups.filter(g => !g.open).length === 2);

// 展开交互
const afterOpen = await p.evaluate(() => {
  const g = document.querySelector('.syn-group[data-syn="detail"]');
  g.querySelector('.syn-group-hd').click();
  return new Promise(r => setTimeout(() => r({
    open: g.classList.contains('open'),
    aria: g.querySelector('.syn-group-hd').getAttribute('aria-expanded'),
    bodyH: g.querySelector('.syn-group-bd').getBoundingClientRect().height,
  }), 420));
});
t('点击可展开', afterOpen.open && afterOpen.bodyH > 20, JSON.stringify(afterOpen));
t('aria-expanded 同步', afterOpen.aria === 'true');

const afterClose = await p.evaluate(() => {
  const g = document.querySelector('.syn-group[data-syn="detail"]');
  g.querySelector('.syn-group-hd').click();
  return new Promise(r => setTimeout(() => r({
    open: g.classList.contains('open'),
    bodyH: g.querySelector('.syn-group-bd').getBoundingClientRect().height,
  }), 420));
});
t('可再次收起', !afterClose.open && afterClose.bodyH < 8, JSON.stringify(afterClose));

// 触控目标
const hd = await p.evaluate(() => {
  const r = document.querySelector('.syn-group-hd').getBoundingClientRect();
  return { w: r.width, h: r.height };
});
t('分组标题触控 ≥44px', hd.h >= 44, `${hd.w.toFixed(0)}x${hd.h.toFixed(0)}`);

await p.screenshot({ path: '/tmp/syn-folded.png' });
await p.evaluate(() => document.querySelectorAll('.syn-group:not(.open) .syn-group-hd').forEach(b => b.click()));
await new Promise(r => setTimeout(r, 500));
await p.screenshot({ path: '/tmp/syn-expanded.png' });

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
console.log('错误:', errs.length ? [...new Set(errs)].join(' | ') : '无');
await b.close();
process.exit(fail ? 1 : 0);
