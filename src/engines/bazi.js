/**
 * 四柱八字核心引擎(纯函数,不触碰 DOM)
 *
 * 提供:排盘(mkBazi)、五行旺衰与用神(mkWx)、十神(mkSs)、神煞(mkShenSha)、
 *       大运(mkDy)、流年(mkLn)、流月(getLiuYue)、干支作用关系标签(getShenShaLabels)、
 *       今日干支(getTodayGZ)。
 *
 * 算法正确性由 tools/verify-bazi-v2.mjs(118 项)与 tools/verify-bazi-v3.mjs(123 项)
 * 交叉验证兜底;任何改动须保持两套验证全绿。
 *
 * 本文件由早期压缩风格源码展开重构而来,导出签名与返回结构与重构前完全一致。
 */
import { TG, DZ, SX, WX, NY, GW, ZW, ZC, SS } from './shared.js';
import { jqDate, getMonthPillar, getDayPillarIndex } from './calendar.js';

/* ============================================================
 * 常量表
 * ============================================================ */

/** 五虎遁(年上起月干):甲己之年丙作首[2]、乙庚之岁戊为头[4]、
 *  丙辛必定寻庚起[6]、丁壬壬位顺行流[8]、戊癸甲寅之上求[0]。
 *  以年干序号 % 5 索引,得到正月(寅月)的天干起点。 */
const MONTH_GAN_BASE = [2, 4, 6, 8, 0];

/** 五鼠遁(日上起时干):甲己还加甲[0]、乙庚丙作初[2]、丙辛从戊起[4]、
 *  丁壬庚子居[6]、戊癸壬子是真途[8]。
 *  以日干序号 % 5 索引,得到子时的天干起点。 */
const HOUR_GAN_BASE = [0, 2, 4, 6, 8];

/** 五行相生:木→火→土→金→水→木 */
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
/** 五行相克:木克土、火克金、土克水、金克木、水克火 */
const KE = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
/** 五行之母(生我者):木←水、火←木、土←火、金←土、水←金 */
const MOTHER = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
/** 五行之侮(克我者):木←金、火←水、土←木、金←火、水←土 */
const OVERCOMER = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' };

/** 旬空表:按日柱所在旬(60 甲子 index / 10)取该旬缺失的两个地支。
 *  甲子旬戌亥空、甲戌旬申酉空、甲申旬午未空、
 *  甲午旬辰巳空、甲辰旬寅卯空、甲寅旬子丑空。 */
const XUN_KONG = {
  0: [10, 11], // 甲子旬 → 戌亥
  1: [8, 9],   // 甲戌旬 → 申酉
  2: [6, 7],   // 甲申旬 → 午未
  3: [4, 5],   // 甲午旬 → 辰巳
  4: [2, 3],   // 甲辰旬 → 寅卯
  5: [0, 1],   // 甲寅旬 → 子丑
};

/** 桃花(咸池,以日支查):申子辰见酉、寅午戌见卯、巳酉丑见午、亥卯未见子 */
const TAOHUA_MAP = {
  子: '酉', 丑: '午', 寅: '卯', 卯: '子', 辰: '酉', 巳: '午',
  午: '卯', 未: '子', 申: '酉', 酉: '午', 戌: '卯', 亥: '子',
};

/** 驿马(以日支查):申子辰马在寅、寅午戌马在申、巳酉丑马在亥、亥卯未马在巳 */
const YIMA_MAP = {
  子: '寅', 丑: '亥', 寅: '申', 卯: '巳', 辰: '寅', 巳: '亥',
  午: '申', 未: '巳', 申: '寅', 酉: '亥', 戌: '申', 亥: '巳',
};

/** 天乙贵人(以日干查):甲戊庚牛羊、乙己鼠猴乡、丙丁猪鸡位、
 *  壬癸兔蛇藏、六辛逢马虎 */
const TIANYI_MAP = {
  甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申',
  丙: '亥酉', 丁: '亥酉', 壬: '卯巳', 癸: '卯巳', 辛: '午寅',
};

