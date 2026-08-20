import puppeteer from 'puppeteer';
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

const SCAN = `(()=>{
  const out={overflowNoScroll:[],clipped:[],emptyCard:[],dupText:[],badContrastPair:[],longLine:[]};
  const vw=document.documentElement.clientWidth;
  const vis=e=>{const c=getComputedStyle(e);return c.display!=='none'&&c.visibility!=='hidden'&&+c.opacity>0.05};
  const shown=e=>{let n=e;while(n&&n!==document.body){if(!vis(n))return false;n=n.parentElement}return true};
  const nm=e=>e.tagName.toLowerCase()+(e.className?'.'+String(e.className).trim().split(/\\s+/).slice(0,2).join('.'):'');
  const nodes=[...document.querySelectorAll('#page1 *, #page2 *, #toolModal *')].filter(shown);
  for(const e of nodes){
    const r=e.getBoundingClientRect(); if(!r.width||!r.height)continue;
    const cs=getComputedStyle(e);
    // 内容横向溢出但没有滚动能力 => 用户永远看不到被切掉的部分
    if(e.scrollWidth>e.clientWidth+4&&e.clientWidth>60&&!/auto|scroll/.test(cs.overflowX))
      out.overflowNoScroll.push(nm(e)+' sw'+e.scrollWidth+'>cw'+e.clientWidth);
    // 纵向被硬裁
    if(e.scrollHeight>e.clientHeight+4&&e.clientHeight>24&&/hidden/.test(cs.overflowY)){
      const t=(e.innerText||'').trim();
      if(t)out.clipped.push(nm(e)+' sh'+e.scrollHeight+'>ch'+e.clientHeight+' 「'+t.slice(0,16)+'」');
    }
    // 单行超长不换行
    if(cs.whiteSpace==='nowrap'&&r.width>vw*0.92&&(e.innerText||'').trim().length>10)
      out.longLine.push(nm(e)+' w'+r.width.toFixed(0));
  }
  // 空卡片（有边框但无文字）
  document.querySelectorAll('#page2 .glass, #toolModal .glass').forEach(c=>{
    if(!shown(c))return;
    const t=(c.innerText||'').replace(/\\s/g,'');
    if(t.length<2&&c.getBoundingClientRect().height>30)out.emptyCard.push(nm(c));
  });
  return out;
})()`;

async function scan(p, label) {
  const r = await p.evaluate(SCAN);
  const u = a => [...new Set(a)];
  const L = [];
  if (r.overflowNoScroll.length) L.push('  ✗溢出无法滚动: ' + u(r.overflowNoScroll).slice(0, 5).join(' | '));
  if (r.clipped.length) L.push('  ✗纵向裁切: ' + u(r.clipped).slice(0, 5).join(' | '));
  if (r.emptyCard.length) L.push('  ✗空卡片: ' + u(r.emptyCard).slice(0, 4).join(' | '));
  if (r.longLine.length) L.push('  ✗单行过长: ' + u(r.longLine).slice(0, 4).join(' | '));
  console.log(label + (L.length ? '\n' + L.join('\n') : ' ✓'));
}

for (const vp of [{ w: 360, h: 780, n: '360' }, { w: 430, h: 932, n: '430' }]) {
  const p = await b.newPage(); await p.setViewport({ width: vp.w, height: vp.h });
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000}); await new Promise(r => setTimeout(r, 700));
  console.log(`\n════ ${vp.n}px ════`);
  await scan(p, '[首页]');
  await p.evaluate(() => window.calc(true)); await new Promise(r => setTimeout(r, 4200));
  await scan(p, '[新手]');
  await p.evaluate(() => window.setUserMode('master')); await new Promise(r => setTimeout(r, 1800));
  // 展开所有折叠卡，才能看到真实内容
  await p.evaluate(() => document.querySelectorAll('#page2 .collapsed').forEach(c => {
    (c.querySelector('.card-toggle') || c.querySelector('.card-hd') || c).click();
  }));
  await new Promise(r => setTimeout(r, 1000));
  await scan(p, '[大师·全展开]');
  for (const [s, n] of [['s-yun', '运势'], ['s-rel', '关系'], ['s-adv', '工具']]) {
    await p.evaluate(x => document.querySelector(`.tab-item[data-sec="${x}"]`)?.click(), s);
    await new Promise(r => setTimeout(r, 700));
    await p.evaluate(() => document.querySelectorAll('.sec.active .collapsed').forEach(c => {
      (c.querySelector('.card-toggle') || c.querySelector('.card-hd') || c).click();
    }));
    await new Promise(r => setTimeout(r, 900));
    await scan(p, `[${n}]`);
  }
  await p.close();
}
await b.close();
