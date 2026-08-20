import { CURR_YEAR, GW, DZ } from '../engines/shared.js';
import { TJ } from '../state/tj.js';
import { getLayoffAstroRisk } from './risk.js';

/* ============================================================
   AI 人生顾问 · 信息库 KB（结构化知识，便于检索+跳转）
   ----
   FAQ 字段：
     id      唯一编号
     q       标准问题
     kw      关键词（用于模糊命中）
     intent  意图分类（事业/财富/感情/健康/学业/居住/玄学/综合）
     anchor  命中后跳转锚点 {sec, card}  sec ∈ {s-ming,s-yun,s-rel,s-adv}
     answer  动态答案函数(ctx) → 四段式字符串
     related 相关 FAQ id 列表
   ============================================================ */
export const KB={
  routes:{
    bazi:        {sec:'s-ming',card:'bazi',     name:'四柱八字'},
    wuxing:      {sec:'s-ming',card:'wuxing',   name:'五行能量'},
    persona:     {sec:'s-ming',card:'persona',  name:'人格画像'},
    ziwei:       {sec:'s-ming',card:'ziwei',    name:'紫微斗数'},
    qimen:       {sec:'s-ming',card:'qimen',    name:'奇门遁甲'},
    meihua:      {sec:'s-ming',card:'meihua',   name:'梅花易数'},
    timeline:    {sec:'s-ming',card:'timeline', name:'人生时间线'},
    trend:       {sec:'s-yun', card:'trend',    name:'年度核心趋势'},
    focus:       {sec:'s-yun', card:'focus',    name:'当下关注'},
    monthly:     {sec:'s-yun', card:'focus',    name:'本月提醒',  sub:'monthly'},
    risk:        {sec:'s-yun', card:'focus',    name:'风险预警',  sub:'risk'},
    health:      {sec:'s-yun', card:'focus',    name:'健康调养',  sub:'health'},
    dayun:       {sec:'s-yun', card:'dayun',    name:'大运时间轴'},
    liuyue:      {sec:'s-yun', card:'liuyue',   name:'流月详解'},
    loveMode:    {sec:'s-rel', card:'loveMode', name:'感情模式'},
    loveMatch:   {sec:'s-rel', card:'loveMatch',name:'适合对象'},
    loveRisk:    {sec:'s-rel', card:'loveRisk', name:'关系风险'},
    relAi:       {sec:'s-rel', card:'relAi',    name:'八字合盘'},
    layoff:     {sec:'s-rel', card:'layoffRisk',name:'裁员风险检测'},
    todayAdv:    {sec:'s-adv', card:'todayAdv', name:'今日建议'},
    daySign:     {sec:'s-adv', card:'daySign',  name:'今日日签'}
  },
  // 术语词典（点击解释，可直接出条目）
  terms:[
    {t:'用神',  d:'命局中最能平衡日主、补救失衡的五行。用神入运则顺。',  see:['wuxing','timeline']},
    {t:'喜神',  d:'辅助用神、对命主有利的五行，仅次于用神。',           see:['wuxing']},
    {t:'忌神',  d:'与用神相克、削弱命主的五行，运行此五行宜守不宜攻。',  see:['wuxing','risk']},
    {t:'日主',  d:'出生日的天干，代表命主本人的本质属性。',             see:['bazi','persona']},
    {t:'十神',  d:'其他天干与日主的生克关系，分比劫/食伤/财官/印枭。',  see:['bazi','dayun']},
    {t:'大运',  d:'每十年一变的运程，由月柱推演，影响人生中长期走势。', see:['dayun','timeline']},
    {t:'流年',  d:'每年的天干地支组合，是当年运势的"短期主因"。',       see:['trend','liuyue']},
    {t:'流月',  d:'每月的干支，决定该月主要顺逆与节气节点。',           see:['liuyue','monthly']},
    {t:'纳音',  d:'年柱六十甲子对应的五行别名，主大方向气质。',         see:['bazi']},
    {t:'神煞',  d:'桃花/驿马/天乙/华盖/魁罡等吉凶星，标注命局特征。',  see:['bazi']},
    {t:'桃花',  d:'人缘与异性缘之星，旺则魅力强，须警惕烂桃花。',       see:['loveMode','loveMatch']},
    {t:'驿马',  d:'变动、远行、奔波之星，逢之多有迁移机会。',           see:['risk']},
    {t:'华盖',  d:'孤独、艺术、玄学之星，思考者气质。',                 see:['persona']},
    {t:'魁罡',  d:'庚辰/庚戌/壬辰/戊戌四日，主刚烈聪明。',              see:['persona']},
    {t:'真太阳时',d:'按出生地经度精算的太阳时，比北京时间更准。',       see:['bazi']},
    {t:'身旺',  d:'日主得令、得地、得势，能担财官，宜主动出击。',        see:['persona','trend']},
    {t:'身弱',  d:'日主无力，宜印比扶身，财官为忌时不可贪。',           see:['persona','trend']},
    {t:'本命年',d:'流年地支与年柱地支相同的年份，宜守不宜攻。',         see:['timeline']},
    {t:'冲太岁',d:'流年地支冲本命年支，主变动、动荡。',                 see:['risk']},
    {t:'空亡',  d:'日柱旬中所缺的两个地支，主漂泊、精神空虚。',         see:['bazi']},
    {t:'紫微斗数',d:'以十二宫与星曜组合观察人生不同领域，命宫看底色，身宫看后天用力方向。', see:['ziwei']},
    {t:'奇门遁甲',d:'以九宫、八门、九星、八神观察当下局势，适合看时机、入口与行动取舍。', see:['qimen']},
    {t:'梅花易数',d:'以本卦、动爻、变卦观察事情变化，适合聚焦具体问题的趋势参考。', see:['meihua']}
  ],
  // FAQ 库
  faqs:[
    // —— 事业 ——
    {id:'c1', q:'我适合什么行业？', kw:['行业','职业','工作','干什么','适合什么'], intent:'事业', anchor:'persona',
      answer:(d)=>{
        const wx=d.wx.dw, ys=d.wx.ys;
        const mp={木:'教育/文创/园林/设计/木材/出版',火:'传媒/演艺/餐饮/能源/广告/电子',土:'地产/建材/农业/物流/陶艺/医疗',金:'金融/法律/机械/IT/珠宝/汽车',水:'贸易/物流/旅游/海运/咨询/科研'};
        return [
          `日主属${wx}，先天气场偏向${mp[wx].split('/').slice(0,2).join('与')}类行业。`,
          `用神为${ys}，所以${mp[ys]}类工作能助你顺势上升。`,
          `避开过于${d.wx.KE[wx]}属性的领域（容易耗损精神）。`,
          `结合当前大运${d.cDy.g}${d.cDy.z}（十神${d.cDySS}），${d.cDySS.includes('官')?'宜在大组织内争取上升':d.cDySS.includes('财')?'适合做销售/客户/项目':d.cDySS.includes('印')?'适合做研究/教育/顾问':'适合做内容/创意/自由职业'}。`
        ];
      }, related:['c2','c3','t1']},
    {id:'c2', q:'我适合创业吗？', kw:['创业','开公司','单干','自己干'], intent:'事业', anchor:'trend',
      answer:(d)=>{
        const ok=d.wx.st&&(d.cDySS.includes('财')||d.cDySS.includes('食')||d.cDySS.includes('伤'));
        return [
          ok?'命局支持创业，但要选对时机和合伙人。':'更适合先在大公司练内功，或采用副业验证模式。',
          `身${d.wx.st?'旺':'弱'}+大运十神${d.cDySS}：${ok?'能担风险，主动出击有回报':'当前抗风险能力不足，盲目all-in易折损'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁这步大运（${d.cDy.g}${d.cDy.z}）${ok?'是个不错的窗口':'更适合积累资源'}；${CURR_YEAR}流年${d.cLn.g}${d.cLn.z}（${d.cLnSS}）${d.cLnSS.includes('财')?'有偏财机会':'宜稳不宜攻'}。`,
          ok?'1) 现金流>梦想，先确保6个月生活费\n2) 找土/金属性的合伙人补己之短\n3) 秋季启动最佳':'1) 先用副业跑通商业模型\n2) 一年内别裸辞\n3) 加强用神'+d.wx.ys+'方位的人脉'
        ];
      }, related:['c1','f1','c5']},
    {id:'c3', q:'我适合升职还是跳槽？', kw:['升职','跳槽','换工作','跳','离职'], intent:'事业', anchor:'trend',
      answer:(d)=>{
        const go=d.lnSS.includes('官')||d.lnSS.includes('财')||d.cDySS.includes('官');
        return [
          go?'今年支持职位变动，建议主动出击。':'今年宜稳守，把当前位置做扎实。',
          `流年十神${d.lnSS}+大运十神${d.cDySS}：${go?'官财之气助力，外部贵人多':'气场偏内向，外动易受挫'}。`,
          `${CURR_YEAR}${go?'未来 3-5 个月是窗口，秋季尤佳':'建议等到明年春季再做大决策'}。`,
          go?'1) 先拿 Offer 再离职，杜绝裸辞\n2) 谈薪资时要硬，今年值\n3) 多见行业前辈':'1) 把手上项目做出代表作\n2) 多向直属上级表态\n3) 副业积累备用方向'
        ];
      }, related:['c2','c4']},
    {id:'c4', q:'我和领导关系怎样？', kw:['领导','上司','老板','上级','上面'], intent:'事业', anchor:'persona',
      answer:(d)=>{
        const has=d.ss.yg.includes('官')||d.ss.mg.includes('官');
        return [
          has?'命中带官星，与上级缘分较深，但需注意尊卑。':'命中官星不显，靠业绩与人品赢得上级认可更稳。',
          `日主${d.dg}（${d.wx.dw}），${d.wx.st?'身旺需收敛锋芒':'身弱宜借力上位'}。`,
          `当前流年${d.cLn.g}${d.cLn.z}（${d.lnSS}）${d.lnSS.includes('官')?'与上级互动密集':'更适合做事而非做关系'}。`,
          '1) 每周主动汇报进度\n2) 别在上级面前说同事坏话\n3) 重要决策前征询意见'
        ];
      }, related:['c3','c1']},
    {id:'c5', q:'我适合做管理还是技术？', kw:['管理','技术','带团队','一线','专业'], intent:'事业', anchor:'persona',
      answer:(d)=>{
        const mg=(d.ss.yg+d.ss.mg+d.ss.hg).includes('官')||d.wx.st;
        return [
          mg?'更适合带团队/做管理。':'更适合钻研专业/做技术高手。',
          `${d.wx.st?'身旺有担当':'身弱重精专'}，加上${d.ss.yg+'/'+d.ss.mg}的十神组合：${mg?'指挥力强':'内功深'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁大运${d.cDy.g}${d.cDy.z}：${d.cDySS.includes('官')?'是带团队的好阶段':'是专业突破期'}。`,
          mg?'1) 学一门项目管理方法论\n2) 多复盘人事冲突案例\n3) 关注下属成长':'1) 每月输出 1 篇深度文章\n2) 考行业顶级证书\n3) 在专业社群建立影响力'
        ];
      }, related:['c1','c3']},
    {id:'c6', q:'我会不会被裁员？', kw:['裁员','被裁','优化','失业','岗位取消','裁撤','PIP'], intent:'事业', anchor:'layoff',
      answer:(d)=>{
        const r=getLayoffAstroRisk(d);
        return [
          `命理职场趋势为「${r.label}」（${r.score}/100），但是否被裁更取决于公司的经营、部门与绩效信号。`,
          r.reasons.length?`趋势触发点：${r.reasons.slice(0,3).join('；')}。`:'当前大运流年未见明显职场冲击信号。',
          `重点观察期：${r.window}。请到「关系 → 裁员风险检测」补充现实信息，生成综合结果。`,
          '1) 不要仅凭命理辞职；2) 留存绩效与劳动合同资料；3) 提前更新简历并准备3—6个月应急金。'
        ];
      }, related:['c3','c4']},
    // —— 财富 ——
    {id:'f1', q:'我什么时候财运最好？', kw:['财运','发财','偏财','正财','钱','赚钱'], intent:'财富', anchor:'timeline',
      answer:(d)=>{
        const peaks=d.dy.ds.map(x=>({gz:x.g+x.z,as:x.as,ae:x.ae,ss:TJ.ssOf(d.dg,x.g)})).filter(x=>x.ss.includes('财'));
        const txt=peaks.length?peaks.map(p=>`${p.as}-${p.ae}岁（${p.gz}·${p.ss}）`).join('、'):'无明显财运大运，需靠正业积累';
        return [
          peaks.length?`你的"财运大运"集中在：${txt}。`:'命中财星不旺，宜走"稳健聚财"路线。',
          `日主${d.dg}（${d.wx.dw}），财星为${d.wx.KE[d.wx.dw]}。${d.wx.st?'身旺能担财':'身弱财为忌'}。`,
          `当前大运${d.cDy.g}${d.cDy.z}（${d.cDySS}）：${d.cDySS.includes('财')?'十年财路较活':'十年以专业积累为主'}。${CURR_YEAR}流年${d.lnSS.includes('财')?'是个不错的来财窗口':'以正财稳收为主'}。`,
          d.wx.st?'1) 用神'+d.wx.ys+'方位适合做投资\n2) 远离朋友借贷\n3) 适度配置股权/不动产':'1) 先把储蓄做厚\n2) 远离杠杆和高风险投机\n3) 副业 < 主业 1/3'
        ];
      }, related:['f2','f3','c2']},
    {id:'f2', q:'我适合投资吗？', kw:['投资','理财','基金','股票','炒股','买房','买股票'], intent:'财富', anchor:'trend',
      answer:(d)=>{
        const ok=d.lnSS.includes('财')&&d.wx.st;
        return [
          ok?'今年存在偏财机会，但忌贪心。':'今年以稳健储蓄/固收为主，远离高风险。',
          `身${d.wx.st?'旺':'弱'}+流年十神${d.lnSS}：${ok?'命局能担起波动':'抗回撤能力不足'}。`,
          `${CURR_YEAR}${ok?'农历七月前后是窗口':'全年保持现金为王'}。`,
          ok?'1) 小仓位试水，见好就收\n2) 别加杠杆\n3) 收益>30% 就分批止盈':'1) 远离加密货币、期权\n2) 把钱放货币基金或定存\n3) 不懂的不碰'
        ];
      }, related:['f1','c2']},
    {id:'f3', q:'我会不会破财？', kw:['破财','亏钱','损失','倒霉','坑','骗'], intent:'财富', anchor:'risk',
      answer:(d)=>{
        const risk=d.cDySS==='劫财'||d.lnSS==='劫财'||(d.wx.c[d.wx.KE[d.wx.dw]]/d.wx.t>0.4&&!d.wx.st);
        return [
          risk?'近期有破财信号，重点防范朋友借贷与冲动消费。':'整体财气平和，无显著破财风险。',
          `当前大运十神${d.cDySS}、流年十神${d.lnSS}：${risk?'比劫争财之象明显':'未见明显劫破信号'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁这步运${risk?'要特别注意担保、合伙、追高':'适合稳健配置'}。`,
          '1) 借钱必签纸面协议\n2) 不投自己不懂的项目\n3) 远离"稳赚"和"内部消息"'
        ];
      }, related:['f2','f1']},
    // —— 感情 ——
    {id:'l1', q:'我的正缘什么时候出现？', kw:['正缘','结婚','姻缘','另一半','对象','找对象','正桃花'], intent:'感情', anchor:'loveMode',
      answer:(d)=>{
        const star=d.gen==='male'?'财':'官';
        const peaks=d.dy.ds.map(x=>({gz:x.g+x.z,as:x.as,ae:x.ae,ss:TJ.ssOf(d.dg,x.g)})).filter(x=>x.ss.includes(star));
        return [
          peaks.length?`你的姻缘大运在：${peaks.map(p=>`${p.as}-${p.ae}岁（${p.gz}·${p.ss}）`).join('、')}。`:'命中配偶星不显，更可能在熟人引荐中遇到。',
          `${d.gen==='male'?'男命以财星为妻':'女命以官星为夫'}，五行属${d.wx.KE[d.wx.dw]}。`,
          `${CURR_YEAR}流年${d.cLn.g}${d.cLn.z}（${d.lnSS}）：${d.lnSS.includes(star)?'配偶星到位，未婚利结合':'感情节奏偏稳，宜深度经营'}。`,
          '1) 多去用神方位（'+d.wx.ys+'对应：'+({木:'东',火:'南',土:'中',金:'西',水:'北'})[d.wx.ys]+'）的活动\n2) 别在冲太岁月份做决定\n3) 朋友介绍优于陌生人社交'
        ];
      }, related:['l2','l3']},
    {id:'l2', q:'我感情的问题在哪？', kw:['感情问题','矛盾','吵架','分手','冷战','沟通'], intent:'感情', anchor:'loveRisk',
      answer:(d)=>{
        const issues=[];
        if(d.wx.st)issues.push('过于强势，容易忽略对方感受');
        if(!d.wx.st)issues.push('过度迁就，边界感弱导致委屈');
        if((d.ss.dzc||[]).some(c=>c.s.includes('伤官')))issues.push('言语锋利，沟通方式容易伤人');
        if(d.wx.c['火']>3)issues.push('情绪上头时不计后果');
        if(d.wx.c['水']>2.8)issues.push('思虑过多，容易猜疑');
        return [
          issues.length?'核心问题：'+issues[0]+'。':'命局感情场偏平和，无显著结构性问题。',
          `日主${d.dg}（${d.wx.dw}），${d.wx.st?'身旺':'身弱'}：${issues.join('、')||'相处节奏平稳'}。`,
          d.shensha&&d.shensha.some(s=>s.n==='桃花')?'命带桃花，异性缘强但需筛选。':'桃花不显，缘分多来自熟人。',
          '1) 每周固定一次"深度对话时间"\n2) 吵架不过夜，72 小时内必须复盘\n3) 给对方留独处空间'
        ];
      }, related:['l1','l3']},
    {id:'l3', q:'什么样的人适合我？', kw:['什么人适合','找什么样','理想型','配偶','另一半性格','相配'], intent:'感情', anchor:'loveMatch',
      answer:(d)=>{
        const mp={木:'稳重务实、土金属性强的人',火:'包容耐心、能给空间的人',土:'有上进心、能带来新意的人',金:'温柔细腻、善于沟通的人',水:'逻辑清晰、有安全感的人'};
        return [
          `适合${mp[d.wx.dw]}。`,
          `你日主属${d.wx.dw}，需要"${d.wx.KE[d.wx.dw]}/${d.wx.ys}"属性的人来平衡。`,
          `避开同样${d.wx.dw}属性、且性格强势的人（容易竞争）。`,
          '1) 看对方的"稳定输出能力"而非短期热情\n2) 注意对方原生家庭的财务习惯\n3) 三观大方向 > 兴趣爱好细节'
        ];
      }, related:['l1','l2']},
    {id:'l4', q:'今年桃花运怎样？', kw:['桃花','异性缘','艳遇','缘分','烂桃花'], intent:'感情', anchor:'loveMode',
      answer:(d)=>{
        const has=d.shensha&&d.shensha.some(s=>s.n==='桃花'||s.n==='红艳');
        const hot=d.lnSS.includes('财')||d.lnSS.includes('官');
        return [
          hot?'今年桃花气场旺，质量需筛选。':has?'命局桃花潜在，但需主动激发。':'桃花平淡，重在深耕已有关系。',
          `命中${has?'带桃花/红艳':'无显桃花'}+流年十神${d.lnSS}：${hot?'外缘多，但易遇虚情':'缘分浅，更利稳定关系'}。`,
          hot?'警惕已婚/异地等不稳定关系，烂桃花成本极高。':'平稳期适合修炼自身吸引力。',
          '1) 多参加 3 人以上小型聚会\n2) 别在喝酒后做承诺\n3) 已有伴侣者主动避嫌'
        ];
      }, related:['l1','l2']},
    // —— 健康 ——
    {id:'h1', q:'我身体哪里要注意？', kw:['健康','身体','病','哪里弱','器官','养生'], intent:'健康', anchor:'health',
      answer:(d)=>{
        const HM={木:'肝胆/眼睛',火:'心脏/血液',土:'脾胃/消化',金:'肺部/皮肤',水:'肾脏/泌尿'};
        return [
          `重点关注：${HM[d.wx.w]}（你最弱的五行）。`,
          `最旺五行为${d.wx.s}，对应${HM[d.wx.s]}也易过亢；最弱为${d.wx.w}，对应器官较脆弱。`,
          d.shensha&&d.shensha.some(s=>s.n==='天医')?'命带天医，对医疗/养生本能强，恢复力佳。':'无显著健康神煞，整体平衡。',
          '1) 每年做一次相关器官专项体检\n2) 饮食上多补'+d.wx.w+'属性食物\n3) 23 点前必须入睡'
        ];
      }, related:['h2','h3']},
    {id:'h2', q:'我容易失眠/焦虑吗？', kw:['失眠','焦虑','睡眠','压力','精神','烦躁','抑郁'], intent:'健康', anchor:'health',
      answer:(d)=>{
        const fy=d.wx.c['火']>2.5&&d.wx.dw!=='火';
        const sy=d.wx.c['水']>2.5&&d.wx.dw!=='水';
        return [
          (fy||sy)?'命局水火失衡，确实容易失眠/思虑过度。':'命局气场平和，睡眠问题主要来自外因。',
          fy?'火气过旺，心神难定，易半夜醒。':sy?'水气过重，思绪太多，难入睡。':'整体平衡，无显著结构性问题。',
          `${CURR_YEAR}流年${d.cLn.g}${d.cLn.z}：${d.lnSS.includes('官')?'压力指数较高，注意减压':'气场较稳'}。`,
          '1) 22 点后不刷手机\n2) 每天 30 分钟正念/冥想\n3) 卧室避免红色与电子产品'
        ];
      }, related:['h1']},
    {id:'h3', q:'我需要做什么养生？', kw:['养生','调养','保健','补','怎么调'], intent:'健康', anchor:'health',
      answer:(d)=>{
        const adv={木:'清淡饮食，少酒；多绿叶菜；舒展型运动如瑜伽',火:'清心降火，少辛辣；多苦味/红色食物；慢跑/游泳',土:'规律三餐，少甜腻；多黄色食物；散步/太极',金:'润肺，远烟尘；多白色食物（梨/百合）；呼吸训练',水:'温补，护肾；多黑色食物（黑豆/芝麻）；早睡为王'};
        return [
          `针对你日主${d.wx.dw}：${adv[d.wx.dw]}。`,
          `最弱${d.wx.w}对应${({木:'肝',火:'心',土:'脾',金:'肺',水:'肾'})[d.wx.w]}：${adv[d.wx.w]}。`,
          `用神${d.wx.ys}方位有助：${({木:'东方公园',火:'南方海岛',土:'家中静修',金:'西方山林',水:'北方湿地'})[d.wx.ys]}。`,
          '1) 节气日（立春/立夏等）调整饮食\n2) 每年体检报告横向对比\n3) 中医调理优于西药压制'
        ];
      }, related:['h1','h2']},
    // —— 学业 ——
    {id:'s1', q:'我适合继续读书/考研吗？', kw:['考研','学业','读书','考试','留学','深造','进修'], intent:'学业', anchor:'persona',
      answer:(d)=>{
        const ok=(d.ss.yg+d.ss.mg+d.ss.hg).includes('印')||d.shensha&&d.shensha.some(s=>s.n==='文昌');
        return [
          ok?'命局支持继续深造，学历能助力。':'比起学历，"实战经验+证书"对你更高效。',
          `命中${ok?'带印星/文昌':'无显文昌印星'}：${ok?'天生学术气场强':'更适合在实践中迭代'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁大运${d.cDy.g}${d.cDy.z}（${d.cDySS}）：${d.cDySS.includes('印')?'是读书黄金期':'更适合做事而非读书'}。`,
          ok?'1) 选学校优于选专业\n2) 提前 1 年准备\n3) 找导师建立学术圈':'1) 在职考最有用的硬证书\n2) 投资课程而非学位\n3) 找业内 mentor 优于读名校'
        ];
      }, related:['c1','c5']},
    // —— 居住/出行 ——
    {id:'r1', q:'我适合搬家或出国吗？', kw:['搬家','出国','移民','换城市','迁移','远行','旅行'], intent:'居住', anchor:'risk',
      answer:(d)=>{
        const has=d.shensha&&d.shensha.some(s=>s.n==='驿马');
        return [
          has?'命带驿马，迁移变动是顺势而为，宜动不宜静。':'命中驿马不显，远迁阻力较大，需做好心理准备。',
          `日主${d.dg}（${d.wx.dw}）适合的方位：${({木:'东方/东南',火:'南方',土:'西南/东北/中部',金:'西方/西北',水:'北方'})[d.wx.ys]}（用神方位）。`,
          `${CURR_YEAR}${d.lnSS.includes('财')||d.lnSS.includes('官')?'流年有利变动':'流年宜稳'}。`,
          '1) 春季启动手续最佳\n2) 选择用神方位的城市/国家\n3) 大件物品分批运输降风险'
        ];
      }, related:['c3']},
    {id:'r2', q:'什么方位对我有利？', kw:['方位','风水','朝向','方向','东南西北'], intent:'居住', anchor:'wuxing',
      answer:(d)=>{
        const dirMap={木:'东/东南',火:'南/东南',土:'中/西南/东北',金:'西/西北',水:'北/西北'};
        return [
          `你的用神方位：${dirMap[d.wx.ys]}（用神${d.wx.ys}）。`,
          '住房选用神方位的城市/区域；办公桌朝向用神方位；床头避开忌神方位。',
          `忌神为${d.wx.KE[d.wx.dw]}（方位：${dirMap[d.wx.KE[d.wx.dw]]}），尽量避开长期居住。`,
          '1) 看房时带指南针\n2) 客厅主沙发面朝用神方位\n3) 卧室色调用用神对应色'
        ];
      }, related:['r1','h3']},
    // —— 玄学/术语 ——
    {id:'t1', q:'什么是用神？', kw:['用神','喜神','忌神','什么是用神'], intent:'玄学', anchor:'wuxing',
      answer:(d)=>{
        return [
          `你的用神是 ${d.wx.ys}，喜神是 ${d.wx.xs}。用神入运则顺。`,
          `用神是命局中最能平衡日主的五行——你的日主${d.wx.dw}${d.wx.st?'偏旺，需要被克泄':'偏弱，需要被生扶'}，因此用神为${d.wx.ys}。`,
          `下一步用神大运在：${(d.dy.ds.find(x=>GW[x.g]===d.wx.ys)||{}).g||'-'}${(d.dy.ds.find(x=>GW[x.g]===d.wx.ys)||{}).z||'-'}时段。`,
          '1) 多接触用神属性的人/事/物\n2) 用神对应色为主色调\n3) 避开忌神方位长期停留'
        ];
      }, related:['t2','r2']},
    {id:'t2', q:'什么是大运？', kw:['大运','十年运','大运是什么','怎么排'], intent:'玄学', anchor:'timeline',
      answer:(d)=>{
        return [
          '大运是从月柱推演的"十年运程"，由出生节气决定起运岁数与排序方向。',
          `你 ${d.dy.sa} 岁起运，${d.dyShun?'顺':'逆'}排（基于年柱阴阳与性别）。`,
          `当前在第 ${d.cDyIdx+1} 步：${d.cDy.g}${d.cDy.z}（${d.cDy.as}~${d.cDy.ae}岁）`,
          '1) 大运比流年影响更深远\n2) 干支各主前/后五年\n3) 用神运是黄金时期'
        ];
      }, related:['t1']},
    {id:'t3', q:'什么是身旺身弱？', kw:['身旺','身弱','身强','旺衰','旺还是弱'], intent:'玄学', anchor:'persona',
      answer:(d)=>{
        return [
          `你${d.wx.st?'身旺':'身弱'}。${d.wx.st?'能担财官，宜主动出击':'宜借助印比扶身，财官为忌时不可贪'}。`,
          '身旺=日主得令/得地/得势；身弱反之。判断要看月令、地支根基、天干助力。',
          `你的日主${d.wx.dw}在月令${d.b.M.z}：${(d.wx.dw===ZW[d.b.M.z])?'得令':(d.wx.SH&&d.wx.SH[d.wx.dw]===ZW[d.b.M.z])?'得气':'失令'}。`,
          d.wx.st?'1) 适合 All-in 主业\n2) 用神为克泄之物\n3) 避免比劫之运':'1) 适合稳健蓄势\n2) 用神为印比生扶\n3) 财官旺运须借力'
        ];
      }, related:['t1','t2']},
    {id:'t4', q:'紫微斗数怎么看？', kw:['紫微','紫微斗数','命宫','身宫','十四主星','十二宫'], intent:'玄学', anchor:'ziwei',
      answer:(d)=>{
        const zw=d.zw||{},ps=zw.ps||[];
        const ming=ps[zw.mingGongZhi]||{},body=ps[zw.bodyGongZhi]||{},career=ps.find(p=>p.n==='事业宫')||{},wealth=ps.find(p=>p.n==='财帛宫')||{};
        return [
          `你的紫微盘命宫落${DZ[zw.mingGongZhi]||'-'}，命宫主星：${ming.m&&ming.m.length?ming.m.join('、'):'无主星/借对宫参看'}。`,
          `身宫落${DZ[zw.bodyGongZhi]||'-'}，身宫星曜：${body.m&&body.m.length?body.m.join('、'):'以辅星和对宫综合'}；命宫看先天气质，身宫看后天发力方向。`,
          `事业宫${career.m&&career.m.length?'见 '+career.m.join('、'):'主星不显，需看辅曜与大限'}；财帛宫${wealth.m&&wealth.m.length?'见 '+wealth.m.join('、'):'以流年与现实收入结构为主'}。`,
          '1) 先看命宫/身宫定性格与行动方式；2) 再看事业、财帛、夫妻等宫位；3) 不单凭一颗星断吉凶，要合参四柱和大运。'
        ];
      }, related:['t1','t2','t5']},
    {id:'t5', q:'奇门遁甲怎么看？', kw:['奇门','奇门遁甲','九宫','八门','九星','八神','开门','生门','值符'], intent:'玄学', anchor:'qimen',
      answer:(d)=>{
        const qm=d.qm||{},ps=qm.ps||[];
        const open=ps.find(x=>x.d==='开门')||{},sheng=ps.find(x=>x.d==='生门')||{},rest=ps.find(x=>x.d==='休门')||{},fu=ps.find(x=>x.g==='值符')||{};
        return [
          `你的奇门盘为${qm.yangDun?'阳遁':'阴遁'}${qm.ju||'-'}局，值符落${fu.p||'-'}。`,
          `开门在${open.p||'-'}，主沟通、打开局面与外部连接；生门在${sheng.p||'-'}，主增长、求财与修复。`,
          `休门在${rest.p||'-'}，适合缓冲、复盘与谈和。奇门更偏“当下局势”，要结合具体问题和时间。`,
          '1) 要行动看开门；2) 要收益看生门；3) 要修复看休门；4) 遇伤/惊/死门议题先降风险、留余地。'
        ];
      }, related:['t4','t6','g1']},
    {id:'t6', q:'梅花易数卦象怎么看？', kw:['梅花','梅花易数','卦象','本卦','变卦','动爻','上卦','下卦'], intent:'玄学', anchor:'meihua',
      answer:(d)=>{
        const mh=d.mh||{};
        return [
          `本卦为上卦${mh.ug||'-'}、下卦${mh.lg||'-'}，${mh.cl||'-'}爻动。`,
          `上卦属${mh.ue||'-'}，下卦属${mh.le||'-'}；动爻代表事情开始变化的触发点。`,
          `变卦为${mh.mu||'-'} / ${mh.ml||'-'}，可作为后续趋势参考。${mh.cl<=3?'变化多从基础、自身、近处开始':'变化多受环境、他人、远处条件牵动'}。`,
          '1) 先明确一个具体问题；2) 本卦看现状，动爻看转折，变卦看后势；3) 不用卦象替代现实证据。'
        ];
      }, related:['t4','t5','g1']},
    // —— 综合/迷茫 ——
    {id:'g1', q:'我最近为什么压力大？', kw:['压力','焦虑','瓶颈','迷茫','烦','累','低谷'], intent:'综合', anchor:'monthly',
      answer:(d)=>{
        const ke=d.wx.KE[d.wx.dw];
        const heavy=d.cDySS.includes('官')||d.lnSS.includes('官')||d.lmSS.includes('官');
        return [
          heavy?'近期官杀气重，压力指数偏高。':'气场平和，压力多来自外因或自我要求过高。',
          `当前大运${d.cDy.g}${d.cDy.z}（${d.cDySS}）+ 流年${d.cLn.g}${d.cLn.z}（${d.lnSS}）+ 流月${d.cLm?d.cLm.gz:'-'}（${d.lmSS}）：${heavy?'三层叠加，主压力与升迁并存':'平和无明显冲克'}。`,
          d.wx.c[ke]/d.wx.t>0.3?`忌神${ke}偏旺，气场易耗损。`:'忌神不旺，能量恢复较快。',
          '1) 每天 15 分钟独处时间\n2) 用神'+d.wx.ys+'相关活动可补气\n3) 周末半天彻底不接工作'
        ];
      }, related:['h2','g2']},
    {id:'g2', q:'我未来 10 年走势如何？', kw:['未来','走势','10年','发展','人生','规划'], intent:'综合', anchor:'timeline',
      answer:(d)=>{
        const next=d.dy.ds[d.cDyIdx+1];
        return [
          `你正处在第 ${d.cDyIdx+1} 步大运 ${d.cDy.g}${d.cDy.z}（${d.cDy.as}~${d.cDy.ae}岁）。`,
          `本步十神${d.cDySS}：${d.cDySS.includes('官')?'仕途权位期':d.cDySS.includes('财')?'财富积累期':d.cDySS.includes('印')?'学养贵人期':d.cDySS==='食神'?'才华享受期':d.cDySS==='伤官'?'叛逆突破期':'过渡周期'}。`,
          next?`下一步 ${next.g}${next.z}（${next.as}~${next.ae}岁），十神${TJ.ssOf(d.dg,next.g)}，主题将转向${TJ.ssOf(d.dg,next.g).includes('财')?'财富':TJ.ssOf(d.dg,next.g).includes('官')?'权位':TJ.ssOf(d.dg,next.g).includes('印')?'学养':'内省'}。`:'已进入最后阶段，宜传承与沉淀。',
          '1) 切换大运前一年开始铺垫\n2) 用神运全力推进\n3) 忌神运转守势'
        ];
      }, related:['g1','t2']}
  ]
};

