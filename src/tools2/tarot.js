/* ============================================================
   tarot · 卡罗/塔罗大师（塔罗牌测算）
   ------------------------------------------------------------
   全功能西方塔罗神秘学测算与牌阵系统：
     1. 经典牌阵：
        - ☀️ 单张每日指引（当下能量 · 核心启示）
        - ⏳ 圣三角时间流（过去起源 · 现在卡点 · 未来走向）
        - 💕 感情与关系牌阵（我的状态 · 对方心意 · 关系破局）
        - 🔀 二选一抉择牌阵（现状 · 选择A前景 · 选择B前景 · 核心建议）
        - 🛡️ 破局四要素牌阵（核心现状 · 潜在阻碍 · 潜能优势 · 突破策略）
     2. 完整 22 张大阿卡纳 + 四花色代表牌，支持正位/逆位双向精解
     3. 沉浸式洗牌、扇形展牌、自选抽牌与 3D 翻牌动效
     4. 📖 塔罗全景图鉴（按大阿卡纳/火/水/风/土分类查阅）
     5. ✦ AI 深度牌阵解读与多轮追问（结合牌面事实与问题情境）
     6. 生成精美塔罗卡片分享
   ============================================================ */

import { masthead, notice, esc, attachToolAI } from './runtime.js';
import { getCtx } from '../state/context.js';
import { showToast } from '../ui/toast.js';

