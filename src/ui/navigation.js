import { KB } from '../ai/kb.js';

export function jumpTo(secId,cardKey){
  // 关 AI 面板
  if(typeof window.closeAsk==='function')window.closeAsk();
  // 若 secId 为空，从 KB.routes 推断；同时取 sub（合并卡子区）
  let subKey=null,routeCard=cardKey;
  if(cardKey&&KB&&KB.routes&&KB.routes[cardKey]){
    const r=KB.routes[cardKey];
    if(!secId)secId=r.sec;
    if(r.sub)subKey=r.sub;
    routeCard=r.card; // 重定向到真正的 DOM data-card
  }
  // 切 tab
  const tab=document.querySelector('.tab-item[data-sec="'+secId+'"]');
  if(tab&&!tab.classList.contains('active'))tab.click();
  // 重写：使用 routeCard 进行查找
  cardKey=routeCard;
  // 滚动+高亮
  setTimeout(()=>{
    let el=null;
    if(cardKey){
      el=document.querySelector('[data-card="'+cardKey+'"]');
    }
    if(!el){
      el=document.getElementById(secId);
    }
    if(!el)return;
    // 档位面板（年/月/周/日）里的卡片：先唤醒所在档位再滚动
    const yunPane=el.closest&&el.closest('.yun-pane');
    if(yunPane&&typeof window.TJActivateYunTab==='function')window.TJActivateYunTab(yunPane.dataset.yun);
    // “命盘结构”将四柱、五行等收进分栏；跳转前先唤醒所在分栏，避免滚动到隐藏内容。
    const structurePane=el.closest&&el.closest('.structure-pane');
    if(structurePane){
      const structure=structurePane.closest('.master-structure');
      const structureTab=structure&&structure.querySelector('.structure-tab[data-structure="'+structurePane.dataset.structure+'"]');
      if(structureTab&&typeof window.switchStructureTab==='function')window.switchStructureTab(structureTab);
    }
    el.scrollIntoView({behavior:'smooth',block:'center'});
    el.classList.add('tj-flash');
    setTimeout(()=>el.classList.remove('tj-flash'),1800);
    // 如果是合并卡的子区跳转，自动激活对应子 tab
    if(subKey){
      const sub=el.querySelector('.focus-tab[data-sub="'+subKey+'"]');
      if(sub)sub.click();
    }
    // 如果卡片是折叠状态，自动展开
    if(el.classList.contains('collapsed'))el.classList.remove('collapsed');
  },280);
}

export function applyTheme(yongShen){
  /* Claude 风格只保留一个强调色（赭橙），不再按用神切换整站色相与背景。
     用神仅作为数据标记写入 <html data-yongshen>，供五行标签等局部着色使用。 */
  document.documentElement.setAttribute('data-yongshen', yongShen || '土');
}

export function showPage2(){document.body.classList.add('report-active');document.getElementById('page1').classList.add('hidden');const p2=document.getElementById('page2');p2.classList.remove('hidden');p2.classList.add('active');document.getElementById('tabBar').classList.add('show');document.getElementById('p2Scroll').scrollTop=0;if(typeof window.resetGlossaryState==='function')window.resetGlossaryState();requestAnimationFrame(()=>{if(typeof window._rebindTilt==='function')window._rebindTilt();if(typeof window._injectCardToggles==='function')window._injectCardToggles();const a=document.querySelector('.tab-item.active');if(a&&typeof moveTabIndicator==='function')moveTabIndicator(a);});}

export function goBack(){document.body.classList.remove('report-active');applyTheme('土');['page2'].forEach(id=>{document.getElementById(id).classList.remove('active');document.getElementById(id).classList.add('hidden');});document.getElementById('page1').classList.remove('hidden');document.getElementById('tabBar').classList.remove('show');document.getElementById('lgPanel').classList.remove('open');}

export function scrollToForm(){document.getElementById('formCard').scrollIntoView({behavior:'smooth',block:'center'});}

export function switchTab(el){
  document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active','tab-pop'));el.classList.add('active');
  if(typeof moveTabIndicator==='function')moveTabIndicator(el);
  // IG-style tap feedback: restart the pop animation on the icon that just became active
  void el.offsetWidth;
  el.classList.add('tab-pop');
  el.addEventListener('animationend',()=>el.classList.remove('tab-pop'),{once:true});
  // 切换 sec 时让卡片重新错落入场（重置动画）
  const targetSec=document.getElementById(el.dataset.sec);
  if(targetSec){
    targetSec.querySelectorAll('.glass').forEach(c=>{c.style.animation='none';void c.offsetWidth;c.style.animation='';});
  }
  const secId=el.dataset.sec;document.querySelectorAll('.sec').forEach(s=>s.classList.remove('active'));const target=document.getElementById(secId);if(target){target.classList.add('active');}
  document.getElementById('p2Scroll').scrollTop=0;
  if(secId==='s-ming'||secId==='s-yun'){requestAnimationFrame(()=>{document.querySelectorAll('.wxf,.ff').forEach(el=>{el.style.width='0%';setTimeout(()=>{el.style.width=el.dataset.w},50)});});}
  if(secId==='s-yun'){requestAnimationFrame(()=>{const cv=document.getElementById('cvC');if(cv&&cv._data&&typeof window.drawCurve==='function')window.drawCurve(cv._data,cv._dys,cv._age);const tl=document.getElementById('daYunTl');if(tl){const cu=tl.querySelector('.ti.cu');if(cu){setTimeout(()=>cu.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}),100);}}});}
}

export function setGlassMode(mode){
  document.body.setAttribute('data-glass',mode);
  try{localStorage.setItem('tj_glass_mode',mode);}catch(e){}
  document.querySelectorAll('.lg-opt').forEach(o=>o.classList.toggle('active',o.dataset.mode===mode));
  const fab=document.getElementById('lgFab');if(fab)fab.classList.toggle('active',mode!=='standard');
}

export function toggleLgPanel(){document.getElementById('lgPanel').classList.toggle('open');}

export function moveTabIndicator(el){
  const ind=document.getElementById('tabIndicator');
  const wrap=document.getElementById('tabBar')&&document.getElementById('tabBar').querySelector('.tab-bar-inner');
  if(!ind||!wrap||!el)return;
  const wr=wrap.getBoundingClientRect(),er=el.getBoundingClientRect();
  ind.style.width=er.width+'px';
  ind.style.transform='translateX('+(er.left-wr.left)+'px)';
  ind.classList.add('ready');
}


export function initNavigationUI(){
  document.addEventListener('click',function(e){
    const panel=document.getElementById('lgPanel'),fab=document.getElementById('lgFab');
    if(panel&&panel.classList.contains('open')&&!panel.contains(e.target)&&e.target!==fab){panel.classList.remove('open');}
  });
  window.addEventListener('resize',function(){
    const a=document.querySelector('.tab-item.active');
    if(a)moveTabIndicator(a);
  });
  let mode='standard';
  try{mode=localStorage.getItem('tj_glass_mode')||'standard';}catch(e){}
  setGlassMode(mode);
}
