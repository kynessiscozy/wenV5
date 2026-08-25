/* ============================================================
   horoscope · 星座大师
   ------------------------------------------------------------
   全功能西方占星与十二星座罗盘系统：
     1. 本命星盘档案：太阳（本我）、月亮（内心情绪）、上升（外在人格）
        三核精算 + 四象能量图谱（火/土/风/水）+ 六维天赋雷达
     2. 时空运势罗盘：今日 / 本周 / 本月 / 年度 运势深度预测
        （综合分、事业学业、感情桃花、财富投资、身心元气、宇宙指引）
     3. 星座合盘速配：12x12 全量契合度矩阵 + 元素动力学 + 相处破冰指南
     4. 12星座图鉴：四象分类筛选 + 守护星/神话与心理学全景画像
     5. ✦ AI 深度星座解读：无缝结合星盘上下文与多轮智能追问
     6. 生成分享卡片：支持一键导出精美 Claude 风格星座卡片
   ============================================================ */

import { masthead, notice, esc, attachToolAI } from './runtime.js';
import { getCtx } from '../state/context.js';
import { showToast } from '../ui/toast.js';
import { getZodiacSvg } from '../render/western-view.js';

/* —— 12 星座基础元数据与深度知识库 —— */
export const SIGNS = [
  {
    id: 'aries', name: '白羊座', en: 'Aries', symbol: '♈',
    date: '3.21 – 4.19', mStart: [3, 21], mEnd: [4, 19],
    elem: '火', elemKey: 'fire', mode: '开创', ruler: '火星',
    color: '#e05a47', tag: '率真果敢 · 破局冲锋',
    luckyNum: '9, 1', luckyColor: '赤红 · 珊瑚橘', stone: '红宝石 · 钻石',
    nobleSigns: ['狮子座', '射手座', '双子座'],
    keywords: ['热情直率', '决断力强', '开创精神', '不拘小节', '争强好胜'],
    summary: '白羊座代表着万物复苏的春之初生，具有极强的主动性与开辟新局的勇气。你天生是行动派，厌恶拖泥带水，敢于成为第一个吃螃蟹的人。',
    strength: '直面挑战的魄力、高昂的感染力与不畏失败的韧性，在开创新项目、攻坚克难时能爆发惊人战斗力。',
    blindSpot: '耐性较弱，容易三分钟热度；情绪上头时言语直接，容易忽略细节与他人感受，需学会「谋定而后动」。',
    career: '适合独立开创型、竞争性强、需要即时决断的领域，如创业先锋、项目总监、竞技体育、公关拓展等。',
    love: '喜欢直球对决与真诚坦荡的关系，不喜猜忌与拉扯；在感情中全情投入，也渴望得到对方热烈且坚定的回应。',
    radar: { action: 96, empathy: 65, insight: 78, logic: 72, creative: 85, grit: 82 }
  },
  {
    id: 'taurus', name: '金牛座', en: 'Taurus', symbol: '♉',
    date: '4.20 – 5.20', mStart: [4, 20], mEnd: [5, 20],
    elem: '土', elemKey: 'earth', mode: '固定', ruler: '金星',
    color: '#5c8d62', tag: '沉稳笃定 · 务实蓄力',
    luckyNum: '6, 4', luckyColor: '翡翠绿 · 暖棕', stone: '祖母绿 · 翡翠',
    nobleSigns: ['处女座', '摩羯座', '巨蟹座'],
    keywords: ['踏实稳健', '审美敏锐', '耐力持久', '重视安全', '务实积累'],
    summary: '金牛座象征大地繁茂的丰饶与沉淀，受爱与美之神金星守护。你对品质、秩序与物质安全感有着天然的高标准，行事沉稳且极其可靠。',
    strength: '惊人的专注力与长期主义毅力，对资源管理、艺术美感与商业价值有敏锐嗅觉，是团队中不可动摇的基石。',
    blindSpot: '对改变产生天然抵触，容易陷入固执与舒适区；面对突发变故时适应周期偏长，需保持思维弹性。',
    career: '适合资产管理、金融投资、建筑设计、美食艺术、高端制造业等需要耐心与精准把控的领域。',
    love: '感情慢热而深沉，看重行动胜于甜言蜜语；一旦认定便全心托付，追求踏实稳定的生活节奏与日常温馨。',
    radar: { action: 70, empathy: 78, insight: 84, logic: 88, creative: 80, grit: 95 }
  },
  {
    id: 'gemini', name: '双子座', en: 'Gemini', symbol: '♊',
    date: '5.21 – 6.21', mStart: [5, 21], mEnd: [6, 21],
    elem: '风', elemKey: 'air', mode: '变动', ruler: '水星',
    color: '#d4a34b', tag: '灵动通达 · 信息枢纽',
    luckyNum: '5, 7', luckyColor: '柠黄 · 天青蓝', stone: '玛瑙 · 黄玉',
    nobleSigns: ['天秤座', '水瓶座', '白羊座'],
    keywords: ['机敏聪慧', '举一反三', '多维视角', '善于沟通', '好奇心强'],
    summary: '双子座是信息的传播者与思维的弄潮儿，水星赋予你闪电般的反应速度与永不枯竭的好奇心。你总能将多元信息融会贯通，带来新颖视角。',
    strength: '极高的人际适应力、多任务并行能力与文思敏捷的表达，擅长在复杂局面中迅速找到最优解并联络各方。',
    blindSpot: '专注力易被分散，浅尝辄止；面对深度情感时常以理性逃避或玩笑化解，需学会在一个领域深潜扎根。',
    career: '适合传媒新闻、整合营销、公关咨询、AI科技、跨界创作、产品经理等需要快速迭代与创意的岗位。',
    love: '追求心智的同频与有趣的灵魂，无话不谈是感情的生命线；讨厌沉闷与捆绑，需要充足的精神交流空间。',
    radar: { action: 82, empathy: 75, insight: 88, logic: 86, creative: 95, grit: 68 }
  },
  {
    id: 'cancer', name: '巨蟹座', en: 'Cancer', symbol: '♋',
    date: '6.22 – 7.22', mStart: [6, 22], mEnd: [7, 22],
    elem: '水', elemKey: 'water', mode: '开创', ruler: '月亮',
    color: '#6b8ba4', tag: '温润细腻 · 守护同理',
    luckyNum: '2, 8', luckyColor: '珍珠白 · 银灰蓝', stone: '月光石 · 珍珠',
    nobleSigns: ['天蝎座', '双鱼座', '金牛座'],
    keywords: ['共情力强', '记忆力佳', '忠诚可靠', '家庭观念', '敏锐直觉'],
    summary: '巨蟹座受月亮守护，有着潮汐般深沉丰富的情感世界。你天生具备强大的直觉与关怀本能，能敏锐捕捉周遭氛围并给予他人无微不至的庇护。',
    strength: '无与伦比的情感洞察力与凝聚团队的向心力，擅长营造安全包容的环境，在逆境中为他人提供坚实依靠。',
    blindSpot: '情绪容易内耗，受外界风吹草动影响较深；习惯筑起坚硬外壳自我保护，需学会直面冲突而非冷战退缩。',
    career: '适合心理咨询、人力资源、医疗健康、社群运营、教育培训、室内设计与文化传承等注重人本关怀的行业。',
    love: '渴望深度的安全感与归属感，善于付出与照顾；在感情中极重承诺，一旦建立信任便会成为最坚贞的伴侣。',
    radar: { action: 72, empathy: 98, insight: 92, logic: 74, creative: 84, grit: 86 }
  },
  {
    id: 'leo', name: '狮子座', en: 'Leo', symbol: '♌',
    date: '7.23 – 8.22', mStart: [7, 23], mEnd: [8, 22],
    elem: '火', elemKey: 'fire', mode: '固定', ruler: '太阳',
    color: '#d97757', tag: '光明坦荡 · 领袖魄力',
    luckyNum: '1, 5', luckyColor: '金黄 · 琥珀色', stone: '太阳石 · 橄榄石',
    nobleSigns: ['白羊座', '射手座', '天秤座'],
    keywords: ['自信大度', '领导风范', '慷慨热忱', '舞台魅力', '重诺守信'],
    summary: '狮子座受恒星太阳主宰，生来散发着光芒与王者气度。你行事堂堂正正，富有使命感与感染力，乐于庇护弱小并带领集体迈向更高目标。',
    strength: '天生的领袖魅力与决断力，极具号召力与审美大局观，在关键时刻敢于担责，能极大地鼓舞团队士气。',
    blindSpot: '自尊心极强，容易陷入死要面子或听不进批评的执拗；过度追求认可可能导致精力透支，需学会放下包袱。',
    career: '适合企业高管、品牌主理人、演艺文娱、公众演说、创意总监、战略指挥等需要展现个人影响力与风范的领域。',
    love: '爱得轰轰烈烈、光明正大；极尽宠溺与慷慨，渴望被伴侣崇拜与珍视，同时要求绝不妥协的忠诚与尊重。',
    radar: { action: 92, empathy: 76, insight: 80, logic: 82, creative: 92, grit: 88 }
  },
  {
    id: 'virgo', name: '处女座', en: 'Virgo', symbol: '♍',
    date: '8.23 – 9.22', mStart: [8, 23], mEnd: [9, 22],
    elem: '土', elemKey: 'earth', mode: '变动', ruler: '水星',
    color: '#8c9162', tag: '精益求精 · 逻辑条理',
    luckyNum: '3, 6', luckyColor: '草木绿 · 米白', stone: '蓝宝石 · 碧玺',
    nobleSigns: ['金牛座', '摩羯座', '天蝎座'],
    keywords: ['洞察细节', '追求完美', '逻辑严密', '自律高效', '利他奉献'],
    summary: '处女座是纯粹与秩序的守护者，兼具水星的敏锐与土象的严谨。你拥有如同显微镜般洞察细节的眼光，总能将混乱梳理得井井有条。',
    strength: '无出其右的分析归纳能力与执行力，工作严丝合缝、交付质量极高，是解决复杂系统漏洞的顶级行家。',
    blindSpot: '对自己和他人要求过高，容易陷入挑剔与精神焦虑；容易只见树木不见森林，需学会接纳生活中的不完美。',
    career: '适合数据科学、医学研究、法务合规、财务精算、系统架构、质量管理与文字编辑等高精度领域。',
    love: '务实而克制的爱意，不善言辞却将关怀倾注在日常细节的照顾中；看重对方的上进心与品行，追求共同成长。',
    radar: { action: 78, empathy: 80, insight: 95, logic: 98, creative: 76, grit: 92 }
  },
  {
    id: 'libra', name: '天秤座', en: 'Libra', symbol: '♎',
    date: '9.23 – 10.23', mStart: [9, 23], mEnd: [10, 23],
    elem: '风', elemKey: 'air', mode: '开创', ruler: '金星',
    color: '#b5838d', tag: '优雅和谐 · 协调平衡',
    luckyNum: '6, 9', luckyColor: '玫瑰粉 · 浅粉蓝', stone: '蛋白石 · 粉晶',
    nobleSigns: ['双子座', '水瓶座', '狮子座'],
    keywords: ['风度翩翩', '公正客观', '社交敏锐', '极佳审美', '合作共赢'],
    summary: '天秤座追求世间万物的对称、优雅与公正，受金星加持拥有绝佳的审美鉴赏力。你擅长站在多方立场权衡协调，化干戈为玉帛。',
    strength: '高超的人际外交手腕与同理谈判能力，极具美感与公关智慧，擅长搭建合作桥梁并维护团队和谐生态。',
    blindSpot: '过分权衡利弊导致优柔寡断，难以做决断；为避免冲突容易妥协退让甚至讨好，需坚定守住个人核心边界。',
    career: '适合商务谈判、公关外交、时尚艺术、法律调解、室内美学、客户关系与品牌咨询等需要沟通与品位的领域。',
    love: '追求浪漫与平等共处，注重相处中的尊重与仪式感；需要伴侣具备良好品味与心智交流，讨厌粗鲁与失衡。',
    radar: { action: 70, empathy: 90, insight: 86, logic: 88, creative: 90, grit: 72 }
  },
  {
    id: 'scorpio', name: '天蝎座', en: 'Scorpio', symbol: '♏',
    date: '10.24 – 11.22', mStart: [10, 24], mEnd: [11, 22],
    elem: '水', elemKey: 'water', mode: '固定', ruler: '冥王星 / 火星',
    color: '#783f59', tag: '深刻洞察 · 专注蜕变',
    luckyNum: '4, 8', luckyColor: '幽夜黑 · 酒红', stone: '黑曜石 · 石榴石',
    nobleSigns: ['巨蟹座', '双鱼座', '处女座'],
    keywords: ['直觉敏锐', '意志顽强', '探究本质', '忠诚护短', '蜕变重生'],
    summary: '天蝎座代表生命深邃的转化与潜能，冥王星赋予你穿透一切表象的洞察力。你拥有钢铁般的意志力，敢于直面深渊并浴火重生。',
    strength: '极其惊人的心理洞察力、策略定力与危机处理能力，在关键转折期能爆发出破釜沉舟的决断力。',
    blindSpot: '戒备心重，不易向人敞开心扉；容易陷入极端爱憎或控制欲中，需学会释怀过去并练习建立健康的信任机制。',
    career: '适合风险投资、刑侦调查、战略决策、心理学、精密外科、危机公关与深度科研等需要洞察与魄力的行业。',
    love: '爱得纯粹极致，容不得半点虚伪与背叛；表面高冷克制，内心热烈如火，一旦认定就是生生世世的深情守护。',
    radar: { action: 88, empathy: 82, insight: 99, logic: 92, creative: 85, grit: 98 }
  },
  {
    id: 'sagittarius', name: '射手座', en: 'Sagittarius', symbol: '♐',
    date: '11.23 – 12.21', mStart: [11, 23], mEnd: [12, 21],
    elem: '火', elemKey: 'fire', mode: '变动', ruler: '木星',
    color: '#3d6cb9', tag: '旷达求索 · 自由洒脱',
    luckyNum: '3, 7', luckyColor: '海蓝 · 紫罗兰', stone: '绿松石 · 青金石',
    nobleSigns: ['白羊座', '狮子座', '水瓶座'],
    keywords: ['乐观豁达', '哲学思考', '热爱探索', '坦率真诚', '追求自由'],
    summary: '射手座受第一吉星木星守护，是永不停歇的真理求索者与探险家。你胸怀远大、生性乐观，视人生为一场广阔无垠的探索之旅。',
    strength: '超前的大局观、极强的跨文化适应力与鼓舞人心的正能量，总能在困境中看到宏大希望并迅速调整航向。',
    blindSpot: '粗枝大叶，对落地细节缺乏耐性；容易盲目乐观而承诺过度，需学会在仰望星空的同时脚踏实地。',
    career: '适合高等教育、国际贸易、旅行探险、哲学出版、跨国公关、战略顾问与内容自媒体等视野广阔的领域。',
    love: '追求并肩看世界的精神伴侣，尊重与自由是爱情的基石；讨厌被盘问与束缚，在轻松平等的氛围中最能长久。',
    radar: { action: 90, empathy: 78, insight: 86, logic: 80, creative: 92, grit: 76 }
  },
  {
    id: 'capricorn', name: '摩羯座', en: 'Capricorn', symbol: '♑',
    date: '12.22 – 1.19', mStart: [12, 22], mEnd: [1, 19],
    elem: '土', elemKey: 'earth', mode: '开创', ruler: '土星',
    color: '#54504c', tag: '厚积薄发 · 坚毅建构',
    luckyNum: '4, 8', luckyColor: '玄铁灰 · 墨绿', stone: '缟玛瑙 · 蓝宝石',
    nobleSigns: ['金牛座', '处女座', '双鱼座'],
    keywords: ['大器晚成', '自律沉着', '责任担当', '战略眼光', '务实建构'],
    summary: '摩羯座受时间与因果之神土星主宰，是坚韧不拔的攀登者与筑城者。你懂得延迟满足与蓄势待发，凭借极致自律逐步登上巅峰。',
    strength: '顶级的抗压韧性、长远战略规划力与卓越的组织操盘能力，越是在长期复杂的工程中越能展现定海神针的威力。',
    blindSpot: '自我要求严苛，容易背负过多责任而压抑情绪；习惯用悲观视角审视现实，需学会享受当下并适度示弱。',
    career: '适合大型企业管理、公共行政、金融风控、工程基建、重工业制造与法学学术等需要长线建构的行业。',
    love: '爱在行动而不在言表，习惯用踏实的物质与长远的未来给对方保障；虽慢热但忠诚度极高，值得托付终身。',
    radar: { action: 85, empathy: 70, insight: 90, logic: 96, creative: 72, grit: 99 }
  },
  {
    id: 'aquarius', name: '水瓶座', en: 'Aquarius', symbol: '♒',
    date: '1.20 – 2.18', mStart: [1, 20], mEnd: [2, 18],
    elem: '风', elemKey: 'air', mode: '固定', ruler: '天王星 / 土星',
    color: '#3a8696', tag: '前瞻独创 · 人道关怀',
    luckyNum: '4, 7', luckyColor: '电光蓝 · 银白', stone: '紫水晶 · 碧玺',
    nobleSigns: ['双子座', '天秤座', '射手座'],
    keywords: ['独树一帜', '超前认知', '包容人道', '跳跃思维', '求真求实'],
    summary: '水瓶座是未来的使者与打破陈规的革新家，受天王星激发拥有非同凡响的独立意志。你关注人类整体命运，不受世俗偏见羁绊。',
    strength: '惊艳的原创创新力、客观冷静的超然视角与跨圈层社交智慧，擅长在无人探索的领域开辟全新路径。',
    blindSpot: '容易显得疏离冷淡，过于理想化而脱离现实情绪；有时为了特立独行而反叛，需注意兼顾身边的温度。',
    career: '适合前沿科学研究、人工智能、区块链、社会学调查、互联网创新、先锋艺术与公益创投等领域。',
    love: '先成为无话不谈的挚友，再发展为恋人；看重思想的碰撞与彼此独立的空间，在相互理解与自由中感受爱意。',
    radar: { action: 78, empathy: 75, insight: 96, logic: 94, creative: 98, grit: 80 }
  },
  {
    id: 'pisces', name: '双鱼座', en: 'Pisces', symbol: '♓',
    date: '2.19 – 3.20', mStart: [2, 19], mEnd: [3, 20],
    elem: '水', elemKey: 'water', mode: '变动', ruler: '海王星 / 木星',
    color: '#5e7fa2', tag: '灵性通感 · 慈悲包容',
    luckyNum: '2, 7', luckyColor: '海蓝 · 藕粉紫', stone: '海蓝宝 · 紫水晶',
    nobleSigns: ['巨蟹座', '天蝎座', '金牛座'],
    keywords: ['灵感丰富', '慈悲包容', '浪漫通透', '艺术直觉', '善解人意'],
    summary: '双鱼座是十二星座轮回的归结与升华，受浩瀚海王星守护。你拥有如海洋般无垠的同理心与艺术灵性，能感知万物细微的共鸣。',
    strength: '登峰造极的艺术通感、直觉力与心理疗愈能量，能消融人与人之间的冷漠隔阂，带来直抵心灵的温暖抚慰。',
    blindSpot: '边界感模糊，容易心软替人背负过重情绪；面对现实挫折易产生逃避倾向，需强化落地执行力与理性边界。',
    career: '适合音乐影视、纯艺术创作、心理疗愈、戏剧表演、文学写作、慈善公益与品牌叙事等需要灵感与共情的领域。',
    love: '极度浪漫与深情，渴望灵魂深处的全然相融；愿意为爱人倾注无保留的温柔，需要对方给予坚定的安全感与回应。',
    radar: { action: 68, empathy: 99, insight: 94, logic: 70, creative: 96, grit: 78 }
  }
];

