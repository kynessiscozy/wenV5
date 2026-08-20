import { CURR_YEAR, DZ } from '../engines/shared.js';
import { TJ } from '../state/tj.js';
import { getCtx } from '../state/context.js';
import { KB } from './kb.js';

export function extractIntents(q){const ints=[];if(/事业|工作|职业|升职|跳槽|创业|职场|领导|下属|管理|项目|裁员|被裁|优化|失业|岗位取消|裁撤|PIP/i.test(q))ints.push('事业');if(/感情|婚姻|爱情|对象|桃花|另一半|配偶|分手|复合|结婚|离婚|恋爱|异性|缘分|正缘/i.test(q))ints.push('感情');if(/财|钱|投资|收入|赚钱|股|基金|理财|薪水|工资|经济|负债|储蓄|消费|开支/i.test(q))ints.push('财运');if(/健康|身体|病|养生|疾病|医院|手术|失眠|精神|体质|锻炼|调养/i.test(q))ints.push('健康');if(/学业|考试|考研|留学|读书|学校|成绩|论文|面试|升学|考证|进修/i.test(q))ints.push('学业');if(/搬家|买房|装修|住|房产|租房|风水|方位|城市|出国|迁移|出行|旅途/i.test(q))ints.push('居住');if(!ints.length)ints.push('综合');return ints;}

/* ============================================================
   AI 搜索引擎
   ============================================================ */
export const KBSearch={
  // Levenshtein 距离归一化为 0~1 的相似度
  similar(a,b){
    a=String(a||'').toLowerCase();b=String(b||'').toLowerCase();
    if(!a||!b)return 0;
    if(a===b)return 1;
    if(a.includes(b)||b.includes(a))return 0.8;
    const m=a.length,n=b.length;
    if(Math.abs(m-n)>Math.max(m,n)*0.6)return 0;
    const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));
    for(let i=0;i<=m;i++)dp[i][0]=i;
    for(let j=0;j<=n;j++)dp[0][j]=j;
    for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
      dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
    }
    return 1-dp[m][n]/Math.max(m,n);
  },
  search(q,topK){
    topK=topK||3;
    const ql=(q||'').toLowerCase().trim();
    if(!ql)return[];
    const intents=(typeof extractIntents==='function')?extractIntents(q):[];
    const scored=KB.faqs.map(f=>{
      let sc=0;
      // 关键词命中（每词 +5）
      (f.kw||[]).forEach(k=>{if(ql.includes(k.toLowerCase()))sc+=5;});
      // 意图命中 +6
      if(intents.includes(f.intent))sc+=6;
      // 标题相似度（最高 8 分）
      sc+=this.similar(ql,f.q)*8;
      // 标题包含关键词时再加成
      if(ql.length>=2&&f.q.toLowerCase().includes(ql.slice(0,2)))sc+=2;
      return{f,sc};
    }).filter(x=>x.sc>2.5).sort((a,b)=>b.sc-a.sc).slice(0,topK);
    return scored;
  },
  // 联想：用于输入框实时下拉（前 N 条）
  suggest(q,topK){
    topK=topK||6;
    if(!q||q.length<1)return KB.faqs.slice(0,topK);
    return this.search(q,topK).map(x=>x.f);
  },
  // 按意图筛选（chips 分类用）
  byIntent(intent){
    return KB.faqs.filter(f=>f.intent===intent);
  },
  // 术语检索：取「最长匹配」，避免「食神格」被「食神」抢先命中；
  // 同时并入报告用的 GLOSSARY（两份词表此前各自维护、已经漂移）。
  findTerm(q){
    const ql=(q||'').trim();
    if(!ql)return null;
    const pool=KB.terms.slice();
    const G=(typeof window!=='undefined'&&window.__TJ_GLOSSARY__)||null;
    if(G)Object.keys(G).forEach(k=>{
      if(!pool.some(t=>t.t===k))pool.push({t:k,d:G[k],see:[]});
    });
    let best=null;
    pool.forEach(t=>{
      if(ql.includes(t.t)){
        if(!best||t.t.length>best.t.length)best=t;
      }
    });
    if(best)return best;
    return pool.find(t=>this.similar(ql,t.t)>0.7)||null;
  }
};

/* ============================================================
   智能回答（优先 KB → 命中则直出，未命中走 API/fallback）
   ============================================================ */