/** 文昌贵人(以日干查):甲巳乙午丙戊申、丁己酉、庚亥辛子壬寅癸卯 */
const WENCHANG_MAP = {
  甲: '巳', 乙: '午', 丙: '申', 戊: '申', 丁: '酉',
  己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
};

/** 将星(以日支查):申子辰见子、寅午戌见午、巳酉丑见酉、亥卯未见卯 */
const JIANGXING_MAP = {
  子: '子', 丑: '酉', 寅: '午', 卯: '卯', 辰: '子', 巳: '酉',
  午: '午', 未: '卯', 申: '子', 酉: '酉', 戌: '午', 亥: '卯',
};

/** 华盖(以日支查):申子辰见辰、寅午戌见戌、巳酉丑见丑、亥卯未见未 */
const HUAGAI_MAP = {
  子: '辰', 丑: '丑', 寅: '戌', 卯: '未', 辰: '辰', 巳: '丑',
  午: '戌', 未: '未', 申: '辰', 酉: '丑', 戌: '戌', 亥: '未',
};

/** 红艳煞(以日干查) */
const HONGYAN_MAP = {
  甲: '午', 乙: '午', 丙: '寅', 丁: '未', 戊: '辰',
  己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申',
};

/** 羊刃(以日干查,禄前一位;阴干刃依一家之说):
 *  甲卯、乙寅、丙戊午、丁己巳、庚酉、辛申、壬子、癸亥 */
const YANGREN_MAP = {
  甲: '卯', 乙: '寅', 丙: '午', 丁: '巳', 戊: '午',
  己: '巳', 庚: '酉', 辛: '申', 壬: '子', 癸: '亥',
};

/** 魁罡日:仅庚辰、庚戌、壬辰、戊戌四日 */
const KUIGANG_DAYS = ['庚辰', '庚戌', '壬辰', '戊戌'];

/* 地支作用关系(用于 getShenShaLabels) */
const CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const HAI   = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
const LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const PO    = { 子: '酉', 酉: '子', 丑: '辰', 辰: '丑', 寅: '亥', 亥: '寅', 卯: '午', 午: '卯', 巳: '申', 申: '巳', 未: '戌', 戌: '未' };
const ZIXING = { 辰: '辰', 午: '午', 酉: '酉', 亥: '亥' }; // 自刑:辰午酉亥

/** 十二流月名(以寅月为正月) */
const LIUYUE_NAMES = [
  '寅月(正月)', '卯月(二月)', '辰月(三月)', '巳月(四月)',
  '午月(五月)', '未月(六月)', '申月(七月)', '酉月(八月)',
  '戌月(九月)', '亥月(十月)', '子月(冬月)', '丑月(腊月)',
];

/** 十二节(每月起始之节,用于流月与大运起运计算) */
const JIE_NAMES = [
  '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
];

/* ============================================================
 * 排盘
 * ============================================================ */

/**
 * 排四柱八字。
 * @param {number} y  公历年
 * @param {number} m  公历月(1-12)
 * @param {number} d  公历日
 * @param {number} hourZhi 时辰地支序号(0=子 … 11=亥)
 * @param {number} [hour=12]   出生小时(用于节气边界的月柱精算)
 * @param {number} [minute=0]  出生分钟
 * @param {Date|null} [birthInstant=null] 精确出生时刻(配合真太阳时校正)
 * @returns {{Y:object,M:object,D:object,H:object,dj:number,ny:string,sx:string}}
 *   四柱各含 {g 天干,z 地支,gi 干序,zi 支序};dj=日柱 60 甲子序号;
 *   ny=年柱纳音;sx=生肖。
 */
