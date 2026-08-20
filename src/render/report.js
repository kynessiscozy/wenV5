import { CURR_YEAR, TG, DZ, WX, GW, ZW, ZC, WC, SS } from '../engines/shared.js';
import { resolveBirthDateTime } from '../engines/calendar.js';
import { mkBazi, mkWx, mkSs, getShenShaLabels, getTodayGZ } from '../engines/bazi.js';
import { TJ } from '../state/tj.js';
import { getCtx } from '../state/context.js';
import { getResultStyle } from '../state/result-style.js';
import { buildContext } from '../state/context.js';
import { getLayoffAstroRisk } from '../ai/risk.js';
import { showToast } from '../ui/toast.js';
import { calcSynastry } from '../engines/synastry.js';
import { calcLiuRi, calcLiuZhou, TONE_COPY } from '../engines/liuri.js';
import { calcPattern } from '../state/scoring.js';

export function getPersona(dg,wx,st,ss){const P={甲:{思维:'目标导向，擅长搭建框架',情绪:'直来直去，不喜绕弯',人际:'领袖型，易成核心',决策:'果断，但易武断',压力:'目标未达成时焦躁'},乙:{思维:'灵活变通，善于借力',情绪:'细腻敏感，易内耗',人际:'润滑剂型，人缘好',决策:'犹豫但周全',压力:'被否定、被忽视时低落'},丙:{思维:'发散创意，喜新厌旧',情绪:'来得快去得快',人际:'阳光型，感染力强',决策:'凭直觉，敢赌',压力:'无聊、被束缚时崩溃'},丁:{思维:'深度钻研，追根究底',情绪:'内敛深沉，积压型',人际:'少而精，重质量',决策:'谨慎，谋定后动',压力:'不确定性、失控感'},戊:{思维:'务实落地，重可行性',情绪:'稳定迟缓，不易波动',人际:'可靠型，但略显沉闷',决策:'保守，厌恶风险',压力:'变动频繁、计划被打乱'},己:{思维:'调和矛盾，八面玲珑',情绪:'隐忍包容，自我消化',人际:'老好人，边界模糊',决策:'折中，和稀泥',压力:'冲突场面、被当工具人'},庚:{思维:'逻辑清晰，黑白分明',情绪:'刚硬直接，易冲突',人际:'义气型，兄弟多',决策:'快刀斩乱麻',压力:'不公平、被算计时暴怒'},辛:{思维:'精致挑剔，追求细节',情绪:'含蓄压抑，表面冷静',人际:'高冷型，慢热',决策:'反复比较，宁缺毋滥',压力:'粗制滥造、审美被毁'},壬:{思维:'宏观视野，系统思考',情绪:'随境而转，适应力强',人际:'广泛交际，三教九流',决策:'顺势而为，灵活调整',压力:'被困住、重复枯燥时抑郁'},癸:{思维:'洞察人心，直觉敏锐',情绪:'深沉暗涌，不易外露',人际:'倾听者型，易成知己',决策:'凭感觉，重视精神契合',压力:'被误解、精神孤立时低落'}};const base=P[dg]||P['甲'];const mode=st?'（偏主动型）':'（偏内敛型）';return{思维:base.思维+mode,情绪:base.情绪,人际:base.人际,决策:base.决策,压力:base.压力};}
export function getTimeline(dy,by,wx,b,dg,gen,age){
  const ys=wx.ys,xs=wx.xs,KEys=wx.KE[ys],dw=wx.dw,yearZi=b.Y.zi;
  function scoreOne(g,z){
    let sc=55;const gw=GW[g],zw=ZW[z],ss=SS[dg][g];
    if(gw===ys)sc+=18;else if(gw===xs)sc+=12;else if(gw===KEys)sc-=12;else if(gw===dw)sc+=(wx.st?-5:8);
    if(zw===ys)sc+=15;else if(zw===xs)sc+=10;else if(zw===KEys)sc-=10;else if(zw===dw)sc+=(wx.st?-3:6);
    if(ss==='正官'||ss==='正印')sc+=5;
    if(ss==='正财')sc+=(wx.st?6:-3);
    if(ss==='偏财')sc+=(wx.st?5:-2);
    if(ss==='七杀')sc+=(wx.st?4:-6);
    if(ss==='伤官')sc+=(wx.st?6:-4);
    if(ss==='食神')sc+=3;
    if(ss==='偏印')sc+=(wx.st?-2:4);
    return Math.max(25,Math.min(95,Math.round(sc)));
  }
  return dy.ds.map((d,idx)=>{
    const gSS=SS[dg][d.g],gwx=GW[d.g],zwx=ZW[d.z],sc=scoreOne(d.g,d.z);
    const active=age>=d.as&&age<=d.ae,past=age>d.ae,future=age<d.as;
    const stage=d.as<20?'青春期':d.as<30?'立业期':d.as<40?'冲刺期':d.as<50?'丰盛期':d.as<60?'转型期':d.as<70?'成熟期':'晚晴期';
    let theme='过渡周期',ico='比',tcol='var(--c-yellow)';
    if(gSS==='正财'){theme='稳健聚财周期';ico='¥';tcol='var(--c-orange)';}
    else if(gSS==='偏财'){theme='机会财富周期';ico='¥';tcol='var(--c-orange)';}
    else if(gSS==='正官'){theme='仕途权位周期';ico='官';tcol='var(--c-yellow)';}
    else if(gSS==='七杀'){theme='挑战拼搏周期';ico='杀';tcol='var(--c-red)';}
    else if(gSS==='正印'){theme='贵人学养周期';ico='印';tcol='var(--c-teal)';}
    else if(gSS==='偏印'){theme='玄学独修周期';ico='枭';tcol='var(--c-purple)';}
    else if(gSS==='食神'){theme='才华享受周期';ico='食';tcol='var(--c-green)';}
    else if(gSS==='伤官'){theme='叛逆突破周期';ico='伤';tcol='var(--c-yellow)';}
    else if(gSS==='比肩'){theme='同行合作周期';ico='比';tcol='var(--c-teal)';}
    else if(gSS==='劫财'){theme='竞争分利周期';ico='杀';tcol='var(--c-red)';}
    const career=gSS.includes('官')?'职位易动，宜主动争取上升或带团队':gSS.includes('财')?'适合谈待遇、跑项目、跨界变现':gSS.includes('印')?'适合进修、考证、回归专业深耕':gSS==='食神'?'用作品/内容打开知名度的好时机':gSS==='伤官'?'易与上级摩擦，宜独立或自媒体':gSS==='比肩'?'人脉资源丰富，合伙优于单干':'稳守为主，少做颠覆性决策';
    const money=(gwx===ys||zwx===ys)?'用神入运，财源稳健':(gwx===KEys||zwx===KEys)?'忌神当道，宜守不宜攻、远离杠杆':gSS.includes('财')?'财星显现，正/偏财机会增多':gSS==='劫财'?'破财之运，谨防担保与朋友借贷':'平稳，无大起大落';
    const love=gSS==='劫财'?'同性竞争多，感情易有第三者':gen==='male'&&gSS.includes('财')?'妻星到位，未婚利结合':gen==='female'&&gSS.includes('官')?'夫星显现，感情有结果':gSS==='伤官'?'情绪起伏大，注意言辞':(zwx===dw||gwx===dw)?'比劫旺，桃花虽多易竞争':'感情平稳，宜深度经营';
    const health=(zwx===wx.w)?'最弱五行得补，体质转佳':(zwx===wx.s)?'最旺五行更旺，注意对应脏腑':(gwx===KEys&&zwx===KEys)?'气场不畅，宜规律作息+静修':'体能尚可，保持运动即可';
    const milestones=[];
    for(let yr=d.ys;yr<=d.ye;yr++){
      const zi=((yr-4)%12+12)%12,gi=((yr-4)%10+10)%10;
      if(zi===yearZi)milestones.push({y:yr,t:'本命年',age:d.as+(yr-d.ys),k:'mz'});
      if(GW[TG[gi]]===ys&&!milestones.find(m=>m.y===yr))milestones.push({y:yr,t:'用神流年',age:d.as+(yr-d.ys),k:'ys'});
    }
    return{idx,g:d.g,z:d.z,gz:d.g+d.z,as:d.as,ae:d.ae,ys:d.ys,ye:d.ye,gSS,gwx,zwx,sc,stage,theme,ico,tcol,career,money,love,health,milestones,active,past,future};
  });
}
export function getMonthlyAlert(b,wx){const now=new Date();const m=now.getMonth();const mm=['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'][m];const mw=ZW[mm];const ke={木:'金',火:'水',土:'木',金:'火',水:'土'};let msg='';if(ke[wx.dw]===mw)msg='本月官杀气旺，注意情绪管理和职场压力，避免冲动决定。';else if(wx.ys===mw)msg='本月用神当令，能量充沛，适合推进重要计划与谈判。';else if(wx.SH[wx.dw]===mw)msg='本月食伤吐秀，创意与表达力增强，利输出与社交。';else if(wx.BS[wx.dw]===mw)msg='本月印星生身，适合学习、休息与向内沉淀。';else msg='本月气场平和，按部就班即可，宜整理与复盘。';const risks=[];if(wx.c['火']>2.5&&wx.dw!=='火')risks.push('注意心火旺盛，避免急躁');if(wx.c['水']>2.5&&wx.dw!=='水')risks.push('思绪过杂，宜简化目标');if(wx.st&&wx.c[wx.ys]<0.8)risks.push('用神被泄，精力不济');if(!wx.st&&wx.c[wx.BS[wx.dw]]>2)risks.push('印星过重，容易拖延');return{msg,risks};}
export function getRiskWarning(b,wx,lnSS,dySS){const r=[];if(lnSS.includes('官杀'))r.push({t:'情绪波动',d:'官杀流年压力倍增，注意焦虑与睡眠'});if(lnSS.includes('比劫'))r.push({t:'合作风险',d:'比劫争财，合作与借贷需签清晰协议'});if(lnSS.includes('财')&&!wx.st)r.push({t:'财务压力',d:'身弱见财为忌，量力而行，忌高风险投机'});if(lnSS.includes('印')&&dySS.includes('食伤'))r.push({t:'决策摇摆',d:'印制食伤，想法多但落地难，需聚焦'});if(wx.c['火']<0.8||wx.c['水']<0.8)r.push({t:'睡眠问题',d:'水火不调，注意作息与睡眠质量'});if(!r.length)r.push({t:'气场平和',d:'无明显重大风险，稳中求进即可',safe:1});return r;}
/* —— 裁员风险检测：现实职场信号为主，命理趋势仅作低权重参考 —— */

export function calcLayoffRisk(){
  const d=getCtx();
  const out=document.getElementById('layoffResult');
  if(!d||!out)return;
  const getSelect=id=>{
    const el=document.getElementById(id);
    const opt=el&&el.selectedOptions?el.selectedOptions[0]:null;
    return{value:el?Number(el.value)||0:0,label:opt?opt.textContent.trim():''};
  };
  const company=getSelect('layoffCompany');
  const team=getSelect('layoffTeam');
  const perf=getSelect('layoffPerf');
  const role=getSelect('layoffRole');
  const checked=[...document.querySelectorAll('#layoffSignals input:checked')];
  const signalScore=checked.reduce((sum,x)=>sum+(Number(x.value)||0),0);
  const raw=company.value+team.value+perf.value+role.value+signalScore;
  const reality=Math.max(0,Math.min(100,Math.round(raw/149*100)));
  const astro=getLayoffAstroRisk(d);
  let score=Math.round(reality*.82+astro.score*.18);
  if(checked.some(x=>x.dataset.critical==='1'))score=Math.max(score,58);
  if(checked.some(x=>x.dataset.critical==='2'))score=Math.max(score,68);
  score=Math.max(5,Math.min(96,score));

  let level,color,summary;
  if(score<26){level='低风险';color='var(--c-green)';summary='暂未见明显裁员信号，继续保持可见产出即可。';}
  else if(score<50){level='需要关注';color='var(--c-yellow)';summary='已有部分预警信号，建议在不制造恐慌的前提下主动核实。';}
  else if(score<70){level='较高风险';color='var(--c-orange)';summary='现实红旗已较集中，应立即准备备选方案并留存关键材料。';}
  else{level='高危信号集中';color='var(--c-red)';summary='多项强信号叠加，请把重心放在证据、现金流与求职预案上。';}

  const factors=[];
  if(company.value>=20)factors.push(company.label);
  if(team.value>=18)factors.push(team.label);
  if(perf.value>=18)factors.push(perf.label);
  if(role.value>=12)factors.push(role.label);
  checked.forEach(x=>factors.push(x.dataset.label||x.parentElement.textContent.trim()));
  if(!factors.length)factors.push('未勾选明显现实红旗');
  const trendFactors=astro.reasons.length?astro.reasons.slice(0,3):['命理周期未见明显冲击'];
  const protectors=[];
  if(company.value<=10)protectors.push('公司经营相对稳定');
  if(team.value<=8)protectors.push('部门暂未出现明显缩编');
  if(perf.value<=5)protectors.push('绩效记录构成保护');
  if(role.value<=5)protectors.push('岗位具备一定核心性');
  protectors.push(...astro.protectors.slice(0,2));
  if(!protectors.length)protectors.push('当前保护项不足，需主动建立业务可见度');

  const actions=score<26?[
    '每月沉淀一次可量化成果，保持与直属上级的正常同步。',
    '每季度更新简历和作品集，储备至少3个月应急金。',
    '关注公司财报、招聘与预算变化，不因传言自行离职。'
  ]:score<50?[
    '本周与直属上级确认未来90天目标，并用邮件留痕。',
    '低调更新简历，联系3—5位行业熟人了解外部机会。',
    '梳理劳动合同、工资单与绩效记录，准备3—6个月应急金。'
  ]:score<70?[
    '不要冲动裸辞；立即启动投递和面试，先拿到备选Offer。',
    '合规留存合同、工资单、绩效与沟通记录，个人资料与公司机密严格分开。',
    '提前了解当地裁员补偿规则，任何文件签署前先完整阅读。'
  ]:[
    '把求职当作当前第一优先级：当天更新简历，本周开始面试。',
    '不要当场签署离职/和解文件；必要时咨询劳动法律师或当地劳动部门。',
    '冻结非必要支出，测算6个月现金流，并准备工作交接清单。'
  ];

  out.innerHTML=`<div class="layoff-result">
    <div class="layoff-result-head">
      <div class="layoff-index" style="color:${color}">${score}<small>/100</small></div>
      <div><div class="layoff-level">${level}</div><div class="layoff-period">评估窗口：${astro.window}</div></div>
    </div>
    <div class="layoff-meter"><div class="layoff-meter-fill" data-w="${score}%" style="background:${color}"></div></div>
    <div style="font-size:.76em;color:var(--c-text);line-height:1.75;margin-bottom:10px">${summary}</div>
    <div class="layoff-result-grid">
      <div class="layoff-result-box"><h5>现实预警 · 82%</h5><p>${factors.map(x=>'· '+x).join('<br>')}</p></div>
      <div class="layoff-result-box"><h5>趋势参考 · 18%</h5><p>${trendFactors.map(x=>'· '+x).join('<br>')}</p></div>
      <div class="layoff-result-box"><h5>保护因素</h5><p>${protectors.slice(0,4).map(x=>'· '+x).join('<br>')}</p></div>
      <div class="layoff-result-box"><h5>分项指数</h5><p>现实信号 ${reality}/100<br>命理趋势 ${astro.score}/100</p></div>
    </div>
    <div class="layoff-actions"><div class="layoff-actions-title">现在最该做的 3 件事</div><ol>${actions.map(x=>`<li>${x}</li>`).join('')}</ol></div>
    <div class="layoff-disclaimer">风险指数不是裁员概率，也不能证明一定会或不会被裁。公司经营、部门预算、绩效与劳动法信息优先于命理趋势。</div>
  </div>`;
  requestAnimationFrame(()=>{const fill=out.querySelector('.layoff-meter-fill');if(fill)setTimeout(()=>fill.style.width=fill.dataset.w,80);});
  out.scrollIntoView({behavior:'smooth',block:'nearest'});
}

