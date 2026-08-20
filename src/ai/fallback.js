import { CURR_YEAR, GW } from '../engines/shared.js';
import { TJ } from '../state/tj.js';
import { extractIntents } from './smart-answer.js';
import { buildRelatedRoutes, compactAIText, renderRouteButtons } from '../render/ai.js';

export function generateAnswerFallback(q,d,el){
  // —— 直接读 ctx ——
  const age=d.age,cDy=d.cDy,cLn=d.cLn;
  const lnSS=d.lnSS||TJ.ssOf(d.dg,cLn&&cLn.g),dySS=d.dySS||TJ.ssOf(d.dg,cDy&&cDy.g);
  const history=Array.isArray(window._aiConversation)?window._aiConversation:[];
  const priorUser=[...history].reverse().find(turn=>turn.role==='user'&&turn.content)?.content||'';
  const contextualFollowUp=!!priorUser&&(q.trim().length<=18||/^(那|然后|所以|具体|继续|怎么办|怎么做|为什么|他|她|这个|那我|我呢|可以吗|要不要)/.test(q.trim()));
  // In offline mode, carry the previous subject into a short follow-up instead of resetting to “综合”.
  const intents=extractIntents(contextualFollowUp?priorUser:q);
  let conclusion='',reason='',phase='',action='';
  if(intents.includes('事业')){
    conclusion=dySS.includes('官')||lnSS.includes('官')?'今年事业有上升通道':'今年事业宜稳守不宜冒进';
    reason=`日主${d.dg}，当前大运${cDy.g}${cDy.z}，十神为${dySS}；${CURR_YEAR}流年${cLn.g}${cLn.z}为${lnSS}。`+(dySS.includes('官')?'官杀主压力与机遇并存':'食伤生财利于创意变现');
    phase=`${cDy.as}-${cDy.ae}岁为`+(dySS.includes('官')?'事业打拼期':'积累蓄势期')+'，今年'+(lnSS.includes('官')?'有贵人提携':'需自力更生')+'。';
    action='1. 主动向上司争取核心项目\n2. 每天预留1小时深度学习';
  }else if(intents.includes('感情')){
    conclusion=d.shensha.some(s=>s.n==='桃花')?'今年桃花运旺，注意筛选':'今年感情节奏偏稳，宜经营';
    reason=`日主${d.dg}，${d.gen==='male'?'财星':'官星'}代表异性缘。当前`+(d.shensha.some(s=>s.n==='桃花')?'命局带桃花，异性缘天生较强':'桃花不显，缘分多来自熟人介绍')+'。';
    phase=`${CURR_YEAR}年${cLn.g}${cLn.z}，流年十神${lnSS}，`+(lnSS.includes(d.gen==='male'?'财':'官')?'配偶星透出，有利婚恋':'感情气场平和，以陪伴为主')+'。';
    action='1. 多参加行业聚会拓展圈子\n2. 避免在冲太岁月份做重大感情决定';
  }else if(intents.includes('财运')){
    conclusion=lnSS.includes('财')?'今年有偏财窗口，但忌贪心':'今年财运平稳，重在守成';
    reason=`日主${d.dg}，`+(d.wx.st?'身旺能担财':'身弱财为忌')+`。${CURR_YEAR}年`+(lnSS.includes('财')?'财星流年，来财机会增多':'财星未透，以正财为主')+'。';
    phase=`当前大运${cDy.g}${cDy.z}，`+(dySS.includes('财')?'十年财路较活':'十年以积累专业技能为主')+'。';
    action='1. 建立6个月应急储蓄\n2. 远离高杠杆投机';
  }else{
    conclusion='整体气场平和，稳中求进是最佳策略';
    reason=`日主${d.dg}属${GW[d.dg]}，`+(d.wx.st?'身旺':'身弱')+'，用神'+d.wx.ys+'。当前无明显吉凶冲克。';
    phase=`${cDy.as}-${cDy.ae}岁为人生`+(age<30?'探索':age<40?'突破':'沉淀')+'期，'+CURR_YEAR+'年宜'+(d.wx.ys==='木'?'拓展人脉':d.wx.ys==='火'?'展示才华':d.wx.ys==='土'?'深耕专长':d.wx.ys==='金'?'精进技术':'沉淀思考')+'。';
    action='1. 保持现有作息\n2. 每月复盘一次目标进度';
  }
  const continuation=contextualFollowUp?`你是在接着问刚才的「${priorUser.slice(0,28)}」。`:'';
  const text=`${continuation}我先说重点：${conclusion}。${reason} 这不代表事情已经被定死，现实里的选择更重要。你可以先从这一步开始：${action.replace(/\n/g,'；')}`;
  let html='<div class="ai-dialogue"><div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text"><div class="ai-dialogue-label">问问大师</div>'+compactAIText(text,180)+'</div></div></div>';
  // —— 兜底回答末尾也附跳转按钮 ——
  const links=buildRelatedRoutes(intents);
  if(links.length)html+=renderRouteButtons(links,'前往相关页面查看');
  const loading=el.querySelector('.loading-state');if(loading)loading.remove();
  const answer=document.createElement('div');answer.className='ai-body-inner';answer.innerHTML=html;el.appendChild(answer);
  requestAnimationFrame(()=>{el.scrollIntoView({behavior:'smooth',block:'nearest'});});
}
