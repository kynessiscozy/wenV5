/* ============================================================
   12 answerbook · 答案之书（重构版）
   ------------------------------------------------------------
   保留原数据：三模式句库 + 五主题句池 + 关键词自动匹配
   + localStorage 收藏（tj_answerbook_saved_v2）。
   新形态：杂志风表单 → 翻书动画 → 二级结果页答案卡，
   收藏夹视图，分享卡。完全融入 tools2 组件体系。
   ============================================================ */
import { masthead, notice, esc, viewShell, goResult } from './runtime.js';

/* —— 原数据：三模式句库 —— */
const ANSWERS = {
  direct: [
    '可以，但先把第一步缩小到今天就能完成的程度。',
    '先别急着答应。把你真正担心的那一点说清楚。',
    '现在不需要证明什么，先选择让你更安稳的方向。',
    '答案在行动里，不在反复推演里。去做一次小验证。',
    '可以等一等；更完整的信息会让决定变得简单。',
    '这件事值得尝试，但请给自己留一个退出的边界。',
    '先完成，再优化。你不需要等到完全准备好。',
    '别把别人的节奏，当成自己的截止日期。',
    '把注意力放回你能控制的那一部分。',
    '今天的"暂不决定"，也是一个成熟的决定。',
    '先缓一缓。', '现在就开始。', '再给自己一点时间。', '可以试一次。', '先别急着回应。',
    '把边界讲清楚。', '先相信你的感受。', '不用立刻有答案。', '今天先到这里。', '别勉强自己。',
    '先做，再判断。', '保留一点余地。', '这不是你的全部。', '慢一点也没关系。', '先回到事实。',
    '值得认真对待。', '暂时不要承诺。', '去问一次就知道。', '把话说出来。', '先照顾自己。',
    '不必解释太多。', '允许事情自然发生。', '先完成眼前这一小步。', '选择让你安稳的。', '别替别人做决定。',
    '可以拒绝。', '再看一遍细节。', '先停下比较。', '答案会在路上出现。', '不要用疲惫做决定。',
    '试着换个角度。', '留意那个小小的犹豫。', '今天适合整理。', '先别把话说满。', '你有选择。',
    '把期待调低一点。', '先给自己一个期限。', '不需要马上证明。', '往轻松处走一步。', '这一次，听听自己。',
    '先做能让你睡个好觉的那个选择。', '把注意力从"别人会怎么想"那里拿回来。', '直觉已经给出方向，剩下的交给验证。',
    '可以松手，让事情按它的节奏来。', '今天不表态，也是一种表态。', '优先保护你的时间和精力。',
    '先分清楚：这是机会，还是噪音。', '答案需要一点新鲜空气，明天再看。', '不必完美，够用就好。', '允许自己改变主意。',
  ],
  action: [
    '给这件事 20 分钟，只做最小版本，然后再决定要不要继续。',
    '找一个真实的人或数据，验证你的第一个假设。',
    '写下最坏结果、可承受损失和退出条件。',
    '先完成一条消息、一个电话或一次预约，让事情开始流动。',
    '把它拆成三步，今天只处理最容易的一步。',
    '把"我应该"换成"我真正想要"，再写下一句答案。',
    '留出一晚再回复。情绪平稳后，答案会更准确。',
    '主动说出一个具体请求，而不是等待别人猜到。',
    '删掉一个不重要的待办，为真正重要的事腾出空间。',
    '给自己设一个小期限：48 小时内做一次现实验证。',
    '先喝口水，再开始。', '写下第一步。', '发出那条消息。', '做五分钟版本。', '关掉一个干扰。',
    '把时间留出来。', '先查一个真实信息。', '列出三个选项。', '预约一次沟通。', '完成一个小任务。',
    '把问题说具体。', '删掉一个待办。', '今天只推进一件事。', '问清楚截止日期。', '把预算写下来。',
    '睡一晚再回复。', '先收集证据。', '和可信的人聊聊。', '给自己设个提醒。', '把手机放远一点。',
    '先整理桌面。', '走十分钟。', '把需求写成一句话。', '先做一个样本。', '为自己留白。',
    '把想法发给一个人。', '先完成最难的五分钟。', '记录这次感受。', '把事情分成两半。', '先核对一次。',
    '拒绝一个不必要的安排。', '给对方一个明确时间。', '打开文档，写第一句。', '先做可逆的决定。', '把重要的放到上午。',
    '把钱和情绪分开看。', '先结束一个旧任务。', '把担心变成清单。', '只处理下一步。', '现在就预约。',
    '把选项写下来，划掉明显不合适的。', '给重要的人发一句"我想和你聊聊"。', '先处理那件拖了三天的旧事。',
    '把手机静音，专注二十五分钟。', '用一句话向自己复述问题，说清楚就成功一半。', '先做不需要勇气也能做的那部分。',
    '把决定拆成三步：先了解、再选择、后行动。', '去现场看一眼，别只看屏幕。', '把两个最可能的选项对比着写下来。', '今天就从待办里勾掉一格。',
  ],
  reflect: [
    '如果不需要向任何人解释，你还会这样选择吗？',
    '你在害怕失去什么，又在渴望靠近什么？',
    '这件事是让你更像自己，还是让你离自己更远？',
    '你想要的是答案，还是被允许去做那个选择？',
    '把"必须立刻解决"拿掉后，真正的问题还剩下什么？',
    '如果朋友处在同样的位置，你会怎样温柔地对他说？',
    '你可以不确定，但可以先诚实。',
    '此刻最需要被照顾的，是计划、关系，还是你自己？',
    '什么样的结果，会让你在三个月后仍觉得值得？',
    '你已经知道一部分答案了，只是还没把它说出口。',
    '什么让你迟迟不动？', '你真正想守住什么？', '这是谁的期待？', '你在等待谁的许可？', '如果不用害怕，会怎样？',
    '你想被怎样对待？', '哪里让你感到不安？', '你已经做得够多了吗？', '这件事值得你的精力吗？', '你是否忽略了自己？',
    '最小的诚实是什么？', '你在证明什么？', '什么可以先放下？', '你想靠近什么？', '什么让你觉得轻松？',
    '这真的是你的问题吗？', '你有没有给自己留空间？', '你想听见什么答案？', '你在逃避哪一个选择？', '这份执着在保护什么？',
    '如果今天不解决，会怎样？', '谁的声音最影响你？', '你需要的是结果还是陪伴？', '什么是你不能失去的？', '你愿意再试一次吗？',
    '什么时候的你最自在？', '你能对自己更温柔吗？', '这件事让你学会了什么？', '什么值得被慢慢完成？', '你是否把自己排在最后？',
    '你的身体在提醒什么？', '你还能相信什么？', '哪个选择更接近真实？', '如果可以重来，你会改什么？', '你想为谁而活？',
    '此刻，你最需要什么？', '你愿意相信自己吗？', '什么不是你的责任？', '哪里需要一个停顿？', '你想从这里带走什么？',
    '如果你完全不怕搞砸，你会怎么做？', '此刻的犹豫，在保护你免于什么？', '这个选择三个月后还重要吗？',
    '你更怕的是改变，还是错过？', '谁最受益于你的这个决定？', '你想成为的那个人，会怎么选？',
    '这件事里，哪一部分其实与你无关？', '你是在做决定，还是在拖延？', '什么如果失去，你会后悔没试过？', '一年后的你，会如何回忆此刻？',
  ],
};
const MODES = { direct: '直接回答', action: '行动线索', reflect: '内心提问' };