export function getRelationMode(dg,ss,gen){const map={甲:'独立型',乙:'依赖型',丙:'热情型',丁:'慢热型',戊:'务实型',己:'包容型',庚:'理性型',辛:'挑剔型',壬:'自由型',癸:'敏感型'};return map[dg]||'平衡型';}
export function getSuitableType(wx,dg){const map={木:'情绪稳定、行动力强、土金偏旺的人',火:'包容性强、愿意给予空间的人',土:'有上进心、能带来新鲜感的人',金:'温柔细腻、善于沟通的人',水:'逻辑清晰、能给予安全感的人'};return map[wx.dw]||'五行互补、性格圆融的人';}
export function getRelationRisks(wx,dg,ss){const r=[];if(wx.st)r.push('过于强势，容易忽略伴侣感受');if(!wx.st)r.push('过于迁就，边界感模糊导致委屈');if(ss.dzc.some(c=>c.s.includes('伤官')))r.push('言语锋利，易因沟通方式产生摩擦');if(wx.c['火']>3)r.push('情绪波动大，热情来得快去得也快');if(wx.c['水']>2.8)r.push('思虑过多，容易因猜疑产生隔阂');if(!r.length)r.push('暂无显著关系风险，保持真诚沟通即可');return r;}


function _mysticPill(text,type='main'){
  const palette={main:['var(--ac1)','var(--ac4)','var(--ac-text)'],aux:['color-mix(in srgb,var(--c-teal) 12%,transparent)','color-mix(in srgb,var(--c-teal) 28%,transparent)','var(--c-teal)'],sha:['color-mix(in srgb,var(--c-red) 12%,transparent)','color-mix(in srgb,var(--c-red) 28%,transparent)','var(--c-red)'],muted:['var(--c-surface-2)','var(--c-border)','var(--c-text-2)']};
  const [bg,bd,co]=palette[type]||palette.main;
  return '<span style="display:inline-flex;align-items:center;margin:2px 4px 2px 0;padding:3px 7px;border-radius:999px;background:'+bg+';border:1px solid '+bd+';color:'+co+';font-size:.72em;line-height:1.35;white-space:nowrap">'+(text||'—')+'</span>';
}
function _mysticNote(title,body){return '<div style="padding:10px 11px;border-radius:12px;background:var(--c-surface-2);border:1px solid var(--c-border);line-height:1.65"><div style="font-size:.68em;color:var(--c-text-3);margin-bottom:4px">'+title+'</div><div style="font-size:.78em;color:var(--c-text)">'+body+'</div></div>';}
function _hexLines(lines,lineNumbers=[],changingLine=0){
  return (lines||[]).map((v,idx)=>{
    const lineNo=Array.isArray(lineNumbers)?lineNumbers[idx]:lineNumbers+idx+1,active=lineNo===changingLine;
    // 爻线本身必须有宽度：父级是 flex 行，span 不给 flex 会塌成 0 宽（实测 0x8）
    const bar=v
      ? '<span class="mh-bar" style="flex:1 1 auto;display:block;height:8px;border-radius:99px;background:'+(active?'var(--c-yellow)':'var(--ac5)')+'"></span>'
      : '<span class="mh-bar" style="flex:1 1 auto;display:grid;grid-template-columns:1fr 1fr;gap:10px"><i style="display:block;height:8px;border-radius:99px;background:'+(active?'var(--c-yellow)':'var(--c-surface-4)')+'"></i><i style="display:block;height:8px;border-radius:99px;background:'+(active?'var(--c-yellow)':'var(--c-surface-4)')+'"></i></span>';
    return '<div class="mh-line" style="min-height:16px;display:flex;align-items:center;gap:8px">'+bar+(active?'<em style="font-style:normal;font-size:.66em;color:var(--c-yellow);flex:0 0 auto">动</em>':'')+'</div>';
  }).join('');
}
function _elementRelation(a,b){
  const sheng={木:'火',火:'土',土:'金',金:'水',水:'木'},ke={木:'土',火:'金',土:'水',金:'木',水:'火'};
  if(a===b)return '上下卦同气，事情更容易沿着原有惯性推进。';
  if(sheng[a]===b)return '上卦生下卦，外部条件对内在基础有扶助。';
  if(sheng[b]===a)return '下卦生上卦，靠自身投入带动局面变化。';
  if(ke[a]===b)return '上卦克下卦，外部压力较明显，宜先稳基础。';
  if(ke[b]===a)return '下卦克上卦，主动性强，但要避免硬冲。';
  return '内外关系平常，以具体行动和现实条件为准。';
}
export function renderZiWeiCard(zw){
  if(!zw||!zw.ps)return '';
  const ps=zw.ps||[],ming=ps[zw.mingGongZhi]||{},body=ps[zw.bodyGongZhi]||{},career=ps.find(p=>p.n==='事业宫')||{},wealth=ps.find(p=>p.n==='财帛宫')||{},love=ps.find(p=>p.n==='夫妻宫')||{};
  const mainStars=(ming.m&&ming.m.length?ming.m:['未见主星']).join('、');
  const bodyStars=(body.m&&body.m.length?body.m:['借对宫参看']).join('、');
  const palaceHtml=ps.map((p,i)=>{
    const isM=i===zw.mingGongZhi,isB=i===zw.bodyGongZhi;
    return '<div style="min-height:92px;padding:10px;border-radius:14px;background:'+(isM?'var(--ac1)':'var(--c-surface-2)')+';border:1px solid '+(isM?'var(--ac4)':'var(--c-border)')+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:7px"><b style="font-size:.78em;color:'+(isM?'var(--ac-text)':'var(--c-text)')+'">'+p.n+'</b><span style="font-size:.62em;color:var(--c-text-3)">'+(DZ[i]||'')+(isM?' · 命':'')+(isB?' · 身':'')+'</span></div>'
      +'<div>'+((p.m&&p.m.length)?p.m.map(x=>_mysticPill(x,'main')).join(''):_mysticPill('无主星','muted'))+'</div>'
      +(p.a&&p.a.length?'<div style="margin-top:4px">'+p.a.map(x=>_mysticPill(x,'aux')).join('')+'</div>':'')
      +(p.s&&p.s.length?'<div style="margin-top:4px">'+p.s.map(x=>_mysticPill(x,'sha')).join('')+'</div>':'')
      +'</div>';
  }).join('');
  return '<div class="glass card-2" data-card="ziwei"><div class="card-hd"><div class="card-ic">紫</div><div><div class="card-tt">紫微斗数</div><div class="card-st">命宫、身宫、十二宫与主辅煞星</div></div></div>'
    +'<div class="ig" style="margin-bottom:12px">'+[
      ['命宫', (DZ[zw.mingGongZhi]||'')+' · '+mainStars],['身宫',(DZ[zw.bodyGongZhi]||'')+' · '+bodyStars],['事业宫',(career.m&&career.m.length?career.m.join('、'):'平稳')],['财帛宫',(wealth.m&&wealth.m.length?wealth.m.join('、'):'看流年')],['夫妻宫',(love.m&&love.m.length?love.m.join('、'):'重经营')],['盘面提示','主星看性格，辅煞看助力与阻力']
    ].map(x=>'<div class="ii"><div class="il">'+x[0]+'</div><div class="iv">'+x[1]+'</div></div>').join('')+'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'+palaceHtml+'</div>'
    +'<div class="at" style="margin-top:10px"><p>紫微盘用于补充“人事宫位”的观察：命宫看底色，身宫看后天用力方向；事业、财帛、夫妻等宫位要结合四柱、大运、流年一起看，不单凭单颗星定论。</p></div></div>';
}
export function renderQiMenCard(qm){
  if(!qm||!qm.ps)return '';
  const ps=qm.ps||[],dun=qm.yangDun?'阳遁':'阴遁',open=ps.find(x=>x.d==='开门')||{},sheng=ps.find(x=>x.d==='生门')||{},rest=ps.find(x=>x.d==='休门')||{},fu=ps.find(x=>x.g==='值符')||ps[0]||{};
  const doorTone={开门:'开局、沟通、发布',生门:'增长、求财、修复',休门:'休整、谈和、恢复',景门:'曝光、表达、文书',杜门:'保密、学习、闭关',伤门:'冲突、突破、损耗',死门:'停滞、收尾、保守',惊门:'消息、口舌、突发'};
  const grid=ps.map(x=>'<div style="min-height:96px;padding:10px;border-radius:14px;background:'+(x.cc?'color-mix(in srgb,var(--c-yellow) 10%,transparent)':'var(--c-surface-2)')+';border:1px solid '+(x.g==='值符'?'var(--ac4)':'var(--c-border)')+'"><div style="display:flex;justify-content:space-between;gap:6px;margin-bottom:7px"><b style="font-size:.78em;color:var(--c-text-hi)">'+x.p+'</b><span style="font-size:.62em;color:var(--c-text-3)">'+(x.cc?'中宫':'')+'</span></div><div>'+_mysticPill(x.d,'main')+_mysticPill(x.s,'aux')+_mysticPill(x.g,x.g==='白虎'||x.g==='玄武'?'sha':'muted')+'</div><div style="margin-top:7px;font-size:.66em;line-height:1.55;color:var(--c-text-2)">'+(doorTone[x.d]||'顺势观察')+'</div></div>').join('');
  return '<div class="glass card-2" data-card="qimen"><div class="card-hd"><div class="card-ic">奇</div><div><div class="card-tt">奇门遁甲</div><div class="card-st">'+dun+' '+qm.ju+'局 · 九宫、八门、九星、八神</div></div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px">'
    +_mysticNote('值符落宫',(fu.p||'—')+' · '+(fu.s||'—')+' · '+(fu.d||'—'))
    +_mysticNote('开门位置',(open.p||'—')+'：适合沟通、发布、谈判与外部连接')
    +_mysticNote('生门位置',(sheng.p||'—')+'：适合求财、增长、恢复与资源经营')
    +'</div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'+grid+'</div>'
    +'<div class="at" style="margin-top:10px"><p>奇门盘用于看“当下局势”：开门看行动入口，生门看增长机会，休门看修复与缓冲。这里按出生盘生成静态参考，具体择时仍要以现实时间和事项为准。</p></div></div>';
}
export function renderMeiHuaCard(mh){
  if(!mh)return '';
  const top=(mh.ul||[]).slice().reverse(),bottom=(mh.ll||[]).slice().reverse();
  const moveArea=mh.cl<=3?'内卦（基础、自己、近处）':'外卦（环境、他人、远处）';
  const tyColor=mh.tyRel?.score==='good'?'var(--c-green)':mh.tyRel?.score==='bad'?'var(--c-red)':mh.tyRel?.score==='caution'?'var(--c-orange)':'var(--c-text-2)';

  return '<div class="glass card-2" data-card="meihua"><div class="card-hd"><div class="card-ic">卦</div><div><div class="card-tt">梅花易数</div><div class="card-st">本卦 · 互卦 · 变卦 · 体用生克</div></div></div>'

    +'<div style="text-align:center;padding:12px 0 8px"><div style="font-family:var(--serif);font-size:1.5em;color:var(--c-text-hi);font-weight:700;letter-spacing:2px">'+(mh.benName||'')+'</div>'
    +(mh.benHint?'<div style="font-size:.72em;color:var(--c-text-3);margin-top:4px">'+mh.benHint+'</div>':'')
    +'</div>'

    +'<div class="mh-grid" style="display:grid;grid-template-columns:1.05fr .95fr;gap:12px;align-items:start">'
    +'<div class="mh-hex" style="padding:14px;border-radius:16px;background:var(--c-surface-2);border:1px solid var(--c-border)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div><div style="font-family:var(--serif);font-size:1.35em;color:var(--ac-text)">'+mh.ug+'</div><div style="font-family:var(--serif);font-size:1.35em;color:var(--c-text-hi);margin-top:4px">'+mh.lg+'</div></div><div style="text-align:right;font-size:.72em;color:var(--c-text-3)">本卦<br><b style="color:var(--c-yellow);font-size:1.3em">'+mh.cl+'爻动</b></div></div><div class="mh-lines" style="display:grid;gap:5px;max-width:200px;margin:0 auto 6px">'+_hexLines(top,[6,5,4],mh.cl)+_hexLines(bottom,[3,2,1],mh.cl)+'</div></div>'
    +'<div class="mh-side" style="display:grid;gap:8px">'+_mysticNote('上卦 / 下卦',mh.ug+'（'+mh.ue+'）<br>'+mh.lg+'（'+mh.le+'）')+_mysticNote('动爻',mh.cl+'爻动 · '+moveArea)+_mysticNote('体卦 / 用卦','<span style="color:var(--ac-text)">'+(mh.ti||'-')+'</span>（体·'+mh.tiWx+'）<br>'+(mh.yong||'-')+'（用·'+mh.yongWx+'）')+'</div></div>'

    +'<div style="margin-top:14px;padding:14px;border-radius:14px;background:var(--c-surface-2);border:1px solid var(--c-border)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="padding:3px 9px;border-radius:6px;background:var(--c-surface-3);font-size:.68em;color:var(--c-text-2)">体用生克</span><b style="font-size:.92em;color:'+tyColor+'">'+(mh.tyRel?.label||'-')+'</b></div><div style="font-size:.78em;line-height:1.75;color:var(--c-text)">'+(mh.tyRel?.desc||'')+'</div></div>'

    +'<div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +_mysticNote('互卦 · '+(mh.huName||''),(mh.hu||'-')+'（'+mh.hue+'）/ '+(mh.hl||'-')+'（'+mh.hle+'）<br><span style="font-size:.88em;color:var(--c-text-3)">互卦看事情内在发展过程</span>')
    +_mysticNote('变卦 · '+(mh.bianName||''),(mh.mu||'-')+'（'+mh.mue+'）/ '+(mh.ml||'-')+'（'+mh.mle+'）<br><span style="font-size:.88em;color:var(--c-text-3)">'+(mh.bianHint||'变卦看最终走向')+'</span>')
    +'</div>'

    +'<div class="at" style="margin-top:12px"><p>梅花易数适合回答某件事的变化趋势。本卦看当前局面，互卦看内在过程，动爻看变化触发点，变卦看后续走向。体用生克是断卦核心：用生体为吉、用克体需防守。若用于重大决策，仍建议结合现实信息与专业意见。</p></div></div>';
}

