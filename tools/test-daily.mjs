import puppeteer from 'puppeteer';
const BASE=process.env.BASE_URL||'http://localhost:5173/';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932,deviceScaleFactor:2});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))errs.push(m.text())});
await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
await new Promise(r=>setTimeout(r,900));

console.log('=== 1. 无档案时不显示今日卡 ===');
console.log('display =', await p.evaluate(()=>document.getElementById('todayCard')?.style.display));

console.log('\n=== 2. 保存档案 ===');
await p.evaluate(()=>window.calc(true));await new Promise(r=>setTimeout(r,3600));
await p.evaluate(()=>window.openSaveModal());await new Promise(r=>setTimeout(r,300));
await p.evaluate(()=>{document.getElementById('saveName').value='我';});
await p.evaluate(()=>window.confirmSaveProfile());await new Promise(r=>setTimeout(r,700));

console.log('\n=== 3. 日签工具（真实流日）===');
await p.evaluate(()=>window.openToolPage('daily'));
await p.waitForSelector('#v3_result',{timeout:5000});await new Promise(r=>setTimeout(r,500));
await p.evaluate(()=>window.TJDailyRun());
await new Promise(r=>setTimeout(r,800));
console.log(await p.evaluate(()=>document.getElementById('v3_result').innerText.slice(0,560)));
await p.screenshot({path:'/tmp/daily-result.png'});

console.log('\n=== 4. 同一天重复生成内容一致 ===');
const t1=await p.evaluate(()=>document.getElementById('v3_result').innerText);
await p.evaluate(()=>window.TJDailyRun());await new Promise(r=>setTimeout(r,600));
const t2=await p.evaluate(()=>document.getElementById('v3_result').innerText);
console.log('一致 =', t1===t2);

console.log('\n=== 5. 回到首页：今日卡应出现 ===');
await p.evaluate(()=>{const b=document.querySelector('.tool-sheet-close');if(b)b.click();});
await new Promise(r=>setTimeout(r,400));
await p.evaluate(()=>window.goBack());
await new Promise(r=>setTimeout(r,500));
await p.evaluate(()=>window.renderTodayCard());
await new Promise(r=>setTimeout(r,800));
console.log(await p.evaluate(()=>{const e=document.getElementById('todayCard');
  return 'display='+e.style.display+'\n'+e.innerText;}));
await p.screenshot({path:'/tmp/today-card.png'});

console.log('\n=== 6. 刷新后今日卡自动出现（回访场景）===');
await p.reload({waitUntil:'domcontentloaded',timeout:15000});
await new Promise(r=>setTimeout(r,1600));
console.log('display =', await p.evaluate(()=>document.getElementById('todayCard')?.style.display));

console.log('\n错误:', errs.length?[...new Set(errs)].join(' | '):'无');
await b.close();