/* —— 辅助字典索引 —— */
const SIGN_MAP = Object.fromEntries(SIGNS.map(s => [s.id, s]));
const SIGN_NAMES = Object.fromEntries(SIGNS.map(s => [s.name, s]));

/* —— 太阳星座推算函数 —— */
export function getSunSignByDate(month, day) {
  const m = Number(month), d = Number(day);
  if (!m || !d) return SIGNS[0];
  for (const s of SIGNS) {
    const [sm, sd] = s.mStart, [em, ed] = s.mEnd;
    if (sm === 12 && em === 1) { // 跨年摩羯
      if ((m === 12 && d >= sd) || (m === 1 && d <= ed)) return s;
    } else {
      if ((m === sm && d >= sd) || (m === em && d <= ed)) return s;
    }
  }
  return SIGNS[0];
}

/* —— 上升星座简易推算（根据太阳星座与出生时辰） —— */
export function getAscendantSign(sunSignId, hour = 12, minute = 0) {
  const sunIdx = SIGNS.findIndex(s => s.id === sunSignId);
  if (sunIdx < 0) return SIGNS[0];
  const h = Number(hour) + Number(minute) / 60;
  // 上升星座每两小时轮转一个星座，日出约 6:00 太阳与上升重合
  const offset = Math.floor(((h - 6 + 24) % 24) / 2);
  const ascIdx = (sunIdx + offset) % 12;
  return SIGNS[ascIdx];
}

