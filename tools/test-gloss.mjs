import puppeteer from 'puppeteer';
const BASE=process.env.BASE_URL||'http://localhost:5173/';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932,deviceScaleFactor:2});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,4200));

console.log('=== 1. 首次进入应出现引导 ===');
console.log(await p.evaluate(()=>{const e=document.getElementById('glossHint');return e?e.innerText.replace(/\n/g,' '):'❗未出现'}));

console.log('\n=== 2. 术语视觉 ===');
console.log(await p.evaluate(()=>{
  const all=[...document.querySelectorAll('#page2 .glossary-term')].filter(e=>e.offsetParent);
  if(!all.length)return '❗无术语';
  const t=all[0];
  const hinted=[...document.querySelectorAll('#page2 .glossary-term.has-hint')].filter(e=>e.offsetParent);
  const c=getComputedStyle(t);
  const a=hinted[0]?getComputedStyle(hinted[0],'::after').content:'(无)';
  return `首个="${t.textContent}" cursor=${c.cursor} | 术语${all.length}个/带问号${hinted.length}个 问号=${a}`;
}));
await p.screenshot({path:'/tmp/gloss-hint.png'});

console.log('\n=== 3. 点击术语后引导消失 ===');
await p.evaluate(()=>[...document.querySelectorAll('#page2 .glossary-term')].filter(e=>e.offsetParent)[0].click());
await new Promise(r=>setTimeout(r,500));
console.log('弹层:', await p.evaluate(()=>document.querySelector('.gloss-pop')?.innerText.replace(/\n/g,' ').slice(0,90)||'无'));
console.log('引导已移除:', await p.evaluate(()=>!document.getElementById('glossHint')));

console.log('\n=== 4. 刷新后不再出现 ===');
await p.reload({waitUntil:'domcontentloaded',timeout:15000});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,4200));
console.log('再次出现:', await p.evaluate(()=>!!document.getElementById('glossHint')));

console.log('\n=== 5. 新增词条可解释 ===');
for(const w of ['格局','命局','喜神','食神格']){
  const ok=await p.evaluate(t=>{
    const el=[...document.querySelectorAll('#page2 .glossary-term')].find(e=>e.dataset.term===t);
    if(!el)return '未标注';
    el.click();
    const pop=document.querySelector('.gloss-pop');
    return pop?pop.innerText.split('\n').slice(1).join(' ').slice(0,44):'无弹层';
  },w);
  console.log(`  ${w}: ${ok}`);
}
console.log('\n错误:', errs.length?[...new Set(errs)].join(' | '):'无');
await b.close();
