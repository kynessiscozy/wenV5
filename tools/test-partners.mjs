import puppeteer from 'puppeteer';
const BASE=process.env.BASE_URL||'http://localhost:5173/';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932,deviceScaleFactor:2});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))errs.push(m.text())});
// 授予剪贴板权限，便于测试分享降级路径
await b.defaultBrowserContext().overridePermissions(new URL(BASE).origin,['clipboard-read','clipboard-write']);
await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,3600));

const openForm=async()=>{
  await p.evaluate(()=>window.openToolPage('relation'));
  await p.waitForSelector('#v3_bdate',{timeout:5000});
  await new Promise(r=>setTimeout(r,700));
};

console.log('=== 1. 首次：无最近对象 ===');
await openForm();
console.log('picker 存在 =', await p.evaluate(()=>!!document.querySelector('.tj-partner-picker')));

console.log('\n=== 2. 合盘 → 保存对象 ===');
await p.evaluate(()=>{document.getElementById('v3_pname').value='阿雯';document.getElementById('v3_bdate').value='1988-03-11';});
await p.evaluate(()=>window.TJToolRun('relation'));
await new Promise(r=>setTimeout(r,900));
console.log('结果含操作条 =', await p.evaluate(()=>!!document.querySelector('.tj-sign-actions')));
await p.evaluate(()=>window.TJSynSave());
await new Promise(r=>setTimeout(r,600));
console.log('toast =', await p.evaluate(()=>document.querySelector('.tj-toast')?.innerText||'(无)'));
console.log('localStorage =', await p.evaluate(()=>{const a=JSON.parse(localStorage.getItem('tj_partners_v1')||'[]');return a.map(x=>x.name+'/'+x.y+'/'+x.lastScore).join(', ')}));

console.log('\n=== 3. 分享（降级到剪贴板）===');
await p.evaluate(()=>{navigator.share=undefined;});
await p.evaluate(()=>window.TJSynShare());
await new Promise(r=>setTimeout(r,700));
console.log('toast =', await p.evaluate(()=>document.querySelector('.tj-toast')?.innerText||'(无)'));
const clip=await p.evaluate(()=>navigator.clipboard.readText().catch(()=>'(读取失败)'));
console.log('剪贴板内容:\n'+clip);

console.log('\n=== 4. 重开表单：应出现最近对象 ===');
await openForm();
const picker=await p.evaluate(()=>({
  exists:!!document.querySelector('.tj-partner-picker'),
  chips:[...document.querySelectorAll('.tj-partner-chip')].map(c=>c.innerText.replace(/\n/g,' ')),
}));
console.log(JSON.stringify(picker));
await p.screenshot({path:'/tmp/partner-picker.png'});

console.log('\n=== 5. 点击回填 ===');
await p.evaluate(()=>document.querySelector('.tj-partner-chip [data-partner], .tj-partner-chip')?.click());
await new Promise(r=>setTimeout(r,600));
console.log(await p.evaluate(()=>'pname='+document.getElementById('v3_pname').value+' bdate='+document.getElementById('v3_bdate').value));

console.log('\n=== 6. 刷新后仍在 ===');
await p.reload({waitUntil:'domcontentloaded',timeout:15000});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,3600));
await openForm();
console.log('刷新后 chips =', await p.evaluate(()=>document.querySelectorAll('.tj-partner-chip').length));

console.log('\n=== 7. 删除 ===');
await p.evaluate(()=>document.querySelector('.tj-partner-del')?.click());
await new Promise(r=>setTimeout(r,600));
console.log('删除后 chips =', await p.evaluate(()=>document.querySelectorAll('.tj-partner-chip').length));

console.log('\n错误:', errs.length?[...new Set(errs)].join(' | '):'无');
await b.close();