function _threeStyleInner(html){
  if(!html)return '<div class=\"three-style-empty\">暂无该术式数据</div>';
  const start=html.indexOf('>');
  return start>=0&&html.endsWith('</div>')?html.slice(start+1,-6):html;
}
export function renderThreeStylesCard(zw,qm,mh){
  const panes=[['ziwei','紫微斗数',renderZiWeiCard(zw)],['qimen','奇门遁甲',renderQiMenCard(qm)],['meihua','梅花易数',renderMeiHuaCard(mh)]];
  return '<div class=\"glass card-2 three-styles-card structure-card\" data-card=\"three-styles\"><div class=\"card-hd\"><div class=\"card-ic\">三</div><div><div class=\"card-tt\">三式合参</div><div class=\"card-st\">紫微斗数 · 奇门遁甲 · 梅花易数</div></div></div><div class=\"three-styles-intro\">以紫微看人生结构，以奇门看局势入口，以梅花看事情变化；三式用于交叉观察，不以单一术式下确定结论。</div><div class=\"structure-tabs three-styles-tabs\" role=\"tablist\" aria-label=\"三式合参结构\">'+panes.map(([key,label],i)=>'<button class=\"structure-tab'+(i===0?' active':'')+'\" type=\"button\" data-structure=\"'+key+'\" onclick=\"switchStructureTab(this)\">'+label+'</button>').join('')+'</div><div class=\"structure-panes three-styles-panes\">'+panes.map(([key,,html],i)=>'<div class=\"structure-pane'+(i===0?' active':'')+'\" data-structure=\"'+key+'\" data-card=\"'+key+'\">'+_threeStyleInner(html)+'</div>').join('')+'</div><div class=\"three-styles-note\">合参提示：三式分别回答“底色、时势、变化”。若结果出现差异，优先核对出生信息、具体问题、起局时间与现实证据。</div></div>';
}

