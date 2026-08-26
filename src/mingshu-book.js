/* ============================================================================
   命书 · 线装书阅读引擎 · mingshu-book.js
   依赖: window._ctx (renderAll 写入)、#p2Inner (DOM 容器)、mingshu.css 已挂载
   策略: 接管 #p2Inner 之后,把所有可读内容「拆为页」 → 注入线装舞台
   fail-open: 任何异常立即清理并退回原报告(不显示书形态)
   ============================================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ----------------------------------------------------------------------------
   1. 工具
   ---------------------------------------------------------------------------- */
const escapeHtml = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const WX_FIVE = ['木', '火', '土', '金', '水'];
const WX_COLOR = { 木: '#4a8e5a', 火: '#c53b3b', 土: '#b88a2e', 金: '#c08845', 水: '#4a7a8a' };
const TG_COLOR = { 比: '#4a8e5a', 劫: '#4a8e5a', 食: '#c53b3b', 伤: '#c53b3b', 财: '#b88a2e', 印: '#4a7a8a', 官: '#7a5a3a', 杀: '#7a5a3a' };

const CN_NUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const toCn = (n) => n < 11 ? CN_NUM[n] : n < 20 ? '十' + CN_NUM[n - 10]
  : n < 100 ? CN_NUM[Math.floor(n / 10)] + '十' + (n % 10 ? CN_NUM[n % 10] : '')
  : String(n);

/* ----------------------------------------------------------------------------
   2. 卷首页(总封)
   ---------------------------------------------------------------------------- */
function buildCover(ctx) {
  const juanNames = ['命格卷', '运程卷', '人际卷'];
  const dg = ctx?.dg || '—';
  const sx = ctx?.b?.sx || '';
  const wx = ctx?.wx?.dw || '';
  const ys = ctx?.wx?.ys || '—';
  const city = ctx?.city?.n || '—';
  const date = new Date();
  const yGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'][(date.getFullYear() - 4) % 10];
  const yZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][(date.getFullYear() - 4) % 12];
  const yunNian = `${yGan}${yZhi}年`;

  return `
    <article class="mb-page full v-stack" data-page="cover" data-juan="0">
      <div class="mb-page-corner">卷首</div>
      <div class="mb-cover">
        <div class="mb-cover-frame">
          <div class="mb-cover-pre">问问大师 · 命书</div>
          <h1 class="mb-cover-title">问 问 大 师 命 书</h1>
          <div class="mb-cover-sub">天机卷 · 三卷合璧</div>
          <div class="mb-cover-juan">
            ${juanNames.map((n, i) => `<span class="mb-cover-juan-item">${n}</span>`).join('<span class="mb-cover-dot">·</span>')}
          </div>
          <div class="mb-cover-author">
            <div>立命者:${escapeHtml(sx)}属 · 日主 ${escapeHtml(dg)} · ${escapeHtml(wx)}</div>
            <div>用神 ${escapeHtml(ys)} · 立于 ${escapeHtml(city)}</div>
            <div>${escapeHtml(yunNian)} 问命</div>
          </div>
          <div class="mb-cover-seal">命</div>
        </div>
      </div>
    </article>
  `;
}

/* ----------------------------------------------------------------------------
   3. 卷首页(每卷独立封里) — 卷一/卷二/卷三 的扉页
   ---------------------------------------------------------------------------- */
function buildVolumeCover(juan, ctx) {
  const meta = {
    1: { no: '卷一', title: '命格卷', sub: '立命之书', yu: '四柱既立,五行既分,先读我之所来' },
    2: { no: '卷二', title: '运程卷', sub: '行运之书', yu: '时运相推,流年相荡,次观我之所往' },
    3: { no: '卷三', title: '人际卷', sub: '因缘之书', yu: '情缘相系,人事相牵,终问我所与共' },
  }[juan];
  if (!meta) return '';

  return `
    <article class="mb-page full" data-page="juan-cover" data-juan="${juan}">
      <div class="mb-page-corner">${meta.no}</div>
      <div class="mb-cover">
        <div class="mb-cover-frame">
          <div class="mb-cover-pre">问问大师 · ${meta.no}</div>
          <h1 class="mb-cover-title">${meta.title}</h1>
          <div class="mb-cover-sub">${meta.sub}</div>
          <div class="mb-cover-juan">
            <span class="mb-cover-juan-item">${meta.yu}</span>
          </div>
          <div class="mb-cover-seal">${meta.no.replace('卷', '')}</div>
        </div>
      </div>
    </article>
  `;
}

