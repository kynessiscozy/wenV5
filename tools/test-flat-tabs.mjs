import { selectHomeTrait, openDemoReport } from './test-entry.mjs';
/* 验证三项改动：
   1. 命盘/运势/关系 三分区统一为「速读 + 吸顶标签栏 + 一次一张卡」的排列形式
   2. 问问大师面板位于 Dock 之上，不遮蔽 Dock
   说明：分区标签组由 organizeMasterReportLayout 在每次渲染后重组
   （ming/yun/rel 各自的 -tabs/-pane 结构），西方模式卡片组不受影响。 */
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
let pass = 0, fail = 0;
const ok = (c, m, extra = '') => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m + (extra ? '  ' + extra : ''))); };

const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });

/* ---------- 1. 三分区卡片排列形式一致 ---------- */
{
  const p = await b.newPage();
  await p.setViewport({ width: 430, height: 932 });
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
  await selectHomeTrait(p);
  await p.waitForFunction(() => typeof window.calc === 'function', { timeout: 15000 });
  await openDemoReport(p);
  await new Promise(r => setTimeout(r, 4500));

  const bgBySec = {};
  for (const sec of ['s-ming', 's-yun', 's-rel']) {
    await p.evaluate(s => document.querySelector(`.tab-item[data-sec="${s}"]`)?.click(), sec);
    await new Promise(r => setTimeout(r, 2400));

    const d = await p.evaluate(s => {
      const el = document.getElementById(s);
      const bar = el.querySelector('.ming-tabs,.yun-tabs,.rel-tabs');
      const panes = el.querySelector('.ming-panes,.yun-panes,.rel-panes');
      const paneEls = panes ? [...panes.children] : [];
      const active = paneEls.filter(x => x.classList.contains('active'));
      const card = active[0]?.querySelector(':scope > .glass');
      const cs = card ? getComputedStyle(card) : null;
      const tabs = bar ? [...bar.children].map(t => t.textContent.trim()) : [];
      return {
        barCls: bar?.className || null,
        barVisible: bar ? bar.offsetParent !== null : false,
        tabs,
        paneCount: paneEls.length,
        activeCount: active.length,
        hasContent: !!card,
        bg: cs?.backgroundColor, bw: cs?.borderTopWidth,
        // 标签与面板必须一一对应（本分区的 data-* 键相同）
        attr: { 's-ming': 'ming', 's-yun': 'yun', 's-rel': 'rel' }[s],
        keysMatch: bar ? [...bar.children].every((t, i) =>
          t.getAttribute('data-' + { 's-ming': 'ming', 's-yun': 'yun', 's-rel': 'rel' }[s]) ===
          paneEls[i]?.getAttribute('data-' + { 's-ming': 'ming', 's-yun': 'yun', 's-rel': 'rel' }[s])) : false,
      };
    }, sec);
    bgBySec[sec] = { bg: d.bg, bw: d.bw };

    console.log(`\n[${sec}] 标签 ${JSON.stringify(d.tabs)}`);
    ok(d.barVisible, '标签栏可见');
    ok(d.tabs.length >= 2, '标签数 ≥ 2', 'n=' + d.tabs.length);
    ok(d.paneCount === d.tabs.length, '面板数与标签数一致', d.paneCount + '/' + d.tabs.length);
    ok(d.attr && d.keysMatch, '标签与面板键一一对应');
    ok(d.activeCount === 1, '同时只显示一个面板', 'active=' + d.activeCount);
    ok(d.hasContent, '激活面板有卡片内容');

    // 点击第 2 个标签验证互斥切换
    if (d.tabs.length >= 2) {
      const r2 = await p.evaluate(s => {
        const el = document.getElementById(s);
        const bar = el.querySelector('.ming-tabs,.yun-tabs,.rel-tabs');
        bar.children[1].click();
        return new Promise(res => setTimeout(() => {
          const panes = [...el.querySelector('.ming-panes,.yun-panes,.rel-panes').children];
          const act = panes.filter(x => x.classList.contains('active'));
          const tab2 = bar.children[1];
          res({
            actN: act.length,
            visible: act[0]?.offsetParent !== null,
            tab2Active: tab2.classList.contains('active'),
            aria: tab2.getAttribute('aria-selected'),
          });
        }, 400));
      }, sec);
      ok(r2.actN === 1 && r2.tab2Active && r2.aria === 'true', '切换第2标签生效（互斥 + aria 同步）', JSON.stringify(r2));
      ok(r2.visible, '切换后面板可见');
    }
  }

  // 三分区卡片计算样式一致（同底色、同描边）
  const a = bgBySec['s-ming'], y = bgBySec['s-yun'], r = bgBySec['s-rel'];
  ok(a.bg === y.bg && y.bg === r.bg, '三分区卡片底色一致', JSON.stringify(bgBySec));
  ok(a.bw === y.bw && y.bw === r.bw, '三分区卡片描边一致', JSON.stringify(bgBySec));

  // 深链唤醒：跳转关系页「八字合盘」应自动激活所在面板
  await p.evaluate(s => document.querySelector(`.tab-item[data-sec="${s}"]`)?.click(), 's-ming');
  await new Promise(r2 => setTimeout(r2, 800));
  const dl = await p.evaluate(async () => {
    if (typeof window.jumpTo !== 'function') return { hasJumpTo: false };
    window.jumpTo('s-rel', 'relAi');
    await new Promise(r3 => setTimeout(r3, 1200));
    const el = document.querySelector('[data-card="relAi"]');
    const pane = el?.closest('.rel-pane');
    return {
      hasJumpTo: true,
      paneActive: pane?.classList.contains('active') || false,
      visible: el?.offsetParent !== null || false,
    };
  });
  if (dl.hasJumpTo) {
    ok(dl.paneActive, '深链自动唤醒八字合盘面板');
    ok(dl.visible, '深链目标卡片可见');
  } else {
    console.log('  (window.jumpTo 未暴露，跳过深链用例)');
  }
  await p.close();
}

/* ---------- 2. 聊天面板不遮蔽 Dock ---------- */
console.log('\n[问问大师 × Dock]');
for (const [w, h] of [[360, 740], [430, 932], [768, 1024], [1440, 900]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
  await selectHomeTrait(p);
  await p.waitForFunction(() => typeof window.calc === 'function', { timeout: 15000 });
  await openDemoReport(p);
  await new Promise(r => setTimeout(r, 4000));
  await p.evaluate(() => window.openAsk && window.openAsk());
  await new Promise(r => setTimeout(r, 900));

  const d = await p.evaluate(() => {
    const s = document.getElementById('aiSheet');
    const dk = document.querySelector('.ig-dock.tab-bar');
    const a = s.getBoundingClientRect(), c = dk.getBoundingClientRect();
    // 命中测试：Dock 上的按钮必须真的点得到，不能被遮罩吃掉
    const hit = document.elementFromPoint(c.left + 30, c.top + c.height / 2);
    return { gap: Math.round(c.top - a.bottom), h: Math.round(a.height), clickable: !!hit?.closest('.tab-item') };
  });
  console.log(`  ${w}×${h} 间距 ${d.gap}px，面板高 ${d.h}px`);
  ok(d.gap >= 0, `${w}px：面板不压住 Dock`, 'gap=' + d.gap);
  ok(d.clickable, `${w}px：Dock 按钮可点击`);
  ok(d.h >= 320, `${w}px：面板仍有可用高度`, 'h=' + d.h);
  await p.close();
}

await b.close();
console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
