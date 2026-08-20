import { showToast } from './ui/toast.js';
import { CURR_YEAR, TG, DZ, SX, WX, GW, ZW, ZC, WC, NY, SS } from './engines/shared.js';
import { CD, CG } from './engines/cities.js';
import { _initJq, solarTermDate, jqDate, getMonthPillar, trueSolarTime, resolveBirthDateTime, getDayPillarIndex } from './engines/calendar.js';
import { mkBazi, mkWx, mkSs, mkShenSha, mkDy, mkLn, getLiuYue, getShenShaLabels, getTodayGZ } from './engines/bazi.js';
import { mkZw } from './engines/ziwei.js';
import { mkQm } from './engines/qimen.js';
import { mkMh } from './engines/meihua.js';
import { mkSi } from './engines/sizhi.js';
import { calcSynastry } from './engines/synastry.js';
import { shareSynastry, saveSynastryPartner, partnerPickerHtml, bindPartnerPicker, listPartners } from './tools/synastry-share.js';
import { calcLiuRi, buildDailyCopy, dailyOneLiner } from './engines/liuri.js';
import { buildExplainQuestion, extractSection, chartFacts } from './ai/explain.js';
import { initSectionTabs } from './ui/section-tabs.js';
import { TJ } from './state/tj.js';
import { getCtx } from './state/context.js';
import { toolPageShell, setToolOutput } from './tools/shared.js';
import { closeToolPage, openToolPage } from './tools/center.js';
import { getDecisionAdvice, openDecisionTool, runDecisionTool } from './tools/decision.js';
import { openFocusTool, openBreathTool, startBreathTool } from './tools/wellness.js';
import { runWealthTool } from './tools/wealth.js';
import { runCareerTool } from './tools/career.js';
import { runDateTool } from './tools/dating.js';
import { runStyleTool } from './tools/style.js';
import { runLayoffTool } from './tools/layoff-tool.js';
import { runDailyTool } from './tools/daily.js';
import { runNameTool } from './tools/naming.js';
import { runOracleTool } from './tools/oracle.js';
import { runLotteryTool } from './tools/lottery.js';
import { runZodiacTool } from './tools/zodiac.js';
import { runRelationTool } from './tools/relation.js';
import { openAnswerBook } from './tools/answerbook-v2.js';
import { renderShareCard, exportShareCard } from './share/card.js';
import { initArmillary } from './fx/armillary.js';
import { initArmillaryAugust } from './fx/armillary-august.js';
import { burstToArmillary } from './fx/burst.js';
import { TJX } from './state/tjx.js';
import { getResultStyle } from './state/result-style.js';

window.selectResultStyle=function(value){
  const hidden=document.getElementById('bResultStyle');
  const hint=document.getElementById('resultStyleHint');
  if(hidden)hidden.value=value;
  document.querySelectorAll('.result-style-option').forEach(btn=>{
    const active=btn.dataset.style===value;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-checked',active?'true':'false');
  });
  if(hint)hint.textContent=getResultStyle(value).intro;
  window._formDirty=true;
};
// 捕获阶段兜底：即使局部表单监听未初始化，按钮仍能切换风格。
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('.result-style-option');
  if(btn)window.selectResultStyle(btn.dataset.style);
},true);
import { calcYearScores, calcPattern } from './state/scoring.js';
import { buildContext } from './state/context.js';
import {
  KB, KBSearch, smartAnswer, extractIntents, buildBaziContext,
  getLayoffAstroRisk, generateAnswerFallback, askToolInsight
} from './ai/index.js';
import {
  formatAIText, renderSmartAnswer, renderRouteButtons, buildRelatedRoutes,
  compactAIText, formatStandardAnswer, getPersona, getTimeline,
  getMonthlyAlert, getRiskWarning, calcLayoffRisk, getRelationMode,
  getSuitableType, getRelationRisks, renderAll, renderBeginnerBrief,
  organizeMasterReportLayout, switchStructureTab, toggleFullGods,
  renderQuickRead, _qrCard, buildAISummary, calcRelation, drawCurve, copyReport
} from './render/index.js';
import {
  applyTheme, jumpTo, showPage2, goBack, scrollToForm, switchTab,
  setGlassMode, toggleLgPanel, moveTabIndicator, initNavigationUI,
  openAsk, closeAsk, newAskChat, aiToolRequest, doAsk, doAskCustom,
  aiSwitchCat, aiRefreshChips, aiOnInputSuggest, generateAnswer,
  getAISettings, getApiKey, toggleAISettings, initAISettings,
  initTheme, toggleTheme
} from './ui/index.js';
import { initFontSize } from './font-size.js';
import { initWeather, getWxGeo } from './ui/weather.js';
import { initOnboarding } from './onboarding.js';
// 第 1 批拆分模块（零耦合 IIFE 外提至 src/legacy/）
import { initHomeFx } from './legacy/home.js';
import { initCityAutocomplete, initFormDirtyGuard } from './legacy/forms.js';
import { initCardCollapse, initDensityToggle, initExplainInject, initQuickReadCollapse, initTodayCard, initYunTab } from './legacy/report.js';
import { initDailyRun, initDailySignRevamp, initDailySignShare, initDateToolRevamp, initStyleToolV2, initToolCenterFinal, initToolCenterSearch, initToolEngineV3, initToolRefineLayer, initToolRunWrap, initWealthToolRevamp } from './legacy/tools.js';
import { initAnswerBookV2, initCustomToolFallback, initToolCardArt } from './legacy/tool-extras.js';
import { initSecondaryPage, initSecondaryResultFallback, initTertiaryBackFix } from './legacy/tool-pages.js';
import { initDockIndicator, initDockKeyboard, initDockLighting } from './legacy/dock.js';
import { initCloudflareCleanup, initExperienceLayer, initKBExpansion, initSynastryShare, initToolAI } from './legacy/interactions.js';
/* tools2 改为动态 import（见文件末尾 bootstrap 处）：
   工具系统体积大且非首屏必需，独立成异步 chunk，缩小主包。 */

initTheme();
initWeather();
initSectionTabs();
initNavigationUI();
initAISettings();
initFontSize();

async function calc(isDemoPreview=false){
  const bd=document.getElementById('bDate').value;if(!bd)return showToast('请选择出生日期');
  const timeStr=document.getElementById('bTime').value||'09:00';const[hh,mm]=timeStr.split(':').map(Number);
  const bp=document.getElementById('bPlace').value||'beijing';const gen=document.getElementById('bGen').value;
  const q=document.getElementById('bQ').value;
  const resultStyleId=document.getElementById('bResultStyle')?.value||'companion';
  const resultStyle=getResultStyle(resultStyleId);
  const useTrueSolar=document.getElementById('swTrueSolar').classList.contains('on');
  const[y,m,d]=bd.split('-').map(Number);const city=CD[bp]||{n:'未知',o:116.4,a:39.9};
  const formModal=document.getElementById('formModal');
  const fromForm=!!(formModal&&formModal.classList.contains('open'))&&!isDemoPreview;

  // 纯计算与渲染。失败抛错，由两条过渡路径各自处理界面。
  function doCompute(){
    const resolved=resolveBirthDateTime(y,m,d,hh,mm,useTrueSolar,city.o,city.tz);
    const b=mkBazi(resolved.year,resolved.month,resolved.day,resolved.hourZhi,resolved.hour,resolved.minute,resolved.instant);
    const wx=mkWx(b),ss=mkSs(b),dy=mkDy(b,gen,y,m,d),ln=mkLn(CURR_YEAR),zw=mkZw(b),qm=mkQm(b),mh=mkMh(b),si=mkSi(b);
    const shensha=mkShenSha(b);const liuyue=getLiuYue(CURR_YEAR);
    b._meta={hourZhi:resolved.hourZhi,useTrueSolar:resolved.note?true:false,by:y,bm:m,bd:d};
    const _input={by:y,bm:m,bd:d,bd_raw:bd,timeStr,bp,gen,q,useTrueSolar,resultStyle:resultStyleId,resultStyleLabel:resultStyle.label};
    const _preCtx=buildContext({b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,P:null,gen,q,city,input:_input});
    window._ctx=_preCtx;window._baziData=_preCtx;window._reportData=_preCtx;
    window._formDirty=false; // 已推演应用，表单修改视为已保存
    applyTheme(wx.ys);
    // Claude 风格：图表统一使用主题强调色（赭橙），不随用神变色
    window._accentRGB=[217,119,87];
    renderAll(b,wx,ss,dy,ln,zw,qm,mh,si,gen,q,city,y,shensha,liuyue);
    // 让问问大师与报告顶部共享“示例报告”状态。
    if(window._ctx)window._ctx.isDemoPreview=!!isDemoPreview;
    if(window._baziData)window._baziData.isDemoPreview=!!isDemoPreview;
    if(window._reportData)window._reportData.isDemoPreview=!!isDemoPreview;
    if(isDemoPreview){
      const reportInner=document.getElementById('p2Inner');
      if(reportInner)reportInner.insertAdjacentHTML('afterbegin','<div class="demo-report-note" role="status"><span>示例</span><b>当前为体验用示例报告</b><em>内容基于默认示例信息生成，请勿用于个人判断。</em></div>');
    }
  }

  // —— 新过渡：界面淡出，表单化为粒子缓慢汇入星环，浑天仪加速涌动 ——
  if(fromForm){
    try{doCompute();}catch(e){
      console.error(e);
      showToast('推演出错：'+e.message+'\n\n建议：请检查输入信息是否正确，或刷新页面重试。');
      return; // 出错时留在表单里，方便修改后重试
    }
    // 日历场景下：录入八字后留在日历并重渲染，不跳转到报告页
    const calModal=document.getElementById('toolModal');
    if(calModal&&calModal.classList.contains('cal-fullscreen')){
      formModal.classList.remove('open');
      document.body.classList.remove('form-open');
      const ctaBtn=document.getElementById('homeCtaMain');
      if(ctaBtn){ctaBtn.textContent='输入信息';ctaBtn.classList.remove('home-cta-go');}
      const mb1=document.getElementById('homeMenuBtn');if(mb1)mb1.style.display='';
      window.dispatchEvent(new CustomEvent('tj:profile-ready'));
      return;
    }
    const sheet=formModal.querySelector('.form-modal-sheet');
    const sheetRect=sheet?sheet.getBoundingClientRect():null;
    formModal.classList.remove('open');
    document.body.classList.remove('form-open');
    // 按钮恢复初始状态
    const ctaBtn=document.getElementById('homeCtaMain');
    if(ctaBtn){ctaBtn.textContent='输入信息';ctaBtn.classList.remove('home-cta-go');}
    const mb1=document.getElementById('homeMenuBtn');if(mb1)mb1.style.display='';
    const page1=document.getElementById('page1');
    if(page1)page1.classList.add('tj-fade'); // 过渡期间画面只留星环与粒子
    const hint=document.getElementById('tjCalcHint');
    if(hint)hint.classList.add('show');      // 仅底部一枚极简提示
    const DUR=2400;
    const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){
      await new Promise(r=>setTimeout(r,240));
    }else{
      if(window._tjArm)window._tjArm.surge(DUR);
      burstToArmillary(sheetRect);
      await new Promise(r=>setTimeout(r,DUR));
    }
    showPage2();
    document.querySelectorAll('.tab-item')[0].click();
    if(hint)hint.classList.remove('show');
    if(page1)page1.classList.remove('tj-fade'); // 恢复，供下次返回首页正常显示
    return;
  }

  // —— 经典过渡：示例报告 / 从档案重新推演 ——
  // 🔧 先关闭表单弹窗（position:fixed 独立于 page1，不关会浮在结果页上）
  if(formModal&&formModal.classList.contains('open')){
    formModal.classList.remove('open');
    document.body.classList.remove('form-open');
    const ctaBtn=document.getElementById('homeCtaMain');
    if(ctaBtn){ctaBtn.textContent='输入信息';ctaBtn.classList.remove('home-cta-go');}
    const mb2=document.getElementById('homeMenuBtn');if(mb2)mb2.style.display='';
  }
  const ld=document.getElementById('ldov');if(ld)ld.classList.add('on');const btnGo2=document.getElementById('btnGo2');if(btnGo2)btnGo2.disabled=true;
  const pb=document.getElementById('ldbf'),st=document.getElementById('ldst');
  const steps=['排列四柱…','推算五行…','分析十神…','查神煞…','排大运…','安紫微盘…','起奇门盘…','梅花起卦…','排流月…','综合合参…','生成报告…'];
  for(let i=0;i<steps.length;i++){st.textContent=steps[i];pb.style.width=(((i+1)/steps.length)*100)+'%';await new Promise(r=>setTimeout(r,220));}
  try{
    doCompute();
    if(ld)ld.classList.remove('on');if(btnGo2)btnGo2.disabled=false;
    showPage2();
    document.querySelectorAll('.tab-item')[0].click();
  }catch(e){
    if(ld)ld.classList.remove('on');if(btnGo2)btnGo2.disabled=false;
    console.error(e);
    showToast('推演出错：'+e.message+'\n\n建议：请检查输入信息是否正确，或刷新页面重试。');
  }
}

/* 表单弹窗开关 */
window.TJOpenForm=function(){
  const m=document.getElementById('formModal');
  if(!m)return;
  const cta=document.getElementById('homeCtaMain');
  // 已打开状态：主按钮已是「开始推演」，直接执行推演
  if(m.classList.contains('open')){
    calc();
    return;
  }
  m.classList.add('open');
  document.body.classList.add('form-open');
  // 动态定位：表单底部距按钮顶部 5px
  if(cta){
    const r=cta.getBoundingClientRect();
    m.style.bottom=(window.innerHeight-r.top+60)+'px';
  }
  const mb=document.getElementById('homeMenuBtn');if(mb)mb.style.display='none';
  // 按钮切换为「开始推演」
  if(cta){cta.textContent='开始推演';cta.classList.add('home-cta-go');}

  // 自动填入天气地理位置
  const geo = getWxGeo();
  if (geo && geo.city) {
    const inp = document.getElementById('cInp');
    const hid = document.getElementById('bPlace');
    let matched = null;
    for (const [id, info] of Object.entries(CD)) {
      if (geo.city.includes(info.n) || info.n.includes(geo.city)) {
        matched = { id, name: info.n };
        break;
      }
    }
    if (matched) {
      hid.value = matched.id;
      inp.value = matched.name;
    }
  }

  setTimeout(()=>{const f=document.getElementById('bDate');if(f)f.focus({preventScroll:true});},280);
};
// resize 时动态更新表单位置
window.addEventListener('resize',()=>{
  const m=document.getElementById('formModal');
  if(!m||!m.classList.contains('open'))return;
  const cta=document.getElementById('homeCtaMain');
  if(cta){
    const r=cta.getBoundingClientRect();
    m.style.bottom=(window.innerHeight-r.top+60)+'px';
  }
});
window.TJCloseForm=function(){
  const m=document.getElementById('formModal');
  if(m)m.classList.remove('open');
  document.body.classList.remove('form-open');
  const mb=document.getElementById('homeMenuBtn');if(mb)mb.style.display='';
  // 按钮恢复为「输入信息」
  const cta=document.getElementById('homeCtaMain');
  if(cta){cta.textContent='输入信息';cta.classList.remove('home-cta-go');}
};

