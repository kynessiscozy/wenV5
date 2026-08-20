import { GW, CURR_YEAR } from '../engines/shared.js';
import { TJ } from './tj.js';
import { TJX } from './tjx.js';
import { calcPattern, calcYearScores } from './scoring.js';

function buildContext(args){
  const{b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,P,gen,q,city,input}=args;
  const dg=b.D.g,dw=GW[dg];
  const by=input.by,bm=input.bm,bd=input.bd;
  const age=TJ.calcAge(by,bm,bd);
  const cDy=TJ.findDaYun(dy,age);
  const cLn=TJ.findLiuNian(ln,CURR_YEAR);
  const cLm=TJ.findLiuYue(liuyue);
  const dySS=cDy?TJ.ssOf(dg,cDy.g):'';
  const lnSS=cLn?TJ.ssOf(dg,cLn.g):'';
  const lmSS=cLm?TJ.ssOf(dg,cLm.gz.charAt(0)):'';
  const gl=gen==='male'?'乾造':'坤造';
  const pa=calcPattern(ss);
  // 预先算一次 TJX 用于评分修正（compute 内成本可接受，可缓存）
  let _tjxPre=null;
  try{_tjxPre=TJX.compute(b,ss);
      if(cDy)_tjxPre.dyScore=_tjxPre.pillarScore({g:cDy.g,z:cDy.z});
      if(cLn)_tjxPre.lnScore=_tjxPre.pillarScore({g:cLn.g,z:cLn.z});
  }catch(e){}
  const sc=calcYearScores(b,wx,ss,dySS,lnSS,_tjxPre,cDy,cLn);
  const shun=TJ.isShunDaYun(b,gen);
  return{
    input,
    b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,pa,P,
    gen,q,city,gl,
    by,bm,bd,age,
    dg,dz:b.D.z,dw,
    cDy,cDyIdx:cDy?cDy._idx:0,cDySS:dySS,
    cLn,cLnSS:lnSS,
    cLm,cLmSS:lmSS,
    dyShun:shun,
    dySS,lnSS,lmSS,
    scores:sc,
    cs:sc.career,ws:sc.wealth,ls:sc.love,hs:sc.health,
    ssOf: g => TJ.ssOf(dg, g),
    /* —— TJX 精算内核派生量（复用 _tjxPre 避免重算）—— */
    tjx: (function(){
      try{
        const k=_tjxPre||TJX.compute(b,ss);
        if(cDy&&!k.dyScore)k.dyScore=k.pillarScore({g:cDy.g,z:cDy.z});
        if(cLn&&!k.lnScore)k.lnScore=k.pillarScore({g:cLn.g,z:cLn.z});
        k.lnEvents = cLn?k.yearEvents({g:cLn.g,z:cLn.z},cDy?{g:cDy.g,z:cDy.z}:null):[];
        return k;
      }catch(e){console.warn('TJX compute failed',e);return null;}
    })()
  };
}

function getCtx(){return window._ctx||null;}
export { buildContext, getCtx };
