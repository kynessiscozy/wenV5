/* ============================================================================
   命书化阅读引擎 · reading-mingshu.js
   依赖: window._ctx (由 renderAll 写入)、#p2Inner (DOM 容器)
   策略: DOM 后置改造,不动 renderAll;无依赖关系,失败自动降级
   fail-open: 任何异常都不影响原文阅读
   ============================================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const escapeHtml = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* WC 复刻:不依赖 engines/shared.js,避免循环引用风险 */
const WX_FIVE = ['木', '火', '土', '金', '水'];
const WX_COLOR = { 木: 'var(--c-green, #4a8e5a)', 火: 'var(--c-red, #c53b3b)', 土: 'var(--c-yellow, #b88a2e)', 金: 'var(--c-orange, #c08845)', 水: 'var(--c-teal, #4a7a8a)' };

/* ----------------------------------------------------------------------------
   卷首语字典
   三卷分别对应:ming(卷一·命格)、yun(卷二·运程)、rel(卷三·人际)
   ---------------------------------------------------------------------------- */
const VOLUME_META = {
  ming: {
    no: '卷一',
    title: '命格卷 · 立命之书',
    sub: '四柱既立,五行既分,先读我之所来',
    yuTpl: (ctx) => {
      const { dg, wx, b, city } = ctx;
      const ys = wx?.ys || '—';
      const xs = wx?.xs || '—';
      const sx = b?.sx || '';
      const dw = wx?.dw || '';
      const st = wx?.st ? '身旺' : '身弱';
      return `生而 ${escapeHtml(sx)} 属,立于 ${escapeHtml(city?.n || '中土')},<span class="hl">日主 ${escapeHtml(dg)}</span>,五行<span class="tg">${escapeHtml(dw)}${escapeHtml(st)}</span>。用神在<span class="hl">${escapeHtml(ys)}</span>,喜神在<span class="tg">${escapeHtml(xs)}</span>,是为立命之始。`;
    },
    qr: (ctx) => {
      const { dg, wx, b } = ctx;
      return [
        { k: '日主', v: `${escapeHtml(dg)} · ${escapeHtml(wx?.dw || '')}` },
        { k: '用神', v: `<span class="ms-wuxing" style="background:${WX_COLOR[wx?.ys] || 'currentColor'}"></span>${escapeHtml(wx?.ys || '—')}` },
        { k: '喜神', v: `<span class="ms-wuxing" style="background:${WX_COLOR[wx?.xs] || 'currentColor'}"></span>${escapeHtml(wx?.xs || '—')}` },
        { k: '生肖', v: escapeHtml(b?.sx || '—') }
      ];
    },
    footAuthor: '命师 · 文溪居士',
    seal: '立命'
  },
  yun: {
    no: '卷二',
    title: '运程卷 · 行命之书',
    sub: '大运十年一变,流年一年一换,次观我之所往',
    yuTpl: (ctx) => {
      const { cLn, cDy, lnSS, dySS } = ctx;
      const lnGZ = cLn ? (cLn.g + cLn.z) : '—';
      const dyGZ = cDy ? (cDy.g + cDy.z) : '—';
      return `今岁<span class="hl">${escapeHtml(lnGZ)}</span> 坐镇,十神为<span class="tg">${escapeHtml(lnSS || '—')}</span>;大运行<span class="hl">${escapeHtml(dyGZ)}</span> 之域,以<span class="tg">${escapeHtml(dySS || '—')}</span>为主调。知来者之可追,是谓行命。`;
    },
    qr: (ctx) => {
      const { cLn, cDy, ctx: c } = ctx;
      return [
        { k: '流年', v: cLn ? `${escapeHtml(cLn.g)}${escapeHtml(cLn.z)}` : '—' },
        { k: '大运', v: cDy ? `${escapeHtml(cDy.g)}${escapeHtml(cDy.z)}` : '—' },
        { k: '事业', v: (c?.cs != null) ? `${c.cs} 分` : '—' },
        { k: '财运', v: (c?.ws != null) ? `${c.ws} 分` : '—' }
      ];
    },
    footAuthor: '命师 · 文溪居士',
    seal: '行命'
  },
  rel: {
    no: '卷三',
    title: '人际卷 · 共命之书',
    sub: '独阴不生,孤阳不长,末观我之所与',
    yuTpl: (ctx) => {
      const { wx, dg, gen } = ctx;
      const ys = wx?.ys || '—';
      const suitable = wx?.ys === '木' ? '土金' : wx?.ys === '火' ? '金水' : wx?.ys === '土' ? '木水' : wx?.ys === '金' ? '火木' : '火土';
      return `${escapeHtml(gen === 'male' ? '乾' : '坤')}造以<span class="hl">${escapeHtml(dg)}</span> 立身,所喜在<span class="tg">${escapeHtml(ys)}</span>,所宜者<span class="hl">${escapeHtml(suitable)}</span> 之配。与人共命,先合其气,后合其心。`;
    },
    qr: (ctx) => {
      const { wx } = ctx;
      const suitable = wx?.ys === '木' ? '土金' : wx?.ys === '火' ? '金水' : wx?.ys === '土' ? '木水' : wx?.ys === '金' ? '火木' : '火土';
      return [
        { k: '感情评分', v: (ctx?.ls != null) ? `${ctx.ls} 分` : '—' },
        { k: '相配五行', v: escapeHtml(suitable) },
        { k: '适宜对象', v: '稳重 · 互补' },
        { k: '关系提醒', v: '立界 · 慢热' }
      ];
    },
    footAuthor: '命师 · 文溪居士',
    seal: '共命'
  }
};