/* —— 22 张大阿卡纳核心牌库 + 4 花色首牌 —— */
export const TAROT_CARDS = [
  {
    id: 'fool', num: 0, name: '愚者', en: 'The Fool', roman: '0',
    arcana: 'major', elem: '风', astro: '天王星', symbol: '🌟',
    tag: '纯粹初心 · 勇敢冒险 · 无限潜能',
    imgDesc: '行者昂首前行，身旁小白犬相伴，前方虽是悬崖却步履轻快，代表无畏与全新的出发。',
    upright: {
      kw: '新的起点、冒险精神、纯真无畏、相信直觉、跳出既有框架',
      summary: '愚者牌代表生命中全新的周期开启。你正站在一段新旅程的起点，不必被过去的经验或恐惧所捆绑，勇敢迈出第一步。',
      advice: '保持开放与好奇，放下过度计算的包袱，允许自己以初学者的心态探索未知。',
      caution: '注意防范盲目大意与缺乏规划，冒险时仍需留有一份基本的现实锚点。'
    },
    reversed: {
      kw: '鲁莽冲动、犹豫不决、逃避责任、盲目冒险、恐惧未知',
      summary: '逆位的愚者提示你当下可能过于冲动而缺乏准备，或者因为过度害怕失败而迟迟不敢行动，处于被动逃避的状态。',
      advice: '先停下来厘清核心目标与风险底线，做好基本准备再出发，不要为逃避现实而盲目做决定。',
      caution: '警惕把不负责任当作随性自由，看清脚下的现实悬崖。'
    }
  },
  {
    id: 'magician', num: 1, name: '魔术师', en: 'The Magician', roman: 'I',
    arcana: 'major', elem: '风', astro: '水星', symbol: '🪄',
    tag: '创造显化 · 资源具足 · 行动力',
    imgDesc: '右手执权杖指天，左手指地，桌上备齐权杖、圣杯、宝剑、星币四要素，头顶无限符号。',
    upright: {
      kw: '资源就绪、主动显化、沟通自如、创造力爆发、掌握主动权',
      summary: '魔术师象征着强大的显化能力。你手中已经拥有促成事情所需的一切技能与资源，现在是将想法转化为现实的最佳时机。',
      advice: '积极主动地整合手头资源，清晰表达你的诉求与愿景，行动会带来立竿见影的反馈。',
      caution: '专注于最核心的目标，避免力量分散在太多方向。'
    },
    reversed: {
      kw: '才华受阻、沟通障碍、信息操纵、眼高手低、缺乏自信',
      summary: '逆位的魔术师表明你可能对自己缺乏信心，或者手头的资源尚未理顺；有时也提示沟通中可能存在虚张声势或信息不对称。',
      advice: '重新盘点真实能力与资源，脚踏实地提升硬实力，真诚沟通而非依赖投机技巧。',
      caution: '警惕夸大其词或承诺无法兑现的方案。'
    }
  },
  {
    id: 'priestess', num: 2, name: '女祭司', en: 'The High Priestess', roman: 'II',
    arcana: 'major', elem: '水', astro: '月亮', symbol: '📜',
    tag: '直觉洞察 · 沉静智慧 · 潜意识',
    imgDesc: '静坐于黑白二柱之间，手握律法卷轴，胸佩十字，脚踏新月，神情从容洞察一切。',
    upright: {
      kw: '直觉敏锐、向内探索、静观其变、深层洞察、守住秘密',
      summary: '女祭司是潜意识与深层智慧的守护者。此时比起盲目外求，你内心的直觉与潜意识已经感知到了最真实的答案。',
      advice: '保持内心的沉静，多听从第一直觉；适合深度思考、学习复盘或静观事态自然发展。',
      caution: '不必急于向所有人证明你的想法，有些事情守住沉静反而更有力量。'
    },
    reversed: {
      kw: '直觉封闭、情绪压抑、过度冷漠、表面化、忽视内心声音',
      summary: '逆位的女祭司提示你可能过度受外界噪音干扰，压抑了真实的内心感受；或是陷入孤僻冷淡，拒绝与他人建立情感连接。',
      advice: '允许自己表达情感，通过冥想或书写整理思绪，重新找回与内心的连接。',
      caution: '不要让理性分析完全抹杀直觉感受，避免钻牛角尖。'
    }
  },
  {
    id: 'empress', num: 3, name: '女皇', en: 'The Empress', roman: 'III',
    arcana: 'major', elem: '土', astro: '金星', symbol: '👑',
    tag: '繁荣丰盛 · 滋养包容 · 创造之美',
    imgDesc: '头戴十二星冠冕，身着石榴纹长袍，身处丰饶麦浪与森林之间，身倚金星心形盾牌。',
    upright: {
      kw: '收获丰饶、生命力旺盛、爱与滋养、艺术美感、和谐共生',
      summary: '女皇象征着大地的丰产与母性滋养。你的努力正迎来丰硕的果实，生活与人际充满温暖、繁荣与创造力。',
      advice: '善待自己与身边的人，享受当下的丰足与美好；投入你的热爱中，创造力将自然流淌。',
      caution: '在给予爱的同时也要保持自我滋养，避免过度消耗自己的精力。'
    },
    reversed: {
      kw: '过度依赖、匮乏焦虑、创造力枯竭、过度溺爱、忽视身心',
      summary: '逆位的女皇反映出内心的匮乏感或对外部认可的过度渴求，可能感到身心疲惫、灵感停滞，或者在关系中付出失衡。',
      advice: '把关注焦点收回到自己身上，好好休息、改善生活环境，重新建立安全感。',
      caution: '停止用过度付出或冲动消费来填补内心的空虚。'
    }
  },
  {
    id: 'emperor', num: 4, name: '皇帝', en: 'The Emperor', roman: 'IV',
    arcana: 'major', elem: '火', astro: '白羊座', symbol: '🏛️',
    tag: '秩序建构 · 稳固掌控 · 权威担当',
    imgDesc: '身披铠甲端坐于石雕宝座之上，背景为红色山岳，神情威严，手持王权球与安卡权杖。',
    upright: {
      kw: '确立规则、掌控全局、坚强毅力、稳扎稳打、建立边界',
      summary: '皇帝象征着稳固的结构、秩序与领导力。面对纷繁复杂的局面，你需要用清晰的逻辑、规则与坚定的执行力来掌控局面。',
      advice: '建立明确的时间表与分工规则，勇于担当主导责任，用行动展现你的专业与可靠。',
      caution: '保持原则的同时多留一份同理心，避免因过于强势而引发对立。'
    },
    reversed: {
      kw: '独断专行、秩序混乱、缺乏自律、控制欲过强、无能为力',
      summary: '逆位的皇帝提示可能存在规则失控、缺乏自律，或者相反——过于死板专制、用过强的控制欲试图压制他人。',
      advice: '检视现有的规则是否过于僵化，学会适度授权与倾听，重建良性的自我管理。',
      caution: '警惕因死要面子或死守成见而错失调整良机。'
    }
  },
  {
    id: 'hierophant', num: 5, name: '教皇', en: 'The Hierophant', roman: 'V',
    arcana: 'major', elem: '土', astro: '金牛座', symbol: '🗝️',
    tag: '精神指引 · 传统智慧 · 贵人导师',
    imgDesc: '身披三重冕端坐于圣殿之中，手持三重十字权杖，前有两位求道修士，脚下有两把交错钥匙。',
    upright: {
      kw: '寻求指引、良师益友、传统规范、团队认同、知识传承',
      summary: '教皇代表成熟的体系与高维的精神指引。此时向有经验的长辈、导师或专业机构寻求建议，能让你少走很多弯路。',
      advice: '遵从既有的成熟经验与行业标准，主动请教专业人士；在团队协作中保持信任与规则认同。',
      caution: '不要墨守成规，在吸纳传统智慧的同时保留独立思考。'
    },
    reversed: {
      kw: '打破教条、反思传统、盲信误导、特立独行、挑战权威',
      summary: '逆位的教皇表明旧有的模式或权威建议已不再完全适用，需要你跳出既有教条，探索符合自身实际的新路径。',
      advice: '独立审视外界灌输的观念，敢于质疑不合时宜的规则，寻找属于你自己的真理。',
      caution: '警惕盲目听信所谓导师的虚妄承诺，保持独立辨别力。'
    }
  },
  {
    id: 'lovers', num: 6, name: '恋人', en: 'The Lovers', roman: 'VI',
    arcana: 'major', elem: '风', astro: '双子座', symbol: '❤️',
    tag: '深刻契合 · 价值抉择 · 灵魂共振',
    imgDesc: '大天使拉斐尔在云端赐福，男女二人赤足立于生命之树与知识之树前，象征纯洁的情感与选择。',
    upright: {
      kw: '真挚相吸、心意相通、合作无间、重要抉择、价值观契合',
      summary: '恋人牌不仅代表浪漫深厚的爱情，也象征人生十字路口上忠于内心的重大选择。你正处于和谐互信与共鸣之中。',
      advice: '坦诚表达你的爱意与真实想法，在合作与关系中寻求共赢；在抉择时选择最符合你核心价值观的道路。',
      caution: '承诺需要落到实际相处中，不要只停留在美好的想象里。'
    },
    reversed: {
      kw: '沟通分歧、价值观冲突、选择困境、关系失衡、诱惑背离',
      summary: '逆位的恋人提示关系中可能出现步调不一或沟通误解，面临艰难抉择时内心感到割裂，或者受到了外界诱惑的干扰。',
      advice: '把分歧摆上台面坦诚沟通，重新确认彼此的核心底线；若面临抉择，先厘清长远利益而非短期冲动。',
      caution: '避免在情绪混乱或权责不明时草率做出永久性决定。'
    }
  },
  {
    id: 'chariot', num: 7, name: '战车', en: 'The Chariot', roman: 'VII',
    arcana: 'major', elem: '水', astro: '巨蟹座', symbol: '🛡️',
    tag: '坚定意志 · 克服困难 · 目标冲刺',
    imgDesc: '英武战士身披铠甲驾驭黑白两头斯芬克斯，身后的城堡象征已离开舒适区，目光坚毅直视前方。',
    upright: {
      kw: '战胜阻碍、意志坚定、专注目标、克服分歧、势如破竹',
      summary: '战车象征着通过自律与意志力驾驭矛盾力量。哪怕外部环境存在分歧与阻力，只要你保持专注与决心，必能夺取最终胜利。',
      advice: '锁定核心目标，把不同意见整合为同向动力；保持高度自律与执行力，勇往直前。',
      caution: '注意把握前进节奏，避免因急于求成而与身边人产生剧烈摩擦。'
    },
    reversed: {
      kw: '方向迷失、冲动碰壁、情绪失控、受挫退缩、缺乏自律',
      summary: '逆位的战车反映出可能因目标不清导致力气用错方向，或者情绪失控导致计划脱轨，陷入进退维谷的被动局面。',
      advice: '先踩下刹车，重新校准方向与资源；安抚内在的情绪波动，找回对节奏的掌控权。',
      caution: '切忌在方向不对时蛮干硬撑，及时止损也是一种智慧。'
    }
  },
  {
    id: 'strength', num: 8, name: '力量', en: 'Strength', roman: 'VIII',
    arcana: 'major', elem: '火', astro: '狮子座', symbol: '🦁',
    tag: '以柔克刚 · 内在勇气 · 耐心包容',
    imgDesc: '头顶无限符号的白衣女子，神情从容温柔地抚摸雄狮之颚，雄狮温顺臣服，展现温柔的巨大力量。',
    upright: {
      kw: '内在从容、以德服人、驯服欲望、坚定自信、持久耐心',
      summary: '力量牌展现的是真正的内在笃定。你不需要通过声色俱厉或强硬手段来证明自己，温柔、包容与持续的耐心能化解一切坚冰。',
      advice: '面对棘手的人或事，用真诚与倾听代替对抗；接纳自己的脆弱，将其转化为内心的从容定力。',
      caution: '包容不等于无限妥协，温柔要有明确的底线作为支撑。'
    },
    reversed: {
      kw: '自我怀疑、信心不足、情绪失控、软弱妥协、傲慢逞强',
      summary: '逆位的力量表明你可能被内心的焦虑或恐惧所压倒，对自己产生怀疑；或是用外在的暴躁来掩饰内在的脆弱。',
      advice: '停下来拥抱内心的恐惧，给予自己充分的肯定与包容；找回平和的心态，从小事中重塑信心。',
      caution: '不要把内心的焦虑转化为对他人的挑剔与发泄。'
    }
  },
  {
    id: 'hermit', num: 9, name: '隐士', en: 'The Hermit', roman: 'IX',
    arcana: 'major', elem: '土', astro: '处女座', symbol: '🕯️',
    tag: '独处内省 · 探寻真理 · 明灯指引',
    imgDesc: '长者立于雪山之巅，手提装有六角星的明灯，手握智慧之杖，低首沉思，默默照亮前行道路。',
    upright: {
      kw: '向内探索、独处沉淀、深思熟虑、追寻本心、点亮智慧',
      summary: '隐士代表退后一步的深层内省。外界喧嚣无法给你答案，现在是适合独处、复盘与向内探索的宝贵时期。',
      advice: '给自己留出不受打扰的空间，向内拷问真实需求；用沉淀下来的洞见照亮下一步的方向。',
      caution: '独处是为了更好地回归生活，不要演变成长期的与世隔绝。'
    },
    reversed: {
      kw: '孤僻封闭、拒绝沟通、迷失方向、逃避现实、过度冷漠',
      summary: '逆位的隐士提示可能陷入了过度封闭与自我内耗中，拒绝外界的善意与帮助，导致思路越走越窄。',
      advice: '主动打开心门，与信任的朋友或专业人士交流；走出精神孤岛，回归真实的日常连接。',
      caution: '警惕将逃避现实问题美化为「享受孤独」。'
    }
  },
  {
    id: 'wheel', num: 10, name: '命运之轮', en: 'Wheel of Fortune', roman: 'X',
    arcana: 'major', elem: '火', astro: '木星', symbol: '🎡',
    tag: '顺应周期 · 转机降临 · 把握良机',
    imgDesc: '巨大命运之轮在天空中运转，四角四活物各阅经典，阿努比斯与提丰上下轮转，斯芬克斯居于轮顶。',
    upright: {
      kw: '转机到来、顺应天时、好运眷顾、人生新阶段、破除僵局',
      summary: '命运之轮象征着宇宙周期的流转与重大转机的到来。低谷即将过去，阻滞的事情正开始重新转动，带来新的契机。',
      advice: '敏锐捕捉身边的积极变化，顺势而为；保持乐观豁达的心态，抓住这波向上跃迁的浪潮。',
      caution: '好运需要行动承接，不要守株待兔而错失良机。'
    },
    reversed: {
      kw: '运势阻滞、抗拒改变、重复踩坑、被动等待、时机未到',
      summary: '逆位的命运之轮表明事情进展可能遭遇暂时的延误或外部不可控因素，或者你正在抗拒必然的改变。',
      advice: '接纳暂时的波折，复盘过往模式以防重蹈覆辙；在逆境中沉住气，静待周期的再次回升。',
      caution: '不要与大势对抗，顺应规律调整策略才能转危为安。'
    }
  },
  {
    id: 'justice', num: 11, name: '正义', en: 'Justice', roman: 'XI',
    arcana: 'major', elem: '风', astro: '天秤座', symbol: '⚖️',
    tag: '客观公正 · 因果责任 · 明智抉择',
    imgDesc: '女神正襟端坐于石柱前，右手举正义之剑指向天际，左手持公平天平，目光澄澈公正无私。',
    upright: {
      kw: '公平合理、理性分析、权责分明、契约严谨、因果显现',
      summary: '正义牌强调客观、清醒与承担后果。种瓜得瓜，你过去的付出将在此刻得到公平的评判与回报。',
      advice: '用事实和逻辑说话，公正客观地权衡各方利益；在协议与契约上务必做到严谨透明。',
      caution: '对事不对人，避免让个人偏见影响关键判断。'
    },
    reversed: {
      kw: '偏见不公、推卸责任、纠纷拖延、严苛过当、逃避后果',
      summary: '逆位的正义提示可能面临不公平的对待、合同纠纷，或者自身在评判事情时失之偏颇，不愿面对真实代价。',
      advice: '勇敢直面自己的责任，避免找借口；若遭遇不公，收集确凿凭据通过合法合规途径维护权益。',
      caution: '切勿通过暗箱操作或违背诚信的方式解决问题。'
    }
  },
  {
    id: 'hanged', num: 12, name: '倒吊人', en: 'The Hanged Man', roman: 'XII',
    arcana: 'major', elem: '水', astro: '海王星', symbol: '🪢',
    tag: '换位思考 · 臣服蓄力 · 精神觉醒',
    imgDesc: '男子单足倒悬于生命之树上，双腿交叉呈十字，双手背负，头部却笼罩着宁静智慧的光环。',
    upright: {
      kw: '换个角度、以退为进、臣服当下、放下执念、蓄势待发',
      summary: '倒吊人代表一种看似停滞实则深刻蜕变的状态。此时顺应停顿，换一个完全相反的角度看问题，会豁然开朗。',
      advice: '接受暂时的放缓，不必无谓挣扎；把这段时间当作重新审视人生价值观的契机。',
      caution: '分清有价值的沉淀与无意义的自我消耗，不要沉溺于受害者心态。'
    },
    reversed: {
      kw: '无谓牺牲、固执己见、停滞不前、自我感动、不愿放手',
      summary: '逆位的倒吊人表明你可能在一段没有前景的事情中做无意义的牺牲，死守执念而不愿做出改变。',
      advice: '果断从无意义的消耗中抽身，停止自我感动的付出；换回正常的生活节奏，主动采取行动。',
      caution: '认清沉没成本，及时止损才是真正的解脱。'
    }
  },
  {
    id: 'death', num: 13, name: '死神', en: 'Death', roman: 'XIII',
    arcana: 'major', elem: '水', astro: '天蝎座', symbol: '🥀',
    tag: '告别旧章 · 彻底蜕变 · 涅槃新生',
    imgDesc: '黑甲骑士手持五瓣白蔷薇旗帜缓缓行进，老旧的形体倒下，地平线上朝阳正破晓升起。',
    upright: {
      kw: '结束旧有、彻底断舍离、告别过去、新生命萌芽、涅槃重生',
      summary: '死神牌并不代表肉体的消亡，而是象征着旧阶段的必然终结与新生。唯有彻底放下腐朽的过去，才能迎来真正的转机。',
      advice: '勇敢地向不再滋养你的习惯、关系或项目告别；腾出双手，拥抱即将到来的全新旅程。',
      caution: '不要因留恋过去的舒适而抗拒必然的告别，顺应改变才能新生。'
    },
    reversed: {
      kw: '抗拒改变、苟延残喘、恐惧未知、拖延告别、停滞不前',
      summary: '逆位的死神反映出你明明知道某些事情已经走到尽头，却因为恐惧未知而苦苦支撑，导致痛苦被无限拉长。',
      advice: '鼓起勇气斩断乱麻，接受事情已经改变的事实；允许旧的结束，新的生机才会涌入。',
      caution: '不要把宝贵的生命力消耗在已经死亡的关系或模式上。'
    }
  },
  {
    id: 'temperance', num: 14, name: '节制', en: 'Temperance', roman: 'XIV',
    arcana: 'major', elem: '火', astro: '射手座', symbol: '🍶',
    tag: '平衡调和 · 循序渐进 · 身心自洽',
    imgDesc: '大天使一足在水一足在陆，手持双金杯将清泉在两杯间来回倾倒融合，胸口映出金字塔与晨曦。',
    upright: {
      kw: '身心平衡、融合协调、耐性渐进、化解极端、内外自洽',
      summary: '节制牌代表最高明的调和艺术。你在不同观点、工作与生活之间找到了黄金平衡点，事情正在水到渠成地推进。',
      advice: '保持适度与从容的节奏，不走极端；在沟通中促进不同立场的融合，求同存异。',
      caution: '调和需要时间沉淀，不要因追求速度而打破原有的和谐生态。'
    },
    reversed: {
      kw: '失衡过度、急功近利、沟通脱节、作息混乱、极端情绪',
      summary: '逆位的节制提示生活或情绪可能陷入了失衡状态，比如过度透支、急于求成或在人际中难以妥协。',
      advice: '调整混乱的作息与优先级，给紧绷的生活松绑；学会放慢脚步，在极端之间寻找中间地带。',
      caution: '避免情绪化的大幅度摇摆，回归规律与节制。'
    }
  },
  {
    id: 'devil', num: 15, name: '恶魔', en: 'The Devil', roman: 'XV',
    arcana: 'major', elem: '土', astro: '摩羯座', symbol: '⛓️',
    tag: '觉察束缚 · 直面欲望 · 打破枷锁',
    imgDesc: '半人半兽的潘神居高临下，底座锁链宽松地套在男女颈上，只要他们愿意随时可以自行脱去。',
    upright: {
      kw: '物质诱惑、执念过深、隐秘束缚、欲望驱使、觉察枷锁',
      summary: '恶魔牌提示你可能被某种执念、不良嗜好或有毒的关系所捆绑。请看清：锁链其实很松，束缚你的往往是内心的恐惧。',
      advice: '诚实面对内在的欲望与贪念，看清困局的本质；意识到你随时拥有说「不」并重获自由的权力。',
      caution: '警惕被短期的利益或虚妄的安全感诱惑而放弃长远的尊严与原则。'
    },
    reversed: {
      kw: '打破枷锁、清醒觉知、重获自由、戒除陋习、看透幻象',
      summary: '逆位的恶魔是非常积极的觉醒信号。你正在看穿过去的诱惑与束缚，决心摆脱消耗你的旧有关系或生活习惯。',
      advice: '坚定地迈出解绑的一步，拥抱健康的生活方式；相信自己能够掌控人生的主动权。',
      caution: '彻底解脱需要持续的自律，防止在脆弱时倒退回舒适的旧习惯。'
    }
  },
  {
    id: 'tower', num: 16, name: '高塔', en: 'The Tower', roman: 'XVI',
    arcana: 'major', elem: '火', astro: '火星', symbol: '⚡',
    tag: '突发剧变 · 打破幻象 · 破旧立新',
    imgDesc: '耸入云霄的宏伟石塔被天降闪电击中，金冠坠落烈火升腾，二人从高处跌落，象征虚妄构造的坍塌。',
    upright: {
      kw: '突发变故、打破幻想、颠覆重塑、阵痛解脱、真相大白',
      summary: '高塔代表建立在脆弱假象上的结构被不可抗力瞬间打破。虽然伴随着震惊与阵痛，但这正是清理腐朽、彻底重生的唯一契机。',
      advice: '接受既成事实，不要试图挽救注定倒塌的危楼；把这场震荡当作打破枷锁的洗礼，在废墟上重新打下真实地基。',
      caution: '注意防范安全隐患与突发冲突，危急关头守住人身与核心安全底线。'
    },
    reversed: {
      kw: '余波未平、逃避危机、勉强维系、拖延爆发、重获喘息',
      summary: '逆位的高塔提示危机虽然没有以毁灭性的方式爆发，但深层的隐患仍在发酵；或者你正在勉强维持一个早该重构的局面。',
      advice: '不要粉饰太平，主动排查并拆除潜在的安全与信用地雷；与其等待被动爆发，不如主动有序重构。',
      caution: '警惕因侥幸心理拖延必要的改革。'
    }
  },
  {
    id: 'star', num: 17, name: '星星', en: 'The Star', roman: 'XVII',
    arcana: 'major', elem: '风', astro: '水瓶座', symbol: '✨',
    tag: '希望疗愈 · 灵感泉涌 · 宁静信心',
    imgDesc: '裸体少女手持双瓶将甘泉分别倾倒于大地与池塘，夜空中八角主星与七颗小星闪耀，水鸟栖于枝头。',
    upright: {
      kw: '充满希望、深度疗愈、灵感充沛、宁静致远、重获新生',
      summary: '星星是暴风雨后最美丽的黎明之光。经历过高塔的震荡后，你的身心正得到深层的修复与滋养，未来充满无尽的希望。',
      advice: '保持纯粹的信念，大方分享你的灵感与善意；把精力投入到长远的梦想与创造性工作中。',
      caution: '在怀抱美好理想的同时，也要有脚踏实地的执行计划。'
    },
    reversed: {
      kw: '丧失信心、悲观失望、灵感匮乏、过度理想化、自我怀疑',
      summary: '逆位的星星表明你当下可能感到迷茫与疲惫，对未来缺乏信心，或者制定的目标脱离实际而感到挫败。',
      advice: '从身边微小确定的事情开始积攒正向反馈，给自己多一点耐心；相信低谷只是暂时的阴霾。',
      caution: '不要把所有的希望寄托在不切实际的幻想上。'
    }
  },
  {
    id: 'moon', num: 18, name: '月亮', en: 'The Moon', roman: 'XVIII',
    arcana: 'major', elem: '水', astro: '双鱼座', symbol: '🌙',
    tag: '迷雾探索 · 潜意识波动 · 直觉指引',
    imgDesc: '饱满月轮洒下清辉，两柱耸立两旁，猎犬与野狼对月长嚎，小龙虾从潜意识深渊缓缓爬出。',
    upright: {
      kw: '潜意识活跃、迷雾重重、隐秘未明、情绪起伏、探索暗夜',
      summary: '月亮牌代表进入了看不清前路的光影迷雾期。你可能感到莫名的不安、焦虑或猜忌，很多事情的真相尚未完全浮出水面。',
      advice: '在情况不明朗前不要草率做重大决定；向内观照情绪的来源，用敏锐的直觉穿透表象。',
      caution: '分清真实发生的客观事实与脑海中被恐惧放大的臆想。'
    },
    reversed: {
      kw: '迷雾散去、真相大白、走出焦虑、看清欺瞒、重见光明',
      summary: '逆位的月亮是拨云见日的征兆。困扰你多时的困惑与隐患正在逐渐水落石出，内心的焦虑开始消散。',
      advice: '勇敢面对浮出水面的真实情况，理顺纠葛；放下不必要的心理包袱，迎接清晰的现实。',
      caution: '看清真相后要理性处理，避免情绪化激化矛盾。'
    }
  },
  {
    id: 'sun', num: 19, name: '太阳', en: 'The Sun', roman: 'XIX',
    arcana: 'major', elem: '火', astro: '太阳', symbol: '☀️',
    tag: '光明喜悦 · 活力绽放 · 成功坦荡',
    imgDesc: '金灿阳光照耀向日葵花墙，纯真孩童头戴花冠骑白马展开红旗，充满生命的蓬勃与纯粹喜悦。',
    upright: {
      kw: '成功顺遂、活力四射、光明磊落、热情喜悦、备受瞩目',
      summary: '太阳是塔罗中最充满正向能量的牌之一。阴霾彻底散去，你的才华、热情与真诚将得到全方位的肯定与丰硕回报。',
      advice: '尽情展现你的光芒与创造力，真诚待人；享受当下的喜悦与成就，把积极能量传递给身边的人。',
      caution: '在成功时保持谦逊，避免因得意忘形而忽略潜在的细节疏漏。'
    },
    reversed: {
      kw: '暂时受阻、活力减退、过度自负、短暂阴云、缺乏热情',
      summary: '逆位的太阳并不代表失败，而是表明成功或喜悦可能稍有推迟，或者你感到精力透支、热情有所减退。',
      advice: '调整步伐，给自己充充电；保持信心，太阳依然在那里，稍作休整便能重回巅峰。',
      caution: '不要把暂时的波折放大成全然的失败，保持积极心态。'
    }
  },
  {
    id: 'judgement', num: 20, name: '审判', en: 'Judgement', roman: 'XX',
    arcana: 'major', elem: '火', astro: '冥王星', symbol: '📯',
    tag: '生命觉醒 · 重大召唤 · 破茧重生',
    imgDesc: '大天使加百列吹响黄金号角，人们从过往的棺木中苏醒站立，张开双臂迎接神圣的召唤与新生。',
    upright: {
      kw: '重大转折、生命觉醒、听到召唤、清算过往、迎来新生',
      summary: '审判牌代表生命中决定性的分水岭。你听到了来自内心深处或命运的号角召唤，过去的因果已结，现在是蜕变升级的时刻。',
      advice: '原谅过去的遗憾与过失，彻底放下心理包袱；勇敢回应内心的真正召唤，做出决定性的跃升。',
      caution: '面对重大人生命题不要犹豫逃避，这是不可多得的突破窗口。'
    },
    reversed: {
      kw: '犹豫不决、悔恨自责、错过契机、拒绝觉醒、自我批判',
      summary: '逆位的审判提示你可能仍被过去的愧疚、自责或后悔所绑架，不敢直面现实的召唤，从而错失了改变命运的良机。',
      advice: '停止对自我的无情批判，学会与过去的自己和解；抬头看路，当下永远是重新开始的最佳时机。',
      caution: '不要让沉溺在后悔中成为逃避未来责任的借口。'
    }
  },
  {
    id: 'world', num: 21, name: '世界', en: 'The World', roman: 'XXI',
    arcana: 'major', elem: '土', astro: '土星', symbol: '🌍',
    tag: '圆满大成 · 整合升华 · 全新境界',
    imgDesc: '月桂花环中起舞的女神手持双魔杖，四角四活物齐聚见证，象征生命的圆满循环与宇宙意识的融会贯通。',
    upright: {
      kw: '圆满达成、整合升华、收获成果、跨入新阶、天人合一',
      summary: '世界牌代表愚者之旅的完美终章与最高成就。你的努力迎来圆满收官，所有经历融会贯通，你正站在全新的人生境界之上。',
      advice: '庆祝你的成就与成长，感谢一路同行的伙伴；以自信从容的姿态，迎接更高层次的生命篇章。',
      caution: '圆满也是新循环的开始，保持谦逊与持续求索的心态。'
    },
    reversed: {
      kw: '临门一脚、欠缺收尾、停滞未完、眼高手低、延迟达成',
      summary: '逆位的世界表明事情已经接近成功，但可能因为最后几个细节的疏漏或缺乏耐性，导致迟迟无法画上完美的句号。',
      advice: '耐下性子补齐最后的短板，把收尾工作做得尽善尽美；不要在终点线前松懈放弃。',
      caution: '做好充分的闭环与复盘，避免虎头蛇尾。'
    }
  },

  /* —— 4 花色首牌（小阿卡纳能量代表） —— */
  {
    id: 'ace_wands', num: 22, name: '权杖首牌', en: 'Ace of Wands', roman: 'W1',
    arcana: 'minor', elem: '火', astro: '火象星座', symbol: '🪵',
    tag: '灵感火花 · 行动契机 · 激情开拓',
    imgDesc: '云中神手握持生机盎然的权杖，新芽萌发，背景为远山古堡，象征纯粹的创造火花。',
    upright: {
      kw: '灵感涌现、行动火花、创业契机、激情爆发、全力投入',
      summary: '权杖首牌带来纯粹的火象创造力。一个新的想法或行动契机正悄然点燃，充满无限的生命力与冲劲。',
      advice: '趁热打铁推进你的创意，不要让灵感在犹豫中冷却。',
      caution: '热情需要长期的耐心与规划来维系，避免虎头蛇尾。'
    },
    reversed: {
      kw: '热情减退、缺乏动力、计划搁置、冲动碰壁、灵感受阻',
      summary: '逆位的权杖首牌表明你感到动力不足或项目推进受阻，需要重新寻找内在的激情源泉。',
      advice: '理清受阻的根本原因，从小目标开始重新点燃行动热情。',
      caution: '不要盲目强推尚未成熟的想法。'
    }
  },
  {
    id: 'ace_cups', num: 23, name: '圣杯首牌', en: 'Ace of Cups', roman: 'C1',
    arcana: 'minor', elem: '水', astro: '水象星座', symbol: '🏆',
    tag: '情感丰沛 · 爱与共鸣 · 心灵滋养',
    imgDesc: '云中神手托举溢满甘泉的金色圣杯，五道清流注入睡莲池中，白鸽衔圣饼降临，象征无条件的爱。',
    upright: {
      kw: '爱意萌生、心灵共鸣、情感滋养、直觉充盈、真挚友谊',
      summary: '圣杯首牌象征着情感与灵性的丰盛源泉。一段真挚深刻的感情或心灵连接正在萌芽，带来深层的治愈。',
      advice: '敞开心扉接纳爱与善意，真诚表达情感；投入艺术与心灵创作中。',
      caution: '保持情感的流动与真诚，不要被过去的创伤封闭心门。'
    },
    reversed: {
      kw: '情感枯竭、闭锁心扉、情绪失控、自怜内耗、沟通错位',
      summary: '逆位的圣杯首牌提示情感处于透支或压抑状态，感到不被理解，或者过度付出而得不到回应。',
      advice: '先学会好好爱自己，补充内在的心灵能量；给情绪一个健康的宣泄出口。',
      caution: '停止用自我牺牲来换取他人的关注。'
    }
  },
  {
    id: 'ace_swords', num: 24, name: '宝剑首牌', en: 'Ace of Swords', roman: 'S1',
    arcana: 'minor', elem: '风', astro: '风象星座', symbol: '🗡️',
    tag: '理性真理 · 洞察清醒 · 斩断纠葛',
    imgDesc: '云中神手紧握双刃宝剑直指苍穹，剑尖穿过橄榄与棕榈冠冕，背景为群山，象征理性的绝对力量。',
    upright: {
      kw: '思维清晰、斩断迷茫、洞察真相、果断决绝、逻辑胜利',
      summary: '宝剑首牌带来如手术刀般精准的理性与清醒。你终于看清了事情的本质，拥有斩断一切纠葛的果断魄力。',
      advice: '用逻辑与事实捍卫真相，做出决绝明智的判断；不要让情绪干扰关键决策。',
      caution: '说话与行事要注意分寸，避免理性的锋芒无意中伤及无辜。'
    },
    reversed: {
      kw: '思维混乱、言语伤人、决策错误、偏执极端、真相被蔽',
      summary: '逆位的宝剑首牌表明思维可能陷入了混乱与偏执中，容易做出草率决断或言辞带刺伤害人际。',
      advice: '暂时放下争辩与决策，让大脑冷静下来；重新核实信息的准确性。',
      caution: '不要把尖锐当成坦率，三思而后言。'
    }
  },
  {
    id: 'ace_pentacles', num: 25, name: '星币首牌', en: 'Ace of Pentacles', roman: 'P1',
    arcana: 'minor', elem: '土', astro: '土象星座', symbol: '🪙',
    tag: '务实机遇 · 财富种子 · 物质根基',
    imgDesc: '云中神手托起闪烁金光的巨大星币，下方为繁花似锦的花园与拱门，象征实实在在的财富与物质机缘。',
    upright: {
      kw: '务实机遇、财源开启、稳固根基、项目落地、健康投资',
      summary: '星币首牌象征着一颗实实在在的财富与物质种子。你正迎来一个极具现实可行性与长期回报的稳健机遇。',
      advice: '脚踏实地将方案落地，注重细节与现金流；播下耐心的种子，精耕细作。',
      caution: '长期收益需要持续投入，不要期望一夜暴富。'
    },
    reversed: {
      kw: '财运错失、预算超支、基础不稳、眼高手低、短视投机',
      summary: '逆位的星币首牌提示可能面临财务预算超支、投资受挫，或者过于急功近利导致基础不稳。',
      advice: '看紧现金流，收紧不必要的开支；重新评估商业模式的现实可行性。',
      caution: '坚决远离高风险投机与未经证实的赚钱噱头。'
    }
  }
];

