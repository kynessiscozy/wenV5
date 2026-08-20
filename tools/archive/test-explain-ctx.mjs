import puppeteer from 'puppeteer';
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 430, height: 932 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
await p.evaluate(() => window.calc(true)); await new Promise(r => setTimeout(r, 4200));
await p.evaluate(() => window.setUserMode('master')); await new Promise(r => setTimeout(r, 1600));

const btns = await p.evaluate(() => document.querySelectorAll('#page2 .explain-btn').length);
console.log(`解释入口 ${btns} 个\n`);
let pass = 0, fail = 0;
for (let i = 0; i < btns; i++) {
  await p.evaluate(() => window.newAskChat && window.newAskChat());
  await new Promise(r => setTimeout(r, 250));
  const key = await p.evaluate(idx => {
    const bs = [...document.querySelectorAll('#page2 .explain-btn')];
    const card = bs[idx].closest('[data-card],.qr-card,.beginner-brief');
    const k = card?.dataset?.card || (card?.classList.contains('qr-card') ? 'qr-card' : 'beginner-brief');
    bs[idx].click(); return k;
  }, i);
  await new Promise(r => setTimeout(r, 2200));
  const r = await p.evaluate(() => {
    const t = document.getElementById('askResult').innerText;
    const isTerm = t.includes('📖 术语');
    const lines = t.split('\n').filter(x => x.trim());
    // 用户气泡是最后一条「问题」，取含疑问的最长行
    const q = lines.filter(x => /[？?]|意思|说明|解释/.test(x)).sort((a, b) => b.length - a.length)[0] || '';
    return { isTerm, q: q.slice(0, 80) };
  });
  // three-styles 是「三套体系有何区别」的概念性提问，本就不需要个人数据
  const CONCEPTUAL = new Set(['three-styles']);
  const hasCtx = /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]|日主|用神|身旺|身弱|五行/.test(r.q);
  const ok = (hasCtx || CONCEPTUAL.has(key)) && !r.isTerm;
  ok ? pass++ : fail++;
  console.log(`${ok ? '✓' : '✗'} [${key}] ${r.isTerm ? '❗词典释义 ' : ''}问:「${r.q}」`);
}
console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
console.log('错误:', errs.length ? [...new Set(errs)].join(' | ') : '无');
await b.close();
process.exit(fail ? 1 : 0);