/* ----------------------------------------------------------------------------
   4. 卷尾页(每卷末页) — 结语 + 落款
   ---------------------------------------------------------------------------- */
function buildVolumeClosing(juan) {
  const meta = {
    1: { sign: '立命者 · 卷一毕', note: '命格既定,行止由人。' },
    2: { sign: '行运者 · 卷二毕', note: '时运流转,慎独自牧。' },
    3: { sign: '问缘者 · 卷三毕', note: '因缘和合,随缘惜缘。' },
  }[juan];
  if (!meta) return '';

  return `
    <article class="mb-page full" data-page="juan-closing" data-juan="${juan}">
      <div class="mb-page-corner">${juan}/3 终</div>
      <div class="ms-closing">
        <div class="ms-closing-text">${meta.note}</div>
        <div class="ms-closing-sign">— ${meta.sign}</div>
      </div>
    </article>
  `;
}

/* ----------------------------------------------------------------------------
   5. 目录页(三卷目录合并到一页)
   ---------------------------------------------------------------------------- */
function buildToc(allChapters) {
  const groups = { 1: [], 2: [], 3: [] };
  allChapters.forEach((ch, i) => {
    if (groups[ch.juan]) groups[ch.juan].push({ ...ch, idx: i + 1 });
  });
  return `
    <article class="mb-page full" data-page="toc" data-juan="0">
      <div class="mb-page-corner">目录</div>
      <div class="mb-chapter-head">
        <div class="mb-chapter-no">总 目</div>
        <h2 class="mb-chapter-title">三卷总目</h2>
      </div>
      <div class="mb-toc-list">
        ${[1, 2, 3].map(j => {
          const meta = { 1: '卷一 · 命格', 2: '卷二 · 运程', 3: '卷三 · 人际' }[j];
          if (!groups[j].length) return '';
          return `
            <div class="mb-toc-group">
              <div class="mb-toc-juan">${meta}</div>
              <ol class="mb-toc-items">
                ${groups[j].map(ch => `
                  <li class="mb-toc-item" data-jump="${ch.idx}">
                    <span class="mb-toc-no">${toCn(ch.idx)}</span>
                    <span class="mb-toc-title">${escapeHtml(ch.title)}</span>
                    <span class="mb-toc-dots"></span>
                    <span class="mb-toc-page">第 ${toCn(ch.idx)} 页</span>
                  </li>
                `).join('')}
              </ol>
            </div>
          `;
        }).join('')}
      </div>
    </article>
  `;
}

/* ----------------------------------------------------------------------------
   6. 单章回页(每个 .glass.card-2 渲染成一页,可能跨多页)
   ---------------------------------------------------------------------------- */
function buildChapterPages(ch, pageStart) {
  // ch = { juan, no, title, pizhu, content (HTMLElement) }
  // 这里将 ch.content 子节点拆成若干净组,每组 1 页
  const groups = chunkContent(ch.content);
  const pages = [];
  groups.forEach((group, i) => {
    const pageNo = pageStart + i;
    const isFirst = i === 0;
    pages.push(`
      <article class="mb-page right" data-page="chapter" data-juan="${ch.juan}" data-page-no="${pageNo}">
        <div class="mb-page-corner">${ch.no}</div>
        <div class="mb-page-foot">第 ${toCn(pageNo)} 页</div>
        <div class="mb-page-content">
          ${isFirst ? `
            <header class="mb-chapter-head">
              <div class="mb-chapter-no">${escapeHtml(ch.no)}</div>
              <h2 class="mb-chapter-title">${escapeHtml(ch.title)}</h2>
            </header>
            ${ch.pizhu ? `<div class="mb-pizhu-inline">批:${escapeHtml(ch.pizhu)}</div>` : ''}
          ` : `
            <header class="mb-chapter-head">
              <div class="mb-chapter-no">${escapeHtml(ch.no)} · 续</div>
            </header>
          `}
          <div class="mb-chapter-body">${group}</div>
        </div>
      </article>
    `);
  });
  return pages;
}

