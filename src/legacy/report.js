// 本文件由 main.js 拆分而来（第 1 批）：零耦合 IIFE 外提。
// 每个 IIFE 原样包进 export function init*()，由 main.js 在原位置调用，执行时序不变。
import { buildExplainQuestion, extractSection } from '../ai/explain.js';
import { showToast } from '../ui/toast.js';
import { CURR_YEAR } from '../engines/shared.js';
import { mkLn } from '../engines/bazi.js';
import { buildDailyCopy, calcLiuRi } from '../engines/liuri.js';
import { exportShareCard, renderShareCard } from '../share/card.js';

/* 卡片折叠功能 */
export function initCardCollapse(){
(function(){
  // —— 默认折叠：本地存储记录"用户已展开的卡片" ——
  const LS_KEY='tj_expanded_cards';
  function loadExpanded(){
    try{return JSON.parse(localStorage.getItem(LS_KEY)||'[]');}catch(e){return [];}
  }
  function saveExpanded(arr){
    try{localStorage.setItem(LS_KEY,JSON.stringify(arr));}catch(e){}
  }
  // 给所有 .glass.card-2 自动注入折叠按钮（card-1 默认不折叠 = 主信息）
  function injectToggles(){
    const expanded=loadExpanded();
    document.querySelectorAll('#page2 .glass.card-2[data-card]:not([data-collapsible]):not([data-no-collapse])').forEach(el=>{
      const hd=el.querySelector('.card-hd');
      if(!hd)return;
      const btn=document.createElement('button');
      btn.className='card-toggle';
      btn.type='button';
      btn.title='折叠/展开';
      btn.setAttribute('aria-label','折叠或展开这张卡片');
      btn.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>';
      hd.appendChild(btn);
      el.setAttribute('data-collapsible','1');
      const onToggle=function(e){
        if(e.target.closest('button:not(.card-toggle),a,input,select,svg.no-toggle'))return;
        toggleCard(el);
      };
      btn.addEventListener('click',e=>{e.stopPropagation();toggleCard(el);});
      hd.style.cursor='pointer';
      hd.addEventListener('click',onToggle);
      // —— 默认折叠：只有用户曾展开过的卡片才保持展开 ——
      const key=el.getAttribute('data-card');
      if(!expanded.includes(key))el.classList.add('collapsed');
      // 折叠状态需要暴露给辅助技术，否则读屏用户不知道内容是收起的
      btn.setAttribute('aria-expanded', el.classList.contains('collapsed')?'false':'true');
    });
  }
  function toggleCard(el){
    const key=el.getAttribute('data-card');
    el.classList.toggle('collapsed');
    const tg=el.querySelector('.card-toggle');
    if(tg)tg.setAttribute('aria-expanded', el.classList.contains('collapsed')?'false':'true');
    if(!key)return;
    let list=loadExpanded();
    if(el.classList.contains('collapsed')){
      list=list.filter(k=>k!==key);
    }else{
      if(!list.includes(key))list.push(key);
    }
    saveExpanded(list);
  }
  window._injectCardToggles=injectToggles;
})();
}

/* 信息密度切换 */
export function initDensityToggle(){
(function(){
  // 还原上次设置
  try{if(localStorage.getItem('tj_density')==='1')document.body.classList.add('density-compact');}catch(e){}
  // 滚动监听显示返回顶部
  window.addEventListener('load',()=>{
    const sc=document.getElementById('p2Scroll');
    const btn=document.getElementById('backToTop');
    if(!sc||!btn)return;
    let ticking=false;
    sc.addEventListener('scroll',()=>{
      if(ticking)return;
      ticking=true;
      requestAnimationFrame(()=>{
        btn.classList.toggle('show',sc.scrollTop>200);
        ticking=false;
      });
    },{passive:true});
    if(document.getElementById('densityToggle')&&document.body.classList.contains('density-compact')){
      document.getElementById('densityToggle').classList.add('on');
    }
  });
})();
}

