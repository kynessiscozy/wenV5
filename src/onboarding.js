/* ============================================================
   onboarding.js · 全局性新手指引与全景通识系统 (Global Novice Guide)
   ------------------------------------------------------------
   彻底移除旧版首次进入的简陋遮罩，升级为永久可用、全景沉浸式的
   东方命理与西方星相全域新手指引中心：
     1. 全局体系导览 (System Tour): 东方四柱/五行、西方星盘/灵数、AI问问大师、12大决策工具
     2. 东方命理怎么看？（四步极速读盘法与实战步骤）
     3. 西方星相怎么看？（三核本我、十大星曜、宫位、几何相位与生命灵数）
     4. 核心术语通识词典 (Interactive Glossary)
     5. 新手常见疑问 FAQ 与认知避坑指南
     6. 100% 纯 SVG 矢量微标，无 Emoji 字符，Claude 纸质与暗夜双主题自适应
   ============================================================ */

import { getWesternSvgIcon, getZodiacSvg, getElementSvg } from './render/western-view.js';

let activeGuideTab = 'tour'; // 'tour' | 'eastern' | 'western' | 'glossary' | 'faq'

/* ============================================================
   全局新手指引弹窗控制器
   ============================================================ */
export function openNoviceGuide(initialTab = 'tour') {
  activeGuideTab = initialTab || 'tour';
  let modal = document.getElementById('noviceGuideModal');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'noviceGuideModal';
    modal.className = 'ng-modal';
    modal.innerHTML = `
      <div class="ng-backdrop" onclick="closeNoviceGuide()"></div>
      <div class="ng-sheet" role="dialog" aria-modal="true" aria-label="新手指引与使用指南">
        <!-- 弹窗顶栏 -->
        <div class="ng-header">
          <div class="ng-header-title-wrap">
            <h2 class="ng-header-title">✦ 问问大师 · 新手指引</h2>
            <p class="ng-header-sub">东方命理 ｜ 西方星相 ｜ AI智能解盘 ｜ 12大决策工具</p>
          </div>
          <button class="ng-close-btn" onclick="closeNoviceGuide()" type="button" aria-label="关闭指引">×</button>
        </div>

        <!-- 导航 Tabs (纯 SVG 矢量图标) -->
        <div class="ng-tabs-bar" role="tablist">
          <button class="ng-tab-btn active" data-tab="tour" onclick="switchNoviceGuideTab('tour')" role="tab">
            ${getWesternSvgIcon('sparkle', 15)} 全局导览
          </button>
          <button class="ng-tab-btn" data-tab="eastern" onclick="switchNoviceGuideTab('eastern')" role="tab">
            ${getWesternSvgIcon('astrolabe', 15)} 东方八字怎么看
          </button>
          <button class="ng-tab-btn" data-tab="western" onclick="switchNoviceGuideTab('western')" role="tab">
            ${getWesternSvgIcon('sun', 15)} 西方星相怎么看
          </button>
          <button class="ng-tab-btn" data-tab="glossary" onclick="switchNoviceGuideTab('glossary')" role="tab">
            ${getWesternSvgIcon('book', 15)} 核心术语词典
          </button>
          <button class="ng-tab-btn" data-tab="faq" onclick="switchNoviceGuideTab('faq')" role="tab">
            ${getWesternSvgIcon('idea', 15)} 常见疑问 FAQ
          </button>
        </div>

        <!-- 标签页内容容器 -->
        <div class="ng-body" id="ngBodyContent"></div>

        <!-- 底部快捷引导操作条 -->
        <div class="ng-footer">
          <button class="ng-act-btn primary" type="button" onclick="closeNoviceGuide(); window.TJOpenForm && window.TJOpenForm();">
            ${getWesternSvgIcon('star', 15)} 立即填写出生信息排盘
          </button>
          <button class="ng-act-btn ghost" type="button" onclick="closeNoviceGuide();">
            我已知晓
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.classList.add('open');
  renderNoviceGuideTabContent(activeGuideTab);
}

export function closeNoviceGuide() {
  const modal = document.getElementById('noviceGuideModal');
  if (modal) modal.classList.remove('open');
}

export function switchNoviceGuideTab(tabKey) {
  activeGuideTab = tabKey;
  const modal = document.getElementById('noviceGuideModal');
  if (!modal) return;

  modal.querySelectorAll('.ng-tab-btn').forEach(btn => {
    const t = btn.dataset?.tab || btn.getAttribute?.('data-tab');
    btn.classList.toggle('active', t === tabKey);
  });

  renderNoviceGuideTabContent(tabKey);
}

/* ============================================================
   标签页内容渲染器 (Tab Views)
   ============================================================ */
function renderNoviceGuideTabContent(tabKey) {
  const container = document.getElementById('ngBodyContent');
  if (!container) return;

  let H = '';

  switch (tabKey) {
    case 'tour': // Tab 1: 全局导览
      H = `
        <div class="ng-section-hero">
          <div class="ng-kicker">${getWesternSvgIcon('sparkle', 14)} 欢迎探索问问大师</div>
          <h3 class="ng-title">融汇东西方古老智慧与现代 AI 的人生决策系统</h3>
          <p class="ng-desc">问问大师并非宿命论断言工具，而是帮助你观照天生倾向、明晰能量强弱、把复杂选择拆解为现实行动的个人成长罗盘。</p>
        </div>

        <div class="ng-cards-grid">
          <div class="ng-card">
            <div class="ng-card-hd">
              <span class="ng-card-icon">${getWesternSvgIcon('astrolabe', 20)}</span>
              <b>1. 东方命理体系</b>
            </div>
            <p>基于出生的年月日时四柱干支，推演五行旺衰（木火土金水）、十神心智格局、入命神煞吉凶，并无缝融合紫微斗数、奇门遁甲与梅花易数精要。</p>
          </div>

          <div class="ng-card">
            <div class="ng-card-hd">
              <span class="ng-card-icon">${getWesternSvgIcon('sun', 20)}</span>
              <b>2. 西方星相与灵数</b>
            </div>
            <p>基于天体力学精密算法绘制 500px 高清本命星盘，解析太阳/月亮/上升三核本我、十大星曜十二宫位、神圣几何相位织网及毕达哥拉斯生命灵数九宫图。</p>
          </div>

          <div class="ng-card">
            <div class="ng-card-hd">
              <span class="ng-card-icon">${getWesternSvgIcon('sparkle', 20)}</span>
              <b>3. 问问大师 AI 对话</b>
            </div>
            <p>搭载深度大模型，支持随时切换「东方命理依据」或「西方星相依据」，围绕事业、感情、财富、学业、人际困惑进行个性化多轮深度追问。</p>
          </div>

          <div class="ng-card">
            <div class="ng-card-hd">
              <span class="ng-card-icon">${getWesternSvgIcon('geometry', 20)}</span>
              <b>4. 12 大大师与决策工具</b>
            </div>
            <p>涵盖塔罗大师（5大实战牌阵3D翻牌）、人格大师（MBTI 16型与成熟度）、事业大师、择日助手、合盘助手、生肖助手、今日日签与答案之书。</p>
          </div>
        </div>
      `;
      break;

    case 'eastern': // Tab 2: 东方八字怎么看？
      H = `
        <div class="ng-section-hero">
          <div class="ng-kicker">${getWesternSvgIcon('astrolabe', 14)} 东方命理极速指南</div>
          <h3 class="ng-title">四步极速读懂你的四柱八字命盘</h3>
          <p class="ng-desc">八字不是神秘莫测的天书，而是用古代干支历法记录的宇宙能量场坐标。按照以下四步，任何人都能轻松读懂自己的命盘！</p>
        </div>

        <div class="ng-steps-flow">
          <div class="ng-step-card">
            <div class="step-num">01</div>
            <div class="step-content">
              <h4>第 1 步：认清你的「日主元神」（我是谁？）</h4>
              <p>八字排盘中，<b>日柱的天干（日主）</b>代表你本人。比如「甲木」如参天大树正直有担当，「丙火」如太阳热情耀眼，「辛金」如珠玉精致追求品质，「癸水」如雨露洞察敏锐。这是你最底层的性格内核。</p>
            </div>
          </div>

          <div class="ng-step-card">
            <div class="step-num">02</div>
            <div class="step-content">
              <h4>第 2 步：查看「五行能量占比」与「喜用神」</h4>
              <p>五行（木火土金水）不是缺什么就盲目补什么，而是看<b>日主的强弱与平衡</b>：身旺需要克泄耗（展现价值），身弱需要印比生扶（休养沉淀）。<b>用神/喜神</b>就是帮助你命局达到最高效率的平衡支点。</p>
            </div>
          </div>

          <div class="ng-step-card">
            <div class="step-num">03</div>
            <div class="step-content">
              <h4>第 3 步：观察「十年大运」与「流年时空节奏」</h4>
              <p>命是车，运是路。大运每十年一换，代表人生不同阶段的主要课题；流年（如今年甲辰/乙巳）代表当年的外部机遇与挑战。逢冲代表变动破局，逢合代表合作联结，顺势而为方能事半功倍。</p>
            </div>
          </div>

          <div class="ng-step-card">
            <div class="step-num">04</div>
            <div class="step-content">
              <h4>第 4 步：结合「十神心智」把倾向落到现实行动</h4>
              <p>正官代表自律规则，七杀代表魄力突破，正偏财代表资源掌控，食伤代表灵感表达，印星代表学习厚积。看清自己的十神结构，扬长避短，把选择落到当下具体的行动中。</p>
            </div>
          </div>
        </div>
      `;
      break;

    case 'western': // Tab 3: 西方星相怎么看？
      H = `
        <div class="ng-section-hero">
          <div class="ng-kicker">${getWesternSvgIcon('sun', 14)} 西方占星与灵数指南</div>
          <h3 class="ng-title">占星盘 · 三核本我 · 相位与生命灵数解析法</h3>
          <p class="ng-desc">西方现代心理占星学将星盘视为个人心灵的无意识投射地图，生命灵数则是毕达哥拉斯数理哲学的灵魂密码。</p>
        </div>

        <div class="ng-steps-flow">
          <div class="ng-step-card">
            <div class="step-num">01</div>
            <div class="step-content">
              <h4>核心三核交汇：太阳、月亮与上升点 (The Big Three)</h4>
              <p>
                <b>太阳星座</b>：你的核心英雄之旅与意志驱动（想成为谁）；<br>
                <b>月亮星座</b>：你的潜意识、安全感源泉与真实情绪需求；<br>
                <b>上升星座 (ASC)</b>：你呈现给世界的社交面具与应对外界的第一反应。
              </p>
            </div>
          </div>

          <div class="ng-step-card">
            <div class="step-num">02</div>
            <div class="step-content">
              <h4>十大行星与后天十二宫位领域</h4>
              <p>行星是「能量演员」（水星管思维、金星管情感审美、火星管行动斗志、木星管幸运扩张、土星管自律磨砺），宫位是「人生舞台」（第1宫自我、第2宫财帛、第7宫伴侣、第10宫事业官禄）。</p>
            </div>
          </div>

          <div class="ng-step-card">
            <div class="step-num">03</div>
            <div class="step-content">
              <h4>神圣几何相位能量网络 (Aspects)</h4>
              <p>
                <b>三分相 (120°) / 六分相 (60°)</b>：天生顺畅流动的和谐能量与天赋；<br>
                <b>四分相 (90°) / 对分相 (180°)</b>：充满张力与挑战的能量，是逼迫你走出舒适圈实现人生跃迁的关键燃料。
              </p>
            </div>
          </div>

          <div class="ng-step-card">
            <div class="step-num">04</div>
            <div class="step-content">
              <h4>毕达哥拉斯生命灵数与 9 年周期</h4>
              <p>通过出生日期非零数字累加化简得出<b>核心主命数 (Life Path 1~9 及卓越数 11/22/33)</b>，并在 3x3 九宫矩阵中诊断优势天赋连线，结合当前 9 年个人流年周期找到年度发力焦点。</p>
            </div>
          </div>
        </div>
      `;
      break;

    case 'glossary': // Tab 4: 核心术语词典
      const terms = [
        { name: '日主 / 元神', sys: '东方', desc: '八字日柱的天干，代表命主本人的核心本质与五行元神。' },
        { name: '四柱八字', sys: '东方', desc: '出生的年柱、月柱、日柱、时柱，每柱一天干一地支，共八个字。' },
        { name: '十神', sys: '东方', desc: '根据日主与其他干支五行生克关系推导出的十种人生角色（比肩、劫财、食神、伤官、偏财、正财、七杀、正官、偏印、正印）。' },
        { name: '喜用神', sys: '东方', desc: '命局中最需要用来平衡五行强弱、通关调候的关键能量。' },
        { name: '神煞', sys: '东方', desc: '干支特定组合形成的特殊能量符号，如天乙贵人（逢凶化吉）、文昌（才思学识）、驿马（变动迁移）、桃花（人缘吸引）。' },
        { name: '大运与流年', sys: '东方', desc: '大运主管十年阶段运势主线，流年（太岁）主管当年的具体吉凶契机。' },
        { name: '上升星座 (ASC)', sys: '西方', desc: '出生那一刻东方地平线升起的星座，代表你的外在人格面具与行事风度。' },
        { name: '天顶 (MC)', sys: '西方', desc: '星盘最高点（第十宫始点），代表你在社会上的最高成就、职业形象与社会声誉。' },
        { name: '相位 (Aspects)', sys: '西方', desc: '星盘中行星之间形成的特定几何角度（0°合相、60°六分、90°四分、120°三分、180°对分）。' },
        { name: '生命主命数', sys: '西方', desc: '毕达哥拉斯体系中阳历生日全部数字连续相加归约至单数字（或卓越数11/22/33），代表一生的核心使命原型。' },
        { name: '真太阳时', sys: '通识', desc: '根据出生地地理经度将北京时间（东经120°）校正为当地真实的太阳时角，确保时辰干支绝对精准。' }
      ];

      H = `
        <div class="ng-section-hero">
          <div class="ng-kicker">${getWesternSvgIcon('book', 14)} 命理与星相速查通识</div>
          <h3 class="ng-title">核心专业术语权威通俗词典</h3>
          <p class="ng-desc">告别晦涩难懂的玄学黑话，用清晰现代的语言理解每个专业概念的真实内涵。</p>
        </div>

        <div class="ng-glossary-grid">
          ${terms.map(t => `
            <div class="ng-glossary-item">
              <div class="term-hd">
                <span class="term-name">${t.name}</span>
                <span class="term-tag ${t.sys === '东方' ? 'east' : t.sys === '西方' ? 'west' : 'common'}">${t.sys}</span>
              </div>
              <p class="term-desc">${t.desc}</p>
            </div>
          `).join('')}
        </div>
      `;
      break;

    case 'faq': // Tab 5: 常见疑问 FAQ
    default:
      const faqs = [
        {
          q: '1. 出生具体时辰记不清怎么办？',
          a: '若不知道出生时辰，可在表单中选择「时辰不详」，系统将自动降级为精准的三柱（年月日）排盘模式，日主、月令、五行主气及生命灵数依然完全可用；若知道大约时辰，开启「真太阳时」校正经度误差即可。'
        },
        {
          q: '2. 测算结果中看到挑战、冲克或短板该怎么面对？',
          a: '问问大师坚决摒弃任何恐吓性断言。命盘揭示的是能量倾向而非宿命枷锁。所谓相冲代表变革契机，所谓短板代表成长方向。看清能量流向，正是你主动调整节奏、实现人生破局的最好起点。'
        },
        {
          q: '3. 东方八字与西方星相哪一套体系更准？',
          a: '两者是不同文明观照自我的两面镜子：东方命理长于时空节律（大运流年太岁）、五行生克与社会关系角色；西方占星长于深层心理动机、潜意识需求与个人天赋投射。结合参看，能获得最立体的全息视角。'
        },
        {
          q: '4. AI「问问大师」是如何生成建议的？会泄露我的生日隐私吗？',
          a: 'AI 问问大师完全基于结构化命盘依据进行实时推演，全流程经过严格的隐私脱敏过滤，绝不会在外部提示词中泄露你的具体出生年月日等敏感隐私数据，你可以放心向大师咨询任何具体困扰。'
        },
        {
          q: '5. 娱乐选号与纯工具会调用外部 AI 产生消耗吗？',
          a: '双色球/大乐透娱乐选号为纯本地离线真随机算法，明确不挂载 AI 功能，零外部消耗且完全保护用户纯粹娱乐体验。'
        }
      ];

      H = `
        <div class="ng-section-hero">
          <div class="ng-kicker">${getWesternSvgIcon('idea', 14)} 新手解惑与避坑指南</div>
          <h3 class="ng-title">新手最常问的 5 个关键问题</h3>
          <p class="ng-desc">帮助你建立健康的认知心智模型，科学、理性、清醒地使用命理与决策工具。</p>
        </div>

        <div class="ng-faq-list">
          ${faqs.map(f => `
            <div class="ng-faq-item">
              <h4 class="faq-q">${f.q}</h4>
              <p class="faq-a">${f.a}</p>
            </div>
          `).join('')}
        </div>
      `;
      break;
  }

  container.innerHTML = H;
  container.scrollTop = 0;
}

/* ============================================================
   初始化全局快捷事件绑定
   ============================================================ */
export function initGlobalNoviceGuide() {
  if (typeof window === 'undefined') return;
  window.openNoviceGuide = openNoviceGuide;
  window.closeNoviceGuide = closeNoviceGuide;
  window.switchNoviceGuideTab = switchNoviceGuideTab;
}

// 保持与旧接口兼容
export function initOnboarding() {
  initGlobalNoviceGuide();
}
