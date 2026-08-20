import puppeteer from 'puppeteer';
const BASE=process.env.BASE_URL||'http://localhost:4173/';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});

const CHECK=`(()=>{
  const out={overflow:[],clipped:[],tiny:[],collide:[]};
  const vw=document.documentElement.clientWidth;
  const vis=e=>{const c=getComputedStyle(e);return c.display!=='none'&&c.visibility!=='hidden'&&+c.opacity>0.05};
  // 只看「当前可见页」内部，排除滑出视口的 page 与 sr-only
  const inHiddenPage=e=>{const p=e.closest('.page');return p&&(p.classList.contains('hidden')||!p.classList.contains('active')&&p.id==='page2')};
  const srOnly=e=>{const c=getComputedStyle(e);return c.position==='absolute'&&(parseFloat(c.width)<=1||c.clip!=='auto')};
  const nodes=[...document.querySelectorAll('body *')].filter(e=>vis(e)&&!inHiddenPage(e)&&!srOnly(e));
  const name=e=>e.tagName.toLowerCase()+(e.className?'.'+String(e.className).trim().split(/\\s+/).slice(0,2).join('.'):'');
  for(const e of nodes){
    const r=e.getBoundingClientRect();
    if(!r.width||!r.height)continue;
    const cs=getComputedStyle(e);
    // 1 真实横向溢出（元素本身超出视口右边）
    if(r.right>vw+1&&cs.position!=='fixed'&&r.left<vw)
      out.overflow.push(name(e)+' 右'+r.right.toFixed(0)+'>'+vw);
    // 2 文字被容器裁掉
    if((cs.overflowY==='hidden'||cs.overflow==='hidden')&&e.scrollHeight>e.clientHeight+4&&e.clientHeight>10){
      const t=(e.innerText||'').trim();
      if(t)out.clipped.push(name(e)+' '+e.scrollHeight+'>'+e.clientHeight+' 「'+t.slice(0,18)+'」');
    }
    // 3 触控目标
    const clickable=/^(button|a|select|input|textarea)$/.test(e.tagName.toLowerCase())||e.getAttribute('onclick');
    if(clickable&&(r.height<36||r.width<36))
      out.tiny.push(name(e)+' '+r.width.toFixed(0)+'x'+r.height.toFixed(0));
  }
  // 4 同级元素重叠（相邻卡片互相压盖）
  const cards=[...document.querySelectorAll('.glass,.today-card,.gloss-hint,.beginner-brief')].filter(e=>vis(e)&&!inHiddenPage(e));
  for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
    if(cards[i].contains(cards[j])||cards[j].contains(cards[i]))continue;
    const a=cards[i].getBoundingClientRect(),c=cards[j].getBoundingClientRect();
    const ov=Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top);
    const oh=Math.min(a.right,c.right)-Math.max(a.left,c.left);
    if(ov>4&&oh>4)out.collide.push(name(cards[i])+' ⨯ '+name(cards[j])+' 重叠'+ov.toFixed(0)+'px');
  }
  return out;
})()`;

async function scan(p,label){
  const r=await p.evaluate(CHECK);
  const u=a=>[...new Set(a)];
  const L=[];
  if(r.overflow.length)L.push('  ✗溢出: '+u(r.overflow).slice(0,4).join(' | '));
  if(r.clipped.length)L.push('  ✗裁切: '+u(r.clipped).slice(0,4).join(' | '));
  if(r.tiny.length)L.push('  ✗小目标: '+u(r.tiny).slice(0,6).join(' | '));
  if(r.collide.length)L.push('  ✗重叠: '+u(r.collide).slice(0,3).join(' | '));
  console.log(label+(L.length?'\n'+L.join('\n'):' ✓'));
}

for(const vp of [{w:360,h:780,n:'360'},{w:430,h:932,n:'430'},{w:768,h:1024,n:'768'}]){
  const p=await b.newPage();await p.setViewport({width:vp.w,height:vp.h});
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:15000});await new Promise(r=>setTimeout(r,700));
  console.log('\n════ '+vp.n+'px ════');
  await scan(p,'[首页]');
  await p.evaluate(()=>window.calc(true));await new Promise(r=>setTimeout(r,4200));
  await scan(p,'[新手]');
  await p.evaluate(()=>window.setUserMode('master'));await new Promise(r=>setTimeout(r,1600));
  await scan(p,'[大师]');
  for(const [s,n] of [['s-yun','运势'],['s-rel','关系'],['s-adv','工具']]){
    await p.evaluate(x=>document.querySelector(`.tab-item[data-sec="${x}"]`)?.click(),s);
    await new Promise(r=>setTimeout(r,900));await scan(p,'['+n+']');
  }
  await p.evaluate(()=>window.openToolPage('relation'));await new Promise(r=>setTimeout(r,1000));
  await scan(p,'[合盘表单]');
  await p.close();
}
await b.close();