export function smartAnswer(q,ctx){
  if(!ctx)ctx=getCtx();if(!ctx)return null;
  // 1) 术语命中
  const term=KBSearch.findTerm(q);
  // 原本用 q.length<=10 做门槛，导致「食神格是什么意思？」(11字) 落到
  // 模糊 FAQ 匹配上，答非所问。改为看提问意图。
  const ASK_MEANING=/(是什么|什么意思|怎么理解|指的是|啥意思|如何理解|怎么看)/;
  // 只有「短问句」才走词典。带命盘数据的长提问（如「我的四柱是庚午…这组八字
  // 说明我是什么样的人？」）虽然含「是什么」，但用户要的是解读而不是词条释义，
  // 必须交给 AI/兜底，否则会退化成查字典。
  const isTermLookup = term && q.length<=10
    || (term && q.length<=24 && ASK_MEANING.test(q) && !/我的|我是|我现在|请解释|为什么/.test(q));
  if(isTermLookup){
    const links=(term.see||[]).map(k=>KB.routes[k]).filter(Boolean);
    return{
      kind:'term',
      title:term.t,
      sections:[{title:'释义',content:term.d}],
      links,
      related:[]
    };
  }
  // 2) FAQ 命中（高置信）
  const hits=KBSearch.search(q,3);
  // 门槛从 8 提到 12：实测「食神格是什么意思？」会以 8.4 分错配到
  // 「我最近为什么压力大？」。宁可交给 AI，也不要给出无关答案。
  if(hits.length&&hits[0].sc>=12){
    const f=hits[0].f;
    let lines;
    try{lines=f.answer(ctx);}catch(e){lines=['信息计算异常','','',''];}
    const route=KB.routes[f.anchor];
    return{
      kind:'faq',
      title:f.q,
      sections:[
        {title:'结论',content:lines[0]||'-'},
        {title:'命理原因',content:lines[1]||'-'},
        {title:'当前阶段',content:lines[2]||'-'},
        {title:'行动建议',content:lines[3]||'-'}
      ],
      links:route?[route]:[],
      related:(f.related||[]).map(rid=>KB.faqs.find(x=>x.id===rid)).filter(Boolean),
      confidence:hits[0].sc
    };
  }
  return null;
}


