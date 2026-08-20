// 本文件由 main.js 拆分而来（第 1 批）：零耦合 IIFE 外提。
// 每个 IIFE 原样包进 export function init*()，由 main.js 在原位置调用，执行时序不变。
import { KB, askToolInsight } from '../ai/index.js';
import { doAsk, doAskCustom, getApiKey } from '../ui/index.js';
import { showToast } from '../ui/toast.js';
import { bindPartnerPicker, partnerPickerHtml, saveSynastryPartner, shareSynastry } from '../tools/synastry-share.js';

/* 应答数据库扩展 */
export function initKBExpansion(){
(function(){
 if(typeof KB==='undefined'||!KB.faqs)return;
 KB.faqs.push(
  {id:'ux1',q:'最近为什么总是焦虑？',kw:['焦虑','压力','内耗','烦躁','睡不着'],intent:'综合',anchor:'health',answer:d=>[
   `先把它理解为节奏过载，而不是简单的“运气不好”。当前事业评分${d.cs||'—'}、财富评分${d.ws||'—'}提示你更需要恢复可控感。`,
   `命盘中的${d.dg||'日主'}与有利方向${d.wx?.ys||'—'}，适合用明确边界、规律作息和小步行动来稳定状态。`,
   `${d.cDy?.g||''}${d.cDy?.z||''}阶段不宜同时承担太多目标，先处理最影响睡眠和现金流的那一件。`,
   '今天写下3件事：必须做、可以等、暂时不做；只完成“必须做”中的最小一步。若持续影响睡眠或生活，请寻求专业帮助。'
  ],related:['c3']},
  {id:'ux2',q:'我该不该答应这个机会？',kw:['机会','答应','要不要','选择','决定','纠结'],intent:'选择',anchor:'focus',answer:d=>[
   '先不要只问“吉不吉”，而要看这件事是否同时满足收益、风险和退出条件。',
   `结合${d.dg||'日主'}的当前节奏与有利方向${d.wx?.ys||'—'}，建议优先选择能积累能力、资源或稳定现金流的机会。`,
   `当前大运${d.cDy?.g||''}${d.cDy?.z||''}更适合${d.cs>70?'主动验证、争取反馈':'小范围试错、保留退路'}。`,
   '给自己24小时：写下最坏结果、可承受损失和退出时间；三项都说得清，再答应。'
  ],related:['c2','c3']},
  {id:'ux3',q:'我的财运什么时候会好？',kw:['财运','赚钱','收入','发财','财富'],intent:'财运',anchor:'trend',answer:d=>[
   `财运不只看某一天，而看收入能力、现金流和机会能否形成闭环。当前财富评分为${d.ws||'—'}/100。`,
   `命盘有利方向为${d.wx?.ys||'—'}，更适合把资源投入到可重复的技能、客户或产品，而不是追逐一次性暴利。`,
   `在${d.cDy?.g||''}${d.cDy?.z||''}阶段，先建立安全垫再扩大投入，现金流稳定比短期高回报更重要。`,
   '本周完成一次支出分类，并选一个能在30天内验证的增收动作；不使用杠杆，不把签文或命理当收益承诺。'
  ],related:['c2']},
  {id:'ux4',q:'感情里总是沟通不好怎么办？',kw:['沟通','吵架','冷战','感情','伴侣','关系'],intent:'感情',anchor:'loveMode',answer:d=>[
   '先停止猜测对方真正想法，把一次沟通缩小到一个具体事件和一个具体请求。',
   `你的命盘日主${d.dg||'—'}与当前关系节奏提示，表达需求比证明谁对谁错更重要。`,
   `在当前大运${d.cDy?.g||''}${d.cDy?.z||''}下，稳定、重复的沟通比一次性摊牌更容易建立信任。`,
   '用“事实—感受—请求”说三句话；如果情绪超过7分，先约定第二天再谈。涉及安全或伤害时优先保护自己并寻求专业支持。'
  ],related:['c3']}
 );
})();
}