export function renderAll(b,wx,ss,dy,ln,zw,qm,mh,si,gen,q,city,by,shensha,liuyue){
  // —— 统一上下文（所有派生量的唯一来源）——
  const _input=(window._ctx&&window._ctx.input)?window._ctx.input:{by:by,bm:1,bd:1};
  const ctx=buildContext({b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,P:null,gen,q,city,input:_input});
  const dg=ctx.dg,dw=ctx.dw,age=ctx.age,cDy=ctx.cDy,cLn=ctx.cLn,lnSS=ctx.lnSS,dySS=ctx.dySS;
  // —— 评分/命格 全部来自 ctx，避免与其他位置算法不一致 ——
  const cs=ctx.cs,ws=ctx.ws,ls=ctx.ls,hs=ctx.hs;
  const pa=ctx.pa;
  const P={甲:{core:'刚正不阿，有领导才能，如参天大树般坚韧挺拔',career:'适合创业、管理、教育、建筑等行业，天生有号召力',money:'财运偏向正财，靠实力和努力赚钱',love:'感情中比较主动和强势，重情义但不善表达',social:'朋友圈广但知心朋友少，给人可靠感但有时显得固执'},乙:{core:'温柔敏感，适应力极强，如藤蔓般灵活变通',career:'适合文艺、设计、咨询、花艺、时尚等行业',money:'善于理财，懂得细水长流，小钱变大钱',love:'感情细腻体贴，善解人意，但容易委屈自己',social:'人缘很好，八面玲珑，要注意别太随和丢主见'},丙:{core:'热情开朗，光明磊落，如太阳般温暖照耀他人',career:'适合销售、演艺、传媒、餐饮、能源等行业',money:'来财快但花得也快，要注意节制',love:'感情热烈奔放，喜欢轰轰烈烈，热度来得快退得也快',social:'天生社交达人，朋友遍天下，但要防小人利用'},丁:{core:'内敛聪慧，心思缜密，如烛火般温暖而专注',career:'适合科研、技术、文化、中医、心理咨询等',money:'财运稳定但偏保守，适合做长期投资',love:'感情专一深沉，重视精神交流，一旦爱了就很长久',social:'朋友不多但质量高，看人很准，内心丰富不轻露'},戊:{core:'稳重厚实，诚信可靠，如大山般沉稳包容',career:'适合地产、农业、金融、物流等行业，稳扎稳打',money:'偏财运不错，有意外之财，但要防借钱不还',love:'感情稳定持久，给人安全感，但要多制造浪漫',social:'值得信赖，别人有事第一个想到你，要学会拒绝'},己:{core:'包容万物，善于调和矛盾，如田园般滋养万物',career:'适合服务业、教育、HR、餐饮、农业等',money:'善于积少成多，不爱冒险但理财有道',love:'温和善解人意，容易吸引异性，但要学会表达感受',social:'人缘极好，是朋友圈润滑剂，防止被当老好人'},庚:{core:'果断刚毅，正义感强，如宝剑般锋利决断',career:'适合法律、金融、军警、外科医生等',money:'赚钱能力强但花钱大方，注意开源节流',love:'感情直接，爱憎分明，不喜欢拐弯抹角',social:'讲义气，朋友有困难一定帮，但脾气硬易冲突'},辛:{core:'精致细腻，审美独到，如珠玉般璀璨内敛',career:'适合珠宝、金融、美妆、艺术、品质管理等',money:'对钱敏感，善于发现商机，但过于谨慎会错过机会',love:'感情含蓄内敛，追求完美另一半，宁缺毋滥',social:'表面冷淡内心热情，交友有高标准重质量'},壬:{core:'智慧深邃，思维开阔，如大海般博大包容',career:'适合贸易、物流、科技、咨询、旅游等',money:'财运起伏大，适合做流动性强的生意',love:'感情丰富不受拘束，不喜欢被束缚，需要自由空间',social:'交友广泛三教九流都能聊，真心朋友需时间沉淀'},癸:{core:'敏锐灵动，善于洞察人心，如细雨般润物无声',career:'适合心理学、医学、占卜、文学、IT等',money:'偏财运好，常有意想不到的收入，但要注意别被骗',love:'感情深沉细腻，重视精神契合，容易暗恋',social:'朋友不多但都很铁，善于倾听，是天生心灵导师'}};
  const HM={木:{o:'肝胆',a:'多食绿蔬'},火:{o:'心脏',a:'适量运动'},土:{o:'脾胃',a:'饮食规律'},金:{o:'肺部',a:'远离烟尘'},水:{o:'肾脏',a:'充足睡眠'}};
  const gl=gen==='male'?'乾造':'坤造';
  const siS={旺:'得令强旺',相:'得气充足',休:'休囚需扶',囚:'受困宜补',死:'失令需生'}[si.st]||'平';
  const curveD=dy.ds.map((_,i)=>Math.round(Math.min(95,Math.max(30,50+Math.sin(i*.7)*20+Math.cos(i*.5)*10+(wx.c[GW[dy.ds[i].g]]||0)*5))));

  // 顶栏不再显示报告标题，命盘信息保留在报告正文中。

  let H='';

  H+=`<div class="sec active" id="s-ming">`;
  H+=renderQuickRead('ming',ctx);
  H+=renderBeginnerBrief('ming',ctx);

  H+=`<div class="glass card-2" data-card="bazi"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div><div><div class="card-tt">四柱八字</div><div class="card-st">${gl} · ${city.n} · ${b.sx}年 · ${b.ny}${b._meta&&b._meta.useTrueSolar?' · 真太阳时':''}</div></div></div>`;
  H+=`<div class="pls">${[{l:'年柱',p:b.Y,s:ss.yg},{l:'月柱',p:b.M,s:ss.mg},{l:'日柱',p:b.D,s:'日元',dm:1},{l:'时柱',p:b.H,s:ss.hg}].map(x=>`<div class="pl ${x.dm?'dm':''}" onclick="this.classList.toggle('open')"><div class="pl-l">${x.l}</div><div class="pl-g">${x.p.g}</div><div class="pl-z" style="color:${WC[ZW[x.p.z]]}">${x.p.z}</div><div class="pl-i"><span class="wdot" style="background:${WC[GW[x.p.g]]}"></span>${GW[x.p.g]} · ${x.s}</div><div class="pl-xd"><div style="padding-top:6px;font-size:.62em;color:var(--c-text-2);line-height:1.7;border-top:1px solid var(--c-border);margin-top:4px">${ZC[x.p.z].map((g,idx)=>`<div style="display:flex;align-items:center;gap:4px"><span class="wdot" style="background:${WC[GW[g]]}"></span><span style="color:var(--c-text-2)">${g}</span><span style="color:var(--ac-dim)">${SS[b.D.g][g]}</span><span style="font-size:.85em;color:var(--c-text-3)">${['主气','中气','余气'][idx]}</span></div>`).join('')}</div></div></div>`).join('')}</div>`;
  H+=`<div class="ig">${[['日主',`${dg}${dw}·${wx.st?'身旺':'身弱'}`],['命格',pa.join('、')],['用神',`<span style="color:${WC[wx.ys]}">${wx.ys}</span>`],['喜神',`<span style="color:${WX.includes(wx.xs)?WC[wx.xs]:'#fff'}">${wx.xs}</span>`],['纳音',b.ny],['四时',`${si.s}令·${siS}`]].map(x=>`<div class="ii"><div class="il">${x[0]}</div><div class="iv">${x[1]}</div></div>`).join('')}</div>`;
  H+=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${getShenShaLabels(b).map(l=>`<span class="sstag" style="background:${l.bg};color:${l.co};border:1px solid ${l.bd}">${l.t}</span>`).join('')}</div>`;
  H+=`</div>`;

  H+=`<div class="glass card-2" data-card="wuxing"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/></svg></div><div><div class="card-tt">五行能量模型</div></div></div>`;
  H+=`${WX.map(w=>{const pc=Math.round(wx.c[w]/wx.t*100);const label=pc>=70?'极强':pc>=55?'偏强':pc>=40?'一般':pc>=25?'偏弱':'不足';return`<div class="wxr"><div class="wxl" style="color:${WC[w]}">${w}</div><div class="wxt"><div class="wxf" style="width:0%;background:${WC[w]}" data-w="${pc}%">${pc}%</div></div><div class="wxv">${pc}% ${label}</div></div>`}).join('')}`;
  H+=`<div class="at" style="margin-top:6px"><p>你属于典型的「<span class="hl">${wx.s}旺型人格</span>」${wx.s==='木'?'，行动力强，但容易精神内耗':wx.s==='火'?'，热情有感染力，但容易急躁':wx.s==='土'?'，稳重可靠，但容易固执':wx.s==='金'?'，果断锐利，但容易冷漠':''}。需要增强<span class="tg">${wx.w}</span>属性以平衡。</p></div></div>`;

  const persona=getPersona(dg,wx,wx.st,ss);
  H+=`<div class="glass card-2" data-card="persona"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div><div class="card-tt">人格画像</div><div class="card-st">基于日主、十神分布、入命神煞与五行旺衰推导</div></div></div>`;
  H+=`<div class="portrait-grid">${Object.entries(persona).map(([k,v])=>`<div class="port-item"><div class="port-label">${k}</div><div class="port-val">${v}</div></div>`).join('')}</div>`;
  // —— 人格标签：十神分布（透干+藏干计数）——
  const _ssc={};
  [ss.yg,ss.mg,ss.hg].forEach(s=>{_ssc[s]=(_ssc[s]||0)+1;});
  [...ss.yzc,...ss.mzc,...ss.dzc,...ss.hzc].forEach(c=>{_ssc[c.s]=(_ssc[c.s]||0)+1;});
  const _ssGroups=[
    {k:'官杀',list:['正官','七杀'],tag:'有规则感与责任心'},
    {k:'财星',list:['正财','偏财'],tag:'务实，重结果与交付'},
    {k:'食伤',list:['食神','伤官'],tag:'爱表达，点子多'},
    {k:'印星',list:['正印','偏印'],tag:'学习吸收型，常复盘'},
    {k:'比劫',list:['比肩','劫财'],tag:'独立，竞争意识强'}
  ].map(g=>({...g,n:g.list.reduce((a,s)=>a+(_ssc[s]||0),0)})).filter(g=>g.n>=2).sort((a,b)=>b.n-a.n).slice(0,3);
  // —— 人格标签：入命神煞（星落之支在四柱中才算入命）——
  const _zhis=[b.Y.z,b.M.z,b.D.z,b.H.z];
  const _ssPersona={'桃花':'人缘与魅力突出','红艳':'情感丰富，易动情','文昌':'表达与学习有天赋','华盖':'直觉强，喜静，亲近艺术与玄学','将星':'有组织力，易成群中的主心骨','魁罡':'果决刚毅，不好糊弄','羊刃':'刚强，认定的事不轻易回头','驿马':'好动爱变化，向外发展','空亡':'理想主义，在意精神层面'};
  const _ssTags=(shensha||[]).filter(x=>x.n&&_ssPersona[x.n]&&String(x.v||'').split('').some(z=>_zhis.includes(z))).slice(0,4).map(x=>({t:_ssPersona[x.n],b:x.n}));
  if(_ssGroups.length||_ssTags.length){
    H+=`<div class="ps-block"><div class="ps-block-tt">人格标签</div><div class="ps-tags">${_ssGroups.map(g=>`<span class="ps-tag">${g.tag}<i>（${g.k}×${g.n}）</i></span>`).join('')}${_ssTags.map(x=>`<span class="ps-tag">${x.t}<i>（${x.b}入命）</i></span>`).join('')}</div></div>`;
  }
  // —— 五行气质：最强最弱五行 ——
  const _wxTxt={木:'生长型：主动、爱规划与启动；受阻时容易想太多',火:'表达型：热情直接；情绪来得快，起伏明显',土:'稳定型：可靠包容；固执时容易卡住不动',金:'原则型：边界清楚，决断快；有时不够柔软',水:'灵活型：善观察，适应快；感受多往心里收'};
  const _wNeed={木:'行动力',火:'表达',土:'稳定感',金:'决断',水:'灵活'};
  H+=`<div class="ps-block"><div class="ps-block-tt">五行气质</div><div class="ps-line"><b style="color:${WC[wx.s]}">${wx.s}旺</b><span>${_wxTxt[wx.s]||''}</span></div><div class="ps-line"><b style="color:${WC[wx.w]}">${wx.w}弱</b><span>${_wNeed[wx.w]||'该面向'}的表达相对内敛，需要它时可以刻意放慢半拍、找外部反馈补足。</span></div></div>`;
  // —— 格局倾向 ——
  try{
    const _pa=calcPattern(ss);
    const _paTxt={'正官格':'以目标与规则自驱，适合在体系内经营','七杀格':'压力中成长，适合攻坚与破局','财星格':'擅长把资源变成结果，商业感好','食神格':'凭兴趣与才华持续产出','伤官格':'突破常规，创新意识强','印绶格':'靠学习与吸收积蓄后劲','杂气格':'面向多元，随环境与选择展开'};
    if(_pa&&_pa.length)H+=`<div class="ps-block"><div class="ps-block-tt">格局倾向</div><div class="ps-line"><b>${_pa.join('、')}</b><span>${_paTxt[_pa[0]]||''}</span></div></div>`;
  }catch(e){}
  H+=`<div class="ps-foot">标签由十神分布、入命神煞与五行旺衰推导，是倾向参考，不是性格定论。</div></div>`;

  H+=renderThreeStylesCard(zw,qm,mh);

  // 运势页按 年/月/周/日 四档组织，先分桶再统一装进子标签
  let yYear='',yMonth='',yWeek='',yDay='';
  const tlData=getTimeline(dy,by,wx,b,dg,gen,age);
  const tlMin=Math.min(...tlData.map(t=>t.sc)),tlMax=Math.max(...tlData.map(t=>t.sc));
  const cvW=300,cvH=70,padL=8,padR=8,padT=10,padB=14;
  const stepX=(cvW-padL-padR)/(tlData.length-1);
  const ptOf=(s,i)=>{const x=padL+i*stepX;const norm=tlMax===tlMin?0.5:(s-tlMin)/(tlMax-tlMin);const y=padT+(cvH-padT-padB)*(1-norm);return[x,y];};
  const pts=tlData.map((t,i)=>ptOf(t.sc,i));
  const pathD=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const areaD=pathD+` L${pts[pts.length-1][0].toFixed(1)} ${cvH-padB} L${pts[0][0].toFixed(1)} ${cvH-padB} Z`;
  const startYear=by+dy.sa;
  yYear+=`<div class="glass card-2" data-card="timeline"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div><div><div class="card-tt">人生时间线 · 大运十程</div><div class="card-st">${dy.sa}岁起运 · ${startYear}年入大运 · ${(b.Y.gi%2===0)===(gen==='male')?'顺':'逆'}排</div></div></div>`;
  yYear+=`<div class="tl-curve-wrap"><svg viewBox="0 0 ${cvW} ${cvH}" preserveAspectRatio="none" class="tl-curve"><defs><linearGradient id="tlGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".45"/><stop offset="1" stop-color="var(--ac)" stop-opacity="0"/></linearGradient></defs><path d="${areaD}" fill="url(#tlGrad)"/><path d="${pathD}" fill="none" stroke="var(--ac5)" stroke-width="1.5" stroke-linejoin="round"/>${pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${tlData[i].active?3.5:2.2}" fill="${tlData[i].active?'var(--ac)':tlData[i].past?'var(--c-text-4)':'var(--ac5)'}"/>`).join('')}</svg><div class="tl-curve-axis">${tlData.map(t=>`<span class="${t.active?'on':''}">${t.as}</span>`).join('')}</div></div>`;
  yYear+=`<div class="tl-legend"><span><i style="background:var(--ac)"></i>当前大运</span><span><i style="background:var(--c-text-4)"></i>已过</span><span><i style="background:var(--ac5)"></i>未来</span></div>`;
  yYear+=`<div class="tl-list">${tlData.map(t=>{
    const stars='★★★★★'.split('').map((s,i)=>`<span style="color:${i<Math.round(t.sc/20)?t.tcol:'var(--c-border-2)'}">${s}</span>`).join('');
    const stateCls=t.active?'active':t.past?'past':'future';
    const msHtml=t.milestones.length?`<div class="tl-ms">${t.milestones.map(m=>`<span class="tl-ms-pill ${m.k}">${m.y}年·${m.age}岁·${m.t}</span>`).join('')}</div>`:'';
    return `<div class="tl-card ${stateCls}" onclick="this.classList.toggle(\'open\')">
      <div class="tl-card-hd">
        <div class="tl-card-l">
          <div class="tl-gz"><span style="color:${WC[t.gwx]}">${t.g}</span><span style="color:${WC[t.zwx]}">${t.z}</span></div>
          <div class="tl-meta"><span class="tl-ss">${t.gSS}</span><span class="tl-stage">${t.stage}</span></div>
        </div>
        <div class="tl-card-m">
          <div class="tl-age-r">${t.as}<span>~</span>${t.ae}<small>岁</small></div>
          <div class="tl-year-r">${t.ys} - ${t.ye}</div>
        </div>
        <div class="tl-card-r">
          <div class="tl-theme" style="color:${t.tcol}">${t.ico} ${t.theme}</div>
          <div class="tl-stars">${stars}<span class="tl-sc">${t.sc}</span></div>
        </div>
      </div>
      <div class="tl-detail">
        <div class="tl-quad">
          <div class="tl-q"><div class="tl-q-h">事业</div><div class="tl-q-b">${t.career}</div></div>
          <div class="tl-q"><div class="tl-q-h">财富</div><div class="tl-q-b">${t.money}</div></div>
          <div class="tl-q"><div class="tl-q-h">感情</div><div class="tl-q-b">${t.love}</div></div>
          <div class="tl-q"><div class="tl-q-h">健康</div><div class="tl-q-b">${t.health}</div></div>
        </div>
        ${msHtml}
      </div>
    </div>`;
  }).join('')}</div>`;
  yYear+=`<div class="tl-foot">※ 大运十年一变，干主前五年、支主后五年；分数为命局用神匹配度的相对参考。</div></div>`;
  H+=`</div>`;
  const av={c:wx.ys==='木'?'青绿色':wx.ys==='火'?'红色、紫色':wx.ys==='土'?'黄色、棕色':wx.ys==='金'?'白色、银色':'黑色、蓝色',n:wx.ys==='木'?'3、8':wx.ys==='火'?'2、7':wx.ys==='土'?'5、0':wx.ys==='金'?'4、9':'1、6',d:wx.ys==='木'?'东方':wx.ys==='火'?'南方':wx.ys==='土'?'中央':wx.ys==='金'?'西方':'北方',g:wx.ys==='木'?'翡翠、木质饰品':wx.ys==='火'?'红玛瑙、紫水晶':wx.ys==='土'?'黄水晶、陶瓷':wx.ys==='金'?'白水晶、金属':'黑曜石、海蓝宝',t:wx.ys==='木'?'寅卯时（3-7点）':wx.ys==='火'?'巳午时（9-13点）':wx.ys==='土'?'辰丑时（7-9点,1-3点）':wx.ys==='金'?'申酉时（15-19点）':'亥子时（21-1点）',f:wx.ys==='木'?'绿色蔬菜、酸味食物':wx.ys==='火'?'红色食物、苦味茶':wx.ys==='土'?'谷物、根茎类':wx.ys==='金'?'白色食品、百合':'黑色食品、海鲜'};
  const todayJ=getTodayGZ();
  // 今日流日（与日签同源）：今日建议的宜忌由它实时推导，并为分享卡片保留数据
  let _todayLr=null;
  try{_todayLr=calcLiuRi(b,wx.ys);window._todayLiuRi=_todayLr;}catch(e){_todayLr={tone:'steady',roleInfo:{domain:'日常推进'}};}
  // 今日宜忌由当日流日基调实时推导，不再使用写死文案
  const _advYiJi=(()=>{const t=_todayLr&&_todayLr.tone;const map={flow:{yi:['推进要事','对外沟通','争取资源','启动计划'],ji:['多线铺开','临阵加码']},steady:{yi:['按计划执行','收尾复盘','整理规划','巩固关系'],ji:['用力过猛','盲目加码']},friction:{yi:['处理小事','核对细节','记录问题','留出缓冲'],ji:['重大决定','行程排满','仓促承诺']},rest:{yi:['休息恢复','整理收纳','复盘沉淀','精简日程'],ji:['硬推目标','密集社交','熬夜透支']}};return map[t]||map.steady;})();
  const _advDomain=_todayLr&&_todayLr.roleInfo&&_todayLr.roleInfo.domain?('适合：'+_todayLr.roleInfo.domain):'';

  H+=`<div class="sec" id="s-yun">`;
  H+=renderQuickRead('yun',ctx);
  H+=renderBeginnerBrief('yun',ctx);
  H+=`<div class="yun-tabs" role="tablist" aria-label="运势时间粒度"><button class="yun-tab active" type="button" data-yun="year" role="tab" aria-selected="true" onclick="TJActivateYunTab('year')">当年</button><button class="yun-tab" type="button" data-yun="month" role="tab" aria-selected="false" onclick="TJActivateYunTab('month')">流月</button><button class="yun-tab" type="button" data-yun="week" role="tab" aria-selected="false" onclick="TJActivateYunTab('week')">本周</button><button class="yun-tab" type="button" data-yun="day" role="tab" aria-selected="false" onclick="TJActivateYunTab('day')">当下关注</button></div>`;
  H+=`<div class="yun-panes">`;

  // ===== 年档：当年核心趋势 + 人生时间线（合并掉原"大运时间轴"，十年只呈现一次）=====
  yYear=`<div class="glass card-1" data-card="trend"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 20h18M6 16V9M10 16V5M14 16V8M18 16V3"/></svg></div><div><div class="card-tt">${CURR_YEAR}年核心趋势</div><div class="card-st">${cLn.g}${cLn.z} ${cLn.sx}年 · ${lnSS}</div></div><button class="card-share" type="button" onclick="TJShareReport()" title="分享命盘摘要卡片" aria-label="分享命盘摘要卡片"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12M8 7l4-4 4 4"/></svg></button></div>
<div class="y-hero">${[{l:'事业',v:cs,c:'var(--c-yellow)'},{l:'财运',v:ws,c:'var(--c-orange)'},{l:'感情',v:ls,c:'var(--c-red)'},{l:'健康',v:hs,c:'var(--c-green)'}].map(x=>`<div class="y-hero-item"><div class="y-hero-label">${x.l}</div><div class="y-hero-stars">${'★★★★★'.split('').map((s,i)=>`<span style="color:${i<Math.round(x.v/20)?x.c:'var(--c-border-2)'}">${s}</span>`).join('')}</div><div class="y-hero-score">${x.v}分</div></div>`).join('')}</div>
<div class="at"><p>今年<span class="hl">${cLn.g}${cLn.z}</span>年，流年十神为「<span class="tg">${lnSS}</span>」。${cs>72?'整体势能向上，适合主动进取。':'整体以稳为主，厚积薄发。'}当前<span class="hl">${cDy.g}${cDy.z}</span>大运，${dySS.includes('官')?'事业压力与机遇并存':dySS.includes('财')?'财运通道打开':dySS.includes('印')?'适合学习沉淀':''}。</p></div></div>`+yYear;

  // ===== 月档：流月 =====
  const ma=getMonthlyAlert(b,wx);
  const risks=getRiskWarning(b,wx,lnSS,dySS);
  const _av_yun={g:wx.ys==='木'?'翡翠、木质饰品':wx.ys==='火'?'红玛瑙、紫水晶':wx.ys==='土'?'黄水晶、陶瓷':wx.ys==='金'?'白水晶、金属':'黑曜石、海蓝宝',f:wx.ys==='木'?'绿色蔬菜、酸味食物':wx.ys==='火'?'红色食物、苦味茶':wx.ys==='土'?'谷物、根茎类':wx.ys==='金'?'白色食品、百合':'黑色食品、海鲜'};
  // 严重度评估：决定默认显示哪个子 tab（任一子区如果"高风险"则定位过去）
  const hasHardRisk=risks.some(r=>!r.safe);
  const defaultFocus=hasHardRisk?'risk':(ma.risks&&ma.risks.length?'monthly':'risk');
  yMonth+=`<div class="glass card-2" data-card="liuyue"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 20h18M6 16V9M10 16V5M14 16V8M18 16V3"/></svg></div><div><div class="card-tt">${CURR_YEAR}年流月</div><div class="card-st">点击月份查看详解</div></div></div><div class="lym-grid">${liuyue.map((lm,idx)=>{const now=new Date();const curMonth=now.getMonth();const isCur=(idx===curMonth);const lmSS=SS[dg][lm.gz.charAt(0)];return`<div class="lym-item ${isCur?'current':''}" onclick="openMonthModal(${idx},'${lm.name}','${lm.gz}','${lm.jq}','${lmSS}')"><div class="lym-name">${lm.name}</div><div class="lym-gz">${lm.gz}</div><div class="lym-jq">${lm.jq}</div><div class="lym-ss">${lmSS}</div></div>`}).join('')}</div></div>`;

  // ===== 周档：本周运势（流日引擎逐日推演汇总）=====
  try{
    const week=calcLiuZhou(b,wx.ys);
    window._weekData=week;
    const fmt=d=>(d.getMonth()+1)+'月'+d.getDate()+'日';
    const toneCls={flow:'wk-flow',steady:'wk-steady',friction:'wk-friction',rest:'wk-rest'};
    const bestCopy=week.best.tone==='rest'||week.best.tone==='friction'
      ?'这一天节奏相对友好，把最需要推进的事放在这里。'
      :'这一天与命盘相合度最高，适合安排重要沟通、决策或启动事项。';
    yWeek+=`<div class="glass card-1" data-card="weekFortune"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/></svg></div><div><div class="card-tt">本周运势</div><div class="card-st">${fmt(week.start)} – ${fmt(week.end)} · 逐日干支 × 你的命盘</div></div><button class="card-share" type="button" onclick="TJShareWeek()" title="分享本周运势卡片" aria-label="分享本周运势卡片"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12M8 7l4-4 4 4"/></svg></button></div>`;
    yWeek+=`<div class="wk-grid">${week.days.map(x=>`<div class="wk-day ${x.isToday?'is-today':''} ${toneCls[x.tone]||''}"><div class="wk-day-label">${x.isToday?'今天':x.label}</div><div class="wk-day-date">${x.short}</div><div class="wk-day-gz">${x.day.gz}</div><div class="wk-day-tone">${TONE_COPY[x.tone]?TONE_COPY[x.tone].label:x.tone}</div><div class="wk-day-energy">${x.energy}</div></div>`).join('')}</div>`;
    yWeek+=`<div class="wk-highlights"><div class="wk-hl wk-hl-good"><span class="wk-hl-k">相对顺利</span><span class="wk-hl-v">${week.best.label}（${week.best.short} · ${week.best.day.gz}）</span></div><div class="wk-hl wk-hl-warn"><span class="wk-hl-k">多留余量</span><span class="wk-hl-v">${week.worst.label}（${week.worst.short} · ${week.worst.day.gz}）</span></div></div>`;
    yWeek+=`<div class="at"><p>${week.summary}${bestCopy}</p></div>`;
    yWeek+=`<div class="wk-foot">周运由七天流日逐日推演后汇总，与每日日签口径一致；用于安排节奏，不预测具体事件。</div></div>`;
  }catch(e){ console.warn('weekFortune',e); }

  // ===== 日档：今日建议（含当下关注 + 宜忌 + 查看日签）=====
  yDay+=`<div class="glass card-1 focus-card" data-card="todayAdv"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><div><div class="card-tt">今日建议</div><div class="card-st">${todayJ}${_advDomain?' · '+_advDomain:''}</div></div><button class="card-share" type="button" onclick="TJShareRiQian()" title="分享今日卡片" aria-label="分享今日卡片"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12M8 7l4-4 4 4"/></svg></button></div>`;
  yDay+=`<div class="adv-grid">`;
  yDay+=`<div class="adv-card"><div class="adv-hd">宜</div><div class="adv-body">${_advYiJi.yi.map(x=>`<span class="adv-tag yi">${x}</span>`).join('')}</div></div>`;
  yDay+=`<div class="adv-card"><div class="adv-hd">忌</div><div class="adv-body">${_advYiJi.ji.map(x=>`<span class="adv-tag ji">${x}</span>`).join('')}</div></div>`;
  yDay+=`<div class="adv-card"><div class="adv-hd">职业建议</div><div class="adv-body">适合靠近<span class="hl">${wx.ys}</span>属性领域：<br>${wx.ys==='木'?'内容表达、品牌、教育、园艺':wx.ys==='火'?'能源、传媒、餐饮、互联网':wx.ys==='土'?'地产、金融、建筑、农业':wx.ys==='金'?'法律、机械、珠宝、精密制造':'贸易、物流、科技、旅游'}</div></div>`;
  yDay+=`</div>`;
  yDay+=`<div class="focus-tabs">
    <button class="focus-tab ${defaultFocus==='monthly'?'active':''}" data-sub="monthly" onclick="focusSwitchTab(this)"><span class="focus-tab-ic"></span> 本月${ma.risks&&ma.risks.length?'<span class="focus-dot"></span>':''}</button>
    <button class="focus-tab ${defaultFocus==='risk'?'active':''}" data-sub="risk" onclick="focusSwitchTab(this)"><span class="focus-tab-ic">势</span> 风险${hasHardRisk?'<span class="focus-dot red"></span>':''}</button>
    <button class="focus-tab ${defaultFocus==='health'?'active':''}" data-sub="health" onclick="focusSwitchTab(this)"><span class="focus-tab-ic"></span> 健康</button>
  </div>`;
  yDay+=`<div class="focus-pane ${defaultFocus==='monthly'?'active':''}" data-sub="monthly">
    <div class="at"><p>${ma.msg}</p></div>
    ${ma.risks&&ma.risks.length?`<div class="risk-row" style="margin-top:6px">${ma.risks.map(r=>`<span class="risk-pill">${r}</span>`).join('')}</div>`:'<div class="focus-empty">本月暂无突出提醒</div>'}
  </div>`;
  yDay+=`<div class="focus-pane ${defaultFocus==='risk'?'active':''}" data-sub="risk">
    <div class="risk-row">${risks.map(r=>`<span class="risk-pill ${r.safe?'safe':''}">${r.t}</span>`).join('')}</div>
    <div class="at" style="font-size:.8em;margin-top:6px"><p>${risks.map(r=>`· ${r.t}：${r.d}`).join('<br>')}</p></div>
  </div>`;
  yDay+=`<div class="focus-pane ${defaultFocus==='health'?'active':''}" data-sub="health">
    <div class="at"><p>最弱五行<span class="hl">${wx.w}</span>，重点关注<span class="tc">${HM[wx.w].o}</span>。${HM[wx.w].a}。</p><p>幸运色：<span class="hl">${av.c}</span>　·　有利方位：<span class="hl">${av.d}</span>　·　吉时：<span class="hl">${av.t}</span></p><p>用神饰品推荐：<span class="hl">${_av_yun.g}</span>　·　日常多食<span class="hl">${_av_yun.f}</span>。</p></div>
  </div>`;
  yDay+=`<div style="text-align:center;padding:8px 0 4px"><button type="button" onclick="showRiQian()" style="padding:8px 20px;border-radius:999px;border:1px solid var(--c-border);background:var(--c-surface-2);color:var(--ac-text);font-size:.78em;cursor:pointer;transition:background .2s" onmouseover="this.style.background='var(--ac3)'" onmouseout="this.style.background='var(--c-surface-2)'">查看今日日签 · 宜忌 / 干支 / 吉凶</button></div></div>`;

  H+=`<div class="yun-pane active" data-yun="year">${yYear}</div>`;
  H+=`<div class="yun-pane" data-yun="month">${yMonth}</div>`;
  H+=`<div class="yun-pane" data-yun="week">${yWeek}</div>`;
  H+=`<div class="yun-pane" data-yun="day">${yDay}</div>`;
  H+=`</div>`;
  H+=`</div>`;

  const rmode=getRelationMode(dg,ss,gen);
  const stype=getSuitableType(wx,dg);
  const rrisks=getRelationRisks(wx,dg,ss);
  const layoffTrend=getLayoffAstroRisk(ctx);
  H+=`<div class="sec" id="s-rel">`;
  H+=renderQuickRead('rel',ctx);
  H+=renderBeginnerBrief('rel',ctx);
  H+=`<div class="glass card-1" data-card="loveMode"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></div><div><div class="card-tt">感情模式</div></div></div>`;
  H+=`<div class="rel-mode"><div class="rel-mode-item hl">${rmode}</div></div>`;
  H+=`<div class="at"><p>你的感情底色带有「<span class="hl">${rmode}</span>」的特质。${P[dg].love}。在亲密关系中，${wx.st?'你习惯主导节奏，需注意给对方留出表达空间':'你习惯配合与迁就，需建立清晰的自我边界'}。</p></div></div>`;

  H+=`<div class="glass card-2" data-card="loveMatch"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg></div><div><div class="card-tt">适合对象</div></div></div>`;
  H+=`<div class="at"><p>从五行互补与十神配合来看，你更适合：<span class="hl">${stype}</span>。</p><p>对方的日主属性以<span class="tg">${wx.ys==='木'?'土金':wx.ys==='火'?'金水':wx.ys==='土'?'木水':wx.ys==='金'?'火木':'火土'}</span>为佳，能够补足你的用神能量。</p></div></div>`;

  H+=`<div class="glass card-2" data-card="loveRisk"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div><div><div class="card-tt">关系风险</div></div></div>`;
  H+=`<div class="risk-row">${rrisks.map(r=>`<span class="risk-pill">${r}</span>`).join('')}</div></div>`;

  H+=`<div class="glass card-1 layoff-card" data-card="layoffRisk"><div class="card-hd"><div class="card-ic" style="color:var(--c-yellow);background:color-mix(in srgb,var(--c-yellow) 12%,transparent);border-color:color-mix(in srgb,var(--c-yellow) 24%,transparent)"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18M10 12v2h4v-2"/></svg></div><div><div class="card-tt">裁员风险检测</div><div class="card-st">现实职场信号 × 当前大运流年 · 评估未来3—6个月</div></div></div>`;
  H+=`<div class="layoff-method"><div class="layoff-method-title">检测逻辑：现实证据优先，命理只作趋势参考</div><div class="layoff-method-weight">现实信号 82% · 命理趋势 18%</div></div>`;
  H+=`<div class="layoff-trend"><div class="layoff-trend-score">${layoffTrend.score}</div><div class="layoff-trend-copy"><div class="layoff-trend-title">命理职场趋势：${layoffTrend.label}</div><div class="layoff-trend-text">${layoffTrend.reasons.length?layoffTrend.reasons.slice(0,2).join('；'):'当前周期未见明显职场冲击'} · 仅占综合评估18%</div></div></div>`;
  H+=`<div class="layoff-form">
    <div class="layoff-field"><label for="layoffCompany">公司经营状态</label><select id="layoffCompany"><option value="4">增长 / 持续招聘</option><option value="10" selected>基本稳定</option><option value="22">降本增效 / 招聘冻结</option><option value="32">亏损、融资失败或大幅收缩</option></select></div>
    <div class="layoff-field"><label for="layoffTeam">部门与编制</label><select id="layoffTeam"><option value="3">核心部门 / 扩编</option><option value="8" selected>正常运转</option><option value="20">预算冻结 / 不再补员</option><option value="30">合并、外包或明确裁撤</option></select></div>
    <div class="layoff-field"><label for="layoffPerf">最近绩效</label><select id="layoffPerf"><option value="0">优秀 / 超额完成</option><option value="5" selected>良好 / 达成目标</option><option value="22">连续低绩效 / 被书面提醒</option><option value="35">已进入 PIP / 改进计划</option></select></div>
    <div class="layoff-field"><label for="layoffRole">岗位不可替代性</label><select id="layoffRole"><option value="0">掌握关键客户 / 核心系统</option><option value="5" selected>专业岗位，有稳定产出</option><option value="12">工作可快速交接</option><option value="20">岗位重复 / 可外包或自动化</option></select></div>
  </div>`;
  H+=`<div class="layoff-signals-title">近期是否出现以下红旗？（可多选）</div><div class="layoff-signals" id="layoffSignals">
    <label class="layoff-check"><input type="checkbox" value="8" data-label="预算被砍、项目突然暂停">预算被砍、项目突然暂停</label>
    <label class="layoff-check"><input type="checkbox" value="8" data-label="被移出核心会议或工作被边缘化">被移出核心会议或工作被边缘化</label>
    <label class="layoff-check"><input type="checkbox" value="8" data-label="被要求异常详细地交接文档" data-critical="1">被要求异常详细地交接文档</label>
    <label class="layoff-check"><input type="checkbox" value="8" data-label="权限被回收或 HR 异常介入" data-critical="2">权限被回收或 HR 异常介入</label>
  </div>`;
  H+=`<div class="cta-row" style="margin-top:8px"><button class="cta" style="padding:12px 28px;font-size:.92em;letter-spacing:1px" onclick="calcLayoffRisk()">开始检测</button></div><div id="layoffResult" aria-live="polite"></div><div class="layoff-disclaimer">本工具用于风险筛查与行动规划，不构成法律、职业或投资建议；若已收到正式通知，请以劳动合同和当地法律为准。</div></div>`;

  H+=`<div class="glass card-1" data-card="relAi"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div><div><div class="card-tt">八字合盘</div><div class="card-st">为对方真实排盘，逐柱比对日主、五行与干支关系</div></div></div>`;
  H+=`<div class="hh-form" id="relForm"><div><div class="fd" style="margin-bottom:10px"><label>对方出生日期</label><input type="date" id="rDate" value="1992-08-20"></div><div class="fd" style="margin-bottom:10px"><label>对方出生时辰（可不填）</label><select id="rHour"><option value="">时辰不详 · 用三柱比对</option><option value="0">子 23:00–00:59</option><option value="1">丑 01:00–02:59</option><option value="2">寅 03:00–04:59</option><option value="3">卯 05:00–06:59</option><option value="4">辰 07:00–08:59</option><option value="5">巳 09:00–10:59</option><option value="6">午 11:00–12:59</option><option value="7">未 13:00–14:59</option><option value="8">申 15:00–16:59</option><option value="9">酉 17:00–18:59</option><option value="10">戌 19:00–20:59</option><option value="11">亥 21:00–22:59</option></select></div></div></div>`;
  H+=`<div class="cta-row" style="margin-top:10px"><button class="cta" style="padding:12px 28px;font-size:.95em;letter-spacing:1px" onclick="calcRelation()">开始合盘</button></div>`;
  H+=`<div id="relResult" style="margin-top:10px"></div></div>`;
  H+=`</div>`;

  

  H+=`<div class="sec" id="s-adv">`;
  H+=renderBeginnerBrief('adv',ctx);
  H+=`<div class="glass card-1 tool-hub" data-card="toolHub"><div class="card-hd"><div class="card-ic">⌘</div><div><div class="card-tt">决策小工具</div><div class="card-st">把命盘提示转成当下可执行的选择</div></div></div><div class="tool-grid tool-grid-full"><button class="tool-tile" type="button" onclick="openToolPage('wealth')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M8 10.5h8M8 14h6"/></svg></span><b>财运与理财罗盘</b><small>收入节奏 · 理财取向</small></button><button class="tool-tile" type="button" onclick="openToolPage('career')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17 17 5M9 5h8v8"/></svg></span><b>转行与副业测评</b><small>方向匹配 · 行动窗口</small></button><button class="tool-tile" type="button" onclick="openToolPage('date')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M7 11h10M9 15h3"/></svg></span><b>重要事项择日助手</b><small>事项提醒 · 时间建议</small></button><button class="tool-tile" type="button" onclick="openToolPage('style')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.7 5.2 2.8 7.3 8 8-5.2.7-7.3 2.8-8 8-.7-5.2-2.8-7.3-8-8 5.2-.7 7.3-2.8 8-8Z"/></svg></span><b>能量穿搭与工位风水</b><small>颜色 · 方位 · 元素</small></button><button class="tool-tile" type="button" onclick="openToolPage('layoff')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 17H3L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg></span><b>裁员风险检测</b><small>现实信号 · 行动预案</small></button><button class="tool-tile" type="button" onclick="openToolPage('daily')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-12.8-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg></span><b>今日日签</b><small>宜忌 · 节奏 · 提醒</small></button><button class="tool-tile" type="button" onclick="openToolPage('name')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14M7 5v4c0 3 2 5 5 5s5-2 5-5V5M5 19h14"/></svg></span><b>智能起名工具</b><small>用字偏好 · 名称灵感</small></button><button class="tool-tile" type="button" onclick="openToolPage('oracle')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h6m4 0h6M4 12h16M4 18h6m4 0h6"/></svg></span><b>摇签问卜</b><small>聚焦问题 · 随机启示</small></button><button class="tool-tile" type="button" onclick="openToolPage('answerbook')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-1.3 1.7-2.3 2-2.3 4"/><path d="M12 18h.01"/><circle cx="12" cy="12" r="9"/></svg></span><b>答案之书</b><small>输入问题 · 翻开答案</small></button><button class="tool-tile" type="button" onclick="openToolPage('lottery')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg></span><b>双色球 / 大乐透</b><small>娱乐选号 · 理性提示</small></button><button class="tool-tile" type="button" onclick="openToolPage('zodiac')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20v-6M12 14c-4 0-6-2.2-6-5a3 3 0 0 1 5.4-1.8A3 3 0 0 1 17 9c0 2.8-2 5-5 5Z"/></svg></span><b>生肖合冲分析</b><small>相处节奏 · 合作提醒</small></button><button class="tool-tile" type="button" onclick="openToolPage('relation')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8.5c0 4.5-8 9.5-8 9.5s-8-5-8-9.5A4 4 0 0 1 12 6a4 4 0 0 1 8 2.5Z"/></svg></span><b>八字合盘</b><small>双人信息 · 相处建议</small></button><button class="tool-tile" type="button" onclick="openToolPage('export')"><span class="tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15l3 3 3-3"/></svg></span><b>报告完整导出PDF</b><small>视觉完整版 / 纯文本版</small></button></div></div>`;
  H+=`</div>`;

  document.getElementById('p2Inner').innerHTML=H;
  // —— 唯一全局上下文（_baziData / _reportData 作兼容别名）——
  ctx.P=P;ctx.shensha=shensha;ctx.liuyue=liuyue;ctx.zw=zw;ctx.qm=qm;ctx.mh=mh;
  organizeMasterReportLayout(ctx);
  window._ctx=ctx;
  window._baziData=ctx;
  window._reportData=ctx;

  requestAnimationFrame(()=>{
    document.querySelectorAll('.wxf,.ff').forEach(el=>{setTimeout(()=>{el.style.width=el.dataset.w},200)});
    const tl=document.getElementById('daYunTl');
    if(tl){const cu=tl.querySelector('.ti.cu');if(cu){cu.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});}}
  });
}

