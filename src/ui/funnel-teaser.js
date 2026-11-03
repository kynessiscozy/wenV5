/* 漏斗预告页（P2）：从 funnel.html 进来的访客，推演完成后先看一页
   「地炎君预告」——真排盘 + 日主基调 + 三个引擎事实钩子 + 报告目录，
   再一键进入完整报告。全程免费，无任何锁定与收费元素。
   所有数字与干支都取自 window._ctx 的真实推演结果，不另造解读。
   触发条件保持 applied && !teasered（含载入档案 / 重新推演），但预告页本身
   现在是可退出的模态：可关闭、可跳过、支持 Esc 与焦点约束，并隔离背景交互。 */

import { focusSafely } from './focus.js';
import { personaFor } from './entry-personas.js';

const DAY_MASTER_TONE = {
  甲: '甲木参天，认准方向便不轻易回头，做事讲原则、有担当。',
  乙: '乙木如藤，看似柔和，韧性极强，擅长在缝隙里找到自己的路。',
  丙: '丙火如日，热情直接，藏不住心事，感染力是你的天赋。',
  丁: '丁火如灯，外静内明，心思细、悟性高，认定的人和事会守很久。',
  戊: '戊土如山，稳重可靠，答应的事一定做到，是身边人的定心丸。',
  己: '己土如园，包容务实，手巧心细，擅长把日子过出秩序感。',
  庚: '庚金如刃，快人快语，执行力强，越是难事越能显出锋芒。',
  辛: '辛金如玉，精致敏锐，审美与直觉俱佳，对品质有自己的坚持。',
  壬: '壬水如江，脑子转得快，格局大，不喜欢被小事困住手脚。',
  癸: '癸水如雨，温润聪慧，洞察人心，常常一句话点中要害。',
};

const CONCERN_SCORE = {
  career: ['cs', '事业'],
  love: ['ls', '感情'],
  health: ['hs', '健康'],
};