/* —— 月亮星座周期估算 —— */
export function getMoonSign(year = 2000, month = 1, day = 1) {
  const y = Number(year) || 2000, m = Number(month) || 1, d = Number(day) || 1;
  // 基准日月亮位置推算（月球公转约 27.32 天过 12 星座，每天约 13.18 度）
  const base = new Date(2000, 0, 1).getTime();
  const target = new Date(y, m - 1, d).getTime();
  const diffDays = (target - base) / (1000 * 60 * 60 * 24);
  const deg = (((diffDays * 13.17639) % 360) + 360 + 245) % 360; // 2000-01-01 月在天蝎约 245 度
  const moonIdx = Math.floor(deg / 30) % 12;
  return SIGNS[moonIdx];
}

/* —— 元素与能量构成计算 —— */
export function calcElementBreakdown(sunSign, moonSign, ascSign) {
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  const weights = [{ s: sunSign, w: 4 }, { s: moonSign, w: 3 }, { s: ascSign, w: 3 }];
  let total = 0;
  for (const { s, w } of weights) {
    if (s && s.elemKey) {
      counts[s.elemKey] += w;
      total += w;
    }
  }
  const pct = k => Math.round((counts[k] / total) * 100);
  const firePct = pct('fire'), earthPct = pct('earth'), airPct = pct('air'), waterPct = pct('water');
  
  const entries = [
    { key: 'fire', name: '火象能量', char: '火', iconKey: 'fire', pct: firePct, desc: '代表热情、行动力、魄力与开拓愿景' },
    { key: 'earth', name: '土象能量', char: '土', iconKey: 'earth', pct: earthPct, desc: '代表务实、定力、秩序与资源掌控' },
    { key: 'air', name: '风象能量', char: '风', iconKey: 'air', pct: airPct, desc: '代表逻辑、敏锐思维、社交与灵感' },
    { key: 'water', name: '水象能量', char: '水', iconKey: 'water', pct: waterPct, desc: '代表共情、直觉洞察、情感与灵性' },
  ].sort((a, b) => b.pct - a.pct);

  const dominant = entries[0];
  const deficit = entries[entries.length - 1];

  let balanceAdvice = '';
  if (deficit.pct <= 10) {
    if (deficit.key === 'fire') balanceAdvice = '火象能量偏低：日常可多进行户外运动、设定短期冲刺目标，激活内在行动热情。';
    else if (deficit.key === 'earth') balanceAdvice = '土象能量偏低：注意加强财务规划与日程落地管理，减少随性消耗，建立生活秩序。';
    else if (deficit.key === 'air') balanceAdvice = '风象能量偏低：遇到纠结时多与客观朋友倾诉交流，用逻辑拆解情绪，拓宽认知视角。';
    else balanceAdvice = '水象能量偏低：允许自己表达脆弱，多关注身心感受与人际温度，培养深层同理连接。';
  } else {
    balanceAdvice = '四象能量分布较为均衡，身心具备良好的自我调节与跨场景适应能力。';
  }

  return { firePct, earthPct, airPct, waterPct, dominant, deficit, balanceAdvice, entries };
}