const CARD_MAP = Object.fromEntries(TAROT_CARDS.map(c => [c.id, c]));

/* —— 牌阵定义 (Spreads) —— */
export const TAROT_SPREADS = [
  {
    id: 'single',
    name: '☀️ 每日灵感指引',
    cardCount: 1,
    desc: '抽取 1 张牌，聚焦当下核心能量与行动启示',
    positions: [
      { name: '核心启示', desc: '当下最需要关注的核心能量与宇宙指引' }
    ]
  },
  {
    id: 'three',
    name: '⏳ 圣三角时间流',
    cardCount: 3,
    desc: '经典三张牌阵，全景推演事情的过去、现在与走向',
    positions: [
      { name: '过去起源', desc: '问题的根源与过往积累的影响' },
      { name: '当下现状', desc: '目前的实际卡点、核心矛盾与处境' },
      { name: '未来走向', desc: '若保持当前节奏，事情可能的演变趋势' }
    ]
  },
  {
    id: 'love',
    name: '💕 感情关系牌阵',
    cardCount: 3,
    desc: '深度透视双方心意、相处障碍与情感破局之道',
    positions: [
      { name: '我的真实状态', desc: '你在这段关系中的潜意识需求与表现' },
      { name: '对方内心心意', desc: '对方目前对你的真实态度与顾虑' },
      { name: '关系突破关键', desc: '化解矛盾、推进感情的最关键行动' }
    ]
  },
  {
    id: 'choice',
    name: '🔀 二选一抉择牌阵',
    cardCount: 4,
    desc: '针对跳槽、投资或人生十字路口的两难抉择',
    positions: [
      { name: '当前核心处境', desc: '你面临抉择时的深层动机与客观环境' },
      { name: '选择 A 的前景', desc: '走第一条路可能面临的收益与代价' },
      { name: '选择 B 的前景', desc: '走第二条路可能面临的发展与挑战' },
      { name: '核心指引建议', desc: '帮你拨开迷雾、做出忠于本心的建议' }
    ]
  },
  {
    id: 'breakthrough',
    name: '🛡️ 现状破局四要素',
    cardCount: 4,
    desc: '全方位拆解困局：现状、潜在阻碍、内在优势与突围策略',
    positions: [
      { name: '核心现状', desc: '当前局面的底层本质' },
      { name: '潜在阻碍', desc: '阻碍事情进展的隐形卡点或盲区' },
      { name: '潜能优势', desc: '你手头可调用的核心力量与资源' },
      { name: '突围策略', desc: '打破僵局、转危为安的落地解法' }
    ]
  }
];