function mkBazi(y, m, d, hourZhi, hour = 12, minute = 0, birthInstant = null) {
  // 月柱由节气精算(含时分与真太阳时),返回 {yp 年干支纪年, mi 月序号(0=寅)}
  const mp = getMonthPillar(y, m, d, hour, minute, 0, birthInstant);

  // 年柱:公元 4 年为甲子年 → (年-4) % 10 天干、% 12 地支(取正余数)
  const yp = mp.yp;
  const yearGanIdx = ((yp - 4) % 10 + 10) % 10;
  const yearZhiIdx = ((yp - 4) % 12 + 12) % 12;

  // 月柱:地支 = 月序号 + 寅(2);天干按五虎遁从年干推出
  const monthZhiIdx = (mp.mi + 2) % 12;
  const monthGanIdx = (MONTH_GAN_BASE[yearGanIdx % 5] + mp.mi) % 10;

  // 日柱:由儒略日推算的 60 甲子序号拆分干支
  const dayJiaziIdx = getDayPillarIndex(y, m, d);
  const dayGanIdx = dayJiaziIdx % 10;
  const dayZhiIdx = dayJiaziIdx % 12;

  // 时柱:地支为入参时辰,天干按五鼠遁从日干推出
  const hourGanIdx = (HOUR_GAN_BASE[dayGanIdx % 5] + hourZhi) % 10;

  // 纳音与生肖均随年柱
  const nayinIdx = ((yp - 4) % 60 + 60) % 60;

  return {
    Y: { g: TG[yearGanIdx], z: DZ[yearZhiIdx], gi: yearGanIdx, zi: yearZhiIdx },
    M: { g: TG[monthGanIdx], z: DZ[monthZhiIdx], gi: monthGanIdx, zi: monthZhiIdx },
    D: { g: TG[dayGanIdx], z: DZ[dayZhiIdx], gi: dayGanIdx, zi: dayZhiIdx },
    H: { g: TG[hourGanIdx], z: DZ[hourZhi], gi: hourGanIdx, zi: hourZhi },
    dj: dayJiaziIdx,
    ny: NY[nayinIdx],
    sx: SX[yearZhiIdx],
  };
}

/* ============================================================
 * 五行旺衰与用神
 * ============================================================ */

/**
 * 五行力量统计与旺衰/用神判定。
 * 计分法:天干与地支本气各 +1;地支藏干按主气 0.6、中气 0.3、余气 0.1 加权;
 * 月令得令 +2(月支同日主或生扶日主)、休囚 +0.5(日主生月支)、失令 0。
 * 身旺判定:我方(同我+生我+得令分) >= 他方(余量 + 失令补偿分) × 0.85。
 * 取用:身旺 → 用神=我生者(泄秀)、喜神=我克者(财);
 *       身弱 → 用神=生我者(印)、喜神=同我者(比劫)。
 * @param {object} b mkBazi 的返回值
 */
function mkWx(b) {
  const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  // 四天干计分
  [b.Y.g, b.M.g, b.D.g, b.H.g].forEach((g) => { counts[GW[g]] += 1; });
  // 四地支本气计分
  [b.Y.z, b.M.z, b.D.z, b.H.z].forEach((z) => { counts[ZW[z]] += 1; });
  // 四地支藏干加权计分:主气 0.6 / 中气 0.3 / 余气 0.1
  [b.Y.z, b.M.z, b.D.z, b.H.z].forEach((z) => {
    const hidden = ZC[z];
    if (hidden[0]) counts[GW[hidden[0]]] += 0.6;
    if (hidden[1]) counts[GW[hidden[1]]] += 0.3;
    if (hidden[2]) counts[GW[hidden[2]]] += 0.1;
  });

  const dayWx = GW[b.D.g]; // 日主五行

  // 最强/最弱五行(并列时按 木火土金水 顺序取先者)
  let strongest = '木';
  let weakest = '木';
  WX.forEach((x) => {
    if (counts[x] > counts[strongest]) strongest = x;
    if (counts[x] < counts[weakest]) weakest = x;
  });

  const total = Object.values(counts).reduce((a, v) => a + v, 0);

  // 得令分:月支同日主或生扶日主 → 2;日主生月支(泄气)→ 0.5;其余 → 0
  const monthWx = ZW[b.M.z];
  const deLing =
    (monthWx === dayWx || MOTHER[dayWx] === monthWx) ? 2 :
    (SHENG[dayWx] === monthWx ? 0.5 : 0);

  // 我方 = 同我 + 生我 + 得令分;他方 = 总量 - 我方基础 + (2 - 得令分)
  const selfPower = counts[dayWx] + counts[MOTHER[dayWx]] + deLing;
  const otherPower = total - counts[dayWx] - counts[MOTHER[dayWx]] + (2 - deLing);
  const shenWang = selfPower >= otherPower * 0.85; // 身旺?

  let yongShen; // 用神
  let xiShen;   // 喜神
  if (shenWang) {
    yongShen = SHENG[dayWx]; // 旺则泄之:我生者
    xiShen = KE[dayWx];      // 喜财:我克者
  } else {
    yongShen = MOTHER[dayWx]; // 弱则扶之:生我者(印)
    xiShen = dayWx;           // 喜比劫帮身
  }

  return {
    c: counts,
    dw: dayWx,
    st: shenWang,
    s: strongest,
    w: weakest,
    ys: yongShen,
    xs: xiShen,
    t: total,
    KE,
    SH: SHENG,
    BS: MOTHER,
    BK: OVERCOMER,
    deLing,
  };
}

