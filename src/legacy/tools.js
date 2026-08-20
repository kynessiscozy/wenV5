// 本文件由 main.js 拆分而来（第 1 批）：零耦合 IIFE 外提。
// 每个 IIFE 原样包进 export function init*()，由 main.js 在原位置调用，执行时序不变。
import { closeToolPage, openToolPage } from '../tools/center.js';
import { showToast } from '../ui/toast.js';
import { SX } from '../engines/shared.js';
import { calcSynastry } from '../engines/synastry.js';
import { buildDailyCopy, calcLiuRi } from '../engines/liuri.js';

/* 工具中心增强：搜索、分类、键盘可用性 */
export function initToolCenterSearch(){
(function(){
  const groups={
    all:'全部',money:'财富与事业',life:'日常决策',relation:'关系与沟通',play:'灵感与娱乐'
  };
  const map={wealth:'money',career:'money',layoff:'money',date:'life',style:'life',daily:'life',relation:'relation',zodiac:'relation',name:'play',oracle:'play',answerbook:'play',lottery:'play'};
  const labels={wealth:'收入与理财',career:'职业选择',date:'重要事项',style:'环境与状态',layoff:'职场预案',daily:'今日节奏',name:'名称灵感',oracle:'自我反思',answerbook:'快速答案',lottery:'娱乐选号',zodiac:'生肖关系',relation:'关系分析'};
  function mount(){
    const hub=document.querySelector('#s-adv .tool-hub'),grid=hub&&hub.querySelector('.tool-grid');
    if(!hub||!grid||document.getElementById('toolsToolbar'))return;
    grid.id='toolGrid';
    const toolIds=['wealth','career','date','style','layoff','daily','name','oracle','answerbook','lottery','zodiac','relation'];
    grid.querySelectorAll('.tool-tile').forEach((tile,index)=>{
      const m=(tile.getAttribute('onclick')||'').match(/openToolPage\(\s*['\"]([^'\"]+)['\"]\s*\)/);
      const id=(m&&m[1])||toolIds[index];
      if(!id)return;
      tile.dataset.tool=id;
      tile.dataset.group=map[id]||'life';
      tile.setAttribute('aria-label',labels[id]||'决策工具');
    });
    const bar=document.createElement('div');bar.className='tools-toolbar';bar.id='toolsToolbar';
    bar.innerHTML='<input class="tools-search" id="toolsSearch" type="search" placeholder="输入工具名称或关键词" aria-label="搜索工具"><div class="tools-filter" role="tablist">'+Object.entries(groups).map(([k,v])=>'<button type="button" data-group="'+k+'" class="'+(k==='all'?'active':'')+'">'+v+'</button>').join('')+'</div>';
    hub.insertBefore(bar,grid);
    let active='all';
    function render(){const q=(document.getElementById('toolsSearch').value||'').trim().toLowerCase();let count=0;grid.querySelectorAll('.tool-tile').forEach(t=>{const ok=(active==='all'||t.dataset.group===active)&&(!q||(t.textContent+' '+(labels[t.dataset.tool]||'')).toLowerCase().includes(q));t.classList.toggle('is-filter-hidden',!ok);if(ok)count++;});let empty=grid.querySelector('.tool-empty');if(!count){if(!empty){empty=document.createElement('div');empty.className='tool-empty';grid.appendChild(empty)}empty.textContent='没有找到匹配的工具，换个关键词试试。'}else if(empty)empty.remove();}
    bar.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.group;bar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));render();}));
    bar.querySelector('input').addEventListener('input',render);render();
  }
  const oldSwitch=window.switchTab;window.switchTab=function(el){if(oldSwitch)oldSwitch(el);if(el&&el.dataset.sec==='s-adv')setTimeout(mount,0)};
  document.addEventListener('DOMContentLoaded',mount);
  new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
})();
}