/* 内容分块:把容器按直接子节点拆,每块最多 ~6 个段落 / 1 个表格 */
function chunkContent(container) {
  if (!container) return [''];
  const children = Array.from(container.children);
  if (children.length === 0) {
    // 没有直接子节点 → 当成整段
    return [container.innerHTML];
  }
  const groups = [];
  let cur = [];
  let curWeight = 0;
  const maxWeight = 6;

  for (const el of children) {
    const tag = el.tagName.toLowerCase();
    let w = 1;
    if (tag === 'table' || tag === 'ul' || tag === 'ol') w = 3;
    else if (tag === 'div' || tag === 'section') w = 2;
    if (curWeight + w > maxWeight && cur.length) {
      groups.push(cur.map(c => c.outerHTML).join(''));
      cur = [];
      curWeight = 0;
    }
    cur.push(el);
    curWeight += w;
  }
  if (cur.length) groups.push(cur.map(c => c.outerHTML).join(''));
  return groups.length ? groups : [container.innerHTML];
}

/* ----------------------------------------------------------------------------
   7. 配对生成 [left, right] 页对
   ---------------------------------------------------------------------------- */
function pairToSpread(pages) {
  // 每一对 = [left(空或上一页), right(本页)]
  // 简单方案:每页单独 right,左侧留空(实为前一页的延续)
  // 实际:页按奇偶,奇数页放左,偶数页放右
  // 但传统线装:每张是两页对开,内容单页也撑满
  // 这里采用:每页都是 right 页,左页放同一章节的"上一页"内容(如果有)
  return pages; // 不做配对,每页单独成 spread
}

/* ----------------------------------------------------------------------------
   8. 收集章节(从 #p2Inner 里识别 .glass.card-2)
   ---------------------------------------------------------------------------- */
function collectChapters() {
  const inner = $('#p2Inner');
  if (!inner) return [];
  const cards = $$('.glass.card-2', inner);
  const chapters = [];
  let juan = 1;
  cards.forEach((card, i) => {
    // 识别:卷一命格(1-3) 卷二运程(4-9) 卷三人际(10+)
    if (i >= 3) juan = 2;
    if (i >= 9) juan = 3;
    const titleEl = $('.card-title, h2, h3, .sec-title', card) || card.firstElementChild;
    const title = titleEl ? titleEl.textContent.trim() : `第 ${i + 1} 章`;
    // 提取批注 .pizhu / .ms-pizhu
    const pizhuEl = $('.pizhu, .ms-pizhu', card);
    const pizhu = pizhuEl ? pizhuEl.textContent.replace(/^批[:：]\s*/, '').trim() : '';
    // 包装:克隆卡片作为内容,去掉自己的标题(已抽到 head)和批注
    const clone = card.cloneNode(true);
    $$('.card-title, h2, h3, .sec-title, .pizhu, .ms-pizhu', clone).forEach(e => e.remove());
    chapters.push({
      idx: chapters.length + 1,
      juan,
      no: `第 ${toCn(chapters.length + 1)} 回`,
      title,
      pizhu,
      content: clone,
    });
  });
  return chapters;
}

/* ----------------------------------------------------------------------------
   9. 主入口:mountBook()
   ---------------------------------------------------------------------------- */
let bookState = null;