/* 为报告卡片注入「问大师」快捷提问入口 */
export function initExplainInject(){
(function(){
  const SEL='#page2 [data-card], #page2 .beginner-brief, #page2 .qr-card';

  function makeBtn(){
    const b=document.createElement('button');
    b.type='button';
    b.className='explain-btn';
    b.setAttribute('aria-label','这段是什么意思');
    b.title='这段是什么意思';
    b.innerHTML='<span>这段是什么意思</span>';
    return b;
  }

  // 每张卡片只给第一个「可见」术语加问号，避免满屏问号。
  // 必须判断可见性：新手/大师模式会隐藏大量卡片，
  // 若标到隐藏元素上，用户实际看到的那个就没有提示了。
  function markFirstTerms(){
    document.querySelectorAll('#page2 .glass, #page2 .beginner-brief, #page2 .qr-card').forEach(card=>{
      if(card.offsetParent===null)return;
      const terms=[...card.querySelectorAll('.glossary-term')].filter(t=>t.offsetParent!==null);
      card.querySelectorAll('.glossary-term.has-hint').forEach(e=>e.classList.remove('has-hint'));
      if(terms.length)terms[0].classList.add('has-hint');
    });
  }

  function inject(){
    if(!document.body.classList.contains('report-active'))return;
    markFirstTerms();
    document.querySelectorAll(SEL).forEach(card=>{
      if(card.querySelector(':scope > .explain-btn'))return;
      // 标签页里的卡片已去外壳；若内部子卡已有解释入口，外层再加一个
      // 就会出现两个连着的「这段是什么意思」（实测命盘页）
      // 工具中心与合盘表单不需要解释入口
      const k=card.dataset?.card||'';
      if(k==='toolHub')return;
      if(card.offsetParent===null)return;
      const btn=makeBtn();
      btn.addEventListener('click',e=>{
        e.stopPropagation();
        try{
          const {cardKey,heading,excerpt}=extractSection(card);
          const q=buildExplainQuestion({cardKey,heading,excerpt});
          if(typeof window.openAsk==='function')window.openAsk();
          setTimeout(()=>{ if(typeof window.doAsk==='function')window.doAsk(q); },260);
        }catch(err){ console.warn('explain',err); }
      });
      card.appendChild(btn);
    });
    // 去壳后的标签页卡片：外层与内部子卡会各挂一个按钮，
    // 视觉上是两个紧挨着的「这段是什么意思」。外层那个所指不明，去掉。
    // 注意必须放在注入之后 —— inject 按文档顺序先给外层加，
    // 在 section-tabs 建标签时清理会被之后的注入重新加回来。
    document.querySelectorAll('#page2 .sec-plain').forEach(card=>{
      const all=[...card.querySelectorAll('.explain-btn')];
      if(all.length<2)return;
      const own=all.find(b=>b.parentElement===card);
      if(own)own.remove();
    });
  }

  const obs=new MutationObserver(()=>{
    clearTimeout(window._explainT);
    window._explainT=setTimeout(inject,300);
  });
  obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  window.TJInjectExplain=inject;
})();
}

/* 大运/流年档位选择记忆 */
export function initYunTab(){
(function(){
  const KEY='tj_yun_tab_v1';
  function activate(yt){
    const tabs=document.querySelectorAll('#s-yun .yun-tab');
    if(!tabs.length)return;
    tabs.forEach(b=>{const a=b.dataset.yun===yt;b.classList.toggle('active',a);b.setAttribute('aria-selected',String(a));});
    document.querySelectorAll('#s-yun .yun-pane').forEach(p=>p.classList.toggle('active',p.dataset.yun===yt));
    try{sessionStorage.setItem(KEY,yt);}catch(e){}
  }
  window.TJActivateYunTab=activate;
  document.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('.yun-tab');
    if(b)activate(b.dataset.yun);
  });
  const oldShow=window.showPage2;
  window.showPage2=function(){
    const r=oldShow?oldShow.apply(this,arguments):undefined;
    let yt='year';try{yt=sessionStorage.getItem(KEY)||'year';}catch(e){}
    setTimeout(()=>activate(yt),120);
    return r;
  };
})();
}