const SPREAD_MAP = Object.fromEntries(TAROT_SPREADS.map(s => [s.id, s]));

/* ============================================================
   主工具对象定义
   ============================================================ */
export const tarot = {
  id: 'tarot',
  name: '塔罗大师',
  cat: '西方大师',
  icon: '牌',
  desc: '融合 22 张大阿卡纳与元素花色，支持单张指引、圣三角、感情合盘与二选一决策牌阵。',

  open(container) {
    const S = {
      activeTab: 'divine', // 'divine' | 'compendium'
      spreadId: 'three',
      question: '',
      isShuffled: false,
      isDrawn: false,
      drawnCards: [], // [{ card, isReversed, posInfo }]
      flippedCount: 0,
      selectedCatalogCard: TAROT_CARDS[0],
      elemFilter: 'all', // 'all' | 'major' | 'fire' | 'water' | 'air' | 'earth'
    };

    /* —— 洗牌与抽牌生成 —— */
    const doShuffleAndDraw = (spread) => {
      const deck = [...TAROT_CARDS];
      // Fisher-Yates 乱序洗牌
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const count = spread.cardCount;
      const picked = deck.slice(0, count);
      S.drawnCards = picked.map((c, idx) => ({
        card: c,
        isReversed: Math.random() < 0.35, // 35% 逆位概率
        posInfo: spread.positions[idx] || { name: `第 ${idx + 1} 张牌`, desc: '' },
        isFlipped: false
      }));
      S.isDrawn = true;
      S.flippedCount = 0;
    };

    /* —— 渲染主框架 —— */
    const render = () => {
      container.innerHTML =
        masthead(tarot, { sub: tarot.desc }) +
        // 顶部二级导航
        '<div class="tw-t-nav">' +
          '<button type="button" class="tw-t-nav-btn' + (S.activeTab === 'divine' ? ' active' : '') + '" data-tab="divine">🔮 塔罗测算牌阵</button>' +
          '<button type="button" class="tw-t-nav-btn' + (S.activeTab === 'compendium' ? ' active' : '') + '" data-tab="compendium">📖 塔罗全景图鉴</button>' +
        '</div>' +
        '<div class="tw-t-body" id="twTBody"></div>';

      container.querySelectorAll('.tw-t-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          S.activeTab = btn.dataset.tab;
          render();
        });
      });

      const body = container.querySelector('#twTBody');
      if (!body) return;

      if (S.activeTab === 'divine') renderDivineTab(body);
      else renderCompendiumTab(body);
    };

    /* ============================================================
       Tab 1: 塔罗测算与牌阵推演
       ============================================================ */
    const renderDivineTab = (el) => {
      const curSpread = SPREAD_MAP[S.spreadId] || TAROT_SPREADS[1];

      // 若尚未抽牌，展示配置与洗牌界面
      if (!S.isDrawn) {
        el.innerHTML =
          // 牌阵选择器
          '<div class="tw-t-spread-selector">' +
            '<div class="tw-h3">选择测算牌阵</div>' +
            '<div class="tw-t-spread-grid">' +
              TAROT_SPREADS.map(sp =>
                '<div class="tw-t-spread-card' + (sp.id === curSpread.id ? ' active' : '') + '" data-spread="' + sp.id + '">' +
                  '<div class="name">' + sp.name + ' <span class="cnt">(' + sp.cardCount + '张)</span></div>' +
                  '<div class="desc">' + sp.desc + '</div>' +
                '</div>'
              ).join('') +
            '</div>' +
          '</div>' +

          // 问题输入框
          '<div class="tw-field" style="margin:16px 0 12px">' +
            '<label>你心中的问题（专注一件具体的事）</label>' +
            '<textarea id="twTQuestion" maxlength="120" placeholder="例如：这周项目推进会有什么挑战？或者：我和他的关系接下来会如何发展？">' + esc(S.question) + '</textarea>' +
          '</div>' +

          // 洗牌抽牌交互区
          '<div class="tw-t-deck-stage">' +
            '<div class="tw-t-deck-visual' + (S.isShuffled ? ' shuffling' : '') + '" id="twTDeckVisual">' +
              '<div class="deck-card c1"></div>' +
              '<div class="deck-card c2"></div>' +
              '<div class="deck-card c3"></div>' +
              '<div class="deck-card c4"></div>' +
              '<div class="deck-card c5"></div>' +
            '</div>' +
            '<div class="tw-t-deck-status" id="twTDeckStatus">深呼吸，专注你的问题，点击下方开始洗牌</div>' +
          '</div>' +

          '<div class="tw-actions">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twTStartDraw">✦ 开始洗牌并抽牌</button>' +
          '</div>' +
          notice('<b>提示：</b>塔罗测算是潜意识与宇宙能量的镜像投影。请在安静、专注的心态下抽牌，结果用于启发行动与理清思路。');

        // 事件监听
        el.querySelectorAll('[data-spread]').forEach(card => {
          card.addEventListener('click', () => {
            S.spreadId = card.dataset.spread;
            renderDivineTab(el);
          });
        });

        el.querySelector('#twTQuestion')?.addEventListener('input', e => {
          S.question = e.target.value;
        });

        el.querySelector('#twTStartDraw')?.addEventListener('click', () => {
          const btn = el.querySelector('#twTStartDraw');
          const visual = el.querySelector('#twTDeckVisual');
          const status = el.querySelector('#twTDeckStatus');
          if (btn) { btn.disabled = true; btn.textContent = '正在洗牌中…'; }
          if (visual) visual.classList.add('shuffling');
          if (status) status.textContent = '塔罗牌正在洗牌与能量共鸣中…';

          setTimeout(() => {
            doShuffleAndDraw(curSpread);
            renderDivineTab(el);
          }, 1400);
        });

        return;
      }

      // —— 已抽牌界面：展示牌阵与结果 ——
      const allFlipped = S.drawnCards.every(c => c.isFlipped);

      el.innerHTML =
        // 顶部控制条
        '<div class="tw-t-result-header">' +
          '<div class="meta">' +
            '<span class="kicker">TAROT SPREAD · ' + curSpread.name + '</span>' +
            '<div class="q">所问：「' + esc(S.question || '心中的问题') + '」</div>' +
          '</div>' +
          '<div class="acts">' +
            '<button type="button" class="tw-t-btn-sm" id="twTReDraw">↻ 重新测算</button>' +
          '</div>' +
        '</div>' +

        // 牌阵卡牌展示区（支持点击单张翻转）
        '<div class="tw-t-spread-display count-' + curSpread.cardCount + '">' +
          S.drawnCards.map((item, idx) => {
            const c = item.card;
            const rev = item.isReversed;
            const flipped = item.isFlipped;
            const meaning = rev ? c.reversed : c.upright;

            return '<div class="tw-t-card-slot' + (flipped ? ' flipped' : '') + '" data-idx="' + idx + '">' +
              '<div class="pos-badge">' + item.posInfo.name + '</div>' +
              '<div class="card-inner' + (rev ? ' is-reversed' : '') + '">' +
                // 卡牌背面
                '<div class="card-face card-back">' +
                  '<div class="back-pattern">✦</div>' +
                  '<div class="tap-hint">点击翻开</div>' +
                '</div>' +
                // 卡牌正面
                '<div class="card-face card-front" style="border-color:' + (c.elem === '火' ? '#d97757' : c.elem === '水' ? '#5e7fa2' : c.elem === '风' ? '#d4a34b' : '#5c8d62') + '">' +
                  '<div class="card-num">' + c.roman + '</div>' +
                  '<div class="card-symbol">' + c.symbol + '</div>' +
                  '<div class="card-name">' + c.name + (rev ? '<span class="rev-tag">逆位</span>' : '<span class="up-tag">正位</span>') + '</div>' +
                  '<div class="card-en">' + c.en + '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +

        // 一键全部翻开按钮（未全部翻开时显示）
        (!allFlipped ?
          '<div class="tw-actions" style="margin:10px 0 16px">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twTFlipAll">✦ 翻开全部卡牌</button>' +
          '</div>' : '') +

        // 详细牌意解读列表（已翻开的牌展示）
        '<div class="tw-t-meanings-wrap">' +
          S.drawnCards.map((item, idx) => {
            if (!item.isFlipped) return '';
            const c = item.card;
            const rev = item.isReversed;
            const m = rev ? c.reversed : c.upright;
            const orient = rev ? '逆位' : '正位';
            const color = c.elem === '火' ? '#d97757' : c.elem === '水' ? '#5e7fa2' : c.elem === '风' ? '#d4a34b' : '#5c8d62';

            return '<div class="tw-t-meaning-card">' +
              '<div class="hd" style="border-left: 3px solid ' + color + '">' +
                '<div class="left">' +
                  '<span class="idx">位置 ' + (idx + 1) + ' · ' + item.posInfo.name + '</span>' +
                  '<h4 class="title">' + c.roman + ' · ' + c.name + ' <span class="orient ' + (rev ? 'rev' : 'up') + '">(' + orient + ')</span></h4>' +
                '</div>' +
                '<span class="elem-tag">' + c.elem + '象 · ' + c.astro + '</span>' +
              '</div>' +
              '<div class="pos-desc"><b>位置象征：</b>' + item.posInfo.desc + '</div>' +
              '<div class="kw-row"><span class="k">核心关键词：</span><span>' + m.kw + '</span></div>' +
              '<div class="prose">' +
                '<p><b>牌面启示：</b>' + m.summary + '</p>' +
                '<p><b>行动建议：</b>' + m.advice + '</p>' +
                '<p><b>注意防范：</b>' + m.caution + '</p>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +

        // 底部操作区（全部翻开后展示）
        (allFlipped ?
          '<div class="tw-actions" style="margin-top:16px">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twTShare">✦ 生成塔罗测算卡片</button>' +
          '</div>' +
          '<div class="tw-ai-mount" id="twTAIMount"></div>' +
          notice('<b>提示：</b>塔罗牌阵反映当下的能量动力学与心理投射。真正的未来由你接下来的觉察、选择与行动所塑造。')
          : '');

      // 绑定翻牌事件
      el.querySelectorAll('.tw-t-card-slot').forEach(slot => {
        slot.addEventListener('click', () => {
          const idx = Number(slot.dataset.idx);
          if (S.drawnCards[idx] && !S.drawnCards[idx].isFlipped) {
            S.drawnCards[idx].isFlipped = true;
            renderDivineTab(el);
          }
        });
      });

      // 全部翻开
      el.querySelector('#twTFlipAll')?.addEventListener('click', () => {
        S.drawnCards.forEach(c => { c.isFlipped = true; });
        renderDivineTab(el);
      });

      // 重新测算
      el.querySelector('#twTReDraw')?.addEventListener('click', () => {
        S.isDrawn = false;
        S.drawnCards = [];
        renderDivineTab(el);
      });

      // 生成分享卡片
      el.querySelector('#twTShare')?.addEventListener('click', async () => {
        const btn = el.querySelector('#twTShare');
        btn.disabled = true; btn.textContent = '生成中…';
        try {
          const { renderShareCard, exportShareCard } = await import('../share/card.js');
          const rows = S.drawnCards.map((item, i) => ({
            k: `${item.posInfo.name}`,
            v: `${item.card.name} (${item.isReversed ? '逆位' : '正位'}) ｜ ${item.isReversed ? item.card.reversed.kw : item.card.upright.kw}`
          }));

          const summaryQuotes = S.drawnCards.map(item =>
            `${item.posInfo.name}【${item.card.name}${item.isReversed ? '逆' : '正'}】：${item.isReversed ? item.card.reversed.advice : item.card.upright.advice}`
          ).join('\n');

          const card = renderShareCard({
            kicker: '塔罗大师 · ' + curSpread.name,
            title: '『' + (S.question ? S.question.slice(0, 16) : '塔罗启示') + '』',
            sub: '测算牌阵：' + curSpread.name + ' ｜ 共 ' + curSpread.cardCount + ' 张牌',
            badge: S.drawnCards[0].card.name + (S.drawnCards[0].isReversed ? ' 逆' : ' 正'),
            rows: rows,
            quote: summaryQuotes,
            foot: '塔罗用于启发心智与觉察，不构成现实决定依据。'
          });
          exportShareCard(card, '问问大师_塔罗测算_' + curSpread.id, btn);
        } catch (err) {
          console.error(err);
        }
        btn.disabled = false; btn.textContent = '✦ 生成塔罗测算卡片';
      });

      // AI 深度解读接入
      const aiSlot = el.querySelector('#twTAIMount');
      if (aiSlot && allFlipped) {
        attachToolAI({
          root: el,
          typeLabel: '塔罗大师 · 牌阵解读',
          getSource: () => {
            const details = S.drawnCards.map((item, i) => {
              const c = item.card;
              const rev = item.isReversed;
              const m = rev ? c.reversed : c.upright;
              return `【位置 ${i + 1}：${item.posInfo.name}】（${item.posInfo.desc}）
卡牌：${c.roman} · ${c.name}（${rev ? '逆位' : '正位'}，${c.elem}象，对应${c.astro}）
关键词：${m.kw}
牌义解读：${m.summary}
行动建议：${m.advice}`;
            }).join('\n\n');

            return `【塔罗大师·牌阵推演事实】
测算牌阵：${curSpread.name} (${curSpread.desc})
所问问题：${S.question || '未填写具体问题，求全局指引'}

抽牌结果：
${details}`;
          },
          slot: aiSlot,
          extraSystem: '你是一位精通韦特塔罗体系与荣格原型心理学的资深塔罗大师。请严格基于用户抽出的具体卡牌、正逆位属性与牌阵位置关系，结合用户提出的具体问题，提供深刻、客观、治愈且极具实操性的深度解读。'
        });
      }
    };

    /* ============================================================
       Tab 2: 塔罗全景图鉴 (Compendium)
       ============================================================ */
    const renderCompendiumTab = (el) => {
      const filtered = TAROT_CARDS.filter(c => {
        if (S.elemFilter === 'all') return true;
        if (S.elemFilter === 'major') return c.arcana === 'major';
        return c.elem === (S.elemFilter === 'fire' ? '火' : S.elemFilter === 'water' ? '水' : S.elemFilter === 'air' ? '风' : '土');
      });

      const sel = S.selectedCatalogCard || TAROT_CARDS[0];

      el.innerHTML =
        // 筛选标签
        '<div class="tw-t-filter-bar">' +
          [
            'all:全部卡牌',
            'major:🏛️ 大阿卡纳',
            'fire:🔥 火象',
            'water:💧 水象',
            'air:💨 风象',
            'earth:⛰️ 土象'
          ].map(p => {
            const [k, label] = p.split(':');
            return '<button type="button" class="tw-t-filter-btn' + (S.elemFilter === k ? ' active' : '') + '" data-elem="' + k + '">' + label + '</button>';
          }).join('') +
        '</div>' +

        // 卡牌网格
        '<div class="tw-t-comp-grid">' +
          filtered.map(c =>
            '<div class="tw-t-comp-tile' + (c.id === sel.id ? ' sel' : '') + '" data-card="' + c.id + '">' +
              '<div class="sym">' + c.symbol + '</div>' +
              '<div class="num">' + c.roman + '</div>' +
              '<div class="name">' + c.name + '</div>' +
              '<div class="elem">' + c.elem + '象 · ' + c.astro + '</div>' +
            '</div>'
          ).join('') +
        '</div>' +

        // 选中牌详情
        '<div class="tw-t-detail-card">' +
          '<div class="detail-header">' +
            '<div class="sym">' + sel.symbol + '</div>' +
            '<div class="title-wrap">' +
              '<h3>' + sel.roman + ' · ' + sel.name + ' <small>' + sel.en + '</small></h3>' +
              '<div class="tags"><span class="t-tag">' + (sel.arcana === 'major' ? '大阿卡纳' : '小阿卡纳') + '</span><span class="t-tag">' + sel.elem + '象元素</span><span class="t-tag">对应：' + sel.astro + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="detail-img-desc"><b>牌面图像象征：</b>' + sel.imgDesc + '</div>' +
          '<div class="detail-columns">' +
            '<div class="col up">' +
              '<div class="c-hd"><span>✦ 正位牌义 (Upright)</span></div>' +
              '<div class="kw"><b>关键词：</b>' + sel.upright.kw + '</div>' +
              '<p><b>启示：</b>' + sel.upright.summary + '</p>' +
              '<p><b>建议：</b>' + sel.upright.advice + '</p>' +
              '<p><b>警示：</b>' + sel.upright.caution + '</p>' +
            '</div>' +
            '<div class="col rev">' +
              '<div class="c-hd"><span>✕ 逆位牌义 (Reversed)</span></div>' +
              '<div class="kw"><b>关键词：</b>' + sel.reversed.kw + '</div>' +
              '<p><b>启示：</b>' + sel.reversed.summary + '</p>' +
              '<p><b>建议：</b>' + sel.reversed.advice + '</p>' +
              '<p><b>警示：</b>' + sel.reversed.caution + '</p>' +
            '</div>' +
          '</div>' +
        '</div>';

      // 绑定筛选
      el.querySelectorAll('[data-elem]').forEach(btn => {
        btn.addEventListener('click', () => {
          S.elemFilter = btn.dataset.elem;
          renderCompendiumTab(el);
        });
      });

      // 绑定选牌
      el.querySelectorAll('[data-card]').forEach(tile => {
        tile.addEventListener('click', () => {
          const cid = tile.dataset.card;
          S.selectedCatalogCard = CARD_MAP[cid] || TAROT_CARDS[0];
          renderCompendiumTab(el);
        });
      });
    };

    render();
  }
};

export default tarot;