/* ====== 信息密度优化：速读卡 + 章节导航 ====== */
export function renderBeginnerBrief(sec,d){
  let title='',portrait='',opportunity='',action='',tip='',scoreHtml='';
  if(sec==='ming'){
    const vals=Object.values(d.wx.c||{}),avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:1;
    const deviation=vals.length?vals.reduce((s,v)=>s+Math.abs(v-avg),0)/vals.length:0;
    const balance=Math.max(55,Math.min(95,Math.round(92-deviation*13)));
    scoreHtml='<div class="beginner-score"><div class="bs-head"><span>命盘平衡度</span><b>'+balance+'<small>分</small></b></div><div class="bs-track"><i style="width:'+balance+'%"></i></div><p>'+ (balance>=80?'整体能量较均衡，适合稳定发挥优势。':balance>=65?'能量有明显侧重，适合扬长并补足短板。':'能量差异较明显，先稳住节奏、补足支持更重要。')+'</p></div>';
    title=d.wx.st?'你有推进事情的魄力，也容易对自己要求很高':'你观察细致、适应力强，做事更重感受与节奏';
    portrait=d.wx.st?'你通常愿意先站出来解决问题，适合负责需要推动、协调或决断的事。压力大时，容易把责任全揽在自己身上，反而消耗精力。':'你擅长理解环境和他人的需要，适合在准备充分后持续投入。压力大时，容易想得太多、迟迟不开始，需要给自己一个明确的截止时间。';
    opportunity='你更容易在长期积累中建立优势。与其同时追很多目标，不如选一个最想提升的方向，持续把作品、经验或成果做出来。';
    action='未来两周确定一个核心目标，把它拆成三个小步骤；先完成最容易开始的那一步。';
    tip='提醒：累的时候先调整节奏，不要用“硬撑”证明自己。';
  }else if(sec==='yun'){
    scoreHtml='<div class="beginner-score year-score"><div class="bs-head"><span>今年的状态评分</span><b>'+Math.round((d.cs+d.ws+d.ls+d.hs)/4)+'<small>分</small></b></div><div class="bs-score-grid"><span>事业 <b>'+d.cs+'</b></span><span>财富 <b>'+d.ws+'</b></span><span>感情 <b>'+d.ls+'</b></span><span>健康 <b>'+d.hs+'</b></span></div></div>';
    title='今年的主线是 '+(d.cs>72?'主动向前，把机会变成成果':'稳住基础，让选择更从容');
    portrait=d.cs>72?'工作和生活中会出现值得争取的窗口。重点不是做得更多，而是把精力放到真正能带来成长、认可或收入的事情上。':'外部节奏更适合先观察和打底。把已有工作做扎实、补齐能力短板，会比仓促改变方向更有收获。';
    opportunity=d.ws>68?'收入与合作有提升空间，适合谈清价值与回报；但面对看似快速的收益时，仍要先算清风险。':'财务上以稳定和可控为先。保留安全垫、避免情绪消费，会让你在机会来临时有更多主动权。';
    action=d.cs>72?'选一件想争取的事：本周完成一次沟通、投递或提案，不把计划只留在心里。':'列出当前最重要的三件事，先清掉最影响进度的一件，再考虑新的机会。';
    tip='提醒：重要决定尽量隔一晚确认，别在疲惫或焦虑时拍板。';
  }else if(sec==='rel'){
    title='你需要的关系，是能安心表达、也能彼此成长的关系';
    portrait=d.ls>68?'近期更适合增加轻松、自然的相处。你不必急着定义关系，用稳定的互动与真实回应建立信任会更有效。':'关系中更需要把话说清楚。与其反复猜测对方的意思，不如表达自己的感受与界限，反而能减少内耗。';
    opportunity='真正适合你的人，会尊重你的节奏，也愿意沟通现实问题。比起一时的热烈，更值得观察的是对方是否言行一致。';
    action='挑一个情绪平稳的时间，真诚说出一件你的期待；用“我感到……”开头，而不是指责对方。';
    tip='提醒：亲密不等于迁就，保留自己的生活与边界会让关系更健康。';
  }else{
    title='今天适合整理节奏，把注意力收回到自己身上';
    portrait='适合推进计划、学习和整理，也适合完成那些已经拖了一阵的小事。先让生活恢复秩序，心里的焦虑通常会跟着下降。';
    opportunity='与人合作时，把目标、时间和分工讲清楚，会比反复猜测更省力。今天不必追求完美，完成比纠结更重要。';
    action='选一件拖延的小事，在 20 分钟内开始；晚上花 5 分钟写下明天最重要的一件事。';
    tip='提醒：情绪上头时，暂缓消费、争论和重要决定。';
  }
  // 新手首屏的四个数据位：每个值都附一句「这是什么意思」，
  // 避免出现「日主=辛」这类对小白毫无信息量的孤立符号。
  const YS_MEANING={
    木:'多接触成长、学习和创造性的事',
    火:'多表达、多与人连接',
    土:'把节奏放稳，重视积累',
    金:'把标准和边界定清楚',
    水:'保持灵活，多观察再动'
  };
  const DG_TRAIT={
    甲:'像大树，有主见、认准方向就往前',
    乙:'像藤蔓，柔韧、擅长借力',
    丙:'像太阳，热情、有感染力',
    丁:'像烛火，细腻、专注',
    戊:'像高山，稳重、扛得住事',
    己:'像田土，包容、善于照顾人',
    庚:'像金属，果断、执行力强',
    辛:'像珠玉，精致、对细节要求高',
    壬:'像江河，开阔、适应力强',
    癸:'像雨露，敏感、洞察力好'
  };
  const _dg=d.dg||'', _ys=d.wx?.ys||'';
  // 注意：ctx.dw 是日主五行（如「金」），不是大运；当前大运在 ctx.cDy。
  // 旧代码误用 d.dw，导致这一格恒为空。
  const _dy=d.cDy||null;
  const _dyLabel=_dy?((_dy.g||'')+(_dy.z||'')):'';
  const _dyNote=_dy&&(_dy.as!=null)?`${_dy.as}–${_dy.ae}岁这十年`:'这十年的整体基调';
  // 术语解释 v2：不再生成下划线术语（改选中→右键/长按解释），标签保持纯文本
  const _term=t=>t;
  const _cell=(label,value,note)=>
    `<div><span>${label}</span><b>${value||'—'}</b>${note?`<em class="bb-cell-note">${note}</em>`:''}</div>`;
  const basicHtml=sec==='ming'?`<div class="beginner-basic">`+
    _cell('生肖',d.b?.sx||'—','')+
    _cell(`我是什么样的人 ${_term('日主')}`,_dg?_dg+'（'+(GW[_dg]||'')+'）':'—',DG_TRAIT[_dg]||'')+
    _cell(`对我有利的方向 ${_term('用神')}`,_ys?_ys+'元素':'—',YS_MEANING[_ys]||'')+
    _cell(`当前人生阶段 ${_term('大运')}`,_dyLabel||'—',_dy?_dyNote:'')+
  `</div>`:'';
  const _style=getResultStyle(d.input?.resultStyle);
  if(_style.label==='严谨型'){
    tip='判读边界：以上是规则模型下的倾向，不等于事件概率；请用事实、数据和时间验证。';
    action='先写下依据、未知项和可验证信号；等收集到新信息后，再做一次小范围调整。';
  }else if(_style.label==='传统型'){
    tip='传统口径：以下以日主、月令、十神与用神为主线，流派不同可能有不同取法。';
    action='回看本节提到的日主、月令和用神，把术语各写成一句自己的白话，再决定如何应用。';
  }else if(_style.label==='建议型'){
    tip='行动提醒：不要一次处理太多事，先完成最影响结果的那一步。';
    action='只选一个优先事项：明确目标、设定截止时间，并在今天完成一个可交付的小动作。';
  }
  const _styleBanner=`<div class="result-style-banner"><b>${_style.label}</b><span>${_style.intro}</span></div>`;
  return `<div class="beginner-brief"><div class="bb-eyebrow">新手解读报告</div>${_styleBanner}${basicHtml}<div class="bb-title">${title}</div>${scoreHtml}<div class="bb-row"><div class="bb-label">你现在的状态</div><div class="bb-text">${portrait}</div></div><div class="bb-row"><div class="bb-label">对你有利的方向</div><div class="bb-text">${opportunity}</div></div><div class="bb-row"><div class="bb-label">接下来怎么做</div><div class="bb-text bb-action">${action}</div></div><div class="bb-note">${tip}</div><button class="bb-master" type="button" onclick="setUserMode('master')">查看完整专业依据　→</button></div>`;
}
export function organizeMasterReportLayout(ctx){
  const ming=document.getElementById('s-ming'),yun=document.getElementById('s-yun');
  if(!ming||!yun)return;
  // 命盘一览：将原速读标题调整为信息总览。
  const overview=ming.querySelector('.qr-title');if(overview)overview.textContent='命盘一览';
  // AI 摘要成为「命盘一览」的一部分，直接完整展示，不再额外展开。
  const overviewCard=ming.querySelector('.qr-card'),aiSum=ming.querySelector('.ai-sum');
  if(overviewCard&&aiSum){
    aiSum.classList.remove('glass','card-1','collapsible');aiSum.classList.add('overview-ai','expanded');
    const toggle=aiSum.querySelector('.ai-sum-toggle');if(toggle)toggle.remove();
    const acts=overviewCard.querySelector('.qr-acts');
    if(acts)acts.insertAdjacentElement('afterend',aiSum);else overviewCard.appendChild(aiSum);
  }
  // 命盘结构：四柱、五行、细盘、十神收进一个结构化主卡。
  const bazi=ming.querySelector('[data-card="bazi"]'),wuxing=ming.querySelector('[data-card="wuxing"]');
  const persona=ming.querySelector('[data-card="persona"]');
  if(bazi&&wuxing&&persona&&!ming.querySelector('.master-structure')){
    const structure=document.createElement('section');
    structure.className='glass card-1 master-structure';structure.dataset.card='structure';
    structure.innerHTML='<div class="card-hd"><div class="card-ic">⌘</div><div><div class="card-tt">命盘结构</div><div class="card-st">四柱、五行、细盘与十神关系</div></div></div><div class="structure-tabs" role="tablist"><button class="structure-tab active" type="button" data-structure="pillars" onclick="switchStructureTab(this)">四柱</button><button class="structure-tab" type="button" data-structure="elements" onclick="switchStructureTab(this)">五行</button><button class="structure-tab" type="button" data-structure="detail" onclick="switchStructureTab(this)">细盘</button><button class="structure-tab" type="button" data-structure="gods" onclick="switchStructureTab(this)">十神</button></div><div class="structure-panes"></div>';
    const grid=structure.querySelector('.structure-panes');
    const makePane=(key,node,active=false)=>{const pane=document.createElement('div');pane.className='structure-pane'+(active?' active':'');pane.dataset.structure=key;node.classList.add('structure-subcard');node.setAttribute('data-no-collapse','1');pane.appendChild(node);grid.appendChild(pane);};
    makePane('pillars',bazi,true);makePane('elements',wuxing);
    const details=document.createElement('div');details.className='structure-mini structure-subcard';
    const termLabel=t=>t;
    const finePillars=[['年柱',ctx.b.Y,ctx.ss.yg],['月柱',ctx.b.M,ctx.ss.mg],['日柱',ctx.b.D,'日主'],['时柱',ctx.b.H,ctx.ss.hg]];
    const fineTable='<table class="fine-table"><thead><tr><th>四柱</th>'+finePillars.map(x=>'<th>'+x[0]+'</th>').join('')+'</tr></thead><tbody><tr><td>天干</td>'+finePillars.map(x=>'<td class="fine-gan" style="color:'+WC[GW[x[1].g]]+'">'+x[1].g+'</td>').join('')+'</tr><tr><td>地支</td>'+finePillars.map(x=>'<td class="fine-zhi" style="color:'+WC[ZW[x[1].z]]+'">'+x[1].z+'</td>').join('')+'</tr><tr><td>'+termLabel('十神')+'</td>'+finePillars.map(x=>'<td>'+x[2]+'</td>').join('')+'</tr><tr><td>'+termLabel('五行')+'</td>'+finePillars.map(x=>'<td>'+GW[x[1].g]+' / '+ZW[x[1].z]+'</td>').join('')+'</tr><tr><td>'+termLabel('藏干')+'</td>'+finePillars.map(x=>'<td class="fine-hidden">'+(ZC[x[1].z]||[]).map(g=>g+'·'+(SS[ctx.dg][g]||'')).join('<br>')+'</td>').join('')+'</tr></tbody></table>';
    const shenSha=(ctx.shensha||[]).map(x=>x.n||x.t||x).filter(Boolean).slice(0,8).join('、')||'—';
    details.innerHTML='<div class="structure-mini-tt">细盘</div><div class="structure-mini-bd"><div class="fine-summary"><div><span>'+termLabel('日主')+'</span><b>'+ctx.dg+ctx.dw+'</b></div><div><span>旺衰</span><b>'+termLabel((ctx.wx&&ctx.wx.st)?'身旺':'身弱')+'</b></div><div><span>'+termLabel('月令')+'</span><b>'+ctx.si.s+'令 · '+ctx.si.st+'</b></div><div><span>'+termLabel('用神')+'</span><b style="color:'+WC[ctx.wx.ys]+'">'+ctx.wx.ys+'</b></div></div><div class="fine-section-label">四柱细项</div><div class="fine-table-wrap">'+fineTable+'</div><div class="fine-section-label">命局辅助信息</div><div class="fine-extra"><div><span>喜神</span><b>'+ctx.wx.xs+'</b></div><div><span>纳音</span><b>'+ctx.b.ny+'</b></div><div><span>神煞</span><b>'+shenSha+'</b></div><div><span>当前大运 / 流年</span><b>'+ctx.cDy.g+ctx.cDy.z+' / '+ctx.cLn.g+ctx.cLn.z+'</b></div></div><div class="mini-note">以日主为中心，结合月令、藏干、十神及五行分布进行综合判断；当前取向是借力 <b style="color:'+WC[ctx.wx.ys]+'">'+ctx.wx.ys+'</b> 属性，让整体能量更平衡。</div></div>';
    // 十神以日主为参照：严格区分同/异阴阳、天干透出与地支藏干层级。
    const godDefinitions={
      比肩:{relation:'同我·同阴阳',group:'比劫',meaning:'自我意志、同辈协作与平等竞争'},
      劫财:{relation:'同我·异阴阳',group:'比劫',meaning:'同侪竞争、资源分配与行动魄力'},
      食神:{relation:'我生·同阴阳',group:'食伤',meaning:'稳定输出、技能沉淀与生活感受'},
      伤官:{relation:'我生·异阴阳',group:'食伤',meaning:'创新表达、突破意识与批判思考'},
      偏财:{relation:'我克·同阴阳',group:'财星',meaning:'机会资源、经营意识与流动性收益'},
      正财:{relation:'我克·异阴阳',group:'财星',meaning:'日常收入、执行兑现与稳定积累'},
      七杀:{relation:'克我·同阴阳',group:'官杀',meaning:'挑战压力、执行魄力与风险意识'},
      正官:{relation:'克我·异阴阳',group:'官杀',meaning:'规则责任、职业秩序与边界感'},
      偏印:{relation:'生我·同阴阳',group:'印星',meaning:'独特学习、洞察研究与非标准路径'},
      正印:{relation:'生我·异阴阳',group:'印星',meaning:'学习支持、资格资源与稳定助力'}
    };
    const godPositions={};Object.keys(godDefinitions).forEach(k=>godPositions[k]={visible:[],hidden:[]});
    const stemPositions=[['年干',ctx.b.Y.g,ctx.ss.yg],['月干',ctx.b.M.g,ctx.ss.mg],['时干',ctx.b.H.g,ctx.ss.hg]];
    stemPositions.forEach(([pos,gan,god])=>{if(godPositions[god])godPositions[god].visible.push({pos,gan});});
    finePillars.forEach(([name,pillar])=>{
      (ZC[pillar.z]||[]).forEach((gan,index)=>{
        const god=SS[ctx.dg][gan];
        if(godPositions[god])godPositions[god].hidden.push({pos:name+'支',gan,level:['主气','中气','余气'][index]||'藏干',weight:[2,1.2,.7][index]||.7});
      });
    });
    const godRows=Object.entries(godDefinitions).map(([god,meta])=>{
      const pos=godPositions[god];
      const evidence=pos.visible.length*3+pos.hidden.reduce((sum,item)=>sum+item.weight,0);
      const state=pos.visible.length&&pos.hidden.length?'透干·有根':pos.visible.length?'透干':pos.hidden.length?'藏支':'未现';
      const tier=state==='未现'?'未见':evidence>=5?'显著':pos.visible.length?'可见':'潜藏';
      const stemText=pos.visible.length?'天干：'+pos.visible.map(x=>x.pos+'('+x.gan+')').join('、'):'';
      const branchText=pos.hidden.length?'地支：'+pos.hidden.map(x=>x.pos+'·'+x.level+'('+x.gan+')').join('、'):'';
      const where=[stemText,branchText].filter(Boolean).join('<br>')||'—';
      return '<tr class="'+(state==='未现'?'muted':'')+'"><td style="color:var(--ac-text);font-weight:600">'+termLabel(god)+'<small class="god-group">'+meta.group+'</small></td><td>'+meta.relation+'</td><td><b class="god-state '+(state==='未现'?'is-none':'')+'">'+state+'</b><small>'+tier+'</small></td><td class="god-location">'+where+'</td><td class="god-meaning">'+meta.meaning+'</td></tr>';
    }).join('');
    const gods=document.createElement('div');gods.className='structure-mini structure-subcard';
    gods.innerHTML='<div class="structure-mini-tt">十神</div><div class="structure-mini-bd"><div class="god-core-grid"><div><span>年干</span><b>'+termLabel(ctx.ss.yg)+'</b></div><div><span>月干</span><b>'+termLabel(ctx.ss.mg)+'</b></div><div><span>日主</span><b>'+ctx.dg+ctx.dw+'</b></div><div><span>时干</span><b>'+termLabel(ctx.ss.hg)+'</b></div></div><div class="god-method-note"><b>判读口径</b><span>以日主「'+ctx.dg+ctx.dw+'」为唯一参照，按五行生克与阴阳同异定十神；天干为“透干”，地支按主气／中气／余气记录。呈现层级仅说明本命盘出现位置，不替代旺衰、月令、通根、合冲及大运流年的综合判断。</span></div><button class="full-gods-btn" type="button" onclick="toggleFullGods(this)">查看完整十神 <span>▾</span></button><div class="full-gods" style="display:none;margin-top:9px;"><div class="fine-table-wrap god-table-wrap"><table class="fine-table god-table"><thead><tr><th>十神</th><th>五行关系</th><th>出现层级</th><th>位置（含藏干）</th><th>核心释义</th></tr></thead><tbody>'+godRows+'</tbody></table></div><div class="god-disclaimer">注：十神是传统命理中的关系模型，不等同于现实事件或人格定论；实际判断须结合命局整体与现实条件。</div></div></div>';
    makePane('detail',details);makePane('gods',gods);ming.insertBefore(structure,persona);
  }
  // 推理依据链：让大师版的结论有可回看的推导路径。
  if(persona&&!ming.querySelector('[data-card="reasoning"]')){
    const engine=ctx.tjx||{},strength=engine.strength||{},yong=engine.yongShen||{},pattern=engine.pattern||{};
    const adjust=engine.tiaoHou||{},ints=engine.interactions||{};
    const interactionBits=[];
    if((ints.gan_he||[]).length)interactionBits.push('天干合 '+ints.gan_he.length+' 组');
    if((ints.zhi_he||[]).length)interactionBits.push('地支合 '+ints.zhi_he.length+' 组');
    if((ints.zhi_chong||[]).length)interactionBits.push('地支冲 '+ints.zhi_chong.length+' 组');
    if((ints.zhi_xing||[]).length)interactionBits.push('刑 '+ints.zhi_xing.length+' 组');
    if((ints.zhi_hai||[]).length)interactionBits.push('害 '+ints.zhi_hai.length+' 组');
    const interactionText=interactionBits.length?interactionBits.join('；'):'本命四柱未见显著合冲刑害记录';
    const yongReasons=(yong.reasons||[]).slice(0,3).join('；')||'以命局平衡与实际表现综合判断';
    const chain=document.createElement('section');chain.className='glass card-2 reasoning-card';chain.dataset.card='reasoning';
    chain.innerHTML='<div class="card-hd"><div class="card-ic">⌘</div><div><div class="card-tt">命局判读依据</div><div class="card-st">按日主、月令、旺衰、十神与干支互动逐项复核</div></div></div>'
      +'<div class="reason-chain professional-chain"><span>日主定位</span><i>→</i><span>月令与旺衰</span><i>→</i><span>扶抑／调候</span><i>→</i><span>十神与互动</span><i>→</i><span>用神取向</span></div>'
      +'<div class="reason-evidence"><span>日主：<b>'+ctx.dg+ctx.dw+'</b></span><span>月令：<b>'+ctx.b.M.z+'月 · '+ctx.si.s+'令</b></span><span>格局：<b>'+((pattern.main)||((ctx.pa&&ctx.pa.join('、'))||'待综合'))+'</b></span><span>主用：<b style="color:'+WC[(yong.primary||ctx.wx.ys)]+'">'+(yong.primary||ctx.wx.ys)+'</b></span></div>'
      +'<div class="reason-list professional-reason-list">'
      +'<div><b>01 · 参照基点</b><span>以日主 <em>'+ctx.dg+ctx.dw+'</em> 为判断中心；月支 <em>'+ctx.b.M.z+'</em> 为当令环境。十神、五行及干支关系均以此为参照，不以单一生肖或单柱下结论。</span></div>'
      +'<div><b>02 · 旺衰与季节</b><span>旺衰模型结论为 <em>'+(strength.label||((ctx.wx&&ctx.wx.st)?'偏旺':'偏弱'))+'</em>'+(typeof strength.score==='number'?'（综合分 '+strength.score+'）':'')+'；结合得令、得地、得势等维度评估。月令调候参考：'+(adjust.primary?'优先取 <em>'+adjust.primary+'</em>'+(adjust.secondary?'，辅取 <em>'+adjust.secondary+'</em>':''):'以五行平衡为主')+'。</span></div>'
      +'<div><b>03 · 十神与结构</b><span>格局识别为 <em>'+(pattern.main||((ctx.pa&&ctx.pa.join('、'))||'待综合'))+'</em>'+(pattern.type?'（'+pattern.type+'）':'')+'。十神的透干、藏支、通根及所处柱位需配合查看；它描述关系结构，不直接等同于具体人物、财富或事件。</span></div>'
      +'<div><b>04 · 干支互动校验</b><span>'+interactionText+'。合、冲、刑、害仅作为结构变量参与判断，须与月令、用神及实际时间条件一并核对，不单独判吉凶。</span></div>'
      +'<div><b>05 · 取用与应用边界</b><span>当前以 <em style="color:'+WC[(yong.primary||ctx.wx.ys)]+'">'+(yong.primary||ctx.wx.ys)+'</em> 为主取向'+(yong.secondary?'，'+yong.secondary+' 为辅助':'')+'；依据：'+yongReasons+'。该取向用于整理行动节奏与观察重点，不替代健康、法律、财务等专业判断。</span></div>'
      +'</div>';
    const threeStyles=ming.querySelector('[data-card=\"three-styles\"]');
    if(threeStyles)threeStyles.insertAdjacentElement('afterend',chain);else persona.insertAdjacentElement('afterend',chain);
  }
  // 运势页已按 年/月/周/日 档位组织（.yun-pane），大师模式不再重排卡片，
  // 只保留标题改写与"当前时段"注入；兜底：若有卡片跑出档位面再收回。
  const trend=yun.querySelector('[data-card="trend"]'),timeline=yun.querySelector('[data-card="timeline"]'),focus=yun.querySelector('[data-card="todayAdv"]'),months=yun.querySelector('[data-card="liuyue"]');
  if(trend){const title=trend.querySelector('.card-tt');if(title)title.textContent='当年运势';}
  if(timeline){const tt=timeline.querySelector('.card-tt');if(tt)tt.textContent='人生时间线';}
  if(focus){
    const title=focus.querySelector('.card-tt');if(title)title.textContent='今日建议 · 当下关注';
    const st=focus.querySelector('.card-st');if(st)st.textContent='宜忌 · 近期提醒 · 健康关注';
    if(!focus.querySelector('.flow-now')){
      const hour=new Date().getHours(),hourIndex=Math.floor(((hour+1)%24)/2);
      const hourZhi=DZ[hourIndex],fav=ctx.wx.ys==='木'?'3–7 点':ctx.wx.ys==='火'?'9–13 点':ctx.wx.ys==='土'?'7–9 点或 13–15 点':ctx.wx.ys==='金'?'15–19 点':'21–1 点';
      const flow=document.createElement('div');flow.className='flow-now';
      flow.innerHTML='<div><span>当前时段</span><b>'+hourZhi+'时</b></div><div><span>适合安排</span><b>'+((hour>=9&&hour<18)?'沟通、推进、处理要事':'复盘、整理、放松恢复')+'</b></div><div><span>有利时段</span><b>'+fav+'</b></div>';
      focus.querySelector('.focus-tabs').insertAdjacentElement('beforebegin',flow);
    }
  }
  [trend,timeline,focus,months].filter(c=>c&&!c.closest('.yun-pane')).forEach(card=>yun.appendChild(card));

  // 关系页：以关系速读为入口，补齐亲密、朋友、亲人三类关系画像。
  const rel=document.getElementById('s-rel');
  if(rel&&!rel.querySelector('.relation-profile')){
    const relQuick=rel.querySelector('.qr-title');if(relQuick)relQuick.textContent='关系速读';
    const p=(ctx.P&&ctx.P[ctx.dg])||{};
    const style=typeof getRelationMode==='function'?getRelationMode(ctx.dg,ctx.ss,ctx.gen):'重视真诚与稳定的相处';
    const strong=ctx.wx.st?'习惯主动承担、推动关系进展':'习惯照顾他人感受、配合关系节奏';
    const pillars=[['年柱',ctx.b.Y,ctx.ss.yg],['月柱',ctx.b.M,ctx.ss.mg],['日柱',ctx.b.D,'日主'],['时柱',ctx.b.H,ctx.ss.hg]];
    const locateRoles=roles=>{const hit=[];pillars.forEach(([name,pillar,role])=>{if(roles.includes(role))hit.push(name+'天干');(ZC[pillar.z]||[]).forEach(g=>{if(roles.includes(SS[ctx.dg][g]))hit.push(name+'地支');});});return hit.length?hit.join('、'):'命盘中未明显出现';};
    const partnerRoles=ctx.gen==='male'?['正财','偏财']:['正官','七杀'];
    const partnerLabel=ctx.gen==='male'?'财星（伴侣信息）':'官杀（伴侣信息）';
    const partnerPos=locateRoles(partnerRoles),friendPos=locateRoles(['比肩','劫财']),familyPos=locateRoles(['正印','偏印']);
    const labels=(ctx.shensha||[]).map(x=>x.n||x.t||x).join('、');
    const peach=/(桃花|红艳|天喜|咸池)/.test(labels)?'有桃花类辅助信息':'未见明显桃花类辅助信息';
    const profile=document.createElement('section');profile.className='glass card-1 relation-profile';profile.dataset.card='intimacy';
    profile.innerHTML='<div class="card-hd"><div class="card-ic">亲</div><div><div class="card-tt">亲密关系画像</div><div class="card-st">你的表达方式、关系需求与相处建议</div></div></div><div class="relation-block"><div><span>关系模式</span><b>'+style+'</b></div><p>'+((p.love)||'重视真实回应与长期陪伴，希望在关系中获得理解与安全感。')+'</p></div><div class="relation-grid"><div><span>你的倾向</span><p>'+strong+'。</p></div><div><span>更适合的关系</span><p>尊重节奏、愿意沟通，也能把承诺落实到行动。</p></div></div><div class="relation-data"><span>命盘依据</span><b>'+partnerLabel+'：'+partnerPos+'</b><b>关系辅助：'+peach+'</b><b>当前感情评分：'+ctx.ls+' / 100</b></div><div class="relation-tip">相处建议：先表达感受与需求，再讨论解决方案；不要用猜测代替沟通。</div>';
    const friends=document.createElement('section');friends.className='glass card-1 relation-profile';friends.dataset.card='friends';
    friends.innerHTML='<div class="card-hd"><div class="card-ic">友</div><div><div class="card-tt">朋友关系</div><div class="card-st">社交风格、合作边界与值得经营的人际连接</div></div></div><div class="relation-block"><div><span>社交底色</span><b>'+((p.social)||'重视可靠和长期互信，倾向在熟悉的人群中建立深度连接。')+'</b></div></div><div class="relation-grid"><div><span>你的优势</span><p>'+((ctx.wx.st)?'愿意出面承担、在团队中有推动力。':'善于倾听和协调，能照顾不同人的感受。')+'</p></div><div><span>需要留意</span><p>'+((ctx.wx.st)?'别把所有事都扛下来，合作前先明确分工。':'别因不想拒绝而透支自己，边界清晰反而更长久。')+'</p></div></div><div class="relation-data"><span>命盘依据</span><b>比劫（同辈 / 合作）：'+friendPos+'</b><b>五行状态：'+(ctx.wx.st?'自身能量偏强，合作中易主导':'自身能量偏弱，更适合借力协作')+'</b><b>当前事业评分：'+ctx.cs+' / 100</b></div><div class="relation-tip">经营建议：优先维系能互相支持、价值观接近的朋友；金钱与合作事项提前说清规则。</div>';
    const family=document.createElement('section');family.className='glass card-1 relation-profile';family.dataset.card='family';
    family.innerHTML='<div class="card-hd"><div class="card-ic">家</div><div><div class="card-tt">亲人关系</div><div class="card-st">家庭互动、责任感与更舒服的沟通方式</div></div></div><div class="relation-block"><div><span>家庭互动</span><b>'+((ctx.wx.st)?'你容易承担家庭中的责任与期待，也会希望自己的决定被理解。':'你很在意家庭氛围与亲人的感受，习惯先照顾整体和谐。')+'</b></div></div><div class="relation-grid"><div><span>相处优势</span><p>重视情义和长期陪伴，遇到重要事情愿意为家人投入时间。</p></div><div><span>成长课题</span><p>'+((ctx.wx.st)?'练习在承担之前先沟通边界，不必独自解决所有问题。':'练习直接表达自己的想法，不必为了和气一直压下需求。')+'</p></div></div><div class="relation-data"><span>命盘依据</span><b>印星（长辈 / 支持）：'+familyPos+'</b><b>月令状态：'+ctx.si.s+'令 · '+ctx.si.st+'</b><b>当前健康评分：'+ctx.hs+' / 100</b></div><div class="relation-tip">沟通建议：谈重要议题时先确认彼此关心的目标，再讨论具体做法，减少“谁对谁错”的拉扯。</div>';
    // 旧关系工具不纳入新的四段式主阅读流，保留数据但不干扰本页结构。
    // 旧关系工具不纳入四段式主阅读流；但「八字合盘」是真实排盘功能，保留并置于画像之后。
    rel.querySelectorAll('[data-card="loveMode"],[data-card="loveMatch"],[data-card="loveRisk"],[data-card="layoffRisk"]').forEach(el=>el.remove());
    const relAiCard=rel.querySelector('[data-card="relAi"]');
    const anchor=rel.querySelector('.beginner-brief')||rel.querySelector('.qr-card');
    if(anchor)anchor.insertAdjacentElement('afterend',profile);else rel.prepend(profile);
    profile.insertAdjacentElement('afterend',friends);friends.insertAdjacentElement('afterend',family);
    if(relAiCard)family.insertAdjacentElement('afterend',relAiCard);
  }
}
export function switchStructureTab(btn){
  const card=btn.closest('.master-structure,.three-styles-card');if(!card)return;
  const key=btn.dataset.structure;
  card.querySelectorAll('.structure-tab').forEach(tab=>tab.classList.toggle('active',tab===btn));
  card.querySelectorAll('.structure-pane').forEach(pane=>pane.classList.toggle('active',pane.dataset.structure===key));
}
export function toggleFullGods(btn){
  const panel=btn.parentElement.querySelector('.full-gods');if(!panel)return;
  const open=panel.classList.toggle('open');
  if(open) { panel.style.display = 'block'; } else { panel.style.display = 'none'; }
  btn.classList.toggle('open',open);
  btn.firstChild.textContent=open?'收起完整十神 ':'查看完整十神 ';
}
export function renderQuickRead(secKey,d){
  if(!d)return '';
  const dg=d.dg,wx=d.wx,cDy=d.cDy,cLn=d.cLn,cLm=d.cLm;
  const items=[];
  if(secKey==='ming'){
    items.push({l:'日主',v:dg+wx.dw,c:wx.dw});
    items.push({l:'强弱',v:wx.st?'身旺':'身弱'});
    items.push({l:'用神',v:wx.ys,c:wx.ys});
    items.push({l:'格局',v:(d.pa&&d.pa[0])||'平和'});
    // 将原命盘摘要直接并入「命盘一览」的说明行，不再生成独立摘要模块。
    const persona=getPersona(dg,wx,wx.st,d.ss||{});
    const phase=(d.age||0)<28?'前期积累':(d.age||0)<38?'突破发力':(d.age||0)<48?'沉淀守成':'影响力期';
    const direction=wx.st?'适合把判断转为行动，在关键节点主动争取':'适合先借助资源与协作，再稳步推进自己的计划';
    const summary='命局以「<b>'+dg+wx.dw+'</b>」为本，'+(wx.st?'气场刚强宜主动':'气场柔顺宜借力')+'，关键在用神「<b style="color:'+WC[wx.ys]+'">'+wx.ys+'</b>」的把握。'+persona.思维+'；目前处于<b>'+phase+'</b>，'+direction+'，重点是保持稳定节奏，不必频繁改变方向。';
    return _qrCard('命盘速读',items,summary,[
      {k:'bazi',t:'查看四柱→'},{k:'wuxing',t:'五行结构→'},{k:'ziwei',t:'三式合参→'}
    ]);
  }
  if(secKey==='yun'){
    items.push({l:'流年',v:cLn?cLn.g+cLn.z:'-',c:cLn?GW[cLn.g]:''});
    items.push({l:'十神',v:d.cLnSS||'-'});
    items.push({l:'事业',v:d.cs+'分'});
    items.push({l:'财运',v:d.ws+'分'});
    const tone=d.cs>72?'势能向上':d.cs>55?'平稳推进':'守势为主';
    const summary='今年「<b>'+(cLn?cLn.g+cLn.z:'-')+'</b>」流年十神「<b>'+d.cLnSS+'</b>」，整体'+tone+'。当前大运「<b>'+cDy.g+cDy.z+'</b>」（'+cDy.as+'~'+cDy.ae+'岁）'+(d.cDySS.includes('财')?'，财路已开':d.cDySS.includes('官')?'，仕途明朗':d.cDySS.includes('印')?'，宜学养沉淀':'，宜稳中求进')+'。';
    return _qrCard('运势速读',items,summary,[
      {k:'trend',t:'四维评分→'},{k:'dayun',t:'大运时间轴→'},{k:'liuyue',t:'本月详解→'}
    ]);
  }
  if(secKey==='rel'){
    const star=d.gen==='male'?'财星(妻)':'官星(夫)';
    const hasPeach=d.shensha&&d.shensha.some(x=>x.n==='桃花'||x.n==='红艳');
    items.push({l:'配偶星',v:star});
    items.push({l:'桃花',v:hasPeach?'命带':'不显'});
    items.push({l:'感情节奏',v:wx.st?'主导型':'迁就型'});
    items.push({l:'流年合婚',v:d.cLnSS.includes(d.gen==='male'?'财':'官')?'利结合':'宜深耕'});
    const summary='你的'+star+'代表伴侣特质，性格上属于「<b>'+(wx.st?'主导型':'迁就型')+'</b>」。'+(hasPeach?'命带桃花，异性缘充足但需筛选；':'桃花不显，缘分多来自熟人介绍；')+(d.cLnSS.includes(d.gen==='male'?'财':'官')?'今年配偶星到位，未婚利结合。':'今年感情节奏偏稳，宜深耕已有关系。');
    return _qrCard('关系速读',items,summary,[
      {k:'loveMode',t:'相处模式→'},{k:'loveMatch',t:'适合对象→'}
    ]);
  }
  return '';
}
export function _qrCard(title,items,summary,actions){
  const itemsHtml=items.map(it=>`<div class="qr-item"><div class="qr-l">${it.l}</div><div class="qr-v"${it.c&&WC[it.c]?' style="color:'+WC[it.c]+'"':''}>${it.v}</div></div>`).join('');
  const actsHtml=(actions||[]).map(a=>`<button class="qr-act" onclick="jumpTo(null,'${a.k}')">${a.t}</button>`).join('');
  // 速读卡可折叠：头部整行可点，右侧箭头指示状态
  return `<div class="qr-card"><button type="button" class="qr-head" onclick="TJToggleQuickRead(this)" aria-expanded="true"><span class="qr-badge">速读</span><span class="qr-title">${title}</span><span class="qr-toggle" aria-hidden="true"></span></button><div class="qr-body"><div class="qr-body-inner"><div class="qr-grid">${itemsHtml}</div><div class="qr-summary">${summary}</div><div class="qr-acts">${actsHtml}</div></div></div></div>`;
}

