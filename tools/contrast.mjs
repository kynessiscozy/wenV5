import puppeteer from 'puppeteer';
const BASE=process.env.BASE_URL||'http://localhost:5173/';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932});
for(const theme of ['light','dark']){
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});
  await p.evaluate(t=>localStorage.setItem('tj_theme',t),theme);
  await p.reload({waitUntil:'domcontentloaded',timeout:15000});
  await p.evaluate(()=>window.calc(true));
  await new Promise(r=>setTimeout(r,3500));
  await p.evaluate(()=>window.setUserMode('master'));
  await new Promise(r=>setTimeout(r,1200));
  const bad=await p.evaluate(()=>{
    // 用 canvas 归一化任意颜色语法（含 color(srgb ...) / color-mix）
    const _cv=document.createElement('canvas').getContext('2d');
    const norm=c=>{_cv.fillStyle='#000';_cv.fillStyle=c;const h=_cv.fillStyle;
      if(h[0]==='#')return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16),1];
      if(h.startsWith('color(')){ // color(srgb r g b / a) —— 分量为 0~1
        const m=h.match(/[\d.]+/g).map(Number);
        return [m[0]*255,m[1]*255,m[2]*255,m[3]===undefined?1:m[3]];}
      const m=h.match(/[\d.]+/g).map(Number);return [m[0],m[1],m[2],m[3]===undefined?1:m[3]];};
    const L=c=>{const [r,g,bl]=norm(c);
      const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
      return .2126*f(r)+.7152*f(g)+.0722*f(bl)};
    const bgOf=e=>{let n=e;while(n){const c=getComputedStyle(n).backgroundColor;
      if(c&&norm(c)[3]>0.5)return c;n=n.parentElement}
      return getComputedStyle(document.body).backgroundColor;};
    const out=[];
    document.querySelectorAll('#page2 *').forEach(e=>{
      const t=e.textContent.trim(); if(!t||e.children.length)return;
      const r=e.getBoundingClientRect(); if(!r.width||!r.height)return;
      const c=getComputedStyle(e); if(c.visibility==='hidden'||c.opacity<0.2)return;
      const l1=L(c.color),l2=L(bgOf(e));
      const ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
      const px=parseFloat(c.fontSize); const need=(px>=18.66||(px>=14&&+c.fontWeight>=700))?3:4.5;
      if(ratio<need) out.push({cls:String(e.className).slice(0,28),ratio:+ratio.toFixed(2),need,px:+px.toFixed(1),color:c.color,txt:t.slice(0,14)});
    });
    return out;
  });
  const uniq=[...new Map(bad.map(x=>[x.cls+x.color,x])).values()];
  console.log('\n### '+theme+' — 低对比元素 '+bad.length+' 个（去重 '+uniq.length+'）');
  uniq.slice(0,14).forEach(x=>console.log(` ${x.ratio}/${x.need} ${x.px}px ${x.color} .${x.cls} "${x.txt}"`));
}
await b.close();
