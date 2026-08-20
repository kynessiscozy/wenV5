import puppeteer from 'puppeteer';
const BASE=process.env.BASE_URL||'http://localhost:5173/';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932,deviceScaleFactor:2});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,4200));
console.log('=== 新手首屏数据位 ===');
console.log(await p.evaluate(()=>[...document.querySelectorAll('.beginner-basic > div')]
  .map(d=>d.innerText.replace(/\n/g,' | ')).join('\n')));
await p.screenshot({path:'/tmp/first-screen.png'});
console.log('\n错误:', errs.length?[...new Set(errs)].join(' | '):'无');
await b.close();
