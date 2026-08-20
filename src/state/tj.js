import { SS } from '../engines/shared.js';

/* ============================================================
   全局上下文工具 TJ —— 所有派生量的单一来源
   规则：任何"当前大运 / 当前流年 / 当前流月 / 年龄 / 十神 / 评分"
   必须经由 TJ.* 或 buildContext() 提供，禁止在下游函数中重复实现。
   ============================================================ */
const TJ={
  calcAge(by,bm,bd){
    if(!by)return 0;
    const now=new Date();
    const ty=now.getFullYear(),tm=now.getMonth()+1,td=now.getDate();
    let a=ty-by;
    if(bm&&bd&&(tm<bm||(tm===bm&&td<bd)))a--;
    return Math.max(0,a);
  },
  findDaYun(dy,age){
    if(!dy||!dy.ds||!dy.ds.length)return null;
    const ds=dy.ds;
    if(age<ds[0].as)return Object.assign({},ds[0],{_idx:0,_state:'before'});
    for(let i=0;i<ds.length;i++){
      if(age>=ds[i].as&&age<=ds[i].ae)return Object.assign({},ds[i],{_idx:i,_state:'current'});
    }
    return Object.assign({},ds[ds.length-1],{_idx:ds.length-1,_state:'after'});
  },
  findLiuNian(ln,year){
    if(!ln||!ln.length)return null;
    const y=year||CURR_YEAR;
    return ln.find(l=>l.y===y)||ln.find(l=>l.y>=y)||ln[ln.length-1];
  },
  findLiuYue(liuyue){
    if(!liuyue||!liuyue.length)return null;
    const now=new Date(),today=now.getTime();
    let best=null,bestDiff=Infinity;
    liuyue.forEach(lm=>{
      const mt=(lm.jq||'').match(/(\d+)月(\d+)日/);
      if(!mt)return;
      const dt=new Date(now.getFullYear(),parseInt(mt[1])-1,parseInt(mt[2]));
      const diff=today-dt.getTime();
      if(diff>=0&&diff<bestDiff){bestDiff=diff;best=lm;}
    });
    return best||liuyue[0];
  },
  ssOf(dg,g){return(dg&&g&&SS[dg])?SS[dg][g]:'';},
  isShunDaYun(b,gen){
    const yangGan=b.Y.gi%2===0;
    return(yangGan&&gen==='male')||(!yangGan&&gen!=='male');
  }
};

export { TJ };