export function mountBook() {
  if (bookState) return; // 已挂载
  const inner = $('#p2Inner');
  if (!inner) return;
  if (inner.dataset.bookMounted === '1') return;

  try {
    document.documentElement.classList.add('has-js', 'mb-on');
    const ctx = window._ctx || {};
    const chapters = collectChapters();
    if (chapters.length === 0) {
      // 没东西可翻 → 退化为原报告
      document.documentElement.classList.remove('mb-on');
      return;
    }

    // 备份原报告(用于卸载)
    const original = inner.innerHTML;
    const originalClasses = inner.className;
    const originalDataset = { ...inner.dataset };
    inner.dataset.original = '1';
    inner.dataset.bookMounted = '1';

    // 拉取所有可读页(扁平化)
    const allPages = [];

    // ① 总封
    allPages.push(buildCover(ctx));

    // ② 目录
    allPages.push(buildToc(chapters));

    // ③ 三卷
    [1, 2, 3].forEach(j => {
      // 卷扉
      allPages.push(buildVolumeCover(j, ctx));
      // 该卷章节
      const juanChapters = chapters.filter(c => c.juan === j);
      let pageNo = allPages.length + 1;
      juanChapters.forEach(ch => {
        const ps = buildChapterPages(ch, pageNo);
        allPages.push(...ps);
        pageNo += ps.length;
      });
      // 卷末结语
      allPages.push(buildVolumeClosing(j));
    });

    // 注入线装舞台
    inner.innerHTML = `
      <div class="mb-stage">
        <div class="mb-book" data-spread="0">
          <aside class="mb-spine" aria-hidden="true"></aside>

          <div class="mb-content">
            <div class="mb-pages" data-current="0" data-total="${allPages.length}">
              <button class="mb-page-flip-left" type="button" aria-label="上一页">‹</button>
              <button class="mb-page-flip-right" type="button" aria-label="下一页">›</button>
              <div class="mb-page-stack"></div>
              <div class="mb-corner-fold" aria-hidden="true"></div>
            </div>
            <div class="mb-controls">
              <button class="mb-btn mb-prev" type="button" aria-label="上一页">上一页</button>
              <div class="mb-jump">
                <span class="mb-jump-label">第</span>
                <input class="mb-jump-input" type="number" min="1" max="${allPages.length}" value="1" aria-label="跳转到页" />
                <span class="mb-jump-label">页 / 共 ${allPages.length} 页</span>
                <button class="mb-btn mb-jump-go" type="button">跳转</button>
              </div>
              <button class="mb-btn mb-next" type="button" aria-label="下一页">下一页</button>
            </div>
          </div>

          <aside class="mb-flank" aria-hidden="true">
            <div class="mb-bookmarks" aria-label="书签"></div>
            <div class="mb-pager">
              <div class="mb-pager-juan">问问大师</div>
              <div class="mb-pager-page">一</div>
              <div class="mb-pager-total">/ ${toCn(allPages.length)}</div>
            </div>
          </aside>
        </div>
      </div>
    `;

    // 缓存所有页 HTML,后续只切数据,不重渲整个舞台
    bookState = {
      pages: allPages,
      current: null,
      total: allPages.length,
      original: { html: original, classes: originalClasses, dataset: originalDataset },
      inner,
    };

    // 首次渲染当前页对
    renderSpread(0);

    // 入场动画
    requestAnimationFrame(() => {
      $('.mb-book', inner)?.classList.add('mb-in');
    });

    // 绑定交互
    bindBookInteractions();

    // 暴露给调试
    window.__book = bookState;

    // 恢复上次的页
    try {
      const saved = parseInt(localStorage.getItem('wen_book_page') || '0', 10);
      if (saved > 0 && saved < allPages.length) {
        jumpTo(saved, false);
      }
    } catch (e) { /* localStorage 不可用 */ }

    // 自动从 URL hash 跳
    const hash = window.location.hash.match(/p=(\d+)/);
    if (hash) {
      const p = parseInt(hash[1], 10);
      if (p > 0 && p < allPages.length) jumpTo(p, false);
    }
  } catch (err) {
    // fail-open:清理舞台,恢复原报告
    console.warn('[mingshu-book] mount failed, fallback:', err);
    window.__bookErr = err;
    window.__bookStack = err && err.stack ? err.stack : '(no stack)';
    console.warn('[mingshu-book] STACK:', window.__bookStack);
    unmountBook();
  }
}

export function unmountBook() {
  if (!bookState) return;
  const { inner, original } = bookState;
  try {
    inner.innerHTML = original.html;
    inner.className = original.classes;
    Object.entries(original.dataset).forEach(([k, v]) => { inner.dataset[k] = v; });
    delete inner.dataset.bookMounted;
    delete inner.dataset.original;
  } catch (e) { /* 忽略 */ }
  document.documentElement.classList.remove('mb-on');
  bookState = null;
  window.__book = null;
}

/* ----------------------------------------------------------------------------
   10. 渲染当前页对:左 = pages[current],右 = pages[current+1]
       (实际渲染为 .mb-page.left + .mb-page.right,均使用 .full 跨整页)
   ---------------------------------------------------------------------------- */
function renderSpread(idx) {
  if (!bookState) return;
  const { pages, inner } = bookState;
  const safeIdx = Math.max(0, Math.min(idx, pages.length - 1));
  const stack = $('.mb-page-stack', inner);
  if (!stack) return;

  // 第一次渲染:直接放当前页,无动画
  if (bookState.current === null || !stack.firstElementChild) {
    bookState.current = safeIdx;
    stack.innerHTML = pages[safeIdx] || '';
    const p = stack.firstElementChild;
    if (p) p.classList.add('active');
    syncPager();
    return;
  }

  // 后续渲染:由 flipTo 处理动画;此处只直接换内容
  bookState.current = safeIdx;
  stack.innerHTML = pages[safeIdx] || '';
  const p = stack.firstElementChild;
  if (p) p.classList.add('active');
  syncPager();
}

