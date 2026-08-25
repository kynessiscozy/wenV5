/* ============================================================
   tools-catalog.js · 工具中心结构化目录与直观卡片渲染
   ------------------------------------------------------------
   精简整合后的工具矩阵：
     - 🏛️ 西方大师专栏：星座大师、塔罗大师、人格大师
     - 💼 财富与事业：事业大师（转行副业+职场风控）
     - 🧭 日常决策：择日助手、风水大师、今日日签
     - 💕 关系与沟通：合盘助手、生肖助手
     - 🎲 灵感与娱乐：答案之书、摇签问卜、起名助手、双色球/大乐透
   ============================================================ */

export const TOOL_DEFINITIONS = [
  // 🏛️ 西方大师专栏 (western)
  {
    id: 'horoscope',
    group: 'western',
    groupName: '西方大师',
    name: '星座大师',
    badge: '星相首选',
    color: '#9d4edd',
    bgColor: 'rgba(157, 78, 221, 0.15)',
    iconSvg: '<circle cx="12" cy="12" r="9"/><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/><circle cx="12" cy="12" r="2.2"/>',
    pills: ['太阳/月亮/上升', '运势罗盘', '12x12合盘'],
    desc: '三核本命星盘排盘 · 今日/本周时空运势与契合度速配'
  },
  {
    id: 'tarot',
    group: 'western',
    groupName: '西方大师',
    name: '塔罗大师',
    badge: '卡罗测算',
    color: '#6b4c82',
    bgColor: 'rgba(107, 76, 130, 0.15)',
    iconSvg: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><circle cx="12" cy="12" r="3.5"/><path d="m12 6 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/>',
    pills: ['22张大阿卡纳', '5大实战牌阵', '3D翻牌'],
    desc: '聚焦具体困惑 · 每日指引、圣三角、感情关系与二选一决策'
  },
  {
    id: 'mbti',
    group: 'western',
    groupName: '西方大师',
    name: '人格大师',
    badge: 'MBTI测评',
    color: '#2a9d8f',
    bgColor: 'rgba(42, 157, 143, 0.15)',
    iconSvg: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="16.5" r="1.5" fill="currentColor"/>',
    pills: ['16型人格', '八维认知', '成熟度评定', '历史记录'],
    desc: '20题情境心理学测评 · 八维认知功能序列与历史测试轨迹'
  },

  // 💼 财富与事业 (money)
  {
    id: 'career',
    group: 'money',
    groupName: '财富与事业',
    name: '事业大师',
    badge: '职场全能',
    color: '#3f6f8f',
    bgColor: 'rgba(63, 111, 143, 0.15)',
    iconSvg: '<path d="M5 17 17 5M9 5h8v8"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    pills: ['转行副业测评', '职场风控预案', '验证路径'],
    desc: '整合转行副业准备度测评与职场风控预案，为职业发展保驾护航'
  },

  // 🧭 日常决策与环境 (life)
  {
    id: 'date',
    group: 'life',
    groupName: '日常决策',
    name: '择日助手',
    badge: '良辰择时',
    color: '#3f6f5f',
    bgColor: 'rgba(63, 111, 95, 0.15)',
    iconSvg: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M7 11h10M9 15h3"/>',
    pills: ['签约/面试/搬家', '时间窗口', '避雷提醒'],
    desc: '重要事项择日与沟通提醒，把不确定性降到最低'
  },
  {
    id: 'fengshui',
    group: 'life',
    groupName: '日常决策',
    name: '风水大师',
    badge: '环境布局',
    color: '#5c8d62',
    bgColor: 'rgba(92, 141, 98, 0.15)',
    iconSvg: '<path d="M12 3 3 20h18L12 3Z"/><circle cx="12" cy="14" r="2.4"/><path d="M12 11V8"/>',
    pills: ['自动罗盘定位', '八宅命卦', '九宫飞星'],
    desc: '结合设备指南针与八宅飞星，测算家居办公吉凶方位与调理'
  },
  {
    id: 'daily',
    group: 'life',
    groupName: '日常决策',
    name: '今日日签',
    badge: '每日节奏',
    color: '#d4a04a',
    bgColor: 'rgba(212, 160, 74, 0.15)',
    iconSvg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-12.8-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    pills: ['当日干支', '宜忌节奏', '锦囊提点'],
    desc: '结合个人命盘推导专属行动基调，先完成再优化'
  },

  // 💕 关系与沟通 (relation)
  {
    id: 'relation',
    group: 'relation',
    groupName: '关系与沟通',
    name: '合盘助手',
    badge: '双人合婚',
    color: '#b5838d',
    bgColor: 'rgba(181, 131, 141, 0.15)',
    iconSvg: '<path d="M20 8.5c0 4.5-8 9.5-8 9.5s-8-5-8-9.5A4 4 0 0 1 12 6a4 4 0 0 1 8 2.5Z"/>',
    pills: ['四柱逐柱比对', '五行互补', '夫妻宫互动'],
    desc: '双人真实排盘比对，理解彼此差异，给出具体相处方案'
  },
  {
    id: 'zodiac',
    group: 'relation',
    groupName: '关系与沟通',
    name: '生肖助手',
    badge: '传统文化',
    color: '#3f6f5f',
    bgColor: 'rgba(63, 111, 95, 0.15)',
    iconSvg: '<path d="M12 20v-6M12 14c-4 0-6-2.2-6-5a3 3 0 0 1 5.4-1.8A3 3 0 0 1 17 9c0 2.8-2 5-5 5Z"/>',
    pills: ['12生肖环', '六合六冲', '相害三合'],
    desc: '生肖合冲连线分析与相处沟通提醒，厘清边界与分工'
  },

  // 🎲 灵感与娱乐 (play)
  {
    id: 'answerbook',
    group: 'play',
    groupName: '灵感与娱乐',
    name: '答案之书',
    badge: '快速答案',
    color: '#783f59',
    bgColor: 'rgba(120, 63, 89, 0.15)',
    iconSvg: '<path d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-1.3 1.7-2.3 2-2.3 4"/><path d="M12 18h.01"/><circle cx="12" cy="12" r="9"/>',
    pills: ['心中所问', '翻开答案', '心智启发'],
    desc: '专注心中疑惑，翻开专属的一页文字解答与哲学启发'
  },
  {
    id: 'oracle',
    group: 'play',
    groupName: '灵感与娱乐',
    name: '摇签问卜',
    badge: '寺庙灵签',
    color: '#b0833f',
    bgColor: 'rgba(176, 131, 63, 0.15)',
    iconSvg: '<path d="M4 6h6m4 0h6M4 12h16M4 18h6m4 0h6"/>',
    pills: ['观音/关帝/财神', '3D摇签动效', '典故圣意'],
    desc: '传统寺庙抽签问卜，签文用于自我反思与理清头绪'
  },
  {
    id: 'name',
    group: 'play',
    groupName: '灵感与娱乐',
    name: '起名助手',
    badge: '起名灵感',
    color: '#5c8d62',
    bgColor: 'rgba(92, 141, 98, 0.15)',
    iconSvg: '<path d="M5 5h14M7 5v4c0 3 2 5 5 5s5-2 5-5V5M5 19h14"/>',
    pills: ['姓氏用字', '音律五行', '意境风格'],
    desc: '输入姓氏与偏好风格，智能生成用字方向与名字灵感'
  },
  {
    id: 'lottery',
    group: 'play',
    groupName: '灵感与娱乐',
    name: '双色球 / 大乐透',
    badge: '趣味娱乐',
    color: '#3d6cb9',
    bgColor: 'rgba(61, 108, 185, 0.15)',
    iconSvg: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    pills: ['随机选号', '理性提示', '娱乐预算'],
    desc: '随机幸运号码生成，仅供娱乐参详，理性对待'
  }
];

