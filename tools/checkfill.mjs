import puppeteer from 'puppeteer';
const URL='https://afec98a9e4eec3cc8.bj10.agentos-app.net';
const b=await puppeteer.launch({headless:'new',executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-setuid-sandbox']});
const p=await b.newPage(); await p.setViewport({width:1280,height:900});
await p.goto(URL,{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,800));
// 强制显示 dock
await p.evaluate(()=>{const d=document.querySelector('.ig-dock.tab-bar');if(d)d.classList.add('show');});
await new Promise(r=>setTimeout(r,300));
const info=await p.evaluate(()=>{
  const out={};
  const ai=document.querySelector('.ig-dock .ai-fab .ai-orb-icon');
  if(ai){
    ai.querySelectorAll('circle,ellipse').forEach((el,i)=>{
      const cs=getComputedStyle(el);
      out['ai'+i+'_'+el.tagName+'_fill']=cs.fill;
    });
  }
  const pal=document.querySelector('#homeOrbPaletteBtn svg');
  if(pal){
    pal.querySelectorAll('circle').forEach((el,i)=>{ out['pal'+i+'_fill']=getComputedStyle(el).fill; });
  }
  const p2=document.querySelector('#p2OrbBtn .p2-orb-icon');
  if(p2){ p2.querySelectorAll('circle').forEach((el,i)=>{ out['p2'+i+'_fill']=getComputedStyle(el).fill; }); }
  return out;
});
console.log(JSON.stringify(info,null,1));
await b.close();