/* ============================================================
 * 十神
 * ============================================================ */

/**
 * 以日干为中心推十神:年/月/时干直查,四支藏干逐一映射。
 * @param {object} b mkBazi 的返回值
 * @returns {{yg:string,mg:string,hg:string,yzc:Array,mzc:Array,dzc:Array,hzc:Array}}
 */
function mkSs(b) {
  const dayGan = b.D.g;
  const table = SS[dayGan]; // 十神对照表(见 shared.js,按五行生克+阴阳同异生成)
  const hiddenOf = (zhi) => ZC[zhi].map((g) => ({ g, s: table[g] }));
  return {
    yg: table[b.Y.g],
    mg: table[b.M.g],
    hg: table[b.H.g],
    yzc: hiddenOf(b.Y.z),
    mzc: hiddenOf(b.M.z),
    dzc: hiddenOf(b.D.z),
    hzc: hiddenOf(b.H.z),
  };
}

/* ============================================================
 * 神煞
 * ============================================================ */

/**
 * 神煞推算(以日柱为主查诸神煞)。
 * @param {object} b mkBazi 的返回值
 * @returns {Array<{n:string,v:string,t:string}>} 名目 / 值 / 释义
 */
function mkShenSha(b) {
  const result = [];
  const dayZhi = DZ[b.D.zi];
  const dayGan = TG[b.D.gi];
  const dayGZ = b.D.g + b.D.z;

  // 空亡:日柱所在旬缺失的两支
  const kongIdx = XUN_KONG[Math.floor(b.dj / 10)];
  if (kongIdx) {
    result.push({
      n: '空亡',
      v: DZ[kongIdx[0]] + DZ[kongIdx[1]],
      t: '日柱旬中空亡，多主漂泊、精神空虛，亦有机缘灵性',
    });
  }

  const pushByZhi = (name, map, tip) => {
    const v = map[dayZhi];
    if (v) result.push({ n: name, v, t: tip });
  };
  const pushByGan = (name, map, tip) => {
    const v = map[dayGan];
    if (v) result.push({ n: name, v, t: tip });
  };

  pushByZhi('桃花', TAOHUA_MAP, '人缘、感情、魅力之星');
  pushByZhi('驿马', YIMA_MAP, '变动、奔波、远行之星');
  pushByGan('天乙贵人', TIANYI_MAP, '逢凶化吉、贵人扶助');
  pushByGan('文昌', WENCHANG_MAP, '学业、功名、文艺之星');
  pushByZhi('将星', JIANGXING_MAP, '权威、领导、管理之星');
  pushByZhi('华盖', HUAGAI_MAP, '孤独、宗教、艺术、玄学之星');

  // 天医:月支前一位
  result.push({
    n: '天医',
    v: DZ[(b.M.zi + 11) % 12],
    t: '健康、医学、疗愈之星',
  });

  pushByGan('红艳', HONGYAN_MAP, '情感丰富、风流多情');

  // 魁罡:仅四日
  if (KUIGANG_DAYS.includes(dayGZ)) {
    result.push({ n: '魁罡', v: dayGZ, t: '刚烈、聪明、果断，女命逢之婚姻多波折' });
  }

  pushByGan('羊刃', YANGREN_MAP, '刚强、锐利、胆大，喜七杀配合');

  return result;
}

/* ============================================================
 * 大运
 * ============================================================ */