/* ----------------------------------------------------------------------------
   章回标号字典
   每张 card 的 data-card 属性对应一个章回
   ---------------------------------------------------------------------------- */
const CHAPTER_META = {
  /* 卷一 · 命格 */
  bazi:    { no: '第一章', title: '四柱排盘',          pizhu: '年月日时四柱既定,命之骨架立于此;' },
  wuxing:  { no: '第二章', title: '五行能量',          pizhu: '五行有旺有衰,知所偏则知所补;' },
  persona: { no: '第三章', title: '人格画像',          pizhu: '思维、情绪、人际、决策、压力,五维观人;' },
  threestyles: { no: '第四章', title: '三式参断',     pizhu: '紫微、奇门、梅花,三式互参;' },
  /* 卷二 · 运程 */
  trend:        { no: '卷二 · 第一章', title: '当年核心趋势', pizhu: '事业、财运、感情、健康,四柱定调;' },
  timeline:     { no: '卷二 · 第二章', title: '大运十程',     pizhu: '十年一变,干前支后;' },
  liuyue:       { no: '卷二 · 第三章', title: '流月十二',     pizhu: '岁有其月,月有其令;' },
  weekFortune:  { no: '卷二 · 第四章', title: '本周运势',     pizhu: '七日干支,逐日推演;' },
  todayAdv:     { no: '卷二 · 第五章', title: '今日建议',     pizhu: '今日之势,见微知著;' },
  /* 卷三 · 人际 */
  loveMode:     { no: '卷三 · 第一章', title: '感情模式',     pizhu: '情之所起,先察于己;' },
  loveMatch:    { no: '卷三 · 第二章', title: '适合对象',     pizhu: '日主相合,五行相生;' },
  loveRisk:     { no: '卷三 · 第三章', title: '关系风险',     pizhu: '知险而能避;' },
  layoffRisk:   { no: '卷三 · 第四章', title: '职场风险',     pizhu: '现实证据优先,命理只作参;' },
  relAi:        { no: '卷三 · 第五章', title: '八字合盘',     pizhu: '两柱相较,合则成伴;' }
};

/* ----------------------------------------------------------------------------
   卷首语渲染
   ---------------------------------------------------------------------------- */
