/* ============================================================
   梅花易数 · 完整版
   ============================================================ */

const GUA_NAME = ['乾','兑','离','震','巽','坎','艮','坤'];
const GUA_SYM  = ['☰','☱','☲','☳','☴','☵','☶','☷'];
const GUA_WX   = ['金','金','火','木','木','水','土','土'];
const GUA_LINE = [[1,1,1],[1,1,0],[1,0,1],[0,0,1],[1,1,0],[0,1,0],[1,0,0],[0,0,0]];

/* 64 卦名（上卦索引 × 8 + 下卦索引） */
const HEX_NAME = [
  '乾为天','泽天夬','火天大有','雷天大壮','风天小畜','水天需','山天大畜','地天泰',
  '天泽履','兑为泽','火泽睽','雷泽归妹','风泽中孚','水泽节','山泽损','地泽临',
  '天火同人','泽火革','离为火','雷火丰','风火家人','水火既济','山火贲','地火明夷',
  '天雷无妄','泽雷随','火雷噬嗑','震为雷','风雷益','水雷屯','山雷颐','地雷复',
  '天风姤','泽风大过','火风鼎','雷风恒','巽为风','水风井','山风蛊','地风升',
  '天水讼','泽水困','火水未济','雷水解','风水涣','坎为水','山水蒙','地水师',
  '天山遁','泽山咸','火山旅','雷山小过','风山渐','水山蹇','艮为山','地山谦',
  '天地否','泽地萃','火地晋','雷地豫','风地观','水地比','山地剥','坤为地'
];

/* 简短卦意（用于梅花速断参考） */
const HEX_HINT = {
  '乾为天':'刚健进取，自强不息','泽天夬':'决断突破，以正化邪','火天大有':'丰收富足，众望所归',
  '雷天大壮':'气势正盛，需防过刚','风天小畜':'积蓄能量，暂不宜急进','水天需':'等待时机，从容应对',
  '山天大畜':'厚积薄发，先蓄后放','地天泰':'天地交泰，通达顺利','天泽履':'谨慎行事，如履薄冰',
  '兑为泽':'愉悦交流，以和为贵','火泽睽':'意见分歧，求同存异','雷泽归妹':'随缘不强求，循序渐进',
  '风泽中孚':'诚信感人，以心换心','水泽节':'节制有度，不过不及','山泽损':'有舍有得，先损后益',
  '地泽临':'临近进展，把握时机','天火同人':'志同道合，协力前行','泽火革':'变革更新，去旧迎新',
  '离为火':'光明在前，需防虚浮','雷火丰':'盛极将变，居安思危','风火家人':'齐家务实，先稳内部',
  '水火既济':'已有成就，谨防松懈','山火贲':'注重外表修饰，内实为本','地火明夷':'韬光养晦，蓄力待机',
  '天雷无妄':'顺其自然，不可妄动','泽雷随':'灵活跟随，相机而动','火雷噬嗑':'果断解决阻碍','震为雷':'行动果决，一鸣惊人',
  '风雷益':'上施下效，互利共赢','水雷屯':'起步艰难，坚持有成','山雷颐':'谨慎养生，自我充实','地雷复':'一阳来复，渐入佳境',
  '天风姤':'邂逅际遇，警惕诱惑','泽风大过':'力不从心，需减负前行','火风鼎':'革新体制，借力成事','雷风恒':'持久坚守，稳中有进',
  '巽为风':'顺势而为，灵活变通','水风井':'取之不竭，保持输出','山风蛊':'整顿积弊，知错能改','地风升':'步步提升，稳健上行',
  '天水讼':'纷争不利，退一步为佳','泽水困':'困境中求生，不气馁','火水未济':'尚未完成，继续努力','雷水解':'阻碍消除，豁然开朗',
  '风水涣':'涣散之势，需凝聚','坎为水':'险中有路，慎行为上','山水蒙':'启蒙学习，虚心求教','地水师':'以纪律行事，严于律己',
  '天山遁':'以退为进，暂避锋芒','泽山咸':'感应相通，彼此吸引','火山旅':'漂泊在外，谨慎交友','雷山小过':'小有过失，知止不殆',
  '风山渐':'循序渐进，不可冒进','水山蹇':'行路艰难，需借外力','艮为山':'止而不动，沉淀自省','地山谦':'谦逊受益，虚怀若谷',
  '天地否':'闭塞不通，韬光养晦','泽地萃':'聚集资源，团结协作','火地晋':'光明上升，事业有进','雷地豫':'有准备的欢乐，先劳后逸',
  '风地观':'仔细观察，审时度势','水地比':'亲近比附，择善而从','山地剥':'剥落之象，低调守成','坤为地':'厚德载物，顺势而行'
};

function _findGua(lines) {
  return GUA_LINE.findIndex(g => g[0] === lines[0] && g[1] === lines[1] && g[2] === lines[2]);
}