function renderRiQian(){
  const now=new Date();const y=now.getFullYear(),m=now.getMonth()+1,d=now.getDate();
  const dji=getDayPillarIndex(y,m,d);const dgi=dji%10,dzi=dji%12;const dg=TG[dgi],dz=DZ[dzi];
  let jie='';for(let i=0;i<12;i++){const j=jqDate(y,i);if(j){if(m>j[0]||(m===j[0]&&d>=j[1]))jie=['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'][i];}}
  const ch={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};
  const sxm={'子':'鼠','丑':'牛','寅':'虎','卯':'兔','辰':'龙','巳':'蛇','午':'马','未':'羊','申':'猴','酉':'鸡','戌':'狗','亥':'猪'};
  const todaySX=sxm[dz],chongSX=sxm[ch[dz]];
  const sxjx={'鼠':'天贵','牛':'天德','虎':'天马','兔':'文昌','龙':'紫微','蛇':'红鸾','马':'将星','羊':'天医','猴':'驿马','鸡':'桃花','狗':'华盖','猪':'福星'};
  let yi=[],ji=['与'+chongSX+'相冲者大事需谨慎'];let yj='';
  if('甲乙'.includes(dg)){yi.push('种植','出行','会友');ji.push('动土','开矿');yj='木气生发之日，宜动不宜静，早起行好运，利谋新事。';}
  else if('丙丁'.includes(dg)){yi.push('文书','庆典','装饰');ji.push('涉水','冷库作业');yj='火德当令，光明在前，利文书庆典，忌口舌争执。';}
  else if('戊己'.includes(dg)){yi.push('置业','收纳','祭祀');ji.push('嫁娶','远行');yj='土性厚重，稳中求进，忌冒进求快，适合整理收纳。';}
  else if('庚辛'.includes(dg)){yi.push('裁决','交易','修造');ji.push('宴饮','借贷');yj='金气锐利，当断则断，利裁决交易，忌优柔寡断。';}
  else{yi.push('流通','迁移','沐浴');ji.push('签约','婚嫁');yj='水势汪洋，顺势而为，宜流通迁移，忌固守一域。';}
  return`<div style="text-align:center;margin-bottom:14px"><div style="font-family:var(--serif);font-size:1.6em;color:var(--ac-text);margin-bottom:4px">${dg}${dz}日</div><div style="font-size:.75em;color:var(--ac-dim)">${y}年${m}月${d}日${jie?' · '+jie+'后':''}</div></div>
  <div style="display:flex;gap:8px;margin:12px 0"><div style="flex:1;padding:10px;border-radius:10px;background:var(--c-surface-2);text-align:center"><div style="font-size:.65em;color:var(--c-text-3);margin-bottom:4px">生肖</div><div style="font-size:1.1em;font-weight:600">${todaySX}</div></div><div style="flex:1;padding:10px;border-radius:10px;background:var(--c-surface-2);text-align:center"><div style="font-size:.65em;color:var(--c-text-3);margin-bottom:4px">冲煞</div><div style="font-size:1.1em;font-weight:600;color:#d4654a">冲${chongSX}</div></div><div style="flex:1;padding:10px;border-radius:10px;background:var(--c-surface-2);text-align:center"><div style="font-size:.65em;color:var(--c-text-3);margin-bottom:4px">吉神</div><div style="font-size:1.1em;font-weight:600;color:#7ab648">${sxjx[todaySX]||'天德'}</div></div></div>
  <div style="margin:10px 0"><div style="font-size:.75em;color:var(--ac-dim);margin-bottom:6px">今日宜</div><div style="display:flex;flex-wrap:wrap;gap:6px">${yi.map(x=>`<span class="tg tj">${x}</span>`).join('')}</div></div>
  <div style="margin:10px 0"><div style="font-size:.75em;color:var(--ac-dim);margin-bottom:6px">今日忌</div><div style="display:flex;flex-wrap:wrap;gap:6px">${ji.map(x=>`<span class="tg tc">${x}</span>`).join('')}</div></div>
  <div style="font-size:.78em;color:var(--c-text-2);margin-top:12px;padding-top:10px;border-top:1px solid var(--c-border)"><b>一句话日签：</b>${yj}</div>`;
}
function showRiQian(){const baseHtml=renderRiQian();document.getElementById('rqResult').innerHTML=baseHtml;document.getElementById('rqModal').classList.add('open');}
function closeRq(){document.getElementById('rqModal').classList.remove('open');}

function openMonthModal(idx,name,gz,jq,ss){
  const d=window._baziData;if(!d)return;
  const dg=d.dg;
  const monthAnalysis={
    '比肩':'本月比肩当令，自我意识增强，适合独立行动与团队协作，但需防过度竞争消耗精力。',
    '劫财':'本月劫财临旺，易有意外支出或人际摩擦，理财需谨慎，防朋友借贷不还。',
    '食神':'本月食神吐秀，创意与表达力强，适合学习新技能、展示才华、社交联谊。',
    '伤官':'本月伤官透出，思维活跃但易言辞过激，注意沟通方式，利创新突破与变革。',
    '偏财':'本月偏财星动，有意外收入机会，但忌贪心冒进，适可而止见好就收。',
    '正财':'本月正财当旺，适合稳健理财、谈薪资、收款项，财运平稳上升。',
    '七杀':'本月七杀压身，压力较大但机遇并存，适合攻坚克难、挑战自我、突破瓶颈。',
    '正官':'本月正官临旺，事业运佳，适合争取晋升、考试认证、建立规则与秩序。',
    '偏印':'本月偏印当令，适合学习研究、向内探索，但需防思虑过多、情绪低落。',
    '正印':'本月正印生身，贵人运旺，适合拜师学习、获取资源支持、充电提升。'
  };
  const analysis=monthAnalysis[ss]||'本月气场平和，按部就班即可，宜整理与复盘。';
  // 宜忌跟着当月十神走，不再是一张通用清单
  const _mYiJi={
    '比肩':{yi:['独立推进','团队协作','健身蓄力'],ji:['过度竞争','单打独斗到底']},
    '劫财':{yi:['明确权责','谈清分成','守住边界'],ji:['冲动借钱','为人担保']},
    '食神':{yi:['创作表达','学习技能','轻松社交'],ji:['透支玩乐','拖延正事']},
    '伤官':{yi:['创新提案','优化流程','表达观点'],ji:['顶撞上级','言辞带刺']},
    '偏财':{yi:['拓展渠道','捕捉机会','灵活增收'],ji:['贪多冒进','重仓投机']},
    '正财':{yi:['稳健理财','谈薪收款','精算账目'],ji:['盲目扩张','轻信高息']},
    '七杀':{yi:['攻坚克难','争取突破','立规矩'],ji:['硬碰硬','透支健康']},
    '正官':{yi:['争取晋升','考试认证','理顺流程'],ji:['越权行事','忽视规则']},
    '偏印':{yi:['研究复盘','独处充电','整理思路'],ji:['钻牛角尖','闭门造车']},
    '正印':{yi:['拜师学习','争取支持','休养生息'],ji:['过度依赖','懒散拖延']}
  };
  const _mj=_mYiJi[ss]||{yi:['整理规划','稳步推进'],ji:['冲动决定','熬夜透支']};
  const yi=_mj.yi,ji=_mj.ji;
  const el=document.getElementById('monthModalContent');
  el.innerHTML=`<div class="mm-title">${name} · ${gz}</div>
    <div class="mm-row"><span class="mm-label">十神</span><span class="mm-value">${ss}</span></div>
    <div class="mm-row"><span class="mm-label">节气</span><span class="mm-value">${jq||'待查'}</span></div>
    <div class="mm-row"><span class="mm-label">日主</span><span class="mm-value">${dg}</span></div>
    <div style="margin:14px 0;font-size:.82em;color:var(--c-text);line-height:1.8">${analysis}</div>
    <div style="margin:10px 0"><div style="font-size:.7em;color:rgba(122,182,72,.8);margin-bottom:6px">本月宜</div><div style="display:flex;flex-wrap:wrap;gap:4px">${yi.map(x=>`<span class="mm-tag yi">宜${x}</span>`).join('')}</div></div>
    <div style="margin:10px 0"><div style="font-size:.7em;color:rgba(212,101,74,.8);margin-bottom:6px">本月忌</div><div style="display:flex;flex-wrap:wrap;gap:4px">${ji.map(x=>`<span class="mm-tag ji">忌${x}</span>`).join('')}</div></div>`;
  document.getElementById('monthModal').classList.add('open');
}
function closeMonthModal(){document.getElementById('monthModal').classList.remove('open');}

function selChip(el){const wrap=document.getElementById('qChips');wrap.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');document.getElementById('bQ').value=el.dataset.q;}

const DB_NAME='TJ_Bazi',DB_VER=2;
let _db=null;
function initDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VER);r.onerror=()=>rej(r.error);r.onsuccess=(e)=>{_db=e.target.result;res(_db);};r.onupgradeneeded=(e)=>{const d=e.target.result;if(!d.objectStoreNames.contains('profiles')){const s=d.createObjectStore('profiles',{keyPath:'id',autoIncrement:true});s.createIndex('updatedAt','updatedAt',{unique:false});}};});}
function dbPut(p){return new Promise((res,rej)=>{if(!_db)return rej('DB未就绪');const t=_db.transaction('profiles','readwrite'),s=t.objectStore('profiles');const r=s.put(p);r.onsuccess=(e)=>res(e.target.result);r.onerror=()=>rej(r.error);});}
function dbGetAll(){return new Promise((res,rej)=>{if(!_db)return res([]);const t=_db.transaction('profiles','readonly'),s=t.objectStore('profiles');const r=s.index('updatedAt').openCursor(null,'prev');const arr=[];r.onsuccess=(e)=>{const c=e.target.result;if(c){arr.push(c.value);c.continue();}else res(arr);};r.onerror=()=>rej(r.error);});}
function dbDel(id){return new Promise((res,rej)=>{if(!_db)return rej('DB未就绪');const t=_db.transaction('profiles','readwrite'),s=t.objectStore('profiles');const r=s.delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
function saveCurrentProfile(name){
  const d=getCtx();
  const input=d&&(d._input||d.input);
  if(!d||!input)return Promise.reject('无当前命盘数据');
  // 仅持久化"原始输入"，避免存入巨大对象
  const rec={bd:input.bd_raw||input.bd,timeStr:input.timeStr,bp:input.bp,gen:input.gen,q:input.q,useTrueSolar:!!input.useTrueSolar,resultStyle:input.resultStyle||'companion',name,createdAt:Date.now(),updatedAt:Date.now()};
  return dbPut(rec);
}
async function renderProfiles(){try{const list=await dbGetAll();const zone=document.getElementById('profileZone');const grid=document.getElementById('profileGrid');const empty=document.getElementById('profileEmpty');const recentZone=document.getElementById('recentZone');const recentGrid=document.getElementById('recentGrid');const recentEmpty=document.getElementById('recentEmpty');const profileZoneEmpty=document.getElementById('profileZoneEmpty');
  if(!list.length){if(grid)grid.innerHTML='';if(empty)empty.style.display='none';if(zone)zone.style.display='none';if(recentZone)recentZone.style.display='none';if(recentEmpty)recentEmpty.style.display='block';if(profileZoneEmpty)profileZoneEmpty.style.display='block';return;}
  if(empty)empty.style.display='none';if(zone)zone.style.display='block';if(recentEmpty)recentEmpty.style.display='none';if(profileZoneEmpty)profileZoneEmpty.style.display='none';
  if(recentZone){recentZone.style.display='block';recentGrid.innerHTML=list.slice(0,3).map(p=>{const city=CD[p.bp]||{n:'未知'};const _bd=(p.bd||'1990-1-1').split('-').map(Number);const _b=mkBazi(_bd[0],_bd[1],_bd[2],0);const dg=_b.D.g;const dy=mkDy(_b,p.gen||'male',_bd[0],_bd[1]||1,_bd[2]||1);const age=TJ.calcAge(_bd[0],_bd[1]||1,_bd[2]||1);const cDy=TJ.findDaYun(dy,age)||dy.ds[0];const cLn=mkLn(CURR_YEAR);let stars='★★★☆☆';try{const wx=mkWx(_b),ss=mkSs(_b);const sc=calcYearScores(_b,wx,ss,SS[dg][cDy.g],SS[dg][cLn.g],null,cDy,cLn);const avgv=(sc.career+sc.wealth+sc.love+sc.health)/4;const n=Math.max(1,Math.min(5,Math.round(avgv/20)));stars='★'.repeat(n)+'☆'.repeat(5-n);}catch(e){}return`<div class="r-card" onclick="loadProfile(${p.id})"><div class="r-ava">${(p.name||'未').charAt(0)}</div><div class="r-info"><div class="r-name">${(p.name||'未命名').replace(/</g,'&lt;')}</div><div class="r-meta">当前大运：${cDy.g}${cDy.z} · ${CURR_YEAR}运势：${stars}<br>最近关注：${p.q||'综合'}</div></div><div class="r-arrow">›</div></div>`;}).join('');}
  if(grid)grid.innerHTML=list.slice(0,8).map(p=>{const city=CD[p.bp]||{n:'未知'};const d=new Date(p.updatedAt);return`<div class="r-card" onclick="loadProfile(${p.id})"><div class="r-ava">${(p.name||'未').charAt(0)}</div><div class="r-info"><div class="r-name">${(p.name||'未命名').replace(/</g,'&lt;')}</div><div class="r-meta">${p.bd||''} · ${city.n} · ${p.gen==='male'?'男':'女'}${p.useTrueSolar?'·真':''}</div></div><div style="position:absolute;top:6px;right:8px;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.9em;color:var(--c-text-4);cursor:pointer;transition:all .15s;z-index:2" onclick="event.stopPropagation();deleteProfile(${p.id})">×</div></div>`;}).join('');
}catch(e){console.log('renderProfiles',e);}}
async function loadProfile(id){try{const list=await dbGetAll();const p=list.find(x=>x.id===id);if(!p)return;document.getElementById('bDate').value=p.bd||'';document.getElementById('bTime').value=p.timeStr||'09:00';document.getElementById('bPlace').value=p.bp||'';document.getElementById('cInp').value=(CD[p.bp]||{n:''}).n;document.getElementById('bGen').value=p.gen||'male';const styleEl=document.getElementById('bResultStyle');if(styleEl){styleEl.value=p.resultStyle||'companion';document.querySelectorAll('.result-style-option').forEach(btn=>{const on=btn.dataset.style===styleEl.value;btn.classList.toggle('active',on);btn.setAttribute('aria-checked',on?'true':'false');});const loadedStyle=getResultStyle(styleEl.value);const loadedHint=document.getElementById('resultStyleHint');if(loadedHint)loadedHint.textContent=loadedStyle.intro;}document.getElementById('bQ').value=p.q||'';const sw=document.getElementById('swTrueSolar');if(sw){if(p.useTrueSolar)sw.classList.add('on');else sw.classList.remove('on');document.getElementById('swText').textContent=(sw.classList.contains('on')?'开启':'关闭')+'真太阳时（按出生地经度精确换算时辰）';}const chips=document.getElementById('qChips');if(chips){chips.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c.dataset.q===p.q));}calc();}catch(e){console.log('loadProfile',e);}}
async function deleteProfile(id){try{await dbDel(id);renderProfiles();}catch(e){console.log('deleteProfile',e);}}
function openSaveModal(){document.getElementById('saveModal').classList.add('open');const n=document.getElementById('saveName');n.value='';n.focus();}
function closeSaveModal(){document.getElementById('saveModal').classList.remove('open');}
function confirmSaveProfile(){const name=document.getElementById('saveName').value.trim();if(!name){showToast('请输入档案名称');return;}saveCurrentProfile(name).then(()=>{closeSaveModal();renderProfiles();showToast('已保存到档案库');}).catch(e=>showToast('保存失败：'+e));}
async function exportProfiles(){try{const list=await dbGetAll();const blob=new Blob([JSON.stringify(list,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='问问大师档案_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);}catch(e){showToast('导出失败');}}
async function handleImport(input){const file=input.files[0];if(!file)return;try{const text=await file.text();const arr=JSON.parse(text);if(!Array.isArray(arr))throw new Error('格式错误');let count=0;for(const p of arr){if(p.bd&&p.bp&&p.gen){delete p.id;p.updatedAt=Date.now();await dbPut(p);count++;}}renderProfiles();showToast(`成功导入 ${count} 条档案`);}catch(e){showToast('导入失败：'+e.message);}input.value='';}

initCityAutocomplete();
(function(){window.calc=calc;window.loadProfile=loadProfile;window.selChip=selChip;window.exportProfiles=exportProfiles;window.handleImport=handleImport;window.openAsk=openAsk;window.closeAsk=closeAsk;window.goBack=goBack;window.switchTab=switchTab;window.showPage2=showPage2;window.openSaveModal=openSaveModal;window.closeSaveModal=closeSaveModal;window.confirmSaveProfile=confirmSaveProfile;window.deleteProfile=deleteProfile;window.openMonthModal=openMonthModal;window.closeMonthModal=closeMonthModal;window.openCalendarMode=openCalendarMode;window.openAboutModal=function(){document.getElementById('aboutModal').classList.add('open');};window.closeAboutModal=function(){document.getElementById('aboutModal').classList.remove('open');};window.openDisclaimerModal=function(){document.getElementById('disclaimerModal').classList.add('open');};window.closeDisclaimerModal=function(){document.getElementById('disclaimerModal').classList.remove('open');};})();

/* 首页汉堡菜单 */
function toggleHomeMenu(force){
  const btn=document.getElementById('homeMenuBtn');
  const ov=document.getElementById('homeMenuOverlay');
  const dw=document.getElementById('homeMenuDrawer');
  if(!btn||!ov||!dw)return;
  let open;
  if(force===false)open=false;
  else if(force===true)open=true;
  else open=!btn.classList.contains('active');
  btn.classList.toggle('active',open);
  ov.classList.toggle('open',open);
  dw.classList.toggle('open',open);
  document.body.style.overflow=open?'hidden':'';
}
window.toggleHomeMenu=toggleHomeMenu;

/* 离开首页时自动关闭菜单 */
(function(){
  const _goBack=window.goBack;
  if(typeof _goBack==='function'){
    window.goBack=function(){toggleHomeMenu(false);return _goBack.apply(this,arguments);};
  }
  const _loadProfile=window.loadProfile;
  if(typeof _loadProfile==='function'){
    window.loadProfile=function(){toggleHomeMenu(false);return _loadProfile.apply(this,arguments);};
  }
})();

document.addEventListener('DOMContentLoaded',()=>{
  initOnboarding();
  initDB().then(()=>renderProfiles()).catch(e=>console.log('DB init',e));
  const ai=document.getElementById('askInput');
  if(ai){
    ai.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doAskCustom()}});
    ai.addEventListener('input',aiOnInputSuggest);
    ai.addEventListener('focus',aiOnInputSuggest);
    ai.addEventListener('blur',()=>setTimeout(()=>{const s=document.getElementById('aiSuggest');if(s)s.classList.remove('show');},200));
  }
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const ask=document.getElementById('aiSheet');if(ask&&ask.classList.contains('open')){closeAsk();return;}
      const save=document.getElementById('saveModal');if(save&&save.classList.contains('open')){closeSaveModal();return;}
      const fm=document.getElementById('formModal');if(fm&&fm.classList.contains('open')){window.TJCloseForm&&window.TJCloseForm();return;}
      const rq=document.getElementById('rqModal');if(rq&&rq.classList.contains('open')){closeRq();return;}
      const p2=document.getElementById('page2');if(p2&&(p2.classList.contains('active')||!p2.classList.contains('hidden'))){goBack();return;}
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='p'){e.preventDefault();window.print();return;}
    if((e.ctrlKey||e.metaKey)&&e.key==='c'){
      // 用户正在选中文本或在输入框里时，不劫持系统复制
      const sel=window.getSelection?window.getSelection().toString():'';
      const ae=document.activeElement;
      if(sel||(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable)))return;
      const p2=document.getElementById('page2');if(p2&&p2.classList.contains('active')){e.preventDefault();copyReport();return;}
    }
    const p2=document.getElementById('page2');
    if(p2&&p2.classList.contains('active')){if(e.key>='1'&&e.key<='4'){const tabs=document.querySelectorAll('.tab-item');const idx=parseInt(e.key,10)-1;if(tabs[idx]){tabs[idx].click();return;}}}
  });
});

