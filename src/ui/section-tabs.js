/* ============================================================
   分区标签页
   ------------------------------------------------------------
   问题：报告页是长卡片流，实测「关系」需滚 3.2 屏、「命盘」2.5 屏，
   用户要不断下滑才能找到想看的内容；折叠卡虽然压缩了高度，
   但「哪张卡里有什么」仍然不可见。

   方案：每个分区保留顶部「速读/一览」常驻，
   其下所有卡片改为标签页，一次只渲染一张，可横向快速切换。

   实现要点：
   · 不改动任何卡片的内部结构，只做「重新归位 + 显隐」
   · 标签由卡片标题自动生成，新增卡片无需改这里
   · 记住每个分区上次选中的标签（sessionStorage）
   ============================================================ */

const KEY = 'tj_sec_tab_v1';
// 这些卡片是「概览」，始终固定在顶部，不参与标签化
const PINNED = new Set(['beginner-brief', 'qr-card', 'demo-report-note']);

function _isPinned(card) {
  if (card.classList.contains('beginner-brief')) return true;
  if (card.classList.contains('qr-card')) return true;
  return PINNED.has(card.dataset.card || '');
}

/* 标签文案：优先用固定短标签。
   自动截断曾产出「2026年流」这种被切断的词（原限 6 字），
   而且标签与卡片标题完全重复，等于同一句话说两遍。 */
const LABELS = {
  structure: '命盘', persona: '人格', 'three-styles': '三式', reasoning: '判读依据',
  bazi: '四柱', wuxing: '五行', ziwei: '紫微', qimen: '奇门', meihua: '梅花',
  trend: '当年运势', timeline: '人生时间线', focus: '当下关注', liuyue: '流月',
  weekFortune: '本周运势', todayAdv: '今日建议', daySign: '今日日签',
  intimacy: '亲密关系', friends: '朋友', family: '亲人', relAi: '八字合盘',
  loveMode: '感情模式', loveMatch: '适合对象', loveRisk: '关系风险',
  layoffRisk: '裁员风险', toolHub: '小工具',
};

function _rawTitle(card) {
  const el = card.querySelector('.card-tt') || card.querySelector('.qr-title') || card.querySelector('.bb-title');
  return (el?.textContent || '').trim();
}

function _title(card) {
  if (card.dataset.secTab) return card.dataset.secTab;   // 标头可能已被精简，缓存住
  const key = card.dataset.card || '';
  if (LABELS[key]) return LABELS[key];
  let t = _rawTitle(card) || key || '内容';
  t = t.replace(/（[^）]*）/g, '').split(/[·|]/)[0]      // 去括号补充与副标题
       .replace(/^\s*\d{4}\s*年\s*/, '')                 // 「2026年流月」→「流月」
       .replace(/[⚠✦]/g, '').replace(/\s+/g, '').trim();
  if (t.length > 7) t = t.slice(0, 7);
  return t || '内容';
}

function _titleCached(card) {
  const t = _title(card);
  card.dataset.secTab = t;
  return t;
}

/* 标签已经写明这是哪一段，卡片里的图标 + 同名大标题就是重复信息。
   去掉标头，只把副标题保留成一行说明。 */
/* 精简标头。
   关键：只做「隐藏」不做「删除」——新手模式要把卡片原样还回 .sec，
   删掉的标头无法还原。用 class 标记，teardown 时一并撤销。 */
function _slimHead(card, label) {
  const hd = card.querySelector(':scope > .card-hd');
  if (!hd || card.dataset.slimmed === '1') return;
  const tt = (hd.querySelector('.card-tt')?.textContent || '').replace(/\s+/g, '');
  const st = (hd.querySelector('.card-st')?.innerHTML || '').trim();
  // 标题与标签不同源时（极少数）保留原标头，避免丢失信息
  const dup = tt && (tt.includes(label) || label.includes(tt.slice(0, 2)));
  if (!dup) return;
  card.dataset.slimmed = '1';
  hd.classList.add('sec-head-hidden');
  // 副标题若只是在罗列下面那排子标签（如「四柱、五行、细盘与十神关系」
  // 下面正好就是四个同名子标签），也是重复信息，不再另行展示
  const subTabs = [...card.querySelectorAll('.structure-tab, .focus-tab')]
    .map(b => b.textContent.trim()).filter(Boolean);
  const plain = st.replace(/<[^>]*>/g, '');
  const hit = subTabs.filter(x => x && plain.includes(x)).length;
  if (hit >= 2 || !st) return;
  const d = document.createElement('div');
  d.className = 'sec-pane-desc';
  d.innerHTML = st;
  hd.insertAdjacentElement('afterend', d);
}