export function buildAISummary(b,wx,ss,dy,ln,pa,P,gen,si,age){
  // —— 与 renderAll 共享 ctx，保证 AI 摘要与界面显示完全一致 ——
  const _c=getCtx();
  const cDy=(_c&&_c.cDy)||TJ.findDaYun(dy,age);
  const cLn=(_c&&_c.cLn)||TJ.findLiuNian(ln,CURR_YEAR);
  const dg=b.D.g;
  const persona=P[dg]||P['甲'];
  const phase=age<28?'前期积累':age<38?'突破发力':age<48?'沉淀守成':'影响力期';
  return`你属于典型的「<span class="hl">${wx.ys}${wx.st?'成长型':'滋养型'}</span>命格」。${persona.core.substring(0,20)}。前期${age<30?'积累较慢，但30岁后':'有所积累，'}<span class="hl">${phase}</span>事业运${cDy.g===wx.ys?'明显增强':'趋于稳健'}。<br><br>适合：<br>· ${persona.career.split('、').slice(0,3).join('、')}<br><br>当前阶段最需要：<span class="hl">稳定节奏，而不是频繁改变方向</span>。${wx.st?'身旺能担财官，宜主动出击':'身弱喜印比扶身，宜借势借力'}。`;
}

export function calcRelation(){
  const d=window._baziData;if(!d)return;
  const rd=document.getElementById('rDate').value;
  if(!rd)return showToast('请填写对方出生日期');
  const hourSel=document.getElementById('rHour')?document.getElementById('rHour').value:'';
  const [y2,m2,d02]=rd.split('-').map(Number);
  if(!y2||!m2||!d02)return showToast('出生日期格式有误');
  const hourZhi=(hourSel===''||hourSel==null)?null:Number(hourSel);

  let r;
  try{
    r=calcSynastry({myChart:d.b,myPillars:['Y','M','D','H'],myYongShen:d.wx.ys,
                    partner:{y:y2,m:m2,d:d02,hourZhi}});
  }catch(e){console.error('synastry failed',e);return showToast('合盘计算失败');}

  const label=r.score>=80?'契合度高':r.score>=65?'整体顺畅':r.score>=50?'有合有冲':r.score>=35?'需要磨合':'差异明显';
  const gColor=r.score>=80?'var(--c-green)':r.score>=65?'var(--c-teal)':r.score>=50?'var(--c-yellow)':r.score>=35?'var(--c-orange)':'var(--c-red)';
  const pb=r.partnerChart;
  const partnerGZ=r.partnerPillars.map(k=>pb[k].g+pb[k].z).join(' ');

  let H=`<div class="glass card-2"><div class="card-hd"><div class="card-ic">合</div><div><div class="card-tt">八字合盘结果</div><div class="card-st">日主 · 五行互补 · 干支刑冲合害</div></div></div>`;
  H+=`<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px"><div style="flex:1"><div style="font-size:1.8em;font-weight:600;color:${gColor}">${r.score}<span style="font-size:.5em">分</span></div><div style="font-size:.78em;color:var(--c-text-3)">${label}</div></div><div style="flex:2"><div class="hh-bar"><div class="hh-fill" style="width:0%;background:${gColor}" data-w="${r.score}%"></div></div><div style="font-size:.72em;color:var(--c-text-3);margin-top:6px">${r.counts.he} 处相合 · ${r.counts.chong} 处相冲${r.counts.other?' · '+r.counts.other+' 处刑害':''}</div></div></div>`;

  H+=`<div class="ig" style="margin-bottom:10px">`+
     [['你的四柱',[d.b.Y,d.b.M,d.b.D,d.b.H].map(x=>x.g+x.z).join(' ')],
      [r.precision==='full'?'对方四柱':'对方三柱',partnerGZ+(r.precision==='day'?'（时辰不详）':'')]]
     .map(x=>`<div class="ii"><div class="il">${x[0]}</div><div class="iv">${x[1]}</div></div>`).join('')+`</div>`;

  H+=`<div class="at"><h4>日主关系 · ${r.dm.myDayGan} 见 ${r.dm.theirDayGan}（${r.dm.ss}）</h4><p><span class="hl">${r.dm.title}</span>　${r.dm.desc}</p>`;

  const dp=r.dayPair,dn=[];
  if(dp.same)dn.push('双方<span class="hl">日柱相同</span>，价值观与节奏高度接近，容易一拍即合，也容易同时陷入同一个盲区。');
  if(dp.heZhi)dn.push('<span class="hl">日支六合</span>——合婚中最被看重的一项，日常相处自然合拍。');
  if(dp.heGan)dn.push('<span class="hl">日干相合</span>，表达与决策方式容易同步。');
  if(dp.chongZhi)dn.push('<span class="hl">日支相冲</span>，夫妻宫直接对冲：不代表不合适，但生活习惯差别大，需要明确规则而非靠默契。');
  if(dp.chongGan)dn.push('<span class="hl">日干相冲</span>，容易在观点上针锋相对。');
  if(dp.haiZhi)dn.push('<span class="hl">日支相害</span>，易因小事累积不满，要有及时说开的习惯。');
  if(dn.length)H+=`<h4>夫妻宫（日柱）</h4><p>${dn.join('<br>')}</p>`;

  H+=`<h4>五行互补 · 你的用神「${r.comp.yongShen}」</h4><p>${r.comp.text}</p>`;

  if(r.positives.length)H+=`<h4>相合之处</h4><p>${r.positives.slice(0,4).map(h=>'· '+h.text+'（'+h.where+'）').join('<br>')}</p>`;
  if(r.frictions.length)H+=`<h4>需要留意</h4><p>${r.frictions.slice(0,4).map(h=>'· '+h.text+'（'+h.where+'）').join('<br>')}</p>`;

  if(r.precision==='day')H+=`<h4>关于精度</h4><p>未填对方时辰，本次用<span class="hl">年月日三柱</span>比对。日柱（夫妻宫）不依赖时辰，仍为精确计算，核心结论成立；缺少的时柱主要影响子女宫与晚年节奏的判断。</p>`;

  H+=`</div><div class="layoff-disclaimer">合盘用于理解彼此差异、找到沟通方式，不预测关系结局，也不构成是否开始或结束一段关系的建议。</div></div>`;
  document.getElementById('relResult').innerHTML=H;
  requestAnimationFrame(()=>{document.querySelectorAll('.hh-fill').forEach(el=>setTimeout(()=>el.style.width=el.dataset.w,150));});
}