/**
 * 大运排盘。纯函数:出生年月日全部由参数传入,不读 DOM。
 * 规则:阳年男命 / 阴年女命顺排,反之逆排;
 *       起运岁数 = 距最近「节」的天数 ÷ 3(三天折一年,不足一岁按一岁);
 *       自月柱干支顺/逆推十步,每步十年。
 * @param {object} b  mkBazi 的返回值
 * @param {'male'|'female'} gn 性别
 * @param {number} y 出生公历年(m、d 用于按节气精确计算起运岁数 sa)
 * @param {number} m 出生公历月
 * @param {number} d 出生公历日
 * @returns {{ds:Array<{g:string,z:string,as:number,ae:number,ys:number,ye:number}>,sa:number}}
 */
function mkDy(b, gn, y, m, d) {
  const isYangYear = b.Y.gi % 2 === 0; // 年干为阳
  const isMale = gn === 'male';
  // 阳男阴女顺行,阴男阳女逆行
  const forward = (isYangYear && isMale) || (!isYangYear && !isMale);

  const birthYear = y;
  const birthMonth = m || 1;
  const birthDay = d || 1;
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

  // 在出生年(必要时相邻年)的十二节中,找距出生日最近的一个「节」:
  // 顺排取生日之后最近的节,逆排取生日之前最近的节
  const MS_PER_DAY = 86400000;
  let minDays = 365;
  for (let i = 0; i < 12; i++) {
    const jq = jqDate(birthYear, i);
    if (!jq) continue;
    const jqInBirthYear = new Date(birthYear, jq[0] - 1, jq[1]);

    if (forward) {
      let diff = Math.round((jqInBirthYear - birthDate) / MS_PER_DAY);
      if (diff <= 0) {
        // 该节在生日之前 → 看次年的同名节
        const jqNext = jqDate(birthYear + 1, i);
        if (jqNext) {
          diff = Math.round((new Date(birthYear + 1, jqNext[0] - 1, jqNext[1]) - birthDate) / MS_PER_DAY);
        }
      }
      if (diff > 0 && diff < minDays) minDays = diff;
    } else {
      let diff = Math.round((birthDate - jqInBirthYear) / MS_PER_DAY);
      if (diff <= 0) {
        // 该节在生日之后 → 看上一年的同名节
        const jqPrev = jqDate(birthYear - 1, i);
        if (jqPrev) {
          diff = Math.round((birthDate - new Date(birthYear - 1, jqPrev[0] - 1, jqPrev[1])) / MS_PER_DAY);
        }
      }
      if (diff > 0 && diff < minDays) minDays = diff;
    }
  }

  // 三天折一岁,起运至少一岁
  const startAge = Math.max(1, Math.round(minDays / 3));

  // 自月柱起顺/逆排十步大运
  const daYun = [];
  for (let i = 0; i < 10; i++) {
    const offset = forward ? (i + 1) : -(i + 1);
    daYun.push({
      g: TG[((b.M.gi + offset) % 10 + 10) % 10],
      z: DZ[((b.M.zi + offset) % 12 + 12) % 12],
      as: startAge + i * 10,       // 起岁
      ae: startAge + i * 10 + 9,   // 止岁
      ys: y + startAge + i * 10,   // 起年
      ye: y + startAge + i * 10 + 9, // 止年
    });
  }

  return { ds: daYun, sa: startAge };
}

/* ============================================================
 * 流年 / 流月
 * ============================================================ */

/**
 * 流年列表:当前年前 2 年至后 5 年,共 8 年。
 * @param {number} cy 当前公历年
 */
function mkLn(cy) {
  const list = [];
  for (let year = cy - 2; year <= cy + 5; year++) {
    const ganIdx = ((year - 4) % 10 + 10) % 10;
    const zhiIdx = ((year - 4) % 12 + 12) % 12;
    list.push({ y: year, g: TG[ganIdx], z: DZ[zhiIdx], sx: SX[zhiIdx] });
  }
  return list;
}

/**
 * 某公历年十二流月(寅月正月 → 丑月腊月):干支 + 当月起「节」的日期。
 * @param {number} year 公历年
 */
