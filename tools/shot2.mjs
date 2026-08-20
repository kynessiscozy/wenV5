import puppeteer from 'puppeteer';
const BASE=process.env.BASE_URL||'http://localhost:5173/';
import fs from 'node:fs';
const OUT='/tmp/shots2'; fs.mkdirSync(OUT,{recursive:true});
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage(); await p.setViewport({width:430,height:932,deviceScaleFactor:2});
for(const theme of ['light','dark']){
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
  await p.evaluate(t=>localStorage.setItem('tj_theme',t),theme);
  await p.reload({waitUntil:'domcontentloaded',timeout:15000});
  await p.evaluate(()=>window.calc(true));
  await new Promise(r=>setTimeout(r,3800));
  // 大师模式
  await p.evaluate(()=>window.setUserMode('master'));
  await new Promise(r=>setTimeout(r,1200));
  await p.screenshot({path:`${OUT}/10-master-${theme}.png`});
  await p.evaluate(()=>document.getElementById('p2Scroll').scrollTo(0,1400));
  await new Promise(r=>setTimeout(r,700));
  await p.screenshot({path:`${OUT}/11-master-scroll-${theme}.png`});
  // 工具弹层
  await p.evaluate(()=>document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
  await new Promise(r=>setTimeout(r,600));
  await p.evaluate(()=>document.querySelector('#s-adv .tool-tile')?.click());
  await new Promise(r=>setTimeout(r,1200));
  await p.screenshot({path:`${OUT}/12-toolmodal-${theme}.png`});
  // 保存弹窗
  await p.evaluate(()=>{window.closeToolPage&&window.closeToolPage();window.openSaveModal&&window.openSaveModal();});
  await new Promise(r=>setTimeout(r,700));
  await p.screenshot({path:`${OUT}/13-modal-${theme}.png`});
}
await b.close(); console.log('ok');
