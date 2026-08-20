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

console.log('=== 1. 速读折叠 ===');
const q0 = await p.evaluate(() => {
  const c = document.querySelector('#s-ming .qr-card');
  const h = c.querySelector('.qr-head'), body = c.querySelector('.qr-body');
  return {
    hasToggle: !!c.querySelector('.qr-toggle'),
    isBtn: h.tagName === 'BUTTON',
    aria: h.getAttribute('aria-expanded'),
    bodyH: body.getBoundingClientRect().height,
    headH: h.getBoundingClientRect().height,
  };
});
t('速读有折叠箭头', q0.hasToggle);
t('头部是可聚焦按钮', q0.isBtn, q0.isBtn ? '' : '实际 ' + q0.isBtn);
t('默认展开 aria=true', q0.aria === 'true', q0.aria);
t('头部触控 ≥44px', q0.headH >= 44, q0.headH.toFixed(0) + 'px');
t('展开时正文可见', q0.bodyH > 50, q0.bodyH.toFixed(0) + 'px');

const q1 = await p.evaluate(() => {
  document.querySelector('#s-ming .qr-head').click();
  return new Promise(r => setTimeout(() => {
    const c = document.querySelector('#s-ming .qr-card');
    r({
      collapsed: c.classList.contains('qr-collapsed'),
      aria: c.querySelector('.qr-head').getAttribute('aria-expanded'),
      bodyH: c.querySelector('.qr-body').getBoundingClientRect().height,
    });
  }, 450));
});
t('点击可收起', q1.collapsed && q1.bodyH < 6, JSON.stringify(q1));
t('收起 aria=false', q1.aria === 'false');

// 刷新后应记住
await p.reload({waitUntil:'domcontentloaded',timeout:15000});
await p.evaluate(() => window.calc(true)); await new Promise(r => setTimeout(r, 4200));
await p.evaluate(() => document.getElementById('modeMaster')?.click());
await new Promise(r => setTimeout(r, 2600));
const q2 = await p.evaluate(() => document.querySelector('#s-ming .qr-card')?.classList.contains('qr-collapsed'));
t('刷新后记住折叠状态', q2 === true, '实际 ' + q2);
// 恢复展开
await p.evaluate(() => document.querySelector('#s-ming .qr-head').click());
await new Promise(r => setTimeout(r, 400));

console.log('\n=== 2. 分区标签下划线 + 居中 ===');
const tb = await p.evaluate(() => {
  const bar = document.querySelector('#s-ming .sec-tabs');
  const tabs = [...bar.querySelectorAll('.sec-tab')];
  const act = tabs.find(x => x.classList.contains('active'));
  const cs = getComputedStyle(bar), ca = getComputedStyle(act), af = getComputedStyle(act, '::after');
  const inact = tabs.find(x => !x.classList.contains('active'));
  const ci = getComputedStyle(inact);
  const br = bar.getBoundingClientRect();
  const first = tabs[0].getBoundingClientRect(), last = tabs[tabs.length - 1].getBoundingClientRect();
  return {
    justify: cs.justifyContent,
    barBorderBottom: cs.borderBottomWidth,
    activeBorder: ca.borderWidth, activeRadius: ca.borderRadius, activeBg: ca.backgroundColor,
    inactBorder: ci.borderWidth, inactBg: ci.backgroundColor,
    underlineBg: af.backgroundColor, underlineH: af.height,
    leftGap: (first.left - br.left).toFixed(0), rightGap: (br.right - last.right).toFixed(0),
  };
});
console.log('  ' + JSON.stringify(tb));
t('标签无外框', tb.activeBorder === '0px' && tb.inactBorder === '0px', tb.activeBorder + '/' + tb.inactBorder);
t('标签无胶囊底色', tb.activeBg === 'rgba(0, 0, 0, 0)' && tb.inactBg === 'rgba(0, 0, 0, 0)', tb.activeBg);
t('选中项有下划线', tb.underlineBg !== 'rgba(0, 0, 0, 0)' && parseFloat(tb.underlineH) >= 2, tb.underlineBg);
t('整条有底部分隔线', parseFloat(tb.barBorderBottom) >= 1, tb.barBorderBottom);
t('标签居中', Math.abs(+tb.leftGap - +tb.rightGap) <= 2, `左${tb.leftGap} 右${tb.rightGap}`);

await p.screenshot({ path: '/tmp/qr-tabs.png' });
console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
console.log('错误:', errs.length ? [...new Set(errs)].join(' | ') : '无');
await b.close();
process.exit(fail ? 1 : 0);