function syncPager() {
  if (!bookState) return;
  const { pages, inner, current } = bookState;
  const total = pages.length;
  const pageNum = current + 1;
  const $p = (s) => $(s, inner);
  $p('.mb-pager-page').textContent = toCn(pageNum);
  $p('.mb-pager-total').textContent = `/ ${toCn(total)}`;
  $p('.mb-jump-input').value = pageNum;
  $p('.mb-prev').disabled = current <= 0;
  $p('.mb-next').disabled = current >= total - 1;
  $p('.mb-page-flip-left').style.opacity = current <= 0 ? '0.3' : '';
  $p('.mb-page-flip-right').style.opacity = current >= total - 1 ? '0.3' : '';
  try { localStorage.setItem('wen_book_page', String(current)); } catch (e) { /* */ }
  if (history && history.replaceState) history.replaceState(null, '', `#p=${current}`);
  // 通知目录 / 书签高亮
  $$('.mb-toc-item', inner).forEach(li => {
    li.classList.toggle('toc-current', parseInt(li.dataset.jump, 10) === current + 1);
  });
  highlightCurrentBookmark();
}

/* ----------------------------------------------------------------------------
   11. 翻页函数 — 3D 整页翻转
   ---------------------------------------------------------------------------- */
function flipTo(targetIdx) {
  if (!bookState) return;
  const { total, inner } = bookState;
  const target = Math.max(0, Math.min(targetIdx, total - 1));
  if (target === bookState.current) return;

  const stack = $('.mb-page-stack', inner);
  if (!stack) return;

  const dir = target > bookState.current ? 'forward' : 'backward';
  const oldEl = stack.firstElementChild;
  if (!oldEl) { renderSpread(target); return; }

  // 准备新页(从反面进)
  stack.insertAdjacentHTML('beforeend', bookState.pages[target]);
  const newEl = stack.lastElementChild;
  if (!newEl) { renderSpread(target); return; }

  // 给旧页加「翻出」类、新页加「进入」类
  if (dir === 'forward') {
    oldEl.classList.remove('active');
    oldEl.classList.add('gone-forward');
    newEl.classList.add('entering-forward');
  } else {
    oldEl.classList.remove('active');
    oldEl.classList.add('gone-backward');
    newEl.classList.add('entering-backward');
  }

  // 强制 reflow 触发过渡
  void newEl.offsetWidth;
  void oldEl.offsetWidth;

  // 触发:旧页翻走,新页翻到正面(用 setTimeout 让浏览器先 paint 一帧初始状态)
  setTimeout(() => {
    newEl.classList.remove('entering-forward', 'entering-backward');
    newEl.classList.add('active');
  }, 24);

  // 收尾:更新 state + 清理旧页
  const done = () => {
    if (oldEl && oldEl.parentNode) oldEl.parentNode.removeChild(oldEl);
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    // 立即跳
    done();
    bookState.current = target;
    syncPager();
    return;
  }

  setTimeout(() => {
    done();
    bookState.current = target;
    syncPager();
  }, 820);
}

function nextPage() { if (bookState) flipTo(bookState.current + 1); }
function prevPage() { if (bookState) flipTo(bookState.current - 1); }
function jumpTo(idx, animate = true) {
  if (!bookState) return;
  if (animate) flipTo(idx);
  else renderSpread(idx);
}

/* ----------------------------------------------------------------------------
   12. 书签
   ---------------------------------------------------------------------------- */
