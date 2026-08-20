import puppeteer from 'puppeteer';
const BASE=process.env.BASE_URL||'http://localhost:5173/';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
await new Promise(r=>setTimeout(r,800));

// 1. 生成报告 → 保存档案
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,3600));
await p.evaluate(()=>window.openSaveModal());
await new Promise(r=>setTimeout(r,400));
await p.evaluate(()=>{document.getElementById('saveName').value='测试档案A';});
await p.evaluate(()=>window.confirmSaveProfile());
await new Promise(r=>setTimeout(r,900));
console.log('保存后 toast:', await p.evaluate(()=>document.querySelector('.tj-toast')?.innerText||'(无)'));

// 2. 刷新页面，看档案是否还在
await p.reload({waitUntil:'domcontentloaded',timeout:15000});
await new Promise(r=>setTimeout(r,1200));
const after=await p.evaluate(()=>({
  recentVisible: document.getElementById('recentZone')?.style.display,
  recentCards: document.querySelectorAll('#recentGrid .r-card').length,
  profileCards: document.querySelectorAll('#profileGrid .r-card').length,
  firstName: document.querySelector('#profileGrid .r-name')?.innerText||'(无)',
}));
console.log('刷新后:', JSON.stringify(after));

// 3. 点击档案能否载入
if(after.profileCards>0){
  const id=await p.evaluate(()=>{const m=document.querySelector('#profileGrid .r-card').getAttribute('onclick').match(/\d+/);return m?+m[0]:null;});
  await p.evaluate(i=>window.loadProfile(i),id);
  // loadProfile 会触发 calc()，含约 2s 的推演动画，需等待其结束
  await new Promise(r=>setTimeout(r,4000));
  console.log('载入后 bDate =', await p.evaluate(()=>document.getElementById('bDate').value));
  console.log('是否跳到报告页 =', await p.evaluate(()=>document.getElementById('page2').classList.contains('active')));
}
console.log('错误:', errs.length?[...new Set(errs)].join(' | '):'无');
await b.close();