/* ====== 卡片折叠功能 ====== */
initCardCollapse();

/* ====== 合并卡：当下关注 子 tab 切换 ====== */
function focusSwitchTab(btn){
  const card=btn.closest('.focus-card');
  if(!card)return;
  const sub=btn.dataset.sub;
  card.querySelectorAll('.focus-tab').forEach(t=>t.classList.toggle('active',t===btn));
  card.querySelectorAll('.focus-pane').forEach(p=>p.classList.toggle('active',p.dataset.sub===sub));
}

/* ====== 信息密度：紧凑/详细 切换 + 返回顶部 ====== */
function toggleDensity(){
  document.body.classList.toggle('density-compact');
  const btn=document.getElementById('densityToggle');
  if(btn)btn.classList.toggle('on',document.body.classList.contains('density-compact'));
  try{localStorage.setItem('tj_density',document.body.classList.contains('density-compact')?'1':'0');}catch(e){}
}
initDensityToggle();

/* =========================================================
   首页：粒子 + 鼠标跟随 + 卡片视差 + body.home 自动切换
   ========================================================= */
initHomeFx();

/* ============================================================
   首页 3D 品牌特效（浑天仪星环）：
   只在 body.home 时运行，进报告页停笔并清空。
   ============================================================ */
(function(){
  let arm=null;
  function sync(){
    if(!arm)return;
    if(document.body.classList.contains('home'))arm.start();else arm.stop();
  }
  function createArm(mode){
    const cv=document.getElementById('brand3d');
    if(!cv)return null;
    return mode==='august'?initArmillaryAugust(cv):initArmillary(cv);
  }
  function showToast(text){
    const t=document.createElement('div');
    t.textContent=text;
    t.style.cssText='position:fixed;left:50%;bottom:calc(28vh + 10px);transform:translateX(-50%) translateY(12px);z-index:9999;padding:12px 28px;border-radius:999px;background:rgba(217,119,87,0.92);color:#fff;font-size:.9em;letter-spacing:2px;pointer-events:none;opacity:0;transition:opacity .3s ease,transform .3s cubic-bezier(.2,.8,.3,1.2);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)';
    document.body.appendChild(t);
    requestAnimationFrame(function(){t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';});
    setTimeout(function(){t.style.opacity='0';t.style.transform='translateX(-50%) translateY(12px)';setTimeout(function(){t.remove();},300);},2200);
  }
  function switchStarMode(){
    var cur=localStorage.getItem('tj_star_mode')||'classic';
    var next=cur==='august'?'classic':'august';
    localStorage.setItem('tj_star_mode',next);
    if(arm)arm.stop();
    arm=createArm(next);
    if(!arm)return;
    window._tjArm=arm;
    if(document.body.classList.contains('home'))arm.start();
    showToast(next==='august'?'\u2726 \u516b\u6708\u661f\u76d8\u5df2\u5f00\u542f':'\u2726 \u7ecf\u5178\u661f\u73af\u5df2\u6062\u590d');
  }
  window.addEventListener('load',function(){
    var mode=localStorage.getItem('tj_star_mode')||'classic';
    arm=createArm(mode);
    if(!arm)return;
    window._tjArm=arm;
    new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
    sync();
    /* 彩蛋：长按「输入信息」5 秒切换星轨模式 */
    var HOLD=5000,timer=null,triggered=false;
    var btn=document.querySelector('.home-cta:not(.home-cta-ghost)');
    if(btn){
      btn.addEventListener('pointerdown',function(){
        triggered=false;
        btn.style.transition='box-shadow 5s ease,transform 5s ease';
        btn.style.boxShadow='0 0 0 2px rgba(217,119,87,0.4),0 0 40px rgba(217,119,87,0.5)';
        btn.style.transform='scale(0.97)';
        timer=setTimeout(function(){triggered=true;timer=null;switchStarMode();},HOLD);
      });
      function clearHold(){
        if(timer){clearTimeout(timer);timer=null;}
        btn.style.transition='';
        btn.style.boxShadow='';
        btn.style.transform='';
      }
      btn.addEventListener('pointerup',clearHold);
      btn.addEventListener('pointerleave',clearHold);
      btn.addEventListener('pointercancel',clearHold);
      btn.addEventListener('click',function(e){if(triggered){e.preventDefault();e.stopImmediatePropagation();triggered=false;}},true);
    }
  });
})();

/* ===== iOS 27 Liquid Glass：强度切换 + 标签栏指示条液化滑动 ===== */
/* ===== 新手版 / 大师版：术语解释 + 专业数据折叠 ===== */
const GLOSSARY={
  '八字':'把出生的年、月、日、时分别换算成天干地支，一共八个字，是这套命理分析的基础坐标。',
  '四柱':'年柱、月柱、日柱、时柱，八字按这四组"柱"排列，分别对应人生不同阶段的信息。',
  '天干':'甲乙丙丁戊己庚辛壬癸十个符号，用来纪年月日时，也各自对应一种五行属性。',
  '地支':'子丑寅卯辰巳午未申酉戌亥十二个符号，同样用于纪年月日时，也对应生肖和五行。',
  '十神':'把"我"和干支之间的五行生克关系归纳成十种角色（如正官、正财等），代表事业、财富、人际等不同人生面向。',
  '正官':'十神之一，通常关联规则、责任与稳定的事业发展，也象征约束力。',
  '七杀':'十神之一，代表压力、竞争与魄力，处理得当可转化为闯劲。',
  '正财':'十神之一，代表稳定、按部就班获得的财富与务实的物质基础。',
  '偏财':'十神之一，代表意外之财、投资机会或更灵活的赚钱方式。',
  '食神':'十神之一，代表才华的自然流露、口福与松弛的生活状态。',
  '伤官':'十神之一，代表表达欲、创造力，也可能意味着不按常理出牌。',
  '比肩':'十神之一，代表同辈助力、竞争对手，也象征自我意志。',
  '劫财':'十神之一，与比肩类似但更偏"争夺"，常和破财、合伙纠纷相关联。',
  '正印':'十神之一，代表长辈庇护、名誉、学识，是"被照顾"的力量。',
  '偏印':'十神之一，代表独立钻研、偏门技能，也可能显得孤僻。',
  '五行':'木、火、土、金、水五种基本属性，中国传统理论认为万物都由它们生克循环构成。',
  '大运':'每十年左右更换一次的运势阶段，用来观察人生不同十年的整体走势。',
  '流年':'具体到某一年的运势，比大运更细颗粒度，常和大运叠加分析。',
  '用神':'八字里最需要被"补强"的那个五行，找到它是判断吉凶的关键钥匙。',
  '忌神':'和用神相反，是命局里需要克制、避免过旺的五行。',
  '身强身弱':'用来判断一个人的基础能量是偏充足还是偏需要支持；它不代表好坏，只决定更适合主动发力还是先补足资源。',
  '身强':'指日主（代表自己的那个天干）力量偏旺，通常更适合"泄"或"克"来平衡。',
  '身弱':'指日主力量偏弱，通常更需要"生"或"扶"来补强。',
  '空亡':'某些干支组合在特定情况下力量被削弱的说法，常用来解释"该发生却没发生"的现象。',
  '三合':'三个地支组合在一起会增强某种五行力量，是命理里常见的"加成"关系。',
  '六冲':'两个地支相冲，代表变动、矛盾或需要主动化解的张力。',
  '刑冲破害':'几种地支之间的负向作用关系统称，通常提示需要留意的摩擦点。',
  '纳音':'干支组合对应的一种五行别称体系，常用于婚配、流年等辅助判断。',
  '月令':'出生月份对应的地支与季节能量，是判断命局强弱和环境影响的重要依据。',
  '藏干':'地支内部所包含的天干信息，可理解为不直接显露、但仍会发挥作用的能量。',
  '神煞':'命理中用于补充观察的特殊符号体系，常作为辅助参考，不单独决定结论。',
  '日主':'日柱天干，也就是代表你自己的那个字，是整张命盘的核心参照点。',
  '喜用':'对命局有帮助、值得借力的五行或十神，方向大致等同于"扬长"。',
  '十二长生':'把人生比作植物从萌芽到衰亡的十二个阶段，用来描述某个五行在不同地支上的强弱状态。',

  /* —— 补齐：以下词此前在报告中出现但没有解释入口 —— */
  '命盘':'把出生时间换算成干支后排出的那张表，是后面所有分析的原始依据。',
  '命局':'你这张命盘的整体格局与结构，可以理解为「你这盘牌大致是什么样」。',
  '格局':'命盘的整体类型，用来概括你这个人最突出的能量走向。它只描述特点，不分高低好坏。',
  '旺衰':'衡量日主（代表你自己的那个字）力量是偏强还是偏弱，决定你更适合主动发力，还是先补足资源。',
  '身旺':'代表你自己的那个字力量偏强，通常更适合主动出击、承担事情，也要注意别把担子全揽在自己身上。',
  '喜神':'仅次于用神、同样对你有帮助的五行，可以理解为「第二顺位的助力方向」。',
  '印绶':'十神中「正印 + 偏印」的合称，代表支持、学习与被照顾的力量。',
  '食神格':'格局的一种：擅长把想法变成具体作品或成果，通常表达顺畅、生活节奏偏松弛。',
  '伤官格':'格局的一种：表达欲和创造力强，不太受既有规则束缚，容易带来新意也容易带来摩擦。',
  '正官格':'格局的一种：重视规则与责任，适合在有秩序的环境里稳定发展。',
  '七杀格':'格局的一种：抗压能力强、有闯劲，适合啃硬骨头，但需要注意节奏和恢复。',
  '正财格':'格局的一种：务实、按部就班积累，重视可控和稳定的回报。',
  '偏财格':'格局的一种：机会敏感、路子灵活，适合对外拓展，但要留意别把摊子铺太大。',
  '印绶格':'格局的一种：善于学习吸收，容易获得他人支持，适合需要专业积累的方向。',
  '比肩格':'格局的一种：自我意志强、独立性高，适合自己主导的事，也要留意与人合作时的边界。',
  '劫财格':'格局的一种：行动力强、敢争取，涉及分配与合作时建议提前把规则讲清楚。',
  '建禄格':'格局的一种：自身根基扎实，靠自己的力量推进事情，独立性较强。',
  '三式':'紫微斗数、奇门遁甲、梅花易数三种传统术数的合称，在这里作为八字之外的补充参考。',
  '紫微':'紫微斗数，另一套用十二宫位描述人生不同面向的传统体系，可与八字互相印证。',
  '奇门':'奇门遁甲，传统上用于观察「当下局势」和行动时机的一套体系。',
  '梅花':'梅花易数，一种针对具体某件事起卦、看变化趋势的传统方法。',

  /* —— 神煞（引擎会算出并出现在报告中）—— */
  '桃花':'代表异性缘与人缘的星，命局带桃花通常魅力强、社交机会多，但也要留意"烂桃花"。',
  '驿马':'代表变动、远行与奔波的星，命局带驿马常与迁移、出差、换环境的机会相关。',
  '天乙贵人':'最著名的吉星之一，主逢凶化吉、遇事有人帮，命局带它常被解读为贵人缘好。',
  '文昌':'代表学业、功名与文艺的星，与考试、文书、创意表达相关的能量。',
  '将星':'代表权威与领导力的星，多出现在有统御欲、适合带队的人身上。',
  '华盖':'代表孤独、艺术与玄学气质的星，常与钻研精神、独立思考和宗教艺术缘分相关。',
  '天医':'代表健康、医学与疗愈的星，与身体恢复能力、医药缘分相关。',
  '红艳':'代表情感丰富、容易动情的星，人缘好但感情上需要多分辨。',
  '魁罡':'庚辰、庚戌、壬辰、戊戌四日出生的格局，传统认为这类人刚烈、聪明、果断。',
  '羊刃':'代表刚强、锐利与胆大的星，行动力强，搭配得当可以转化为魄力。',

  /* —— 紫微斗数（紫微卡片）—— */
  '紫微斗数':'另一套传统命理体系，把人生分成十二个宫位，用星曜组合观察不同领域的特点。',
  '命宫':'① 紫微盘中看一个人性格底色的宫位；② 八字里按出生月日时推算的辅助宫位，传统上用于补充看性格与根基。',
  '身宫':'紫微盘中看后天努力方向与人生着力点的宫位，代表"更用力经营"的领域。',
  '十二宫':'紫微盘把人生划分的十二个领域（命宫、财帛、夫妻、事业等），各管一段人生面向。',
  '十四主星':'紫微盘中最核心的十四颗星（紫微、天机、太阳、武曲等），主星看性格与运势底色。',
  '事业宫':'紫微盘中看事业发展、职场状态的宫位，对应工作方式与职业际遇。',
  '财帛宫':'紫微盘中看财富格局、赚钱与理财方式的宫位。',
  '夫妻宫':'紫微盘中看感情模式、婚姻与伴侣关系的宫位。',
  '迁移宫':'紫微盘中看外出、远行、人际往来的宫位，也看在外发展的机遇。',
  '福德宫':'紫微盘中看精神世界、心态与福气的宫位，常关联幸福感来源。',
  '疾厄宫':'紫微盘中看健康体质与易感部位的宫位。',
  '田宅宫':'紫微盘中看不动产、家庭与居住环境的宫位。',
  '交友宫':'紫微盘中看朋友、同事与人脉质量的宫位，也作"仆役宫"。',

  /* —— 奇门遁甲（奇门卡片）—— */
  '九宫':'奇门遁甲把时间空间划分成的九个格子，是判断"当下局势"的坐标底盘。',
  '八门':'奇门中开门、休门、生门等八种"门"，分别代表不同的行动方向与性质。',
  '开门':'八门之一，代表开启与顺利，传统认为求前景、开创的事宜看开门。',
  '生门':'八门之一，代表生机与收益，传统认为求财、求增长的事宜看生门。',
  '休门':'八门之一，代表休整与修复，需要缓一缓、补一补的时候对应它。',
  '值符':'奇门盘中统领全局的核心符号，代表当下最强势的时空能量。',

  /* —— 梅花易数（梅花卡片）—— */
  '卦象':'八卦符号呈现出的整体状态，梅花易数用卦象来观察一件事的当前与走势。',
  '本卦':'起卦得到的初始卦，代表事情的当前状态。',
  '变卦':'动爻变化后形成的新卦，代表事情后续可能的走向。',
  '动爻':'卦中发生阴阳变化的那一爻，是"事情正在变化"的线索。',

  /* —— 五行十神组合词 —— */
  '比劫':'比肩与劫财的合称，代表同辈、竞争者与自我意志相关的那股力量。',
  '食伤':'食神与伤官的合称，代表才华输出、表达与创造力的能量。',
  '财星':'正财与偏财的合称，代表财富相关的人事物与机会。',
  '官星':'正官与七杀的合称，在传统婚恋语境里也常指女命的夫缘。',
  '印星':'正印与偏印的合称，代表学习、庇护与"被支持"的力量。',
  '枭神':'偏印的另一种叫法，代表偏门钻研与独立学习的能力。',
  '透干':'某个五行直接显现在天干上，比藏在地支里更"明面、主动"。',
  '通根':'地支里有与天干同五行的根基，说明这个天干的力量更扎实。',
  '墓库':'五行能量收敛、收藏的状态，常用来解释"机会攒着、暂时没显形"。',
  '伏吟':'干支在原地重复，主事情反复、原地打转、进展缓慢的感觉。',
  '反吟':'干支两两相冲，主变动、反复、计划赶不上变化。',
  '长生':'十二长生之一，代表事物萌芽起步、生命力刚生发出来的阶段。',
  '帝旺':'十二长生之一，代表能量最旺盛、最得力的阶段。',
  '胎':'十二长生之一，代表事物还未显形、刚刚孕育的阶段。',
  '养':'十二长生之一，代表孕育完成、蓄势待发的阶段。',

  /* —— 常用实务词 —— */
  '真太阳时':'按出生地经度精算出来的"当地真实太阳时间"，比统一北京时间更贴近命理用的时辰。',
  '本命年':'流年地支与自己出生年地支相同的年份，传统认为该年宜守稳、少折腾。',
  '冲太岁':'流年地支与出生年地支相冲的年份，主变动、迁移、计划调整较多。',
  '犯太岁':'流年与出生年地支之间存在冲、刑、害、破关系的统称，提醒当年多留意人际与决策。',
  '流月':'每个月的干支组合，比流年更细的短期运势颗粒度。',
  '节气':'二十四节气，农历月份的分界依据，也是排大运、定流月的基准点。',
  '正缘':'命理语境里指向"正经、可长期发展"的姻缘对象，区别于短暂桃花。',
  '八字合婚':'把两个人的八字放在一起比较五行、十神与宫位的匹配度，作为关系参考。',
  '排盘':'把出生时间按规则换算成干支命盘的过程，是后续一切分析的第一步。',
  '六十甲子':'天干十个与地支十二个两两组合成的六十个干支单位，纪年纪月纪日都用它。',

  /* —— 合冲刑害具体关系 —— */
  '六合':'十二地支中两两相合的组合（如子丑合），主关系融洽、合作顺利，是命理里的"合好"关系。',
  '三刑':'地支之间互相刑克的组合（如寅巳申、丑戌未），主是非、矛盾与纠葛。',
  '自刑':'同一个地支自我刑克的情形，如辰辰、午午，主自我较劲、内耗。',
  '相害':'地支之间暗中损耗的关系，也称六害，主表面无事、实际互相消耗。',
  '天干五合':'十个天干中两两相合的五组关系（如甲己合、乙庚合），主亲合与借力。',
  '半合':'三合局中只出现两个地支的组合，力量比完整三合弱，但仍有一定加成。',
  '拱合':'三合局缺中间一字、两头相夹的情形，主暗中扶持或隐而未显的助力。',

  /* —— 格局组合（两神搭配的经典论断）—— */
  '官印相生':'正官与正印搭配，主稳定升迁、以德服人，传统视为事业顺遂的组合。',
  '杀印相生':'七杀得印星化解，主压力转化为魄力，闯劲与格局并存。',
  '伤官配印':'伤官与印星搭配，主才华有约束、能成事，是文采与章法兼备的组合。',
  '食神制杀':'食神克制七杀，主以柔克刚、化险为夷，适合处理棘手局面。',
  '伤官见官':'伤官与正官相遇，主不受管束、易起冲突，传统上视为需要谨慎的配置。',
  '枭神夺食':'偏印克食神，主"眼看要到手的机会被截胡"，提醒留一手。',
  '比劫夺财':'比肩劫财分走财星，主合伙破财、竞争分利，财务上宜早立规则。',
  '财官双美':'财星与官星皆旺，主富贵兼备、事业财富两顺的组合。',
  '食伤生财':'食神伤官生助财星，主靠才华与输出赚钱，越表达越有财。',

  /* —— 长生十二宫补全 —— */
  '沐浴':'十二长生之一，主事物初显但根基未稳，像刚洗完澡的状态，经验尚浅。',
  '冠带':'十二长生之一，主事物成形、开始有名分与位置的阶段。',
  '临官':'十二长生之一，主事物到了能自立门户、独当一面的阶段。',
  '衰':'十二长生之一，主能量开始由盛转弱，需要控制节奏。',
  '病':'十二长生之一，主能量疲惫、容易出错，宜休整不宜硬扛。',
  '死':'十二长生之一，主旧有状态终结，也意味着新的循环即将开始。',
  '墓':'十二长生之一，主能量收藏入库，机会"攒着但暂时不显形"。',
  '绝':'十二长生之一，主能量近乎归零，但绝处常是新一轮生机的起点。',

  /* —— 六亲宫位 —— */
  '年柱':'四柱中的第一柱，代表早年、祖辈与根基，也常关联成长环境。',
  '月柱':'四柱中的第二柱，代表青年时期、父母兄弟与事业根基（月令所在）。',
  '日柱':'四柱中的第三柱，天干是日主本人，地支是配偶宫，代表中年与核心自我。',
  '时柱':'四柱中的第四柱，代表晚年、子女与人生收尾阶段的运势。',
  '六亲':'命理中对父母、兄弟姐妹、配偶、子女等亲属关系的统称，按十神映射。',
  '配偶宫':'日柱地支，代表婚姻伴侣的位置，看感情质量常从这里入手。',
  '财库':'财星入墓库的状态，主攒钱能力强，但需要时机打开才见收益。',
  '官杀':'正官与七杀的合称，代表事业、责任与约束，女命语境也关联夫缘。',

  /* —— 婚恋 —— */
  '红鸾':'传统婚恋吉星之一，主喜事、姻缘与嫁娶信号。',
  '天喜':'与红鸾常并称的吉星，主喜庆之事，婚恋语境里也是好信号。',
  '烂桃花':'看似热闹但消耗感情的缘分，主短暂、暧昧或带来麻烦的关系。',
  '正桃花':'正经、可长期发展的异性缘分，区别于烂桃花。',
  '孤辰寡宿':'一组主孤独感的星神，传统上认为缘分较晚或较淡，需主动经营关系。',

  /* —— 大运流年细节 —— */
  '起运':'大运开始运行的年龄与时间点，不同人起运早晚不同。',
  '交运':'从一个十年大运切换到下一个大运的节点，传统认为前后会有状态变化。',
  '岁运':'流年与大运的合称，分析某一年运势时二者叠加判断。',
  '月建':'当月地支的当值状态，是判断当月能量环境的基础。',
  '太岁':'流年的干支化身，传统上视为当年"当值的主宰"，冲犯多提示变动。',

  /* —— 其他常用 —— */
  '从格':'日主极弱、顺势跟随旺方五行的特殊格局，与传统扶抑思路相反。',
  '专旺格':'某种五行极旺、日主专一的格局，顺势而为则顺。',
  '化气格':'天干五合后化出另一种五行的特殊格局，少见但特征鲜明。',
  '假从':'表面顺从旺方、实际仍有牵制的从格状态，比纯从更灵活。',
  '胎元':'按出生月份推算的一个辅助干支，代表"先天受气"的环境底色。',
  '小限':'紫微斗数中按年龄逐年轮转的宫位，比流年更细的年度观察角度。'
};
// 供 AI 术语检索复用，避免 GLOSSARY 与 KB.terms 两份词表各自漂移
try{ window.__TJ_GLOSSARY__=GLOSSARY; }catch(e){}
let _glossKeys=null;
let _annotatedTerms=new Set();
function _getGlossKeys(){
  if(_glossKeys)return _glossKeys;
  _glossKeys=Object.keys(GLOSSARY).sort((a,b)=>b.length-a.length);
  return _glossKeys;
}
function resetGlossaryState(){_annotatedTerms=new Set();}
/* 术语解释 v2：取消自动下划线标注，改为「选中文字 → 右键/长按 → 解释」。
   此函数保留导出兼容，但不再生成 .glossary-term 下划线标注。 */
function annotateGlossary(root){
  /* no-op：不再自动标注术语（改为选中解释，见 installSelectionGloss） */
  void root;
}
/* ---- 选中文字解释（右键/长按菜单 + 选区浮动解释） ---- */
function matchGlossText(text){
  if(!text)return null;
  const t=String(text).trim().replace(/\s+/g,' ');
  if(!t||t.length>40)return null;
  if(GLOSSARY[t])return t;
  let best=null;
  const keys=_getGlossKeys();
  for(let i=0;i<keys.length;i++){
    const k=keys[i];
    if(t.includes(k)&&(!best||k.length>best.length))best=k;
  }
  return best;
}
function openGlossAt(term,x,y){
  const def=GLOSSARY[term];if(!def)return;
  let pop=document.getElementById('glossPop');
  if(!pop){
    pop=document.createElement('div');pop.className='gloss-pop';pop.id='glossPop';
    pop.innerHTML='<div class="gloss-pop-tt" id="glossPopTt"></div><div class="gloss-pop-bd" id="glossPopBd"></div>'+
      '<button type="button" class="gloss-pop-ai" id="glossPopAi" aria-label="问问大师深度解读"></button>';
    pop.querySelector('#glossPopAi').addEventListener('click',()=>{
      const t=document.getElementById('glossPopTt').textContent;
      pop.classList.remove('open');
      askMasterGloss(t);
    });
    document.body.appendChild(pop);
  }
  document.getElementById('glossPopTt').textContent=term;
  document.getElementById('glossPopBd').textContent=def;
  const aiBtn=document.getElementById('glossPopAi');
  aiBtn.innerHTML=GLOSS_AI_ICON+'<span class="gloss-pop-ai-txt">问问大师</span>';
  aiBtn.setAttribute('aria-label','问问大师深度解读「'+term+'」');
  aiBtn.title='问问大师深度解读「'+term+'」';
  const vw=window.innerWidth,vh=window.innerHeight;
  let left=Math.min(Math.max(12,x),vw-272);
  let top=y+10;
  if(top+170>vh)top=Math.max(12,y-170);
  pop.style.left=left+'px';pop.style.top=top+'px';
  pop.classList.add('open');
}
/* 选中术语 → 跳转问问大师聊天界面并提问 */
const GLOSS_AI_ICON='<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6L12 2z"/><path d="M18.5 3l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.6z" opacity=".75"/></svg>';
function askMasterGloss(term){
  const q='「'+term+'」是什么意思？能用大白话给我讲讲吗，最好结合我的命盘说说它对我是利是弊。';
  if(typeof window.openAsk==='function')window.openAsk();
  setTimeout(()=>{ if(typeof window.doAsk==='function')window.doAsk(q); },260);
}
/* 清除所有选中解释 UI（胶囊/底部条/ Dock 临时操作条） */
function hideGlossUI(){
  document.getElementById('glossChip')?.remove();
  restoreDockGloss();
}
/* 恢复 Dock 原始内容 */
function restoreDockGloss(){
  const inner=document.getElementById('tabBar')?.querySelector('.tab-bar-inner');
  if(inner&&inner.dataset.dockOriginal){
    inner.innerHTML=inner.dataset.dockOriginal;
    delete inner.dataset.dockOriginal;
    inner.classList.remove('dock-gloss-mode');
  }
}
/* 移动端：选中术语后，操作按钮融入底部 Dock 栏（临时替换 Dock 内容） */
let _glossRect=null;          // 当前选区的视口坐标，解释弹窗据此定位到文字旁
let _dockArmAt=0;             // Dock 操作按钮防误触冷却截止时间
function showDockGloss(term,rect){
  _glossRect=rect||null;
  const inner=document.getElementById('tabBar')?.querySelector('.tab-bar-inner');
  if(!inner)return;
  if(!inner.dataset.dockOriginal)inner.dataset.dockOriginal=inner.innerHTML;
  inner.classList.add('dock-gloss-mode');
  inner.innerHTML=
    '<button type="button" class="dock-gloss dock-gloss-x" data-act="explain">解释「'+term+'」</button>'+
    '<button type="button" class="dock-gloss dock-gloss-ai" data-act="ask" aria-label="问问大师深度解读「'+term+'」">'+GLOSS_AI_ICON+'<span>问问大师</span></button>'+
    '<button type="button" class="dock-gloss-close" data-act="dismiss" aria-label="关闭">×</button>';
  // 防底部误触：操作按钮先进入 500ms 冷却（置灰不可点），防止滑选后抬手误触
  _dockArmAt=Date.now()+500;
  inner.classList.add('dock-gloss-arm');
  setTimeout(()=>inner.classList.remove('dock-gloss-arm'),520);
  const explain=inner.querySelector('[data-act="explain"]');
  explain.dataset.term=term;
  explain.addEventListener('click',function(e){
    e.stopPropagation();
    if(Date.now()<_dockArmAt)return;
    const t=this.dataset.term||'';
    restoreDockGloss();
    const r=_glossRect;
    if(r)openGlossAt(t,Math.min(r.left,window.innerWidth-160),r.bottom+8);
    else openGlossAt(t,Math.min(window.innerWidth-150,window.innerWidth/2),Math.max(12,window.innerHeight-230));
  });
  const ask=inner.querySelector('[data-act="ask"]');
  ask.dataset.term=term;
  ask.addEventListener('click',function(e){
    e.stopPropagation();
    if(Date.now()<_dockArmAt)return;
    const t=this.dataset.term||'';
    restoreDockGloss();
    askMasterGloss(t);
  });
  inner.querySelector('[data-act="dismiss"]').addEventListener('click',function(e){
    e.stopPropagation();
    if(Date.now()<_dockArmAt)return;
    restoreDockGloss();
  });
}
function installSelectionGloss(){
  /* 1) 右键 / Android 长按：命中术语 → 自定义菜单（解释/问问大师/复制/取消） */
  document.addEventListener('contextmenu',function(e){
    const sel=window.getSelection();
    const text=(sel&&sel.toString)?sel.toString():'';
    const term=matchGlossText(text);
    document.getElementById('glossCtx')?.remove();
    if(!term)return;
    e.preventDefault();
    const menu=document.createElement('div');
    menu.className='gloss-ctx';menu.id='glossCtx';
    menu.innerHTML=
      '<button type="button" class="gloss-ctx-item" data-act="explain">解释「'+term+'」</button>'+
      '<button type="button" class="gloss-ctx-item ai" data-act="ask" aria-label="问问大师解读「'+term+'」" title="问问大师解读「'+term+'」">'+GLOSS_AI_ICON+'</button>'+
      '<button type="button" class="gloss-ctx-item" data-act="copy">复制选中文字</button>'+
      '<button type="button" class="gloss-ctx-item" data-act="dismiss">取消</button>';
    const vw=window.innerWidth,vh=window.innerHeight;
    let left=Math.min(e.clientX,vw-176),top=e.clientY;
    if(top+170>vh)top=Math.max(8,e.clientY-170);
    menu.style.left=left+'px';menu.style.top=top+'px';
    document.body.appendChild(menu);
    const cleanup=()=>menu.remove();
    menu.querySelector('[data-act="explain"]').addEventListener('click',()=>{cleanup();openGlossAt(term,left,top);});
    menu.querySelector('[data-act="ask"]').addEventListener('click',()=>{cleanup();askMasterGloss(term);});
    menu.querySelector('[data-act="copy"]').addEventListener('click',()=>{
      try{navigator.clipboard?.writeText(text);}catch(err){}
      cleanup();
    });
    menu.querySelector('[data-act="dismiss"]').addEventListener('click',cleanup);
    setTimeout(()=>document.addEventListener('click',function once(){cleanup();document.removeEventListener('click',once);},{once:true}),0);
  },true);

  /* 2) 选区浮动单胶囊（左解释 + 右问问大师图标，颜色区分） */
  let t=null;
  document.addEventListener('selectionchange',function(){
    clearTimeout(t);
    t=setTimeout(()=>{
      const sel=window.getSelection();
      const text=(sel&&sel.toString)?sel.toString():'';
      const term=matchGlossText(text);
      if(!term||!sel||!sel.rangeCount){
        hideGlossUI();return;
      }
      const rect=sel.getRangeAt(0).getBoundingClientRect();
      if(rect.width===0&&rect.height===0){
        hideGlossUI();return;
      }
      // 移动端：操作按钮融入底部 Dock 栏；桌面端：悬浮胶囊
      const isTouch=('ontouchstart' in window)||(navigator.maxTouchPoints>0);
      if(isTouch){ showDockGloss(term,rect); return; }
      let chip=document.getElementById('glossChip');
      if(!chip){
        chip=document.createElement('button');
        chip.type='button';chip.id='glossChip';chip.className='gloss-chip';
        chip.innerHTML='<span class="gloss-chip-x"></span><span class="gloss-chip-ai" aria-hidden="true">'+GLOSS_AI_ICON+'</span>';
        chip.addEventListener('click',function(e){
          const t=this.dataset.term||'';
          const r=this.getBoundingClientRect();
          hideGlossUI();
          if(e.target.closest('.gloss-chip-ai')){ askMasterGloss(t); }
          else { openGlossAt(t,r.left,r.bottom+6); }
        });
        document.body.appendChild(chip);
      }
      chip.dataset.term=term;
      chip.querySelector('.gloss-chip-x').textContent='解释「'+term+'」';
      chip.setAttribute('aria-label','解释「'+term+'」；右侧星标可问问问大师');
      chip.title='解释「'+term+'」 · 右侧星标问问大师';
      const xW=14+chip.querySelector('.gloss-chip-x').textContent.length*13;
      const chipW=Math.min(210,Math.max(132,xW+46));
      let top=rect.top-42;
      if(top<12)top=rect.bottom+8;
      let cx=Math.max(12,Math.min(rect.left+rect.width/2-chipW/2,window.innerWidth-chipW-12));
      chip.style.left=cx+'px';chip.style.top=top+'px';
    },220);
  });

  /* 点击任意处关闭右键菜单并恢复 Dock */
  document.addEventListener('click',function(){
    document.getElementById('glossCtx')?.remove();
    restoreDockGloss();
  });
}
function showGlossPop(e){
  // 新手版与大师版均可点译：专业阅读时也无需离开报告查术语。
  e.stopPropagation();
  const trigger=e.currentTarget||e.target;
  const term=trigger.dataset.term;
  const def=GLOSSARY[term];if(!def)return;
  let pop=document.getElementById('glossPop');
  if(!pop){
    pop=document.createElement('div');pop.className='gloss-pop';pop.id='glossPop';
    pop.innerHTML='<div class="gloss-pop-tt" id="glossPopTt"></div><div class="gloss-pop-bd" id="glossPopBd"></div>';
    document.body.appendChild(pop);
  }
  document.getElementById('glossPopTt').textContent=term;
  document.getElementById('glossPopBd').textContent=def;
  const r=trigger.getBoundingClientRect();
  const vw=window.innerWidth,vh=window.innerHeight;
  let left=Math.min(Math.max(12,r.left),vw-272);
  let top=r.bottom+8;
  if(top+120>vh)top=Math.max(12,r.top-8-120);
  pop.style.left=left+'px';pop.style.top=top+'px';
  pop.classList.add('open');
}
document.addEventListener('click',function(e){
  const pop=document.getElementById('glossPop');
  if(pop&&pop.classList.contains('open')&&!e.target.closest('.glossary-term,.gloss-ctx,.gloss-chip,.gloss-bar,.dock-gloss')){pop.classList.remove('open');}
});

function wrapProCollapsibles(root){
  if(!root)return;
  root.querySelectorAll('.pls, .qr-grid, table').forEach(el=>{
    if(el.dataset.proWrapped)return;
    el.dataset.proWrapped='1';
    const wrap=document.createElement('div');
    wrap.className='pro-wrap collapsed';
    el.parentNode.insertBefore(wrap,el);
    wrap.appendChild(el);
    const btn=document.createElement('div');
    btn.className='pro-toggle';
    btn.textContent='查看专业数值 ▾';
    btn.addEventListener('click',()=>{
      const collapsed=wrap.classList.toggle('collapsed');
      btn.textContent=collapsed?'查看专业数值 ▾':'收起专业数值 ▴';
    });
    wrap.parentNode.insertBefore(btn,wrap);
  });
}

function enrichBeginnerContent(root){annotateGlossary(root);wrapProCollapsibles(root);}

function setUserMode(mode){
  const isBeginner=mode==='beginner';
  document.body.classList.toggle('beginner-mode',isBeginner);
  try{localStorage.setItem('tj_user_mode',mode);}catch(e){}
  const beginnerBtn=document.getElementById('modeBeginner');
  const masterBtn=document.getElementById('modeMaster');
  if(beginnerBtn&&masterBtn){
    beginnerBtn.classList.toggle('active',isBeginner);
    masterBtn.classList.toggle('active',!isBeginner);
    beginnerBtn.setAttribute('aria-selected',isBeginner?'true':'false');
    masterBtn.setAttribute('aria-selected',isBeginner?'false':'true');
  }
  const pop=document.getElementById('glossPop');if(pop)pop.classList.remove('open');
  // 初次切入新手版时，确保动态生成的报告也完成了术语标注和数据折叠。
  if(isBeginner)enrichBeginnerContent(document.getElementById('p2Inner'));
}
/* 顶部右侧圆形按钮：打开日历模式（不改变新手/大师阅读模式） */
function openCalendarMode(){
  const fab=document.getElementById('calFab');
  if(fab)fab.classList.add('active');
  if(typeof window.openToolPage==='function')window.openToolPage('calendar');
}
function toggleUserMode(){setUserMode(document.body.classList.contains('beginner-mode')?'master':'beginner');}
(function initUserMode(){
  // 默认给首次使用者更易读的新手版；用户的手动选择会被记住。
  let mode='beginner';
  try{mode=localStorage.getItem('tj_user_mode')||'beginner';}catch(e){}
  setUserMode(mode);
})();
(function observeReportContent(){
  const target=document.getElementById('p2Inner');
  if(!target||typeof MutationObserver==='undefined')return;
  let t=null;
  const obs=new MutationObserver(()=>{
    clearTimeout(t);
    t=setTimeout(()=>enrichBeginnerContent(target),120);
  });
  obs.observe(target,{childList:true,subtree:true});
})();

/* 工具中心增强：搜索、分类、键盘可用性与更清晰的工具入口 */
initToolCenterSearch();

/* v3：统一工具引擎。每个工具只有“输入—判断—行动”三步，避免各自为政。 */
initToolEngineV3();

/* ============================================================================
   摇签问卜 · 专业签诗库（ORACLE_SIGNS）
   结构：每种签为一个数组，每首含
     n    签号
     grade 等级（上上签 / 上签 / 中签 / 下签）
     name 签名（典故出处）
     poem 签诗（七言四句）
     yi   圣意 / 签语
     jie  解曰（解读）
     dian 典故（出处故事）
   内容以传统签式写成，用于自我反思与行动参考，不作定论。
   ============================================================================ */
window.ORACLE_SIGNS = {
  '观音签':[
    {n:1,grade:'上上签',name:'钟离成道',poem:'开天辟地作良缘，吉日良时万物全。\n若得此签非小可，公侯将相在眼前。',yi:'开运亨通 · 功名显达 · 谋事皆成',jie:'此签居百签之首，主时运大开、根基已成。所求之事正当其时，宜把握机遇、积极作为，不必犹豫徘徊。',dian:'锺离权（正阳真人）悟道飞升之典，喻缘法具足、功到自然成。'},
    {n:2,grade:'上上签',name:'董永遇仙',poem:'鲸鱼未变守江河，不可升天离碧波。\n异日峥嵘身变化，许君一跃跳龙门。',yi:'潜龙在渊 · 待时而动 · 贵人来助',jie:'当下虽未显达，实乃蓄势之象。不宜躁进，待机缘成熟，自有贵人提携，一跃而上。',dian:'董永孝心感天、七仙女下凡结缘之典，喻至诚动天、困极则通。'},
    {n:3,grade:'中签',name:'董永卖身',poem:'临风冒雨去还乡，正是役役燕儿忙。\n衔得泥来成叠后，到头叠坏复成泥。',yi:'劳心费力 · 守成为宜 · 莫贪虚名',jie:'此签主奔波劳碌、所成有限。宜守本分、务实积累，勿为虚名所累，凡事慢一步方稳。',dian:'董永卖身葬父、辛勤偿债之典，喻责任心重、吃苦方能立业。'},
    {n:4,grade:'中签',name:'玉莲重圆',poem:'千年古镜复重圆，女再求夫男再婚。\n自此门庭多吉庆，更添福禄共团圆。',yi:'破镜重圆 · 旧好复续 · 家宅安康',jie:'离散者将复合，中断者将再续。事虽迟来，终归圆满，宜以包容待之。',dian:'玉莲历经离散终与十朋团聚之典，喻缘分未尽、守得云开。'},
    {n:5,grade:'中签',name:'刘晨遇仙',poem:'一锄二锄三四锄，五亩良田未足畊。\n依旧卖柴并卖水，推车到此运渐通。',yi:'勤苦立业 · 渐入佳境 · 莫嫌微利',jie:'初始辛苦、进项微薄，然持之以恒，运数将转。宜脚踏实地，不弃细流。',dian:'刘晨、阮肇入天台山遇仙之典，喻辛苦之中自有奇遇，贵在坚持。'},
    {n:6,grade:'中签',name:'仁贵遇主',poem:'投身岩下饲于菟，须是还他大丈夫。\n舍己还应难再得，通行天下此人无。',yi:'患难识真 · 终遇明主 · 名扬四方',jie:'困顿之中见本色，真才终被识用。宜守节操、待风云际会，自有出头之日。',dian:'薛仁贵埋名又显、终得李世民赏识之典，喻英雄不遇、遇则腾达。'},
    {n:7,grade:'下签',name:'苏娘涉险',poem:'奔波役役苦艰难，守旧安居莫起奸。\n行到不如休去好，遇危只宜问神仙。',yi:'诸事阻滞 · 守静为上 · 勿生妄念',jie:'此签主困顿多阻，强求反损。宜退守、安分勿动，待凶险过去再图。',dian:'苏秦游说受挫、狼狈归乡之典，喻时运不济、当敛锋芒。'},
    {n:8,grade:'上签',name:'裴度还带',poem:'茂林松柏耐风霜，雨雪纷纷总不摧。\n异日自然成大用，功名事业自安排。',yi:'坚忍不拔 · 晚成可期 · 德厚福临',jie:'如松柏经寒而益坚，逆境正可炼性。坚守正道，功名自有安排，不必焦虑。',dian:'裴度拾带还主、积德状元之典，喻善行有报、德厚者终显。'},
    {n:9,grade:'中签',name:'渊明归隐',poem:'舟到中流忽折舵，方知水上起风波。\n若求安稳无惊险，缩手回湾且暂过。',yi:'中途生变 · 宜退宜守 · 避其锋锐',jie:'事至中途忽生波折，硬闯有险。宜暂收手、回旋以避，过此关口再进。',dian:'陶渊明不为五斗米折腰、归隐田园之典，喻审时度势、知退保身。'},
    {n:10,grade:'上签',name:'刘备招亲',poem:'朦朦胧胧渺渺间，天台有路入云端。\n东风一举扶摇上，佳偶良缘两团圆。',yi:'喜事临门 · 姻缘天定 · 乘势而上',jie:'喜庆将至，婚缘或合作皆顺。宜乘东风、借势而为，喜事可成双。',dian:'刘备东吴招亲、弄假成真之典，喻看似险局、实则良缘暗成。'},
    {n:11,grade:'中签',name:'苏武牧羊',poem:'雪地冰天十九年，节旄落尽志犹坚。\n他日归汉恩荣重，方信初心不可迁。',yi:'守节不移 · 久困终回 · 信有后福',jie:'身处困厄而心志不改，虽久必回。宜忍辱负重、守定初心，时来终得昭雪。',dian:'苏武持节牧羊、十九年不改其志之典，喻忠信可感天、久屈必伸。'},
    {n:12,grade:'下签',name:'伯夷采薇',poem:'首阳山下采薇行，不食周粟守清名。\n清节虽高多寂寞，此心孤洁少人明。',yi:'孤高守节 · 清贫自甘 · 知音难觅',jie:'此签主清高而孤独，坚持己见却少人理解。宜量力而行，勿因守节而绝生路。',dian:'伯夷、叔齐不食周粟、隐于首阳之典，喻气节可贵、亦须审时。'},
    {n:13,grade:'上签',name:'张良遇黄石',poem:'圯上老人授素书，潜修数载运方舒。\n一朝佐汉开基业，功成身退是真儒。',yi:'得遇明师 · 韬光养晦 · 功成知退',jie:'得良师指点为幸，宜沉潜修习、待时而发。事成之后，知进退方得善终。',dian:'张良圯上纳履、得黄石公兵书之典，喻谦下受教、厚积薄发。'},
    {n:14,grade:'中签',name:'王质烂柯',poem:'樵客入山观弈棋，斧柯烂尽不知时。\n归来城郭人民改，一局之间世事移。',yi:'光阴易逝 · 超然物外 · 莫恋尘劳',jie:'世间荣枯转瞬即变，执着反生烦恼。宜放宽心境、不为一时得失所困。',dian:'王质观棋烂柯、山中方一日世上已千年之典，喻世事如棋、修心为本。'},
    {n:15,grade:'上上签',name:'麻姑献寿',poem:'东海扬尘几度秋，麻姑指爪暂经酬。\n蟠桃已熟瑶池宴，福寿双全乐未休。',yi:'福寿康宁 · 喜庆绵长 · 诸事吉祥',jie:'此签主福寿双全、喜庆盈门。所求皆吉，宜行善积德以承此运。',dian:'麻姑献寿、三见东海扬尘之典，喻长生久视、福缘深厚。'},
    {n:16,grade:'中签',name:'范蠡归湖',poem:'功成名遂早抽身，五湖烟水了余生。\n千金散尽还复聚，知止不殆是聪明。',yi:'功成身退 · 知足不辱 · 散财聚德',jie:'盛时当思退步，盈满则亏。宜知止、勿恋权财，退而能安、散而能聚。',dian:'范蠡助越灭吴后泛舟五湖之典，喻知进退、全始终。'}
  ],
  '文王签':[
    {n:1,grade:'上上签',name:'乾卦·潜龙勿用',poem:'潜龙在渊未可飞，藏锋养晦待时机。\n一朝云起风雷动，九五飞龙在天衢。',yi:'潜藏待时 · 勿妄动 · 大器晚成',jie:'乾卦初爻，阳刚潜藏。此时宜蛰伏蓄力，不宜轻举。时至则飞龙在天，势不可挡。',dian:'《易·乾》"潜龙勿用"，喻君子藏器于身、待时而动。'},
    {n:2,grade:'上上签',name:'坤卦·厚德载物',poem:'地势坤元厚且平，含章可贞事乃成。\n承天顺运行无咎，安贞之吉永和平。',yi:'顺天安贞 · 包容承载 · 以静制动',jie:'坤卦主顺，宜柔顺包容、守正不移。以静制动、以厚载物，自然无咎而吉。',dian:'《易·坤》"厚德载物"，喻顺承天道、以柔济刚。'},
    {n:3,grade:'中签',name:'屯卦·云雷屯',poem:'云雷屯塞草木萌，初生艰难未得亨。\n盘桓利居贞固志，经纶有待一朝清。',yi:'初创维艰 · 守正待清 · 勿急进',jie:'屯者，物之始生也。事业初创多阻，宜固守本志、徐图经营，不可冒进。',dian:'《易·屯》"刚柔始交而难生"，喻创业之初、困而求通。'},
    {n:4,grade:'中签',name:'蒙卦·山下出泉',poem:'山下出泉未达海，蒙童求我启其才。\n果行育德须耐心，雾散自见月明来。',yi:'启蒙待教 · 耐心导引 · 渐见光明',jie:'蒙卦主启蒙，事在初学未明。宜虚心受教、循序渐进，雾散则月明。',dian:'《易·蒙》"山下出泉，蒙"，喻童蒙求我、果行育德。'},
    {n:5,grade:'中签',name:'需卦·云上于天',poem:'云上于天尚未雨，饮食宴乐且安居。\n需于郊野无咎害，躁进逢凶慎所趋。',yi:'待时而动 · 饮食宴乐 · 戒躁进',jie:'需者，须也。时机未至，宜安守、养精蓄锐。妄动则险，耐心乃吉。',dian:'《易·需》"云上于天，需"，喻饮食宴乐、待命而行。'},
    {n:6,grade:'下签',name:'讼卦·天水违行',poem:'天与水违争不已，争端初起慎防危。\n退让一言终得吉，讼终受屈悔迟归。',yi:'争讼多凶 · 宜和为贵 · 退让免灾',jie:'讼卦主争，强争必损。宜和解、退一步，硬讼到底终受其屈。',dian:'《易·讼》"天与水违行"，喻争辩不息、和为贵。'},
    {n:7,grade:'中签',name:'师卦·地中有水',poem:'地中有水聚众行，丈人持律可功成。\n纪律严明兵不躁，出师有律得荣名。',yi:'用众以律 · 恩威并施 · 持重得胜',jie:'师卦主军事，聚众行事贵在有律。宜立规矩、任贤能，持重则功成。',dian:'《易·师》"地中有水，师"，喻以正治国、用众有律。'},
    {n:8,grade:'上签',name:'比卦·水在地上',poem:'水在地上亲相辅，先迷后得主乃亨。\n比之无首终无咎，亲贤乐群自太平。',yi:'亲比相辅 · 择善而从 · 众志成城',jie:'比卦主亲辅，宜结良朋、依附贤明。同心相济，虽初迷终亨。',dian:'《易·比》"水在地上，比"，喻亲附得人、和乐太平。'},
    {n:9,grade:'中签',name:'小畜·风行天上',poem:'风行天上云未雨，小畜之时宜养文。\n密云不雨须待月，积微成著渐敷陈。',yi:'小有所蓄 · 文德渐进 · 待时而施',jie:'小畜主小成，力量未充。宜修文德、积小善，待时而发，勿求骤进。',dian:'《易·小畜》"风行天上"，喻积蓄未盛、以懿文德。'},
    {n:10,grade:'中签',name:'履卦·上天下泽',poem:'履虎尾兮不咥人，危行兢兢步亦辛。\n素履往而无咎害，履道坦坦保其身。',yi:'履危而慎 · 素位而行 · 临深履薄',jie:'履卦主行，如履虎尾。宜谨慎恭行、守本分，险中求安、方得无咎。',dian:'《易·履》"上天下泽，履"，喻辨上下、慎其所履。'},
    {n:11,grade:'上上签',name:'泰卦·天地交泰',poem:'天地交泰气氤氲，小往大来万象新。\n君子道长阴渐退，太平有象乐无垠。',yi:'通泰安康 · 阴阳和合 · 诸事顺遂',jie:'泰卦主通，天地交而万物通。时运大开，上下和同，所谋皆遂。',dian:'《易·泰》"天地交，泰"，喻小往大来、吉亨之象。'},
    {n:12,grade:'下签',name:'否卦·天地不交',poem:'天地不交闭塞成，小人道长君子隐。\n否极泰来终有日，俭德避难待时清。',yi:'闭塞之秋 · 君子隐退 · 否极泰来',jie:'否卦主塞，上下不通、小人道长。宜俭德避难、韬光养晦，待否极泰来。',dian:'《易·否》"天地不交，否"，喻时运乖舛、守正待转。'}
  ],
  '关帝签':[
    {n:1,grade:'上上签',name:'关公受封',poem:'丹心贯日气如虹，汉寿亭侯爵位崇。\n义薄云天垂万古，威灵显赫护苍穹。',yi:'忠义昭彰 · 名位显达 · 威德护身',jie:'此签主忠义立身、名扬天下。守正持义者得神佑，谋事光明，无往不利。',dian:'关羽封汉寿亭侯、后世尊为关圣之典，喻忠义感天、德威并隆。'},
    {n:2,grade:'上上签',name:'桃园结义',poem:'桃园三结义参天，誓同生死矢弗谖。\n手足同心金可断，扶持大业共安然。',yi:'同心协力 · 结义扶持 · 共成大业',jie:'兄弟同心、其利断金。宜结同心之盟、信守承诺，互助则事无不济。',dian:'刘关张桃园三结义之典，喻同心一德、共赴大事。'},
    {n:3,grade:'中签',name:'千里走单骑',poem:'匹马单刀护二嫂，过关斩将路迢迢。\n初心不改归刘处，历尽艰危志更骄。',yi:'历险不移 · 忠信克难 · 终达所归',jie:'虽沿途险阻，持忠信可过关。宜坚守本心、不畏艰难，终得归处。',dian:'关羽过五关斩六将、护嫂寻刘备之典，喻忠勇笃定、无往不胜。'},
    {n:4,grade:'上签',name:'单刀赴会',poem:'大江东去浪滔滔，独驾扁舟气自豪。\n谈笑从容风险地，英风凛凛动波涛。',yi:'胆识过人 · 从容处险 · 威望日隆',jie:'临大局面不改色，胆识自能化险。宜沉着应对、以诚制变，威望自隆。',dian:'关羽单刀赴鲁肃之会之典，喻临危不惧、谈笑定局。'},
    {n:5,grade:'中签',name:'刮骨疗毒',poem:'箭创毒入骨难支，谈笑围棋刃不移。\n神定气闲真勇士，痛中犹见丈夫姿。',yi:'忍痛坚忍 · 神闲气定 · 硬汉本色',jie:'患难之中见定力，能忍常人所不能忍。宜镇定处之，磨难反成砥砺。',dian:'关羽刮骨疗毒、弈棋自若之典，喻刚毅镇定、愈挫愈勇。'},
    {n:6,grade:'下签',name:'败走麦城',poem:'骄兵必败古来言，麦城一蹶叹黄昏。\n胜时莫忘防疏失，慎始慎终保子孙。',yi:'盛极当防 · 骄则生败 · 慎终如始',jie:'此签警盛极而衰、因骄致败。宜谦逊戒满、常存戒心，方保长久。',dian:'关羽败走麦城之典，喻功高易骄、满招损、谦受益。'},
    {n:7,grade:'上签',name:'水淹七军',poem:'决水淹军七寨平，擒于禁而斩庞德。\n威声震处群凶伏，帷幄运筹功自盈。',yi:'智取制胜 · 运筹帷幄 · 威震四方',jie:'以智取胜、不战而屈人。宜用谋略、把握形势，自能克敌建功。',dian:'关羽水淹七军、擒于禁斩庞德之典，喻善用天时、智勇双全。'},
    {n:8,grade:'中签',name:'华容释曹',poem:'华容狭道遇旧恩，释曹一念见情真。\n恩怨分明君子度，留余余地后来人。',yi:'恩怨分明 · 留有余地 · 义字当先',jie:'不忘旧恩、留一线生机，乃君子之度。宜宽厚待人、勿赶尽杀绝。',dian:'关羽华容道义释曹操之典，喻知恩图报、义重于利。'},
    {n:9,grade:'上签',name:'夜读春秋',poem:'青灯黄卷夜沉吟，春秋大义耿丹心。\n文武兼资真国士，明伦识礼值千金。',yi:'修文明理 · 兼资文武 · 德望日隆',jie:'勤学明理、文武兼修者成大事。宜读书自省、以礼自持，德望自高。',dian:'关羽夜读《春秋》、明大义之典，喻好学尚礼、内圣外王。'},
    {n:10,grade:'中签',name:'秉烛达旦',poem:'秉烛中宵待晓天，清宵独坐意岿然。\n避嫌守礼心如水，廉节从来可格天。',yi:'守礼避嫌 · 清节如水 · 操守可风',jie:'处嫌疑之地而守礼自持，清节可风。宜洁身自好、不蹈瓜田李下。',dian:'关羽秉烛立于户外、护嫂避嫌之典，喻礼法自守、皎如日月。'},
    {n:11,grade:'上上签',name:'显圣护民',poem:'赤兔虽逝魂犹在，千里驰灵护世人。\n有祷皆应灾厄免，义神赫濯庇苍旻。',yi:'有求必应 · 灾厄可免 · 神威护佑',jie:'义神护佑、有祷辄应。心存忠义、行事光明者，自得庇荫、逢凶化吉。',dian:'关帝显圣护民、威灵赫濯之典，喻正气长存、庇佑善人。'},
    {n:12,grade:'中签',name:'玉泉显圣',poem:'玉泉山色郁森森，旧识高僧话夙因。\n了却尘缘归法界，英雄末路亦天真。',yi:'勘破尘缘 · 归真返本 · 放下自在',jie:'英雄亦有归处，执念宜放。宜看淡成败、了却挂碍，方得自在安稳。',dian:'关羽玉泉山显圣、与普净论夙因之典，喻放下执念、返本归真。'}
  ],
  '城隍签':[
    {n:1,grade:'上上签',name:'城隍摄政',poem:'明镜高悬照九幽，赏善罚恶法如流。\n衙门公正民无怨，户户笙歌庆有秋。',yi:'公正廉明 · 赏罚有信 · 诸事昭雪',jie:'此签主公道昭彰、是非分明。涉讼争议宜凭凭据、求公正，自有清断。',dian:'城隍主一方生死善恶、赏罚无私之典，喻法度清明、善恶有报。'},
    {n:2,grade:'中签',name:'夜审阴司',poem:'更深烛影对公庭，细勘因由辨伪情。\n莫道幽冥无耳目，欺心一事也难明。',yi:'暗室慎独 · 莫欺于心 · 虚实在查',jie:'事有隐曲，宜细查凭据、勿欺暗室。公道虽迟，终现真情。',dian:'城隍夜审、照见人心之典，喻举头三尺有神明、欺心难瞒。'},
    {n:3,grade:'中签',name:'契约分明',poem:'立字为凭墨未干，分毫界限要端看。\n口说无凭须据实，免教异日起波澜。',yi:'凭约为重 · 界限清晰 · 免生后争',jie:'凡事宜立据、界限分明，口头难凭。先定规矩再行事，可免日后纷争。',dian:'城隍掌人间契约、断争讼之典，喻立约如山、信守为要。'},
    {n:4,grade:'下签',name:'冤狱蒙尘',poem:'覆盆之下不见天，一时冤屈锁寒烟。\n须凭明镜重开照，洗垢湔瑕待岁迁。',yi:'暂受冤抑 · 待明得雪 · 勿自弃',jie:'此签主暂时受屈、真相未白。宜忍辱守正、保留凭据，时机至自得昭雪。',dian:'城隍平反冤狱、洗冤泽物之典，喻覆盆终开、久屈必伸。'},
    {n:5,grade:'上签',name:'善恶分明',poem:'善棋一着满盘香，恶念分毫损福堂。\n积善之家有余庆，城隍簿上记端详。',yi:'善恶有报 · 积善余庆 · 慎其念头',jie:'一念之间、福祸立判。宜多行方便、慎勿起恶，善积则福自厚。',dian:'城隍善恶簿录、毫厘不爽之典，喻积善余庆、积恶余殃。'},
    {n:6,grade:'中签',name:'守界安分',poem:'各守封疆各安身，越界侵牟必起嗔。\n分内营生安稳过，强求邻土反伤神。',yi:'安分守界 · 勿侵他人 · 守己则安',jie:'宜守本分、不越界限、不侵他人。贪得邻利反招是非，守己乃安。',dian:'城隍划界主一方安宁之典，喻各安其分、界清则和。'},
    {n:7,grade:'上上签',name:'阴骘庇后',poem:'阴德无声种福田，不求人见自绵绵。\n儿孙受报家门盛，冥冥之中护善缘。',yi:'阴德绵长 · 惠及儿孙 · 善有善报',jie:'暗中行善、不求人知，其报在子孙。宜广积阴骘，家门自兴。',dian:'城隍录阴德、荫及后人之典，喻施恩不伐、福贻子孙。'},
    {n:8,grade:'中签',name:'法堂听断',poem:'公堂肃肃鼓初挝，两造陈词仔细查。\n兼听则明偏则暗，从容剖决莫偏差。',yi:'兼听则明 · 从容剖决 · 勿偏勿私',jie:'遇争议宜兼听双方、不偏不私。从容查证、依法裁断，方得公允。',dian:'城隍升堂听断、兼听得明之典，喻听讼贵公、偏则失正。'},
    {n:9,grade:'下签',name:'徇私招谴',poem:'一念徇私暗室欺，天平倾斜咎难辞。\n城隍笔下无私曲，漏网终归有报时。',yi:'徇私必败 · 公器勿私 · 回头是岸',jie:'此签警以私害公、终受其报。宜即时悔改、归公去私，方免后殃。',dian:'城隍惩徇私枉法者之典，喻公器不可私用、天网恢恢。'},
    {n:10,grade:'上上签',name:'一方清平',poem:'政善刑清风俗淳，闾阎无事乐生民。\n城隍坐镇妖氛息，岁岁平安福满门。',yi:'清平无事 · 风俗归淳 · 阖境安康',jie:'此签主境域清平、诸事安宁。宜守法向善、和睦乡邻，自有太平之福。',dian:'城隍坐镇一方、邪祟不侵之典，喻德政安民、邪不干正。'}
  ],
  '土地公签':[
    {n:1,grade:'上上签',name:'福德正神',poem:'田头陌上老翁慈，护五谷而佑四时。\n但使仓廪实如昔，一家温饱乐熙熙。',yi:'根基稳固 · 衣食丰足 · 家宅安康',jie:'此签主家宅安宁、生计有靠。宜脚踏实地、勤理田畴，温饱无忧。',dian:'土地公（福德正神）护农佑民之典，喻厚土生养、安身立命。'},
    {n:2,grade:'中签',name:'安土重迁',poem:'一抔故土足安身，何必飘蓬向外尘。\n守得门前桑与梓，春风岁岁长精神。',yi:'守土安生 · 勿务远迁 · 本固枝荣',jie:'宜安居守业、深耕本处，勿轻离故土求远。根基稳则枝叶荣。',dian:'安土重迁、敬田神之俗，喻安居乐业、本固邦宁。'},
    {n:3,grade:'中签',name:'春耕秋获',poem:'春来布谷唤耕勤，一粒入泥万颗新。\n莫道农功无厚报，仓箱既盈笑颜真。',yi:'勤种有获 · 春播秋成 · 务实积累',jie:'一分耕耘一分得。宜早作准备、持续投入，时节至自有收成。',dian:'土地公司春耕、报秋成之典，喻天道酬勤、种善得善。'},
    {n:4,grade:'下签',name:'田瘠难耕',poem:'瘦土硗确草不生，强耘徒费力与情。\n不如易地营生业，莫守荒田误此生。',yi:'地薄难成 · 宜变则通 · 勿守穷途',jie:'此签主环境不利、强求无益。宜审时易地、另觅生机，勿困守穷途。',dian:'土地不腴则迁、适时而变之智，喻穷则思变、不宜固滞。'},
    {n:5,grade:'上签',name:'邻里和睦',poem:'比舍相邻共一墟，有无相济语如饴。\n里仁为美风和畅，岁岁平安无是非。',yi:'邻里相助 · 里仁为美 · 和睦无争',jie:'远亲不如近邻，宜和睦乡里、互通有无。人和则境安，是非自消。',dian:'土地公主一里和睦、排难解纷之典，喻里仁为美、守望相助。'},
    {n:6,grade:'中签',name:'守财有道',poem:'聚沙成塔亦非轻，细水长流日久盈。\n莫羡他人暴发富，稳收稳用度生平。',yi:'积少成多 · 细水长流 · 稳健持家',jie:'财不在暴，贵在长流。宜量入为出、稳收稳用，家道自厚。',dian:'土地公佑积贮、戒奢靡之典，喻稳健持家、聚沙成塔。'},
    {n:7,grade:'上上签',name:'风调雨顺',poem:'甘澍随风润九垓，田禾得水利农栽。\n年丰廪实民安堵，社鼓咚咚赛神来。',yi:'天时和顺 · 年丰民安 · 诸事遂意',jie:'此签主天时人事俱顺，年景丰饶。宜顺时而为、广种福田，喜庆盈门。',dian:'土地公行雨司穑、岁稔民安之典，喻风调雨顺、国泰民安。'},
    {n:8,grade:'中签',name:'修补旧基',poem:'老屋欹斜待补苴，及时修葺免倾欹。\n根基稳固墙垣整，风雨来时自不危。',yi:'修旧固本 · 及时补苴 · 防患未然',jie:'宜及早修补根基、整理旧业，勿待崩坏。防患未然，风雨无虞。',dian:'土地公佑修屋安基、护宅宁家之典，喻固本杜渐、居安思危。'},
    {n:9,grade:'下签',name:'田界之争',poem:'寸土相争起衅端，同根相煎两俱寒。\n各退一步宽如海，何苦区区较短长。',yi:'争界生衅 · 各退则宽 · 睦邻为上',jie:'此签主因小利起争。宜各退一步、以邻为亲，计较长短反伤和气。',dian:'土地公断界畔之争、劝人和睦之典，喻让他一尺、自宽一寸。'},
    {n:10,grade:'上上签',name:'福地长久',poem:'福地安居岁月长，鸡豚社酒醉斜阳。\n儿孙绕膝天伦乐，代代绵延福泽昌。',yi:'福地久居 · 天伦康乐 · 福泽绵延',jie:'此签主家运绵长、天伦和睦。宜安守福地、敦亲睦族，福泽及后。',dian:'土地公镇福地、荫护子孙之典，喻福地安居、瓜瓞绵绵。'}
  ],
  '财神签':[
    {n:1,grade:'上上签',name:'财神临门',poem:'金龙献瑞到门庭，仓廪盈充喜盈盈。\n开源节流皆有道，富而好礼更声名。',yi:'财源广进 · 富而好礼 · 门庭兴旺',jie:'此签主财星高照、进益可期。宜开源节流并重，富而修德，名实兼收。',dian:'财神（赵公明）赐财、护商利市之典，喻财星拱照、利市三倍。'},
    {n:2,grade:'上上签',name:'范蠡致富',poem:'陶朱三徙业弥昌，致富原为治生方。\n货殖有经知取与，千金散后复盈箱。',yi:'治生有方 · 知取知予 · 财散人聚',jie:'致富在经营有道、知进退取予。宜活络周转、不囤不赌，散而复聚。',dian:'范蠡（陶朱公）三致千金之典，喻货殖有经、富好行其德。'},
    {n:3,grade:'中签',name:'积财蓄水',poem:'细流汇海海方深，零蓄成裘暖不禁。\n莫笑锱铢积累慢，久长自有满囊金。',yi:'积微成著 · 零存整取 · 久必丰盈',jie:'财贵积累、不嫌细微。宜设常备、持之以恒，久则囊橐自丰。',dian:'财神主积贮、戒奢靡之典，喻聚沙成塔、勤则富。'},
    {n:4,grade:'中签',name:'市易待时',poem:'市价低昂如转轮，待昂而售莫贪昏。\n见好即收机莫失，迟疑坐困失金银。',yi:'待价而沽 · 见好即收 · 勿贪转失',jie:'买卖贵乘时，宜待价而沽、见好就收。贪高不止、迟疑不决皆失机。',dian:'财神司市易、示买卖时机之典，喻待时而动、知足不辱。'},
    {n:5,grade:'下签',name:'贪妄破财',poem:'利令智昏妄念生，贪高跌重悔难平。\n千金一掷随流水，方信知足是长生。',yi:'贪则致损 · 戒赌戒妄 · 知足常安',jie:'此签警贪妄败财。勿信暴利、勿赌侥幸，知足守常乃保身之道。',dian:'财神惩贪妄、示"难得之货令人行妨"之戒，喻贪痴招损。'},
    {n:6,grade:'上签',name:'四方通达',poem:'通衢四达货云屯，舟车所至利源奔。\n远贩近销皆得所，经营顺水过龙门。',yi:'财路通达 · 贸迁有无 · 经营顺遂',jie:'此签主商路畅通、贸迁得利。宜广结商缘、流通有无，顺水行舟。',dian:'财神开路引财、舟车利便之典，喻货通四海、利源不竭。'},
    {n:7,grade:'中签',name:'合伙分金',poem:'合伙经营义在先，分金明账两无嫌。\n同心戮力舟同济，账目清时情谊坚。',yi:'合伙贵信 · 明账无私 · 同心得利',jie:'合伙以信义为本，账目宜清、分利宜明。同心协力，则利情谊两全。',dian:'财神主公平交易、戒欺瞒之典，喻明算账、义和利生。'},
    {n:8,grade:'中签',name:'守财防漏',poem:'竹篮打水一场空，处处疏防漏乃穷。\n塞却漏卮先节用，仓箱渐实不为慵。',yi:'节用杜漏 · 先守后增 · 戒奢靡',jie:'进财同时须防漏。宜先节用、堵住无谓支出，仓箱方能渐实。',dian:'财神示"节流"之要、戒漏卮之喻，喻开源亦须节流。'},
    {n:9,grade:'上上签',name:'偏财有缘',poem:'意外之财天偶然，缘来莫拒亦休贪。\n得之用作济人处，福报回环胜万钱。',yi:'偏财偶得 · 得之济人 · 福报回环',jie:'偏财偶然、可受不可求。得之宜用于济急行善，施比受更有福。',dian:'财神赐意外之财、劝行善布施之典，喻舍得之间、福报回环。'},
    {n:10,grade:'下签',name:'负债压身',poem:'债台高筑压双肩，左支右绌实可怜。\n急须量入为出计，莫教雪上再加霜。',yi:'负债当理 · 量入为出 · 勿再举债',jie:'此签主债负缠身、周转不灵。宜紧缩开支、先理旧债，切勿雪上加霜。',dian:'财神示负债之戒、量入为出之法，喻无债一身轻、慎借为首。'},
    {n:11,grade:'上上签',name:'五谷丰登',poem:'岁稔年丰廪实充，农商两旺乐融融。\n仓中有粟心无惧，富在安居知足中。',yi:'物阜民丰 · 农商两旺 · 心安是富',jie:'此签主收成丰、生计足。宜安居务实、农商并顾，心安即是真富。',dian:'财神佑年丰、仓廪实之典，喻丰年足食、富在知足。'},
    {n:12,grade:'中签',name:'理财有度',poem:'三分储蓄七分用，留得余粮备岁凶。\n不奢不吝中为贵，家计从容乐亦同。',yi:'收支有度 · 留余备荒 · 中道最宜',jie:'理财贵中庸，不奢不吝。宜留备荒之资、量入为用，家计从容。',dian:'财神示"中道理财"、留余备患之训，喻用度有节、从容自安。'}
  ],
  '爱情签':[
    {n:1,grade:'上上签',name:'天作之合',poem:'天作之合缔良缘，琴瑟和鸣岁月妍。\n月老牵丝千里合，白头相守永团圆。',yi:'天定良缘 · 琴瑟和鸣 · 白头相守',jie:'此签主姻缘天成、情投意合。宜珍惜眼前人、以诚相待，白头可期。',dian:'月老系赤绳、千里姻缘一线牵之典，喻天作之合、缘分前定。'},
    {n:2,grade:'上上签',name:'牛郎织女',poem:'银河一水隔盈盈，岁岁今宵会鹊桥。\n离多聚少情难隔，相思深处见精诚。',yi:'暂别情深 · 精诚可越 · 佳期有信',jie:'虽暂分离、情不可隔。宜以诚相守、信有重逢，精诚终可越山河。',dian:'牛郎织女七夕渡鹊桥之典，喻相隔有情、终得相会。'},
    {n:3,grade:'中签',name:'破镜重圆',poem:'菱花破后重磨莹，缺月今宵再复盈。\n旧好休提前日过，相看依旧眼波清。',yi:'旧好复续 · 破镜重圆 · 既往不咎',jie:'离散者将复合，宜放下前嫌、以新相待。宽容处，情自圆。',dian:'乐昌公主破镜重圆之典，喻离而复合、前愆可泯。'},
    {n:4,grade:'中签',name:'比翼连枝',poem:'在天愿作比翼鸟，在地愿为连理枝。\n同心结得长生缕，莫教风雨易分离。',yi:'同心缔好 · 连理相依 · 患难与共',jie:'情贵同心、休戚与共。宜同舟共济、勿因微风细雨便言离散。',dian:'唐明皇、杨贵妃"比翼连理"之誓，喻恩爱弥笃、生死以之。'},
    {n:5,grade:'下签',name:'劳燕分飞',poem:'东劳西燕各在天，萍踪浪迹两茫然。\n强系丝萝终易断，不如放手任婵娟。',yi:'缘尽当放 · 强合易散 · 各自安好',jie:'此签主缘分已淡、强求反伤。宜体面放手、各自珍重，莫作茧自缚。',dian:'劳燕分飞、萍水难留之喻，喻缘来则聚、缘尽则散。'},
    {n:6,grade:'中签',name:'红绳暗系',poem:'不期而遇意阑珊，却有三生石上缘。\n莫负当前灯火夜，清谈浅笑亦姻缘。',yi:'意外结缘 · 随缘而遇 · 莫失当前',jie:'良缘或在不经意间。宜开放心怀、珍惜眼前相遇，随缘惜缘。',dian:'三生石上旧精魂、红绳暗系之典，喻宿缘不期而至。'},
    {n:7,grade:'上签',name:'举案齐眉',poem:'举案齐眉敬如宾，相庄以礼情愈真。\n家常茶饭皆滋味，平淡相守最相亲。',yi:'相敬如宾 · 平淡是真 · 日久情深',jie:'情在相敬、日久弥真。宜以礼相待、于平淡中见深情，不必外求热烈。',dian:'梁鸿、孟光举案齐眉之典，喻夫妻相敬、情义绵长。'},
    {n:8,grade:'中签',name:'沟通化隙',poem:'一番误会结层冰，话到明时冰自融。\n莫把猜疑藏腹内，推心一语见春容。',yi:'误会宜解 · 推心置腹 · 言归于好',jie:'隔阂多因不言。宜坦诚沟通、把话说明，猜疑化处、春意复生。',dian:'误会如冰、言语如阳之喻，喻开诚布公、冰释前嫌。'},
    {n:9,grade:'下签',name:'单思无寄',poem:'落花有意随流水，流水无心恋落花。\n一片痴心空付与，早回眸处有人家。',yi:'单恋无果 · 及时转念 · 莫误青春',jie:'此签主落花有意、流水无情。宜早日转念、收回痴心，自有可栖之处。',dian:'落花流水、单思难寄之喻，喻无缘强求、不如惜己。'},
    {n:10,grade:'上上签',name:'宜室宜家',poem:'桃之夭夭灼其华，之子于归宜室家。\n和顺一门生百福，琴书相伴乐无涯。',yi:'宜室宜家 · 家和百福 · 琴书可乐',jie:'此签主成家立业、门庭和顺。宜以和为贵、经营小家，福自内生。',dian:'《诗·桃夭》"宜其室家"之咏，喻婚嫁得宜、家和万事兴。'},
    {n:11,grade:'中签',name:'慢火温情',poem:'温火慢炖味方醇，情到深时不必嗔。\n莫羡他人花似火，自家灯火可相亲。',yi:'情贵长久 · 慢火温养 · 勿较人前',jie:'情如慢炖、久乃醇厚。宜不躁不比、于日常中温养，自有安稳。',dian:'温情似火、久炼成金之喻，喻平实相守、历久弥笃。'},
    {n:12,grade:'下签',name:'孽缘当断',poem:'荆棘丛中莫着迷，伤痕累累悔迟迟。\n抽身早断须臾痛，割爱方知是护持。',yi:'孽缘宜断 · 及早抽身 · 割爱护己',jie:'此签主有害之缘、当断则断。宜护己为先、勿陷愈深，短痛胜长痛。',dian:'荆棘缠身、当断不断反受其乱之喻，喻及时止损、方得护持。'}
  ],
  '健康签':[
    {n:1,grade:'上上签',name:'元气充盈',poem:'清气一团满绛宫，精神爽朗步生风。\n起居有常食有节，自然百脉自通融。',yi:'元气充沛 · 起居有常 · 百脉调和',jie:'此签主精气充足、体魄康强。宜守规律作息、饮食有节，自得安康。',dian:'中医"元气"之说、起居有常之训，喻养正存元、邪不可干。'},
    {n:2,grade:'中签',name:'动静相济',poem:'久坐伤肉劳伤神，宜动宜静两相匀。\n每日舒筋行百步，气血周流远病身。',yi:'劳逸有度 · 动静相济 · 气血流通',jie:'宜动静得宜、勿久坐过劳。常舒筋骨、令气血周流，可远疾患。',dian:'"流水不腐、户枢不蠹"之喻，喻常动则健、过逸则壅。'},
    {n:3,grade:'中签',name:'饮食有节',poem:'膏粱厚味损脾胃，淡饭粗茶养太和。\n节制口腹三分饿，胜服参苓岁月多。',yi:'饮食清淡 · 节量留三分 · 脾胃乃安',jie:'宜清淡有节、勿纵口腹。留三分饥、养脾胃中和，胜服补药。',dian:'养生"饮食有节"、留三分饥之训，喻淡食养中、过补反伤。'},
    {n:4,grade:'下签',name:'积劳成疾',poem:'长年透支不知休，积久成疴始觉愁。\n莫待沉疴方忆健，早将休息作良谋。',yi:'积劳致疾 · 早休为要 · 勿透支',jie:'此签警长期透支、积劳成病。宜及早休息调养，勿待病成方悔。',dian:'"积劳成疾"之戒、治未病之训，喻防微杜渐、休作良图。'},
    {n:5,grade:'上签',name:'调和情志',poem:'七情过极损其身，恬淡虚无养性真。\n怒时一笑宽怀抱，心平气和即病人。',yi:'情志调和 · 恬淡虚无 · 气和身安',jie:'病多从气生，宜调畅情志、少怒少忧。心平气和，便是无病之人。',dian:'中医"七情内伤"、恬淡养神之论，喻神安则形安。'},
    {n:6,grade:'中签',name:'顺应四时',poem:'春捂秋冻顺天时，寒暑往来各有宜。\n勿逆阴阳违节序，四时无恙一身随。',yi:'顺应四时 · 毋违寒暑 · 阴阳自和',jie:'宜顺四时而调摄，勿逆寒暑。春捂秋冻、与节序相应，身自无恙。',dian:'《内经》"法于阴阳、和于术数"之训，喻顺时摄生、天人相应。'},
    {n:7,grade:'上签',name:'导引吐纳',poem:'吐故纳新气自华，导引伸舒筋脉赊。\n朝暮殷勤行数息，形神俱妙乐无涯。',yi:'吐纳导引 · 数息炼形 · 形神俱妙',jie:'宜习吐纳导引、调息养形。朝暮行之，气血和畅、形神俱安。',dian:'吐纳导引、八段锦之类养生术，喻炼形养气、祛病延年。'},
    {n:8,grade:'中签',name:'药石为辅',poem:'药医不死病缠身，根本还凭自养真。\n莫恃参芪为常饵，养元固本胜求神。',yi:'药石为辅 · 养正为本 · 勿赖补药',jie:'药仅辅病、根本在自养。宜固本养元、勿恃补药，摄生重于求方。',dian:'"药医不死病"、养正御邪之训，喻扶正为本、药石为佐。'},
    {n:9,grade:'下签',name:'讳疾忌医',poem:'微恙初生讳不言，养痈遗患悔迟延。\n早寻良医除根本，莫教小疾成大愆。',yi:'小疾早治 · 勿讳于医 · 防微杜渐',jie:'此签警讳疾忌医、养小成大。宜及早就医、除患萌芽，勿拖延。',dian:'蔡桓公讳疾忌医、病入骨髓之典，喻早治为宜、讳则贻患。'},
    {n:10,grade:'上上签',name:'安享天年',poem:'少饮多餐步履轻，无忧无虑耳常温。\n心宽自有长年术，不药而康度此生。',yi:'心宽体健 · 不药而安 · 安享天年',jie:'此签主康宁长寿、无病而安。宜心宽少忧、起居有节，自然天年。',dian:'"心宽出少年"、不药而愈之喻，喻达观养寿、自得康宁。'}
  ]
};

initToolRunWrap();

/* 二级页面控制：结果页与输入页分离，返回时保留用户输入 */
initSecondaryPage();

/* 二级结果页兜底修复：不依赖 MutationObserver，确保返回按钮始终生成 */
initSecondaryResultFallback();

/* 工具精进层：统一校验、历史记录、结果复制与风险提示 */
initToolRefineLayer();

/* 修复三级页面返回：把返回按钮放到工具弹窗外部（.tool-modal），而非 .tool-sheet 内部 */
initTertiaryBackFix();

/* 财运工具改版：移除金额输入，改用节奏、目标与风险偏好进行判断 */
initWealthToolRevamp();

/* 今日日签改版：取消选项，打开即生成当日综合日签 */
initDailySignRevamp();

/* 今日日签增强：更完整内容 + 原生分享 / 复制兜底 */
initDailySignShare();

/* 流日驱动日签：真实计算「当日干支 × 本人命盘」的互动
   （旧版此处的地支比对是死代码：dayZhi===((typeof __TJX_V5!=='undefined'&&'')||'')
     恒为 false，导致永远输出同一句通用提示） */
initDailyRun();

 /* 能量穿搭与工位风水 v2：按用神给完整配色，按场景给具体穿法 */
initStyleToolV2();


/* 工具中心最终版：问题入口与快捷筛选 */
initToolCenterFinal();

/* 择日助手改版：不再让用户手动挑日期，直接根据推演结果给出候选日期 */
initDateToolRevamp();

/* 自定义工具结果兜底：所有工具页面都显示命盘结合提示 */
initCustomToolFallback();

/* 问问大师应答数据库扩展：补充高频、可执行问题 */
initKBExpansion();

/* 部分工具接入 AI：只在用户主动点击时调用，避免自动消耗额度。 */
initToolAI();

initCloudflareCleanup();

// Expose legacy inline event handlers after moving scripts into a Vite module.
Object.assign(window, {
  _getGlossKeys,
  _initJq,
  _qrCard,
  aiOnInputSuggest,
  aiRefreshChips,
  aiSwitchCat,
  aiToolRequest,
  annotateGlossary,
  applyTheme,
  buildAISummary,
  buildBaziContext,
  buildContext,
  buildRelatedRoutes,
  calcLayoffRisk,
  calcPattern,
  calcRelation,
  calcYearScores,
  closeAsk,
  closeMonthModal,
  closeRq,
  closeSaveModal,
  closeToolPage,
  compactAIText,
  confirmSaveProfile,
  copyReport,
  dbDel,
  dbGetAll,
  dbPut,
  doAsk,
  doAskCustom,
  drawCurve,
  enrichBeginnerContent,
  extractIntents,
  focusSwitchTab,
  formatAIText,
  formatStandardAnswer,
  generateAnswerFallback,
  getCtx,
  getDayPillarIndex,
  getDecisionAdvice,
  getLayoffAstroRisk,
  getLiuYue,
  getMonthPillar,
  getMonthlyAlert,
  getPersona,
  getRelationMode,
  getRelationRisks,
  getRiskWarning,
  getShenShaLabels,
  getSuitableType,
  getTimeline,
  getTodayGZ,
  getAISettings,
  getApiKey,
  goBack,
  initDB,
  jqDate,
  jumpTo,
  mkBazi,
  mkDy,
  mkLn,
  mkMh,
  mkQm,
  mkShenSha,
  mkSi,
  mkSs,
  mkWx,
  mkZw,
  moveTabIndicator,
  newAskChat,
  openAsk,
  openBreathTool,
  openDecisionTool,
  openFocusTool,
  openMonthModal,
  openSaveModal,
  organizeMasterReportLayout,
  rdd,
  renderAll,
  renderBeginnerBrief,
  renderQuickRead,
  renderRiQian,
  renderRouteButtons,
  renderSmartAnswer,
  resetGlossaryState,
  resolveBirthDateTime,
  runCareerTool,
  runDailyTool,
  runDateTool,
  runDecisionTool,
  runLayoffTool,
  runLotteryTool,
  runNameTool,
  runOracleTool,
  runRelationTool,
  runStyleTool,
  runWealthTool,
  runZodiacTool,
  saveCurrentProfile,
  scrollToForm,
  sel,
  selChip,
  setGlassMode,
  setToolOutput,
  setUserMode,
  showGlossPop,
  showPage2,
  showRiQian,
  smartAnswer,
  solarTermDate,
  startBreathTool,
  switchStructureTab,
  switchTab,
  toggleDensity,
  toggleAISettings,
  toggleFullGods,
  toggleTheme,
  toggleLgPanel,
  toggleUserMode,
  toolPageShell,
  trueSolarTime,
  wrapProCollapsibles,
});

/* iOS Instagram-style dock: tab indicator alignment follows scroll & layout. */
initDockIndicator();

/* Liquid Glass dock lighting follows the pointer/finger position. */
initDockLighting();

/* Keep the floating dock out of the way when iOS opens the keyboard. */
initDockKeyboard();

/* 问问大师体验层：自适应输入框、气泡操作、键盘发送与无障碍。 */
initExperienceLayer();

/* Reuse each tool card's artwork in its detail-page introduction. */
initToolCardArt();


/* Answer Book v2: a self-contained reflective reading flow. */
initAnswerBookV2();

/* ============================================================
   合盘：分享 / 保存对象 / 最近对象快捷选择
   ============================================================ */
initSynastryShare();

/* ============================================================
   首页「今日一句」：回访用户无需重新推演即可看到当天内容
   数据来自最近一次保存的档案；不做推送、不制造紧迫感。
   ============================================================ */
(function(){
  async function renderTodayCard(){
    const el=document.getElementById('todayCard');
    if(!el)return;
    let list=[];
    try{ list=await dbGetAll(); }catch(e){ return; }
    if(!list.length){ el.style.display='none'; const e0=document.getElementById('todayCardEmpty');if(e0)e0.style.display='block'; return; }

    const p=list[0];                       // dbGetAll 已按 updatedAt 倒序
    if(!p||!p.bd){ el.style.display='none'; const e1=document.getElementById('todayCardEmpty');if(e1)e1.style.display='block'; return; }
    const [by,bm,bd]=p.bd.split('-').map(Number);
    if(!by||!bm||!bd){ el.style.display='none'; const e2=document.getElementById('todayCardEmpty');if(e2)e2.style.display='block'; return; }

    let r,c;
    try{
      const hourZhi=(()=>{const t=(p.timeStr||'09:00').split(':').map(Number);
        const mins=t[0]*60+(t[1]||0);
        if(mins>=23*60)return 0;
        return Math.floor((mins+60)/120)%12;})();
      const chart=mkBazi(by,bm,bd,hourZhi);
      const wx=mkWx(chart);
      r=calcLiuRi(chart,wx.ys);
      c=buildDailyCopy(r);
    }catch(e){ console.warn('todayCard',e); el.style.display='none'; const e3=document.getElementById('todayCardEmpty');if(e3)e3.style.display='block'; return; }

    const toneColor=r.tone==='flow'?'var(--c-green)':r.tone==='steady'?'var(--c-teal)'
                   :r.tone==='friction'?'var(--c-orange)':'var(--c-text-3)';
    const first=c.sections[0];

    el.innerHTML=
      '<div class="today-card-top">'+
        '<span class="today-card-date">'+r.day.gz+'日</span>'+
        '<span class="today-card-tone" style="color:'+toneColor+'">'+c.label+'</span>'+
      '</div>'+
      '<div class="today-card-headline">'+c.headline+'</div>'+
      (first?'<div class="today-card-body"><b>'+first.k+'</b>'+first.v+'</div>':'')+
      '<div class="today-card-foot">'+
        '<span class="today-card-who">'+String(p.name||'我的命盘').replace(/</g,'&lt;')+'</span>'+
        '<button type="button" class="today-card-more">查看完整日签 →</button>'+
      '</div>';
    el.style.display='block';const eH=document.getElementById('todayCardEmpty');if(eH)eH.style.display='none';

    el.querySelector('.today-card-more')?.addEventListener('click',()=>{
      window._pendingDaily=true;
      loadProfile(p.id);
    });

  }

  window.renderTodayCard=renderTodayCard;

  // 首次进入
  document.addEventListener('DOMContentLoaded',()=>{ setTimeout(renderTodayCard,600); });

  // 档案增删后立即同步（renderProfiles 未挂到 window，改为包装公开的入口）
  ['confirmSaveProfile','deleteProfile','handleImport'].forEach(fn=>{
    const old=window[fn];
    if(typeof old!=='function')return;
    window[fn]=function(){
      const ret=old.apply(this,arguments);
      Promise.resolve(ret).then(()=>setTimeout(renderTodayCard,260)).catch(()=>{});
      return ret;
    };
  });

  // 返回首页时刷新（跨零点时内容需更新）
  const oldBack=window.goBack;
  window.goBack=function(){
    if(oldBack)oldBack.apply(this,arguments);
    // 确保首页按钮与表单状态干净
    document.body.classList.remove('form-open');
    const ctaBtn=document.getElementById('homeCtaMain');
    if(ctaBtn){ctaBtn.textContent='输入信息';ctaBtn.classList.remove('home-cta-go');}
    const fm=document.getElementById('formModal');
    if(fm)fm.classList.remove('open');
    setTimeout(renderTodayCard,120);
  };

  // 从「查看完整日签」进入时，报告渲染完成后自动打开日签工具
  // 注意：calc() 内部调用的是 import 进来的 showPage2，
  // 包装 window.showPage2 不会生效；改为监听 body 上的 report-active 类。
  const _dailyObs=new MutationObserver(()=>{
    if(document.body.classList.contains('report-active')&&window._pendingDaily){
      window._pendingDaily=false;
      setTimeout(()=>{ if(window.openToolPage)window.openToolPage('daily'); },700);
    }
  });
  _dailyObs.observe(document.body,{attributes:true,attributeFilter:['class']});
})();

/* ============================================================
   术语引导：首次进入报告时告知「带下划线的词可以点开看解释」
   只出现一次，用户关闭或点过任意术语后不再打扰。
   ============================================================ */
(function(){
  const KEY='tj_gloss_hint_seen';
  function seen(){ try{ return localStorage.getItem(KEY)==='1'; }catch(e){ return true; } }
  function markSeen(){ try{ localStorage.setItem(KEY,'1'); }catch(e){} 
    document.getElementById('glossHint')?.remove(); }

  function mount(){
    if(seen())return;
    const sec=document.getElementById('s-ming');
    if(!sec||document.getElementById('glossHint'))return;
    if(!sec.querySelector('.beginner-brief,.qr-card,.glass'))return;   // 报告尚未渲染
    const anchor=sec.querySelector('.beginner-brief,.qr-card,.glass');
    if(!anchor)return;
    const el=document.createElement('div');
    el.id='glossHint'; el.className='gloss-hint';
    el.innerHTML='<span>看到不懂的专业词？选中它，长按或右键即可查看白话解释。</span>'+
                 '<button type="button" class="gloss-hint-close" aria-label="知道了">×</button>';
    el.querySelector('.gloss-hint-close').addEventListener('click',markSeen);
    anchor.parentNode.insertBefore(el,anchor);
  }

  // 用户点过任意术语，说明已经理解，不再引导
  document.addEventListener('click',e=>{
    if(e.target.closest&&e.target.closest('.glossary-term'))markSeen();
  },true);

  // 注意：calc() 内部调用的是 import 进来的 showPage2，
  // 包装 window.showPage2 不会生效；改为监听 body 上的 report-active 类。
  const obs=new MutationObserver(()=>{
    if(document.body.classList.contains('report-active')){
      [300,900,1700].forEach(ms=>setTimeout(mount,ms));
    }else{
      document.getElementById('glossHint')?.remove();
    }
  });
  obs.observe(document.body,{attributes:true,attributeFilter:['class']});
  window.TJMountGlossHint=mount;
})();

/* ============================================================
   「这段是什么意思」——为报告卡片注入解释入口
   竞品调研：新手最大的障碍是「看不懂，又不知道怎么问」。
   这里让用户不必自己组织问题，点一下即可带着上下文提问。
   ============================================================ */
initExplainInject();

/* ============================================================
   报告页档案快切：此前给亲友看报告必须回首页重新选档案
   ============================================================ */
(function(){
  function updateLabel(){
    const el=document.getElementById('p2ProfileName');
    if(el)el.textContent=window._currentProfileName||'档案';
    const btn=document.getElementById('p2ProfileBtn');
    if(btn)btn.title=window._currentProfileName?('当前档案：'+window._currentProfileName):'切换档案';
  }
  window._updateProfileLabel=updateLabel;

  // 追踪当前报告对应的档案名
  const oldCalc=window.calc;
  window.calc=function(isDemo){
    if(isDemo)window._currentProfileName='示例报告';
    else if(window._pendingProfileName)window._currentProfileName=window._pendingProfileName;
    else window._currentProfileName='';
    window._pendingProfileName=null;
    updateLabel();
    return oldCalc?oldCalc.apply(this,arguments):undefined;
  };
  const oldLoad=window.loadProfile;
  window.loadProfile=async function(id){
    try{const list=await dbGetAll();const p=list.find(x=>x.id===id);if(p)window._pendingProfileName=p.name||'';}catch(e){}
    return oldLoad?oldLoad.apply(this,arguments):undefined;
  };
  const oldSave=window.confirmSaveProfile;
  window.confirmSaveProfile=function(){
    const n=document.getElementById('saveName')?.value.trim();
    if(n)window._currentProfileName=n;
    updateLabel();
    return oldSave?oldSave.apply(this,arguments):undefined;
  };

  let open=false;
  function closeMenu(){
    open=false;
    document.getElementById('p2ProfileMenu')?.classList.remove('show');
  }
  window.TJToggleProfileMenu=async function(){
    const menu=document.getElementById('p2ProfileMenu');
    if(!menu)return;
    if(open){closeMenu();return;}
    let list=[];
    try{list=await dbGetAll();}catch(e){list=[];}
    const cur=window._currentProfileName||'';
    let h='';
    if(list.length){
      h+=list.slice(0,8).map(p=>`<button type="button" role="menuitem" class="p2-profile-item ${p.name===cur?'current':''}" data-id="${p.id}">
        <span class="p2-profile-item-name">${(p.name||'未命名').replace(/</g,'&lt;')}</span>
        <span class="p2-profile-item-meta">${p.bd||''}${p.name===cur?' · 当前':''}</span>
      </button>`).join('');
    }else{
      h+='<div class="p2-profile-empty">还没有保存的档案</div>';
    }
    h+='<div class="p2-profile-sep"></div>';
    h+='<button type="button" role="menuitem" class="p2-profile-item p2-profile-save" data-save="1">保存当前命盘</button>';
    h+='<button type="button" role="menuitem" class="p2-profile-item p2-profile-new" data-new="1">＋ 填写新的出生信息</button>';
    menu.innerHTML=h;
    menu.classList.add('show');
    open=true;
    menu.querySelectorAll('.p2-profile-item').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(btn.dataset.save==='1'){closeMenu();if(window.openSaveModal)window.openSaveModal();return;}
        closeMenu();
        if(btn.dataset.new==='1'){goBack();window.TJOpenForm&&window.TJOpenForm();return;}
        loadProfile(+btn.dataset.id);
      });
    });
  };
  document.addEventListener('click',e=>{
    if(!open)return;
    if(e.target.closest&&e.target.closest('.p2-profile-wrap'))return;
    closeMenu();
  });
  updateLabel();
})();