/* —— 原数据：主题句池 —— */
const THEME_POOLS = {
  career: {
    direct: ['可以试，但先想清楚这一步要换来什么。', '别急着答应，把关键条件落到纸面上。', '方向对，时机还没熟，先备粮再动。', '稳妥地过渡，比突然切换更好。', '这个机会值得谈，但保留你的退路。', '你等的不会自己来，去创造一个。', '眼前的事还有挖深的空间。', '变可以，但别在情绪高点变。', '先谈清楚条件，再谈情怀。', '答案在下一次面谈里，不在想象里。', '机会本身不贵，贵的是你为它让出的时间。', '先留在牌桌上，再想怎么赢。', '多数的好结果，都来自一次不完美的开始。', '薪资可以谈，但成长曲线更要紧。', '别让一时的行情，决定你十年的方向。', '先验证需求，再谈情怀。'],
    action: ['今晚把简历更新一页就好。', '约一位业内人喝咖啡，听真话。', '先接一个小任务，用作品试水。', '列出你在这份事里学到的三件事再决定走留。', '写下你想要的价码，大声念一遍。', '先确认你的储备能撑过六个月。', '在截止前，把那个细节再核对一次。', '本周先做出一个看得见的成果。', '把担忧写成一封三行的邮件，先不发。', '把最重要的谈话放在上午，别拖到晚上。', '把目标岗位的要求抄一遍，划出你已具备的。', '去招聘页看看，但不投，先摸行情。'],
    reflect: ['你想逃离的是这件事，还是这种生活？', '如果待遇一样，你还会选哪边？', '你怕的是变动，还是一直不变？', '这份焦虑里，有多少来自比较？', '别人的期待和你的意愿，从哪里开始分界？', '这件事在消耗你什么，又在给你什么？', '如果失败了，你具体会失去什么？', '你在争取的是认可，还是意义？', '三年后的你，会感谢今天的选择吗？', '你是为了靠近什么，还是为了躲开什么？', '这份工作里，你最舍不得的是什么？'],
    locked: [
      { t: '被裁员不是对你能力的判决，只是公司成本的一次重新排列。' },
      { t: '跳槽的最佳时机，是你"被低估"的时候，而不是你"受不了"的时候。' },
      { t: 'Offer 里的每一项都要谈，最容易被忽略的那一条，往往最贵。' },
      { t: 'HR 的话术只是流程，你的筹码是市场价加你的稀缺性。' },
    ],
  },
  relation: {
    direct: ['可以说开，但先把期待讲清楚。', '这件事不全是你的错。', '对方不是不在意你，只是优先级不同。', '别猜，直接问。', '你们需要一次真正的谈话。', '再等等，别在深夜做决定。', '关系可以继续，但方式要换。', '等是等不来的，说才可能被听见。', '不是你不配，是你们不合适。', '先照顾好自己的情绪，再照顾这段关系。', '一次真诚的道歉，比十次解释更有用。', '关系的修复，靠的是行动不是保证。', '边界不是隔阂，是让关系更长久的前提。'],
    action: ['今晚把想说的话写成一条消息，先不发送。', '把"你总是"换成"我感到"。', '约一个具体的时间谈，别等碰巧。', '先为你那部分道歉，只为你那部分。', '问对方一个问题，然后真的听完。', '写下你的底线，先给自己看。', '一周内别去翻对方的动态。', '安排一次不被打扰的见面。', '把需求说成请求，别说成指责。', '先回应自己的疲惫，再回应对方的消息。', '把感谢说出口，今天就一句。', '先放下输赢，再开口。'],
    reflect: ['你想改变的是对方，还是你们的模式？', '你舍不得的，是这个人，还是这段习惯？', '如果朋友遇到这件事，你会怎么劝他？', '你怕的是失去他，还是怕一个人？', '你的期待，有多少是对方不知道的？', '迁就和失去自己，边界在哪里？', '上一次认真说谢谢或对不起，是什么时候？', '这段关系让你更像自己，还是更小心翼翼？', '你想要的是被理解，还是被需要？', '等情绪过去，你还想留下什么？', '你是怕孤单，还是怕选错？'],
    locked: [
      { t: '冷战的尽头从来不是赢，而是谁先愿意看见对方的疼。' },
      { t: '谈钱不伤感情，不谈才伤；越早把账算清，越能长久。' },
      { t: '爱不是消融边界，而是让边界清晰，并且彼此尊重。' },
      { t: '你先给出安全感，才可能真正收到安全感。' },
    ],
  },
  money: {
    direct: ['可以花，但先定好上限。', '这笔钱现在应该留在原地。', '别追高，也别恐慌。', '价格可以谈，别急着成交。', '你买得起的，是让你安心的那一档。', '先把应急的钱留足，其余再说。', '别用明天的安稳，为今天的冲动买单。', '本金不安全时，收益不算数。', '可以买，但三十天后还想要再说。', '不懂的东西，不要押上答案。', '贵的不一定对，适合你的才持久。', '省下来的每一笔，都是你的退路。'],
    action: ['先写下这个月最大的三笔开销。', '设一个自动转账，把要存的钱先挪走。', '给那件事列个预算，留出10%的余地。', '查一遍账户，取消半年没用过的订阅。', '做决定前，先记一周的账。', '把想买清单变成三十天冷静清单。', '把长期的钱和短期的钱分开存放。', '问自己一次：最坏的情况我承受得起吗。', '签字之前，把退款条款读一遍。', '先做一次对账，只做一次也行。', '把每月必付的固定开销列出来。'],
    reflect: ['你想买的是东西，还是付款那一刻的感觉？', '你的安全感，钱真的能解决多少？', '你在为谁的标准花钱？', '这笔钱承载了你对未来的哪种想象？', '如果不买，你实际会失去什么？', '你要的是收益，还是心跳？', '你的财务目标能用一句话说清吗？', '你在奖励自己，还是在安慰自己？', '钱之外，你还愿意付出什么代价？', '怎样才算够，你有标准吗？', '钱是工具，还是你衡量自己的尺子？'],
    locked: [
      { t: '市场最热闹的时候，往往是风险最便宜的时候。' },
      { t: '你的存款额度，决定了你说"不"的底气。' },
      { t: '先保住本金，再谈收益；顺序一旦反了，结果也会反。' },
      { t: '冲动下单之前，把"我想要"换成"我是否需要"。' },
    ],
  },
  inner: {
    direct: ['你现在不必假装没事。', '可以休息，这不是逃避。', '这种感觉会过去，像之前每一次一样。', '今晚不回答这个问题，先睡觉。', '你已经做得足够多了。', '慢下来也没关系。', '这不是你的错。', '你不需要让所有人都理解你。', '先照顾身体，再处理心事。', '你值得被温柔对待，先从你自己开始。', '你的疲惫是真实的，不必和任何人比较。', '一次没做好，不等于你不配。'],
    action: ['先喝一口水，再深呼吸三次。', '把最乱的三件事各写一行字。', '出门走十分钟，不带手机。', '给一个能说上话的人打个电话。', '做一件最小的、让你有掌控感的事。', '今晚关掉一个信息源。', '给自己设一个担忧时限，只许十五分钟。', '先完成一件小事，再想大事。', '把最坏的情况说出口，看看它有多重。', '允许自己暂停一天，写进日程里。', '把"我应该"改成"我选择"。'],
    reflect: ['你心里那个催促的声音，是谁的？', '你的情绪在替你说什么话？', '你能像安慰朋友那样安慰自己吗？', '你累的，是事情，还是硬撑？', '上一次问自己"我怎么样"是什么时候？', '你怕的是失败，还是怕被看见失败？', '哪些期待，其实早就该放下了？', '如果此刻精力充沛，你最想做什么？', '你允许自己不优秀吗？', '你一直忽略的那个想要，是什么？', '你有多久没有只是发呆，而没有愧疚感？'],
    locked: [
      { t: '你不是在低谷，你只是在人生的换乘站。' },
      { t: '允许自己慢下来，是你对自己最大的善意。' },
      { t: '情绪不是敌人，它是你身体里最早的报警器。' },
      { t: '休息不是奖励，它是继续前行的一部分。' },
    ],
  },
  quick: {
    direct: ['做。', '先不做。', '去。', '再等等。', '可以。', '别急。', '值得。', '算了。', '留下。', '换一条路。'],
    action: ['现在就做第一步。', '先写下来。', '出去走走。', '先睡一觉。', '打个电话。', '列个清单。', '先喝口水。', '问清楚再说。', '冷却两天。', '发那条消息。'],
    reflect: ['你在怕什么？', '你真正想要什么？', '这是谁的想法？', '真有那么严重吗？', '不现在做，什么时候做？', '你确定吗？', '你在躲什么？', '最坏会怎样？', '你开心吗？', '为什么问这个？'],
  },
};
const THEMES = [
  { id: 'universal', label: '通用', desc: '原有句池' },
  { id: 'career', label: '事业抉择', desc: '工作、转行、机会' },
  { id: 'relation', label: '关系沟通', desc: '感情、亲友、相处' },
  { id: 'money', label: '金钱取舍', desc: '消费、理财、预算' },
  { id: 'inner', label: '内心情绪', desc: '焦虑、疲惫、迷茫' },
  { id: 'quick', label: '快问快决', desc: '短句速答' },
];
const THEME_KEYWORDS = [
  { theme: 'career', kws: ['工作', '职业', '岗位', '跳槽', '晋升', '加薪', '老板', '上司', '同事', '入职', '辞职', '创业', '项目', '面试', '转行', '副业', '领导', '绩效', '合同'] },
  { theme: 'relation', kws: ['爱情', '感情', '男朋友', '女朋友', '对象', '喜欢他', '喜欢她', '分手', '复合', '父母', '家人', '朋友', '婚姻', '结婚', '暧昧', '表白', '冷战', '吵架', '前任', '相亲', '伴侣'] },
  { theme: 'money', kws: ['钱', '财', '股票', '基金', '投资', '存款', '花', '买房', '买车', '工资', '奖金', '消费', '借钱', '还钱', '理财', '预算'] },
  { theme: 'inner', kws: ['焦虑', '累', '疲惫', '迷茫', '难过', '失眠', '压力', '情绪', '害怕', '自卑', '内耗', '抑郁', '烦躁', '委屈', '孤独', '崩溃', '不开心', '提不起劲'] },
];
const themeLabel = id => (THEMES.find(t => t.id === id) || { label: '通用' }).label;
function detectTheme(q) {
  const x = String(q || '');
  for (const t of THEME_KEYWORDS) if (t.kws.some(k => x.includes(k))) return t.theme;
  return 'universal';
}

