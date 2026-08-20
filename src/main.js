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
import { playIconDrawAnimation } from './fx/icon-draw.js';
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
/* tools2 改为动态 import（见文件末尾 bootstrap 处）：
   工具系统体积大且非首屏必需，独立成异步 chunk，缩小主包。 */

initTheme();
initWeather();
initSectionTabs();
initNavigationUI();
initAISettings();
initFontSize();

/* ============================================================
   全局函数暴露：index.html 和动态生成的 onclick 需要全局访问
   ES module 内的函数默认不挂载到 window，
   但 inline onclick="fn()" 只能调用 window.fn。
   ============================================================ */
(function(){
  // 1. 已存在但未暴露的函数（来自 import 或本模块定义）
  window.setGlassMode=setGlassMode;
  window.jumpTo=jumpTo;
  window.newAskChat=newAskChat;
  window.doAskCustom=doAskCustom;
  window.closeRq=closeRq;
  window.showRiQian=showRiQian;
  window.focusSwitchTab=focusSwitchTab;
  window.calcLayoffRisk=calcLayoffRisk;
  window.calcRelation=calcRelation;
  window.switchStructureTab=switchStructureTab;
  window.toggleFullGods=toggleFullGods;
  window.setUserMode=setUserMode;
  window.toggleUserMode=toggleUserMode;
  window.doAsk=doAsk;
  window.toggleAISettings=toggleAISettings;

  // 2. 旧版工具函数（tools/ 模块，已被 tools2 接管但仍可能被 onclick 引用）
  window.openToolPage=openToolPage;
  window.closeToolPage=closeToolPage;
  window.openDecisionTool=openDecisionTool;
  window.runDecisionTool=runDecisionTool;
  window.startBreathTool=startBreathTool;
  window.runWealthTool=runWealthTool;
  window.runCareerTool=runCareerTool;
  window.runDateTool=runDateTool;
  window.runStyleTool=runStyleTool;
  window.runLayoffTool=runLayoffTool;
  window.runDailyTool=runDailyTool;
  window.runNameTool=runNameTool;
  window.runOracleTool=runOracleTool;
  window.runLotteryTool=runLotteryTool;
  window.runZodiacTool=runZodiacTool;
  window.runRelationTool=runRelationTool;

  // 3. 之前已暴露的函数（保持不变）
  window.calc=calc;window.loadProfile=loadProfile;window.selChip=selChip;window.exportProfiles=exportProfiles;window.handleImport=handleImport;window.openAsk=openAsk;window.closeAsk=closeAsk;window.goBack=goBack;window.switchTab=switchTab;window.showPage2=showPage2;window.openSaveModal=openSaveModal;window.closeSaveModal=closeSaveModal;window.confirmSaveProfile=confirmSaveProfile;window.deleteProfile=deleteProfile;window.openMonthModal=openMonthModal;window.closeMonthModal=closeMonthModal;window.openCalendarMode=openCalendarMode;window.openAboutModal=function(){document.getElementById('aboutModal').classList.add('open');};window.closeAboutModal=function(){document.getElementById('aboutModal').classList.remove('open');};window.openDisclaimerModal=function(){document.getElementById('disclaimerModal').classList.add('open');};window.closeDisclaimerModal=function(){document.getElementById('disclaimerModal').classList.remove('open');};

  // 4. 缺失函数：分享卡片（报告卡片右上角分享按钮）
  window.TJShareReport=function(){
    const d=window._ctx||window._baziData||{};if(!d.Y)return showToast('请先完成推演');
    const b=d.Y.g+d.Y.z;
    const cv=renderShareCard({
      title:b+' · '+d.b.sx+'年',
      sub:d.b?'日主 '+d.D.g+d.D.z:'',
      rows:[
        {k:'命盘',v:b+' '+d.M.g+d.M.z+' '+d.D.g+d.D.z+' '+d.H.g+d.H.z},
        {k:'五行',v:d.wx?.c?Object.entries(d.wx.c).map(([k,v])=>k+Math.round(v)).join(' '):''},
        {k:'用神',v:d.wx?.ys||''},
      ],
      foot:'问问大师 · '+new Date().toLocaleDateString('zh-CN')
    });
    if(cv)exportShareCard(cv,'问问大师_命盘摘要');
  };
  window.TJShareRiQian=function(){
    const d=window._ctx||window._baziData||{};if(!d.D)return showToast('请先完成推演');
    const cv=renderShareCard({
      title:'今日建议',
      sub:d.D.g+d.D.z+'日 · '+(d.lnSS||''),
      rows:[
        {k:'宜',v:d._advYiJi?.yi?.join(' ')||''},
        {k:'忌',v:d._advYiJi?.ji?.join(' ')||''},
      ],
      foot:'问问大师 · '+new Date().toLocaleDateString('zh-CN')
    });
    if(cv)exportShareCard(cv,'问问大师_今日建议');
  };
  window.TJShareWeek=function(){
    const d=window._ctx||window._baziData||{};if(!d.D)return showToast('请先完成推演');
    const cv=renderShareCard({
      title:'本周运势',
      sub:d.week?d.week.start+' – '+d.week.end:'',
      rows:[
        {k:'顺利',v:d.week?.best?.label||''},
        {k:'多留余量',v:d.week?.worst?.label||''},
      ],
      foot:'问问大师 · '+new Date().toLocaleDateString('zh-CN')
    });
    if(cv)exportShareCard(cv,'问问大师_本周运势');
  };

  // 5. 缺失函数：速读卡折叠/展开
  window.TJToggleQuickRead=function(btn){
    const card=btn.closest('.qr-card');if(!card)return;
    const body=card.querySelector('.qr-body');if(!body)return;
    const expanded=btn.getAttribute('aria-expanded')==='true';
    btn.setAttribute('aria-expanded',!expanded);
    card.classList.toggle('collapsed',expanded);
    body.style.maxHeight=expanded?'0':body.scrollHeight+'px';
  };

  // 6. 缺失函数：档案菜单切换
  window.TJToggleProfileMenu=function(){
    const menu=document.getElementById('p2ProfileMenu');
    const btn=document.getElementById('p2ProfileBtn');
    if(!menu)return;
    const isOpen=menu.classList.toggle('open');
    if(btn)btn.setAttribute('aria-expanded',isOpen?'true':'false');
    // 如果菜单打开且内容为空，填充档案列表
    if(isOpen&&!menu.innerHTML.trim()){
      const profiles=[];try{const raw=localStorage.getItem('tj_profiles');if(raw)profiles.push(...JSON.parse(raw))}catch(e){}
      if(profiles.length===0){
        menu.innerHTML='<div class="profile-empty">还没有保存的档案</div>';
      }else{
        menu.innerHTML=profiles.map((p,i)=>`<button class="profile-item" onclick="loadProfile(${i})">${p.name||'未命名'}</button>`).join('');
      }
    }
  };
})();

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
  /* 开屏动画：逐笔绘制 V5 图标，停留 2 秒后淡出 */
  playIconDrawAnimation();
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