/* —— 星座配对契合度算法 (12x12 Matrix) —— */
export function getCompatibility(signA, signB) {
  const sA = typeof signA === 'string' ? (SIGN_MAP[signA] || SIGN_NAMES[signA] || SIGNS[0]) : signA;
  const sB = typeof signB === 'string' ? (SIGN_MAP[signB] || SIGN_NAMES[signB] || SIGNS[0]) : signB;
  
  const idxA = SIGNS.indexOf(sA), idxB = SIGNS.indexOf(sB);
  const diff = Math.min(Math.abs(idxA - idxB), 12 - Math.abs(idxA - idxB));

  let baseScore = 75;
  let tag = '互补共进', tone = 'var(--tw-b)';
  let dynamicDesc = '';
  let loveAdvice = '';
  let workAdvice = '';
  let frictionBreak = '';

  // 相同星座
  if (sA.id === sB.id) {
    baseScore = 86;
    tag = '镜像共鸣 · 灵魂镜像';
    tone = 'var(--tw-g)';
    dynamicDesc = '你们在处事节奏、价值观和敏感点上高度同频，无需过多解释就能心领神会。但同时两人的性格盲区也是对称的。';
    loveAdvice = '享受天然的默契，但发生分歧时别陷入「看谁先低头」的冷战僵局，学会给彼此搭台阶。';
    workAdvice = '适合发挥共同长板快速突破；在薄弱环节（如缺少的一方能力）建议引入第三方或建立制度校验。';
    frictionBreak = '当双方都在同一固执点上较劲时，暂停讨论 1 小时，各自写下诉求再交换。';
  }
  // 同元素（三分相 120°）
  else if (sA.elemKey === sB.elemKey) {
    baseScore = 93;
    tag = '天作之合 · 元素共振';
    tone = 'var(--tw-g)';
    dynamicDesc = `同属于${sA.elem}象星座，你们在情感表达与行动逻辑上天然合拍，沟通成本极低，极易建立深厚的情感共鸣与互信。`;
    loveAdvice = '相处轻松自在，能互相点燃或给予最深的情感支持，是极具宿命感的高甜配对。';
    workAdvice = '同向发力效率惊人，适合组队创业或承接高难度任务，彼此是极具默契的黄金搭档。';
    frictionBreak = '别因为太懂对方就忽略了边界感，重要承诺和利益分配依然要保持清晰透明。';
  }
  // 元素相生互补 (火+风 / 土+水)（六分相 60° 或 对冲相 180°）
  else if (
    (sA.elemKey === 'fire' && sB.elemKey === 'air') ||
    (sA.elemKey === 'air' && sB.elemKey === 'fire') ||
    (sA.elemKey === 'earth' && sB.elemKey === 'water') ||
    (sA.elemKey === 'water' && sB.elemKey === 'earth')
  ) {
    baseScore = 88;
    tag = '相辅相成 · 活力互补';
    tone = 'var(--tw-accent)';
    if (sA.elemKey === 'fire' || sB.elemKey === 'fire') {
      dynamicDesc = '火象的热情遇上风象的灵动与智慧，如同「风助火势」，彼此能极大激发灵感与行动力，相处充满欢声笑语与创造力。';
      loveAdvice = '风象的幽默包容与火象的真挚热烈完美融合，生活永不枯燥，是彼此的灵感缪斯。';
      workAdvice = '风象出谋划策定战略，火象冲锋陷阵抓落地，分工极其明确，能达成 1+1>2 的惊人成效。';
      frictionBreak = '火象情绪上头时风象不要过度讲大道理，先安抚情绪；风象游离时火象多给予笃定的陪伴。';
    } else {
      dynamicDesc = '土象的沉稳笃定与水象的细腻柔情如同「大地受雨露滋养」，土象为水象构筑安全港湾，水象为土象带来心灵温度。';
      loveAdvice = '非常深厚长久的羁绊，彼此能给足最实在的安全感与关怀，适合携手迈入细水长流的人生。';
      workAdvice = '土象抓质量与风控，水象抓人本关怀与客户心智，刚柔并济，稳如磐石。';
      frictionBreak = '土象别用沉默压抑回应水象的情绪诉求，多说一句「我在」；水象也多理解土象务实的表达方式。';
    }
  }
  // 对宫星座 (180°)
  else if (diff === 6) {
    baseScore = 84;
    tag = '致命吸引 · 对宫互照';
    tone = 'var(--tw-accent)';
    dynamicDesc = '你们在黄道十二宫上正好处在彼此的对面，是天生的镜像两极。初见时容易产生强烈的宿命吸引力，互相拥有对方最渴望却欠缺的特质。';
    loveAdvice = '既有极强的心动张力，也需要更多的包容。把彼此的差异视为自我拓展的窗口，而非改变对方的战场。';
    workAdvice = '能覆盖彼此完全看不到的盲区，在重大决策时是绝佳的互补顾问。';
    frictionBreak = '求同存异，约定在对方专业擅长的领域由对方主导，避免因争夺掌控权起内耗。';
  }
  // 挑战型组合 (火+水 / 土+风)
  else {
    baseScore = 68;
    tag = '跨界磨合 · 拓展成长';
    tone = 'var(--tw-y)';
    if ((sA.elemKey === 'fire' && sB.elemKey === 'water') || (sA.elemKey === 'water' && sB.elemKey === 'fire')) {
      dynamicDesc = '水与火的相遇具有极强的情感张力——水能灭火，火能沸水。火象的直接冲劲有时会无意刺伤敏感的水象，而水象的沉郁内耗也会让火象感到焦躁。';
      loveAdvice = '火象需学会放慢语速、多体察细节；水象要学会有话直说，不让猜忌消耗爱意。';
      workAdvice = '需要明确工作流程与权责范围，把情绪与事务严格剥离，发挥各自优势。';
      frictionBreak = '感到沟通卡壳时，先把「你怎么这样」换成「我感受到了什么，我们怎么解决」。';
    } else {
      dynamicDesc = '土象的脚踏实地与风象的天马行空在初识时可能会觉得彼此来自不同星球。土象嫌风象漂浮不定，风象嫌土象刻板沉闷。';
      loveAdvice = '风象多带土象体验生活的新鲜乐趣，土象帮助风象把美妙设想落到实处，互为锚点。';
      workAdvice = '务必在项目启动前明确产出指标与时间节点，避免因理解偏差反复推倒重来。';
      frictionBreak = '把抽象的争论落脚到「具体明天要做哪三件事」，用事实代替观念交锋。';
    }
  }

  // 细分维度打分
  const loveScore = Math.min(99, Math.max(50, Math.round(baseScore + (diff === 4 ? 6 : diff === 0 ? 3 : -2))));
  const workScore = Math.min(99, Math.max(52, Math.round(baseScore + (sA.elemKey === 'earth' || sB.elemKey === 'earth' ? 5 : 0))));
  const talkScore = Math.min(99, Math.max(48, Math.round(baseScore + (sA.elemKey === 'air' || sB.elemKey === 'air' ? 6 : -3))));

  return {
    score: baseScore,
    loveScore,
    workScore,
    talkScore,
    tag,
    tone,
    dynamicDesc,
    loveAdvice,
    workAdvice,
    frictionBreak,
    signA: sA,
    signB: sB
  };
}