function renderVolume(sec, ctx) {
  const meta = VOLUME_META[sec];
  if (!meta) return null;
  const qrItems = meta.qr(ctx) || [];
  const qrHtml = qrItems.map(x => `<div class="ms-qr-item"><div class="ms-qr-k">${escapeHtml(x.k)}</div><div class="ms-qr-v">${x.v}</div></div>`).join('');
  const qrClass = qrItems.length === 4 ? 'ms-qr ms-qr-4' : 'ms-qr';
  return `
    <article class="ms-volume ms-card" data-vol="${escapeHtml(sec)}">
      <header class="ms-volume-head">
        <div class="ms-volume-no">${escapeHtml(meta.no)}</div>
        <div>
          <div class="ms-volume-title">${escapeHtml(meta.title)}</div>
          <div class="ms-volume-sub">${escapeHtml(meta.sub)}</div>
        </div>
      </header>
      <p class="ms-volume-yu">${meta.yuTpl(ctx)}</p>
      <div class="${qrClass}">${qrHtml}</div>
      <footer class="ms-volume-foot">
        <span class="ms-volume-author">${escapeHtml(meta.footAuthor)} · 题</span>
        <span class="ms-volume-seal">${escapeHtml(meta.seal)}</span>
      </footer>
    </article>
  `;
}

/* ----------------------------------------------------------------------------
   章回标号注入
   每张 .glass.card-2[data-card] 顶部加 .ms-chapter + .ms-pizhu
   同时把整张 .glass.card-2 包裹为 .ms-card(承担入场动效)
   ---------------------------------------------------------------------------- */
function injectChapter(sec, secRoot) {
  if (!secRoot) return;
  const cards = $$('.glass.card-2[data-card]', secRoot);
  cards.forEach((card, i) => {
    const key = card.dataset.card;
    const meta = CHAPTER_META[key];
    if (!meta) return;
    /* 避免重复注入 */
    if (card.querySelector('.ms-chapter')) return;
    /* 包裹为 .ms-card */
    if (!card.classList.contains('ms-card')) {
      card.classList.add('ms-card');
      card.style.setProperty('--ms-i', i);
    }
    /* 章回标号 */
    const chap = document.createElement('div');
    chap.className = 'ms-chapter';
    chap.innerHTML = `
      <span class="ms-chapter-no">${escapeHtml(meta.no)}</span>
      <span class="ms-chapter-title">${escapeHtml(meta.title)}</span>
      <span class="ms-chapter-rule"></span>
    `;
    /* 命师批注 */
    const pizhu = document.createElement('div');
    pizhu.className = 'ms-pizhu';
    pizhu.innerHTML = `<span class="ms-pizhu-text">${escapeHtml(meta.pizhu)} <span class="hl">— 详见本章</span></span>`;
    /* 插入到 card-hd 之后(若 card-hd 被 CSS 隐藏,DOM 仍在) */
    const hd = card.querySelector('.card-hd');
    if (hd && hd.nextSibling) {
      card.insertBefore(chap, hd.nextSibling);
      card.insertBefore(pizhu, chap.nextSibling);
    } else {
      card.insertBefore(chap, card.firstChild);
      card.insertBefore(pizhu, chap.nextSibling);
    }
  });
}

/* ----------------------------------------------------------------------------
   卷目录:在卷首语之后注入,列出本卷所有章回
   ---------------------------------------------------------------------------- */
function renderVolumeToc(sec, secRoot) {
  if (!secRoot) return;
  const volume = secRoot.querySelector('.ms-volume');
  if (!volume) return;
  if (secRoot.querySelector('.ms-toc')) return;
  const cards = $$('.glass.card-2[data-card]', secRoot);
  if (cards.length < 2) return; // 只有一章就不显示目录
  const items = cards.map(card => {
    const key = card.dataset.card;
    const meta = CHAPTER_META[key];
    if (!meta) return null;
    const id = `ms-jump-${sec}-${key}`;
    card.id = id;
    return `<li><a href="#${id}">${escapeHtml(meta.no.replace('卷二 · ', '').replace('卷三 · ', '').replace('卷一', ''))} ${escapeHtml(meta.title)}</a></li>`;
  }).filter(Boolean).join('');
  if (!items) return;
  const toc = document.createElement('nav');
  toc.className = 'ms-toc';
  toc.setAttribute('aria-label', '本卷目录');
  toc.innerHTML = `
    <div class="ms-toc-tt">本卷目录</div>
    <ul class="ms-toc-list">${items}</ul>
  `;
  volume.appendChild(toc);
}

