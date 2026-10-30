import { getCtx } from '../state/context.js';
import { toolPageShell } from './shared.js';

function closeToolPage(){document.getElementById('toolModal').classList.remove('open');if(window._returnToAI){window._returnToAI=false;setTimeout(()=>openAsk(),120);}}

/* tools2 专属工具：旧版 center.js 无法渲染，需委托给 tools2。
   这些工具（answerbook / export / calendar）在 tools2 加载完成前
   被点击时，显示加载提示并轮询等待 tools2 就绪后自动打开。
   避免落入下方 else 分支误导向「八字合盘」页面。 */
const TOOLS2_ONLY=['answerbook','calendar','horoscope','tarot','mbti','fengshui','style','career','date','relation','zodiac','name','oracle','lottery','daily'];
function delegateToTools2(type){
  const modal=document.getElementById('toolModal'),out=document.getElementById('toolModalContent');
  if(!modal||!out)return;
  if(window._tools2Ready){window.openToolPage(type);return;}
  out.innerHTML='<div class="tool-page-shell"><div style="text-align:center;padding:48px 20px;color:var(--c-text-3);font-size:.9em">工具加载中…</div></div>';
  modal.classList.add('open');
  let tries=0;
  const t=setInterval(()=>{
    tries++;
    if(window._tools2Ready){clearInterval(t);window.openToolPage(type);}
    else if(tries>40){clearInterval(t);out.innerHTML='<div style="text-align:center;padding:48px 20px;color:var(--c-text-3);font-size:.9em">工具加载失败，请刷新页面重试。</div>';}
  },50);
}

function openToolPage(type){
  window._activeTool=type;
  const modal=document.getElementById('toolModal'),out=document.getElementById('toolModalContent');
  if(!modal||!out)return;
  /* tools2 专属工具委托（不需要命盘上下文） */
  if(TOOLS2_ONLY.includes(type)){delegateToTools2(type);return;}
  const d=getCtx();
  if(!d)return;
  const data=(items,note='')=>'<div class="tool-page-data">'+items.map(x=>'<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+'</div>'+(note?'<div class="tool-page-note">'+note+'</div>':'');
  if(type==='wealth')out.innerHTML=toolPageShell('财运与理财罗盘','命盘趋势 + 你的现金流输入，生成可执行的理财优先级。',data([['当前财运',d.ws+' / 100'],['财富节奏',d.ws>=70?'可争取增收与谈价':'以稳健积累为主'],['命盘取向',d.wx.st?'分散配置，避免追高':'先建立储蓄与安全垫'],['数据边界','不构成投资建议']])+'<div class="tool-form-row"><input id="wealthIncome" type="number" placeholder="月到手收入"><input id="wealthCost" type="number" placeholder="月固定支出"><input id="wealthCash" type="number" placeholder="现有储蓄"></div><div class="tool-form-row"><button class="tool-primary" onclick="runWealthTool()">生成现金流方案</button></div><div class="tool-output" id="toolOutput"></div>');
  else if(type==='layoff')out.innerHTML=toolPageShell('裁员风险检测','现实风险信号 + 现金流缓冲 + 当前事业节奏，生成行动预案。','<div class="tool-form-row"><select id="layoffSignal"><option value="1">公司稳定，岗位核心</option><option value="2">业务调整，工作可交接</option><option value="3">部门收缩，已有明确信号</option></select><select id="layoffBuffer"><option value="1">储蓄可覆盖 6 个月以上</option><option value="2">储蓄可覆盖 3—6 个月</option><option value="3">储蓄不足 3 个月</option></select></div><div class="tool-form-row"><select id="layoffMarket"><option value="1">简历与作品集已更新</option><option value="2">有零散机会但未准备</option><option value="3">尚未准备求职渠道</option></select><button class="tool-primary" onclick="runLayoffTool()">生成预案</button></div><div class="tool-output" id="toolOutput"></div>');
  else out.innerHTML=toolPageShell('八字合盘 · 关系分析','为对方真实排盘，逐柱比对日主、五行与干支关系。',data([['你的日主',d.dg+d.dw],['你的用神',d.wx.ys],['比对方式','日柱（夫妻宫）+ 五行互补 + 干支刑冲合害'],['结果性质','用于理解差异，不预测结局']])+'<div class="tool-form-row"><input id="relName" placeholder="对方称呼（可选）"><select id="relFocus"><option>亲密关系</option><option>朋友合作</option><option>家人沟通</option></select></div><div class="tool-form-row"><input id="relDate" type="date" aria-label="对方出生日期"><select id="relHour" aria-label="对方出生时辰"><option value="">时辰不详（三柱比对）</option><option value="0">子 23:00–00:59</option><option value="1">丑 01:00–02:59</option><option value="2">寅 03:00–04:59</option><option value="3">卯 05:00–06:59</option><option value="4">辰 07:00–08:59</option><option value="5">巳 09:00–10:59</option><option value="6">午 11:00–12:59</option><option value="7">未 13:00–14:59</option><option value="8">申 15:00–16:59</option><option value="9">酉 17:00–18:59</option><option value="10">戌 19:00–20:59</option><option value="11">亥 21:00–22:59</option></select></div><div class="tool-panel-note">不知道对方时辰也能算：日柱不依赖时辰，夫妻宫结论依然精确。</div><div class="tool-form-row"><button class="tool-primary" onclick="runRelationTool()">开始合盘</button></div><div class="tool-output" id="toolOutput"></div>');
  modal.classList.add('open');
}

export { closeToolPage, openToolPage };
