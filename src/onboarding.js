/* A compact, always-available guide to the current experience. */
import { getWesternSvgIcon } from './render/western-view.js';
import { focusSafely } from './ui/focus.js';

const tabs = [
  ['tour', '开始', 'sparkle'],
  ['eastern', '东方', 'astrolabe'],
  ['western', '西方', 'sun'],
  ['glossary', '术语', 'book'],
  ['faq', '问答', 'idea'],
];
let activeGuideTab = 'tour';
let returnFocus = null;

const header = (kicker, title, description) => `
  <div class="ng-section-hero">
    <div class="ng-kicker">${kicker}</div>
    <h3 class="ng-title">${title}</h3>
    <p class="ng-desc">${description}</p>
  </div>`;
const steps = items => `<div class="ng-steps-flow">${items.map(([title, text], i) => `
  <div class="ng-step-card">
    <span class="step-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
    <div class="step-content"><h4>${title}</h4><p>${text}</p></div>
  </div>`).join('')}</div>`;

const content = {
  tour: () => header('从这里开始', '一起看看，慢慢探索', '选择一种同行特质，再从自己的问题出发。') + steps([
    ['转动特质轮', '转一转，确认结果或再转一次。进入后也可以重新选择；更换特质不会改变已输入的信息或计算结果。'],
    ['填写出生信息', '填写日期、时间和地点后开始推演。结果出现后会停留，点击「查看报告」继续。'],
    ['阅读报告', '先看同行卡中的命盘信息；用顶部切换东方与西方，底部切换命盘、运势和关系。卡片里的按钮可继续查看细节。'],
    ['继续探索', '工具页有不同主题的体验。问问对话使用外部 AI 服务前，需要在设置中配置服务。'],
  ]),
  eastern: () => header('东方命理', '先看一览，再看依据', '四柱和五行是一套传统的解读方式，不是对人生的定论。') + steps([
    ['日主与四柱', '四柱由出生的年、月、日、时组成。日柱的天干称为日主，是阅读其余干支关系的起点。'],
    ['五行与用神', '一览显示日主、强弱、用神和格局。打开「五行结构」可查看分布；不同方法的判断可能不同。'],
    ['时间与关系', '在运势页查看大运、流年等时间线，在关系页阅读相处角度；结合现实处境判断，不必照单全收。'],
  ]),
  western: () => header('西方星相', '从太阳、月亮和上升开始', '星盘根据出生信息计算；出生时间和地点会影响部分结果。') + steps([
    ['认识三个起点', '太阳、月亮和上升分别是占星解读中常用的三个视角。继续阅读可查看行星、宫位和相位。'],
    ['与星盘互动', '拖动场景可旋转视角，点击人物可收起立绘，再用「显示立绘」恢复。鼠标滚轮可缩放，复位按钮可返回初始视角。设备不支持 3D 时仍可阅读文字报告。'],
    ['探索灵数', '关系页也提供基于出生日期的生命灵数体验。它是另一种解读框架，并非科学测量。'],
  ]),
  glossary: () => {
    const terms = [
      ['四柱', '东方', '出生年、月、日、时对应的四组干支。'],
      ['日主', '东方', '日柱的天干，是四柱解读的参照。'],
      ['用神', '东方', '传统命理中用于分析命局平衡的要素。'],
      ['大运 / 流年', '东方', '分别指较长阶段与单年的时间线索。'],
      ['上升', '西方', '出生时东方地平线升起的星座，受时间和地点影响。'],
      ['相位', '西方', '星盘中天体之间的特定角度关系。'],
    ];
    return header('常用术语', '遇到生词，先看这里', '这些解释帮助你理解报告里的基本概念。') + `
      <div class="ng-glossary-grid">${terms.map(([name, system, description]) => `
        <div class="ng-glossary-item">
          <div class="term-hd"><span class="term-name">${name}</span><span class="term-tag ${system === '东方' ? 'east' : 'west'}">${system}</span></div>
          <p class="term-desc">${description}</p>
        </div>`).join('')}</div>`;
  },
  faq: () => {
    const faqs = [
      ['不记得出生时间怎么办？', '请尽量核实。表单默认时间是 09:00；如果不确定，结果只是按所填时间计算，时柱和上升等内容可能不同。'],
      ['特质会影响命盘吗？', '不会。特质决定同行形象和演出，不参与命盘计算；可以随时重选，也可以取消。'],
      ['信息会保存或发送吗？', '档案和部分偏好可保存在本机浏览器。使用外部 AI 服务时，你的问题及相关上下文可能发送给所选服务商，请避免输入敏感信息并留意其隐私政策。'],
      ['结果可以用来做决定吗？', '报告和 AI 回答可能不准确，仅供文化体验与自我反思。医疗、法律、财务等重要决定请结合现实情况并咨询专业人士。'],
    ];
    return header('常见问题', '使用前，了解这些', '信息越准确，越方便你理解这份报告的计算前提。') + `
      <div class="ng-faq-list">${faqs.map(([question, answer]) => `
        <div class="ng-faq-item"><h4 class="faq-q">${question}</h4><p class="faq-a">${answer}</p></div>`).join('')}</div>`;
  },
};