/* ----------------------------------------------------------------------------
   卷末结语
   ---------------------------------------------------------------------------- */
function renderVolumeClosing(sec, ctx) {
  const closings = {
    ming: { text: '命由天定,运由己作。卷一既毕,', sub: '—— 次观行命' },
    yun: { text: '知来者之可追,行者无疆。卷二既毕,', sub: '—— 末观共命' },
    rel: { text: '与人共命,先合其气,后合其心。卷三既毕,', sub: '—— 命书终卷' }
  };
  const c = closings[sec];
  if (!c) return;
  return `<div class="ms-closing ms-card"><p class="ms-closing-text">${c.text.replace('既毕,', '既毕,<span class="hl">是谓知命</span>。')}</p><span class="ms-closing-sign">${escapeHtml(c.sub)}</span></div>`;
}

/* ----------------------------------------------------------------------------
   替代时间线 SVG 为纯章节列表 (年卷)
   ---------------------------------------------------------------------------- */
function replaceTimelineWithJuan(secRoot) {
  if (!secRoot) return;
  const card = secRoot.querySelector('[data-card="timeline"]');
  if (!card) return;
  /* 已有 .ms-juan-list 则跳过 */
  if (card.querySelector('.ms-juan-list')) return;
  /* 隐藏 .tl-curve-wrap / .tl-legend 容器(由 CSS 处理) */
  /* 改造 .tl-list 内的 .tl-card 为命书风章回 */
  const tlCards = $$('.tl-card', card);
  if (tlCards.length) {
    const list = document.createElement('div');
    list.className = 'ms-juan-list';
    tlCards.forEach(tl => {
      const gzEl = tl.querySelector('.tl-gz');
      const gz = gzEl ? gzEl.textContent.trim() : '';
      const themeEl = tl.querySelector('.tl-theme');
      const theme = themeEl ? themeEl.textContent.trim() : '';
      const ageEl = tl.querySelector('.tl-age-r');
      const age = ageEl ? ageEl.textContent.trim() : '';
      const yearEl = tl.querySelector('.tl-year-r');
      const year = yearEl ? yearEl.textContent.trim() : '';
      const ssEl = tl.querySelector('.tl-ss');
      const ss = ssEl ? ssEl.textContent.trim() : '';
      const scEl = tl.querySelector('.tl-sc');
      const sc = scEl ? parseInt(scEl.textContent.trim(), 10) : 0;
      const stage = tl.querySelector('.tl-stage')?.textContent.trim() || '';
      const isActive = tl.classList.contains('active');
      const isPast = tl.classList.contains('past');
      const tcol = themeEl?.style.color || 'var(--ac)';
      const starsHtml = '★★★★★'.split('').map((_, i) => `<span class="${i < Math.round(sc / 20) ? 'on' : ''}" style="color:${tcol}">★</span>`).join('');
      const stateCls = isActive ? 'active' : isPast ? 'past' : 'future';
      const stateLbl = isActive ? '当运' : isPast ? '已过' : '未至';
      const ageNum = (age.match(/(\d+)/) || ['', ''])[1] || age;
      const item = document.createElement('div');
      item.className = 'ms-juan-item';
      item.innerHTML = `
        <div class="ms-juan-age">${escapeHtml(ageNum)}<small>${escapeHtml(stage || ss)}</small></div>
        <div class="ms-juan-main">
          <div class="ms-juan-gz">${escapeHtml(gz)} · ${escapeHtml(ss)}</div>
          <div class="ms-juan-theme">${escapeHtml(theme)}</div>
        </div>
        <div class="ms-juan-meta">
          <div class="ms-juan-year">${escapeHtml(year)}</div>
          <div class="ms-juan-stars">${starsHtml}</div>
          <div class="ms-juan-state ${stateCls}">${escapeHtml(stateLbl)}</div>
        </div>
      `;
      /* 命书风:点击展开原 .tl-detail 的四象限 + 命师批注,作为单层展示 */
      item.addEventListener('click', () => {
        item.classList.toggle('ms-juan-open');
        let detail = item.querySelector('.ms-juan-detail');
        if (!detail) {
          detail = document.createElement('div');
          detail.className = 'ms-juan-detail';
          detail.style.gridColumn = '1 / -1';
          detail.style.padding = '10px 0 4px 64px';
          detail.style.fontSize = '.82em';
          detail.style.color = 'var(--c-text-2)';
          detail.style.borderTop = '1px dashed color-mix(in oklab, var(--ac) 20%, transparent)';
          detail.style.marginTop = '8px';
          const tlQuad = tl.querySelector('.tl-quad');
          const tlMs = tl.querySelector('.tl-ms');
          let html = '';
          if (tlQuad) {
            const qs = $$('.tl-q', tlQuad);
            html += qs.map(q => {
              const h = q.querySelector('.tl-q-h')?.textContent.trim() || '';
              const b = q.querySelector('.tl-q-b')?.textContent.trim() || '';
              return `<div style="display:inline-block;margin-right:14px;margin-bottom:4px"><span style="color:var(--ac);font-family:'STKaiti',serif">${escapeHtml(h)}：</span>${escapeHtml(b)}</div>`;
            }).join('');
          }
          if (tlMs) {
            const ms = $$('.tl-ms-pill', tlMs);
            if (ms.length) {
              html += `<div style="margin-top:4px">${ms.map(p => `<span class="sstag" style="margin-right:4px">${escapeHtml(p.textContent.trim())}</span>`).join('')}</div>`;
            }
          }
          detail.innerHTML = html;
          item.appendChild(detail);
        }
        detail.style.display = item.classList.contains('ms-juan-open') ? 'block' : 'none';
      });
      list.appendChild(item);
    });
    /* 移除原 .tl-curve-wrap / .tl-legend */
    card.querySelectorAll('.tl-curve-wrap, .tl-legend').forEach(el => el.remove());
    /* 在 .tl-foot 之前插入新列表 */
    const foot = card.querySelector('.tl-foot');
    if (foot) {
      card.insertBefore(list, foot);
    } else {
      card.appendChild(list);
    }
  }
}

