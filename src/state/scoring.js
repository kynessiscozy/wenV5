import { GW, ZW } from '../engines/shared.js';

function calcYearScores(b,wx,ss,dySS,lnSS,tjx,cDy,cLn){
  const dg=b.D.g,dw=GW[dg];
  const lnBonus=lnSS.includes('官')?12:lnSS.includes('印')?10:lnSS.includes('财')?8:lnSS.includes('食')?6:lnSS.includes('比')?3:0;
  const dyBonus=dySS.includes('官')?8:dySS.includes('印')?7:dySS.includes('财')?6:dySS.includes('食')?5:0;
  const ysRatio=wx.c[wx.ys]/wx.t;
  const monthHelp=(ZW[b.M.z]===wx.ys||ZW[b.M.z]===wx.xs)?8:0;
  let career=52+ysRatio*35+lnBonus+dyBonus*0.5+monthHelp*0.3+(wx.st?3:0);
  let wealth=48+(wx.c[wx.KE[dw]]/wx.t)*30+(lnSS.includes('财')?15:0)+(dySS.includes('财')?8:0)+ysRatio*15+monthHelp*0.3;
  let love=50+(wx.c['火']+wx.c['水'])/wx.t*20+(lnSS.includes('财')||lnSS.includes('官')?10:0)+(ss.dzc.some(c=>c.s.includes('财')||c.s.includes('官'))?8:0)+ysRatio*12;
  let health=55+((wx.t-Math.abs(wx.c[wx.s]-wx.c[wx.w]))/wx.t)*25+(wx.c[wx.w]>1?8:0)+ysRatio*10+monthHelp*0.2;

  // —— TJX 高级修正：把大运/流年的精算评分按权重融合 ——
  if(tjx){
    // 命局基础品质（成格/中和/用神有力）修正所有维度的"天花板"
    const baseFix=(tjx.lifeGrade.score-60)*0.15;
    career+=baseFix; wealth+=baseFix; love+=baseFix*0.6; health+=baseFix*0.4;

    // 用流年精算分（-100~100）按 0.25 权重修正
    if(tjx.lnScore){
      const lf=tjx.lnScore.score*0.18;
      career+=lf; wealth+=lf*0.9; love+=lf*0.5; health+=lf*0.4;
    }
    // 大运精算分按 0.12 权重
    if(tjx.dyScore){
      const df=tjx.dyScore.score*0.10;
      career+=df; wealth+=df; love+=df*0.4; health+=df*0.5;
    }
    // 刑冲扣健康/感情分
    const ints=tjx.interactions;
    health-=Math.min(ints.zhi_chong.length*2.5,8);
    health-=Math.min(ints.zhi_xing.length*2,6);
    love-=Math.min(ints.zhi_chong.length*2,7);
    // 三合/三会加事业财富
    const triFull=ints.san_he.filter(x=>x.full).length+ints.san_hui.length;
    career+=triFull*3; wealth+=triFull*3;
  }

  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(v)));
  return{
    career:clamp(career,18,98),
    wealth:clamp(wealth,18,97),
    love:clamp(love,20,96),
    health:clamp(health,25,96)
  };
}
function calcPattern(ss){
  const pa=[],ash=[ss.yg,ss.mg,ss.hg];
  if(ash.includes('正官'))pa.push('正官格');
  if(ash.includes('七杀'))pa.push('七杀格');
  if(ash.includes('正财')||ash.includes('偏财'))pa.push('财星格');
  if(ash.includes('食神'))pa.push('食神格');
  if(ash.includes('伤官'))pa.push('伤官格');
  if(ash.includes('正印')||ash.includes('偏印'))pa.push('印绶格');
  if(!pa.length)pa.push('杂气格');
  return pa;
}

export { calcYearScores, calcPattern };