export function renderToolsHubHtml() {
  const cardsHtml = TOOL_DEFINITIONS.map((t, idx) => {
    return `<button class="tool-card-v4" type="button" data-tool="${t.id}" data-group="${t.group}" style="--card-idx:${idx}" onclick="openToolPage('${t.id}')">
      <div class="tc-top">
        <div class="tc-icon" style="background:${t.bgColor};color:${t.color}">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">${t.iconSvg}</svg>
        </div>
        <div class="tc-titles">
          <div class="tc-name">${t.name}</div>
          <span class="tc-badge" style="color:${t.color};background:${t.bgColor};border-color:${t.color}44">${t.badge}</span>
        </div>
        <span class="tc-arrow">→</span>
      </div>
      <div class="tc-pills">
        ${t.pills.map(p => `<span>${p}</span>`).join('')}
      </div>
      <div class="tc-desc">${t.desc}</div>
    </button>`;
  }).join('');

  return `<div class="glass card-1 tool-hub" data-card="toolHub">
    <div class="card-hd">
      <div class="card-ic">⌘</div>
      <div>
        <div class="card-tt">决策与命理工具中心</div>
        <div class="card-st">涵盖西方大师、事业决策、日常指引、人际关系与灵感工具</div>
      </div>
    </div>
    <div class="tool-grid-v4" id="toolGrid">${cardsHtml}</div>
  </div>`;
}