/* 部分工具接入 AI（主动点击触发） */
export function initToolAI(){
(function(){
  const enabled={wealth:'财富与现金流',career:'职业选择',layoff:'职场风险',relation:'关系沟通',style:'环境与状态'};
  function install(type){
    if(!enabled[type])return;
    const out=document.getElementById('v3_result');if(!out||!out.classList.contains('show')||out.querySelector('.tj-ai-btn'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='tj-ai-btn';btn.textContent='让 AI 帮我换个角度看看';btn.onclick=()=>window.TJAskToolAI(type,btn);out.appendChild(btn);
  }
  window.TJAskToolAI=async function(type,btn){
    const out=document.getElementById('v3_result');if(!out||!enabled[type])return;
    const source=(out.querySelector('.tj-result-body')||out).innerText.slice(0,1800),ctx=window._ctx||window._baziData||{};
    btn.disabled=true;btn.textContent='AI 正在整理…';
    let answer='';
    try{
      answer=await askToolInsight({
        apiKey:getApiKey(),
        typeLabel:enabled[type],
        source,
        chartSummary:`日主${ctx.dg||'—'}，有利方向${ctx.wx?.ys||'—'}`
      });
    }catch(e){}
    if(answer){let box=out.querySelector('.tj-ai-box');if(!box){box=document.createElement('div');box.className='tj-ai-box';out.appendChild(box)}box.innerHTML='<b>AI 换个角度</b>'+answer.replace(/[<>]/g,'');btn.remove()}
    else{btn.disabled=false;btn.textContent='暂时无法连接 AI，重试一次'}
  };
  const old=window.TJToolRun;
  window.TJToolRun=function(type){const r=old?old(type):undefined;if(enabled[type])setTimeout(()=>install(type),90);return r};
  new MutationObserver(()=>{const type=window._activeTool;if(enabled[type])install(type)}).observe(document.body,{childList:true,subtree:true});
})();
}

/* 清理误注入的 Cloudflare challenge 脚本 */
export function initCloudflareCleanup(){
(function(){
// 部署环境曾把 Cloudflare challenge-platform 的隐藏 iframe 注入脚本复制回源码，
// 那是打包残留、对功能没有任何作用，还会拖慢首屏，这里整体移除。
})();
}

/* 体验层：自适应输入框、气泡操作、键盘发送与无障碍 */
export function initExperienceLayer(){
(function(){
  const mount=()=>{
    const sheet=document.getElementById('aiSheet'),input=document.getElementById('askInput'),send=document.querySelector('#aiSheet .ai-send'),result=document.getElementById('askResult');
    if(!sheet||!input||!result||sheet.dataset.uxMounted)return;
    sheet.dataset.uxMounted='1';
    result.setAttribute('aria-live','polite');
    result.setAttribute('aria-label','问问大师对话内容');
    input.setAttribute('enterkeyhint','send');
    input.setAttribute('maxlength','500');
    input.setAttribute('aria-label','输入你想咨询的问题');

    // 自适应输入框高度
    const resize=()=>{
      input.style.height='auto';
      input.style.height=Math.min(input.scrollHeight,120)+'px';
      if(send)send.disabled=!input.value.trim();
    };
    input.addEventListener('input',()=>{
      resize();
      const countEl=document.getElementById('aiCount');
      if(countEl)countEl.textContent=input.value.length+' / 500';
    });
    resize();

    // 输入提示
    const row=input.closest('.ai-input-row');
    if(row&&!document.getElementById('aiCount')){
      const hint=document.createElement('div');
      hint.className='ai-compose-hint';
      hint.innerHTML='<span>Enter 发送 · Shift + Enter 换行</span><b id="aiCount">0 / 500</b>';
      row.insertAdjacentElement('afterend',hint);
    }

    // Enter 发送，Shift+Enter 换行
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){
        e.preventDefault();
        doAskCustom();
      }
    });

    // 恢复草稿
    try{
      const draft=sessionStorage.getItem('tj_ai_draft')||'';
      if(draft){input.value=draft;resize();}
    }catch(e){}
    input.addEventListener('input',()=>{try{sessionStorage.setItem('tj_ai_draft',input.value)}catch(e){}});

    // 委托气泡操作（复制/重试）
    result.addEventListener('click',e=>{
      const btn=e.target.closest('.chat-actions button');
      if(!btn)return;
      const msg=btn.closest('.chat-msg');
      if(btn.dataset.act==='copy'){
        const text=msg?.querySelector('.chat-ai-text,.chat-bubble-kb,.chat-bubble-ai')?.innerText||'';
        navigator.clipboard?.writeText(text).then(()=>{
          btn.textContent='已复制';
          setTimeout(()=>btn.textContent='复制',1200);
        }).catch(()=>{});
      }else if(btn.dataset.act==='retry'){
        const bubbles=[...result.querySelectorAll('.chat-bubble-user')];
        const q=bubbles.at(-1)?.textContent?.trim();
        if(q)doAsk(q);
      }
    });

    // 自动滚动到底部
    new MutationObserver(()=>{
      result.scrollTo({top:result.scrollHeight,behavior:'smooth'});
    }).observe(result,{childList:true,subtree:true});

    // 更新命盘上下文显示（含示例模式）
    const d=window._ctx||window._baziData;
    const c=document.getElementById('aiContext');
    if(c&&d){
      c.innerHTML=d.isDemoPreview
        ?'<span class="ai-demo-context">✦ 示例报告</span><b>'+d.dg+d.dw+' · 体验用示例命盘</b>'
        :'<span>✦ 已结合命盘</span><b>'+d.dg+d.dw+' · '+(d.wx?.st?'行动型节奏':'蓄力型节奏')+'</b>';
    }
  };
  document.addEventListener('DOMContentLoaded',mount);
  const old=window.openAsk;
  window.openAsk=function(){if(old)old();setTimeout(mount,80)};
})();
}

