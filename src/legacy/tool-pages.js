// 本文件由 main.js 拆分而来（第 1 批）：零耦合 IIFE 外提。
// 每个 IIFE 原样包进 export function init*()，由 main.js 在原位置调用，执行时序不变。
import { closeToolPage } from '../tools/center.js';

/* 二级页面控制：结果页与输入页分离 */
export function initSecondaryPage(){
(function(){
 let observer=null;
 function install(){
  const root=document.getElementById('toolModalContent');if(!root||observer)return;
  observer=new MutationObserver(()=>{
   const tool=root.querySelector('.tj-tool-v3'),result=root.querySelector('.tj-result');
   if(!tool||!result||!result.classList.contains('show')||tool.classList.contains('result-mode'))return;
   tool.classList.add('result-mode');
   const type=window._activeTool||'';
   const title=(root.querySelector('.tj-tool-title')?.textContent||'工具结果').replace(/^[^\s]+\s/,'');
    const head=document.createElement('div');head.className='tj-result-page-head';head.innerHTML='<button class="tj-result-back" type="button" aria-label="返回输入页">‹</button><div><div class="tj-result-page-kicker">RESULT · 结果页</div><div class="tj-result-page-title">'+title+'</div></div>';
    result.prepend(head);
    const actions=document.createElement('div');actions.className='tj-result-actions';actions.innerHTML='<button class="secondary" type="button">重新填写</button><button class="secondary" type="button" data-share="1">分享卡片</button><button class="primary" type="button">完成</button>';
    result.appendChild(actions);
    const back=()=>{tool.classList.remove('result-mode');result.classList.remove('show');head.remove();actions.remove();root.querySelector('input,select,textarea')?.focus();};
    head.querySelector('button').onclick=back;actions.querySelector('.secondary:not([data-share])').onclick=back;actions.querySelector('[data-share]').onclick=()=>{if(window.TJShareToolResult)window.TJShareToolResult();};actions.querySelector('.primary').onclick=()=>closeToolPage();
  });
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 }
 const oldOpen=window.openToolPage;
 window.openToolPage=function(type){if(oldOpen)oldOpen(type);setTimeout(()=>{observer=null;install()},30)};
 document.addEventListener('DOMContentLoaded',install);
})();
}

/* 二级结果页兜底修复 */
export function initSecondaryResultFallback(){
(function(){
 function promote(){
  const root=document.getElementById('toolModalContent'),tool=root&&root.querySelector('.tj-tool-v3'),result=root&&root.querySelector('.tj-result');
  if(!tool||!result||!result.classList.contains('show')||tool.classList.contains('result-mode'))return;
  tool.classList.add('result-mode');
  const old=result.querySelector('.tj-result-page-head');if(old)old.remove();
  const oldActs=result.querySelector('.tj-result-actions');if(oldActs)oldActs.remove();
  const title=(root.querySelector('.tj-tool-title')?.textContent||'工具结果').replace(/^[^\s]+\s/,'');
  const head=document.createElement('div');head.className='tj-result-page-head';head.innerHTML='<button class="tj-result-back" type="button" aria-label="返回输入页">‹</button><div><div class="tj-result-page-kicker">RESULT · 结果页</div><div class="tj-result-page-title">'+title+'</div></div>';
  const actions=document.createElement('div');actions.className='tj-result-actions';actions.innerHTML='<button class="secondary" type="button">重新填写</button><button class="secondary" type="button" data-share="1">分享卡片</button><button class="primary" type="button">完成</button>';
  result.prepend(head);result.appendChild(actions);
  const back=()=>{tool.classList.remove('result-mode');result.classList.remove('show');head.remove();actions.remove();root.querySelector('input,select,textarea')?.focus();};
  head.querySelector('.tj-result-back').onclick=back;actions.querySelector('.secondary:not([data-share])').onclick=back;actions.querySelector('[data-share]').onclick=()=>{if(window.TJShareToolResult)window.TJShareToolResult();};actions.querySelector('.primary').onclick=()=>closeToolPage();
 }
 setInterval(promote,120);
 const oldRun=window.TJToolRun;
 window.TJToolRun=function(type){if(oldRun)oldRun(type);setTimeout(promote,80);setTimeout(promote,500);setTimeout(promote,1200);};
})();
}

/* 三级页面返回按钮修复 */
export function initTertiaryBackFix(){
(function(){
 function sync(){
  const modal=document.getElementById('toolModal'),tool=document.querySelector('#toolModalContent .tj-tool-v3');if(!modal)return;
  let b=modal.querySelector('.tj-level-back');
  if(!b){b=document.createElement('button');b.className='tj-level-back';b.type='button';b.textContent='‹';b.setAttribute('aria-label','返回工具输入页');modal.appendChild(b);}
  const open=!!(tool&&tool.classList.contains('result-mode'));modal.classList.toggle('result-open',open);
  b.onclick=()=>{if(!tool)return;const result=tool.querySelector('.tj-result');tool.classList.remove('result-mode');modal.classList.remove('result-open');if(result){result.classList.remove('show');result.querySelector('.tj-result-page-head')?.remove();result.querySelector('.tj-result-actions')?.remove();}tool.querySelector('input,select,textarea')?.focus()};
 }
 setInterval(sync,100);document.addEventListener('DOMContentLoaded',sync);
})();
}
