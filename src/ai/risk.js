/* —— 裁员风险检测：现实职场信号为主，命理趋势仅作低权重参考 —— */
export function getLayoffAstroRisk(d){
  if(!d||!d.b)return{score:20,label:'信息不足',reasons:[],protectors:[],window:'未来3—6个月'};
  const chong={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  const lnSS=d.lnSS||d.cLnSS||'',dySS=d.dySS||d.cDySS||'',lmSS=d.lmSS||d.cLmSS||'';
  let score=20;
  const reasons=[],protectors=[];
  if(d.cs<45){score+=16;reasons.push('年度事业评分偏低');}
  else if(d.cs<60){score+=8;reasons.push('事业势能处于守势');}
  else if(d.cs>=75){score-=7;protectors.push('年度事业势能较强');}
  if(lnSS==='七杀'){score+=11;reasons.push('流年七杀主考核与压力');}
  if(lnSS==='伤官'&&/官|杀/.test(dySS)){score+=14;reasons.push('伤官见官，易有制度或上级冲突');}
  else if(lnSS==='伤官'){score+=6;reasons.push('流年伤官，沟通与规则摩擦增多');}
  if(lnSS==='劫财'){score+=7;reasons.push('流年劫财，同岗竞争加剧');}
  if(/正印|偏印/.test(lnSS)){score-=5;protectors.push('流年印星利资源与支持');}
  if(/正官/.test(lnSS)&&d.cs>=60){score-=4;protectors.push('正官到位，利正规评价与晋升通道');}
  if(d.cLn&&chong[d.cLn.z]===d.b.M.z){score+=13;reasons.push('流年冲月柱，工作环境易变');}
  if(d.cDy&&chong[d.cDy.z]===d.b.M.z){score+=9;reasons.push('大运冲月柱，组织关系处于变动期');}
  if(d.cLn&&d.cLn.z===d.b.M.z){score+=4;reasons.push('流年伏吟月柱，职场议题被放大');}
  if(lmSS==='七杀'||lmSS==='伤官'){score+=5;reasons.push('当前流月考核或沟通压力上升');}
  if(d.tjx&&d.tjx.lnScore){
    if(d.tjx.lnScore.score<=-30){score+=11;reasons.push('精算流年分偏弱');}
    else if(d.tjx.lnScore.score<0){score+=5;reasons.push('精算流年略有阻力');}
    else if(d.tjx.lnScore.score>=30){score-=6;protectors.push('精算流年走势偏吉');}
  }
  if(/正印|偏印/.test(dySS)){score-=4;protectors.push('当前大运有印星托底');}
  score=Math.max(8,Math.min(72,Math.round(score)));
  const label=score>=58?'波动偏高':score>=40?'需要留意':score>=25?'总体平稳':'低波动';
  const month=d.cLm&&d.cLm.name?d.cLm.name.replace(/\(.+?\)/g,''):'';
  return{score,label,reasons,protectors,window:month?`${month}起未来3—6个月`:'未来3—6个月'};
}
