/* ============================================================
   mbti · 人格大师（MBTI 深度测评与人格图鉴）
   ------------------------------------------------------------
   全功能 MBTI 16型人格系统：
     1. 20 题精选情境化心理学测评 + 支持已知 MBTI 快速自选
     2. 16 型人格深度档案（八维认知功能、职场优势、情感模式、盲区突破）
     3. MBTI 成熟度等级评定（Lv.1 原型觉醒 ~ Lv.4 融会贯通）
     4. 本地持久化测试历史档案（查看轨迹、演变对比、备注管理）
     5. 16 型人格全景图鉴与双人契合度速配
     6. ✦ AI 深度人格解读与多轮智能追问
     7. 生成高清 Claude 风格人格分享卡片
   ============================================================ */

import { masthead, notice, esc, attachToolAI } from './runtime.js';
import { getCtx } from '../state/context.js';
import { showToast } from '../ui/toast.js';

/* —— 16 型人格完整知识库与八维功能 —— */
export const MBTI_TYPES = [
  // —— 分析家 (NT - Analysts) ——
  {
    code: 'INTJ', name: '建筑师', enName: 'Architect',
    quadrant: 'analyst', quadrantName: '分析家', color: '#6a4c93', symbol: '♟️',
    tag: '远见卓识 · 战略架构 · 独立坚定',
    summary: '极具远见的战略家与体系建构者。你拥有穿透表象的深刻洞察力与严密的逻辑体系，习惯在行动前深谋远虑，追求长远目标的极致达成。',
    cognition: '主导 Ni (内倾直觉) · 辅助 Te (外倾思考) · 第三 Fi (内倾情感) · 劣势 Se (外倾实感)',
    strengths: ['顶级全局战略规划', '高度独立自主与自律', '逻辑严密、洞察本质', '追求卓越、执行力强'],
    blindSpots: ['对效率低下的事物缺乏耐性', '容易忽视他人情绪感受', '过度沉迷于理论而拖延当下落地', '对外界评价过于严苛'],
    career: '适合战略顾问、系统架构师、科技研发、金融量化、企业高管、数据科学家与深度学术研究。',
    love: '看重心智同频与彼此独立成长，不喜肤浅客套；一旦认定便会以极高的忠诚度和长远规划守护伴侣。',
    celebrities: ['埃隆·马斯克', '尼采', '牛顿', '克里斯托弗·诺兰'],
    bestMatches: ['ENFP', 'ENTP', 'INFJ']
  },
  {
    code: 'INTP', name: '逻辑学家', enName: 'Logician',
    quadrant: 'analyst', quadrantName: '分析家', color: '#7a5299', symbol: '🧪',
    tag: '深度思辨 · 探索真理 · 模式解构',
    summary: '思想深邃的理论家与问题解决者。你对宇宙规律、抽象模型与知识体系拥有无穷的好奇心，总能以极度客观的视角发现逻辑漏洞并提出原创解法。',
    cognition: '主导 Ti (内倾思考) · 辅助 Ne (外倾直觉) · 第三 Si (内倾实感) · 劣势 Fe (外倾情感)',
    strengths: ['极强的抽象逻辑与模式识别', '思想开放、包容新奇观点', '客观公正、不受偏见左右', '擅长攻克复杂技术难题'],
    blindSpots: ['容易陷入纯理论思考而忽视执行', '对繁琐社交与人情世故感到疲惫', '容易过度质疑与自我否定', '缺乏对日常细节的关注'],
    career: '适合算法工程师、理论物理学家、哲学学者、前沿技术探索者、系统分析师、数学家与独立创造者。',
    love: '追求智性恋与毫无压力的轻松相处，需要充足的个人精神空间；喜欢能与自己畅聊宇宙与观念的伴侣。',
    celebrities: ['爱因斯坦', '比尔·盖茨', '笛卡尔', '达尔文'],
    bestMatches: ['ENTJ', 'ENFJ', 'INFJ']
  },
  {
    code: 'ENTJ', name: '指挥官', enName: 'Commander',
    quadrant: 'analyst', quadrantName: '分析家', color: '#593d7c', symbol: '👑',
    tag: '果决领袖 · 高效推演 · 目标必达',
    summary: '天生的领导者与高效破局者。你拥有强大的意志力、大局观与决断力，擅长调动一切资源扫清障碍，带领团队将宏大愿景变为现实。',
    cognition: '主导 Te (外倾思考) · 辅助 Ni (内倾直觉) · 第三 Se (外倾实感) · 劣势 Fi (内倾情感)',
    strengths: ['卓越的领导力与号召力', '决断迅速、执行力极强', '善于整合资源与战略布局', '遇强则强的坚韧魄力'],
    blindSpots: ['容易表现得过于强势或专断', '难以容忍低效或情感化借口', '容易忽视内心真实情绪与健康', '给身边人带来较大压力'],
    career: '适合企业 CEO、创业先锋、风险投资人、管理咨询总监、政治家、法官与大型项目总指挥。',
    love: '尊重独立自强、有追求的伴侣，追求共同成长与并肩作战的强强联合；在关系中担当可靠但需多倾听。',
    celebrities: ['乔布斯', '拿破仑', '撒切尔夫人', '戈登·拉姆齐'],
    bestMatches: ['INTP', 'INFP', 'INTJ']
  },
  {
    code: 'ENTP', name: '辩论家', enName: 'Debater',
    quadrant: 'analyst', quadrantName: '分析家', color: '#885ca8', symbol: '💡',
    tag: '思维跳跃 · 敢破陈规 · 灵感喷涌',
    summary: '永不停歇的创新者与思维冒险家。你机智幽默、反应敏捷，热衷于挑战既有教条与观念碰撞，总能在未被涉足的领域发现无限可能性。',
    cognition: '主导 Ne (外倾直觉) · 辅助 Ti (内倾思考) · 第三 Fe (外倾情感) · 劣势 Si (内倾实感)',
    strengths: ['灵光乍现的原创创意', '极佳的即兴演说与辩才', '快速学习与跨界迁移能力', '不畏权威、敢于打破常规'],
    blindSpots: ['兴趣转移过快、缺乏持续落地', '有时为辩而辩容易引发不必要的人际摩擦', '厌恶例行公事与细节琐事', '容易忽视长期计划'],
    career: '适合连续创业者、广告创意总监、AI架构师、风险投资、公关策略师、媒体主理人与发明家。',
    love: '喜欢势均力敌、幽默有趣的精神互动；讨厌被管束与沉闷的生活，在相互激发灵感的关系中最为耀眼。',
    celebrities: ['达芬奇', '马克·吐温', '苏格拉底', '小罗伯特·唐尼'],
    bestMatches: ['INFJ', 'INTJ', 'ENFP']
  },

  // —— 外交家 (NF - Diplomats) ——
  {
    code: 'INFJ', name: '提倡者', enName: 'Advocate',
    quadrant: 'diplomat', quadrantName: '外交家', color: '#2a9d8f', symbol: '🕯️',
    tag: '博爱理想 · 深刻洞察 · 温暖坚定',
    summary: '罕见的理想主义者与心灵引路人。你兼具深邃的洞察力与博大的同理心，一生致力于探求生命的崇高意义，并在温和的外表下蕴藏着坚不可摧的原则底线。',
    cognition: '主导 Ni (内倾直觉) · 辅助 Fe (外倾情感) · 第三 Ti (内倾思考) · 劣势 Se (外倾实感)',
    strengths: ['极深的心灵洞察与共情力', '坚定的道德信念与使命感', '极佳的文字与艺术表达', '擅长激励与启发他人成长'],
    blindSpots: ['容易过度背负他人情绪导致内耗', '理想主义过高易对现实感到幻灭', '极度内向、容易突然关门退缩', '忽视自身躯体感受'],
    career: '适合心理学家、作家、哲学家、公益领袖、艺术治疗师、资深顾问与人本教育家。',
    love: '追求灵魂深处的全然理解与纯粹共鸣；宁缺毋滥，一旦敞开心扉便是最深情且长久的挚爱。',
    celebrities: ['荣格', '甘地', '柏拉图', '陀思妥耶夫斯基'],
    bestMatches: ['ENTP', 'ENFP', 'INTP']
  },
  {
    code: 'INFP', name: '调停者', enName: 'Mediator',
    quadrant: 'diplomat', quadrantName: '外交家', color: '#38b000', symbol: '🌸',
    tag: '真挚纯粹 · 丰富内心 · 艺术通感',
    summary: '守护本真与纯粹的心灵诗人。你拥有广袤而温柔的精神宇宙，对美、善意与真理有着天然的敏感，始终忠于内心的道德罗盘。',
    cognition: '主导 Fi (内倾情感) · 辅助 Ne (外倾直觉) · 第三 Si (内倾实感) · 劣势 Te (外倾思考)',
    strengths: ['高度的同理心与利他精神', '丰富细腻的想象力与艺术灵感', '忠于自我价值观与真实性', '善于发现每个人独特的光芒'],
    blindSpots: ['容易沉溺于情绪内耗与自我怀疑', '面对冲突倾向于逃避退缩', '对批评极其敏感', '执行落地时容易拖延'],
    career: '适合作家、插画艺术家、心理咨询师、音乐创作、非营利组织、编辑与人文社科研究。',
    love: '渴望纯粹而浪漫的童话般爱情，看重伴侣的善良与真诚；愿意为爱倾注全部的温柔，需要对方给予坚定的安全感。',
    celebrities: ['莎士比亚', '梵高', '托尔金', '村上春树'],
    bestMatches: ['ENFJ', 'ENTJ', 'INFJ']
  },
  {
    code: 'ENFJ', name: '主人公', enName: 'Protagonist',
    quadrant: 'diplomat', quadrantName: '外交家', color: '#1b9aaa', symbol: '🌟',
    tag: '热情鼓舞 · 魅力领袖 · 赋能共鸣',
    summary: '充满魅力与感染力的天生领袖。你真诚关怀他人福祉，善于发掘每个人的潜能，并能用激昂的热情将不同的人团结起来共同实现崇高愿景。',
    cognition: '主导 Fe (外倾情感) · 辅助 Ni (内倾直觉) · 第三 Se (外倾实感) · 劣势 Ti (内倾思考)',
    strengths: ['出色的共情力与公众演说才华', '极强的团队凝聚力与领导魅力', '敏锐捕捉人际需求与心理动力', '真诚热烈、乐于助人'],
    blindSpots: ['容易过度卷入他人问题而心力交瘁', '过于在意外界评价与人际和谐', '容易做出不切实际的过度承诺', '不愿面对必要的冷酷现实'],
    career: '适合教育培训导师、人力资源总监、公关发言人、社会活动家、影视导演与组织发展顾问。',
    love: '在感情中热情付出且无微不至，渴望与伴侣共同成长；追求心灵交融与相互支持的高质量关系。',
    celebrities: ['奥巴马', '马丁·路德·金', '奥普拉·温弗瑞'],
    bestMatches: ['INFP', 'ISFP', 'INTP']
  },
  {
    code: 'ENFP', name: '竞选者', enName: 'Campaigner',
    quadrant: 'diplomat', quadrantName: '外交家', color: '#52b788', symbol: '✨',
    tag: '元气活力 · 热情洋溢 · 探索无限',
    summary: '充满生命热情与无限可能性的自由灵魂。你生机勃勃、乐观开朗，总能看到事物之间的奇妙联系，并用纯粹的快乐感染身边的每一个人。',
    cognition: '主导 Ne (外倾直觉) · 辅助 Fi (内倾情感) · 第三 Te (外倾思考) · 劣势 Si (内倾实感)',
    strengths: ['极强的感染力与人际亲和力', '永不枯竭的好奇心与想象力', '善于打破僵局、营造欢乐氛围', '极具共情力与包容心'],
    blindSpots: ['容易三分钟热度、缺乏耐性收尾', '情绪起伏大、容易瞬间心累', '对琐碎细节与日常行政感到痛苦', '容易过度理想化人际关系'],
    career: '适合新媒体主理人、活动策划、创意总监、演艺主持、用户增长、心理教练与独立旅行创作。',
    love: '爱情中充满阳光、惊喜与温暖；渴望与伴侣探索世界的一切奇妙，需要足够的理解与情感共鸣。',
    celebrities: ['罗宾·威廉姆斯', '华特·迪士尼', '马克·鲁法洛'],
    bestMatches: ['INTJ', 'INFJ', 'ENTP']
  },

  // —— 守护者 (SJ - Sentinels) ——
  {
    code: 'ISTJ', name: '物流师', enName: 'Logistician',
    quadrant: 'sentinel', quadrantName: '守护者', color: '#1d3557', symbol: '📋',
    tag: '恪尽职守 · 严谨务实 · 可靠基石',
    summary: '社会的坚实基石与秩序守护者。你为人严肃认真、重诺守信，以极高的事实精准度与自律精神履行每一项承诺，是团队中最值得托付的依靠。',
    cognition: '主导 Si (内倾实感) · 辅助 Te (外倾思考) · 第三 Fi (内倾情感) · 劣势 Ne (外倾直觉)',
    strengths: ['无与伦比的责任心与执行力', '严谨细致、重视事实与数据', '高度自律、恪守规章流程', '忠诚可靠、稳如泰山'],
    blindSpots: ['抗拒突发变化与未经检验的新事物', '容易显得死板严厉、缺乏弹性', '不善于表达情感与温情', '容易给自己施加过重压力'],
    career: '适合财务审计、法务合规、质量管理、公共行政、系统运维、外科医生与精密工程制造。',
    love: '爱在踏实的行动与长久的守护中；重信守诺，追求稳定温馨的家庭生活，是极为负责任的伴侣。',
    celebrities: ['乔治·华盛顿', '巴菲特', '默克尔', '斯拉克霍姆'],
    bestMatches: ['ESFP', 'ESTP', 'ISFJ']
  },
  {
    code: 'ISFJ', name: '守卫者', enName: 'Defender',
    quadrant: 'sentinel', quadrantName: '守护者', color: '#457b9d', symbol: '🛡️',
    tag: '温厚体贴 · 默默守护 · 尽心尽责',
    summary: '最温暖的守护者与奉献者。你兼具温和体贴与坚定责任感，默默记住身边人的每一个细节与需求，用无微不至的关怀为家庭与集体撑起一片宁静港湾。',
    cognition: '主导 Si (内倾实感) · 辅助 Fe (外倾情感) · 第三 Ti (内倾思考) · 劣势 Ne (外倾直觉)',
    strengths: ['极佳的细致记忆与照料能力', '耐心温厚、极具奉献精神', '忠诚踏实、注重家庭与传统', '实践能力强、注重生活品质'],
    blindSpots: ['容易压抑自身需求而委曲求全', '难以对不合理的要求说「不」', '害怕冲突与重大变革', '容易把委屈积攒在内心深处'],
    career: '适合医疗护理、初等教育、行政管理、客户成功、社工服务、室内设计与人事保障。',
    love: '极为体贴入微，把关怀融入一蔬一饭；渴望细水长流的相伴，重视忠诚与家庭安全感。',
    celebrities: ['特蕾莎修女', '伊丽莎白二世', '凯特王妃'],
    bestMatches: ['ESFP', 'ESTP', 'ISTJ']
  },
  {
    code: 'ESTJ', name: '总经理', enName: 'Executive',
    quadrant: 'sentinel', quadrantName: '守护者', color: '#2b4162', symbol: '📊',
    tag: '铁腕执行 · 秩序统筹 · 务实高效',
    summary: '卓越的组织者与秩序捍卫者。你雷厉风行、条理分明，善于将复杂的混乱局面迅速梳理成高效的运转体系，是确保各项计划顺利落地的强力引擎。',
    cognition: '主导 Te (外倾思考) · 辅助 Si (内倾实感) · 第三 Ne (外倾直觉) · 劣势 Fi (内倾情感)',
    strengths: ['出色的统筹规划与落地推进', '重视原则与规则、公正客观', '目标导向、抗压与抗挫能力极强', '极高的办事效率与执行力'],
    blindSpots: ['容易固执己见、忽视情感因素', '缺乏对非传统创意的包容度', '要求过于严苛容易引发下属不满', '难以放松休息'],
    career: '适合运营总监、企业高管、工厂厂长、司法警务、金融管理、工程项目经理与供应链统筹。',
    love: '务实坦荡，用实实在在的物质保障与稳定未来表达爱意；看重家庭责任感与双方的契约精神。',
    celebrities: ['洛克菲勒', '亨利·福特', '希拉里·克林顿'],
    bestMatches: ['ISFP', 'ISTP', 'ESFJ']
  },
  {
    code: 'ESFJ', name: '执政官', enName: 'Consul',
    quadrant: 'sentinel', quadrantName: '守护者', color: '#3d5a80', symbol: '🤝',
    tag: '热心周到 · 人际润滑 · 凝聚合力',
    summary: '最受欢迎的大家长与人际纽带。你热情大方、体贴周到，总能敏锐察觉集体的氛围与每个人的需求，用强大的组织力与温情维系集体的和谐与繁荣。',
    cognition: '主导 Fe (外倾情感) · 辅助 Si (内倾实感) · 第三 Ne (外倾直觉) · 劣势 Ti (内倾思考)',
    strengths: ['顶级的人际交往与沟通协调才华', '极强的服务意识与集体归属感', '善于营造温馨融洽的团队氛围', '执行细致、办事可靠'],
    blindSpots: ['过分在意外界认可与社会标准', '害怕被孤立或被否定', '面对尖锐批评容易情绪化受挫', '过度干涉身边人的选择'],
    career: '适合公关接待、大型活动统筹、医患关系、社区运营、中小学教育、销售总监与行政事务。',
    love: '无微不至地照顾伴侣与家庭，重视节庆仪式感与亲友认可；渴望得到伴侣热烈的肯定与真诚反馈。',
    celebrities: ['泰勒·斯威夫特', '詹妮弗·加纳', '休·杰克曼'],
    bestMatches: ['ISFP', 'ISTP', 'ESTJ']
  },

  // —— 探险家 (SP - Explorers) ——
  {
    code: 'ISTP', name: '鉴赏家', enName: 'Virtuoso',
    quadrant: 'explorer', quadrantName: '探险家', color: '#e76f51', symbol: '🛠️',
    tag: '硬核实操 · 冷静沉着 · 解决危机',
    summary: '冷静利落的手艺人与危机拆解专家。你拥有极强的动手能力与即时应变力，行事低调不羁，善于用最精简高效的手段解决现实中的硬核问题。',
    cognition: '主导 Ti (内倾思考) · 辅助 Se (外倾实感) · 第三 Ni (内倾直觉) · 劣势 Fe (外倾情感)',
    strengths: ['顶级的实操动手与工具驾驭力', '极端危机下的冷静沉着', '讲求实效、不废话不空谈', '灵活应变、适应力极强'],
    blindSpots: ['不喜繁琐情感交流，显得疏离冷淡', '对长远枯燥规划缺乏耐性', '容易追求刺激而忽视潜在风险', '难以忍受过多规则束缚'],
    career: '适合软硬件工程师、应急救援、机械改装、极限运动员、飞行员、刑侦技术与现场指挥。',
    love: '不善言辞却会用实际行动帮你搞定一切难题；需要充足的独立自由空间，讨厌被查岗与情绪捆绑。',
    celebrities: ['克林特·伊斯特伍德', '汤姆·克鲁斯', '迈克尔·乔丹'],
    bestMatches: ['ESFJ', 'ESTJ', 'ESTP']
  },
  {
    code: 'ISFP', name: '探险家', enName: 'Adventurer',
    quadrant: 'explorer', quadrantName: '探险家', color: '#f4a261', symbol: '🎨',
    tag: '随性优雅 · 审美感知 · 活在当下',
    summary: '充满温情与审美感知的生活艺术家。你生性随和浪漫，对生活中的色彩、声音与情绪有着敏锐的触觉，热衷于以独具一格的方式探索世界的美好。',
    cognition: '主导 Fi (内倾情感) · 辅助 Se (外倾实感) · 第三 Ni (内倾直觉) · 劣势 Te (外倾思考)',
    strengths: ['极佳的审美鉴赏与艺术表现力', '包容随和、不给他人施加压力', '全心全意活在当下体验美好', '真诚善良、富有同理心'],
    blindSpots: ['缺乏长远规划与严谨理财意识', '极度厌恶冲突，容易消极回避', '容易因为批评而封闭自我', '自律性与执行韧性需加强'],
    career: '适合服装设计师、摄影师、花艺师、美学策展人、兽医、自由插画师与美妆艺术家。',
    love: '在感情中温柔纯粹，善于创造生活中的小浪漫与惊喜；需要伴侣给予充分的理解、尊重与个人空间。',
    celebrities: ['迈克尔·杰克逊', '奥黛丽·赫本', '弗里达·卡罗'],
    bestMatches: ['ESFJ', 'ESTJ', 'ENFJ']
  },
  {
    code: 'ESTP', name: '企业家', enName: 'Entrepreneur',
    quadrant: 'explorer', quadrantName: '探险家', color: '#e63946', symbol: '⚡',
    tag: '敏锐猎手 · 临场决断 · 享受挑战',
    summary: '天生的行动派与机会捕手。你充满能量、直觉敏锐，热衷于在瞬息万变的环境中快速捕捉商机与战机，敢于冒险并享受掌控局面的快感。',
    cognition: '主导 Se (外倾实感) · 辅助 Ti (内倾思考) · 第三 Fe (外倾情感) · 劣势 Ni (内倾直觉)',
    strengths: ['极其敏锐的现场观察与捕捉力', '果断决绝、敢想敢干', '强大的即兴谈判与公关魅力', '抗压能力强、不怕失败'],
    blindSpots: ['容易忽视长期风险与深层理论', '缺乏耐心，对重复性工作容易厌倦', '冲动行事容易忽视细节隐患', '情感表达略显粗糙'],
    career: '适合创业操盘手、大客户销售、证券交易员、应急谈判官、体育经纪人与娱乐传媒拓展。',
    love: '直接坦荡、充满激情与生活乐趣；带伴侣体验丰富多彩的现实世界，讨厌拐弯抹角与无病呻吟。',
    celebrities: ['丘吉尔', '麦当娜', '唐纳德·特朗普', '海明威'],
    bestMatches: ['ISFJ', 'ISTJ', 'ISTP']
  },
  {
    code: 'ESFP', name: '表演者', enName: 'Entertainer',
    quadrant: 'explorer', quadrantName: '探险家', color: '#ffb703', symbol: '🎉',
    tag: '聚光灯下 · 热情洋溢 · 拥抱快乐',
    summary: '天生的生活派对主角与快乐源泉。你生机勃勃、热情大方，拥有极佳的人际魅力与临场感染力，走到哪里都能将欢声笑语带给周围的人。',
    cognition: '主导 Se (外倾实感) · 辅助 Fi (内倾情感) · 第三 Te (外倾思考) · 劣势 Ni (内倾直觉)',
    strengths: ['超强的舞台感与社交亲和力', '慷慨大度、乐于助人', '敏锐捕捉当下的美好与乐趣', '实操落地能力强、富有同理心'],
    blindSpots: ['容易过度追求短期享乐与物质消费', '对沉重严肃的长期议题容易逃避', '难以承受孤独与缺乏关注', '缺乏深度复盘与长远规划'],
    career: '适合演艺明星、公关活动统筹、品牌代言人、主播主持、旅游体验师、早教幼教与高端零售。',
    love: '爱得热烈而尽兴，给伴侣带来无穷的快乐与陪伴；渴望被关注与称赞，追求鲜活浪漫的情感体验。',
    celebrities: ['玛丽莲·梦露', '艾尔顿·约翰', '贾斯汀·比伯'],
    bestMatches: ['ISFJ', 'ISTJ', 'ESFJ']
  }
];