/* ----------------------------------------------------------------------------
   流月改造:把 .lym-grid 注入命书风的「回」列表
   ---------------------------------------------------------------------------- */
function refineLiuyueAsJuan(secRoot) {
  if (!secRoot) return;
  const card = secRoot.querySelector('[data-card="liuyue"]');
  if (!card) return;
  const grid = card.querySelector('.lym-grid');
  if (!grid) return;
  if (card.querySelector('.ms-juan-list')) return;
  const items = $$('.lym-item', grid);
  if (!items.length) return;
  const list = document.createElement('div');
  list.className = 'ms-juan-list';
  items.forEach((it, i) => {
    const name = it.querySelector('.lym-name')?.textContent.trim() || '';
    const gz = it.querySelector('.lym-gz')?.textContent.trim() || '';
    const jq = it.querySelector('.lym-jq')?.textContent.trim() || '';
    const ss = it.querySelector('.lym-ss')?.textContent.trim() || '';
    const isCur = it.classList.contains('current');
    const stateCls = isCur ? 'active' : (i < new Date().getMonth() ? 'past' : 'future');
    const stateLbl = isCur ? '当月' : stateCls === 'past' ? '已过' : '未来';
    const item = document.createElement('div');
    item.className = 'ms-juan-item';
    item.innerHTML = `
      <div class="ms-juan-age">${escapeHtml(String(i + 1).padStart(2, '0'))}<small>月</small></div>
      <div class="ms-juan-main">
        <div class="ms-juan-gz">${escapeHtml(name)} · ${escapeHtml(gz)}</div>
        <div class="ms-juan-theme">${escapeHtml(jq)} · ${escapeHtml(ss)}</div>
      </div>
      <div class="ms-juan-meta">
        <div class="ms-juan-state ${stateCls}">${escapeHtml(stateLbl)}</div>
      </div>
    `;
    list.appendChild(item);
  });
  grid.replaceWith(list);
}