/* —— 不重复抽取（支持主题限定句） —— */
const used = [];
function pick(mode, theme, autoDetected) {
  const themed = (theme && theme !== 'universal' && THEME_POOLS[theme]) ? THEME_POOLS[theme] : null;
  // 限定句：主题由关键词自动命中时，三成概率抽出该主题的专属句
  if (themed && autoDetected && themed.locked && Math.random() < 0.3) {
    const locks = themed.locked.filter(x => !used.includes(x.t));
    if (locks.length) {
      const l = locks[Math.floor(Math.random() * locks.length)];
      used.push(l.t);
      return { text: l.t, locked: true };
    }
  }
  const base = themed || ANSWERS;
  const list = base[mode] || base.direct || ANSWERS.direct;
  let options = list.filter(x => !used.includes(x));
  if (!options.length) options = list;
  const answer = options[Math.floor(Math.random() * options.length)];
  used.push(answer);
  if (used.length > 140) used.splice(0, used.length - 70);
  return { text: answer, locked: false };
}

/* —— 收藏（localStorage，兼容旧 key） —— */
const KEY = 'tj_answerbook_saved_v2';
function saveAnswer(question, mode, answer, theme) {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]');
    items.unshift({ question, mode, answer, theme: theme || 'universal', at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 30)));
    return true;
  } catch (e) { return false; }
}
function loadSaved() {
  const out = [];
  try { JSON.parse(localStorage.getItem(KEY) || '[]').forEach(x =>
    out.push({ question: x.question || '', mode: x.mode || 'direct', answer: x.answer || x.text || '', theme: x.theme || 'universal', at: x.at || 0 })); } catch (e) {}
  try { JSON.parse(localStorage.getItem('tj_answerbook_saved') || '[]').forEach(x =>
    { if (x && x.text) out.push({ question: '', mode: 'direct', answer: x.text, theme: 'universal', at: x.at || 0 }); }); } catch (e) {}
  out.sort((a, b) => b.at - a.at);
  return out.slice(0, 30);
}
function removeSaved(index) {
  try {
    const v2 = JSON.parse(localStorage.getItem(KEY) || '[]');
    const v1 = JSON.parse(localStorage.getItem('tj_answerbook_saved') || '[]');
    const merged = [...v2.map((x, i) => ({ ...x, src: 2, i })),
      ...v1.filter(x => x && x.text).map((x, i) => ({ ...x, src: 1, i }))]
      .sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 30);
    const hit = merged[index];
    if (!hit) return;
    if (hit.src === 2) {
      const idx = v2.findIndex(y => (y.at || 0) === (hit.at || 0) && (y.answer || '') === (hit.answer || ''));
      if (idx >= 0) v2.splice(idx, 1);
    } else {
      const idx = v1.findIndex(y => (y.at || 0) === (hit.at || 0) && (y.text || '') === (hit.answer || ''));
      if (idx >= 0) v1.splice(idx, 1);
    }
    localStorage.setItem(KEY, JSON.stringify(v2));
    localStorage.setItem('tj_answerbook_saved', JSON.stringify(v1));
  } catch (e) {}
}