export function buildBaziContext(d){
  // d 即 ctx；按年龄严格定位，杜绝"兜底取首段"
  const b=d.b;
  const cDy=d.cDy||TJ.findDaYun(d.dy,d.age);
  const cLn=d.cLn||TJ.findLiuNian(d.ln,CURR_YEAR);
  const cLm=d.cLm||TJ.findLiuYue(d.liuyue);
  const dySS=cDy?TJ.ssOf(d.dg,cDy.g):'-';
  const lnSS=cLn?TJ.ssOf(d.dg,cLn.g):'-';
  const lmSS=cLm?TJ.ssOf(d.dg,cLm.gz.charAt(0)):'-';
  const lines=[
    `【四柱八字】${b.Y.g}${b.Y.z}年 ${b.M.g}${b.M.z}月 ${b.D.g}${b.D.z}日 ${b.H.g}${b.H.z}时`,
    `【性别 / 乾坤】${d.gen==='male'?'男 / 乾造':'女 / 坤造'}　出生地：${d.city?d.city.n:'未知'}　当前${d.age}岁`,
    `【日主】${d.dg}（${d.wx.dw}），${d.wx.st?'身旺':'身弱'}`,
    `【用神 / 喜神】${d.wx.ys} / ${d.wx.xs}　【忌神】${d.wx.KE[d.wx.dw]||'-'}`,
    `【格局】${d.pa&&d.pa.length?d.pa.join('、'):'普通格'}`,
    `【五行权重】木${d.wx.c['木'].toFixed(1)} 火${d.wx.c['火'].toFixed(1)} 土${d.wx.c['土'].toFixed(1)} 金${d.wx.c['金'].toFixed(1)} 水${d.wx.c['水'].toFixed(1)}（最旺:${d.wx.s} 最弱:${d.wx.w}）`,
    `【生肖 / 纳音】${b.sx}　${b.ny}`,
    `【神煞】${d.shensha&&d.shensha.length?d.shensha.map(s=>s.n+'('+s.v+')').join(' '):'无'}`,
    d.zw&&d.zw.ps?`【紫微斗数】命宫${d.zw.mingGongZhi!=null?(DZ[d.zw.mingGongZhi]||d.zw.mingGongZhi):'-'}（${(d.zw.ps[d.zw.mingGongZhi]?.m||[]).join('、')||'无主星'}），身宫${d.zw.bodyGongZhi!=null?(DZ[d.zw.bodyGongZhi]||d.zw.bodyGongZhi):'-'}（${(d.zw.ps[d.zw.bodyGongZhi]?.m||[]).join('、')||'借对宫'}）`:'',
    d.qm&&d.qm.ps?`【奇门遁甲】${d.qm.yangDun?'阳遁':'阴遁'}${d.qm.ju}局；开门${(d.qm.ps.find(x=>x.d==='开门')||{}).p||'-'}；生门${(d.qm.ps.find(x=>x.d==='生门')||{}).p||'-'}；值符${(d.qm.ps.find(x=>x.g==='值符')||{}).p||'-'}`:'',
    d.mh?`【梅花易数】本卦${d.mh.benName||'-'}（${d.mh.ug||'-'} / ${d.mh.lg||'-'}）；${d.mh.cl||'-'}爻动；体卦${d.mh.ti||'-'}（${d.mh.tiWx}）用卦${d.mh.yong||'-'}（${d.mh.yongWx}）；体用${d.mh.tyRel?.label||'-'}；互卦${d.mh.huName||'-'}；变卦${d.mh.bianName||'-'}（${d.mh.mu||'-'} / ${d.mh.ml||'-'}）`:'',
    cDy?`【当前大运】${cDy.g}${cDy.z}（${cDy.as}~${cDy.ae}岁，${cDy.ys}~${cDy.ye}年），大运十神：${dySS}`:'',
    cLn?`【${CURR_YEAR}流年】${cLn.g}${cLn.z} ${cLn.sx}年，流年十神：${lnSS}`:'',
    cLm?`【当前流月】${cLm.name} ${cLm.gz}（${cLm.jq}），流月十神：${lmSS}`:'',
    `【${CURR_YEAR}运势评分】事业${d.cs} 财富${d.ws} 感情${d.ls} 健康${d.hs}`,
    d.liuyue?`【${CURR_YEAR}流月概览】`+d.liuyue.map(m=>m.name+':'+m.gz).join(' '):'',
    /* —— TJX 精算内核派生 —— */
    d.tjx?`【精算·旺衰】${d.tjx.strength.label}（综合分${d.tjx.strength.score}：得令${d.tjx.strength.deLing}+得地${Math.round(d.tjx.strength.deDi)}+得势${d.tjx.strength.deShi}）`:'',
    d.tjx&&d.tjx.tiaoHou?`【精算·调候】月令${b.M.z}，需${d.tjx.tiaoHou.primary}调候，次${d.tjx.tiaoHou.secondary}`:'',
    d.tjx?`【精算·用神】主用「${d.tjx.yongShen.primary}」+次用「${d.tjx.yongShen.secondary||'-'}」（依据：${(d.tjx.yongShen.reasons||[]).slice(0,2).join('；')}）`:'',
    d.tjx?`【精算·格局】${d.tjx.pattern.main||'-'}（${d.tjx.pattern.type}·评级${d.tjx.pattern.grade}）${d.tjx.pattern.detail.join('；')}`:'',
    d.tjx?`【精算·命局质量】${d.tjx.lifeGrade.tier}（${d.tjx.lifeGrade.score}分）`:'',
    d.tjx&&d.tjx.dyScore?`【精算·大运评分】${d.tjx.dyScore.score}（${d.tjx.dyScore.label}）—— ${(d.tjx.dyScore.reasons||[]).slice(0,3).join('；')}`:'',
    d.tjx&&d.tjx.lnScore?`【精算·流年评分】${d.tjx.lnScore.score}（${d.tjx.lnScore.label}）—— ${(d.tjx.lnScore.reasons||[]).slice(0,3).join('；')}`:'',
    d.tjx&&d.tjx.lnEvents&&d.tjx.lnEvents.length?`【精算·流年事件类型】${d.tjx.lnEvents.slice(0,5).map(e=>e.type+':'+e.tag).join(' / ')}`:'',
    d.tjx?(function(){
      const i=d.tjx.interactions;
      const arr=[];
      if(i.gan_he.length)arr.push('天干合:'+i.gan_he.map(x=>x.a+'-'+x.b).join(','));
      if(i.zhi_he.length)arr.push('地支合:'+i.zhi_he.map(x=>x.a+'-'+x.b).join(','));
      if(i.zhi_chong.length)arr.push('地支冲:'+i.zhi_chong.map(x=>x.a+'-'+x.b).join(','));
      if(i.zhi_xing.length)arr.push('地支刑:'+i.zhi_xing.map(x=>x.a+'-'+x.b).join(','));
      if(i.san_he.length)arr.push('三合:'+i.san_he.map(x=>x.zhi+'('+x.wx+(x.full?'·全':'·半')+')').join(','));
      if(i.san_hui.length)arr.push('三会:'+i.san_hui.map(x=>x.zhi+'('+x.wx+')').join(','));
      return arr.length?'【精算·干支互动】'+arr.join(' | '):'';
    })():''
  ];
  return lines.filter(Boolean).join('\n');
}