/* v3：统一工具引擎 */
export function initToolEngineV3(){
(function(){
 const T={
  wealth:{k:'财富与事业',icon:'财',title:'财运与理财罗盘',desc:'把命盘节奏和真实现金流放在一起看，先建立安全垫，再安排增长。',fields:[['income','月到手收入','number','例如 15000'],['cost','月固定支出','number','例如 8000'],['cash','现有储蓄','number','例如 60000']]},
  career:{k:'财富与事业',icon:'业',title:'转行与副业测评',desc:'不替你冲动跳船，而是判断准备度、现金流和验证路径。',fields:[['goal','目标','select',['转行','副业','创业']],['ready','准备程度','select',['已有技能和作品','已有方向但未验证','还没有明确方向']],['runway','可承受准备期','select',['1个月以内','1—3个月','3个月以上']]]},
  date:{k:'日常决策',icon:'择',title:'重要事项择日助手',desc:'择日不替代现实条件，重点帮你补齐风险检查和行动准备。',fields:[['event','事项','select',['签约合作','面试入职','搬家出行','关系沟通']],['date','目标日期','date',''],['constraint','现实限制','textarea','例如：必须周五完成、对方只能晚上沟通']]},
  style:{k:'日常决策',icon:'装',title:'能量穿搭与工位风水',desc:'将抽象的五行提示转成颜色、环境和专注习惯，避免复杂摆件依赖。',fields:[['scene','场景','select',['重要沟通','面试汇报','专注工作','休息恢复']],['space','当前环境问题','select',['杂乱、注意力分散','光线不足','久坐疲劳','没有明显问题']]]},
  layoff:{k:'财富与事业',icon:'险',title:'裁员风险预案',desc:'不做“会不会被裁”的确定性预测，综合公司信号、现金流缓冲与求职准备度，帮你判断应观察、准备还是立即行动。',fields:[['signal','公司信号（最重要）','select',['稳定增长','业务调整','部门收缩或冻结','已出现明确裁撤信号']],['buffer','现金流缓冲（月数）','select',['不足3个月','3—6个月','6个月以上']],['ready','求职准备度','select',['未准备','部分准备','随时可投递']]]},
  daily:{k:'日常决策',icon:'签',title:'今日日签',desc:'每天只选一个重点，避免把建议变成新的压力。',fields:[['focus','今日重点','select',['推进工作','关系沟通','学习积累','休息恢复']],['energy','当前状态','select',['精力充足','普通','疲惫或焦虑']]]},
  name:{k:'灵感与娱乐',icon:'名',title:'智能起名工具',desc:'生成的是灵感方向，不替代读音、字义、重名和家族规范核验。',fields:[['surname','姓氏','text','请输入姓氏'],['style','风格','select',['简洁现代','温润典雅','大气坚定']],['wish','希望传达','text','例如：安定、聪慧、开阔']]},
  oracle:{k:'灵感与娱乐',icon:'卜',title:'摇签问卜',desc:'传统寺庙问卜：先按问题选择适合的签种，再抽取签诗。观音签适合综合求问；文王签适合事业、学业与方向；关帝签适合事业、承诺与行动；城隍签适合是非、契约与公道；土地公签适合家宅、搬迁与生活根基；财神签适合财务、经营与收入；爱情签适合感情关系；健康签适合作息与身心提醒。结果仅作自我反思参考。',fields:[['area','签种','select',['观音签','文王签','关帝签','城隍签','土地公签','财神签','爱情签','健康签']],['question','你的问题','textarea','只写一件具体的事']]},
  answerbook:{k:'灵感与娱乐',icon:'答',title:'答案之书',desc:'把一个问题写下来，翻开一句简短答案，作为整理思路的提示。它不是预测，也不能替代你的判断。',fields:[['question','你的问题','textarea','例如：我现在适合开始这件事吗？'],['mode','回答方式','select',['直接回答','行动提醒','自我探索']]]},
  lottery:{k:'灵感与娱乐',icon:'号',title:'娱乐选号',desc:'纯随机生成，不预测中奖，不使用命盘制造确定性。',fields:[['type','玩法','select',['双色球','超级大乐透']],['count','注数','select',['1','3','5']]]},
  zodiac:{k:'关系与沟通',icon:'肖',title:'生肖合冲分析',desc:'只作为传统文化参考，真正决定关系质量的是边界、沟通和共同目标。',fields:[['other','对方生肖','select','鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('')],['scene','关系场景','select',['亲密关系','朋友合作','家人沟通']]]},
  relation:{k:'关系与沟通',icon:'合',title:'八字合盘 · 关系分析',desc:'为对方真实排盘，比对日主、五行与干支关系，并给出可直接使用的沟通方案。',fields:[['focus','关系类型','select',['亲密关系','朋友合作','家人沟通']],['pname','对方称呼（可不填）','text','例如：阿雯'],['bdate','对方出生日期（可不填）','date',''],['bhour','对方出生时辰','select',['时辰不详 · 用三柱比对','子 23:00–00:59','丑 01:00–02:59','寅 03:00–04:59','卯 05:00–06:59','辰 07:00–08:59','巳 09:00–10:59','午 11:00–12:59','未 13:00–14:59','申 15:00–16:59','酉 17:00–18:59','戌 19:00–20:59','亥 21:00–22:59']],['issue','当前卡点','textarea','例如：对方不回复、分工不清、总是争吵'],['goal','希望改善','text','例如：把需求说清楚']]}
 };
 const val=id=>{const e=document.getElementById('v3_'+id);return e?e.value.trim():''};
 function esc(x){return String(x||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
 function field(f){let [id,label,type,extra]=f;const optAttr=(id==='bdate')?' data-optional="1"':'';let body=type==='select'?'<select id="v3_'+id+'">'+extra.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select>':type==='textarea'?'<textarea id="v3_'+id+'" placeholder="'+esc(extra)+'"></textarea>':'<input id="v3_'+id+'" type="'+type+'" placeholder="'+esc(extra)+'"'+optAttr+'>';return '<div class="tj-field"><label for="v3_'+id+'">'+label+'</label>'+body+'</div>';}
 function base(type){const t=T[type];return '<div class="tj-tool-v3"><div class="tj-tool-intro"><div class="tj-tool-kicker">'+t.k+' · 问问大师工具</div><div class="tj-tool-title">'+t.icon+' '+t.title+'</div><div class="tj-tool-desc">'+t.desc+'</div></div><div class="tj-fields">'+t.fields.map(field).join('')+'</div><button class="tj-submit" onclick="TJToolRun(\''+type+'\')">生成我的方案</button><div class="tj-result" id="v3_result"></div><div class="tj-disclaimer">结果用于整理思路与行动规划，不构成投资、医疗、法律或职业确定性判断。</div></div>';}
 const chartTools=new Set(['wealth','career','date','style','layoff','name','zodiac','relation']);
 function result(title,body,score){const e=document.getElementById('v3_result'),d=window._ctx||window._baziData||{},wx=d.wx||{},chart=chartTools.has(window._activeTool)?'<div class="tj-chart-basis"><b>✦ 命盘依据</b><div><span>日主</span><strong>'+(d.dg||'—')+'</strong><span>有利方向</span><strong>'+(wx.ys||'—')+'</strong><span>事业评分</span><strong>'+(d.cs||'—')+'/100</strong><span>财富评分</span><strong>'+(d.ws||'—')+'/100</strong></div><p>以上信息用于校正工具建议的节奏与侧重点；现实信号、个人选择和专业意见优先。</p></div>':' ';e.innerHTML='<div class="tj-result-head"><div class="tj-result-title">'+title+'</div>'+(score?'<div class="tj-score">'+score+'</div>':'')+'</div><div class="tj-result-body">'+body+'</div>'+chart;e.classList.add('show');e.scrollIntoView({behavior:'smooth',block:'nearest'});}
 function run(type){const d=window._ctx||window._baziData||{},wx=d.wx||{},scoreBase=d.cs||60;
  if(type==='wealth'){let income=+val('income'),cost=+val('cost'),cash=+val('cash');if(!income||cost<0){showToast('请填写收入和支出');return}let surplus=Math.max(0,income-cost),months=cost?Math.floor(cash/cost):0;result('现金流优先级','每月结余约 <strong>'+surplus+'</strong>，结余率约 <strong>'+Math.round(surplus/income*100)+'%</strong>。储蓄可覆盖约 <strong>'+months+'个月</strong>固定支出。<div class="tj-result-list"><div><b>第一步</b><span>'+(months<3?'先补足3—6个月应急金，暂缓高波动投入。':'把应急金与长期资金分开管理。')+'</span></div><div><b>第二步</b><span>'+(surplus/income<.2?'优先优化固定支出或增加稳定收入。':'为长期目标设定自动化储蓄比例。')+'</span></div></div>');return}
  if(type==='career'){let ready=val('ready'),goal=val('goal'),runway=val('runway');const cs=Math.round(scoreBase||60);
    let s=40+(ready==='已有技能和作品'?26:ready.includes('方向')?12:0)+(runway==='3个月以上'?10:runway.includes('1—3')?4:-4)+Math.round((cs-50)*0.3);
    s=Math.max(28,Math.min(94,s));
    const verdict=s>=75?'准备较充分，可以推进验证':s>=55?'方向可行，条件还要补一补':'先做低成本验证，别急着下注';
    const paths={'转行':['约3位目标行业的从业者深聊，核实你对这行的想象和现实的差距','用兼职、试单或作品集投递做一次真实验证','确认起步期的收入落差，在现金流承受范围内'],'副业':['先做一个最小可交付版本：一件样品、一次试服务或一页介绍','把第一单完整跑通，再考虑扩大投入','固定每周的副业时段，不让它侵蚀主业和休息'],'创业':['先验证需求：找到3个愿意付费或预定意向的真实客户','把启动成本压到最坏情况也能承受的水平','写下明确的止损线：亏到多少、拖到多久就停']};
    const steps=paths[goal]||paths['转行'];
    result('准备度评估 · '+goal,'<div class="tj-result-list"><div><b>判断</b><span>目标「'+goal+'」，准备程度「'+ready+'」，可承受准备期「'+runway+'」。'+verdict+'。</span></div><div><b>验证三步</b><span>'+steps.join('；')+'。</span></div><div><b>底线</b><span>'+(runway==='1个月以内'?'你的缓冲期很短，任何变动都先确保下月现金流有着落。':'保留现金流缓冲，不建议在没有退出方案时裸辞或重投入。')+'</span></div><div><b>命盘节奏参考</b><span>当前事业节奏评分 '+cs+'/100，'+(cs>=70?'节奏支持主动争取，但仍以验证为先。':'节奏偏蓄力，更适合小步试错而非大动作。')+'仅供节奏参考，现实条件优先。</span></div></div>',s+'<small>准备度</small>');return}
  if(type==='date'){result('事项准备方案','事项：<strong>'+val('event')+'</strong>，日期：<strong>'+val('date')+'</strong>。<div class="tj-result-list"><div><b>必须确认</b><span>时间、对象、金额或交付边界，以及不可逆后果。</span></div><div><b>行动建议</b><span>提前准备备选方案；若现实条件不成熟，先准备而不是强行执行。</span></div></div>');return}
  if(type==='style'){let scene=val('scene'),space=val('space');result('环境行动方案','场景：<strong>'+scene+'</strong>。优先使用 '+(wx.ys||'当前有利元素')+' 的小面积颜色提示。<div class="tj-result-list"><div><b>马上调整</b><span>'+(space==='杂乱、注意力分散'?'清空桌面，只保留当前任务相关物品。':space==='光线不足'?'先改善光线和屏幕高度，再谈摆件。':space==='久坐疲劳'?'设置每50分钟起身的提醒。':'保持现有环境，减少额外布置。')+'</span></div><div><b>原则</b><span>舒适、整洁、可持续，比复杂风水布置更重要。</span></div></div>');return}
  if(type==='layoff'){let signal=val('signal'),buffer=val('buffer'),ready=val('ready'),d=window._ctx||window._baziData||{},chartScore=Math.round(((+d.cs||60)+(+d.ws||60))/2);let urgent=signal.includes('明确')||signal.includes('收缩');let risk=(signal.includes('明确')?62:signal.includes('收缩')?48:signal.includes('调整')?28:12)+(buffer.includes('不足')?16:buffer.includes('3—6')?8:0)+(ready==='未准备'?12:ready==='部分准备'?6:0)+Math.round((70-chartScore)*.18);risk=Math.max(8,Math.min(92,risk));let level=risk>=65?'高风险':risk>=40?'需提前准备':'目前可观察';result(level,'公司信号：<strong>'+signal+'</strong>。现金流：<strong>'+buffer+'</strong>。<div class="tj-result-list"><div><b>命盘节奏参考</b><span>结合当前命盘的事业与财富节奏评分（'+chartScore+'分）校正风险提示；命盘只用于节奏参考，不替代现实证据。</span></div><div><b>48小时内</b><span>'+ (urgent?'更新简历、作品集，整理合同、绩效和项目成果。':'记录最近成果，保持简历随时可更新。')+'</span></div><div><b>本周行动</b><span>'+ (ready==='未准备'?'联系2位行业联系人，建立外部机会。':'投递或验证1个真实机会，不把准备停留在收藏岗位。')+'</span></div></div>',risk+'%');return}
  if(type==='daily'){let focus=val('focus'),energy=val('energy');result('今日只做一件事','今日重点：<strong>'+focus+'</strong>。当前状态：<strong>'+energy+'</strong>。<div class="tj-result-list"><div><b>最小行动</b><span>'+(energy==='疲惫或焦虑'?'先做20分钟低阻力版本，不追求完成全部。':'安排一段不被打断的25分钟时间。')+'</span></div><div><b>结束标准</b><span>完成一个可见的小结果，晚上用3分钟复盘。</span></div></div>');return}
  if(type==='name'){let s=val('surname')||'你的姓氏';
    // 用神字根（扩充），并按"用神 + 生用神"两层取字
    const ROOTS={木:['栩','棠','桐','蔚','桓','槿','柏','榆'],火:['昭','昕','晗','昱','暄','晔','焕','炜'],土:['安','屹','予','坤','岚','岳','培','均'],金:['知','钰','书','钦','铮','铭','鉴','铎'],水:['澄','泓','沅','涵','澈','汐','湛','洵']};
    const GEN={木:'水',火:'木',土:'火',金:'土',水:'金'}; // 生我者为辅助
    const primary=ROOTS[wx.ys]||['安','宁','知'];
    const aux=ROOTS[GEN[wx.ys]]||primary;
    const styleWish=(val('style')||'简洁现代')+(val('wish')?' · 希望传达"'+esc(val('wish'))+'"':'');
    // 组合：单字 / 双字（用神+辅助）交替，避免重复字
    const combos=[];
    for(let i=0;i<6&&combos.length<6;i++){
      if(i%2===0){const c=primary[i%primary.length];if(!combos.includes(esc(s+c)))combos.push(esc(s+c));}
      else{const c1=primary[(i+1)%primary.length],c2=aux[(i+3)%aux.length];if(c1!==c2)combos.push(esc(s+c1+c2));}
    }
    result('名称灵感','为「<strong>'+esc(s)+'</strong>」提供方向：<strong>'+styleWish+'</strong>。用神『'+esc(wx.ys||'土')+'』。'+
      '<div class="tj-result-list"><div><b>候选名字</b><span>'+combos.join('、')+'</span></div>'+
      '<div><b>取字逻辑</b><span>以用神『'+esc(wx.ys||'土')+'』属性字为主，辅以生助用神的『'+esc(GEN[wx.ys]||'')+'』属性字，双字名取两者搭配。</span></div>'+
      '<div><b>核验清单</b><span>读音顺口、字义稳妥、重名查询、方言谐音、家族避讳与正式登记规范，请逐项核对后再定。</span></div></div>'+
      '<div class="tj-disclaimer">起名灵感仅供方向参考，最终请以读音、字义和正式登记要求为准。</div>');return}
  if(type==='answerbook'){const q=val('question')||'我现在应该怎么做？',mode=val('mode')||'直接回答';const pools={
   '直接回答':['可以。先从最小、可逆的一步开始。','再等等，先把关键信息补齐。','答案不在猜测里，去问清楚、看事实。','暂时不要，保留选择比仓促承诺更重要。','可以尝试，但请先设好边界和截止时间。'],
   '行动提醒':['今天只做一个 20 分钟版本，不要求一次完成。','把问题拆成三步，先完成最容易验证的第一步。','去找一个真实的人或数据，给你的想法一次验证。','写下最坏情况和退出条件，再决定是否继续。','为这件事设一个具体截止时间，避免无限犹豫。'],
   '自我探索':['你真正担心的，是失败，还是别人如何评价？','如果不需要证明给任何人看，你还会选择它吗？','你已经知道答案的一部分，只是还没有允许自己承认。','这件事让你更接近想成为的人，还是更远？','先区分“我想要什么”和“我害怕失去什么”。']};const list=pools[mode]||pools['直接回答'];const answer=list[Math.floor(Math.random()*list.length)];const now=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});result('答案之书','问题：<strong>'+esc(q)+'</strong>。<div class="answer-book-card book-opening"><div class="answer-book-status">正在翻开答案之书 · 请专注你的问题</div><div class="answer-book-cover"><span>答案之书</span><small>THE BOOK OF ANSWERS</small></div><div class="answer-book-page"><div class="answer-book-mark">✦</div><div class="answer-book-mode">'+esc(mode)+' · '+now+'</div><div class="answer-book-answer">'+answer+'</div><div class="answer-book-note">把这句话当作一个新的视角，再结合事实、感受和实际条件做决定。重大决定仍请核对现实信息与专业意见。</div></div><div class="answer-book-actions"><button type="button" onclick="TJAnswerBookAgain()">↻ 再翻一页</button><button type="button" onclick="TJAnswerBookSave()">♡ 收藏这句</button></div></div>');const book=document.querySelector('.answer-book-card.book-opening');setTimeout(()=>book?.classList.add('book-opening-open'),520);setTimeout(()=>book?.classList.add('book-opening-reveal'),1250);return}
  if(type==='oracle'){let p=['先做最小的一步，再观察反馈。','信息未齐时，暂缓承诺更稳妥。','把期待说清楚，避免用猜测代替沟通。','保持节奏，答案会在行动中出现。'];result('三段式启示','问题：<strong>'+esc(val('question')||'你的问题')+'</strong>。<div class="tj-result-list"><div><b>当下</b><span>'+p[Math.floor(Math.random()*p.length)]+'</span></div><div><b>行动</b><span>'+p[Math.floor(Math.random()*p.length)]+'</span></div><div><b>提醒</b><span>'+p[Math.floor(Math.random()*p.length)]+'</span></div></div>');return}
  if(type==='lottery'){let playType=val('type'),n=+val('count')||1;
    const uniq=(count,max)=>{const a=[];while(a.length<count){const x=Math.floor(Math.random()*max)+1;if(!a.includes(x))a.push(x);}return a.sort((p,q)=>p-q);};
    const pad=x=>String(x).padStart(2,'0');
    const draws=[];
    for(let i=0;i<n;i++){
      if(playType.includes('大乐透')){draws.push('第'+(i+1)+'注　前区 '+uniq(5,35).map(pad).join(' ')+'　后区 '+uniq(2,12).map(pad).join(' '));}
      else{draws.push('第'+(i+1)+'注　红球 '+uniq(6,33).map(pad).join(' ')+'　蓝球 '+pad(Math.floor(Math.random()*16)+1));}
    }
    window._lastLottery={type:playType,text:draws.join('\n')};
    result('随机组合','玩法：<strong>'+playType+'</strong>（'+n+' 注）。<div class="tj-result-list">'+draws.map(t=>{const m=t.match(/^第(\d+)注\s*(.*)$/);return '<div><b>第 '+(m?m[1]:'—')+' 注</b><span>'+(m?m[2]:'')+'</span></div>';}).join('')+'</div><div class="tj-sign-actions"><button type="button" class="tj-sign-share" onclick="TJCopyLottery()">复制号码</button><button type="button" class="tj-sign-refresh" onclick="TJToolRun(\'lottery\')">↻ 换一组</button></div><div class="tj-disclaimer">号码为纯随机生成，不使用命盘，也不提高任何中奖概率。购彩请量力而行。</div>');return}
  if(type==='zodiac'){const self=d.b&&d.b.sx||'',other=val('other'),scene=val('scene');
    const SX=['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    const HE=[['鼠','牛'],['虎','猪'],['兔','狗'],['龙','鸡'],['蛇','猴'],['马','羊']];
    const CHONG=[['鼠','马'],['牛','羊'],['虎','猴'],['兔','鸡'],['龙','狗'],['蛇','猪']];
    const HAI=[['鼠','羊'],['牛','马'],['虎','蛇'],['兔','龙'],['猴','猪'],['鸡','狗']];
    const SAN=[['猴','鼠','龙'],['虎','马','狗'],['蛇','鸡','牛'],['猪','兔','羊']];
    const pair=(t,a,b)=>t.some(p=>(p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a));
    const tri=t=>t.some(g=>g.includes(a)&&g.includes(b));
    const a=self,b=other;
    let rel='平和',tone='',tag='',detail='',advice='';
    if(!self){rel='';detail='未检测到你本人的生肖（需要先完成推演）。先按通用相处原则给出建议。';advice='把分工、时间和期待说清楚，减少"你应该懂"的猜测。';}
    else if(a===b){rel='同属相';tone='var(--c-teal)';tag='同频双刃';detail='你们节奏和自我要求的来源相似，容易互相理解，也可能在同一个固执点上较劲。';advice='共鸣多，但别让"谁也不肯先让步"变成僵局；分歧时先定规则再谈对错。';}
    else if(pair(HE,a,b)){rel='六合';tone='var(--c-green)';tag='天然合拍';detail='在生肖关系中属于最合的一对，沟通成本低，容易快速建立信任与默契。';advice='适合尽快推进实质性合作或沟通；但别因为太顺就跳过边界和分工的确认。';}
    else if(pair(CHONG,a,b)){rel='六冲';tone='var(--c-red)';tag='节奏对冲';detail='处事节奏和方式差异明显，容易在小事上起摩擦，属于需要明确规则的配对。';advice='靠默契容易翻车，重要事项落到文字：分工、时间、验收标准；情绪上头时先搁置，别当场拍板。';}
    else if(pair(HAI,a,b)){rel='相害';tone='var(--c-orange)';tag='暗处损耗';detail='不易爆发大冲突，但容易在细节和期待上互相消耗，误解说不清。';advice='多确认、少猜测，把"我以为你懂了"换成复述核对；定期对齐期待。';}
    else if(tri(SAN)){rel='三合';tone='var(--c-green)';tag='同向协作';detail='属于同一五行局，目标和方向上容易站到一起，适合为共同目标分工。';advice='适合组队做项目；提前说好利益与责任分配，能走得更远。';}
    else{rel='平和';tone='var(--c-text-3)';tag='中性配对';detail='没有明显的合冲关系，属于中性配对，关系质量主要由现实相处决定。';advice='按正常节奏相处，观察对方的边界与沟通习惯即可，不必预设好坏。';}
    const sceneAdvice=scene==='亲密关系'?'把需求直接说出来，别用生肖给对方的反应下结论。':scene==='朋友合作'?'先小范围协作一次再谈深度绑定，观察可靠性。':'保持尊重和边界，生肖只是参考，不是定论。';
    result('相处提醒 · '+(rel||'通用'),'你：<strong>'+esc(self||'未排盘')+'</strong>，对方：<strong>'+esc(other)+'</strong>'+(rel?' · <span style="color:'+(tone||'')+'">'+rel+'</span>':'')+'。<div class="tj-result-list">'+(detail?'<div><b>关系判读</b><span>'+detail+'</span></div>':'')+'<div><b>沟通建议</b><span>'+advice+'</span></div><div><b>'+esc(scene)+'</b><span>'+sceneAdvice+'</span></div></div><div class="tj-disclaimer">生肖合冲仅为传统文化参考，不构成对任何关系的判断或决定依据。真正决定关系的是沟通、边界和共同目标。</div>',rel?tag:'');return}
  if(type==='relation'){
   const focus=val('focus'),bdate=val('bdate'),bhour=val('bhour');
   const scriptHtml='<div class="tj-result-list"><div><b>开场</b><span>“我想把这件事说清楚，不是为了争输赢，而是希望我们更好配合。”</span></div><div><b>表达</b><span>描述事实 → 说出感受 → 提出一个具体请求：'+esc(val('goal'))+'</span></div><div><b>边界</b><span>如果现在不适合沟通，约定一个明确的回看时间，而不是无限等待。</span></div></div>';
   if(!bdate){result('下一次沟通脚本','关系类型：<strong>'+esc(focus)+'</strong>。填写对方出生日期后，可在此基础上加入真实合盘比对。'+scriptHtml);return}
   const me=window._ctx||window._baziData;
   if(!me||!me.b){showToast('请先完成个人推演');return}
   const [py,pm,pd]=bdate.split('-').map(Number);
   if(!py||!pm||!pd){showToast('出生日期格式有误');return}
   const hourIdx=(!bhour||bhour.indexOf('不详')>=0)?null:'子丑寅卯辰巳午未申酉戌亥'.indexOf(bhour.charAt(0));
   let r;
   try{r=calcSynastry({myChart:me.b,myPillars:['Y','M','D','H'],myYongShen:me.wx.ys,partner:{y:py,m:pm,d:pd,hourZhi:(hourIdx===null||hourIdx<0)?null:hourIdx}});}
   catch(e){console.error('synastry failed',e);showToast('合盘计算失败，请检查输入');return}
   const pbc=r.partnerChart;
   const partnerGZ=r.partnerPillars.map(k=>pbc[k].g+pbc[k].z).join(' ');
   const myGZ=[me.b.Y,me.b.M,me.b.D,me.b.H].map(x=>x.g+x.z).join(' ');
   const lab=r.score>=80?'契合度高':r.score>=65?'整体顺畅':r.score>=50?'有合有冲':r.score>=35?'需要磨合':'差异明显';
   const dp=r.dayPair,dn=[];
   if(dp.same)dn.push('双方<strong>日柱相同</strong>，价值观与节奏高度接近，容易一拍即合，也容易同时陷入同一个盲区。');
   if(dp.heZhi)dn.push('<strong>日支六合</strong>——合婚中最被看重的一项，日常相处自然合拍。');
   if(dp.heGan)dn.push('<strong>日干相合</strong>，表达与决策方式容易同步。');
   if(dp.chongZhi)dn.push('<strong>日支相冲</strong>，夫妻宫直接对冲：不代表不合适，但生活习惯差别大，需要明确规则而非靠默契。');
   if(dp.chongGan)dn.push('<strong>日干相冲</strong>，容易在观点上针锋相对。');
   if(dp.haiZhi)dn.push('<strong>日支相害</strong>，易因小事累积不满，要有及时说开的习惯。');
   // 折叠分组：结论常驻，细节按需展开。
   // 原本 9 个小节平铺 1170px（约 1.4 屏），用户要一路滚才能看完。
   const grp=(id,title,sub,body,open)=>
     '<section class="syn-group'+(open?' open':'')+'" data-syn="'+id+'">'+
       '<button type="button" class="syn-group-hd" onclick="TJSynToggle(this)" aria-expanded="'+(open?'true':'false')+'">'+
         '<span class="syn-group-tt">'+title+'</span>'+
         (sub?'<span class="syn-group-sub">'+sub+'</span>':'')+
         '<span class="syn-group-arrow" aria-hidden="true"></span>'+
       '</button>'+
       // 必须包一层：grid-template-rows:0fr 只压第一行，
       // 多个直接子元素时会自动创建第二行，导致收不起来
       '<div class="syn-group-bd"><div class="syn-group-inner">'+body+'</div></div>'+
     '</section>';
   const rows=arr=>'<div class="tj-result-list">'+arr.map(x=>'<div><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join('')+'</div>';

   // —— 顶部结论：始终可见 ——
   // 外层 result() 已渲染「合盘结果 · 亲密关系 + 分数」标题条，
   // 这里不再重复分数，只给判语与统计，避免三层标题叠在一起。
   let H='<div class="syn-verdict">'+
     '<span class="syn-verdict-label" style="color:'+
       (r.score>=80?'var(--c-green)':r.score>=65?'var(--c-teal)':r.score>=50?'var(--c-yellow)':r.score>=35?'var(--c-orange)':'var(--c-red)')+
       '">'+lab+'</span>'+
     '<span class="syn-verdict-meta">'+r.counts.he+' 合 / '+r.counts.chong+' 冲'+
       (r.counts.other?' / '+r.counts.other+' 刑害':'')+' · '+(r.precision==='full'?'四柱':'三柱')+'</span>'+
   '</div>';

   // 一句话总述，让用户不展开也知道结论
   H+='<div class="syn-summary">'+r.dm.title+'　'+r.dm.desc+'</div>';

   // —— 分组 1：双方命盘（默认展开，是理解后续的基础）——
   H+=grp('chart','双方命盘',(r.precision==='day'?'对方时辰不详':''),
     '<div class="syn-charts"><div><span>你</span><b>'+myGZ+'</b></div>'+
     '<div><span>对方</span><b>'+partnerGZ+'</b></div></div>',true);

   // —— 分组 2：关键结论（默认展开）——
   const dn2=[];
   if(dp.same)dn2.push('双方<strong>日柱相同</strong>，价值观与节奏高度接近，容易一拍即合，也容易同时陷入同一个盲区。');
   if(dp.heZhi)dn2.push('<strong>日支六合</strong>——合婚中最被看重的一项，日常相处自然合拍。');
   if(dp.heGan)dn2.push('<strong>日干相合</strong>，表达与决策方式容易同步。');
   if(dp.chongZhi)dn2.push('<strong>日支相冲</strong>，夫妻宫直接对冲：不代表不合适，但生活习惯差别大，需要明确规则而非靠默契。');
   if(dp.chongGan)dn2.push('<strong>日干相冲</strong>，容易在观点上针锋相对。');
   if(dp.haiZhi)dn2.push('<strong>日支相害</strong>，易因小事累积不满，要有及时说开的习惯。');
   // 日主关系已在上方 syn-summary 呈现，组内不再重复
   let coreBody='';
   if(dn2.length)coreBody+=rows([['夫妻宫（日柱）',dn2.join('<br>')]]);
   coreBody+=rows([['五行互补 · 用神「'+r.comp.yongShen+'」',r.comp.text]]);
   coreBody+=rows([['日主关系',r.dm.myDayGan+' 见 '+r.dm.theirDayGan+'（'+r.dm.ss+'）']]);
   H+=grp('core','关键结论',(dn2.length?dn2.length+' 项':''),coreBody,true);

   // —— 分组 3：逐项依据（默认折叠，这是最长的一块）——
   let detail='';
   if(r.positives.length)detail+=rows([['相合之处',r.positives.slice(0,4).map(h=>'· '+h.text+'（'+h.where+'）').join('<br>')]]);
   if(r.frictions.length)detail+=rows([['需要留意',r.frictions.slice(0,4).map(h=>'· '+h.text+'（'+h.where+'）').join('<br>')]]);
   if(detail)H+=grp('detail','逐项依据',(r.positives.length+r.frictions.length)+' 条',detail,false);

   // —— 分组 4：沟通脚本（默认折叠）——
   H+=grp('script','下一次沟通怎么开口','3 步',scriptHtml,false);

   if(r.precision==='day')H+='<div class="tj-disclaimer">未填对方时辰，本次用年月日三柱比对。日柱（夫妻宫）不依赖时辰，仍为精确计算，核心结论成立；缺少的时柱主要影响子女宫与晚年节奏的判断。</div>';
   H+='<div class="tj-disclaimer">合盘用于理解彼此差异、找到沟通方式，不预测关系结局，也不构成是否开始或结束一段关系的建议。</div>';
    H+='<div class="tj-sign-actions"><button type="button" class="tj-sign-share" onclick="TJShareSyn()">生成合盘卡</button><button type="button" class="tj-sign-refresh" onclick="TJSynShare()">文字分享</button><button type="button" class="tj-sign-refresh" onclick="TJSynSave()">保存这个人</button></div>';
   window._lastSynastry={name:val('pname'),relation:focus,result:r,y:py,m:pm,d:pd,
     hourZhi:(hourIdx===null||hourIdx<0)?null:hourIdx,score:r.score};
   result('合盘结果 · '+esc(focus),H,r.score);return}
 }
 window.TJAnswerBookAgain=function(){run('answerbook')};
 window.TJAnswerBookSave=function(){const card=document.querySelector('.answer-book-card');if(!card)return;const text=card.querySelector('.answer-book-answer')?.textContent||'';try{const old=JSON.parse(localStorage.getItem('tj_answerbook_saved')||'[]');old.unshift({text,at:Date.now()});localStorage.setItem('tj_answerbook_saved',JSON.stringify(old.slice(0,20)));const b=card.querySelector('.answer-book-actions button:last-child');if(b){b.textContent='♥ 已收藏';b.disabled=true}}catch(e){showToast('暂时无法保存，请稍后再试')}};
 window.TJToolRun=run;
 window.openToolPage=function(type){const d=document.getElementById('toolModal'),out=document.getElementById('toolModalContent');if(!d||!out||!T[type])return;window._activeTool=type;out.innerHTML=base(type);d.classList.add('open');setTimeout(()=>out.querySelector('input,select,textarea')?.focus(),120)};
})();
}

/* TJToolRun 包装层 */
export function initToolRunWrap(){
(function(){
 const oldRun=window.TJToolRun;
 window.TJToolRun=function(type){
  if(type!=='oracle'){oldRun(type);return;}
  const out=document.getElementById('v3_result');if(!out)return;
  const q=(document.getElementById('v3_question')?.value||'').trim()||'你心中的问题';
  const area=document.getElementById('v3_area')?.value||'观音签';
  const SIGN_LIB = window.ORACLE_SIGNS || {};
  const lib = SIGN_LIB[area] || SIGN_LIB['观音签'] || [];
  const lot = lib.length ? lib[Math.floor(Math.random()*lib.length)] : null;
  const n = lot ? lot.n : (Math.floor(Math.random()*48)+1);
  const title = lot ? lot.name : '无名签';
  const grade = lot ? lot.grade : '中签';
  const poem = lot ? lot.poem : '';
  const yi = lot ? lot.yi : '';
  const jie = lot ? lot.jie : '';
  const dian = lot ? lot.dian : '';
  const qEsc = String(q).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const gradeClass = grade.indexOf('上')>-1 ? 'sg-up' : (grade.indexOf('下')>-1 ? 'sg-down' : 'sg-mid');
  const act = grade.indexOf('上')>-1
    ? '此签利进取，宜把握当下机缘、顺势而为，不必过疑。'
    : grade.indexOf('下')>-1
    ? '此签多阻滞，宜退守谨慎、先稳根基，待时运转圜再图。'
    : '此签宜守常渐进，按部就班、稳中求进，莫急莫怠。';
  out.innerHTML='<div class="tj-oracle-stage shake"><div class="tj-oracle-scene"><div class="tj-oracle-glow"></div><div class="tj-oracle-cup"></div><div class="tj-oracle-stick"></div><div class="tj-oracle-status">正在摇签 · 请专注你的问题</div></div></div><div class="tj-oracle-hint">'+area+' · 摇签中</div>';
  out.classList.add('show');out.scrollIntoView({behavior:'smooth',block:'nearest'});
  setTimeout(()=>{const stage=out.querySelector('.tj-oracle-stage');if(!stage)return;stage.classList.remove('shake');stage.classList.add('draw');stage.querySelector('.tj-oracle-status').textContent='签筒停下 · 正在抽取';},1450);
  setTimeout(()=>{const stage=out.querySelector('.tj-oracle-stage');if(!stage)return;stage.classList.remove('draw');stage.classList.add('reveal');stage.querySelector('.tj-oracle-status').textContent='签已出筒 · 第 '+n+' 签';},2700);
  setTimeout(()=>{
    out.innerHTML=''
      +'<div class="tj-result-head"><div class="tj-result-title">'+area+' · 第 '+n+' 签</div><div class="tj-score '+gradeClass+'">'+grade+'</div></div>'
      +'<div class="tj-result-body">'
      +'<div class="tj-oracle-name">『'+title+'』</div>'
      +'<div class="tj-oracle-poem">'+poem.replace(/\n/g,'<br>')+'</div>'
      +'<div class="tj-result-list">'
      +'<div><b>圣意</b><span>'+yi+'</span></div>'
      +'<div><b>解曰</b><span>'+jie+'</span></div>'
      +'<div><b>典故</b><span>'+dian+'</span></div>'
      +'<div><b>结合所问</b><span>你问：「'+qEsc+'」。以此签观之，'+act+'</span></div>'
      +'</div></div>'
      +'<div class="tj-sign-actions"><button type="button" class="tj-sign-share" onclick="TJShareOracle()">生成签文卡</button><button type="button" class="tj-sign-refresh" onclick="TJToolRun(\'oracle\')">↻ 再摇一签</button></div>'
      +'<div class="tj-disclaimer">签文为传统问卜之参详，用于自我反思与理顺思路；健康、法律、财务及关系等重大决定，请结合现实条件与专业意见，不以签文为定论。</div>';
    window._lastOracle={area,n,title,grade,poem,yi,jie,dian,q};
    out.classList.add('show');
  },3550);
 };
})();
}

/* 工具精进层：统一校验、历史记录、结果复制与风险提示 */
export function initToolRefineLayer(){
(function(){
 const KEY='tj_tool_history_v2';
 const esc=x=>String(x||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
 function save(type){const root=document.getElementById('toolModalContent');const title=root?.querySelector('.tj-tool-title')?.textContent||type;let a=read().filter(x=>x.type!==type);a.unshift({type,title:title.replace(/^\S+\s/,''),at:Date.now()});try{localStorage.setItem(KEY,JSON.stringify(a.slice(0,8)))}catch(e){}}
 function validate(type){const root=document.getElementById('toolModalContent');if(!root)return false;const fields=[...root.querySelectorAll('.tj-field input,.tj-field textarea')];for(const el of fields){if(el.type==='date'&&!el.value){if(el.dataset.optional==='1')continue;showToast('请先选择目标日期');el.focus();return false}if(el.tagName==='TEXTAREA'&&type!=='oracle'&&type!=='relation'&&type!=='answerbook'&&!el.value.trim()){showToast('请补充具体问题或限制条件');el.focus();return false}}if(type==='wealth'){const income=+document.getElementById('v3_income')?.value,cost=+document.getElementById('v3_cost')?.value;if(!income||cost<0||cost>income*10){showToast('请检查收入与支出数据');return false}}return true}
 function historyHtml(){const a=read();if(!a.length)return '';return '<div class="tj-history"><div class="tj-history-title">最近使用</div>'+a.slice(0,4).map(x=>'<div class="tj-history-item"><span>'+esc(x.title)+'</span><time>'+new Date(x.at).toLocaleDateString('zh-CN')+'</time></div>').join('')+'</div>'}
 function addMeta(type){const result=document.querySelector('#toolModalContent .tj-result');if(!result||result.querySelector('.tj-result-meta'))return;const meta=document.createElement('div');meta.className='tj-result-meta';meta.innerHTML='<span>已完成分析</span><span>结果仅供决策参考</span>';result.insertBefore(meta,result.firstChild);const hist=document.createElement('div');hist.innerHTML=historyHtml();result.appendChild(hist.firstElementChild||hist)}
 const oldRun=window.TJToolRun;
 window.TJToolRun=function(type){if(!validate(type))return;save(type);if(oldRun)oldRun(type);[120,500,1200,3800].forEach(ms=>setTimeout(()=>addMeta(type),ms));};
 const oldOpen=window.openToolPage;
 window.openToolPage=function(type){if(oldOpen)oldOpen(type);setTimeout(()=>{const root=document.getElementById('toolModalContent');if(root&&!root.querySelector('.tj-history')){const h=document.createElement('div');h.className='tj-history';h.innerHTML=historyHtml();root.querySelector('.tj-tool-v3')?.appendChild(h)}} ,100)};
 document.addEventListener('click',e=>{const b=e.target.closest('.tj-result-actions .primary');if(!b)return;const r=document.querySelector('#toolModalContent .tj-result');if(!r)return;const text=r.innerText||'';navigator.clipboard?.writeText(text).then(()=>{const old=b.textContent;b.textContent='已复制结果';setTimeout(()=>b.textContent=old,1400)}).catch(()=>showToast('复制失败，请手动选择结果文本'))});
})();
}

/* 财运工具改版：移除金额输入 */
export function initWealthToolRevamp(){
(function(){
 const oldOpen=window.openToolPage;
 window.TJWealthNoAmount=function(){
  const out=document.getElementById('toolModalContent');if(!out)return;
  out.innerHTML='<div class="tj-tool-v3"><div class="tj-tool-intro"><div class="tj-tool-kicker">财富与事业 · 问问大师工具</div><div class="tj-tool-title">◉ 财运与理财罗盘</div><div class="tj-tool-desc">不要求填写收入金额，改从现金流节奏、财富目标和风险承受度，生成更容易执行的理财方向。</div></div><div class="tj-fields"><div class="tj-field"><label>目前现金流状态</label><select id="v3_w_cash"><option>稳定，有固定结余</option><option>基本稳定，但结余不多</option><option>收入波动较大</option><option>支出压力较大</option></select></div><div class="tj-field"><label>当前财富目标</label><select id="v3_w_goal"><option>建立安全垫</option><option>稳定增收</option><option>长期积累</option><option>准备重大支出</option></select></div><div class="tj-field"><label>风险承受度</label><select id="v3_w_risk"><option>偏稳健，不希望明显波动</option><option>可以接受适度波动</option><option>愿意承担较高波动</option></select></div><div class="tj-field"><label>近期最困扰的事</label><select id="v3_w_issue"><option>容易冲动消费</option><option>不知道如何分配结余</option><option>想增加收入来源</option><option>担心未来不确定性</option></select></div></div><button class="tj-submit" type="button" onclick="TJWealthRunNoAmount()">生成财富方案</button><div class="tj-result" id="v3_result"></div><div class="tj-disclaimer">本工具不提供投资金额、收益率或具体产品推荐，仅帮助整理财富节奏。</div></div>';
  const sheet=document.querySelector('#toolModal .tool-sheet');if(sheet)sheet.classList.remove('result-open');
  document.getElementById('toolModal').classList.add('open');
 }
 window.TJWealthRunNoAmount=function(){
  const d=window._ctx||window._baziData||{},wx=d.wx||{};const cash=document.getElementById('v3_w_cash').value,goal=document.getElementById('v3_w_goal').value,risk=document.getElementById('v3_w_risk').value,issue=document.getElementById('v3_w_issue').value;
  // 现金流分层判断：这是方案的第一依据，命盘只作节奏参考
  const tier=cash.includes('压力')?'tight':cash.includes('波动')?'unstable':'steady';
  const tierVerdict={tight:'当前现金流偏紧，任何安排都以"先稳住"为前提，不建议新增投入。',unstable:'收入有波动时，先把不稳定部分当作浮动收入，不当作固定预算。',steady:'现金流有结余，可以把一部分转为定期动作，而不是留在活期里被消耗。'}[tier];
  const first=tier==='tight'?'先减压：暂停非必要大额支出，列出固定支出清单，找出前三项可延后的。':tier==='unstable'?'先稳流：为波动收入单独建缓冲，至少覆盖一个月固定支出，再谈分配。':'先分层：把结余分成日常、应急、长期三笔，分别放在不同位置。';
  const second=goal==='建立安全垫'?'在应急金补足前（3—6个月固定支出），其他目标全部往后排。':goal==='稳定增收'?'优先提升可重复的收入来源（技能、客户、产品线），不追逐一次性机会。':goal==='准备重大支出'?'先定时间表和金额上限，配一个可退出的备用方案，再安排支出节奏。':'用长期、分散、可持续的方式积累，设定固定扣款，减少频繁决策。';
  const third=risk.includes('较高')?'先写下自己能承受的最大回撤和等待时长，超出这个范围的一律不碰。':risk.includes('适度')?'分层执行：大头稳健保值，小头用于学习和试错，比例固定不临时加码。':'以流动性和本金安全为先；任何承诺"确定高收益"的，直接排除。';
  const issueFix={'容易冲动消费':'设一个48小时冷静期：想买的先放进清单，两天后再看还想要几样。','不知道如何分配结余':'先按固定比例分账（如应急/长期/机动），比例定好后每月重复即可。','想增加收入来源':'从现有技能出发列出3个可验证的增收方向，本月只验证其中一个。','担心未来不确定性':'把担心写成具体清单，逐项标注"可控/不可控"，只对可控项安排动作。'}[issue]||'完成一次支出分类，找到最大的优化点。';
  // 本周节奏：用流日引擎的当日基调给节奏提示（不预测财运）
  let weekAct='按固定节奏推进财务动作，不因单日情绪改变计划。';
  try{
    if(d.b&&wx.ys){const lr=calcLiuRi(d.b,wx.ys);
      weekAct=lr.tone==='flow'?'本周推进阻力小，适合把账目整理、转存这类事项一次办完。':lr.tone==='steady'?'本周按计划处理财务事项即可，不必临时加码。':lr.tone==='friction'?'本周容易有临时变动，大额操作缓一缓，先核对信息。':'本周宜收不宜动，财务决定往后放几天更稳。';}
  }catch(e){}
  const scoreTip=typeof d.ws==='number'?(d.ws>=70?'当前命盘节奏对积累相对有利，但仍以现实现金流为准。':d.ws>=50?'当前命盘节奏中性，重点在执行纪律而非择时。':'当前命盘节奏偏守，减少动作、守住本金优先。'):'';
  const result=document.getElementById('v3_result');result.innerHTML='<div class="tj-result-head"><div class="tj-result-title">财富节奏方案</div><div class="tj-score">'+(d.ws||'—')+'</div></div><div class="tj-result-body"><div class="tj-result-list"><div><b>现状判断</b><span>'+tierVerdict+'</span></div><div><b>第一优先级</b><span>'+first+'</span></div><div><b>目标路径 · '+goal+'</b><span>'+second+'</span></div><div><b>风险边界</b><span>'+third+'</span></div><div><b>应对困扰 · '+issue+'</b><span>'+issueFix+'</span></div><div><b>本周节奏</b><span>'+weekAct+'</span></div>'+(scoreTip?'<div><b>命盘节奏参考</b><span>财富节奏评分 '+(d.ws||'—')+'/100。'+scoreTip+'命理仅作节奏参考，不构成投资建议。</span></div>':'')+'</div></div><div class="tj-disclaimer">本工具用于整理财务节奏与行动优先级，不提供投资金额、收益率或产品推荐。</div>';result.classList.add('show');
 }
 window.openToolPage=function(type){if(oldOpen)oldOpen(type);if(type==='wealth')setTimeout(TJWealthNoAmount,40)};
})();
}

/* 今日日签改版：打开即生成 */
export function initDailySignRevamp(){
(function(){
 const oldOpen=window.openToolPage;
 window.TJDailyRun=function(){
  const d=window._ctx||window._baziData||{},wx=d.wx||{},out=document.getElementById('v3_result');if(!out)return;
  const focus=wx.ys==='木'?'启动与拓展':wx.ys==='火'?'表达与推进':wx.ys==='土'?'整理与稳固':wx.ys==='金'?'取舍与执行':'流动与复盘';
  const text=wx.ys==='木'?'适合开始一件新事，先行动再优化。':wx.ys==='火'?'适合表达观点、推进沟通，但避免情绪化决定。':wx.ys==='土'?'适合整理计划、收纳环境，把基础打稳。':wx.ys==='金'?'适合处理重点任务、明确边界和做减法。':'适合复盘、调整节奏，让事情保持流动。';
  out.innerHTML='<div class="tj-result-head"><div class="tj-result-title">今日日签</div><div class="tj-score">'+(d.wx?.ys||'—')+'</div></div><div class="tj-result-body"><div class="tj-result-list"><div><b>今日主线</b><span>'+focus+'</span></div><div><b>宜</b><span>'+text+'</span></div><div><b>忌</b><span>避免同时处理太多目标，不在疲惫或焦虑时做重大决定。</span></div><div><b>今日行动</b><span>选一件最重要的小事，安排一段不被打断的时间完成它。</span></div></div></div><div class="tj-disclaimer">日签用于整理当日节奏，不替代现实判断。</div>';out.classList.add('show');out.closest('.tj-tool-v3').classList.add('result-mode');document.querySelector('#toolModal .tool-sheet')?.classList.add('result-open');
 };
 window.openToolPage=function(type){if(oldOpen)oldOpen(type);if(type==='daily')setTimeout(()=>{const root=document.getElementById('toolModalContent');if(!root)return;root.innerHTML='<div class="tj-tool-v3"><div class="tj-tool-intro"><div class="tj-tool-kicker">日常决策 · 问问大师工具</div><div class="tj-tool-title">☼ 今日日签</div><div class="tj-tool-desc">打开即可生成今日综合日签，不需要选择任何选项。</div></div><button class="tj-submit" type="button" onclick="TJDailyRun()">生成今日日签</button><div class="tj-result" id="v3_result"></div><div class="tj-disclaimer">日签仅用于自我提醒与节奏整理。</div></div>';},40)};
})();
}

/* 今日日签增强：原生分享 / 复制兜底 */
export function initDailySignShare(){
(function(){
 function share(){const r=document.getElementById('v3_result');const text='问问大师今日日签\n'+(r?.innerText||'');if(navigator.share){navigator.share({title:'问问大师今日日签',text}).catch(()=>{})}else if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>showToast('今日日签已复制，可分享给朋友'))}else showToast(text)}
 window.shareDailySign=share;
 const old=window.TJDailyRun;
 window.TJDailyRun=function(){
  if(old)old();
  setTimeout(()=>{const out=document.getElementById('v3_result');if(!out)return;out.classList.add('daily-sign-result');const d=window._ctx||window._baziData||{},wx=d.wx||{};const fav=wx.ys||'土';const title=fav==='木'?'今天适合打开局面':fav==='火'?'今天适合主动表达':fav==='金'?'今天适合做减法':fav==='水'?'今天适合调整节奏':'今天适合稳住基本盘';const extra='<div class="tj-result-list"><div><b>行动与协作</b><span>'+ (fav==='木'?'适合启动新项目、提出方案，先做出第一版。':fav==='火'?'适合汇报、谈判和推进卡住的事项，表达要直接但留余地。':fav==='金'?'适合清理待办、明确边界和结束低效沟通。':fav==='水'?'适合复盘信息、补足准备，不宜被外界节奏牵着走。':'适合整理流程、稳步交付，把基础工作做扎实。')+'</span></div><div><b>行动与协作</b><span>优先推进一件重要工作；沟通时先说事实，再说感受与请求，把分工和期待讲清楚。</span></div><div><b>状态与提醒</b><span>安排一次走动和补水，晚上减少屏幕；重要决定先复核，避免在疲惫或情绪高点拍板。</span></div></div><div class="tj-sign-actions"><button class="tj-sign-share" type="button" onclick="shareDailySign()">↗ 分享日签</button><button class="tj-sign-refresh" type="button" onclick="TJDailyRun()">↻ 重新生成</button></div>';if(!out.innerHTML.includes('工作与事业'))out.querySelector('.tj-result-body')?.insertAdjacentHTML('beforeend',extra)},80)
 };
})();
}

/* TJDailyRun 实时日签生成 */
export function initDailyRun(){
(function(){
 window.TJDailyRun=function(){
  const d=window._ctx||window._baziData;
  const out=document.getElementById('v3_result');
  if(!out)return;
  if(!d||!d.b){showToast('请先完成个人推演');return}

  const r=calcLiuRi(d.b,(d.wx&&d.wx.ys)||'土');
  const c=buildDailyCopy(r);
  const focusEl=document.getElementById('v3_focus');
  const focus=focusEl?focusEl.value:'';

  const toneColor=r.tone==='flow'?'var(--c-green)':r.tone==='steady'?'var(--c-teal)'
                 :r.tone==='friction'?'var(--c-orange)':'var(--c-text-3)';

  let H='<div class="tj-result-head"><div><div class="tj-result-title">'+c.headline+'</div>'+
        '<div class="tj-daily-meta">'+r.day.gz+'日 · '+c.role+' · '+c.domain+'</div></div>'+
        '<div class="tj-score" style="color:'+toneColor+'">'+c.label+'</div></div>';

  H+='<div class="tj-result-body"><div class="tj-result-list">';
  c.sections.forEach(x=>{H+='<div><b>'+x.k+'</b><span>'+x.v+'</span></div>'});
  if(focus)H+='<div><b>你选的重点：'+focus+'</b><span>'+
    (r.tone==='rest'||r.tone==='friction'
      ? '今天阻力偏大，把它拆成一个 20 分钟就能完成的版本，先动起来即可。'
      : '今天状态支持这件事，安排一段不被打断的时间集中处理。')+'</span></div>';
  H+='</div></div>';

  H+='<div class="tj-sign-actions"><button class="tj-sign-share" type="button" onclick="TJShareRiQian()">生成日签卡</button>'+
     '<button class="tj-sign-refresh" type="button" onclick="shareDailySign()">文字分享</button>'+
     '<button class="tj-sign-refresh" type="button" onclick="closeToolPage()">完成</button></div>';
  H+='<div class="tj-disclaimer">依据当日干支与你的命盘关系生成，同一天内容固定，用于整理节奏，不预测吉凶，也不替代现实判断。</div>';

  out.innerHTML=H;
  out.classList.add('daily-sign-result','show');
  out.closest('.tj-tool-v3')?.classList.add('result-mode');
  document.querySelector('#toolModal .tool-sheet')?.classList.add('result-open');
 };
})();
}

/* 能量穿搭与工位风水 v2 */
export function initStyleToolV2(){
(function(){
  const old=window.TJToolRun;
  const PALETTE={木:{主:'青绿、墨绿',辅:'米白、原木色',点缀:'少量湖蓝',饰:'木质或布艺小物'},火:{主:'朱红、珊瑚',辅:'暖米、杏色',点缀:'金色配件',饰:'红绳、暖光小物'},土:{主:'米色、暖黄、咖色',辅:'乳白',点缀:'陶土色',饰:'陶瓷、编织材质'},金:{主:'白色、银灰、香槟',辅:'浅灰',点缀:'金属线条',饰:'金属腕表、钢笔'},水:{主:'深蓝、雾蓝、墨黑',辅:'浅灰蓝',点缀:'透明材质',饰:'玻璃、水晶小物'}};
  const ADVICE={'重要沟通':'整体柔和、低攻击性：用主色大面积，点缀色只出现在一个细节（领带、胸针、丝巾），让对方注意力在内容不在衣服上。','面试汇报':'正式感优先：辅助色打底，主色作一件单品，显得稳重又有记忆点；避免全身高饱和。','专注工作':'颜色越少越好：中性色为主，主色只在视线边缘出现（杯子、桌垫），减少注意力拉扯。','休息恢复':'暖调低照度：辅助色+点缀色，避开正红正黑这类强刺激，材质以柔软为主。'};
  window.TJToolRun=function(type){if(type!=='style'){if(old)old(type);return}const d=window._ctx||window._baziData||{},wx=d.wx||{};const p=PALETTE[wx.ys]||PALETTE['土'];const scene=document.getElementById('v3_scene')?.value||'当前场景',space=document.getElementById('v3_space')?.value||'当前环境',out=document.getElementById('v3_result');if(!out)return;
    const spaceFix=space.includes('杂乱')?'清空桌面，只留当前任务相关物品；给每样东西定一个固定位置，用完归位。':space.includes('光线')?'优先改善光线和屏幕高度：屏幕顶与视线平齐，补一盏暖光台灯，再谈摆件。':space.includes('久坐')?'每50分钟起身两分钟，把水杯放远一点强制走动；调整座椅支撑腰部。':'现有环境保持简洁即可，减少新增物品，避免变成新的干扰源。';
    out.innerHTML='<div class="tj-result-head"><div class="tj-result-title">能量穿搭与工位方案</div><div class="tj-score">'+(wx.ys||'土')+'</div></div><div class="tj-result-body"><div class="tj-result-list"><div><b>配色方案</b><span>主：'+p.主+' · 辅：'+p.辅+' · 点缀：'+p.点缀+'</span></div><div><b>'+scene+'怎么穿</b><span>'+(ADVICE[scene]||'选择低饱和、舒适且容易长期使用的颜色，不必大面积铺陈。')+'</span></div><div><b>工位第一步</b><span>'+spaceFix+'</span></div><div><b>随身小物</b><span>'+p.饰+'——小面积出现即可，作用在心理暗示，不在堆砌。</span></div></div></div><div class="tj-disclaimer">颜色与环境建议用于状态提醒，舒适、整洁和可持续使用优先，不需要购买任何"风水摆件"。</div>';out.classList.add('show')};
})();
}

/* 工具中心最终版：问题入口与快捷筛选 */
export function initToolCenterFinal(){
(function(){
 function enhance(){
  const hub=document.querySelector('#s-adv .tool-hub'),bar=document.getElementById('toolsToolbar');
  if(!hub||!bar)return;
 }
 const obs=new MutationObserver(enhance);obs.observe(document.body,{childList:true,subtree:true});
 enhance();
})();
}

/* 择日助手改版：自动候选日期 */
export function initDateToolRevamp(){
(function(){
  const oldOpen=window.openToolPage;
  function fmt(d){return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'}
  function renderDateTool(){
    const modal=document.getElementById('toolModal'),root=document.getElementById('toolModalContent');if(!root||!modal)return;
    modal.classList.add('open');
    root.innerHTML='<div class="tj-tool-v3 tj-date-auto"><div class="tj-tool-intro"><div class="tj-tool-kicker">日常决策 · 问问大师工具</div><div class="tj-tool-title">◇ 重要事项择日助手</div><div class="tj-tool-desc">结合你的命盘节奏与近期日期，筛选更适合推进重要事项的时间。你只需要告诉我事项类型。</div></div><div class="tj-fields"><div class="tj-field"><label>准备安排什么事项</label><select id="v3_event"><option>签约合作</option><option>面试入职</option><option>发布项目</option><option>搬家出行</option><option>关系沟通</option><option>启动新计划</option></select></div><div class="tj-field"><label>希望安排在</label><select id="v3_range"><option>未来7天</option><option>未来14天</option><option>未来30天</option></select></div></div><button class="tj-submit" type="button" onclick="TJDateRunAuto()">开始推算合适日期</button><div class="tj-result" id="v3_result"></div><div class="tj-disclaimer">结果用于安排节奏与准备重点，不替代天气、交通、合同及其他现实条件判断。</div></div>';
  }
  window.TJDateRunAuto=function(){
    const event=document.getElementById('v3_event')?.value||'重要事项';
    const days=+(document.getElementById('v3_range')?.value.match(/\d+/)?.[0]||7);
    const ctx=window._ctx||window._baziData||{},wx=ctx.wx||{};
    if(!ctx||!ctx.b){showToast('请先完成个人推演，再为你本人挑选日期');return;}
    const ys=wx.ys||'土';
    // 事项类型 → 更适合的当日十神领域（由流日引擎逐日计算，无随机数）
    const EVENT_ROLE={'签约合作':['正官','正财','偏财'],'面试入职':['正官','正印'],'发布项目':['食神','伤官','偏财'],'搬家出行':['偏财','比肩'],'关系沟通':['正印','食神'],'启动新计划':['比肩','偏财','正财']};
    const want=EVENT_ROLE[event]||[];
    const TONE_LABEL={flow:'顺势',steady:'平稳',friction:'有阻力',rest:'宜收'};
    const WD=['日','一','二','三','四','五','六'];
    const candidates=[];
    for(let i=1;i<=days;i++){
      const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+i);
      const r=calcLiuRi(ctx.b,ys,d);
      let score=r.energy+(want.includes(r.role)?8:0);
      if(r.chong.length)score-=6;            // 当日冲命盘某柱，扣减
      if(r.tone==='rest')score-=4;           // 宜收的日子不适合推大事
      candidates.push({d,r,score:Math.max(5,Math.min(98,Math.round(score)))});
    }
    candidates.sort((a,b)=>b.score-a.score);
    const top=candidates.slice(0,3);
    const notes={'签约合作':'适合确认边界、责任与交付节点','面试入职':'适合展示准备成果并主动沟通','发布项目':'适合公开推进，让成果获得反馈','搬家出行':'优先核对交通、天气和物品清单','关系沟通':'适合在情绪稳定时把需求说清楚','启动新计划':'适合先完成一个可见的第一步'};
    const rows=top.map((x,i)=>'<div class="tj-date-choice'+(i===0?' best':'')+'"><div><b>'+fmt(x.d)+'</b><span>星期'+WD[x.d.getDay()]+' · '+x.r.day.gz+'日 · '+TONE_LABEL[x.r.tone]+'</span></div><strong>'+x.score+'<small>适配度</small></strong><p>'+(i===0?'首选：':'备选：')+notes[event]+'。当天'+x.r.roleInfo.domain+'</p></div>').join('');
    const out=document.getElementById('v3_result');out.innerHTML='<div class="tj-result-head"><div class="tj-result-title">为「'+event+'」推荐的日期</div><div class="tj-score">'+(wx.ys||'—')+'</div></div><div class="tj-result-body"><div class="tj-date-list">'+rows+'</div><div class="tj-date-note">推算依据：逐日计算当日干支与你命盘的契合度（能量分、十神领域与冲合），无随机数。最终请再核对对方时间、天气、交通和实际截止日期。</div></div>';out.classList.add('show');
  };
  window.openToolPage=function(type){if(type==='date'){setTimeout(renderDateTool,40);return}if(oldOpen)oldOpen(type)};
})();
}