const STYLE_ID = 'funnel-teaser-style';
const OVERLAY_ID = 'funnelTeaser';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
  #${OVERLAY_ID}{position:fixed;inset:0;z-index:1200;background:#0c0908;color:#f3e9dc;
    font-family:"Noto Serif SC","Songti SC",serif;overflow-y:auto;padding:26px 20px calc(30px + env(safe-area-inset-bottom));}
  #${OVERLAY_ID} .ft-wrap{max-width:620px;margin:0 auto;}
  #${OVERLAY_ID} .ft-hero{width:100%;height:300px;object-fit:cover;object-position:center 22%;border-radius:16px;
    border:1px solid rgba(216,162,74,.32);margin-bottom:18px;background:#000;display:block;}
  #${OVERLAY_ID} .ft-head{display:flex;align-items:center;gap:12px;margin-bottom:6px;}
  #${OVERLAY_ID} .ft-head img{width:46px;height:46px;border-radius:50%;border:1px solid rgba(216,162,74,.5);object-fit:cover;background:#000;}
  #${OVERLAY_ID} .ft-kicker{font-size:12px;letter-spacing:.3em;color:#e8c595;}
  #${OVERLAY_ID} .ft-title{font-size:21px;font-weight:700;margin-top:2px;}
  #${OVERLAY_ID} .ft-open{font-size:16px;line-height:1.9;margin:14px 0 4px;}
  #${OVERLAY_ID} .ft-open .hl{color:#d8a24a;}
  #${OVERLAY_ID} .ft-card{background:rgba(26,18,16,.88);border:1px solid rgba(216,162,74,.32);border-radius:16px;padding:20px;margin-top:28px;}
  #${OVERLAY_ID} .ft-card h3{font-size:13px;letter-spacing:.28em;color:#e8c595;margin-bottom:12px;font-weight:600;}
  #${OVERLAY_ID} .ft-pillars{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;}
  #${OVERLAY_ID} .ft-pillars .pl{background:rgba(243,233,220,.05);border-radius:10px;padding:10px 4px;}
  #${OVERLAY_ID} .ft-pillars .pl b{display:block;font-size:20px;letter-spacing:.1em;}
  #${OVERLAY_ID} .ft-pillars .pl span{font-size:11px;color:#c9bba6;letter-spacing:.2em;}
  #${OVERLAY_ID} .ft-meta{margin-top:12px;font-size:14px;line-height:1.9;color:#e6dac6;}
  #${OVERLAY_ID} .ft-hook{font-size:15.5px;line-height:1.95;padding:10px 0;border-bottom:1px dashed rgba(216,162,74,.25);}
  #${OVERLAY_ID} .ft-hook:last-child{border-bottom:none;}
  #${OVERLAY_ID} .ft-hook b{color:#d8a24a;}
  #${OVERLAY_ID} .ft-toc{list-style:none;font-size:15px;line-height:2.05;color:#e6dac6;}
  #${OVERLAY_ID} .ft-toc li::before{content:"·";color:#d8a24a;margin-right:8px;}
  #${OVERLAY_ID} .ft-close{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));right:16px;z-index:3;
    width:38px;height:38px;border-radius:50%;border:1px solid rgba(216,162,74,.55);cursor:pointer;
    background:rgba(12,9,8,.82);color:#f3e9dc;font-size:22px;line-height:1;}
  #${OVERLAY_ID} .ft-close:focus-visible,#${OVERLAY_ID} .ft-cta:focus-visible,#${OVERLAY_ID} .ft-skip:focus-visible{outline:2px solid #e8c595;outline-offset:3px;}
  #${OVERLAY_ID} .ft-skip{display:block;width:100%;margin-top:10px;appearance:none;border:0;background:none;
    color:#c9bba6;font:inherit;font-size:13.5px;letter-spacing:.1em;cursor:pointer;padding:10px;text-decoration:underline;text-underline-offset:4px;}
  #${OVERLAY_ID} .ft-cta{display:block;width:100%;margin-top:26px;appearance:none;border:1px solid #c89b5a;cursor:pointer;
    position:sticky;bottom:12px;z-index:2;background:linear-gradient(180deg,#8a2015,#5f130d);color:#fff;font:inherit;
    font-size:17px;letter-spacing:.3em;padding:16px;border-radius:8px;
    box-shadow:inset 0 0 0 3px rgba(20,8,5,.55),inset 0 0 0 4px rgba(200,155,90,.45),0 14px 34px rgba(0,0,0,.6);}
  #${OVERLAY_ID} .ft-free{text-align:center;font-size:12.5px;color:#c9bba6;margin-top:12px;letter-spacing:.12em;}
  #${OVERLAY_ID} .ft-note{font-size:12.5px;color:rgba(201,187,166,.8);margin-top:10px;line-height:1.8;}
  `;
  document.head.appendChild(style);
}

function readPayload() {
  try {
    const p = JSON.parse(localStorage.getItem('wen_funnel_v1') || 'null');
    return p && p.applied && !p.teasered ? p : null;
  } catch (e) { return null; }
}

function markTeasered(p) {
  try { p.teasered = 1; localStorage.setItem('wen_funnel_v1', JSON.stringify(p)); } catch (e) {}
}

function bumpStat(key) {
  try {
    const s = JSON.parse(localStorage.getItem('wen_funnel_stats_v1') || '{}');
    s[key] = (s[key] || 0) + 1;
    localStorage.setItem('wen_funnel_stats_v1', JSON.stringify(s));
  } catch (e) {}
}

function pillar(b, key) {
  const p = b && b[key];
  return p && p.g ? `${p.g}${p.z || ''}` : '—';
}

function reportToc() {
  /* 目录取报告本人的三个分区：分区名 + 该区速读标题 + 评分，全部是真内容。 */
  const secs = [
    ['s-ming', '命盘'],
    ['s-yun', '运势'],
    ['s-rel', '关系'],
  ];
  const out = [];
  for (const [id, label] of secs) {
    const sec = document.getElementById(id);
    if (!sec) continue;
    const head = (sec.querySelector('.bb-title')?.textContent || '').trim().replace(/\s+/g, ' ');
    const score = (sec.querySelector('.bs-head')?.textContent || '').trim().replace(/\s+/g, ' ');
    out.push({ label, head, score });
  }
  if (out.length) out.push({ label: '工具', head: '十二位大师工具箱：合盘、择日、塔罗、风水都在这一页', score: '' });
  return out;
}

export function showFunnelTeaserIfNeeded() {
  const payload = readPayload();
  const ctx = window._ctx;
  if (!payload || !ctx || ctx.isDemoPreview || document.getElementById(OVERLAY_ID)) return false;

  const b = ctx.b || {};
  const name = (payload.name || '').trim();
  const yearNow = ctx.cLn && ctx.cLn.y ? ctx.cLn.y : new Date().getFullYear();

  /* 钩子一：下一次大运换柱 */
  let hookDayun = '';
  const ds = (ctx.dy && ctx.dy.ds) || [];
  const next = ds[ctx.cDyIdx + 1];
  if (next) {
    hookDayun = `<b>${next.ys} 年</b>（${next.as} 岁）起，大运换柱为「${next.g}${next.z}」（${ctx.ssOf(next.g) || '新运'}）——人生节奏换挡的年份，报告里逐年为你拆。`;
  } else if (ctx.cDy) {
    hookDayun = `你正走在「${ctx.cDy.g}${ctx.cDy.z}」大运的深处（${ctx.cDy.ys}–${ctx.cDy.ye}），这一步运的得失，报告里已经算清。`;
  }

  /* 钩子二：今年评分（优先回应用户在问卷里选的烦恼） */
  const scoreRows = [
    ['cs', '事业', ctx.cs], ['ws', '财运', ctx.ws], ['ls', '感情', ctx.ls], ['hs', '健康', ctx.hs],
  ].filter(r => typeof r[2] === 'number');
  let hookScore = '';
  let focus = null;
  let fromConcern = false;
  for (const c of (payload.concerns || [])) {
    if (CONCERN_SCORE[c]) { focus = scoreRows.find(r => r[0] === CONCERN_SCORE[c][0]); if (focus) { fromConcern = true; break; } }
  }
  if (!focus && scoreRows.length) focus = scoreRows.reduce((a, r) => (r[2] > a[2] ? r : a), scoreRows[0]);
  if (focus) {
    const lowest = scoreRows.reduce((a, r) => (r[2] < a[2] ? r : a), scoreRows[0]);
    const lead = fromConcern ? `你问的<b>${focus[1]}</b>` : `${yearNow} 年四项里最旺的是<b>${focus[1]}</b>`;
    hookScore = `${lead}，评分为 <b>${focus[2]} 分</b>${lowest && lowest[0] !== focus[0] ? `；最要留心的是${lowest[1]}（${lowest[2]} 分）` : ''}。分数背后的时间点，都在完整报告里。`;
  }

  /* 钩子三：明年流年 */
  let hookNextYear = '';
  const lnNext = (ctx.ln || []).find(e => e.y === yearNow + 1);
  if (lnNext) {
    hookNextYear = `明年（${lnNext.y}）流年「${lnNext.g}${lnNext.z}」，十神为<b>${ctx.ssOf(lnNext.g) || '—'}</b>——这一年的主题词，已经替你标在报告里。`;
  }

  const PERSONA = personaFor(payload.trait);
  const hooks = [hookDayun, hookScore, hookNextYear].filter(Boolean);
  const toc = reportToc();
  const tone = DAY_MASTER_TONE[ctx.dg] || '';

  ensureStyle();
  const previousFocus = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  const el = document.createElement('div');
  el.id = OVERLAY_ID;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', PERSONA.name + '命盘预告');
  el.tabIndex = -1;
  el.innerHTML = `
  <button class="ft-close" type="button" aria-label="关闭预告">×</button>
  <div class="ft-wrap">
    <video class="ft-hero" autoplay muted loop playsinline preload="auto" poster="${PERSONA.poster}" src="${PERSONA.video}" aria-label="${PERSONA.name}"></video>
    <div class="ft-head">
      <img src="${PERSONA.poster}" alt="${PERSONA.name}">
      <div>
        <div class="ft-kicker">${PERSONA.name} · 命盘预告</div>
        <div class="ft-title">${name ? `${name}，` : ''}你的盘，拆完了第一层</div>
      </div>
    </div>
    <p class="ft-open">${PERSONA.lead}${tone ? `日主<b class="hl">${ctx.dg}（${ctx.dw || ''}）</b>——${tone}` : ''}下面这几处，${PERSONA.circle}。</p>
    <div class="ft-card">
      <h3>四 柱 排 盘</h3>
      <div class="ft-pillars">
        <div class="pl"><b>${pillar(b, 'Y')}</b><span>年柱</span></div>
        <div class="pl"><b>${pillar(b, 'M')}</b><span>月柱</span></div>
        <div class="pl"><b>${pillar(b, 'D')}</b><span>日柱</span></div>
        <div class="pl"><b>${pillar(b, 'H')}</b><span>时柱</span></div>
      </div>
      <p class="ft-meta">日主 ${ctx.dg} · ${ctx.dw || ''}　|　格局 ${(ctx.pa || []).join('、') || '—'}　|　当前大运 ${ctx.cDy ? `${ctx.cDy.g}${ctx.cDy.z}（${ctx.cDy.ys}–${ctx.cDy.ye}）` : '—'}</p>
      ${payload.timeStr ? '' : '<p class="ft-note">你跳过了出生时间，时柱按默认时刻起；若之后想起准确时辰，在报告页改表单重推即可。</p>'}
    </div>
    ${hooks.length ? `<div class="ft-card"><h3>${PERSONA.hooksTitle}</h3>${hooks.map(h => `<p class="ft-hook">${h}</p>`).join('')}</div>` : ''}
    ${toc.length ? `<div class="ft-card"><h3>完 整 报 告 目 录</h3><ul class="ft-toc">${toc.map(t => `<li><b>${t.label}</b> — ${t.head}${t.score ? `（${t.score}）` : ''}</li>`).join('')}</ul></div>` : ''}
    <button class="ft-cta" type="button">继续看完整报告</button>
    <button class="ft-skip" type="button">跳过预告，直接看报告</button>
    <p class="ft-free">全程免费 · 无隐藏收费 · 报告已在下方备好</p>
  </div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  // A modal teaser must not leave the report behind it clickable or reachable
  // by keyboard shortcuts. Snapshot and restore, like the calculation scene.
  const background = Array.from(document.body.children)
    .filter(node => node !== el && !['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName))
    .map(node => ({ node, inert: node.hasAttribute('inert'), aria: node.getAttribute('aria-hidden') }));
  background.forEach(({ node }) => { node.setAttribute('inert', ''); node.setAttribute('aria-hidden', 'true'); });
  window.__wenFlow?.onTeaserOpen?.();
  bumpStat('teaser_shown');
  focusSafely(el.querySelector('.ft-cta'));

  let closed = false;
  function dismiss(reason) {
    if (closed) return;
    closed = true;
    bumpStat(reason === 'continue' ? 'report_open' : 'teaser_skip');
    markTeasered(payload);
    background.forEach(({ node, inert, aria }) => {
      if (!inert) node.removeAttribute('inert');
      if (aria === null) node.removeAttribute('aria-hidden');
      else node.setAttribute('aria-hidden', aria);
    });
    document.body.style.overflow = previousOverflow;
    el.remove();
    const scroller = document.getElementById('p2Scroll');
    if (scroller) scroller.scrollTop = 0;
    window.scrollTo(0, 0);
    window.__wenFlow?.onTeaserClosed?.();
    const restore = previousFocus?.isConnected && previousFocus.getClientRects().length
      ? previousFocus : document.getElementById('p2MenuBtn');
    focusSafely(restore);
  }

  el.querySelector('.ft-cta').addEventListener('click', () => dismiss('continue'));
  el.querySelector('.ft-skip').addEventListener('click', () => dismiss('skip'));
  el.querySelector('.ft-close').addEventListener('click', () => dismiss('skip'));
  el.addEventListener('keydown', event => {
    event.stopPropagation(); // 预告页独占 Escape 与报告的数字快捷键
    if (event.key === 'Escape') { event.preventDefault(); dismiss('skip'); return; }
    if (event.key !== 'Tab') return;
    const controls = [...el.querySelectorAll('button:not(:disabled)')].filter(node => node.getClientRects().length);
    if (!controls.length) { event.preventDefault(); focusSafely(el); return; }
    const index = controls.indexOf(document.activeElement);
    if (index < 0 || (!event.shiftKey && index === controls.length - 1) || (event.shiftKey && index === 0)) {
      event.preventDefault();
      focusSafely(controls[event.shiftKey ? controls.length - 1 : 0]);
    }
  });
  return true;
}
