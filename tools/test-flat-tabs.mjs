/* 验证两项改动：
   1. 速读下方标签栏的内容去卡片化、标头不与标签重复
   2. 问问大师面板位于 Dock 之上，不遮蔽 Dock                      */
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
let pass = 0, fail = 0;
const ok = (c, m, extra = '') => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m + (extra ? '  ' + extra : ''))); };

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

/* ---------- 0. 新手模式不得出现分区标签栏 ----------
   styles.css 用 `body.beginner-mode .sec > .glass{display:none}` 隐藏大师卡片，
   这条规则依赖「卡片是 .sec 的直接子元素」。标签页把层级变深会让它失效，
   导致新手版下方冒出大师版的标签切换（已回归过一次，故固化为用例）。 */
{
  const p = await b.newPage();
  await p.setViewport({ width: 430, height: 932 });
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
  await p.evaluate(() => window.calc(true));
  await new Promise(r => setTimeout(r, 4500));

  console.log('\n[新手 / 大师 模式隔离]');
  for (let i = 1; i <= 2; i++) {
    await p.evaluate(() => window.setUserMode('beginner'));
    await new Promise(r => setTimeout(r, 2600));
    const bg = await p.evaluate(() => {
      const o = { tabs: 0, wraps: 0, plain: 0, hidHead: 0, desc: 0, deep: 0 };
      for (const s of ['s-ming', 's-yun', 's-rel']) {
        const el = document.getElementById(s); if (!el) continue;
        o.tabs += [...el.querySelectorAll('.sec-tab')].filter(t => t.offsetParent !== null).length;
        o.wraps += el.querySelectorAll('.sec-tabs-wrap').length;
        o.plain += el.querySelectorAll('.sec-plain').length;
        o.hidHead += el.querySelectorAll('.card-hd.sec-head-hidden').length;
        o.desc += el.querySelectorAll('.sec-pane-desc').length;
        // 大师专属卡片必须仍是 .sec 的直接子元素，隐藏规则才生效
        o.deep += [...el.querySelectorAll('.glass')].filter(c => c.parentElement !== el).length;
      }
      return o;
    });
    ok(bg.tabs === 0, `第${i}轮 新手版无可见标签栏`, JSON.stringify(bg));
    ok(bg.wraps === 0, `第${i}轮 新手版已拆除标签结构`);
    ok(bg.plain === 0 && bg.hidHead === 0 && bg.desc === 0, `第${i}轮 去壳/隐藏标头已完全还原`);

    await p.evaluate(() => window.setUserMode('master'));
    await new Promise(r => setTimeout(r, 2800));
    const mg = await p.evaluate(() => ({
      tabs: [...document.querySelectorAll('#s-ming .sec-tab')].filter(t => t.offsetParent !== null).length,
      head: (() => { const h = document.querySelector('#s-ming .sec-pane.active > * > .card-hd'); return h ? h.offsetParent !== null : false; })(),
    }));
    ok(mg.tabs >= 2, `第${i}轮 大师版标签栏正常`, 'tabs=' + mg.tabs);
    ok(mg.head === false, `第${i}轮 大师版重复标头不可见`);
  }
  await p.evaluate(() => window.setUserMode('master'));
  await new Promise(r => setTimeout(r, 2800));

  for (const sec of ['s-ming', 's-yun', 's-rel']) {
    await p.evaluate(s => document.querySelector(`.tab-item[data-sec="${s}"]`)?.click(), sec);
    await new Promise(r => setTimeout(r, 2400));

    const d = await p.evaluate(s => {
      const el = document.getElementById(s);
      const tabs = [...el.querySelectorAll('.sec-tab')].map(t => t.textContent.trim());
      const card = el.querySelector('.sec-pane.active > *');
      const cs = card ? getComputedStyle(card) : null;
      const active = el.querySelector('.sec-tab.active')?.textContent.trim() || '';
      // 标头改为「隐藏」而非「删除」（新手模式要能原样还回），
      // 因此这里必须判可见性，只查 DOM 存在会误报。
      const heads = [...el.querySelectorAll('.sec-pane.active > * > .card-hd')]
        .filter(h => h.offsetParent !== null)
        .map(h => (h.querySelector('.card-tt')?.textContent || '').replace(/\s+/g, ''));
      // 内层子卡也不该再画一层灰底方块
      const sub = el.querySelector('.sec-pane.active .structure-subcard');
      return {
        tabs, active,
        bg: cs?.backgroundColor, bw: cs?.borderTopWidth, pad: cs?.paddingTop,
        dupHead: heads.some(t => t && (t.includes(active) || active.includes(t.slice(0, 2)))),
        subBg: sub ? getComputedStyle(sub).backgroundColor : null,
        explainDup: [...el.querySelectorAll('.sec-pane.active .explain-btn')].length,
        truncated: tabs.some(t => /^\d{4}年.$/.test(t)),
      };
    }, sec);

    console.log(`\n[${sec}] 标签 ${JSON.stringify(d.tabs)}`);
    ok(d.bg === 'rgba(0, 0, 0, 0)', '面板内容无卡片底色', d.bg);
    ok(d.bw === '0px', '面板内容无卡片描边', d.bw);
    ok(d.pad === '0px', '面板内容无卡片内边距', d.pad);
    ok(!d.dupHead, '标头未与标签重复（可见的）');
    ok(d.subBg === null || d.subBg === 'rgba(0, 0, 0, 0)', '二级子卡也已去壳', String(d.subBg));
    ok(d.explainDup <= 1, '「这段是什么意思」不重复出现', '数量=' + d.explainDup);
    ok(!d.truncated, '标签文案未被截断');
  }
  await p.close();
}

/* ---------- 2. 聊天面板不遮蔽 Dock ---------- */
console.log('\n[问问大师 × Dock]');
for (const [w, h] of [[360, 740], [430, 932], [768, 1024], [1440, 900]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
  await p.evaluate(() => window.calc(true));
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
