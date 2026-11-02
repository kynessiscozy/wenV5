import puppeteer from 'puppeteer';
const BASE='http://127.0.0.1:8902';
const b=await puppeteer.launch({args:['--no-sandbox']});
const pg=await b.newPage();
await pg.emulate({viewport:{width:390,height:844,isMobile:true,hasTouch:true},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'});
await pg.goto(BASE+'/index.html',{waitUntil:'networkidle0',timeout:60000});
// seed a funnel payload so teaser machinery is armed, then set form + calc directly
await pg.evaluate(()=>{
  localStorage.setItem('wen_funnel_v1',JSON.stringify({v:1,trait:'diyan',bd:'1990-01-01',timeStr:'12:00',cityName:'北京市',gen:'male',concerns:['career'],applied:1}));
  document.getElementById('bDate').value='1990-01-01';
  document.getElementById('bTime').value='12:00';
  document.getElementById('cInp').value='北京市';
  window.TJOpenForm();
});
await new Promise(r=>setTimeout(r,400));
await pg.evaluate(()=>{const btn=[...document.querySelectorAll('#formModal button')].find(x=>x.textContent.includes('开始推演'));btn.click();});
for(let i=0;i<40;i++){
  const t=await pg.evaluate(()=>{
    if(document.getElementById('funnelTeaser'))return 'teaser';
    const c=document.getElementById('calculationContinue'); if(c&&c.offsetParent!==null){c.click();return 'c';}
    const s=document.getElementById('calculationSkip'); if(s&&s.offsetParent!==null){s.click();return 's';}
    return 'w';
  });
  if(t==='teaser')break;
  await new Promise(r=>setTimeout(r,500));
}
const dump=await pg.evaluate(()=>{
  const root=document.getElementById('p2Inner');
  if(!root)return 'no p2Inner';
  const out=[];
  ['s-ming','s-yun','s-rel'].forEach(id=>{
    const sec=document.getElementById(id);
    out.push('=== '+id+' exists='+(!!sec));
    if(!sec)return;
    sec.querySelectorAll('[class*=title],[class*=head],h3,h4').forEach(el=>{
      const t=(el.textContent||'').trim().replace(/\s+/g,' ');
      if(t&&t.length<=30)out.push(id+' | '+el.tagName+'.'+el.className+' :: '+t);
    });
  });
  return out.slice(0,50);
});
console.log(JSON.stringify(dump,null,1));
await b.close();