/* ----------------------------------------------------------------------------
   主入口
   ---------------------------------------------------------------------------- */
export function mountMingshu() {
  const root = document.getElementById('p2Inner');
  if (!root) return;
  if (root.dataset.mingshu === '1') return;
  const ctx = window._ctx || window._baziData || window._reportData || {};
  try {
    /* 1. 给 html 加上 mingshu-on 总开关(用于 CSS 命中入场动效) */
    document.documentElement.classList.add('mingshu-on');

    /* 2. 三卷的卷首语 + 章回标号 + 卷目录 + 卷末结语 */
    ['ming', 'yun', 'rel'].forEach(sec => {
      const secRoot = document.getElementById(`s-${sec}`);
      if (!secRoot) return;
      const eastern = secRoot.querySelector('.sys-eastern');
      const insertTarget = eastern || secRoot;
      /* 卷首语:插在 eastern 块顶部、renderBeginnerBrief 之前 */
      const volHtml = renderVolume(sec, ctx);
      if (volHtml) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = volHtml;
        const volEl = wrapper.firstElementChild;
        /* 插在第一个子元素之前 */
        insertTarget.insertBefore(volEl, insertTarget.firstElementChild);
      }
      /* 章回标号 */
      injectChapter(sec, secRoot);
      /* 卷目录 */
      renderVolumeToc(sec, secRoot);
      /* 卷末结语:插在 eastern 块末尾 */
      const closing = renderVolumeClosing(sec, ctx);
      if (closing && eastern) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = closing;
        eastern.appendChild(wrapper.firstElementChild);
      }
      /* 时间线 → 命书风章回 */
      if (sec === 'yun') {
        replaceTimelineWithJuan(secRoot);
        refineLiuyueAsJuan(secRoot);
      }
    });

    /* 3. 入场动效:用 IntersectionObserver 顺次显现 */
    const cards = $$('.ms-card', root);
    cards.forEach((c, i) => c.style.setProperty('--ms-i', i));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            en.target.classList.add('ms-in');
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
      cards.forEach(c => io.observe(c));
    } else {
      cards.forEach(c => c.classList.add('ms-in'));
    }

    root.dataset.mingshu = '1';
  } catch (e) {
    /* fail-open: 任何异常不影响原阅读 */
    console.warn('[mingshu] 命书化改造失败,已退回原版', e);
  }
}

export function unmountMingshu() {
  const root = document.getElementById('p2Inner');
  if (!root) return;
  if (root.dataset.mingshu !== '1') return;
  document.documentElement.classList.remove('mingshu-on');
  /* 移除命书化注入的节点(简易:重新渲染由 main.js 控制) */
  delete root.dataset.mingshu;
}

/* autoMount:监听 #p2Inner 内容变更时重挂(适配 renderAll 重渲染) */
export function autoMountMingshu() {
  if (typeof MutationObserver === 'undefined') return;
  const root = document.getElementById('p2Inner');
  if (!root) return;
  /* 简单去重:若内容已被标记为 mingshu 则不再挂 */
  const obs = new MutationObserver(() => {
    if (root.dataset.mingshu !== '1') {
      requestAnimationFrame(() => mountMingshu());
    }
  });
  obs.observe(root, { childList: true, subtree: false });
}