/* ============================================================
   PWA：可安装、核心资源离线可用（静态站点能力补齐）
   ============================================================ */
if('serviceWorker' in navigator && /^https:/.test(location.protocol)){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{});});
}

/* ============================================================
   运势页档位：年 / 月 / 周 / 日 子标签
   选择记入 sessionStorage，重进报告时恢复上次的档位。
   ============================================================ */
initYunTab();

/* ============================================================
   分享卡片：把真实推演结果渲染成图片
   竞品差距补齐：此前只有文字复制，分享链是断的。
   数据全部来自实时推演，不掺写死的吉祥话。
   ============================================================ */
initTodayCard();

/* ============================================================
   速读卡折叠
   ============================================================ */
initQuickReadCollapse();

/* ============================================================
   tools2 · 工具系统 v2 接管（必须位于所有旧 IIFE 之后）
   动态 import：注册在模块加载时完成，加载后立即接管全局入口。
   加载完成前若用户点击工具，仍由上方旧版 openToolPage 兜底。
   ============================================================ */
import('./tools2/index.js')
  .then(m=>m.bootstrap())
  .catch(e=>console.error('[tools2] 加载失败，继续使用旧版工具页',e));

/* 术语解释：选中文字 → 右键/长按菜单（取消自动下划线标注） */
installSelectionGloss();

/* ============================================================
   表单未推演保护：修改输入后未推演，点击「重新推演」弹窗确认
   ============================================================ */
initFormDirtyGuard();
