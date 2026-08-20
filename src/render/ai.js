import { KB } from '../ai/kb.js';

export function formatAIText(text){let h=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\*\*(.+?)\*\*/g,'<span class="hl">$1</span>').replace(/【(.+?)】/g,'<span class="tg">$1</span>').replace(/#{1,4}\s*(.+)/g,'<h4>$1</h4>').split(/\n{2,}/).map(p=>p.trim()?`<p>${p.replace(/\n/g,'<br>')}</p>`:'').join('');return h||`<p>${text.replace(/\n/g,'<br>')}</p>`;}

export function renderSmartAnswer(res,q){
  const head=`<div class="ai-kb-head"><span class="ai-kb-badge">${res.kind==='term'?'术语':'信息库'}</span><span class="ai-kb-q">${res.title}</span></div>`;
  const body=res.sections.map((s,i)=>`<div class="ai-step"><div class="ai-step-icon">${i+1}</div><div class="ai-step-body"><div class="ai-step-title">${s.title}</div><div class="ai-step-text">${String(s.content||'').replace(/\n/g,'<br>')}</div></div></div>`).join('');
  let footer='';
  if(res.links&&res.links.length){
    footer+=renderRouteButtons(res.links,res.kind==='term'?'查看相关卡片':'前往查看详细数据');
  }
  if(res.related&&res.related.length){
    footer+=`<div class="ai-related"><div class="ai-related-h">你可能还想问</div><div class="ai-related-list">${res.related.map(r=>`<div class="ai-chip small" onclick="doAsk('${r.q.replace(/'/g,"\\'")}')">${r.q}</div>`).join('')}</div></div>`;
  }
  return head+'<div class="ai-body-inner">'+body+footer+'</div>';
}

export function renderRouteButtons(routes,label){
  if(!routes||!routes.length)return '';
  return `<div class="ai-routes"><div class="ai-routes-h">${label||'相关页面'}</div><div class="ai-routes-list">${routes.map(r=>`<button class="ai-route-btn" onclick="jumpTo('${r.sec}','${r.card}')">→ ${r.name}</button>`).join('')}</div></div>`;
}

export function buildRelatedRoutes(intents){
  const map={
    '事业':['persona','trend','timeline'],
    '财富':['trend','timeline','risk'],
    '感情':['loveMode','loveMatch','loveRisk'],
    '健康':['health','monthly'],
    '学业':['persona','timeline'],
    '居住':['risk','wuxing'],
    '玄学':['ziwei','qimen','meihua'],
    '综合':['trend','monthly','todayAdv']
  };
  const seen=new Set();const out=[];
  intents.forEach(it=>(map[it]||[]).forEach(k=>{
    if(seen.has(k))return;seen.add(k);
    if(KB.routes[k])out.push(KB.routes[k]);
  }));
  return out.slice(0,3);
}

export function compactAIText(text,max=78){
  const s=String(text||'').replace(/<br\s*\/?>(\s*)/gi,' ').replace(/\s+/g,' ').trim();
  return s.length>max?s.slice(0,max-1)+'…':s;
}

export function formatStandardAnswer(text){
  const sections=[];
  const titles=['结论','命理原因','当前阶段','行动建议'];
  titles.forEach((t,idx)=>{
    const m=text.match(new RegExp(`【${t}】[:：]([\\s\\S]*?)(?=【${titles[idx+1]||'END'}】|$)`));
    if(m)sections.push({title:t,content:m[1].trim()});
  });
  if(!sections.length)return formatAIText(text);
  return sections.map((s,i)=>`<div class="ai-step"><div class="ai-step-icon">${i+1}</div><div class="ai-step-body"><div class="ai-step-title">${s.title}</div><div class="ai-step-text">${compactAIText(s.content,i===3?96:68)}</div></div></div>`).join('');
}
