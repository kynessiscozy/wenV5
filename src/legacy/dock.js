// 本文件由 main.js 拆分而来（第 1 批）：零耦合 IIFE 外提。
// 每个 IIFE 原样包进 export function init*()，由 main.js 在原位置调用，执行时序不变。
/* iOS dock 指示器对齐 */
export function initDockIndicator(){
(function(){
  const scroll=document.getElementById('p2Scroll'),dock=document.getElementById('tabBar');
  if(!scroll||!dock)return;
  const realign=()=>{const active=dock.querySelector('.tab-item.active'),ind=dock.querySelector('.tab-indicator'),inner=dock.querySelector('.tab-bar-inner');if(!active||!ind||!inner)return;const x=active.offsetLeft,w=active.offsetWidth;ind.style.width=w+'px';ind.style.transform='translateX('+x+'px)';ind.classList.add('ready')};
  scroll.addEventListener('scroll',()=>{
    requestAnimationFrame(realign);
  },{passive:true});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(realign).observe(dock);
  dock.addEventListener('click',()=>requestAnimationFrame(realign),{passive:true});
  [0,120,300,520].forEach(ms=>setTimeout(realign,ms));
})();
}

/* Liquid Glass dock 光效跟随指针 */
export function initDockLighting(){
(function(){
  const dock=document.getElementById('tabBar');
  if(!dock)return;
  const light=(x,y)=>{const r=dock.getBoundingClientRect();dock.style.setProperty('--ig-light-x',((x-r.left)/Math.max(1,r.width)*100).toFixed(1)+'%');dock.style.setProperty('--ig-light-y',((y-r.top)/Math.max(1,r.height)*100).toFixed(1)+'%')};
  dock.addEventListener('pointermove',e=>light(e.clientX,e.clientY),{passive:true});
  dock.addEventListener('pointerleave',()=>{dock.style.setProperty('--ig-light-x','50%');dock.style.setProperty('--ig-light-y','0%')},{passive:true});
})();
}

/* iOS 键盘弹出时收起悬浮 dock */
export function initDockKeyboard(){
(function(){
  const vv=window.visualViewport;
  if(!vv)return;
  const sync=()=>{const keyboard=window.innerHeight-vv.height>160;document.body.classList.toggle('ig-keyboard',keyboard)};
  vv.addEventListener('resize',sync,{passive:true});
  vv.addEventListener('scroll',sync,{passive:true});
  sync();
})();
}