const BOOKMARK_KEY = 'wen_book_bookmarks';
function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]');
  } catch (e) { return []; }
}
function saveBookmarks(arr) {
  try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(arr)); } catch (e) { /* */ }
}
function addBookmark(idx) {
  const arr = loadBookmarks();
  if (!arr.includes(idx)) {
    arr.push(idx);
    arr.sort((a, b) => a - b);
    saveBookmarks(arr);
    renderBookmarks();
  }
}
function removeBookmark(idx) {
  const arr = loadBookmarks().filter(i => i !== idx);
  saveBookmarks(arr);
  renderBookmarks();
}
function renderBookmarks() {
  if (!bookState) return;
  const wrap = $('.mb-bookmarks', bookState.inner);
  if (!wrap) return;
  const arr = loadBookmarks();
  wrap.innerHTML = `
    <button class="mb-bookmark-add" type="button" title="加书签" aria-label="添加书签">+</button>
    ${arr.map(i => `
      <button class="mb-bookmark" type="button" data-idx="${i}" title="第 ${i + 1} 页" aria-label="跳到第 ${i + 1} 页">
        <span class="mb-bookmark-no">${toCn(i + 1)}</span>
      </button>
    `).join('')}
  `;
  // 绑定
  $$('.mb-bookmark', wrap).forEach(b => {
    b.addEventListener('click', () => jumpTo(parseInt(b.dataset.idx, 10)));
    b.addEventListener('dblclick', () => removeBookmark(parseInt(b.dataset.idx, 10)));
  });
  $('.mb-bookmark-add', wrap).addEventListener('click', () => {
    addBookmark(bookState.current);
  });
  // 高亮当前页书签
  highlightCurrentBookmark();
}
function highlightCurrentBookmark() {
  if (!bookState) return;
  const arr = loadBookmarks();
  $$('.mb-bookmark', bookState.inner).forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.idx, 10) === bookState.current);
  });
}

/* ----------------------------------------------------------------------------
   13. 交互绑定
   ---------------------------------------------------------------------------- */
function bindBookInteractions() {
  if (!bookState) return;
  const { inner } = bookState;

  // 上一页 / 下一页
  $('.mb-prev', inner)?.addEventListener('click', prevPage);
  $('.mb-next', inner)?.addEventListener('click', nextPage);
  $('.mb-page-flip-left', inner)?.addEventListener('click', prevPage);
  $('.mb-page-flip-right', inner)?.addEventListener('click', nextPage);

  // 跳转
  const jump = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const v = parseInt($('.mb-jump-input', inner).value, 10);
      if (!isNaN(v)) jumpTo(v - 1);
    }
  };
  $('.mb-jump-input', inner)?.addEventListener('keydown', jump);
  $('.mb-jump-go', inner)?.addEventListener('click', jump);

  // 键盘 ← →
  document.addEventListener('keydown', onKeyDown);

  // 折角拖拽(简化:点击 = 下一页)
  $('.mb-corner-fold', inner)?.addEventListener('click', nextPage);

  // 目录跳转
  $$('.mb-toc-item', inner).forEach(li => {
    li.addEventListener('click', () => {
      const idx = parseInt(li.dataset.jump, 10);
      if (!isNaN(idx)) jumpTo(idx - 1);
    });
  });

  // 书签
  renderBookmarks();

  // 翻页后高亮
  const origRender = renderSpread;
  // 包装一下以触发高亮
  // (直接在 renderSpread 末尾加)
  // 但为了不破坏模块边界,这里用 patch
  const _orig = renderSpread;
  // 重新定义行为:每次 renderSpread 之后调用 highlightCurrentBookmark
  const patched = (idx) => { _orig(idx); highlightCurrentBookmark(); };
  // eslint-disable-next-line no-func-assign
  renderSpread = patched;
}

let onKeyDown = (e) => {
  if (!bookState) return;
  // 不在输入框时
  if (e.target && /input|textarea/i.test(e.target.tagName)) return;
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault(); prevPage();
  } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
    e.preventDefault(); nextPage();
  } else if (e.key === 'Home') {
    e.preventDefault(); jumpTo(0);
  } else if (e.key === 'End') {
    e.preventDefault(); jumpTo(bookState.total - 1);
  }
};

/* ----------------------------------------------------------------------------
   14. 自动挂载(供 main.js 调用)
   ---------------------------------------------------------------------------- */
export function autoMountBook() {
  // 渲染完成后尝试挂载
  const tryMount = () => {
    if ($('#p2Inner')) mountBook();
  };
  // 第一次:立即试
  tryMount();
  // 后续:观察 DOM 变化(应对重渲染)
  if (window.__bookObserver) return;
  const obs = new MutationObserver(() => {
    if (!bookState && $('#p2Inner') && !$('#p2Inner').dataset.bookMounted) {
      tryMount();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  window.__bookObserver = obs;
}

/* ----------------------------------------------------------------------------
   15. 卸载 + 清理
   ---------------------------------------------------------------------------- */
export function destroyBook() {
  if (window.__bookObserver) {
    window.__bookObserver.disconnect();
    window.__bookObserver = null;
  }
  document.removeEventListener('keydown', onKeyDown);
  unmountBook();
}