/* 合盘：分享 / 保存对象 / 最近对象快捷选择 */
export function initSynastryShare(){
(function(){
  const HOUR_LABELS=['子 23:00–00:59','丑 01:00–02:59','寅 03:00–04:59','卯 05:00–06:59',
    '辰 07:00–08:59','巳 09:00–10:59','午 11:00–12:59','未 13:00–14:59',
    '申 15:00–16:59','酉 17:00–18:59','戌 19:00–20:59','亥 21:00–22:59'];

  // 合盘结果分组展开/收起
  window.TJSynToggle=function(btn){
    const sec=btn.closest('.syn-group');
    if(!sec)return;
    const open=sec.classList.toggle('open');
    btn.setAttribute('aria-expanded',open?'true':'false');
  };

  window.TJSynShare=function(){
    const s=window._lastSynastry;
    if(!s){showToast('暂无可分享的合盘结果');return}
    shareSynastry({name:s.name,relation:s.relation,result:s.result});
  };

  window.TJSynSave=function(){
    const s=window._lastSynastry;
    if(!s){showToast('暂无可保存的合盘对象');return}
    const rec=saveSynastryPartner({name:s.name,y:s.y,m:s.m,d:s.d,hourZhi:s.hourZhi,
                                   relation:s.relation,score:s.score});
    if(rec)mountPicker();
  };

  // —— 在合盘表单顶部挂「最近对象」快捷选择 ——
  function mountPicker(){
    const root=document.getElementById('toolModalContent');
    if(!root||window._activeTool!=='relation')return;
    const fields=root.querySelector('.tj-fields');
    if(!fields)return;
    let box=root.querySelector('.tj-partner-picker-wrap');
    const html=partnerPickerHtml();
    if(!html){if(box)box.remove();return}
    if(!box){
      box=document.createElement('div');
      box.className='tj-partner-picker-wrap';
      fields.parentNode.insertBefore(box,fields);
      bindPartnerPicker(box,p=>{
        const set=(id,v)=>{const e=document.getElementById('v3_'+id);if(e)e.value=v;};
        set('pname',p.name);
        set('bdate',`${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`);
        const hs=document.getElementById('v3_bhour');
        if(hs)hs.value=(p.hourZhi==null)?'时辰不详 · 用三柱比对':HOUR_LABELS[p.hourZhi];
        if(p.relation){const f=document.getElementById('v3_focus');if(f)f.value=p.relation;}
        showToast(`已填入「${p.name}」`);
      },mountPicker);
    }
    box.innerHTML=html;
  }

  const oldOpen=window.openToolPage;
  window.openToolPage=function(type){
    if(oldOpen)oldOpen(type);
    if(type==='relation')[80,260,600].forEach(ms=>setTimeout(mountPicker,ms));
  };
  window.TJSynMountPicker=mountPicker;
})();
}
