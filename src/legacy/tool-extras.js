// 本文件由 main.js 拆分而来（第 1 批）：零耦合 IIFE 外提。
// 每个 IIFE 原样包进 export function init*()，由 main.js 在原位置调用，执行时序不变。
import { openAnswerBook } from '../tools/answerbook-v2.js';

/* 自定义工具结果兜底：命盘结合提示 */
export function initCustomToolFallback(){
(function(){
 function sync(){if(!['wealth','career','date','style','layoff','name','zodiac','relation'].includes(window._activeTool))return;const d=window._ctx||window._baziData||{},wx=d.wx||{};document.querySelectorAll('#toolModalContent .tj-result.show').forEach(e=>{if(e.querySelector('.tj-chart-basis'))return;const n=document.createElement('div');n.className='tj-chart-basis';n.innerHTML='<b>✦ 命盘依据</b><div><span>日主</span><strong>'+(d.dg||'—')+'</strong><span>有利方向</span><strong>'+(wx.ys||'—')+'</strong><span>事业评分</span><strong>'+(d.cs||'—')+'/100</strong><span>财富评分</span><strong>'+(d.ws||'—')+'/100</strong></div><p>用于校正建议节奏；现实信息优先。</p>';e.appendChild(n)});}
 setInterval(sync,250);
})();
}

/* 工具卡插画复用到详情页 */
export function initToolCardArt(){
(function(){
  const root=document.getElementById('toolModalContent');
  if(!root)return;
  const decorate=()=>{
    const tool=root.querySelector('.tj-tool-v3');
    const type=window._activeTool;
    if(tool&&type)tool.dataset.toolArt=type;
  };
  new MutationObserver(decorate).observe(root,{childList:true,subtree:true});
  const previousOpen=window.openToolPage;
  window.openToolPage=function(type){
    if(previousOpen)previousOpen(type);
    [0,50,140].forEach(delay=>setTimeout(decorate,delay));
  };
  document.addEventListener('DOMContentLoaded',decorate);
})();
}

/* 答案之书 v2 自洽流程 */
export function initAnswerBookV2(){
(function(){
  const priorOpenTool=window.openToolPage;
  window.openToolPage=function(type){
    if(type==='answerbook'){openAnswerBook();return;}
    if(priorOpenTool)priorOpenTool(type);
  };
})();
}