const MBTI_MAP = Object.fromEntries(MBTI_TYPES.map(t => [t.code, t]));

/* —— 精选心理学情境测试题库（20 题，每维度 5 题，信度效度均衡） —— */
export const MBTI_QUESTIONS = [
  // E vs I (能量来源：社交充电 vs 独处蓄能)
  { id: 1, dim: 'EI', q: '在经历了一整周高强度的繁杂工作后，周末你更倾向于如何恢复精力？',
    optA: { text: '约上三五好友聚会、聚餐或参加户外活动，在热闹互动中满血复活', code: 'E' },
    optB: { text: '独自待在家里看书、刷剧、沉思或独处，在安静不受打扰中慢慢蓄能', code: 'I' } },
  { id: 2, dim: 'EI', q: '走进一个几乎全是陌生人的社交聚会或行业活动现场时：',
    optA: { text: '感到兴奋期待，能主动开启对话，迅速结识新朋友并融入圈子', code: 'E' },
    optB: { text: '感到些许拘谨或消耗，更倾向于待在熟悉的角落，等待他人主动靠近', code: 'I' } },
  { id: 3, dim: 'EI', q: '当你在思考一个复杂方案或萌生新灵感时，通常的做法是：',
    optA: { text: '喜欢边说边想，通过与同事或朋友即时讨论来理清脉络', code: 'E' },
    optB: { text: '先独自在脑海中深思熟虑、整理成形后，再拿出来与他人分享', code: 'I' } },
  { id: 4, dim: 'EI', q: '在日常工作中，你对工作环境的偏好通常是：',
    optA: { text: '开放式、充满交流互动、大家随时能碰撞讨论的活跃氛围', code: 'E' },
    optB: { text: '安静独立、不易被打断、能让自己深度专注沉浸的个人空间', code: 'I' } },
  { id: 5, dim: 'EI', q: '当被问到一个突如其来的问题时，你的第一反应往往是：',
    optA: { text: '脱口而出当前的想法，随后在表达过程中不断修正完善', code: 'E' },
    optB: { text: '先在心里停顿思考数秒，组织好语言后再开口作答', code: 'I' } },

  // S vs N (信息获取：实感细节 vs 直觉大局)
  { id: 6, dim: 'SN', q: '当接触一项全新的工作任务或学习新知识时，你最先关注的是：',
    optA: { text: '具体清晰的操作步骤、过往案例、现实数据与可行细节', code: 'S' },
    optB: { text: '整体的底层逻辑、宏观愿景、未来可能性与创新概念', code: 'N' } },
  { id: 7, dim: 'SN', q: '人们在评价你平时的思维与表达风格时，更多会认为你：',
    optA: { text: '脚踏实地、注重客观事实、讲究证据与现实可行性', code: 'S' },
    optB: { text: '天马行空、充满想象力、善于使用比喻与洞察未来趋势', code: 'N' } },
  { id: 8, dim: 'SN', q: '在阅读一本书或听一场演讲时，你更容易被什么所吸引？',
    optA: { text: '立即可落地的实操方法、详实案例与真实生活经验', code: 'S' },
    optB: { text: '深奥新颖的理论体系、哲学隐喻与颠覆性的思想模型', code: 'N' } },
  { id: 9, dim: 'SN', q: '面对日常生活与工作中的重复性常规事务，你的态度是：',
    optA: { text: '乐于按部就班执行，在熟练与秩序中感受到踏实与稳定', code: 'S' },
    optB: { text: '容易感到枯燥乏味，总想探索新方法或寻找更有趣的替代方案', code: 'N' } },
  { id: 10, dim: 'SN', q: '如果用一句话形容你对时间的感知习惯：',
    optA: { text: '专注于当下的现实体验，做好眼前清晰可见的每一步', code: 'S' },
    optB: { text: '总是眺望未来三五年甚至更远，思考事情长远的演变轨迹', code: 'N' } },

  // T vs F (决策依据：逻辑理性 vs 情感同理)
  { id: 11, dim: 'TF', q: '在面临一个艰难的工作决策时，你最核心的衡量标准是：',
    optA: { text: '数据逻辑、客观事实、效率原则与契约规则（对事不对人）', code: 'T' },
    optB: { text: '对团队成员的感受影响、人本关怀、关系和谐与价值观契合', code: 'F' } },
  { id: 12, dim: 'TF', q: '当朋友遇到挫折前来找你倾诉时，你的第一本能通常是：',
    optA: { text: '帮对方理性分析问题根源，拆解解决步骤并提供切实解法', code: 'T' },
    optB: { text: '首先给予充分的情感共鸣与安慰，陪伴对方释放情绪感受', code: 'F' } },
  { id: 13, dim: 'TF', q: '在团队讨论出现严重分歧时，你更倾向于：',
    optA: { text: '坚持真理与正确的数据逻辑，哪怕当场指出对方的漏洞也在所不惜', code: 'T' },
    optB: { text: '顾及大家的颜面与整体氛围，采用委婉温和的方式求同存异', code: 'F' } },
  { id: 14, dim: 'TF', q: '当别人评价你的性格底色时，以下哪组词更贴切？',
    optA: { text: '清醒冷静、公正严谨、批判性思维强、处变不惊', code: 'T' },
    optB: { text: '温和善良、富有同理心、善解人意、体贴包容', code: 'F' } },
  { id: 15, dim: 'TF', q: '在处理人际冲突时，你认为最重要的是：',
    optA: { text: '明确是非对错与权责界限，建立清晰的规则防范重演', code: 'T' },
    optB: { text: '修复双方的情感信任，照顾彼此受伤的心情与长远关系', code: 'F' } },

  // J vs P (处事态度：计划掌控 vs 灵活开放)
  { id: 16, dim: 'JP', q: '在准备一次长期旅行或重要项目时，你的典型习惯是：',
    optA: { text: '提前制定详尽的行程表/计划清单、预订好一切，按计划从容推进', code: 'J' },
    optB: { text: '只定一个大概方向，保留充足的留白与弹性，随性探索未知惊喜', code: 'P' } },
  { id: 17, dim: 'JP', q: '面对既定截止日期的任务，你的节奏通常是：',
    optA: { text: '早早倒排工期分步完成，留出充足余量，讨厌拖到最后一刻的慌乱', code: 'J' },
    optB: { text: '在截止日期临近时的压力下反而灵感爆发、效率最高（DDL驱动）', code: 'P' } },
  { id: 18, dim: 'JP', q: '对于你的生活和办公空间，平时的状态往往是：',
    optA: { text: '物品分类清晰、井井有条，一旦杂乱会忍不住立刻收拾归位', code: 'J' },
    optB: { text: '随手放置、乱中有序，只要自己能找到就不太拘泥于表面整洁', code: 'P' } },
  { id: 19, dim: 'JP', q: '当原定计划突然被外部突发变故彻底打乱时：',
    optA: { text: '感到焦虑或不快，希望能尽快重新建立新的秩序与时间表', code: 'J' },
    optB: { text: '能够较轻松地顺应变化，甚至觉得打破常规带来新的刺激与机会', code: 'P' } },
  { id: 20, dim: 'JP', q: '你更享受以下哪种生活状态？',
    optA: { text: '事情尘埃落定、结果明确、可预期、掌控感强的确定感', code: 'J' },
    optB: { text: '保持选项开放、未完待续、随时可变、探索未知的自由感', code: 'P' } }
];

