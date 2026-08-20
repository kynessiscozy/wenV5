// 本文件由 main.js 拆分而来（第 1 批）：零耦合 IIFE 外提。
// 每个 IIFE 原样包进 export function init*()，由 main.js 在原位置调用，执行时序不变。
import { CD, CG } from '../engines/cities.js';
import { getResultStyle } from '../state/result-style.js';

/* 出生地城市输入自动补全 */
export function initCityAutocomplete(){
(function(){
  const inp=document.getElementById('cInp'),hid=document.getElementById('bPlace'),dd=document.getElementById('cDD');
  let ai=-1;
  // 将候选层提升到 body，避免被表单、卡片或滚动容器裁剪。
  if(dd){document.body.appendChild(dd);dd.classList.add('cdd-floating');}
  function placeDropdown(){
    if(!dd||!inp)return;
    const r=inp.getBoundingClientRect();
    dd.style.left=Math.round(r.left)+'px';
    dd.style.width=Math.round(r.width)+'px';
    const spaceBelow=window.innerHeight-r.bottom-8;
    const spaceAbove=r.top-8;
    const h=Math.min(260,Math.max(120,spaceBelow));
    if(spaceBelow>=150||spaceBelow>=spaceAbove){
      dd.style.top=Math.round(r.bottom+4)+'px';
      dd.style.maxHeight=Math.round(Math.max(120,spaceBelow))+'px';
    }else{
      dd.style.top='auto';
      dd.style.bottom=Math.round(window.innerHeight-r.top+4)+'px';
      dd.style.maxHeight=Math.round(Math.max(120,spaceAbove))+'px';
    }
  }
  function rdd(f){
    let h='',n=0;const q=(f||'').toLowerCase();
    CG.forEach(g=>{
      const m=g.c.filter(c=>!q||c.n.includes(q)||c.i.includes(q)||g.g.includes(q)||(c.p&&c.p.toLowerCase().includes(q)));
      if(!m.length)return;
      h+=`<div class="cg">${g.g}</div>`;
      m.forEach(c=>{h+=`<div class="co" data-i="${c.i}" data-n="${c.n}"><span>${c.n}</span><span class="cp">${g.g}</span></div>`;n++;});
    });
    if(!n)h='<div style="padding:18px;text-align:center;color:var(--c-text-3);font-size:.82em">未找到</div>';
    dd.innerHTML=h;ai=-1;
    dd.querySelectorAll('.co').forEach(el=>el.addEventListener('mousedown',e=>{e.preventDefault();sel(el.dataset.i,el.dataset.n);}));
  }
  function openDD(){
    placeDropdown();dd.classList.add('show');
  }
  function sel(i,n){hid.value=i;inp.value=n;dd.classList.remove('show');dd.style.bottom='';}
  inp.addEventListener('focus',()=>{rdd(inp.value===(CD[hid.value]||{}).n?'':inp.value);openDD();});
  inp.addEventListener('input',()=>{rdd(inp.value);hid.value='';openDD();});
  inp.addEventListener('blur',()=>setTimeout(()=>dd.classList.remove('show'),150));
  window.addEventListener('resize',()=>{if(dd.classList.contains('show'))placeDropdown();});
  window.addEventListener('scroll',()=>{if(dd.classList.contains('show'))placeDropdown();},true);
  inp.addEventListener('keydown',e=>{
    const opts=dd.querySelectorAll('.co');
    if(e.key==='ArrowDown'){e.preventDefault();ai=Math.min(ai+1,opts.length-1);opts.forEach((o,i)=>o.classList.toggle('act',i===ai));if(opts[ai])opts[ai].scrollIntoView({block:'nearest'});}
    else if(e.key==='ArrowUp'){e.preventDefault();ai=Math.max(ai-1,0);opts.forEach((o,i)=>o.classList.toggle('act',i===ai));}
    else if(e.key==='Enter'){e.preventDefault();if(ai>=0&&opts[ai])sel(opts[ai].dataset.i,opts[ai].dataset.n);}
    else if(e.key==='Escape')dd.classList.remove('show');
  });
  window.rdd=rdd;window.sel=sel;
})();;
}

/* 表单未推演保护：修改输入后未推演，点击「重新推演」弹窗确认 */
export function initFormDirtyGuard(){
(function(){
  /* 轻量确认弹窗（移动端友好，非原生 confirm） */
  window.showConfirm=function(opts){
    document.getElementById('tjConfirm')?.remove();
    const box=document.createElement('div');
    box.className='tj-confirm';box.id='tjConfirm';
    box.innerHTML=
      '<div class="tj-confirm-bg"></div>'+
      '<div class="tj-confirm-card" role="alertdialog" aria-modal="true" aria-label="'+(opts.title||'提示')+'">'+
        '<div class="tt">'+(opts.title||'提示')+'</div>'+
        '<div class="tx">'+(opts.text||'')+'</div>'+
        '<div class="acts">'+
          '<button type="button" class="ghost" data-act="cancel">'+(opts.cancelText||'取消')+'</button>'+
          '<button type="button" class="primary" data-act="ok">'+(opts.okText||'确定')+'</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(box);
    const done=(act)=>{box.remove();if(act==='ok'&&opts.onOk)opts.onOk();if(act==='cancel'&&opts.onCancel)opts.onCancel();};
    box.querySelector('[data-act="ok"]').addEventListener('click',()=>done('ok'));
    box.querySelector('[data-act="cancel"]').addEventListener('click',()=>done('cancel'));
    box.querySelector('.tj-confirm-bg').addEventListener('click',()=>done('cancel'));
    return box;
  };

  /* 表单字段变化 → 标记「已修改未推演」 */
  window._formDirty=false;
  ['bDate','bTime','cInp','bGen','bResultStyle'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.addEventListener('input',()=>{window._formDirty=true;});
    el.addEventListener('change',()=>{window._formDirty=true;});
  });
  const styleSelect=document.getElementById('bResultStyle'),styleHint=document.getElementById('resultStyleHint');
  const styleButtons=document.querySelectorAll('.result-style-option');
  styleButtons.forEach(btn=>btn.addEventListener('click',()=>{
    const value=btn.dataset.style;
    if(styleSelect)styleSelect.value=value;
    styleButtons.forEach(x=>{const on=x===btn;x.classList.toggle('active',on);x.setAttribute('aria-checked',on?'true':'false');});
    if(styleHint)styleHint.textContent=getResultStyle(value).intro;
    window._formDirty=true;
  }));
  const sw=document.getElementById('swTrueSolar');
  if(sw)sw.addEventListener('click',()=>{window._formDirty=true;});

  /* 拦截「重新推演」：有未推演修改时弹窗确认 */
  const _origGoBack=window.goBack;
  window.goBack=function(){
    if(window._formDirty&&window._ctx){
      window.showConfirm({
        title:'尚未推演',
        text:'你修改了出生信息，但还没有重新推演。返回后修改会保留在表单里，下次打开即可继续。',
        okText:'继续返回',cancelText:'取消',
        onOk:()=>{window._formDirty=false;_origGoBack();},
      });
      return;
    }
    _origGoBack();
  };
})();
}