export function openNoviceGuide(initialTab = 'tour') {
  activeGuideTab = Object.prototype.hasOwnProperty.call(content, initialTab) ? initialTab : 'tour';
  let modal = document.getElementById('noviceGuideModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'noviceGuideModal';
    modal.className = 'ng-modal';
    modal.innerHTML = `
      <div class="ng-backdrop" onclick="closeNoviceGuide()"></div>
      <div class="ng-sheet" role="dialog" aria-modal="true" aria-labelledby="ngTitle">
        <div class="ng-header">
          <div><h2 class="ng-header-title" id="ngTitle">新手指引</h2><p class="ng-header-sub">从选择同行，到读懂报告</p></div>
          <button class="ng-close-btn" type="button" onclick="closeNoviceGuide()" aria-label="关闭指引">×</button>
        </div>
        <div class="ng-tabs-bar" role="tablist" aria-label="指引目录">
          ${tabs.map(([key, label, icon]) => `<button class="ng-tab-btn" id="ng-tab-${key}" data-tab="${key}" onclick="switchNoviceGuideTab('${key}')" type="button" role="tab" aria-controls="ngBodyContent">${getWesternSvgIcon(icon, 14)} ${label}</button>`).join('')}
        </div>
        <div class="ng-body" id="ngBodyContent" role="tabpanel" tabindex="0"></div>
        <div class="ng-footer">
          <button class="ng-act-btn primary" type="button" onclick="closeNoviceGuide(); window.TJOpenForm && window.TJOpenForm();">填写出生信息</button>
          <button class="ng-act-btn ghost" type="button" onclick="closeNoviceGuide()">稍后再看</button>
        </div>
      </div>`;
    modal.addEventListener('keydown', guideKeydown);
    document.body.appendChild(modal);
  }
  if (!modal.classList.contains('open')) returnFocus = document.activeElement;
  modal.classList.add('open');
  switchNoviceGuideTab(activeGuideTab);
  focusSafely(modal.querySelector('.ng-close-btn'));
}

export function closeNoviceGuide() {
  const modal = document.getElementById('noviceGuideModal');
  if (!modal?.classList.contains('open')) return;
  modal.classList.remove('open');
  if (returnFocus?.isConnected && returnFocus.getClientRects().length) focusSafely(returnFocus);
  returnFocus = null;
}

export function switchNoviceGuideTab(tabKey) {
  activeGuideTab = Object.prototype.hasOwnProperty.call(content, tabKey) ? tabKey : 'tour';
  const modal = document.getElementById('noviceGuideModal');
  if (!modal) return;
  modal.querySelectorAll('.ng-tab-btn').forEach(button => {
    const selected = button.dataset?.tab === activeGuideTab;
    button.classList.toggle('active', selected);
    button.setAttribute?.('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  const panel = document.getElementById('ngBodyContent');
  if (!panel) return;
  panel.innerHTML = content[activeGuideTab]();
  panel.setAttribute?.('aria-labelledby', `ng-tab-${activeGuideTab}`);
  panel.scrollTop = 0;
}

function guideKeydown(event) {
  event.stopPropagation(); // Escape and numeric shortcuts must not affect the report behind the guide.
  if (event.key === 'Escape') { event.preventDefault(); closeNoviceGuide(); return; }
  const modal = event.currentTarget;
  if (event.target.matches('.ng-tab-btn') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    const current = tabs.findIndex(([key]) => key === event.target.dataset.tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
      (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    switchNoviceGuideTab(tabs[next][0]);
    modal.querySelector(`#ng-tab-${tabs[next][0]}`)?.focus();
  } else if (event.key === 'Tab') {
    const focusable = [...modal.querySelectorAll('button:not(:disabled), [tabindex="0"]')]
      .filter(node => node.getClientRects().length);
    const index = focusable.indexOf(document.activeElement);
    if (focusable.length && (index < 0 || (!event.shiftKey && index === focusable.length - 1) || (event.shiftKey && index === 0))) {
      event.preventDefault();
      focusable[event.shiftKey ? focusable.length - 1 : 0].focus();
    }
  }
}

export function initGlobalNoviceGuide() {
  if (typeof window === 'undefined') return;
  window.openNoviceGuide = openNoviceGuide;
  window.closeNoviceGuide = closeNoviceGuide;
  window.switchNoviceGuideTab = switchNoviceGuideTab;
}
export function initOnboarding() { initGlobalNoviceGuide(); }