function _hexName(upperIdx, lowerIdx) {
  return HEX_NAME[upperIdx * 8 + lowerIdx] || (GUA_NAME[upperIdx] + GUA_NAME[lowerIdx]);
}

/* 五行生克 */
const SHENG = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };
const KE    = { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' };

function _tiYongRelation(tiWx, yongWx) {
  if (tiWx === yongWx) return { label: '比和', desc: '体用同气，事情按原有节奏推进，平和稳定。', score: 'neutral' };
  if (SHENG[yongWx] === tiWx) return { label: '用生体', desc: '外部条件主动扶助自己，有贵人或资源注入。', score: 'good' };
  if (SHENG[tiWx] === yongWx) return { label: '体生用', desc: '自身精力向外输出，需注意消耗过度。', score: 'caution' };
  if (KE[yongWx] === tiWx) return { label: '用克体', desc: '外部压力较明显，宜先稳固自身基础。', score: 'bad' };
  if (KE[tiWx] === yongWx) return { label: '体克用', desc: '有主动掌控力，利于推进但避免用力过猛。', score: 'good' };
  return { label: '平', desc: '内外关系平常，以具体行动和现实条件为准。', score: 'neutral' };
}

function mkMh(b) {
  const yearNum = b.Y.zi + 1;
  const monthNum = ((b.M.zi - 1) % 12) + 1;
  const dayNum = (b.dj % 30) + 1;
  const hourNum = b.H.zi + 1;

  // 起卦
  const un = (yearNum + monthNum + dayNum) % 8 || 8;        // 上卦数
  const ln2 = (yearNum + monthNum + dayNum + hourNum) % 8 || 8; // 下卦数
  const cl = (yearNum + monthNum + dayNum + hourNum) % 6 || 6;  // 动爻

  const ui = (un - 1) % 8;   // 上卦索引
  const li = (ln2 - 1) % 8;  // 下卦索引

  // 本卦六爻 (下3 + 上3)
  const hex = [...GUA_LINE[li], ...GUA_LINE[ui]];

  // 变卦：动爻变阴阳
  const chg = [...hex];
  chg[cl - 1] = chg[cl - 1] ? 0 : 1;
  const mui = Math.max(0, _findGua(chg.slice(3)));  // 变卦上卦
  const mli = Math.max(0, _findGua(chg.slice(0, 3))); // 变卦下卦

  // 互卦：2-3-4爻为下互，3-4-5爻为上互
  const huLower = [hex[1], hex[2], hex[3]];
  const huUpper = [hex[2], hex[3], hex[4]];
  const hui = Math.max(0, _findGua(huUpper));
  const hli = Math.max(0, _findGua(huLower));

  // 体卦/用卦判定：动爻在下卦(1-3)→下为用、上为体；动爻在上卦(4-6)→上为用、下为体
  const tiIsUpper = cl <= 3;  // 动在下卦→下为用→上为体
  const tiIdx = tiIsUpper ? ui : li;
  const yongIdx = tiIsUpper ? li : ui;
  const tiWx = GUA_WX[tiIdx];
  const yongWx = GUA_WX[yongIdx];

  // 体用关系
  const tyRel = _tiYongRelation(tiWx, yongWx);

  // 本卦名、变卦名
  const benName = _hexName(ui, li);
  const bianName = _hexName(mui, mli);
  const huName = _hexName(hui, hli);

  // 卦意
  const benHint = HEX_HINT[benName] || '';
  const bianHint = HEX_HINT[bianName] || '';

  return {
    // 上下卦
    ug: GUA_SYM[ui] + ' ' + GUA_NAME[ui],
    lg: GUA_SYM[li] + ' ' + GUA_NAME[li],
    ul: GUA_LINE[ui],
    ll: GUA_LINE[li],
    ue: GUA_WX[ui],
    le: GUA_WX[li],

    // 动爻
    cl,

    // 变卦
    mu: GUA_SYM[mui] + ' ' + GUA_NAME[mui],
    ml: GUA_SYM[mli] + ' ' + GUA_NAME[mli],
    mue: GUA_WX[mui],
    mle: GUA_WX[mli],

    // 互卦
    hu: GUA_SYM[hui] + ' ' + GUA_NAME[hui],
    hl: GUA_SYM[hli] + ' ' + GUA_NAME[hli],
    hue: GUA_WX[hui],
    hle: GUA_WX[hli],
    huUpper,
    huLower,

    // 体用
    ti: GUA_SYM[tiIdx] + ' ' + GUA_NAME[tiIdx],
    tiWx,
    yong: GUA_SYM[yongIdx] + ' ' + GUA_NAME[yongIdx],
    yongWx,
    tyRel,

    // 卦名与卦意
    benName,
    bianName,
    huName,
    benHint,
    bianHint,
  };
}

export { mkMh };