/* 今日运势卡与本周分享（实时推演） */
export function initTodayCard(){
(function(){
  const TONE_LABEL={flow:'顺势',steady:'平稳',friction:'有阻力',rest:'宜收'};
  const TONE_BADGE={flow:'状态在线',steady:'稳步推进',friction:'留有余量',rest:'宜收尾恢复'};
  const dateTag=d=>`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  const todayStr=()=>dateTag(new Date());
  const DISC='仅供自我整理与行动参考，不构成投资、医疗、法律或职业决策依据';

  // —— 周运势卡 ——
  window.TJShareWeek=function(){
    const w=window._weekData;
    if(!w){showToast('请先完成推演，生成报告后即可分享');return;}
    const fmt=d=>`${d.getMonth()+1}月${d.getDate()}日`;
    const cv=renderShareCard({
      kicker:'周运势 · WEEKLY RHYTHM',
      title:`${fmt(w.start)} – ${fmt(w.end)}`,
      sub:'逐日干支 × 你的命盘 · 与每日日签同源推演',
      badge:(TONE_LABEL[w.dominant]||'平稳')+' · '+w.avg+'分',
      rows:[
        {k:'本周基调',v:w.summary},
        {k:'相对顺利',v:`${w.best.label}（${w.best.short} · ${w.best.day.gz}日）——把重要的事尽量放在这天`},
        {k:'多留余量',v:`${w.worst.label}（${w.worst.short} · ${w.worst.day.gz}日）——行程别排满，重大决定往后放`},
      ],
      foot:DISC,
    });
    exportShareCard(cv,'问问大师_周运势_'+w.start.getMonth()+1+w.start.getDate());
  };

  // —— 今日卡（日签口径：当日干支 × 命盘）——
  window.TJShareRiQian=function(){
    const d=window._ctx||window._baziData;
    const r=(d&&d.b)?calcLiuRi(d.b,(d.wx&&d.wx.ys)||'土'):(window._todayLiuRi||null);
    if(!r){showToast('请先完成推演，即可生成今日卡片');return;}
    const c=buildDailyCopy(r);
    const cv=renderShareCard({
      kicker:'今日日签 · DAILY',
      title:c.headline,
      sub:`${todayStr()} · ${r.day.gz}日 · ${c.label}`,
      badge:(TONE_BADGE[r.tone]||'平稳')+' · '+r.energy+'分',
      rows:[
        {k:'今日基调',v:c.label+' · '+c.role+' · '+c.domain},
        ...(c.sections.slice(0,3).map(s=>({k:s.k,v:s.v}))),
      ],
      foot:DISC,
    });
    exportShareCard(cv,'问问大师_今日日签_'+r.day.dateKey);
  };

  // —— 命盘报告摘要卡 ——
  window.TJShareReport=function(){
    const d=window._ctx||window._baziData;
    if(!d||!d.b){showToast('请先完成推演');return;}
    const b=d.b,wx=d.wx||{};
    const four=[b.Y,b.M,b.D,b.H].map(x=>x.g+x.z).join(' · ');
    const cLn=d.cLn||mkLn(CURR_YEAR);
    const rawBd=(d.input&&(d.input.bd_raw||d.input.bd))||'';
    let bdText=todayStr();
    const _m=rawBd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(_m)bdText=`${_m[1]}年${+_m[2]}月${+_m[3]}日${d.input.gen==='male'?' · 乾造':' · 坤造'}`;
    const cv=renderShareCard({
      kicker:'命盘摘要 · CHART',
      title:`${d.dg||''}${d.dw||''}命盘`,
      sub:bdText,
      badge:(d.wx&&d.wx.st?'行动型节奏':'蓄力型节奏'),
      rows:[
        {k:'四柱',v:four},
        {k:'五行重心',v:`用神「${wx.ys||'—'}」 · 喜神「${wx.xs||'—'}」`},
        {k:'当前大运',v:(d.cDy?`${d.cDy.g}${d.cDy.z} · `:'')+(d.cs?`事业 ${d.cs} / 财富 ${d.ws} / 感情 ${d.ls} / 健康 ${d.hs}`:'')},
        {k:`${CURR_YEAR}流年`,v:`${cLn.g}${cLn.z}${cLn.sx?` · ${cLn.sx}年`:''}${d.lnSS?` · ${d.lnSS}`:''}`},
      ],
      foot:DISC,
    });
    exportShareCard(cv,'问问大师_命盘摘要');
  };

  // —— 通用工具结果卡：从当前工具结果页提取内容渲染 ——
  window.TJShareToolResult=function(){
    const root=document.getElementById('toolModalContent');
    const out=root&&root.querySelector('.tj-result.show');
    if(!out){showToast('先生成结果，再分享卡片');return;}
    const title=(root.querySelector('.tj-tool-title')?.textContent||'工具结果').replace(/^[^\s]+\s/,'').trim();
    const sub=((root.querySelector('.tj-tool-kicker')?.textContent)||'').trim();
    const scoreEl=out.querySelector('.tj-score');
    const rows=[...out.querySelectorAll('.tj-result-list>div')].slice(0,6).map(el=>({
      k:el.querySelector('b')?.textContent.trim()||'',
      v:el.querySelector('span')?.innerText.trim().slice(0,90)||''
    })).filter(r=>r.k&&r.v);
    if(!rows.length){showToast('该结果暂不支持卡片分享');return;}
    const cv=renderShareCard({
      kicker:sub||'问问大师工具',
      title:title,
      sub:todayStr(),
      badge:(scoreEl&&scoreEl.textContent.trim())||null,
      rows,
      foot:DISC,
    });
    exportShareCard(cv,'问问大师_'+title);
  };

  // —— 签文卡：签诗适合做成图片 ——
  window.TJShareOracle=function(){
    const o=window._lastOracle;
    if(!o){showToast('先摇一签，再生成签文卡');return;}
    const cv=renderShareCard({
      kicker:o.area+' · 第 '+o.n+' 签',
      title:'『'+o.title+'』',
      sub:todayStr()+' · '+(o.q?('所问：'+String(o.q).slice(0,40)):'摇签问卜'),
      badge:o.grade||null,
      rows:[
        {k:'签诗',v:o.poem.replace(/\n/g,'，')},
        {k:'圣意',v:o.yi||'—'},
        {k:'解曰',v:(o.jie||'—').slice(0,90)},
      ],
      foot:DISC,
    });
    exportShareCard(cv,'问问大师_签文_'+o.area+o.n);
  };

  // —— 彩票号码复制 ——
  window.TJCopyLottery=function(){
    const l=window._lastLottery;
    if(!l){showToast('先生成号码');return;}
    if(navigator.clipboard){navigator.clipboard.writeText(l.type+'\n'+l.text).then(()=>showToast('号码已复制')).catch(()=>showToast(l.text));}
    else showToast(l.text);
  };

  // —— 合盘卡 ——
  window.TJShareSyn=function(){
    const s=window._lastSynastry;
    if(!s||!s.result){showToast('先完成一次合盘，再生成卡片');return;}
    const r=s.result,lab=r.score>=80?'契合度高':r.score>=65?'整体顺畅':r.score>=50?'有合有冲':r.score>=35?'需要磨合':'差异明显';
    const cv=renderShareCard({
      kicker:'八字合盘 · SYNASTRY',
      title:((s.name?s.name+' × ':(s.relation||'关系')+' · ')+lab),
      sub:(r.precision==='full'?'四柱比对':'三柱比对（对方时辰未提供）')+' · '+todayStr(),
      badge:r.score+'分',
      rows:[
        {k:'总述',v:r.dm.title+' '+r.dm.desc},
        {k:'合冲统计',v:r.counts.he+' 合 / '+r.counts.chong+' 冲'+(r.counts.other?' / '+r.counts.other+' 刑害':'')},
        {k:'互补要素',v:r.comp.text},
      ],
      foot:'合盘用于理解差异、找到沟通方式，不预测关系结局。'+DISC,
    });
    exportShareCard(cv,'问问大师_合盘_'+(s.name||'关系'));
  };
})();
}

/* 速读卡折叠 */
export function initQuickReadCollapse(){
(function(){
  const KEY='tj_qr_collapsed_v1';
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } }
  function save(m){ try{ localStorage.setItem(KEY,JSON.stringify(m)); }catch(e){} }
  // 用所属分区做 key，各分区的速读独立记忆
  function keyOf(card){ return card.closest('.sec')?.id || 'default'; }

  window.TJToggleQuickRead=function(btn){
    const card=btn.closest('.qr-card'); if(!card)return;
    const open=!card.classList.toggle('qr-collapsed');
    btn.setAttribute('aria-expanded', open?'true':'false');
    const m=load(); m[keyOf(card)]=!open; save(m);
  };

  // 恢复上次的折叠状态
  function restore(){
    const m=load();
    document.querySelectorAll('#page2 .qr-card').forEach(card=>{
      const collapsed=!!m[keyOf(card)];
      card.classList.toggle('qr-collapsed',collapsed);
      card.querySelector('.qr-head')?.setAttribute('aria-expanded',collapsed?'false':'true');
    });
  }
  /* 不能用「MutationObserver + 防抖」：restore 自身会改 class，
     不断重置计时器导致永不执行（section-tabs 已踩过同一个坑）。
     改为报告激活后轮询几次，状态稳定即停。 */
  let timer=null,stable=0,last='';
  const sigOf=()=>[...document.querySelectorAll('#page2 .qr-card')]
    .map(c=>(c.closest('.sec')?.id||'')+(c.classList.contains('qr-collapsed')?'1':'0')).join(',');
  function start(){
    if(timer)return;
    stable=0;last='';
    timer=setInterval(()=>{
      if(!document.body.classList.contains('report-active')){stop();return}
      restore();
      const s2=sigOf();
      stable=(s2===last&&s2!=='')?stable+1:0;
      last=s2;
      if(stable>=3)stop();
    },400);
    setTimeout(stop,12000);
  }
  function stop(){ clearInterval(timer); timer=null; }

  new MutationObserver(()=>{
    if(document.body.classList.contains('report-active'))start(); else stop();
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.tab-item')||e.target.closest?.('.mode-top-switch'))start();
  },true);
  if(document.body.classList.contains('report-active'))start();
})();
}
