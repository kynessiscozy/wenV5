import { TG, DZ, WX, GW, ZW, SS } from '../engines/shared.js';

/* ============================================================
   TJX 推算内核 v1.0  ——  TianJi eXtended Engine
   理论来源：
     · 旺衰：《滴天髓阐微》（任铁樵）得令/得地/得势三维量化
     · 格局：《子平真诠》（沈孝瞻）正格、变格、从化格
     · 调候：《穷通宝鉴》月令调候用神表（十干四时）
     · 用神：扶抑·调候·通关·病药 四法综合
     · 十神：根/透/藏 与 生克 质量分析
     · 大运流年：刑冲合化 + 用忌 + 神煞触发 综合评分
   设计：纯函数 + 单一来源；输出挂在 ctx.tjx 命名空间。
   注意：所有评分采用 -100~+100 的统一量纲；UI 可自行映射。
   ============================================================ */

/* ============================================================
   V5 旺衰五维精算引擎 (内嵌版)
   升级自 V4 三维模型，新增：得气(穷通宝鉴气数法) + 得局(合局加持)
   同时增强：得令(人元司权+进气退气) + 得地(墓库开闭+禄位) + 得势(生克链传播)
   ============================================================ */
const __TJX_V5 = (function(){
  const BEI_SHENG = {木:'水',火:'木',土:'火',金:'土',水:'金'};
  const BEI_KE    = {木:'金',火:'水',土:'木',金:'火',水:'土'};

  // 人元司权表
  const MONTH_DUTY = {
    寅:[{g:'戊',d:7},{g:'丙',d:7},{g:'甲',d:16}],
    卯:[{g:'甲',d:10},{g:'乙',d:20}],
    辰:[{g:'乙',d:9},{g:'癸',d:3},{g:'戊',d:18}],
    巳:[{g:'戊',d:5},{g:'庚',d:5},{g:'丙',d:20}],
    午:[{g:'丙',d:10},{g:'己',d:9},{g:'丁',d:11}],
    未:[{g:'丁',d:9},{g:'乙',d:3},{g:'己',d:18}],
    申:[{g:'戊',d:7},{g:'己',d:7},{g:'壬',d:3},{g:'庚',d:13}],
    酉:[{g:'庚',d:10},{g:'辛',d:20}],
    戌:[{g:'辛',d:9},{g:'丁',d:3},{g:'戊',d:18}],
    亥:[{g:'戊',d:7},{g:'甲',d:5},{g:'壬',d:18}],
    子:[{g:'壬',d:10},{g:'癸',d:20}],
    丑:[{g:'癸',d:9},{g:'辛',d:3},{g:'己',d:18}]
  };

  const W_TABLE = {
    木:{木:'旺',火:'相',土:'死',金:'囚',水:'休'},
    火:{火:'旺',土:'相',金:'死',水:'囚',木:'休'},
    土:{土:'旺',金:'相',水:'死',木:'囚',火:'休'},
    金:{金:'旺',水:'相',木:'死',火:'囚',土:'休'},
    水:{水:'旺',木:'相',火:'死',土:'囚',金:'休'}
  };

  const WX_STATE_SCORE = {旺:40,相:25,休:10,囚:-5,死:-18};

  const JIN_TUI_QI = {
    寅:{进:'火',退:'水'},卯:{进:'火',退:'水'},辰:{进:'金',退:'木'},
    巳:{进:'土',退:'木'},午:{进:'土',退:'木'},未:{进:'金',退:'火'},
    申:{进:'水',退:'土'},酉:{进:'水',退:'土'},戌:{进:'木',退:'金'},
    亥:{进:'木',退:'金'},子:{进:'木',退:'金'},丑:{进:'火',退:'水'}
  };

  const LU = {甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'};
  const DI_WANG = {甲:'卯',乙:'寅',丙:'午',丁:'巳',戊:'午',己:'巳',庚:'酉',辛:'申',壬:'子',癸:'亥'};
  const CHONG = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  const HE = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  const TOMB = {辰:'水',戌:'火',丑:'金',未:'木'};

  // 穷通宝鉴气数（精简：12日干×12月=144条）
  const QI_SHU = {
    甲:{寅:['丙','癸'],卯:['庚','丙'],辰:['庚','壬'],巳:['癸','庚'],午:['癸','庚'],未:['癸','庚'],申:['庚','壬'],酉:['庚','壬'],戌:['庚','壬'],亥:['庚','丁'],子:['丁','庚'],丑:['丁','庚']},
    乙:{寅:['丙','癸'],卯:['丙','癸'],辰:['癸','丙'],巳:['癸','丙'],午:['癸','丙'],未:['癸','丙'],申:['丙','癸'],酉:['癸','丙'],戌:['癸','丙'],亥:['丙','戊'],子:['丙','戊'],丑:['丙','戊']},
    丙:{寅:['壬','庚'],卯:['壬','己'],辰:['壬','庚'],巳:['壬','庚'],午:['壬','庚'],未:['壬','庚'],申:['壬','戊'],酉:['壬','戊'],戌:['壬','甲'],亥:['甲','戊'],子:['壬','戊'],丑:['壬','甲']},
    丁:{寅:['甲','庚'],卯:['甲','庚'],辰:['甲','庚'],巳:['甲','庚'],午:['壬','庚'],未:['甲','壬'],申:['甲','庚'],酉:['甲','庚'],戌:['甲','庚'],亥:['甲','庚'],子:['甲','庚'],丑:['甲','庚']},
    戊:{寅:['丙','甲'],卯:['丙','甲'],辰:['甲','丙'],巳:['甲','丙'],午:['壬','甲'],未:['甲','丙'],申:['丙','甲'],酉:['丙','甲'],戌:['甲','丙'],亥:['丙','甲'],子:['丙','甲'],丑:['丙','甲']},
    己:{寅:['丙','庚'],卯:['甲','癸'],辰:['丙','甲'],巳:['癸','丙'],午:['癸','丙'],未:['癸','丙'],申:['丙','癸'],酉:['丙','癸'],戌:['丙','癸'],亥:['丙','甲'],子:['丙','甲'],丑:['丙','甲']},
    庚:{寅:['戊','甲'],卯:['丁','甲'],辰:['甲','丁'],巳:['壬','戊'],午:['壬','己'],未:['壬','甲'],申:['丁','甲'],酉:['丁','甲'],戌:['甲','壬'],亥:['丁','丙'],子:['丁','甲'],丑:['丙','丁']},
    辛:{寅:['己','壬'],卯:['壬','甲'],辰:['壬','甲'],巳:['壬','甲'],午:['壬','己'],未:['壬','甲'],申:['壬','甲'],酉:['壬','甲'],戌:['壬','甲'],亥:['壬','丙'],子:['丙','戊'],丑:['丙','壬']},
    壬:{寅:['庚','戊'],卯:['戊','庚'],辰:['甲','庚'],巳:['壬','庚'],午:['癸','庚'],未:['辛','甲'],申:['戊','丁'],酉:['甲','庚'],戌:['甲','丙'],亥:['戊','丙'],子:['戊','丙'],丑:['丙','丁']},
    癸:{寅:['辛','丙'],卯:['庚','辛'],辰:['丙','辛'],巳:['辛','庚'],午:['庚','壬'],未:['庚','辛'],申:['丁','甲'],酉:['辛','丙'],戌:['辛','癸'],亥:['庚','辛'],子:['丙','辛'],丑:['丙','丁']}
  };

  // 十二长生权重（日干在各地支）
  const CS_WEIGHT = (function(){
    const cs = {
      甲:'亥子丑寅卯辰巳午未申酉戌',乙:'午巳辰卯寅丑子亥戌酉申未',
      丙:'寅卯辰巳午未申酉戌亥子丑',丁:'酉申未午巳辰卯寅丑子亥戌',
      戊:'寅卯辰巳午未申酉戌亥子丑',己:'酉申未午巳辰卯寅丑子亥戌',
      庚:'巳午未申酉戌亥子丑寅卯辰',辛:'子亥戌酉申未午巳辰卯寅丑',
      壬:'申酉戌亥子丑寅卯辰巳午未',癸:'卯寅丑子亥戌酉申未午巳辰'
    };
    const sw = {长:0.85,沐:0.45,冠:0.80,临:1.00,帝:0.95,衰:0.55,病:0.35,死:0.15,墓:0.25,绝:0.05,胎:0.40,养:0.50};
    const sn = ['长','沐','冠','临','帝','衰','病','死','墓','绝','胎','养'];
    const out = {};
    TG.forEach(g => { out[g] = {}; DZ.forEach((z,i) => { out[g][z] = sw[sn[cs[g].indexOf(z)]] || 0.5; }); });
    return out;
  })();

  // 地支藏干
  const ZC_W_V5 = {
    子:[['癸',1.0]],丑:[['己',1.0],['癸',0.7],['辛',0.5]],
    寅:[['甲',1.0],['丙',0.7],['戊',0.5]],卯:[['乙',1.0]],
    辰:[['戊',1.0],['乙',0.7],['癸',0.5]],巳:[['丙',1.0],['庚',0.7],['戊',0.5]],
    午:[['丁',1.0],['己',0.7]],未:[['己',1.0],['丁',0.7],['乙',0.5]],
    申:[['庚',1.0],['壬',0.7],['戊',0.5]],酉:[['辛',1.0]],
    戌:[['戊',1.0],['辛',0.7],['丁',0.5]],亥:[['壬',1.0],['甲',0.7]]
  };

  const DIMS = {deLing:0.25, deDi:0.30, deShi:0.20, deQi:0.15, deJu:0.10};

  function deLing(dg, mz, bd){
    const dw=GW[dg], mw=ZW[mz];
    const state=W_TABLE[mw][dw];
    let score=WX_STATE_SCORE[state]||0;
    let dutyGan=null;
    const duties=MONTH_DUTY[mz]||[];
    let ds=0;
    for(const d of duties){ds+=d.d;if(bd<=ds){dutyGan=d.g;break;}}
    if(!dutyGan&&duties.length)dutyGan=duties[duties.length-1].g;
    if(dutyGan&&GW[dutyGan]===dw)score+=8;
    else if(dutyGan&&GW[dutyGan]===BEI_SHENG[dw])score+=4;
    else if(dutyGan&&GW[dutyGan]===BEI_KE[dw])score-=6;
    const jt=JIN_TUI_QI[mz];
    let jtl='';
    if(jt){if(dw===jt.进){score+=6;jtl='进气';}else if(dw===jt.退){score-=6;jtl='退气';}}
    return{score:Math.round(score),state,dutyGan,jinTui:jtl};
  }

  function deDi(dg, zhiList){
    const dw=GW[dg];let score=0;
    const posW=[1.0,2.0,1.8,1.2],allZ=zhiList.map(z=>z.z);
    for(const item of zhiList){
      const{z,position}=item,wgt=posW[position];
      const csW=CS_WEIGHT[dg]&&CS_WEIGHT[dg][z]?CS_WEIGHT[dg][z]:0.3;
      score+=csW*15*wgt;
      const hidden=ZC_W_V5[z]||[];
      for(const[cg,hw] of hidden){
        const cw=GW[cg];
        if(cw===dw){
          let rs=hw*8*wgt;
          if(TOMB[z]===dw){
            const cz=CHONG[z];
            rs*=allZ.includes(cz)?1.8:0.4;
          }
          score+=rs;
        }else if(cw===BEI_SHENG[dw])score+=hw*5*wgt;
      }
      if(LU[dg]===z)score+=14*wgt;
      if(DI_WANG[dg]===z)score+=10*wgt;
    }
    return{score:Math.round(Math.min(score,60)*10)/10};
  }

  function deShi(dg, yg, mg, hg){
    const dw=GW[dg];let score=0;const chains=[];
    const gl=[{g:yg,pos:'年',dist:3},{g:mg,pos:'月',dist:1},{g:hg,pos:'时',dist:2}];
    for(const{g,pos,dist} of gl){
      if(!g)continue;
      const gw=GW[g],df=1.0/Math.sqrt(dist);
      if(gw===dw){score+=10*df;chains.push(pos+'比劫+'+Math.round(10*df));}
      else if(gw===BEI_SHENG[dw]){score+=7*df;chains.push(pos+'印生+'+Math.round(7*df));}
      else if(gw===ZSHENG){score-=5*df;chains.push(pos+'食伤-'+Math.round(5*df));}
      else if(gw===ZKE){score-=6*df;chains.push(pos+'财耗-'+Math.round(6*df));}
      else if(gw===BEI_KE[dw]){score-=9*df;chains.push(pos+'官杀-'+Math.round(9*df));}
    }
    if(yg&&mg){
      const yw=GW[yg],mw=GW[mg];
      if(ZSHENG&&ZSHENG[yw]===mw){if(ZSHENG[mw]===dw||BEI_SHENG[mw]===dw){score+=5;chains.push('连续相生链+5');}}
      if((ZKE&&ZKE[yw]===mw||BEI_KE[yw]===mw)&&(mw===dw||(ZSHENG&&ZSHENG[mw]===dw)||BEI_SHENG[mw]===dw)){score-=4;chains.push('阻隔-4');}
    }
    if(mg&&hg){
      const mw=GW[mg],hw=GW[hg];
      if(((BEI_KE[mw]===dw||(ZKE&&ZKE[mw]===dw)||(ZSHENG&&ZSHENG[mw]===dw))&&(BEI_KE[hw]===dw||(ZKE&&ZKE[hw]===dw)||(ZSHENG&&ZSHENG[hw]===dw)))&&(mw===hw||(ZSHENG&&ZSHENG[mw]===hw)||BEI_SHENG[mw]===hw)){score-=3;chains.push('合力作用-3');}
    }
    return{score:Math.round(score*10)/10,chains};
  }

  function deQi(dg, mz, allGan, allZhi){
    const qiList=QI_SHU[dg]&&QI_SHU[dg][mz]?QI_SHU[dg][mz]:[];
    if(!qiList.length)return{score:0,details:[],summary:'无数据'};
    const pw=new Set(),dw=GW[dg];
    allGan.forEach(g=>{if(g)pw.add(GW[g]);});
    allZhi.forEach(z=>{(ZC_W_V5[z]||[]).forEach(([cg])=>pw.add(GW[cg]));});
    let score=0;const found=[],missing=[];
    if(qiList[0]){
      const qw=GW[qiList[0]];
      if(pw.has(qw)&&qw!==dw){score+=15;found.push('一气'+qiList[0]+'·符合');}else{score-=8;missing.push('一气'+qiList[0]+'·缺');}
    }
    if(qiList[1]){
      const qw=GW[qiList[1]];
      if(pw.has(qw)&&qw!==dw){score+=8;found.push('二气'+qiList[1]+'·符合');}else{score-=4;missing.push('二气'+qiList[1]+'·缺');}
    }
    const agw=new Set(allGan.filter(Boolean).map(g=>GW[g]));
    if(qiList[0]&&agw.has(GW[qiList[0]])){score+=3;found.push('一气透干+3');}
    if(qiList[1]&&agw.has(GW[qiList[1]])){score+=2;found.push('二气透干+2');}
    return{score:Math.round(score),details:[...found,...missing],summary:found.length>=2?'全备':found.length===1?'有缺':'匮乏'};
  }

  function deJu(dg, zhiList){
    const dw=GW[dg],allZ=zhiList.map(z=>z.z),zc={};
    allZ.forEach(z=>{zc[z]=(zc[z]||0)+1;});
    let score=0;const details=[];
    const sanHe=[{zhi:['申','子','辰'],wx:'水'},{zhi:['亥','卯','未'],wx:'木'},{zhi:['寅','午','戌'],wx:'火'},{zhi:['巳','酉','丑'],wx:'金'}];
    for(const{zhi,wx} of sanHe){
      const p=zhi.filter(z=>zc[z]);
      if(p.length===3){
        if(wx===dw){score+=18;details.push('三合'+wx+'局+18');}
        else if(wx===BEI_SHENG[dw]){score+=14;details.push('三合'+wx+'生扶+14');}
        else if(wx===ZSHENG){score-=6;details.push('三合'+wx+'泄-6');}
      }else if(p.length===2){
        const mids=['子','卯','午','酉'];const hm=p.some(z=>mids.includes(z));
        if(hm){if(wx===dw){score+=10;details.push('半合'+wx+'(中神)+10');}else if(wx===BEI_SHENG[dw]){score+=7;details.push('半合'+wx+'生扶+7');}}
        else{if(wx===dw){score+=5;details.push('半合'+wx+'(缺中)+5');}else if(wx===BEI_SHENG[dw]){score+=3;details.push('半合'+wx+'生扶+3');}}
      }
    }
    const sanHui=[{zhi:['寅','卯','辰'],wx:'木'},{zhi:['巳','午','未'],wx:'火'},{zhi:['申','酉','戌'],wx:'金'},{zhi:['亥','子','丑'],wx:'水'}];
    for(const{zhi,wx} of sanHui){
      const p=zhi.filter(z=>zc[z]);
      if(p.length===3){
        if(wx===dw){score+=22;details.push('三会'+wx+'方+22');}
        else if(wx===BEI_SHENG[dw]){score+=16;details.push('三会'+wx+'生扶+16');}
        else if(wx===ZSHENG){score-=8;details.push('三会'+wx+'泄-8');}
      }else if(p.length===2){if(wx===dw){score+=6;details.push('三会缺一+6');}}
    }
    return{score:Math.round(score),details};
  }

  const ZSHENG = {木:'火',火:'土',土:'金',金:'水',水:'木'};
  const ZKE    = {木:'土',火:'金',土:'水',金:'木',水:'火'};

  function classifyLevel(ns){
    if(ns>=75)return{level:6,label:'极旺',extreme:true};
    if(ns>=45)return{level:5,label:'偏旺',extreme:false};
    if(ns>=15)return{level:4,label:'中和偏旺',extreme:false};
    if(ns>=-15)return{level:3,label:'中和',extreme:false};
    if(ns>=-45)return{level:2,label:'中和偏弱',extreme:false};
    if(ns>=-75)return{level:1,label:'偏弱',extreme:false};
    return{level:0,label:'极弱',extreme:true};
  }

  function compute(b, bd){
    const dg=b.D.g,mz=b.M.z,dw=GW[dg];
    const allGan=[b.Y.g,b.M.g,b.D.g,b.H.g];
    const allZhi=[b.Y.z,b.M.z,b.D.z,b.H.z];
    const ling=deLing(dg,mz,bd||15);
    const zhiList=[{z:b.Y.z,position:0},{z:b.M.z,position:1},{z:b.D.z,position:2},{z:b.H.z,position:3}];
    const di=deDi(dg,zhiList);
    const shi=deShi(dg,b.Y.g,b.M.g,b.H.g);
    const qi=deQi(dg,mz,allGan,allZhi);
    const ju=deJu(dg,zhiList);
    const nl=ling.score*0.55, nd=di.score*0.6, ns=shi.score*0.6, nq=qi.score*0.65, nj=ju.score*0.5;
    const tr=nl*DIMS.deLing+nd*DIMS.deDi+ns*DIMS.deShi+nq*DIMS.deQi+nj*DIMS.deJu;
    const total=Math.round(tr*4.2);
    const level=classifyLevel(total);
    const ec=[Math.abs(nl)>20,Math.abs(nd)>24,Math.abs(ns)>16,Math.abs(nq)>12,Math.abs(nj)>8].filter(Boolean).length;
    return{
      score:total,level:level.level,label:level.label,
      strong:total>=10,extreme:level.extreme||ec>=4,
      dw, dg, mz,
      dimensions:{
        deLing:{score:ling.score,state:ling.state,dutyGan:ling.dutyGan,jinTui:ling.jinTui},
        deDi:{score:di.score},
        deShi:{score:shi.score,chains:shi.chains},
        deQi:{score:qi.score,summary:qi.summary,details:qi.details},
        deJu:{score:ju.score,details:ju.details}
      }
    };
  }

  return{compute};
})();
const TJX = (function(){
  const SH={木:'火',火:'土',土:'金',金:'水',水:'木'};   // 五行相生
  const KE={木:'土',火:'金',土:'水',金:'木',水:'火'};   // 我克
  const BS={木:'水',火:'木',土:'火',金:'土',水:'金'};   // 生我
  const BK={木:'金',火:'水',土:'木',金:'火',水:'土'};   // 克我

  // 地支藏干本气/中气/余气 权重（沈孝瞻法）
  const ZC_W={
    子:[['癸',1.0]],
    丑:[['己',0.6],['癸',0.3],['辛',0.1]],
    寅:[['甲',0.6],['丙',0.3],['戊',0.1]],
    卯:[['乙',1.0]],
    辰:[['戊',0.6],['乙',0.3],['癸',0.1]],
    巳:[['丙',0.6],['庚',0.3],['戊',0.1]],
    午:[['丁',0.7],['己',0.3]],
    未:[['己',0.6],['丁',0.3],['乙',0.1]],
    申:[['庚',0.6],['壬',0.3],['戊',0.1]],
    酉:[['辛',1.0]],
    戌:[['戊',0.6],['辛',0.3],['丁',0.1]],
    亥:[['壬',0.7],['甲',0.3]]
  };

  // 十二长生表（日干在各地支的状态系数：越接近根越大）
  // 顺序：长生·沐浴·冠带·临官·帝旺·衰·病·死·墓·绝·胎·养
  const CS_W=[0.4,0.25,0.5,1.0,1.0,0.4,0.25,0.1,0.3,0.0,0.15,0.3];
  const CS_START={
    甲:11,乙:6,丙:2,丁:9,戊:2,己:9,庚:5,辛:0,壬:8,癸:3
  }; // 日干在哪个地支起"长生"（按 DZ 索引 子=0...亥=11 的"逆向位置"算）
  // 上述表参考子平：阳干顺行、阴干逆行
  const YANG_GAN={甲:1,丙:1,戊:1,庚:1,壬:1,乙:0,丁:0,己:0,辛:0,癸:0};

  function cs(dg,zhi){
    // 日干在某地支的"十二长生"权重
    const dzIdx={子:0,丑:1,寅:2,卯:3,辰:4,巳:5,午:6,未:7,申:8,酉:9,戌:10,亥:11};
    const start=CS_START[dg];
    if(start===undefined)return 0;
    const idx=dzIdx[zhi];
    const step=YANG_GAN[dg]?((idx-start+12)%12):((start-idx+12)%12);
    return CS_W[step]||0;
  }

  // —— 调候用神（穷通宝鉴精简表） ——
  // key: 日干+月令地支 → 主用神, 次用神
  const TIAO_HOU={
    // 甲木
    '甲子':['丁','庚'],'甲丑':['丙','丁'],'甲寅':['丙','癸'],'甲卯':['庚','戊'],
    '甲辰':['庚','戊'],'甲巳':['癸','丁'],'甲午':['癸','丁'],'甲未':['癸','丁'],
    '甲申':['庚','丁'],'甲酉':['庚','丁'],'甲戌':['庚','甲'],'甲亥':['庚','丁'],
    // 乙木
    '乙子':['丙','戊'],'乙丑':['丙','戊'],'乙寅':['丙','癸'],'乙卯':['丙','癸'],
    '乙辰':['癸','丙'],'乙巳':['癸','辛'],'乙午':['癸','丙'],'乙未':['癸','丙'],
    '乙申':['丙','癸'],'乙酉':['丙','癸'],'乙戌':['癸','辛'],'乙亥':['丙','戊'],
    // 丙火
    '丙子':['壬','戊'],'丙丑':['壬','甲'],'丙寅':['壬','庚'],'丙卯':['壬','己'],
    '丙辰':['壬','甲'],'丙巳':['壬','庚'],'丙午':['壬','庚'],'丙未':['壬','庚'],
    '丙申':['壬','戊'],'丙酉':['壬','癸'],'丙戌':['甲','壬'],'丙亥':['甲','戊'],
    // 丁火
    '丁子':['甲','庚'],'丁丑':['甲','庚'],'丁寅':['庚','甲'],'丁卯':['庚','甲'],
    '丁辰':['甲','庚'],'丁巳':['甲','庚'],'丁午':['壬','庚'],'丁未':['甲','壬'],
    '丁申':['甲','庚'],'丁酉':['甲','庚'],'丁戌':['甲','庚'],'丁亥':['甲','庚'],
    // 戊土
    '戊子':['丙','甲'],'戊丑':['丙','甲'],'戊寅':['丙','癸'],'戊卯':['丙','癸'],
    '戊辰':['甲','丙'],'戊巳':['甲','丙'],'戊午':['壬','甲'],'戊未':['癸','丙'],
    '戊申':['丙','癸'],'戊酉':['丙','癸'],'戊戌':['甲','丙'],'戊亥':['甲','丙'],
    // 己土
    '己子':['丙','甲'],'己丑':['丙','甲'],'己寅':['丙','甲'],'己卯':['甲','癸'],
    '己辰':['丙','癸'],'己巳':['癸','丙'],'己午':['癸','丙'],'己未':['癸','丙'],
    '己申':['丙','癸'],'己酉':['丙','癸'],'己戌':['甲','丙'],'己亥':['丙','甲'],
    // 庚金
    '庚子':['丁','甲'],'庚丑':['丙','丁'],'庚寅':['戊','甲'],'庚卯':['丁','甲'],
    '庚辰':['甲','丁'],'庚巳':['壬','戊'],'庚午':['壬','癸'],'庚未':['丁','甲'],
    '庚申':['丁','甲'],'庚酉':['丁','甲'],'庚戌':['甲','壬'],'庚亥':['丁','丙'],
    // 辛金
    '辛子':['丙','戊'],'辛丑':['丙','壬'],'辛寅':['己','壬'],'辛卯':['壬','甲'],
    '辛辰':['壬','甲'],'辛巳':['壬','甲'],'辛午':['壬','己'],'辛未':['壬','庚'],
    '辛申':['壬','戊'],'辛酉':['壬','甲'],'辛戌':['壬','甲'],'辛亥':['壬','丙'],
    // 壬水
    '壬子':['戊','丙'],'壬丑':['丙','丁'],'壬寅':['庚','戊'],'壬卯':['戊','辛'],
    '壬辰':['甲','庚'],'壬巳':['壬','庚'],'壬午':['癸','庚'],'壬未':['辛','甲'],
    '壬申':['戊','丁'],'壬酉':['甲','庚'],'壬戌':['甲','丙'],'壬亥':['戊','丙'],
    // 癸水
    '癸子':['丙','辛'],'癸丑':['丙','丁'],'癸寅':['辛','丙'],'癸卯':['庚','辛'],
    '癸辰':['丙','辛'],'癸巳':['辛','庚'],'癸午':['庚','壬'],'癸未':['庚','辛'],
    '癸申':['丁','甲'],'癸酉':['辛','丙'],'癸戌':['辛','癸'],'癸亥':['庚','辛']
  };

  // 旺相休囚死表（按月令五行对其他五行的状态）
  const W_TABLE={
    木:{木:'旺',火:'相',土:'死',金:'囚',水:'休'},
    火:{火:'旺',土:'相',金:'死',水:'囚',木:'休'},
    土:{土:'旺',金:'相',水:'死',木:'囚',火:'休'},
    金:{金:'旺',水:'相',木:'死',火:'囚',土:'休'},
    水:{水:'旺',木:'相',火:'死',土:'囚',金:'休'}
  };

  /* ——— 1. 旺衰精算（三维：得令/得地/得势） ——— */
  /* ——— 1. 旺衰精算（V5 五维引擎：得令/得地/得势/得气/得局） ——— */
  function strength(b){
    var bd = (b._meta && b._meta.bd) ? b._meta.bd : 15;
    var v5r = __TJX_V5.compute(b, bd);
    return {
      dw: v5r.dw,
      monthState: v5r.dimensions.deLing.state,
      deLing: v5r.dimensions.deLing.score,
      deDi: v5r.dimensions.deDi.score,
      deShi: v5r.dimensions.deShi.score,
      score: v5r.score,
      level: v5r.level,
      label: v5r.label,
      strong: v5r.strong,
      extreme: v5r.extreme
    };
  }

  /* ——— 2. 调候用神 ——— */
  function tiaoHou(b){
    const key=b.D.g+b.M.z;
    const r=TIAO_HOU[key];
    if(!r)return null;
    return{primary:r[0], secondary:r[1], key};
  }

  /* ——— 3. 综合用神（扶抑+调候+通关+病药） ——— */
  function yongShen(b, str, th){
    const dw=str.dw;
    const cands={}; // 候选 → 分数
    const add=(wx,v,reason)=>{
      if(!wx)return;
      if(!cands[wx])cands[wx]={score:0,reasons:[]};
      cands[wx].score+=v;
      cands[wx].reasons.push(reason);
    };

    // (a) 扶抑：身旺抑（克泄耗），身弱扶（生比）
    if(str.strong){
      add(KE[dw],30,'扶抑：克身为用');
      add(SH[dw],25,'扶抑：泄秀为用');
      add(BK[dw],20,'扶抑：官杀制身');
    }else{
      add(BS[dw],30,'扶抑：印生身');
      add(dw,25,'扶抑：比劫帮身');
    }

    // (b) 调候：冬寒夏燥需调
    if(th){
      const primaryWx=GW[th.primary];
      const secondaryWx=GW[th.secondary];
      add(primaryWx,25,'调候：'+th.primary+'为主调候');
      add(secondaryWx,12,'调候：'+th.secondary+'为次调候');
    }

    // (c) 病药：找出命局最忌之神，取其克者
    const counts={};
    WX.forEach(w=>counts[w]=0);
    [b.Y.g,b.M.g,b.D.g,b.H.g].forEach(g=>counts[GW[g]]+=1);
    [b.Y.z,b.M.z,b.D.z,b.H.z].forEach(z=>{
      (ZC_W[z]||[]).forEach(([cg,w])=>counts[GW[cg]]+=w);
    });
    let maxW='木',maxV=0;
    WX.forEach(w=>{if(w!==dw&&counts[w]>maxV){maxV=counts[w];maxW=w}});
    if(maxV>=3.5){
      add(KE[maxW],15,'病药：制'+maxW+'之病');
    }

    // (d) 通关：若两强对峙
    WX.forEach(a=>WX.forEach(b2=>{
      if(KE[a]===b2&&counts[a]>=2.5&&counts[b2]>=2.5){
        const tg=SH[a]; // 通关者
        if(tg!==dw||!str.strong){
          add(tg,10,'通关：化'+a+'生'+b2);
        }
      }
    }));

    // 排序取主用神
    const sorted=Object.entries(cands).sort((a,b)=>b[1].score-a[1].score);
    if(!sorted.length)return{primary:SH[dw],secondary:KE[dw],candidates:{},reasons:['默认取食伤']};
    return{
      primary: sorted[0][0],
      secondary: sorted[1]?sorted[1][0]:null,
      candidates: cands,
      reasons: sorted[0][1].reasons
    };
  }

  /* ——— 4. 格局判定（子平真诠） ——— */
  function pattern(b, ss, str){
    const out={main:null, type:'正格', detail:[], grade:'B'};
    const mz=b.M.z, mw=ZW[mz];
    const dg=b.D.g, dw=GW[dg];
    const monthHidden=(ZC_W[mz]||[]).map(x=>x[0]);
    const allG=[b.Y.g,b.M.g,b.H.g];

    // ① 月令本气透干优先
    const benqi=monthHidden[0];
    let lord=null;
    if(benqi && benqi!==dg){
      // 是否透干
      if(allG.includes(benqi)) lord=benqi;
      else if(monthHidden[1] && allG.includes(monthHidden[1])) lord=monthHidden[1];
      else lord=benqi; // 不透取本气
    }

    if(lord){
      const ssName=SS[dg][lord];
      const map={
        '正官':'正官格','七杀':'七杀格','偏官':'七杀格',
        '正财':'正财格','偏财':'偏财格',
        '正印':'正印格','偏印':'偏印格',
        '食神':'食神格','伤官':'伤官格',
        '比肩':'建禄格','劫财':'月刃格'
      };
      out.main=map[ssName]||'杂气格';
      out.detail.push('月令'+mz+'透'+lord+'('+ssName+')');
    }

    // ② 变格判断：极旺/极弱时考虑从格、化气格
    if(str.extreme){
      if(str.score<=-60){
        // 身极弱 → 看是否成从
        const cnt={财:0,官:0,食:0};
        [b.Y.g,b.M.g,b.H.g,b.Y.z,b.M.z,b.D.z,b.H.z].forEach(c=>{
          const w=c.length>1?0:1;
          if(!w&&!ZC_W[c])return;
          const gan=GW[c]?c:null;
          if(gan){
            const w2=GW[gan];
            if(w2===KE[dw])cnt.财++;
            if(w2===BK[dw])cnt.官++;
            if(w2===SH[dw])cnt.食++;
          }
        });
        const max=Math.max(cnt.财,cnt.官,cnt.食);
        if(max>=3){
          out.type='从格';
          out.main=cnt.财===max?'从财格':cnt.官===max?'从官杀格':'从儿格';
          out.grade='A';
          out.detail.push('日主极弱，从'+(cnt.财===max?'财':cnt.官===max?'官杀':'食伤'));
        }
      } else if(str.score>=60){
        // 身极旺 → 专旺格
        out.type='从强格';
        out.main='专旺格('+dw+')';
        out.grade='A';
        out.detail.push('日主极旺，五行专一');
      }
    }

    // ③ 评级：是否破格
    if(out.main && out.type==='正格'){
      // 有相神护卫 → A；有破坏 → C
      out.grade='B';
    }

    return out;
  }

  /* ——— 5. 十神质量评估（有根/透出/被破） ——— */
  function tenGodQuality(b, ss){
    const dg=b.D.g;
    const allG=[b.Y.g,b.M.g,b.H.g];
    const allZ=[b.Y.z,b.M.z,b.D.z,b.H.z];
    const result={};
    const tenGods=['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'];

    tenGods.forEach(sg=>{
      let transparent=0, rooted=0, hidden=0;
      // 透干
      allG.forEach(g=>{ if(g && SS[dg][g]===sg) transparent++; });
      // 藏支
      allZ.forEach(z=>{
        (ZC_W[z]||[]).forEach(([cg,w])=>{
          if(SS[dg][cg]===sg) hidden+=w;
        });
      });
      rooted = transparent>0 && hidden>0.5;
      const quality = transparent*2 + hidden*1 + (rooted?1:0);
      result[sg]={transparent, hidden:Math.round(hidden*10)/10, rooted, quality:Math.round(quality*10)/10};
    });
    return result;
  }

  /* ——— 6. 干支互动：合、冲、刑、害、会 ——— */
  function interactions(b){
    const gz=[b.Y,b.M,b.D,b.H];
    const labels=['年','月','日','时'];
    const out={gan_he:[],zhi_he:[],zhi_chong:[],zhi_xing:[],zhi_hai:[],san_he:[],san_hui:[]};

    // 天干五合
    const ganHe={甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      if(ganHe[gz[i].g]===gz[j].g) out.gan_he.push({a:labels[i]+gz[i].g,b:labels[j]+gz[j].g});
    }

    // 地支六合
    const zhiHe={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    // 地支六冲
    const zhiChong={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    // 地支相害
    const zhiHai={子:'未',未:'子',丑:'午',午:'丑',寅:'巳',巳:'寅',卯:'辰',辰:'卯',申:'亥',亥:'申',酉:'戌',戌:'酉'};
    // 地支相刑（不含三刑）
    const zhiXing=[['寅','巳'],['巳','申'],['申','寅'],['丑','戌'],['戌','未'],['未','丑'],['子','卯']];
    const ziXing=['辰','午','酉','亥']; // 自刑

    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      const a=gz[i].z, c=gz[j].z;
      if(zhiHe[a]===c) out.zhi_he.push({a:labels[i]+a,b:labels[j]+c});
      if(zhiChong[a]===c) out.zhi_chong.push({a:labels[i]+a,b:labels[j]+c});
      if(zhiHai[a]===c) out.zhi_hai.push({a:labels[i]+a,b:labels[j]+c});
      if(zhiXing.some(p=>(p[0]===a&&p[1]===c)||(p[0]===c&&p[1]===a))) out.zhi_xing.push({a:labels[i]+a,b:labels[j]+c});
    }
    // 自刑
    const zhCount={};
    [b.Y.z,b.M.z,b.D.z,b.H.z].forEach(z=>{zhCount[z]=(zhCount[z]||0)+1});
    ziXing.forEach(z=>{ if(zhCount[z]>=2) out.zhi_xing.push({a:z,b:z,self:1}); });

    // 三合
    const sanHe=[['申','子','辰','水'],['亥','卯','未','木'],['寅','午','戌','火'],['巳','酉','丑','金']];
    sanHe.forEach(([a,b1,c,wx])=>{
      const has=[a,b1,c].filter(x=>zhCount[x]);
      if(has.length===3) out.san_he.push({zhi:a+b1+c,wx,full:1});
      else if(has.length===2) out.san_he.push({zhi:has.join(''),wx,full:0,half:1});
    });
    // 三会
    const sanHui=[['寅','卯','辰','木'],['巳','午','未','火'],['申','酉','戌','金'],['亥','子','丑','水']];
    sanHui.forEach(([a,b1,c,wx])=>{
      const has=[a,b1,c].filter(x=>zhCount[x]);
      if(has.length===3) out.san_hui.push({zhi:a+b1+c,wx});
    });

    return out;
  }

  /* ——— 7. 大运/流年高级评分（-100~100） ——— */
  function pillarScore(b, str, ys, gz){
    // gz: {g,z}
    if(!gz||!gz.g||!gz.z)return{score:0,reasons:[]};
    const dg=b.D.g, dw=str.dw;
    const ganWx=GW[gz.g], zhiWx=ZW[gz.z];
    let score=0;
    const reasons=[];

    // 天干层面
    if(ganWx===ys.primary){score+=30;reasons.push('天干为主用神'+ys.primary);}
    else if(ys.secondary&&ganWx===ys.secondary){score+=18;reasons.push('天干为次用神');}
    else if(str.strong){
      if(ganWx===KE[dw]){score+=15;reasons.push('财耗身（身旺喜财）');}
      else if(ganWx===SH[dw]){score+=12;reasons.push('食伤泄秀');}
      else if(ganWx===BK[dw]){score+=10;reasons.push('官杀制身');}
      else if(ganWx===BS[dw]){score-=15;reasons.push('印生身（身旺忌印）');}
      else if(ganWx===dw){score-=18;reasons.push('比劫帮身（身旺忌比劫）');}
    }else{
      if(ganWx===BS[dw]){score+=18;reasons.push('印星生身');}
      else if(ganWx===dw){score+=12;reasons.push('比劫帮身');}
      else if(ganWx===BK[dw]){score-=22;reasons.push('官杀克身（身弱大忌）');}
      else if(ganWx===KE[dw]){score-=12;reasons.push('财耗身（身弱难担）');}
      else if(ganWx===SH[dw]){score-=10;reasons.push('食伤泄气');}
    }

    // 地支层面（藏干加权）
    (ZC_W[gz.z]||[]).forEach(([cg,w])=>{
      const cw=GW[cg];
      if(cw===ys.primary)score+=15*w;
      else if(ys.secondary&&cw===ys.secondary)score+=8*w;
      else if(str.strong){
        if(cw===KE[dw])score+=8*w;
        else if(cw===dw)score-=10*w;
      }else{
        if(cw===BS[dw])score+=10*w;
        else if(cw===BK[dw])score-=12*w;
      }
    });

    // 刑冲（与日支、月支）
    const chongMap={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    if(chongMap[gz.z]===b.D.z){score-=15;reasons.push('冲日支（变动·健康注意）');}
    if(chongMap[gz.z]===b.M.z){score-=10;reasons.push('冲月支（事业·家庭变化）');}
    if(gz.z===b.Y.z){score-=5;reasons.push('伏吟年支（本命之年）');}

    // 天克地冲（大忌）
    const ganChong={甲:'庚',乙:'辛',丙:'壬',丁:'癸',戊:'甲',己:'乙',庚:'丙',辛:'丁',壬:'戊',癸:'己'};
    if(ganChong[gz.g]===b.D.g && chongMap[gz.z]===b.D.z){
      score-=25;reasons.push('天克地冲日柱（重大变动）');
    }

    score=Math.max(-100,Math.min(100,Math.round(score)));
    return{score,reasons,label: score>=60?'大吉':score>=30?'吉':score>=10?'平稳偏吉':score>=-10?'平':score>=-30?'平稳偏凶':score>=-60?'凶':'大凶'};
  }

  /* ——— 8. 流年事件类型预测 ——— */
  function yearEvents(b, dg, str, gz, dyGz){
    if(!gz)return[];
    const events=[];
    const lnSS=SS[dg][gz.g]||'';
    const dySS=dyGz?(SS[dg][dyGz.g]||''):'';
    const chongMap={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    const heMap={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};

    // 十神事件
    if(lnSS==='正官'||lnSS==='七杀'){
      events.push({type:'事业',tag:str.strong?'升职/承担':'压力/受挫',weight:8});
    }
    if(lnSS==='正财'||lnSS==='偏财'){
      events.push({type:'财富',tag:str.strong?'进财机会':'破财/操劳',weight:8});
    }
    if(lnSS==='食神'||lnSS==='伤官'){
      events.push({type:'表达',tag:'创作/才华显露/子女',weight:6});
    }
    if(lnSS==='正印'||lnSS==='偏印'){
      events.push({type:'学习',tag:'进修/贵人/文书',weight:6});
    }
    if(lnSS==='比肩'||lnSS==='劫财'){
      events.push({type:'人际',tag:'合作/竞争/争财',weight:5});
    }

    // 配偶星动 → 感情事件
    const spouseStar = (b.D.gi%2===0)?'正财':'正官'; // 阳干以正财为妻，阴干以正官为夫
    if(lnSS===spouseStar || lnSS===(b.D.gi%2===0?'偏财':'七杀')){
      events.push({type:'感情',tag:'配偶星到位（婚恋机遇）',weight:9});
    }
    // 配偶宫(日支)被冲合
    if(chongMap[gz.z]===b.D.z) events.push({type:'感情',tag:'配偶宫被冲（关系动荡）',weight:7});
    if(heMap[gz.z]===b.D.z) events.push({type:'感情',tag:'配偶宫逢合（关系升温）',weight:7});

    // 岁运并临
    if(dyGz&&dyGz.g===gz.g&&dyGz.z===gz.z){
      events.push({type:'变动',tag:'岁运并临（人生关键节点·吉凶皆烈）',weight:10});
    }

    return events.sort((a,b)=>b.weight-a.weight);
  }

  /* ——— 9. 综合命局质量评级 ——— */
  function lifeGrade(str, yong, pat, ints){
    let g=60;
    // 中和最佳
    if(str.label==='中和'||str.label==='中和偏旺')g+=8;
    else if(str.extreme) g+= pat.type!=='正格' ? 12 : -8; // 成从/专旺则吉，半生不熟则凶
    // 用神有力
    if(yong.candidates[yong.primary]&&yong.candidates[yong.primary].score>=40)g+=8;
    // 格局成立
    if(pat.grade==='A')g+=12;
    else if(pat.grade==='B')g+=4;
    // 互动：合多吉，冲刑多凶（适度反而灵动）
    g += Math.min(ints.zhi_he.length*3,9);
    g += ints.san_he.filter(x=>x.full).length*5;
    g -= Math.min(ints.zhi_chong.length*4,12);
    g -= Math.min(ints.zhi_xing.length*3,9);

    g=Math.max(20,Math.min(95,Math.round(g)));
    const tier= g>=85?'上上':g>=75?'上中':g>=65?'中上':g>=55?'中中':g>=45?'中下':'下中';
    return{score:g, tier};
  }

  /* ——— 主入口：一次计算所有派生量 ——— */
  function compute(b, ss){
    const str = strength(b);
    const th  = tiaoHou(b);
    const yong= yongShen(b, str, th);
    const pat = pattern(b, ss, str);
    const tgq = tenGodQuality(b, ss);
    const ints= interactions(b);
    const life= lifeGrade(str, yong, pat, ints);
    return{
      strength:str,
      tiaoHou:th,
      yongShen:yong,
      pattern:pat,
      tenGodQuality:tgq,
      interactions:ints,
      lifeGrade:life,
      // 暴露评分函数供大运/流年调用
      pillarScore:(gz)=>pillarScore(b,str,yong,gz),
      yearEvents:(gz,dyGz)=>yearEvents(b,b.D.g,str,gz,dyGz)
    };
  }

  return{ compute, pillarScore, yearEvents, _const:{ZC_W,CS_W,TIAO_HOU,W_TABLE} };
})();

export { TJX };
