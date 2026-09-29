/**
 * Glossary interaction boundary.
 *
 * The vocabulary is shared with the AI layer through window.__TJ_GLOSSARY__.
 * Keeping selection, popover and dock behavior together prevents report
 * rendering from owning user-interaction state.
 */

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
    if(el.dataset.proWrapped || !el.parentNode)return;
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
    if(wrap.parentNode)wrap.parentNode.insertBefore(btn,wrap);
  });
}

function enrichBeginnerContent(root){annotateGlossary(root);wrapProCollapsibles(root);}


export {
  GLOSSARY,
  enrichBeginnerContent,
  installSelectionGloss,
  resetGlossaryState,
  showGlossPop
};
