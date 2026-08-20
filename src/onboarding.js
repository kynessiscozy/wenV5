/* ============================================================
   新手引导 · 首次访问分步引导
   触发：localStorage('tj_onboarded_v1') 未标记且无命盘时，于首页显示
   步骤：欢迎 → 问问大师 → 日历模式 → 立即排盘（核心激活）
   ============================================================ */

const ONBOARD_LS = 'tj_onboarded_v1';

const ONBOARD_STEPS = [
  {
    icon: '👋',
    title: '欢迎来到问问大师',
    desc: '用你的八字推演，辅助人生关键决策。先花 20 秒认识它，之后随时可跳过。',
  },
  {
    icon: '💬',
    title: '问问大师 · AI 对话',
    desc: '像朋友一样聊事业、感情、财运。结合你的命盘，给出有温度、可落地的建议。',
    action: { label: '先试着问我 →', run: () => window.openAsk && window.openAsk() },
  },
  {
    icon: '📅',
    title: '日历模式 · 每日运势',
    desc: '把命盘融进日历，每天看宜忌、能量与当日的行动提醒。',
    action: { label: '查看日历 →', run: () => window.openCalendarMode && window.openCalendarMode() },
  },
  {
    icon: '🪐',
    title: '先排个盘',
    desc: '填写出生时间与地点，大师才能结合你的命盘给出针对性建议。只需一次，自动保存。',
    final: true,
    action: { label: '立即排盘', run: () => window.TJOpenForm && window.TJOpenForm() },
  },
];

function _obMarkDone() {
  try { localStorage.setItem(ONBOARD_LS, '1'); } catch (e) {}
}

function _obClose(overlay) {
  if (!overlay || !overlay.isConnected) return;
  overlay.classList.add('onboard-hide');
  setTimeout(() => overlay.remove(), 260);
}

export function initOnboarding() {
  let done = false;
  try { done = localStorage.getItem(ONBOARD_LS) === '1'; } catch (e) {}
  if (done) return;
  // 已排盘（window._ctx 存在）则不再引导，直接进正式体验
  if (window._ctx) return;

  const steps = ONBOARD_STEPS;
  let i = 0;

  const overlay = document.createElement('div');
  overlay.className = 'onboard-overlay';
  overlay.innerHTML =
    '<div class="onboard-card" role="dialog" aria-modal="true" aria-label="新手引导">' +
      '<button class="onboard-x" type="button" aria-label="跳过引导">跳过</button>' +
      '<div class="onboard-icon"></div>' +
      '<h2 class="onboard-title"></h2>' +
      '<p class="onboard-desc"></p>' +
      '<button class="onboard-try" type="button" hidden></button>' +
      '<div class="onboard-dots"></div>' +
      '<div class="onboard-actions">' +
        '<button class="onboard-skip" type="button">跳过</button>' +
        '<button class="onboard-next" type="button"></button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const iconEl = overlay.querySelector('.onboard-icon');
  const titleEl = overlay.querySelector('.onboard-title');
  const descEl = overlay.querySelector('.onboard-desc');
  const tryBtn = overlay.querySelector('.onboard-try');
  const dotsEl = overlay.querySelector('.onboard-dots');
  const nextBtn = overlay.querySelector('.onboard-next');
  const skipBtn = overlay.querySelector('.onboard-skip');
  const xBtn = overlay.querySelector('.onboard-x');

  dotsEl.innerHTML = steps.map((_, k) => '<span class="onboard-dot' + (k === 0 ? ' active' : '') + '"></span>').join('');
  const dots = Array.from(dotsEl.children);

  function render() {
    const s = steps[i];
    iconEl.textContent = s.icon;
    titleEl.textContent = s.title;
    descEl.textContent = s.desc;
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
    // 末步主按钮变「开始体验」，其余为「下一步」
    if (i === steps.length - 1) {
      nextBtn.textContent = '开始体验';
      nextBtn.classList.add('onboard-final');
    } else {
      nextBtn.textContent = '下一步';
      nextBtn.classList.remove('onboard-final');
    }
    // 仅中间有快捷动作的步骤显示「立即体验」次级按钮（末步靠主按钮）
    if (s.action && !s.final) {
      tryBtn.hidden = false;
      tryBtn.textContent = s.action.label;
    } else {
      tryBtn.hidden = true;
    }
    // 第一步不显示左下「跳过」文案（用右上角 x 即可），避免双跳过
    skipBtn.style.visibility = i === 0 ? 'hidden' : 'visible';
  }

  function finish() {
    _obMarkDone();
    _obClose(overlay);
  }

  nextBtn.addEventListener('click', () => {
    const s = steps[i];
    if (i === steps.length - 1) {
      // 末步：立即排盘（核心激活），先关引导再开表单
      _obMarkDone();
      const run = s.action && s.action.run;
      _obClose(overlay);
      if (run) setTimeout(run, 300);
      return;
    }
    i++;
    render();
  });

  tryBtn.addEventListener('click', () => {
    const s = steps[i];
    _obMarkDone();
    const run = s.action && s.action.run;
    _obClose(overlay);
    if (run) setTimeout(run, 300);
  });

  function skip() { finish(); }
  skipBtn.addEventListener('click', skip);
  xBtn.addEventListener('click', skip);

  render();
}
