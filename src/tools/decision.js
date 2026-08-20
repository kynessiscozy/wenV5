import { getCtx } from '../state/context.js';
import { TJ } from '../state/tj.js';
import { CURR_YEAR } from '../engines/shared.js';

function getDecisionAdvice(b,wx,dy,ln,scene){
  const ctx=getCtx();
  const age=ctx?ctx.age:(b._meta?TJ.calcAge(b._meta.by,b._meta.bm||1,b._meta.bd||1):0);
  const cDy=ctx?ctx.cDy:TJ.findDaYun(dy,age);
  const cLn=ctx?ctx.cLn:TJ.findLiuNian(ln,CURR_YEAR);
  if(!cDy||!cLn)return{label:'信息不足',window:'-',risk:'-',advice:'请先完整填写出生信息'};
  const dg=b.D.g,lnSS=TJ.ssOf(dg,cLn.g),dySS=TJ.ssOf(dg,cDy.g);
  if(scene==='跳槽'){const good=lnSS.includes('官')||lnSS.includes('财')||dySS.includes('官');return{label:good?'适合变动':'适合稳守',window:good?'未来3-5个月':'建议等到明年春季',risk:'情绪化决定',advice:'先拿Offer再离职，别裸辞'};}
  if(scene==='创业'){const good=wx.st&&(lnSS.includes('食')||lnSS.includes('伤')||lnSS.includes('财'));return{label:good?'可以尝试':'更适合联合创业',window:good?'秋季启动最佳':'先积累资源与人脉',risk:good?'资金链断裂':'单打独斗精力不足',advice:good?'找土金属性的合伙人':'先以副业验证模式'};}
  if(scene==='投资'){const good=lnSS.includes('财')&&wx.st;return{label:good?'偏财机会存在':'以稳健储蓄为主',window:good?'农历七月前后':'全年以固收为主',risk:'高风险短线操作',advice:good?'小仓位试水，见好就收':'远离杠杆与加密货币'};}
  return{label:'需结合具体时机',window:'近期非关键窗口',risk:'信息不足',advice:'建议先咨询专业顾问'};
}
function openDecisionTool(){
  const el=document.getElementById('toolResult');if(!el)return;
  el.innerHTML='<div class="tool-panel"><div class="tool-panel-title">决策窗口</div><div class="tool-choice"><button onclick="runDecisionTool(\'跳槽\')">跳槽</button><button onclick="runDecisionTool(\'创业\')">创业</button><button onclick="runDecisionTool(\'投资\')">投资</button></div><div class="tool-panel-note">选择事项后，结合当前大运与流年给出行动窗口与风险提醒。</div></div>';
}
function runDecisionTool(scene){
  const d=getCtx(),el=document.getElementById('toolResult');if(!d||!el)return;
  const r=getDecisionAdvice(d.b,d.wx,d.dy,d.ln,scene);
  el.innerHTML='<div class="tool-panel"><div class="tool-panel-title">'+scene+' · '+r.label+'</div><div class="tool-answer"><div><span>行动窗口</span><b>'+r.window+'</b></div><div><span>主要风险</span><b>'+r.risk+'</b></div><div class="wide"><span>建议</span><b>'+r.advice+'</b></div></div><button class="tool-back" onclick="openDecisionTool()">← 重新选择</button></div>';
}

export { getDecisionAdvice, openDecisionTool, runDecisionTool };