/* 画布颜色跟随明暗主题 */
function _isDark(){return document.documentElement.getAttribute('data-theme')==='dark';}
function _gridLine(){return _isDark()?'rgba(245,244,238,.10)':'rgba(20,20,19,.08)';}
function _axisText(){return _isDark()?'rgba(245,244,238,.45)':'rgba(20,20,19,.42)';}

export function drawCurve(data,dys,age){
  const cv=document.getElementById('cvC');if(!cv)return;
  if(!cv.offsetParent){setTimeout(()=>drawCurve(data,dys,age),50);return;}
  if(!data||!data.length||data.length<2)return;
  const dpr=window.devicePixelRatio||1;const rect=cv.getBoundingClientRect();
  const cssW=Math.max(1,Math.round(rect.width)),cssH=170;
  if(cv.width!==Math.round(cssW*dpr)||cv.height!==Math.round(cssH*dpr)){cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);cv.style.width=cssW+'px';cv.style.height=cssH+'px';}
  const ctx=cv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.scale(dpr,dpr);
  const w=cssW,h=cssH;const p={t:14,b:26,l:30,r:14},cw=w-p.l-p.r,ch=h-p.t-p.b;
  [0,50,100].forEach(v=>{const y=p.t+ch-(v/100)*ch;ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.strokeStyle=_gridLine();ctx.stroke()});
  const grad=ctx.createLinearGradient(0,p.t,0,h-p.b);const _ac=window._accentRGB||[200,164,90];grad.addColorStop(0,`rgba(${_ac},0.18)`);grad.addColorStop(1,`rgba(${_ac},0)`);
  ctx.beginPath();data.forEach((v,i)=>{const x=p.l+i*(cw/(data.length-1)),y=p.t+ch-(v/100)*ch;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});ctx.lineTo(p.l+(data.length-1)*(cw/(data.length-1)),p.t+ch);ctx.lineTo(p.l,p.t+ch);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();data.forEach((v,i)=>{const x=p.l+i*(cw/(data.length-1)),y=p.t+ch-(v/100)*ch;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});ctx.strokeStyle=`rgba(${_ac},0.5)`;ctx.lineWidth=2;ctx.stroke();
  data.forEach((v,i)=>{const x=p.l+i*(cw/(data.length-1)),y=p.t+ch-(v/100)*ch;const cu=age>=dys[i].as&&age<=dys[i].ae;ctx.beginPath();ctx.arc(x,y,cu?5:2.5,0,Math.PI*2);ctx.fillStyle=cu?`rgb(${_ac})`:`rgba(${_ac},.35)`;ctx.fill();if(cu){ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.strokeStyle=`rgba(${_ac},.2)`;ctx.lineWidth=2;ctx.stroke()}ctx.fillStyle=_axisText();ctx.font='7px sans-serif';ctx.textAlign='center';ctx.fillText(dys[i].g+dys[i].z,x,h-p.b+11);ctx.fillText(dys[i].as+'岁',x,h-p.b+20);});
}