/* =========================================================
   首页：粒子 + 鼠标跟随 + 卡片视差 + body.home 自动切换
   ========================================================= */
(function(){
  const ROOT=document.documentElement;
  const isMobile=window.matchMedia('(hover:none)').matches;

  // ---- body.home 状态管理（page1 显示时启用首页特效）----
  function applyHomeState(){
    const p1=document.getElementById('page1');
    const p2=document.getElementById('page2');
    const onHome=p1&&!p1.classList.contains('hidden')&&(!p2||p2.classList.contains('hidden')||!p2.classList.contains('active'));
    document.body.classList.toggle('home',onHome);
  }
  // 初始
  document.addEventListener('DOMContentLoaded',applyHomeState);
  // 监听 page1/page2 class 改动
  const obs=new MutationObserver(()=>applyHomeState());
  window.addEventListener('load',()=>{
    const p1=document.getElementById('page1'),p2=document.getElementById('page2');
    if(p1)obs.observe(p1,{attributes:true,attributeFilter:['class']});
    if(p2)obs.observe(p2,{attributes:true,attributeFilter:['class']});
    applyHomeState();
  });

  // ---- 鼠标跟随光球（含 lerp 拖尾）----
  if(!isMobile){
    const dot=document.getElementById('tjCursorDot');
    const ring=document.getElementById('tjCursorRing');
    if(dot&&ring){
      let mx=window.innerWidth/2,my=window.innerHeight/2;
      let dx=mx,dy=my,rx=mx,ry=my;
      let pressed=false;
      window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.classList.remove('hide');ring.classList.remove('hide');},{passive:true});
      window.addEventListener('mouseleave',()=>{dot.classList.add('hide');ring.classList.add('hide');});
      window.addEventListener('mousedown',()=>{pressed=true;ring.classList.add('active');});
      window.addEventListener('mouseup',()=>{pressed=false;ring.classList.remove('active');});
      // hover 检测：交互元素
      document.addEventListener('mouseover',e=>{
        const t=e.target;
        if(t&&t.closest&&t.closest('button,a,input,select,textarea,.chip,.cta,.tab-item,.r-card,.pf-card,.ai-chip,.ai-cat,.ai-route-btn,.tl-card,.lym-item,[onclick],[data-q]')){
          dot.classList.add('hover');ring.classList.add('hover');
        }
      });
      document.addEventListener('mouseout',e=>{
        const t=e.target;
        if(t&&t.closest&&t.closest('button,a,input,select,textarea,.chip,.cta,.tab-item,.r-card,.pf-card,.ai-chip,.ai-cat,.ai-route-btn,.tl-card,.lym-item,[onclick],[data-q]')){
          dot.classList.remove('hover');ring.classList.remove('hover');
        }
      });
      function tick(){
        dx+=(mx-dx)*0.4;dy+=(my-dy)*0.4;
        rx+=(mx-rx)*0.18;ry+=(my-ry)*0.18;
        dot.style.transform='translate3d('+dx+'px,'+dy+'px,0) translate(-50%,-50%)';
        ring.style.transform='translate3d('+rx+'px,'+ry+'px,0) translate(-50%,-50%)';
        requestAnimationFrame(tick);
      }
      tick();
    }
  }

  // ---- 粒子系统 ----
  const cv=document.getElementById('tjParticles');
  if(cv){
    const ctx=cv.getContext('2d');
    let W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
    let parts=[];
    let mouseX=-9999,mouseY=-9999;
    function resize(){
      W=window.innerWidth;H=window.innerHeight;
      cv.width=W*DPR;cv.height=H*DPR;
      cv.style.width=W+'px';cv.style.height=H+'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
      const target=Math.min(130,Math.max(55,Math.floor(W*H/13000)));
      parts=[];
      for(let i=0;i<target;i++){
        const br=Math.random()<0.12;
        parts.push({
          x:Math.random()*W,
          y:Math.random()*H,
          vx:(Math.random()-0.5)*0.18,
          vy:(Math.random()-0.5)*0.18,
          r:br?(Math.random()*1.4+1.0):(Math.random()*1.0+0.3),
          a:br?(Math.random()*0.3+0.55):(Math.random()*0.5+0.2),
          twinkle:Math.random()*Math.PI*2,
          bright:br,
          spike:br?(Math.random()*3.5+2.5):0,
          tspd:0.02+Math.random()*0.05
        });
      }
    }
    window.addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY;},{passive:true});
    window.addEventListener('mouseleave',()=>{mouseX=-9999;mouseY=-9999;});

    let running=true;
    document.addEventListener('visibilitychange',()=>{running=!document.hidden;if(running)tick();});

    let shoots=[];
    function spawnShoot(){
      if(shoots.length>=2)return;
      shoots.push({
        x:Math.random()*W*0.6,
        y:Math.random()*H*0.4,
        vx:3+Math.random()*4,
        vy:1+Math.random()*2,
        life:1,
        tail:70+Math.random()*50
      });
    }

    function tick(){
      if(!running)return;
      // 首页与测试结果页均绘制；报告页以纯星点呈现，减少连线干扰阅读。
      const isHome=document.body.classList.contains('home');
      const isReport=document.body.classList.contains('report-active');
      if(!isHome&&!isReport){
        ctx.clearRect(0,0,W,H);
        requestAnimationFrame(tick);return;
      }
      ctx.clearRect(0,0,W,H);
      // 取当前主题色
      const styles=getComputedStyle(document.documentElement);
      const h=styles.getPropertyValue('--accent-h').trim()||'38';
      const sat=styles.getPropertyValue('--accent-s').trim()||'55%';

      // 首页保留星点连线；测试结果页仅保留星点，视觉更像安静的星空。
      if(isHome)for(let i=0;i<parts.length;i++){
        const p=parts[i];
        for(let j=i+1;j<parts.length;j++){
          const q=parts[j];
          const dx=p.x-q.x,dy=p.y-q.y;
          const d2=dx*dx+dy*dy;
          if(d2<11000){
            const alpha=(1-d2/11000)*0.18;
            ctx.strokeStyle='hsla('+h+','+sat+',65%,'+alpha+')';
            ctx.lineWidth=0.5;
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
          }
        }
      }
      // 画粒子 + 鼠标交互
      for(const p of parts){
        p.x+=p.vx;p.y+=p.vy;
        p.twinkle+=p.tspd||0.04;
        if(p.x<0)p.x=W;else if(p.x>W)p.x=0;
        if(p.y<0)p.y=H;else if(p.y>H)p.y=0;
        // 鼠标排斥（轻微）
        const dx=p.x-mouseX,dy=p.y-mouseY;
        const d2=dx*dx+dy*dy;
        if(d2<14400){
          const f=(1-d2/14400)*0.6;
          p.x+=dx*f*0.04;p.y+=dy*f*0.04;
        }
        const tw=0.7+Math.sin(p.twinkle)*0.3;
        // 亮星光晕 + 十字芒
        if(isHome&&p.bright){
          const glowR=p.r*5*tw;
          const g2=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,glowR);
          g2.addColorStop(0,'hsla('+h+','+sat+',85%,'+(0.22*tw)+')');
          g2.addColorStop(0.5,'hsla('+h+','+sat+',80%,'+(0.06*tw)+')');
          g2.addColorStop(1,'hsla('+h+','+sat+',80%,0)');
          ctx.fillStyle=g2;
          ctx.beginPath();ctx.arc(p.x,p.y,glowR,0,Math.PI*2);ctx.fill();
          var sl=p.spike*tw;
          ctx.strokeStyle='hsla('+h+','+sat+',90%,'+(0.32*tw)+')';
          ctx.lineWidth=0.6;
          ctx.beginPath();
          ctx.moveTo(p.x-sl,p.y);ctx.lineTo(p.x+sl,p.y);
          ctx.moveTo(p.x,p.y-sl);ctx.lineTo(p.x,p.y+sl);
          ctx.stroke();
        }
        ctx.fillStyle='hsla('+h+','+sat+',75%,'+(p.a*tw)+')';
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      }
      // 流星
      if(isHome){
        if(Math.random()<0.004)spawnShoot();
        for(let i=shoots.length-1;i>=0;i--){
          const s=shoots[i];
          s.x+=s.vx;s.y+=s.vy;s.life-=0.012;
          if(s.life<=0||s.x>W+50||s.y>H+50){shoots.splice(i,1);continue;}
          const tx=s.x-s.vx*s.tail/8, ty=s.y-s.vy*s.tail/8;
          const g3=ctx.createLinearGradient(s.x,s.y,tx,ty);
          g3.addColorStop(0,'hsla('+h+','+sat+',90%,'+(s.life*0.9)+')');
          g3.addColorStop(1,'hsla('+h+','+sat+',90%,0)');
          ctx.strokeStyle=g3;
          ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(tx,ty);ctx.stroke();
          ctx.fillStyle='hsla('+h+','+sat+',95%,'+s.life+')';
          ctx.beginPath();ctx.arc(s.x,s.y,1.5,0,Math.PI*2);ctx.fill();
        }
      }
      requestAnimationFrame(tick);
    }
    resize();
    window.addEventListener('resize',resize);
    tick();
  }

  // ---- 表单卡片视差倾斜 ----
  function bindTilt(el){
    if(!el||isMobile)return;
    let raf=null;
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      const x=e.clientX-r.left,y=e.clientY-r.top;
      const px=x/r.width,py=y/r.height;
      // 光点位置（CSS 变量驱动 ::before 径向光）
      el.style.setProperty('--mx',(px*100).toFixed(1)+'%');
      el.style.setProperty('--my',(py*100).toFixed(1)+'%');
      if(raf)cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const rx=(0.5-py)*4,ry=(px-0.5)*4;
        el.style.transform='perspective(900px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg)';
      });
    });
    el.addEventListener('mouseleave',()=>{
      el.style.transform='perspective(900px) rotateX(0) rotateY(0)';
      el.style.setProperty('--mx','50%');el.style.setProperty('--my','50%');
    });
  }
  // —— 全局：绑定到 .home-card 与所有 page2 内的 .glass 卡片 ——
  function bindAllTilt(){
    document.querySelectorAll('.home-card:not([data-tilted])').forEach(el=>{bindTilt(el);el.setAttribute('data-tilted','1');});
    document.querySelectorAll('#page2 .glass:not([data-tilted])').forEach(el=>{bindTilt(el);el.setAttribute('data-tilted','1');});
  }
  window.addEventListener('load',bindAllTilt);
  // 推算完成后 page2 内容会被重渲染，提供一个全局钩子
  window._rebindTilt=bindAllTilt;

  // ---- CTA 按钮涟漪 ----
  document.addEventListener('click',e=>{
    const btn=e.target&&e.target.closest&&e.target.closest('.cta');
    if(!btn||btn.disabled)return;
    const r=btn.getBoundingClientRect();
    const x=e.clientX-r.left,y=e.clientY-r.top;
    const size=Math.max(r.width,r.height);
    const rip=document.createElement('span');
    rip.className='cta-ripple';
    rip.style.width=rip.style.height=size+'px';
    rip.style.left=(x-size/2)+'px';rip.style.top=(y-size/2)+'px';
    btn.appendChild(rip);
    setTimeout(()=>rip.remove(),700);
  });
})();

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
  /* 日历模式：必须由 tools2 的 calendar 工具接管。
     注意：旧版 openToolPage（center.js）在页面加载时已同步挂载到 window，
     但它没有 calendar 分支，最后的 else 会误导向「八字合盘」页面。
     因此不能用 typeof window.openToolPage==='function' 判断 tools2 是否就绪，
     必须用 window._tools2Ready 标记（由 runtime.js installGlobal 设置）。 */
  try{
    if(window._tools2Ready){
      window.openToolPage('calendar');
    }else{
      // tools2 尚未加载完（动态 import 异步），轮询等待就绪后打开
      let tries=0;
      const t=setInterval(()=>{
        tries++;
        if(window._tools2Ready){clearInterval(t);window.openToolPage('calendar');}
        else if(tries>40){clearInterval(t);console.warn('[openCalendarMode] tools2 未就绪，日历不可用');}
      },50);
    }
  }catch(e){console.error('[openCalendarMode]',e);}
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
(function(){
  const groups={
    all:'全部',money:'财富与事业',life:'日常决策',relation:'关系与沟通',play:'灵感与娱乐'
  };
  const map={wealth:'money',career:'money',layoff:'money',date:'life',style:'life',daily:'life',relation:'relation',zodiac:'relation',name:'play',oracle:'play',answerbook:'play',lottery:'play',export:'life'};
  const labels={wealth:'收入与理财',career:'职业选择',date:'重要事项',style:'环境与状态',layoff:'职场预案',daily:'今日节奏',name:'名称灵感',oracle:'自我反思',answerbook:'快速答案',lottery:'娱乐选号',zodiac:'生肖关系',relation:'关系分析',export:'报告导出'};
  function mount(){
    const hub=document.querySelector('#s-adv .tool-hub'),grid=hub&&hub.querySelector('.tool-grid');
    if(!hub||!grid||document.getElementById('toolsToolbar'))return;
    grid.id='toolGrid';
    const toolIds=['wealth','career','date','style','layoff','daily','name','oracle','answerbook','lottery','zodiac','relation','export'];
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