/* 撤销 _slimHead，把卡片恢复成原始结构 */
function _restoreHead(card) {
  if (card.dataset.slimmed !== '1') return;
  delete card.dataset.slimmed;
  card.querySelector(':scope > .card-hd')?.classList.remove('sec-head-hidden');
  card.querySelector(':scope > .sec-pane-desc')?.remove();
}

function _load() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
}
function _save(secId, idx) {
  try {
    const m = _load(); m[secId] = idx;
    sessionStorage.setItem(KEY, JSON.stringify(m));
  } catch (e) {}
}

function build(sec) {
  if (!sec) return;
  /* 新手模式必须还原成「卡片是 .sec 的直接子元素」。
     styles.css 用 `body.beginner-mode .sec > .glass{display:none}` 隐藏
     大师专属卡片 —— 这是个依赖直接子层级的选择器。
     标签页把卡片搬进 .sec > .sec-tabs-wrap > .sec-panes > .sec-pane 后
     层级变深，该规则不再匹配，导致新手模式下大师卡片与标签栏全部照常显示。
     （实测：新手/大师两种模式 panes 数量完全一致，均为 4/5/4） */
  if (document.body.classList.contains('beginner-mode')) { teardown(sec); return; }
  const wrapEl = sec.querySelector(':scope > .sec-tabs-wrap');
  // 关键：已经归位到面板里的卡片也要算进来，否则每轮轮询都会看到
  // 「.sec 直接子里没有卡片」→ 误判为需要拆除 → 拆了又建，无限循环
  const cards = [
    ...[...sec.children].filter(c => c.classList && (c.classList.contains('glass') || c.classList.contains('beginner-brief'))),
    ...(wrapEl ? [...wrapEl.querySelectorAll(':scope > .sec-panes > .sec-pane > *')] : []),
  ];
  const tabbable = cards.filter(c => !_isPinned(c));

  // 少于 2 张无需标签页
  if (tabbable.length < 2) { teardown(sec); return; }

  let wrap = sec.querySelector(':scope > .sec-tabs-wrap');
  const signature = tabbable.map(c => c.dataset.card || _title(c)).join('|');

  if (wrap) {
    if (wrap.dataset.sig === signature) return;   // 结构未变，直接返回
    const panes = [...wrap.querySelectorAll('.sec-pane')];

    // organizeMasterReportLayout 等逻辑会在切换分区时把卡片重新
    // insertBefore/appendChild 回 .sec，等于把它们从面板里"抢"出去。
    // 这里不拆整个结构，只把跑出去的卡片收回原属面板 —— 保持标签稳定。
    let reclaimed = 0;
    for (const card of tabbable) {
      const key = card.dataset.card || _title(card);
      const home = panes.find(p2 => p2.dataset.pane === key);
      if (home) { home.appendChild(card); reclaimed++; }
    }
    if (reclaimed === tabbable.length) return;   // 全部收回，结构无需变动

    teardown(sec);
    return build(sec);
  }

  wrap = document.createElement('div');
  wrap.className = 'sec-tabs-wrap';
  wrap.dataset.sig = signature;

  const bar = document.createElement('div');
  bar.className = 'sec-tabs';
  bar.setAttribute('role', 'tablist');

  const panes = document.createElement('div');
  panes.className = 'sec-panes';

  tabbable.forEach((card, i) => {
    const id = card.dataset.card || ('pane' + i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sec-tab';
    const label = _titleCached(card);
    btn.textContent = label;
    btn.setAttribute('role', 'tab');
    btn.dataset.idx = String(i);
    btn.addEventListener('click', () => select(sec, i, true));
    bar.appendChild(btn);

    // 折叠态在标签页里没有意义：进入即完整展示
    card.classList.remove('collapsed');
    card.querySelector('.card-toggle')?.remove();
    // 去卡片壳 + 去重复标头：标签页本身已是容器与标题
    card.classList.add('sec-plain');
    _slimHead(card, label);
    // 去壳后，外层按钮与卡内子卡的按钮会紧挨着出现两个
    // 「这段是什么意思」（实测命盘页）。外层那个已无所指，去掉。
    const pane = document.createElement('div');
    pane.className = 'sec-pane';
    pane.dataset.pane = id;
    pane.appendChild(card);
    panes.appendChild(pane);
  });

  wrap.appendChild(bar);
  wrap.appendChild(panes);
  sec.appendChild(wrap);

  const saved = _load()[sec.id];
  select(sec, Number.isInteger(saved) && saved < tabbable.length ? saved : 0, false);
}

function select(sec, idx, persist) {
  const wrap = sec.querySelector(':scope > .sec-tabs-wrap');
  if (!wrap) return;
  const tabs = [...wrap.querySelectorAll('.sec-tab')];
  const panes = [...wrap.querySelectorAll('.sec-pane')];
  tabs.forEach((t, i) => {
    const on = i === idx;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
  });
  panes.forEach((p, i) => p.classList.toggle('active', i === idx));
  if (persist) {
    _save(sec.id, idx);
    // 切标签后把视图带回该区顶部，否则会停在上一张卡的滚动位置
    const sc = document.getElementById('p2Scroll');
    const top = wrap.getBoundingClientRect().top - (sc?.getBoundingClientRect().top || 0);
    if (sc && top < 0) sc.scrollBy({ top, behavior: 'smooth' });
    tabs[idx]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
}

function teardown(sec) {
  const wrap = sec.querySelector(':scope > .sec-tabs-wrap');
  if (!wrap) return;
  wrap.querySelectorAll('.sec-pane > *').forEach(c => {
    c.classList.remove('sec-plain');
    _restoreHead(c);
    sec.appendChild(c);
  });
  wrap.remove();
}

export function initSectionTabs() {
  let building = false;
  const run = () => {
    if (building) return;
    if (!document.body.classList.contains('report-active')) return;
    building = true;
    try { ['s-ming', 's-yun', 's-rel'].forEach(id => build(document.getElementById(id))); }
    finally { setTimeout(() => { building = false; }, 0); }
  };

  /* 说明：这里刻意不依赖以下三种方式，它们都被实测证伪：
       1. 包装 window.switchTab —— main.js 之后会重新赋值，包装失效
       2. 初始化时观察 .sec —— 报告未渲染时 .sec 数量为 0，观察不到
       3. 仅靠 MutationObserver 防抖 —— 自身 DOM 写入会不断重置计时器
     改为「轮询 + 稳定即停」：报告激活后短时间内周期性尝试构建，
     结构稳定（连续两次签名一致）后停止，成本可忽略。 */
  let timer = null, lastSig = '', stable = 0;
  const sig = () => ['s-ming', 's-yun', 's-rel']
    .map(id => document.getElementById(id)?.querySelectorAll('.sec-tab').length || 0).join(',');

  function startPolling() {
    if (timer) return;
    stable = 0; lastSig = '';
    timer = setInterval(() => {
      if (!document.body.classList.contains('report-active')) { stopPolling(); return; }
      run();
      const s2 = sig();
      stable = (s2 === lastSig && s2 !== '0,0,0') ? stable + 1 : 0;
      lastSig = s2;
      if (stable >= 3) stopPolling();          // 连续三次无变化即认为稳定
    }, 400);
    setTimeout(stopPolling, 15000);            // 兜底，绝不长跑
  }
  function stopPolling() { clearInterval(timer); timer = null; }

  /* body 的 class 同时承载 report-active 与 beginner-mode。
     新手↔大师切换必须立刻 run() 一次：仅靠轮询会有最多 400ms 的窗口，
     期间标签栏仍留在新手版页面上（用户可见的闪烁）。 */
  let lastBeginner = document.body.classList.contains('beginner-mode');
  new MutationObserver(() => {
    const nowBeginner = document.body.classList.contains('beginner-mode');
    if (nowBeginner !== lastBeginner) { lastBeginner = nowBeginner; run(); }
    if (document.body.classList.contains('report-active')) startPolling();
    else stopPolling();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // 分区切换 / 模式切换都会改变卡片集合，重新开一轮轮询
  document.addEventListener('click', e => {
    if (e.target.closest?.('.tab-item') || e.target.closest?.('.mode-top-switch')) startPolling();
  }, true);

  // 卡片集合发生变化（新手↔大师重排、分区懒渲染）时重新开轮询。
  // 只看 .sec 的直接子节点增减，避免被自身写入触发。
  const cardObs = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.target instanceof Element && m.target.classList?.contains('sec')) { startPolling(); return; }
    }
  });
  // 只需在 .sec 首次出现时挂一次观察器。
  // 早期写成 setInterval(…, 1000) 永久轮询，会让页面一直有待处理任务，
  // 导致 Puppeteer 截图超时（实测 test-syn-fold 卡死）。
  const attachCardObs = () => {
    const list = document.querySelectorAll('.sec');
    list.forEach(el => {
      if (el.__cardObs) return;
      el.__cardObs = 1;
      cardObs.observe(el, { childList: true });
    });
    return list.length > 0;
  };
  if (!attachCardObs()) {
    let tries = 0;
    const t = setInterval(() => {
      if (attachCardObs() || ++tries > 40) clearInterval(t);   // 最多等 20s
    }, 500);
  }

  if (document.body.classList.contains('report-active')) startPolling();
  window.TJBuildSectionTabs = run;
}
