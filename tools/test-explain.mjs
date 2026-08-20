import puppeteer from 'puppeteer';
const BASE=process.env.BASE_URL||'http://localhost:5173/';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932,deviceScaleFactor:2});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))errs.push(m.text())});
await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,4500));

console.log('=== 1. 新手模式：解释入口数量 ===');
console.log(await p.evaluate(()=>{
  const b=[...document.querySelectorAll('.explain-btn')].filter(e=>e.offsetParent);
  return b.length+' 个';
}));

console.log('\n=== 2. 点击后自动生成的问题 ===');
await p.evaluate(()=>[...document.querySelectorAll('.explain-btn')].filter(e=>e.offsetParent)[0].click());
await new Promise(r=>setTimeout(r,2600));
console.log(await p.evaluate(()=>{
  const t=document.getElementById('askResult').innerText;
  return t.slice(0,520);
}));
await p.screenshot({path:'/tmp/explain-ask.png'});

console.log('\n=== 3. 大师模式：各卡片入口 ===');
await p.evaluate(()=>window.closeAsk());
await new Promise(r=>setTimeout(r,400));
await p.evaluate(()=>window.setUserMode('master'));
await new Promise(r=>setTimeout(r,1600));
console.log(await p.evaluate(()=>{
  return [...document.querySelectorAll('#s-ming [data-card]')].filter(c=>c.offsetParent).map(c=>{
    const t=(c.querySelector('.card-tt')||c.querySelector('.qr-title'))?.textContent.trim()||c.dataset.card;
    return t+': '+(c.querySelector(':scope > .explain-btn')?'有':'无');
  }).join('\n');
}));
await p.screenshot({path:'/tmp/explain-master.png'});

console.log('\n=== 4. 术语提问不再答非所问 ===');
for(const q of ['食神格是什么意思？','用神是什么','身旺怎么理解']){
  await p.evaluate(()=>window.newAskChat&&window.newAskChat());
  await new Promise(r=>setTimeout(r,300));
  await p.evaluate(x=>window.doAsk(x),q);
  await new Promise(r=>setTimeout(r,1800));
  const a=await p.evaluate(()=>{
    const t=document.getElementById('askResult').innerText;
    const i=t.lastIndexOf('释义');
    return i>-1?t.slice(i,i+70).replace(/\n/g,' '):'❗未走术语分支: '+t.slice(-90).replace(/\n/g,' ');
  });
  console.log(`  「${q}」→ ${a}`);
}
console.log('\n错误:', errs.length?[...new Set(errs)].join(' | '):'无');
await b.close();