function getLiuYue(year) {
  const yearGanIdx = ((year - 4) % 10 + 10) % 10;
  // 五虎遁:正月(寅月)天干起点,逐月顺推
  const startGanIdx = (MONTH_GAN_BASE[yearGanIdx % 5] + 0) % 10;

  const result = [];
  for (let i = 0; i < 12; i++) {
    const ganIdx = (startGanIdx + i) % 10;
    const zhiIdx = (2 + i) % 12; // 寅(2) 起顺行
    const jq = jqDate(year, i);
    const jqStr = jq ? `${jq[0]}月${jq[1]}日${JIE_NAMES[i]}` : '';
    result.push({
      name: LIUYUE_NAMES[i],
      gz: TG[ganIdx] + DZ[zhiIdx],
      jq: jqStr,
    });
  }
  return result;
}

/* ============================================================
 * 干支作用关系标签(渲染层用)
 * ============================================================ */

/**
 * 四柱地支两两扫描,输出冲/害/合/破/自刑/三刑标签(含配色,供报告渲染)。
 * 注意:配色依赖 theme-claude.css 的 --c-* 变量,属渲染层约定。
 * @param {object} b mkBazi 的返回值
 */
function getShenShaLabels(b) {
  const labels = [];
  const zhiList = [b.Y.z, b.M.z, b.D.z, b.H.z];

  // 生成标签配色(基于主题 CSS 变量)
  const palette = (colorVar) => ({
    bg: `color-mix(in srgb,var(--c-${colorVar}) 12%,transparent)`,
    co: `var(--c-${colorVar})`,
    bd: `color-mix(in srgb,var(--c-${colorVar}) 26%,transparent)`,
  });
  const styleMap = {
    green: palette('green'),
    red: palette('red'),
    orange: palette('orange'),
    yellow: palette('yellow'),
  };

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const a = zhiList[i];
      const b2 = zhiList[j];
      if (CHONG[a] === b2) labels.push({ t: a + b2 + '·冲', ...styleMap.red });
      if (HAI[a] === b2) labels.push({ t: a + b2 + '·害', ...styleMap.orange });
      if (LIUHE[a] === b2) labels.push({ t: a + b2 + '·合', ...styleMap.green });
      if (PO[a] === b2) labels.push({ t: a + b2 + '·破', ...styleMap.yellow });
      if (ZIXING[a] === b2) labels.push({ t: a + '·自刑', ...styleMap.red });
    }
  }

  // 三刑:寅巳申(无恩之刑)、丑戌未(恃势之刑)
  const zhiSet = new Set(zhiList);
  if (zhiSet.has('寅') && zhiSet.has('巳') && zhiSet.has('申')) {
    labels.push({ t: '寅巳申·三刑', ...styleMap.red });
  }
  if (zhiSet.has('丑') && zhiSet.has('戌') && zhiSet.has('未')) {
    labels.push({ t: '丑戌未·三刑', ...styleMap.red });
  }

  return labels;
}

/* ============================================================
 * 今日干支
 * ============================================================ */

/** 今日(本机时间)的年/月/日干支字符串,如「丙午年 丁酉月 戊申日」。 */
function getTodayGZ() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  const dayJiaziIdx = getDayPillarIndex(y, m, d);
  const dayGanIdx = dayJiaziIdx % 10;
  const dayZhiIdx = dayJiaziIdx % 12;

  const mp = getMonthPillar(y, m, d);
  const yp = mp.yp;
  const yearGanIdx = ((yp - 4) % 10 + 10) % 10;
  const yearZhiIdx = ((yp - 4) % 12 + 12) % 12;
  const monthZhiIdx = (mp.mi + 2) % 12;
  // 五虎遁:月干由年干推出
  const monthGanIdx = (MONTH_GAN_BASE[yearGanIdx % 5] + mp.mi) % 10;

  return TG[yearGanIdx] + DZ[yearZhiIdx] + '年 ' + TG[monthGanIdx] + DZ[monthZhiIdx] + '月 ' + TG[dayGanIdx] + DZ[dayZhiIdx] + '日';
}

export { mkBazi, mkWx, mkSs, mkShenSha, mkDy, mkLn, getLiuYue, getShenShaLabels, getTodayGZ };