export const answerbook = {
  id: 'answerbook',
  name: '答案之书',
  cat: '灵感与娱乐',
  icon: '答',
  desc: '写下一件此刻最在意的事，选一座对应的句库，翻开一页，把它当作整理思路的一个新角度。',
  open(container) {
    const S = { question: '', mode: 'direct', theme: 'universal', pickedTheme: false };

    const renderForm = () => {
      const savedCount = loadSaved().length;
      container.innerHTML =
        masthead(answerbook, { sub: answerbook.desc }) +
        viewShell(
          '<div class="tw-field"><label>此刻想问什么？</label>' +
            '<textarea id="twABQ" maxlength="240" placeholder="例如：我应该接受这个机会吗？" style="min-height:86px"></textarea>' +
          '</div>' +
          '<div class="tw-field"><label>句库 · 问题里出现领域关键词会自动切换</label>' +
            '<div class="tw-tabs" id="twABThemes">' + THEMES.map(t =>
              '<button type="button" class="tw-tab' + (t.id === S.theme ? ' active' : '') + '" data-theme="' + t.id + '" title="' + t.desc + '">' + t.label + '</button>').join('') +
            '</div>' +
          '</div>' +
          '<div class="tw-field"><label>回答方式</label>' +
            '<div class="tw-tabs" id="twABModes">' + Object.entries(MODES).map(([id, label], i) =>
              '<button type="button" class="tw-tab' + (id === S.mode ? ' active' : '') + '" data-mode="' + id + '">' + label + '</button>').join('') +
            '</div>' +
          '</div>' +
          '<div class="tw-actions">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twABOpen">翻开这一页 →</button>' +
            '<button type="button" class="tw-btn tw-btn-ghost" id="twABRandom">随手翻开一页</button>' +
            (savedCount ? '<button type="button" class="tw-btn tw-btn-ghost" id="twABSaved">♡ 我收藏的句子（' + savedCount + '）</button>' : '') +
          '</div>' +
          notice('<b>说明：</b>它不是预测，也不替代你的判断。重要决定请结合现实条件与专业意见。')
        );

      const input = container.querySelector('#twABQ');
      input.addEventListener('input', () => {
        S.question = input.value;
        if (!S.pickedTheme) {
          const t = detectTheme(input.value);
          if (t !== S.theme) setTheme(t);
        }
      });
      const setTheme = (id, byUser) => {
        S.theme = id;
        if (byUser) S.pickedTheme = true;
        container.querySelectorAll('#twABThemes .tw-tab').forEach(b =>
          b.classList.toggle('active', b.dataset.theme === id));
      };
      container.querySelectorAll('#twABThemes .tw-tab').forEach(btn =>
        btn.addEventListener('click', () => setTheme(btn.dataset.theme, true)));
      container.querySelectorAll('#twABModes .tw-tab').forEach(btn =>
        btn.addEventListener('click', () => {
          S.mode = btn.dataset.mode;
          container.querySelectorAll('#twABModes .tw-tab').forEach(x =>
            x.classList.toggle('active', x === btn));
        }));

      container.querySelector('#twABOpen').addEventListener('click', () => {
        const q = input.value.trim();
        if (!q) { input.focus(); input.classList.add('is-invalid'); setTimeout(() => input.classList.remove('is-invalid'), 450); return; }
        S.question = q;
        openBook(q, S.mode, S.theme);
      });
      container.querySelector('#twABRandom').addEventListener('click', () => {
        S.question = '此刻的你';
        openBook('此刻的你', S.mode, S.theme);
      });
      container.querySelector('#twABSaved')?.addEventListener('click', renderSaved);
    };

    /* —— 翻书动画 + 结果页（粒子光效 + 专属句 + 转场） —— */
    const openBook = (question, mode, theme) => {
      const autoDetected = theme !== 'universal' && !S.pickedTheme;
      const { text: answer, locked } = pick(mode, theme, autoDetected);
      const noAnim = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const result = goResult(container, answerbook.name, '');
      const body = result.querySelector('.tw-result-page-body');

      if (noAnim) { body.innerHTML = answerCard(question, mode, theme, answer, locked); bindCard(body, question, mode, theme, answer); return; }

      body.innerHTML =
        '<div class="tw-ab-stage" id="twABStage">' +
          '<div class="tw-ab-cover"><h3>答案之书</h3><span>THE BOOK OF ANSWERS</span></div>' +
          '<div class="tw-ab-hold"><i>✦</i><b>请在心里默念</b><em>翻开属于此刻的一页</em></div>' +
          '<div class="tw-ab-sparks">' + Array.from({ length: 8 }, (_, i) => '<i style="--i:' + i + '"></i>').join('') + '</div>' +
        '</div>';
      const stage = body.querySelector('#twABStage');
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('flip')));
      setTimeout(() => {
        body.innerHTML = answerCard(question, mode, theme, answer, locked);
        bindCard(body, question, mode, theme, answer);
      }, 1120);
    };

    const answerCard = (question, mode, theme, answer, locked) =>
      '<div class="tw-kicker">THE BOOK OF ANSWERS · ' + themeLabel(theme) + ' · ' + MODES[mode] + '</div>' +
      '<div class="tw-ab-answer' + (locked ? ' locked' : '') + '">' +
        '<div class="tw-ab-q"><i>✦</i> <em>' + esc(question) + '</em></div>' +
        (locked ? '<span class="tw-ab-lock">✦ 主题专属 · 仅此语境</span>' : '') +
        '<blockquote>' + esc(answer) + '</blockquote>' +
        '<p>把这句话当作一个新的视角，再结合事实、感受与现实条件作决定。</p>' +
      '</div>' +
      '<div class="tw-actions">' +
        '<button type="button" class="tw-btn tw-btn-primary" id="twABAgain">↻ 再翻一页</button>' +
        '<button type="button" class="tw-btn tw-btn-ghost" id="twABSave">♡ 收藏这句</button>' +
        '<button type="button" class="tw-btn tw-btn-ghost" id="twABShare">分享这一页</button>' +
      '</div>';

    const bindCard = (root, question, mode, theme, answer) => {
      root.querySelector('#twABAgain').addEventListener('click', () => {
        // 旧卡翻出 → 再翻一页
        const card = root.querySelector('.tw-ab-answer');
        if (card) {
          card.classList.add('tw-card-out');
          setTimeout(() => openBook(question, mode, theme), 250);
        } else { openBook(question, mode, theme); }
      });
      const saveBtn = root.querySelector('#twABSave');
      saveBtn.addEventListener('click', () => {
        if (saveAnswer(question, mode, answer, theme)) {
          saveBtn.textContent = '♥ 已收藏';
          saveBtn.disabled = true;
          saveBtn.classList.remove('tw-btn-popped');
          void saveBtn.offsetWidth;
          saveBtn.classList.add('tw-btn-popped');
        }
      });
      root.querySelector('#twABShare').addEventListener('click', async () => {
        const btn = root.querySelector('#twABShare');
        btn.disabled = true; btn.textContent = '生成中…';
        try {
          const { renderShareCard, exportShareCard } = await import('../share/card.js');
          const now = new Date();
          const card = renderShareCard({
            kicker: '答案之书 · ' + themeLabel(theme) + ' · ' + MODES[mode],
            title: '这一页写着',
            sub: now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日',
            rows: [
              { k: '你问的是', v: question || '此刻没有具体的问题，只是翻开看看' },
              { k: '答案', v: answer },
            ],
            quote: '把这句话当作一个新的视角，再结合事实、感受与现实条件作决定。',
            foot: '答案之书不是预测，也不替代你的判断。',
          });
          exportShareCard(card, '问问大师_答案之书');
        } catch (e) {}
        btn.disabled = false; btn.textContent = '分享这一页';
      });
    };

    /* —— 收藏夹视图（结果页内） —— */
    const renderSaved = () => {
      const items = loadSaved();
      const result = goResult(container, answerbook.name,
        '<div class="tw-kicker">SAVED · 收藏</div>' +
        '<div class="tw-h2">我收藏的' + (items.length ? ' ' + items.length + ' 句' : '') + '</div>' +
        (items.length
          ? '<div class="tw-ab-saved">' + items.map((x, i) =>
              '<div class="tw-ab-saved-item">' +
                '<blockquote>' + esc(x.answer) + '</blockquote>' +
                (x.question ? '<p class="q">当时问的是：' + esc(x.question) + '</p>' : '') +
                '<p class="meta">' + themeLabel(x.theme || 'universal') + ' · ' + (MODES[x.mode] || MODES.direct) + ' · ' + new Date(x.at).toLocaleDateString('zh-CN') + '</p>' +
                '<div class="acts">' +
                  '<button type="button" class="tw-btn tw-btn-ghost tw-btn-sm" data-act="copy">复制</button>' +
                  '<button type="button" class="tw-btn tw-btn-ghost tw-btn-sm" data-act="del">删除</button>' +
                '</div>' +
              '</div>').join('') +
            '</div>'
          : '<div class="tw-ab-empty">还没有收藏。翻开答案之书，遇到想留下的那一页，点「收藏这句」。</div>') +
        '<div class="tw-actions"><button type="button" class="tw-btn tw-btn-primary" id="twABBack">← 回到答案之书</button></div>'
      );
      result.querySelector('#twABBack').addEventListener('click', () => {
        // 返回表单视图
        goForm2(container);
      });
      result.querySelectorAll('[data-act]').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = btn.closest('.tw-ab-saved-item');
          const idx = [...result.querySelectorAll('.tw-ab-saved-item')].indexOf(item);
          if (btn.dataset.act === 'copy') {
            const text = item.querySelector('blockquote').textContent;
            navigator.clipboard?.writeText(text).then(() => {
              btn.textContent = '已复制';
              setTimeout(() => btn.textContent = '复制', 1200);
            }).catch(() => {});
          } else {
            removeSaved(idx);
            renderSaved();
          }
        });
      });
    };

    /* 收藏页返回时：重建表单视图（保留输入态） */
    const goForm2 = (c) => {
      renderForm();
      const input = c.querySelector('#twABQ');
      if (input && S.question && S.question !== '此刻的你') { input.value = S.question; }
    };

    renderForm();
  },
};

export default answerbook;