/* —— MBTI 成熟度等级评定模型 —— */
export function calcMBTIMaturity(scores) {
  // 计算各维度的平衡度（越非极端盲目，劣势功能整合越好，成熟度分越高）
  const balanceE_I = 100 - Math.abs(scores.e - scores.i);
  const balanceS_N = 100 - Math.abs(scores.s - scores.n);
  const balanceT_F = 100 - Math.abs(scores.t - scores.f);
  const balanceJ_P = 100 - Math.abs(scores.j - scores.p);

  const avgBalance = (balanceE_I + balanceS_N + balanceT_F + balanceJ_P) / 4;
  const levelScore = Math.min(98, Math.max(48, Math.round(50 + avgBalance * 0.48)));

  if (levelScore >= 88) {
    return {
      level: 'Lv.4 融会贯通 · 宗师级',
      score: levelScore,
      title: '八维平衡 · 超然自洽',
      desc: '你已超越了单一类型的固有标签，能够根据具体情境自如调用主导功能与劣势功能。在理性与感性、远见与实操之间达成了极高的自洽平衡。',
      growthAdvice: '继续保持对不同人格类型的包容与赋能，以导师般的大师心境引领他人成长。'
    };
  } else if (levelScore >= 74) {
    return {
      level: 'Lv.3 阴影整合期',
      score: levelScore,
      title: '多维视角 · 弹性情商',
      desc: '你已经开始深刻觉察并主动发展自身的第三与第四劣势功能。在职场与生活中展现出极高的情商弹性与抗压定力。',
      growthAdvice: '持续练习在面对高压时接纳脆弱面，进一步深化内心与外在行动的统合。'
    };
  } else if (levelScore >= 60) {
    return {
      level: 'Lv.2 功能发展期',
      score: levelScore,
      title: '长板突出 · 稳步拓宽',
      desc: '你的主导功能与辅助功能已非常成熟，能够稳定发挥核心优势。但在面对不熟悉的情境时，劣势功能仍可能偶有应激反应。',
      growthAdvice: '有意识地在日常决策中引入相反维度的视角（如 T 型多体察情感，J 型多留出弹性）。'
    };
  } else {
    return {
      level: 'Lv.1 原型觉醒期',
      score: levelScore,
      title: '天赋初显 · 蓄力觉醒',
      desc: '你的人格主导特质极其鲜明纯粹，在核心长板领域爆发力强。现阶段建议多加觉察自身的性格盲区与潜在压力来源。',
      growthAdvice: '学会识别压力下的应激反应（Grip 状态），给劣势功能的成长留出包容与练习的时间。'
    };
  }
}