export function copyReport(){
  const d=getCtx();if(!d){showToast('暂无可复制的报告');return;}
  const cDy=d.cDy,cLn=d.cLn;
  const lines=[
    '【问问大师·八字命理报告】',
    `${d.b.Y.g}${d.b.Y.z}年 ${d.b.M.g}${d.b.M.z}月 ${d.b.D.g}${d.b.D.z}日 ${d.b.H.g}${d.b.H.z}时 · ${d.gl} · ${d.age}岁`,
    `日主：${d.dg}${d.dw} · ${d.wx.st?'身旺':'身弱'} · 用神${d.wx.ys}/喜神${d.wx.xs}`,
    `格局：${d.pa?d.pa.join('、'):'-'} · 纳音${d.b.ny}`,
    cDy?`当前大运：${cDy.g}${cDy.z}（${cDy.as}~${cDy.ae}岁，十神:${d.dySS}）`:'',
    cLn?`${CURR_YEAR}流年：${cLn.g}${cLn.z}${cLn.sx}年（十神:${d.lnSS}）`:'',
    `${CURR_YEAR}年运势 — 事业${d.cs} / 财富${d.ws} / 感情${d.ls} / 健康${d.hs}`,
    d.P&&d.P[d.dg]?`性格：${d.P[d.dg].core}`:'',
    d.P&&d.P[d.dg]?`事业：${d.P[d.dg].career}`:'',
    '',
    '— 由问问大师·东方人生决策系统生成'
  ].filter(Boolean).join('\n');
  navigator.clipboard.writeText(lines).then(()=>showToast('报告摘要已复制'),()=>showToast('复制失败，请手动选择文本'));
}





