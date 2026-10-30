/* 星座查询、配对与运势模板；不依赖工具 UI。 */
import { SIGNS } from './zodiac-data.js';
import { calcJulianDay, calcMoonLongitude } from './western.js';
export { SIGNS };

/* —— 辅助字典索引 —— */
export const SIGN_MAP = Object.fromEntries(SIGNS.map(s => [s.id, s]));
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
  // 与本命盘引擎同源(calcMoonLongitude,含六项摄动,精度 ~0.5°):
  // 取当日中国标准时间正午的月亮真黄经定星座。
  // 旧版为 2000-01-01 基准的匀速线性估算,偏差可达 ±6°(约 1/5 星座),
  // 且与西方星盘显示的月座互相矛盾(2026-10 算法验证修复)。
  const jd = calcJulianDay(y, m, d, 12, 0, 8);
  const moonIdx = Math.floor(calcMoonLongitude(jd) / 30) % 12;
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
      title: `${s.name} · 今日星座参考`,
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
      title: `${s.name} · 本周星座参考`,
      sub: `本周主题 · 参考分 ${baseScore} 分`,
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
      title: `${s.name} · 本月星座参考`,
      sub: `${y}年${m}月主题指南`,
      kicker: 'MONTHLY FORECAST',
      career: `可以盘点已积累的经验与资源，选择一个有把握的方向持续推进。`,
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
      title: `${s.name} · ${y} 年度星座参考`,
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