/* —— 历史记录本地存储管理 (LocalStorage) —— */
const HIST_KEY = 'tj_mbti_history_v1';

function _getStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch (e) {}
  return null;
}

export function getMBTIHistory() {
  const store = _getStorage();
  if (!store) return [];
  try {
    return JSON.parse(store.getItem(HIST_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function saveMBTIHistoryItem(item) {
  const store = _getStorage();
  if (!store) return;
  try {
    const list = getMBTIHistory();
    list.unshift({
      id: Date.now(),
      date: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      ...item
    });
    store.setItem(HIST_KEY, JSON.stringify(list.slice(0, 20))); // 最多保留 20 条
  } catch (e) {
    console.error('保存 MBTI 历史失败', e);
  }
}

export function deleteMBTIHistoryItem(id) {
  const store = _getStorage();
  if (!store) return;
  try {
    const list = getMBTIHistory().filter(x => x.id !== id);
    store.setItem(HIST_KEY, JSON.stringify(list));
  } catch (e) {}
}

export function clearMBTIHistory() {
  const store = _getStorage();
  if (!store) return;
  try {
    store.removeItem(HIST_KEY);
  } catch (e) {}
}

/* ============================================================
   主工具对象定义
   ============================================================ */
export const mbti = {
  id: 'mbti',
  name: '人格大师',
  cat: '西方大师',
  icon: '格',
  desc: 'MBTI 16型人格深度测评、八维认知功能、人格成熟度等级评定与历史测试轨迹。',

  open(container) {
    const S = {
      activeTab: 'test', // 'test' | 'report' | 'history' | 'compendium'
      testStep: 'intro', // 'intro' | 'quiz' | 'direct'
      answers: {}, // { 1: 'E', 2: 'I', ... }
      curQIndex: 0,
      currentReport: null, // { type, scores, maturity, note }
      selectedCatalogType: MBTI_TYPES[0],
      quadrantFilter: 'all', // 'all' | 'analyst' | 'diplomat' | 'sentinel' | 'explorer'
      matchTypeA: 'INTJ',
      matchTypeB: 'ENFP',
    };

    // 尝试读取最近一次历史记录自动呈现报告
    const historyList = getMBTIHistory();
    if (historyList.length > 0) {
      S.currentReport = historyList[0];
    }

    /* —— 根据问卷回答计算 MBTI 结果 —— */
    const computeQuizResult = () => {
      let eCount = 0, iCount = 0;
      let sCount = 0, nCount = 0;
      let tCount = 0, fCount = 0;
      let jCount = 0, pCount = 0;

      for (const q of MBTI_QUESTIONS) {
        const ans = S.answers[q.id] || q.optA.code;
        if (ans === 'E') eCount++; else if (ans === 'I') iCount++;
        else if (ans === 'S') sCount++; else if (ans === 'N') nCount++;
        else if (ans === 'T') tCount++; else if (ans === 'F') fCount++;
        else if (ans === 'J') jCount++; else if (ans === 'P') pCount++;
      }

      const totalDim = 5;
      const pct = (c) => Math.round((c / totalDim) * 100);

      const ePct = pct(eCount), iPct = 100 - ePct;
      const sPct = pct(sCount), nPct = 100 - sPct;
      const tPct = pct(tCount), fPct = 100 - tPct;
      const jPct = pct(jCount), pPct = 100 - jPct;

      const code = (ePct >= iPct ? 'E' : 'I') +
                   (sPct >= nPct ? 'S' : 'N') +
                   (tPct >= fPct ? 'T' : 'F') +
                   (jPct >= pPct ? 'J' : 'P');

      const typeObj = MBTI_MAP[code] || MBTI_TYPES[0];
      const scores = {
        e: ePct, i: iPct,
        s: sPct, n: nPct,
        t: tPct, f: fPct,
        j: jPct, p: pPct
      };

      const maturity = calcMBTIMaturity(scores);

      const report = {
        type: typeObj,
        scores,
        maturity,
        note: '情境问卷测评'
      };

      // 自动保存历史记录
      saveMBTIHistoryItem(report);
      S.currentReport = report;
      S.activeTab = 'report';
      render();
    };

    /* —— 手动快捷选择已知 MBTI —— */
    const selectDirectType = (code) => {
      const typeObj = MBTI_MAP[code] || MBTI_TYPES[0];
      const scores = {
        e: code[0] === 'E' ? 75 : 25, i: code[0] === 'I' ? 75 : 25,
        s: code[1] === 'S' ? 75 : 25, n: code[1] === 'N' ? 75 : 25,
        t: code[2] === 'T' ? 75 : 25, f: code[2] === 'F' ? 75 : 25,
        j: code[3] === 'J' ? 75 : 25, p: code[3] === 'P' ? 75 : 25
      };
      const maturity = calcMBTIMaturity(scores);
      const report = {
        type: typeObj,
        scores,
        maturity,
        note: '直接选定类型'
      };
      saveMBTIHistoryItem(report);
      S.currentReport = report;
      S.activeTab = 'report';
      render();
    };

    /* —— 渲染主框架 —— */
    const render = () => {
      container.innerHTML =
        masthead(mbti, { sub: mbti.desc }) +
        // 顶部导航栏
        '<div class="tw-m-nav">' +
          '<button type="button" class="tw-m-nav-btn' + (S.activeTab === 'test' ? ' active' : '') + '" data-tab="test">🎯 测评与测试</button>' +
          '<button type="button" class="tw-m-nav-btn' + (S.activeTab === 'report' ? ' active' : '') + '" data-tab="report">📊 人格报告' + (S.currentReport ? ' (' + S.currentReport.type.code + ')' : '') + '</button>' +
          '<button type="button" class="tw-m-nav-btn' + (S.activeTab === 'history' ? ' active' : '') + '" data-tab="history">🕒 历史档案</button>' +
          '<button type="button" class="tw-m-nav-btn' + (S.activeTab === 'compendium' ? ' active' : '') + '" data-tab="compendium">📖 16型图鉴</button>' +
        '</div>' +
        '<div class="tw-m-body" id="twMBody"></div>';

      container.querySelectorAll('.tw-m-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.tab === 'report' && !S.currentReport) {
            showToast('请先完成一次测试或选择已知 MBTI');
            return;
          }
          S.activeTab = btn.dataset.tab;
          render();
        });
      });

      const body = container.querySelector('#twMBody');
      if (!body) return;

      if (S.activeTab === 'test') renderTestTab(body);
      else if (S.activeTab === 'report') renderReportTab(body);
      else if (S.activeTab === 'history') renderHistoryTab(body);
      else if (S.activeTab === 'compendium') renderCompendiumTab(body);
    };

    /* ============================================================
       Tab 1: 测评问卷与选定
       ============================================================ */
    const renderTestTab = (el) => {
      // 1. 引导入口界面
      if (S.testStep === 'intro') {
        el.innerHTML =
          '<div class="tw-m-intro-box">' +
            '<div class="icon">🧩</div>' +
            '<h3 class="title">探索你的 MBTI 人格原型与潜能</h3>' +
            '<p class="desc">基于荣格心理学八维功能模型，深度解析你的认知模式、能量来源、决策习惯与成熟度等级。</p>' +
            '<div class="btn-group">' +
              '<button type="button" class="tw-btn tw-btn-primary" id="twMStartQuiz">✦ 开始 20 题情境深度测评</button>' +
              '<button type="button" class="tw-btn tw-btn-ghost" id="twMGoDirect">我已知道自己的 MBTI，直接选定 →</button>' +
            '</div>' +
          '</div>' +
          notice('<b>测评提示：</b>答题时请依据第一直觉与真实自然习惯作答，无需考虑“哪种选择更优秀”，接纳最真实的自己。');

        el.querySelector('#twMStartQuiz')?.addEventListener('click', () => {
          S.testStep = 'quiz';
          S.curQIndex = 0;
          S.answers = {};
          renderTestTab(el);
        });

        el.querySelector('#twMGoDirect')?.addEventListener('click', () => {
          S.testStep = 'direct';
          renderTestTab(el);
        });
        return;
      }

      // 2. 快捷直接选定界面
      if (S.testStep === 'direct') {
        el.innerHTML =
          '<div class="tw-m-direct-wrap">' +
            '<div class="hd">' +
              '<h4>选择你已知的 MBTI 类型</h4>' +
              '<button type="button" class="tw-t-btn-sm" id="twMBackIntro">‹ 返回测评</button>' +
            '</div>' +
            '<div class="tw-m-type-grid">' +
              MBTI_TYPES.map(t =>
                '<div class="tw-m-type-tile" data-code="' + t.code + '" style="border-top:3px solid ' + t.color + '">' +
                  '<div class="code">' + t.code + '</div>' +
                  '<div class="name">' + t.name + '</div>' +
                  '<div class="quad">' + t.quadrantName + '</div>' +
                '</div>'
              ).join('') +
            '</div>' +
          '</div>';

        el.querySelector('#twMBackIntro')?.addEventListener('click', () => {
          S.testStep = 'intro';
          renderTestTab(el);
        });

        el.querySelectorAll('[data-code]').forEach(tile => {
          tile.addEventListener('click', () => {
            selectDirectType(tile.dataset.code);
          });
        });
        return;
      }

      // 3. 逐题测评问卷界面
      const q = MBTI_QUESTIONS[S.curQIndex];
      const progressPct = Math.round(((S.curQIndex + 1) / MBTI_QUESTIONS.length) * 100);
      const selected = S.answers[q.id];

      el.innerHTML =
        '<div class="tw-m-quiz-box">' +
          '<div class="quiz-progress-bar">' +
            '<div class="bar-top"><span>第 ' + (S.curQIndex + 1) + ' / ' + MBTI_QUESTIONS.length + ' 题</span><b>' + progressPct + '%</b></div>' +
            '<div class="track"><div class="fill" style="width:' + progressPct + '%"></div></div>' +
          '</div>' +
          '<div class="quiz-question">' + q.q + '</div>' +
          '<div class="quiz-options">' +
            '<button type="button" class="quiz-opt' + (selected === q.optA.code ? ' sel' : '') + '" data-ans="' + q.optA.code + '">' +
              '<span class="letter">A</span><span class="text">' + q.optA.text + '</span>' +
            '</button>' +
            '<button type="button" class="quiz-opt' + (selected === q.optB.code ? ' sel' : '') + '" data-ans="' + q.optB.code + '">' +
              '<span class="letter">B</span><span class="text">' + q.optB.text + '</span>' +
            '</button>' +
          '</div>' +
          '<div class="quiz-nav-row">' +
            '<button type="button" class="tw-btn tw-btn-ghost" id="twMPrevQ"' + (S.curQIndex === 0 ? ' disabled' : '') + '>‹ 上一题</button>' +
            '<button type="button" class="tw-btn tw-btn-ghost" id="twMQuitQuiz">放弃退出</button>' +
          '</div>' +
        '</div>';

      el.querySelectorAll('[data-ans]').forEach(btn => {
        btn.addEventListener('click', () => {
          S.answers[q.id] = btn.dataset.ans;
          if (S.curQIndex < MBTI_QUESTIONS.length - 1) {
            S.curQIndex++;
            renderTestTab(el);
          } else {
            computeQuizResult();
          }
        });
      });

      el.querySelector('#twMPrevQ')?.addEventListener('click', () => {
        if (S.curQIndex > 0) {
          S.curQIndex--;
          renderTestTab(el);
        }
      });

      el.querySelector('#twMQuitQuiz')?.addEventListener('click', () => {
        S.testStep = 'intro';
        renderTestTab(el);
      });
    };

    /* ============================================================
       Tab 2: MBTI 深度人格报告
       ============================================================ */
    const renderReportTab = (el) => {
      const rep = S.currentReport;
      if (!rep) {
        el.innerHTML = '<div class="tw-m-empty">暂无人格报告，请先进行测试。</div>';
        return;
      }

      const t = rep.type;
      const sc = rep.scores;
      const mat = rep.maturity;

      const dimBars = [
        { labelLeft: '外向 (E) ' + sc.e + '%', labelRight: '内向 (I) ' + sc.i + '%', pctLeft: sc.e, color: '#e76f51' },
        { labelLeft: '实感 (S) ' + sc.s + '%', labelRight: '直觉 (N) ' + sc.n + '%', pctLeft: sc.s, color: '#2a9d8f' },
        { labelLeft: '思考 (T) ' + sc.t + '%', labelRight: '情感 (F) ' + sc.f + '%', pctLeft: sc.t, color: '#6a4c93' },
        { labelLeft: '判断 (J) ' + sc.j + '%', labelRight: '知觉 (P) ' + sc.p + '%', pctLeft: sc.j, color: '#f4a261' },
      ];

      el.innerHTML =
        // Hero 头部卡片
        '<div class="tw-m-hero-card" style="border-top:4px solid ' + t.color + '">' +
          '<div class="hero-top">' +
            '<div class="sym">' + t.symbol + '</div>' +
            '<div class="titles">' +
              '<div class="kicker">' + t.quadrantName + ' ｜ ' + (rep.note || 'MBTI 人格测评') + '</div>' +
              '<h2>' + t.code + ' · ' + t.name + ' <small>(' + t.enName + ')</small></h2>' +
              '<div class="tag">' + t.tag + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cognition-strip"><b>八维序列：</b>' + t.cognition + '</div>' +
        '</div>' +

        // 人格成熟度评定卡片 (Maturity Index)
        '<div class="tw-m-card maturity-card">' +
          '<div class="mat-hd">' +
            '<div><span class="k">人格成熟度评定</span><h4 class="title">' + mat.level + ' (' + mat.score + '分)</h4></div>' +
            '<div class="mat-tag">' + mat.title + '</div>' +
          '</div>' +
          '<p class="mat-desc">' + mat.desc + '</p>' +
          '<div class="mat-growth"><b>进阶与突破建议：</b>' + mat.growthAdvice + '</div>' +
        '</div>' +

        // 四大维度偏好条
        '<div class="tw-m-card">' +
          '<div class="tw-h-card-hd"><b>四大能量维度倾向</b><span class="sub">得分分布</span></div>' +
          '<div class="tw-m-dim-list">' +
            dimBars.map(d =>
              '<div class="tw-m-dim-it">' +
                '<div class="labels"><span>' + d.labelLeft + '</span><span>' + d.labelRight + '</span></div>' +
                '<div class="track">' +
                  '<div class="fill" style="width:' + d.pctLeft + '%;background:' + d.color + '"></div>' +
                '</div>' +
              '</div>'
            ).join('') +
          '</div>' +
        '</div>' +

        // 深度性格与天赋画像
        '<div class="tw-m-card">' +
          '<div class="tw-h-card-hd"><b>核心特质与心理画像</b></div>' +
          '<p class="tw-m-prose">' + t.summary + '</p>' +
          '<div class="tw-m-columns">' +
            '<div class="col good">' +
              '<div class="c-hd">✦ 核心天赋杀手锏</div>' +
              '<ul>' + t.strengths.map(s => '<li>' + s + '</li>').join('') + '</ul>' +
            '</div>' +
            '<div class="col warn">' +
              '<div class="c-hd">✕ 盲区与压力预警</div>' +
              '<ul>' + t.blindSpots.map(b => '<li>' + b + '</li>').join('') + '</ul>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // 职场航道与情感密码
        '<div class="tw-m-card">' +
          '<div class="tw-h-card-hd"><b>职场航道与情感模式</b></div>' +
          '<div class="tw-m-prose">' +
            '<p><b>💼 最适职业发展：</b>' + t.career + '</p>' +
            '<p><b>❤️ 亲密关系密码：</b>' + t.love + '</p>' +
            '<p><b>🤝 黄金契合搭档：</b>' + t.bestMatches.map(m => '<span class="match-badge">' + m + '</span>').join(' ') + '</p>' +
            '<p><b>🌟 代表人物：</b>' + t.celebrities.join('、') + '</p>' +
          '</div>' +
        '</div>' +

        // 底部操作区
        '<div class="tw-actions">' +
          '<button type="button" class="tw-btn tw-btn-primary" id="twMShareReport">✦ 生成人格档案卡片</button>' +
          '<button type="button" class="tw-btn tw-btn-ghost" id="twMReTest">重新测试 ↻</button>' +
        '</div>' +
        '<div class="tw-ai-mount" id="twMAIMount"></div>' +
        notice('<b>提示：</b>MBTI 是一面自我观照与增进理解的镜子，而非定义你人生上限的枷锁。持续整合阴影，成就更立体的自我。');

      // 重新测试
      el.querySelector('#twMReTest')?.addEventListener('click', () => {
        S.activeTab = 'test';
        S.testStep = 'intro';
        render();
      });

      // 生成分享卡片
      el.querySelector('#twMShareReport')?.addEventListener('click', async () => {
        const btn = el.querySelector('#twMShareReport');
        btn.disabled = true; btn.textContent = '生成中…';
        try {
          const { renderShareCard, exportShareCard } = await import('../share/card.js');
          const card = renderShareCard({
            kicker: '人格大师 · MBTI 16型人格档案',
            title: `${t.code} · ${t.name}`,
            sub: `${t.quadrantName} ｜ ${mat.level}`,
            badge: mat.title,
            rows: [
              { k: '核心特质', v: t.tag },
              { k: '认知序列', v: t.cognition },
              { k: '天赋优势', v: t.strengths.slice(0, 3).join(' ｜ ') },
              { k: '职场航道', v: t.career },
            ],
            quote: t.summary,
            foot: 'MBTI 用于自我觉察与启发，不构成能力定论。'
          });
          exportShareCard(card, '问问大师_MBTI_' + t.code, btn);
        } catch (err) {
          console.error(err);
        }
        btn.disabled = false; btn.textContent = '✦ 生成人格档案卡片';
      });

      // 接入 AI 深度追问
      const aiSlot = el.querySelector('#twMAIMount');
      if (aiSlot) {
        attachToolAI({
          root: el,
          typeLabel: '人格大师 · MBTI解读',
          getSource: () => {
            return `【人格大师·MBTI 档案事实】
人格类型：${t.code} · ${t.name} (${t.enName}，${t.quadrantName})
成熟度评定：${mat.level} (${mat.score}分 - ${mat.title})
八维序列：${t.cognition}
各维度倾向：E(${sc.e}%) I(${sc.i}%)，S(${sc.s}%) N(${sc.n}%)，T(${sc.t}%) F(${sc.f}%)，J(${sc.j}%) P(${sc.p}%)
核心优势：${t.strengths.join('、')}
成长盲区：${t.blindSpots.join('、')}
职场方向：${t.career}
亲密关系：${t.love}
进阶建议：${mat.growthAdvice}`;
          },
          slot: aiSlot,
          extraSystem: '你是一位精通荣格心理学与 MBTI 八维认知功能的专业心理咨询大师。请基于用户的 MBTI 类型、八维序列与成熟度等级，针对用户的职场卡点、情绪内耗或人际关系问题，提供深刻、精准且极具实操性的心理破局建议。'
        });
      }
    };

    /* ============================================================
       Tab 3: 历史测试档案 (History)
       ============================================================ */
    const renderHistoryTab = (el) => {
      const history = getMBTIHistory();

      if (!history.length) {
        el.innerHTML =
          '<div class="tw-m-empty">' +
            '<div class="icon">📭</div>' +
            '<h4>还没有保存的测试历史</h4>' +
            '<p>完成测试后，你的性格演变轨迹将自动记录在这里。</p>' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twMGoTest">立即进行测试 →</button>' +
          '</div>';

        el.querySelector('#twMGoTest')?.addEventListener('click', () => {
          S.activeTab = 'test';
          S.testStep = 'intro';
          render();
        });
        return;
      }

      el.innerHTML =
        '<div class="tw-m-history-header">' +
          '<div><b>历史测试记录</b> <small>(共 ' + history.length + ' 条测试档案)</small></div>' +
          '<button type="button" class="tw-t-btn-sm" id="twMClearHist">清空历史</button>' +
        '</div>' +
        '<div class="tw-m-history-list">' +
          history.map(item => {
            const t = item.type;
            const mat = item.maturity;
            return '<div class="tw-m-history-card" data-id="' + item.id + '">' +
              '<div class="top-row">' +
                '<span class="badge" style="background:' + t.color + '">' + t.code + '</span>' +
                '<div class="title">' + t.name + ' <small>(' + (item.note || '测评') + ')</small></div>' +
                '<span class="date">' + item.date + '</span>' +
                '<button type="button" class="sa-del del-btn" data-del="' + item.id + '" title="删除此条">×</button>' +
              '</div>' +
              '<div class="mid-row">' +
                '<span class="mat-label">' + mat.level + ' (' + mat.score + '分)</span>' +
                '<span class="dim-summary">E' + item.scores.e + ' I' + item.scores.i + ' · S' + item.scores.s + ' N' + item.scores.n + ' · T' + item.scores.t + ' F' + item.scores.f + ' · J' + item.scores.j + ' P' + item.scores.p + '</span>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';

      // 点击卡片查看报告
      el.querySelectorAll('.tw-m-history-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.del-btn')) return;
          const id = Number(card.dataset.id);
          const found = history.find(h => h.id === id);
          if (found) {
            S.currentReport = found;
            S.activeTab = 'report';
            render();
          }
        });
      });

      // 删除单条
      el.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = Number(btn.dataset.del);
          deleteMBTIHistoryItem(id);
          renderHistoryTab(el);
          showToast('已删除该条历史记录');
        });
      });

      // 清空全部
      el.querySelector('#twMClearHist')?.addEventListener('click', () => {
        if (confirm('确定要清空全部 MBTI 历史测试记录吗？')) {
          clearMBTIHistory();
          renderHistoryTab(el);
          showToast('历史记录已清空');
        }
      });
    };

    /* ============================================================
       Tab 4: 16型全景图鉴与合盘速配 (Compendium & Match)
       ============================================================ */
    const renderCompendiumTab = (el) => {
      const filtered = S.quadrantFilter === 'all'
        ? MBTI_TYPES
        : MBTI_TYPES.filter(t => t.quadrant === S.quadrantFilter);

      const sel = S.selectedCatalogType || MBTI_TYPES[0];

      // 双人契合度计算
      const tA = MBTI_MAP[S.matchTypeA] || MBTI_TYPES[0];
      const tB = MBTI_MAP[S.matchTypeB] || MBTI_TYPES[7];

      let matchScore = 75;
      let matchDesc = '';
      let matchAdvice = '';

      if (tA.code === tB.code) {
        matchScore = 85;
        matchDesc = '同频镜像：你们思考与处事的底层代码几乎完全一致，能秒懂对方的心思，但也要注意双方共同的盲区。';
        matchAdvice = '享受天然的默契，但在分歧时避免都固执己见，学会轮流退后一步。';
      } else if (tA.bestMatches.includes(tB.code)) {
        matchScore = 95;
        matchDesc = `黄金搭档：${tA.code} 与 ${tB.code} 属于互补共进的绝佳组合，主导认知功能形成天然互补，彼此激发潜能。`;
        matchAdvice = '沟通非常顺畅，一个负责宏观构想一个负责落地突破，是极具成长性的高分伴侣。';
      } else if (tA.quadrant === tB.quadrant) {
        matchScore = 88;
        matchDesc = `同阵营默契：同属${tA.quadrantName}阵营，你们在价值观和人生追求的大方向上高度契合，容易产生深厚共鸣。`;
        matchAdvice = '适合共同制定长远目标，在日常相处中多留一份对彼此个性差异的包容。';
      } else {
        matchScore = 72;
        matchDesc = `跨界成长：不同阵营的碰撞能带来全新的视角冲击，初识时充满新鲜感，长期相处需要更多的理解与磨合。`;
        matchAdvice = '把彼此的差异视为互补的礼物，明确分工与沟通边界，避免以自己的思维标准苛求对方。';
      }

      el.innerHTML =
        // 双人契合度速配模块
        '<div class="tw-m-card match-box">' +
          '<div class="tw-h-card-hd"><b>MBTI 契合度速配罗盘</b></div>' +
          '<div class="match-picker-row">' +
            '<select id="twMMatchA">' +
              MBTI_TYPES.map(t => '<option value="' + t.code + '"' + (t.code === tA.code ? ' selected' : '') + '>' + t.code + ' · ' + t.name + '</option>').join('') +
            '</select>' +
            '<span class="heart">⚡</span>' +
            '<select id="twMMatchB">' +
              MBTI_TYPES.map(t => '<option value="' + t.code + '"' + (t.code === tB.code ? ' selected' : '') + '>' + t.code + ' · ' + t.name + '</option>').join('') +
            '</select>' +
          '</div>' +
          '<div class="match-res-hero">' +
            '<div class="score-badge">' + matchScore + '% 契合度</div>' +
            '<p class="desc">' + matchDesc + '</p>' +
            '<div class="advice"><b>相处指引：</b>' + matchAdvice + '</div>' +
          '</div>' +
        '</div>' +

        // 四大阵营筛选
        '<div class="tw-t-filter-bar">' +
          [
            'all:全部 16 型',
            'analyst:♟️ 分析家 (NT)',
            'diplomat:🌸 外交家 (NF)',
            'sentinel:📋 守护者 (SJ)',
            'explorer:⚡ 探险家 (SP)'
          ].map(p => {
            const [k, label] = p.split(':');
            return '<button type="button" class="tw-t-filter-btn' + (S.quadrantFilter === k ? ' active' : '') + '" data-quad="' + k + '">' + label + '</button>';
          }).join('') +
        '</div>' +

        // 16型图鉴网格
        '<div class="tw-m-comp-grid">' +
          filtered.map(t =>
            '<div class="tw-m-comp-tile' + (t.code === sel.code ? ' sel' : '') + '" data-code="' + t.code + '" style="border-top:3px solid ' + t.color + '">' +
              '<div class="sym">' + t.symbol + '</div>' +
              '<div class="code">' + t.code + '</div>' +
              '<div class="name">' + t.name + '</div>' +
              '<div class="quad">' + t.quadrantName + '</div>' +
            '</div>'
          ).join('') +
        '</div>' +

        // 选中类型深度档案
        '<div class="tw-m-detail-card" style="border-top:4px solid ' + sel.color + '">' +
          '<div class="detail-hd">' +
            '<span class="sym">' + sel.symbol + '</span>' +
            '<div class="titles">' +
              '<h3>' + sel.code + ' · ' + sel.name + ' <small>(' + sel.enName + ')</small></h3>' +
              '<div class="meta">' + sel.quadrantName + ' ｜ 八维：' + sel.cognition + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="tw-m-prose" style="margin-top:10px">' +
            '<p><b>性格特质：</b>' + sel.summary + '</p>' +
            '<p><b>核心天赋：</b>' + sel.strengths.join('、') + '</p>' +
            '<p><b>盲区预警：</b>' + sel.blindSpots.join('、') + '</p>' +
            '<p><b>最佳职业：</b>' + sel.career + '</p>' +
            '<p><b>情感密码：</b>' + sel.love + '</p>' +
            '<p><b>代表名人：</b>' + sel.celebrities.join('、') + '</p>' +
          '</div>' +
          '<div class="tw-actions" style="margin-top:12px">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twMSelectAsMine">设为我的人格并查看报告 →</button>' +
          '</div>' +
        '</div>';

      // 绑定双人切换
      el.querySelector('#twMMatchA')?.addEventListener('change', (e) => {
        S.matchTypeA = e.target.value;
        renderCompendiumTab(el);
      });
      el.querySelector('#twMMatchB')?.addEventListener('change', (e) => {
        S.matchTypeB = e.target.value;
        renderCompendiumTab(el);
      });

      // 绑定阵营筛选
      el.querySelectorAll('[data-quad]').forEach(btn => {
        btn.addEventListener('click', () => {
          S.quadrantFilter = btn.dataset.quad;
          renderCompendiumTab(el);
        });
      });

      // 绑定点击类型
      el.querySelectorAll('[data-code]').forEach(tile => {
        tile.addEventListener('click', () => {
          const code = tile.dataset.code;
          S.selectedCatalogType = MBTI_MAP[code] || MBTI_TYPES[0];
          renderCompendiumTab(el);
        });
      });

      // 设为我的人格
      el.querySelector('#twMSelectAsMine')?.addEventListener('click', () => {
        selectDirectType(sel.code);
      });
    };

    render();
  }
};

export default mbti;