/* —— 周期时空运势生成器（基于日期+星座特征的动态确定性计算） —— */
export function getHoroscopeForecast(sign, period = 'today') {
  const s = typeof sign === 'string' ? (SIGN_MAP[sign] || SIGN_NAMES[sign] || SIGNS[0]) : sign;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  
  // 伪随机哈希发生器（保证同一天同一星座结果稳定）
  const seed = (y * 10000 + m * 100 + d) * 17 + SIGNS.indexOf(s) * 31 + (period === 'week' ? 101 : period === 'month' ? 203 : period === 'year' ? 307 : 13);
  const pseudo = i => {
    const v = Math.sin(seed + i * 19.3) * 10000;
    return v - Math.floor(v);
  };

  const baseScore = Math.round(72 + pseudo(1) * 23); // 72 ~ 95
  const careerScore = Math.round(68 + pseudo(2) * 28);
  const loveScore = Math.round(65 + pseudo(3) * 32);
  const wealthScore = Math.round(70 + pseudo(4) * 26);
  const healthScore = Math.round(72 + pseudo(5) * 24);

  const moods = ['元气充盈 · 势如破竹', '笃定沉静 · 稳中有升', '灵光乍现 · 善结良缘', '厚积薄发 · 蓄力跃迁', '通透豁达 · 心境开朗'];
  const mood = moods[Math.floor(pseudo(6) * moods.length)];

  const guides = {
    today: {
      title: `${s.name} · 今日宇宙运势能量`,
      sub: `${y}年${m}月${d}日 · ${mood}`,
      kicker: 'TODAY HOROSCOPE',
      career: `在工作与学习中思维清晰，适合处理此前拖延的攻坚事项。面对突发沟通建议保持耐心，${s.elem === '火' ? '注意克制急躁' : s.elem === '风' ? '避免信息过载' : s.elem === '水' ? '减少情绪代入' : '避免过度固执'}。`,
      love: `情感气场温和，单身者可能在工作交往或日常场景中遇到聊得来的对象；有伴者适合共进晚餐，坦诚分享近期的真实心情。`,
      wealth: `财运平稳，偏财方面有机动小惊喜，但需注意防范冲动消费，适合梳理本周账目或做稳健储蓄计划。`,
      health: `身心状态良好，下午容易有短暂疲惫，建议午间闭目养神 15 分钟，多补充温水，适度拉伸肩颈。`,
      luckyColor: s.luckyColor.split(' · ')[0],
      luckyNum: Math.floor(pseudo(7) * 9) + 1,
      noble: s.nobleSigns[Math.floor(pseudo(8) * s.nobleSigns.length)],
      yi: ['主动沟通', '推进要事', '整理空间', '早睡蓄能'],
      ji: ['冲动拍板', '情绪内耗', '熬夜透支', '争论对错']
    },
    week: {
      title: `${s.name} · 本周星象能量周报`,
      sub: `本周重点周期 · 运势指数 ${baseScore} 分`,
      kicker: 'WEEKLY ASTROLOGY',
      career: `本周整体处于向上爬升期，周中有重要合作或方案展示机会，前期务必做好充分准备，你的专业度会赢得关键信任。`,
      love: `感情上沟通是主旋律，适合解开此前的误解；周末非常适合安排两人约会或朋友小聚，放松紧绷的神经。`,
      wealth: `正财稳定，有新的业务增收线索浮现；投资理财宜守不宜冒进，看紧现金流。`,
      health: `注意劳逸结合，保持规律饮食，防止肠胃与睡眠因压力产生小波动。`,
      luckyColor: s.luckyColor,
      luckyNum: s.luckyNum,
      noble: s.nobleSigns[0],
      yi: ['拓展人脉', '制定周计划', '学习新知', '户外运动'],
      ji: ['拖延逃避', '借贷担保', '过度承诺', '情绪化消费']
    },
    month: {
      title: `${s.name} · 本月星盘运势罗盘`,
      sub: `${y}年${m}月整体星象指南`,
      kicker: 'MONTHLY FORECAST',
      career: `月度星象为你注入强劲的转型与突破能量。此前积累的经验将在本月迎来变现节点，职场上宜主动出击，争取核心资源。`,
      love: `桃花运势走高，容易结识背景不同却极具吸引力的异性；有伴侣者关系进一步升温，适合共同探讨未来计划。`,
      wealth: `财富运势上扬，适合合理优化资产配置结构，控制不必要的情绪性开支，整体结余健康。`,
      health: `整体活力充沛，建议养成固定的运动习惯，通过瑜伽、慢跑或冥想平衡身心能量。`,
      luckyColor: s.luckyColor,
      luckyNum: s.luckyNum,
      noble: s.nobleSigns[1] || s.nobleSigns[0],
      yi: ['长期布局', '深度复盘', '技能进阶', '家庭相聚'],
      ji: ['盲目跟风', '忽视体检', '独断专行', '内耗纠结']
    },
    year: {
      title: `${s.name} · ${y} 年度宏观星相展望`,
      sub: `跨越全年的生命跃迁与机遇`,
      kicker: 'ANNUAL HOROSCOPE',
      career: `今年是确立个人行业地位与核心竞争力的关键之年。跳出舒适区、勇于承担更具挑战性的项目将为你带来质的飞跃。`,
      love: `感情生活将更加纯粹与成熟，学会放下对完美的执念，与真正同频的伴侣构建踏实温暖的长期共同体。`,
      wealth: `多元化收入渠道逐步成型，正财运势厚积薄发，重视稳健资产沉淀，警惕高风险投机。`,
      health: `重视身心整体调养，建立长效健康管理机制，精神世界将愈发从容通透。`,
      luckyColor: s.luckyColor,
      luckyNum: s.luckyNum,
      noble: s.nobleSigns.join('、'),
      yi: ['确立主航道', '构建信任网络', '沉淀核心资产', '向内探索自我'],
      ji: ['浮躁焦虑', '透支信誉', '半途而废', '自我设限']
    }
  };

  const curGuide = guides[period] || guides.today;
  return {
    baseScore,
    careerScore,
    loveScore,
    wealthScore,
    healthScore,
    mood,
    ...curGuide
  };
}

/* ============================================================
   主工具对象定义 · 星座助手
   ============================================================ */
export const horoscope = {
  id: 'horoscope',
  name: '星座助手',
  cat: '西方大师',
  icon: '星',
  desc: '十二星座 12x12 契合度速配合盘、元素动力学相处指南与全景心理学图鉴。',

  open(container) {
    const ctx = getCtx();
    let userBD = (ctx && ctx._input && ctx._input.bd_raw) || (ctx && ctx._input && ctx._input.bd) || '1995-06-15';
    let [by, bm, bd] = userBD.split('-').map(Number);
    if (!bm || !bd) { bm = 6; bd = 15; }

    const S = {
      activeTab: 'synastry', // 'synastry' | 'compendium'
      sunSign: getSunSignByDate(bm, bd),
      partnerSign: SIGNS[(SIGNS.findIndex(s => s.id === getSunSignByDate(bm, bd).id) + 4) % 12],
      selectedCatalogSign: getSunSignByDate(bm, bd),
      elemFilter: 'all', // 'all' | 'fire' | 'earth' | 'air' | 'water'
    };

    /* —— 渲染主框架 —— */
    const render = () => {
      container.innerHTML =
        masthead(horoscope, { sub: horoscope.desc }) +
        // 顶部两大核心功能导航 Tabs (纯 SVG 矢量微标)
        '<div class="tw-t-nav">' +
          '<button type="button" class="tw-t-nav-btn' + (S.activeTab === 'synastry' ? ' active' : '') + '" data-tab="synastry"><svg viewBox="0 0 24 24" width="15" height="15" class="w-svg-ic" style="vertical-align:-2px;margin-right:4px;color:currentColor" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M 12 20 C 12 20 4 15 4 9 C 4 6 6 4 9 4 C 10.8 4 12 5.2 12 5.2 C 12 5.2 13.2 4 15 4 C 18 4 20 6 20 9 C 20 15 12 20 12 20 Z"/></svg>星座速配合盘</button>' +
          '<button type="button" class="tw-t-nav-btn' + (S.activeTab === 'compendium' ? ' active' : '') + '" data-tab="compendium"><svg viewBox="0 0 24 24" width="15" height="15" class="w-svg-ic" style="vertical-align:-2px;margin-right:4px;color:currentColor" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M 4 19.5 C 4 17 6 17 12 17 C 18 17 20 17 20 19.5 M 4 4.5 C 4 7 6 7 12 7 C 18 7 20 7 20 4.5 M 4 4.5 L 4 19.5 M 20 4.5 L 20 19.5 M 12 7 L 12 17"/></svg>12星座图鉴</button>' +
        '</div>' +
        '<div class="tw-h-body" id="twHBody"></div>';

      container.querySelectorAll('.tw-t-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          S.activeTab = btn.dataset.tab;
          render();
        });
      });

      const body = container.querySelector('#twHBody');
      if (!body) return;

      if (S.activeTab === 'synastry') renderSynastryTab(body);
      else renderCompendiumTab(body);
    };

    /* ============================================================
       Tab 1: 星座合盘速配 (Zodiac Synastry)
       ============================================================ */
    const renderSynastryTab = (el) => {
      const sA = S.sunSign;
      const sB = S.partnerSign;
      const match = getCompatibility(sA, sB);

      const gaugeHtml = (score, tag, tone) => {
        const r = 46, c = 2 * Math.PI * r;
        return '<div class="tw-h-gauge-box">' +
          '<svg viewBox="0 0 110 110" class="gauge-svg">' +
            '<circle cx="55" cy="55" r="' + r + '" fill="none" stroke="var(--tw-line-2)" stroke-width="9"/>' +
            '<circle cx="55" cy="55" r="' + r + '" fill="none" stroke="' + tone + '" stroke-width="9" stroke-linecap="round" ' +
              'stroke-dasharray="' + (c * score / 100) + ' ' + c + '" style="transition:stroke-dasharray .6s ease"/></svg>' +
          '<div class="center">' +
            '<div class="score" style="color:' + tone + '">' + score + '<small>%</small></div>' +
            '<div class="tag">' + tag.split(' · ')[0] + '</div>' +
          '</div>' +
        '</div>';
      };

      el.innerHTML =
        // 双方星座选择选择器
        '<div class="tw-h-synastry-picker">' +
          '<div class="pick-box">' +
            '<label>我的星座</label>' +
            '<select id="twHSynMe">' +
              SIGNS.map(s => '<option value="' + s.id + '"' + (s.id === sA.id ? ' selected' : '') + '>' + s.name + ' (' + s.en + ')</option>').join('') +
            '</select>' +
          '</div>' +
          '<div class="vs-heart"><svg viewBox="0 0 24 24" width="18" height="18" class="w-svg-ic" style="color:var(--tw-accent)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M 13 2 L 4 14 L 11 14 L 11 22 L 20 10 L 13 10 Z"/></svg></div>' +
          '<div class="pick-box">' +
            '<label>对方星座</label>' +
            '<select id="twHSynOther">' +
              SIGNS.map(s => '<option value="' + s.id + '"' + (s.id === sB.id ? ' selected' : '') + '>' + s.name + ' (' + s.en + ')</option>').join('') +
            '</select>' +
          '</div>' +
        '</div>' +

        // 契合度总览仪表卡
        '<div class="tw-h-synastry-hero">' +
          gaugeHtml(match.score, match.tag, match.tone) +
          '<div class="hero-info">' +
            '<div class="pair-title">' + sA.name + ' <span class="mul">×</span> ' + sB.name + '</div>' +
            '<div class="pair-badge" style="color:' + match.tone + ';border-color:' + match.tone + '">' + match.tag + '</div>' +
            '<div class="scores-row">' +
              '<div class="s-it"><span class="k">心动契合</span><b>' + match.loveScore + '%</b></div>' +
              '<div class="s-it"><span class="k">职场协作</span><b>' + match.workScore + '%</b></div>' +
              '<div class="s-it"><span class="k">沟通共鸣</span><b>' + match.talkScore + '%</b></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // 元素动力学与相处指南
        '<div class="tw-h-card">' +
          '<div class="tw-h-card-hd"><b>元素动力学解析</b><span class="sub">' + sA.elem + '象 (' + sA.name + ') 遇上 ' + sB.elem + '象 (' + sB.name + ')</span></div>' +
          '<p class="tw-h-desc">' + match.dynamicDesc + '</p>' +
        '</div>' +

        '<div class="tw-h-card">' +
          '<div class="tw-h-card-hd"><b>相处与实战指南</b></div>' +
          '<div class="tw-h-rows">' +
            '<div class="it"><b>恋爱与情感：</b><span>' + match.loveAdvice + '</span></div>' +
            '<div class="it"><b>事业与合作：</b><span>' + match.workAdvice + '</span></div>' +
            '<div class="it"><b>分歧破冰法：</b><span>' + match.frictionBreak + '</span></div>' +
          '</div>' +
        '</div>' +

        // 底部操作
        '<div class="tw-actions">' +
          '<button type="button" class="tw-btn tw-btn-primary" id="twHShareSyn">✦ 生成合盘卡片</button>' +
        '</div>' +
        '<div class="tw-ai-mount" id="twHAIMount"></div>' +
        notice('<b>提示：</b>星座速配揭示天然的互动模式与性格潜在磨合点。决定感情与合作长久的是真诚沟通、边界尊重与共同担当。');

      // 事件
      el.querySelector('#twHSynMe')?.addEventListener('change', e => {
        S.sunSign = SIGN_MAP[e.target.value] || SIGNS[0];
        render();
      });
      el.querySelector('#twHSynOther')?.addEventListener('change', e => {
        S.partnerSign = SIGN_MAP[e.target.value] || SIGNS[0];
        render();
      });

      // 生成合盘卡
      el.querySelector('#twHShareSyn')?.addEventListener('click', async () => {
        const btn = el.querySelector('#twHShareSyn');
        btn.disabled = true; btn.textContent = '生成中…';
        try {
          const { renderShareCard, exportShareCard } = await import('../share/card.js');
          const card = renderShareCard({
            kicker: '星座助手 · 星座契合度合盘',
            title: sA.name + ' × ' + sB.name,
            sub: '综合契合度 ' + match.score + '% ｜ ' + match.tag,
            badge: match.tag.split(' · ')[0],
            rows: [
              { k: '恋爱心动', v: match.loveScore + '% ｜ ' + match.loveAdvice },
              { k: '职场协作', v: match.workScore + '% ｜ ' + match.workAdvice },
              { k: '分歧破冰', v: match.frictionBreak },
            ],
            quote: match.dynamicDesc,
            foot: '合盘结果仅供相处参考，真诚沟通是良好关系的基石。'
          });
          exportShareCard(card, '问问大师_合盘_' + sA.name + '_' + sB.name);
        } catch (err) {
          console.error(err);
        }
        btn.disabled = false; btn.textContent = '✦ 生成合盘卡片';
      });

      // AI 解读挂载
      const aiSlot = el.querySelector('#twHAIMount');
      if (aiSlot) {
        attachToolAI({
          root: el,
          typeLabel: '星座助手 · 合盘分析',
          getSource: () => {
            return ;
          },
          slot: aiSlot,
          extraSystem: '你是一位资深情感咨询与星座合盘大师。请围绕双方星座性格、互动特质及具体困扰，给出兼具心理学深度与现实可行性的沟通建议。'
        });
      }
    };

    /* ============================================================
       Tab 2: 12星座全景图鉴 (Compendium)
       ============================================================ */
    const renderCompendiumTab = (el) => {
      const filtered = S.elemFilter === 'all' ? SIGNS : SIGNS.filter(s => s.elemKey === S.elemFilter);
      const sel = S.selectedCatalogSign || SIGNS[0];

      el.innerHTML =
        // 元素过滤器 (纯 SVG 矢量微标)
        '<div class="tw-h-catalog-filter">' +
          ['all:全部星座', 'fire:火象星座', 'earth:土象星座', 'air:风象星座', 'water:水象星座'].map(p => {
            const [k, label] = p.split(':');
            return '<button type="button" class="tw-h-filter-btn' + (S.elemFilter === k ? ' active' : '') + '" data-elem="' + k + '">' + label + '</button>';
          }).join('') +
        '</div>' +

        // 12星座网格矩阵 (纯 SVG 矢量微标)
        '<div class="tw-h-catalog-grid">' +
          filtered.map(s =>
            '<div class="tw-h-cat-tile' + (s.id === sel.id ? ' sel' : '') + '" data-sign="' + s.id + '">' +
              '<div class="sym" style="color:' + s.color + '">' + getZodiacSvg(s.id, 28, s.color) + '</div>' +
              '<div class="name">' + s.name + '</div>' +
              '<div class="date">' + s.date + '</div>' +
              '<div class="elem">' + s.elem + '象 · ' + s.mode + '</div>' +
            '</div>'
          ).join('') +
        '</div>' +

        // 当前选中星座的深度全景档案
        '<div class="tw-h-detail-card" style="border-top: 3px solid ' + sel.color + '">' +
          '<div class="detail-hd">' +
            '<span class="symbol" style="color:' + sel.color + '">' + getZodiacSvg(sel.id, 36, sel.color) + '</span>' +
            '<div class="title-wrap">' +
              '<h3>' + sel.name + ' <small>' + sel.en + ' (' + sel.date + ')</small></h3>' +
              '<div class="meta-tag">' + sel.elem + '象星座 ｜ ' + sel.mode + '形态 ｜ 守护星：' + sel.ruler + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="detail-quick">' +
            '<div><b>幸运色：</b><span>' + sel.luckyColor + '</span></div>' +
            '<div><b>幸运数：</b><span>' + sel.luckyNum + '</span></div>' +
            '<div><b>幸运宝石：</b><span>' + sel.stone + '</span></div>' +
            '<div><b>贵人星座：</b><span>' + sel.nobleSigns.join('、') + '</span></div>' +
          '</div>' +
          '<div class="tw-h-prose" style="margin-top:14px">' +
            '<p><b>性格画像：</b>' + sel.summary + '</p>' +
            '<p><b>核心优势：</b>' + sel.strength + '</p>' +
            '<p><b>成长盲区：</b>' + sel.blindSpot + '</p>' +
            '<p><b>事业方向：</b>' + sel.career + '</p>' +
            '<p><b>恋爱特质：</b>' + sel.love + '</p>' +
          '</div>' +
        '</div>' +

        '<div class="tw-actions">' +
          '<button type="button" class="tw-btn tw-btn-primary" id="twHUseAsMySign">设为我的主星 →</button>' +
        '</div>';

      // 绑定筛选
      el.querySelectorAll('[data-elem]').forEach(btn => {
        btn.addEventListener('click', () => {
          S.elemFilter = btn.dataset.elem;
          renderCompendiumTab(el);
        });
      });

      // 绑定点击星座卡片
      el.querySelectorAll('[data-sign]').forEach(tile => {
        tile.addEventListener('click', () => {
          const sid = tile.dataset.sign;
          S.selectedCatalogSign = SIGN_MAP[sid] || SIGNS[0];
          renderCompendiumTab(el);
        });
      });

      // 设为主星
      el.querySelector('#twHUseAsMySign')?.addEventListener('click', () => {
        S.sunSign = S.selectedCatalogSign;
        S.activeTab = 'synastry';
        render();
        showToast('已切换主星为「' + S.sunSign.name + '」');
      });
    };

    render();
  }
};

export default horoscope;
