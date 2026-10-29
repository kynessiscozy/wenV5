import { spinFor } from './trait-picker-helper.mjs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { HOME_THEMES } from '../src/ui/home-theme.js';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const THEMES = {
  wenwen: { trait: '温柔', portrait: 'wenwen-reimagined.webp', lead: '别急，我们慢慢看。' },
  moonfox: { trait: '神秘', portrait: 'moon-fox-reimagined.webp', lead: '有意思，线索已经浮现。' },
  diyan: { trait: '威严', portrait: 'earthfire-sovereign.webp', lead: '先定根基，再看全局。' },
  yuchen: { trait: '从容', portrait: 'yuchen-empress.webp', lead: '静下心，先看这一处。' },
  qinglan: { trait: '洒脱', portrait: 'qinglan-renewed.webp', lead: '不妨换个角度。' },
  xingling: { trait: '魅惑', portrait: 'xingling-renewed.webp', lead: '细看，线索藏在这里。' },
  luye: { trait: '好奇', portrait: 'luye.webp', lead: '发现一个有趣的起点。' },
  suyan: { trait: '自信', portrait: 'suyan.webp', lead: '先把重点抓出来。' },
};
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function openHome(id, { width = 390, height = 844, mode = 'light', reduced = false, disableWebGL = false, touch = false } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${id}: ${error.message}`));
  await page.setViewport({ width, height, isMobile: touch, hasTouch: touch });
  await page.evaluateOnNewDocument(() => localStorage.setItem('tj_orb_color', 'violet'));
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (disableWebGL) await page.evaluateOnNewDocument(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /^(webgl2?|experimental-webgl)$/.test(type) ? null : getContext.call(this, type, ...args);
    };
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(theme => {
    localStorage.setItem('tj_theme', theme);
    document.documentElement.dataset.theme = theme;
  }, mode);
  await page.waitForSelector('#traitMachine[data-ready="true"]');
  await spinFor(page, id);
  await page.waitForFunction(theme => window._tools2Ready === true &&
    document.documentElement.dataset.homeTheme === theme && document.getElementById('traitSelection').hidden,
  { timeout: 15000 }, id);
  return { page, context };
}

async function finishCalculation(page) {
  await page.waitForFunction(() => document.querySelector('#calculationOverlay')?.dataset.calculationState === 'ready', { timeout: 15000 });
  assert.equal(await page.$eval('#page2', el => el.classList.contains('active')), false, '推演结果须等待用户继续');
  await page.click('#calculationContinue');
  await page.waitForFunction(() => document.body.classList.contains('report-active') && document.getElementById('calculationOverlay').hidden);
  // Let the report transition and section-tab organization settle.
  await delay(650);
}

async function openRealReport(id, options) {
  const session = await openHome(id, options);
  const { page } = session;
  await page.click('#homeCtaMain');
  await page.waitForSelector('#formModal.open');
  await page.evaluate(() => {
    document.getElementById('bDate').value = '1992-11-20';
    document.getElementById('bTime').value = '11:30';
  });
  await page.click('.character-form-submit');
  await finishCalculation(page);
  return session;
}

async function showSection(page, section) {
  await page.click(`.tab-item[data-sec="${section}"]`);
  await page.waitForFunction(id => document.getElementById(id).classList.contains('active'), {}, section);
  await delay(160);
}

async function assertNoHorizontalOverflow(page, label) {
  await delay(120);
  const { client, scroll } = await page.$eval('#p2Scroll', el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
  assert.ok(scroll <= client + 1, `${label}: 报告不应横向溢出 (${scroll} > ${client})`);
}

function contrast(foreground, background) {
  const components = color => color.match(/\d+(?:\.\d+)?/g).map(Number);
  const back = components(background).slice(0, 3);
  const front = components(foreground);
  const opacity = front[3] ?? 1;
  const blended = front.slice(0, 3).map((value, index) => value * opacity + back[index] * (1 - opacity));
  const luminance = color => color.map(value => (value /= 255) <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const [x, y] = [luminance(blended), luminance(back)];
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

function colorDistance(a, b) {
  const rgb = color => color.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number);
  const [left, right] = [rgb(a), rgb(b)];
  return Math.hypot(...left.map((value, index) => value - right[index]));
}

async function themeColors(page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement('span');
    document.body.append(probe);
    const read = name => {
      probe.style.color = `var(${name})`;
      return getComputedStyle(probe).color;
    };
    const result = {
      trait: root.getPropertyValue('--trait-color').trim(),
      accent: read('--c-accent'), text: read('--c-accent-text'), on: read('--c-on-accent'),
      bg: read('--c-bg'), bg2: read('--c-bg-2'), surface: read('--c-surface'), surface3: read('--c-surface-3'),
      foreground: read('--c-text'), muted: read('--c-text-3'),
      pageBg: root.backgroundColor, bodyBg: getComputedStyle(document.body).backgroundColor,
      headerBg: getComputedStyle(document.querySelector('.p2-top')).backgroundColor,
      chapterBg: getComputedStyle(document.querySelector('#s-yun .result-character-chapter')).backgroundColor,
      formBg: getComputedStyle(document.querySelector('.form-modal-sheet')).backgroundColor,
      browserTheme: document.querySelector('meta[name="theme-color"]')?.content,
      submit: getComputedStyle(document.querySelector('.character-form-submit')).backgroundColor,
      saveGradient: getComputedStyle(document.querySelector('.save-btn')).backgroundImage,
    };
    probe.remove();
    return result;
  });
}

async function portraitPoint(page, section) {
  return page.$eval(`#${section} [data-report-character]`, host => {
    const figure = host.querySelector('.result-character-figure, .result-chapter-figure');
    const image = figure.querySelector('.result-character-portrait');
    const rect = figure.getBoundingClientRect(), frame = host.getBoundingClientRect();
    const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
    const width = Math.min(rect.width, rect.height * ratio);
    return { x: Math.min(frame.right - 28, rect.left + (rect.width - width) / 2 + width * .55),
      y: Math.max(frame.top + 35, rect.top + width / ratio * .4) };
  });
}

try {
  const accents = new Set(), backgrounds = new Map(), darkBackgrounds = new Set(), chapterBackgrounds = new Set();
  const headerBackgrounds = new Set(), formBackgrounds = new Set();
  // Real form submissions for every registered character. The visual and the
  // summary must follow the choice, while the values come from the same context.
  for (const [id, config] of Object.entries(THEMES)) {
    const { page, context } = await openRealReport(id);
    const result = await page.evaluate(() => {
      const ctx = window._ctx;
      const hero = document.getElementById('characterResultHero');
      const sections = ['s-ming', 's-yun', 's-rel'].map(id => {
        const section = document.getElementById(id);
        const visual = section.querySelector('[data-report-character]');
        const card = section.querySelector('.sys-eastern .qr-card');
        return { id: visual?.dataset.reportCharacter, portrait: visual?.querySelector('.result-character-portrait')?.getAttribute('src'),
          contained: !!visual?.contains(card), cards: section.querySelectorAll('.qr-card').length,
          insight: !!section.querySelector('.result-character-insight'),
          label: visual?.querySelector('.result-chapter-kicker')?.textContent,
          fold: card?.querySelector('.qr-title')?.textContent,
          foldLabel: card?.querySelector('.qr-head')?.getAttribute('aria-label'),
          summary: card?.querySelector('.qr-summary')?.textContent.trim(), actions: card?.querySelectorAll('.qr-act').length };
      });
      return { selected: document.documentElement.dataset.homeTheme, demo: hero?.dataset.reportDemo,
        day: hero?.querySelector('[data-report-value="day-master"]')?.textContent, actualDay: ctx.dg + ctx.dw,
        useful: hero?.querySelector('[data-report-value="useful-element"]')?.textContent, actualUseful: ctx.wx.ys,
        sun: hero?.querySelector('[data-report-value="sun"]')?.textContent, actualSun: window.__w3dData.horo.sunName,
        moon: hero?.querySelector('[data-report-value="moon"]')?.textContent, actualMoon: window.__w3dData.astro.moon.name,
        year: ctx.cLn?.g + ctx.cLn?.z, sections,
        guide: document.querySelector('#characterReportGuide .character-prompt-action')?.textContent,
        westernGuide: document.querySelector('#characterReportGuideWestern .character-prompt-action')?.textContent };
    });
    assert.equal(result.selected, id);
    assert.equal(result.demo, 'false');
    assert.equal(result.day, result.actualDay);
    assert.equal(result.useful, result.actualUseful);
    assert.equal(result.sun, result.actualSun);
    assert.equal(result.moon, result.actualMoon);
    for (const [index, section] of result.sections.entries()) {
      assert.equal(section.id, id, `${id} 应出现在三个报告分区`);
      assert.ok(section.portrait.endsWith('/' + config.portrait), `${id} 应使用对应人物素材`);
      assert.equal(section.insight, false, '不再有额外的小人物摘要卡');
      assert.ok(section.contained && section.cards === 1, `${id} 三个分区都应将真实速读并入同行场景`);
      if (index > 0) assert.equal(section.label, `${config.trait} · 同行解读`);
      assert.equal(section.fold, '收起', '三处阅读只保留紧凑的收起操作');
      assert.equal(section.foldLabel, ['收起命盘速读', '收起运势解读', '收起关系解读'][index]);
      assert.ok(section.summary.length > 10 && section.actions >= 2, '原有真实摘要和跳转操作应保留');
    }
    assert.equal(await page.$eval('#characterResultHero', hero => hero.querySelectorAll('.qr-card').length), 1, '命盘与角色合为一处');
    assert.ok(result.sections[1].summary.includes(result.year), '运势摘要仍为实际流年');
    assert.equal(result.guide, '和问问聊聊', '报告 AI 身份不随主页角色改变');
    assert.equal(result.westernGuide, '和问问聊聊');
    assert.deepEqual(await page.evaluate(() => ['命盘一览', '运势速读', '关系速读']
      .filter(text => document.getElementById('p2Inner').textContent.includes(text))), [], '报告不再出现被移除的字样');
    const light = await themeColors(page);
    assert.equal(light.trait, HOME_THEMES[id].trait.color, `${id} 全站配色源自特质专属色`);
    assert.equal(light.submit, light.accent, '表单主按钮也跟随特质色');
    assert.ok(light.saveGradient.includes(light.accent), '保存按钮的渐变也跟随特质色');
    assert.ok(contrast(light.on, light.accent) >= 4.5 && contrast(light.text, light.bg) >= 4.5 && contrast(light.text, light.surface) >= 4.5 &&
      contrast(light.foreground, light.bg) >= 4.5 && contrast(light.muted, light.bg2) >= 4.5 && contrast(light.muted, light.surface3) >= 4.5,
      `${id} 浅色模式的实心按钮和文字需保持可读`);
    assert.equal(light.pageBg, light.bg, '页面实际底色使用特质色，而不只是 CSS 强调色变量');
    assert.equal(light.bodyBg, light.bg);
    assert.equal(light.browserTheme, light.bg, '浏览器工具栏也跟随特质色');
    accents.add(light.accent); backgrounds.set(id, light.bg); chapterBackgrounds.add(light.chapterBg);
    headerBackgrounds.add(light.headerBg); formBackgrounds.add(light.formBg);
    await page.click('#p2MenuBtn');
    await page.waitForFunction(() => document.querySelector('#p2MenuDrawer.open')?.getBoundingClientRect().left >= -1);
    assert.equal(await page.$('#p2OrbWrap'), null, '不再提供独立的光球主题色');
    await page.click('#p2ThemeSeg [data-val="dark"]');
    const dark = await themeColors(page);
    assert.equal(dark.trait, light.trait, '深浅切换不改变所选特质');
    assert.equal(dark.accent, light.accent);
    assert.ok(dark.saveGradient.includes(dark.accent), '深色模式的保存按钮保留特质色');
    assert.ok(contrast(dark.on, dark.accent) >= 4.5 && contrast(dark.text, dark.bg) >= 4.5 && contrast(dark.text, dark.surface) >= 4.5 &&
      contrast(dark.foreground, dark.bg) >= 4.5 && contrast(dark.muted, dark.bg2) >= 4.5 && contrast(dark.muted, dark.surface3) >= 4.5,
      `${id} 深色模式的实心按钮和文字需保持可读`);
    assert.notEqual(dark.bg, light.bg, '明暗模式改变底色但保留特质色相');
    assert.equal(dark.pageBg, dark.bg);
    assert.equal(dark.bodyBg, dark.bg);
    assert.equal(dark.browserTheme, dark.bg);
    darkBackgrounds.add(dark.bg);
    if (id === 'moonfox') {
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
      await page.click('#p2ThemeSeg [data-val="system"]');
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
      assert.equal((await themeColors(page)).trait, light.trait, '跟随系统变化时保留特质色');
    }
    await page.click('#p2ThemeSeg [data-val="light"]');
    await page.click('.p2-menu-close');
    await page.waitForFunction(() => {
      const image = document.querySelector('#characterResultHero .result-character-portrait');
      return image.complete && image.naturalWidth > 0;
    });
    await page.click('.result-character-hint-button');
    assert.equal(await page.$eval('.result-character-hint-button', el => el.getAttribute('aria-expanded')), 'true');
    const hint = await page.$eval('#characterResultHint .sys-eastern', el => el.textContent);
    assert.ok(hint.startsWith(config.lead), `${id} 应使用自己的提示语气`);
    assert.ok(hint.includes(result.actualDay) && hint.includes(result.actualUseful), '角色提示应引用实际计算结果');
    assert.ok(await page.$('#characterResultHero .result-character-speaking'), '展开提示时应触发当前人物的表情');
    await page.click('.result-character-hint-button');
    assert.equal(await page.$eval('#characterResultHint', el => el.hidden), true);
    await assertNoHorizontalOverflow(page, `${id} 命盘`);
    await context.close();
  }
  assert.equal(accents.size, Object.keys(THEMES).length, '八种特质各有独立的全站强调色');
  assert.equal(new Set(backgrounds.values()).size, Object.keys(THEMES).length, '八种特质的浅色页面底色各不相同');
  assert.equal(darkBackgrounds.size, Object.keys(THEMES).length, '八种特质的深色页面底色各不相同');
  assert.equal(chapterBackgrounds.size, Object.keys(THEMES).length, '同行场景背景也跟随各自的特质色');
  assert.equal(headerBackgrounds.size, Object.keys(THEMES).length, '报告顶栏的实际背景跟随特质色');
  assert.equal(formBackgrounds.size, Object.keys(THEMES).length, '输入表单的实际背景跟随特质色');
  assert.ok(colorDistance(backgrounds.get('moonfox'), backgrounds.get('diyan')) >= 28 &&
    colorDistance(backgrounds.get('moonfox'), backgrounds.get('xingling')) >= 18,
    '蓝、红、紫主题的实际大面积背景应有明显区别');
  console.log('✓ 八种特质的实际页面/场景底色、浅深对比与三处合并阅读；数据及问问 AI 身份不变');

  // Reselecting inside an existing real report changes only the companion.
  {
    const { page, context } = await openRealReport('wenwen', { width: 390, height: 844, reduced: true });
    const before = await page.evaluate(() => {
      window.__savedTraitCtx = window._ctx;
      window.__savedQuickCards = ['s-ming', 's-yun', 's-rel'].map(id => document.querySelector(`#${id} .qr-card`));
      return { color: getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim(),
        pageBg: getComputedStyle(document.body).backgroundColor,
        chapterBg: getComputedStyle(document.querySelector('#s-yun .result-character-chapter')).backgroundColor,
        date: document.getElementById('bDate').value, day: window._ctx.dg + window._ctx.dw,
        summary: ['s-ming', 's-yun', 's-rel'].map(id => document.querySelector(`#${id} .qr-summary`).textContent),
        guide: document.querySelector('#characterReportGuide .character-prompt-action').textContent };
    });
    for (const section of ['s-yun', 's-rel', 's-ming']) {
      await showSection(page, section);
      await page.click(`#${section} .qr-head`);
      assert.equal(await page.$eval(`#${section} .qr-card`, el => el.classList.contains('qr-collapsed')), true);
      assert.equal(await page.$eval(`#${section} .qr-body`, el => el.hasAttribute('inert') && el.getAttribute('aria-hidden') === 'true'), true);
    }
    await page.click('#reportTraitReselect');
    assert.equal(await page.$eval('#page2', el => el.inert), true, '重选时报告背景不可操作');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'wenwen');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'reportTraitReselect');
    await page.click('#reportTraitReselect');
    await spinFor(page, 'suyan');
    await page.waitForFunction(() => document.getElementById('traitSelection').hidden && document.querySelector('#characterResultHero')?.dataset.reportCharacter === 'suyan');
    const after = await page.evaluate(() => ({ sameContext: window._ctx === window.__savedTraitCtx,
      report: document.body.classList.contains('report-active'), inert: document.getElementById('page2').inert,
      date: document.getElementById('bDate').value, day: window._ctx.dg + window._ctx.dw,
      summary: ['s-ming', 's-yun', 's-rel'].map(id => document.querySelector(`#${id} .qr-summary`).textContent),
      visuals: ['s-ming', 's-yun', 's-rel'].map(id => [...document.querySelectorAll(`#${id} [data-report-character]`)].map(el => el.dataset.reportCharacter)),
      labels: [...document.querySelectorAll('.result-chapter-kicker')].map(el => el.textContent),
      cardsKept: ['s-ming', 's-yun', 's-rel'].map((id, index) => document.querySelector(`#${id} .qr-card`) === window.__savedQuickCards[index]),
      collapsed: ['s-ming', 's-yun', 's-rel'].map(id => document.querySelector(`#${id} .qr-card`).classList.contains('qr-collapsed')),
      color: getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim(),
      pageBg: getComputedStyle(document.body).backgroundColor,
      chapterBg: getComputedStyle(document.querySelector('#s-yun .result-character-chapter')).backgroundColor,
      guide: document.querySelector('#characterReportGuide .character-prompt-action').textContent,
      focus: document.activeElement.id }));
    assert.ok(after.sameContext && after.report && !after.inert, '无需重算，留在原报告');
    assert.equal(after.date, before.date);
    assert.equal(after.day, before.day);
    assert.deepEqual(after.summary, before.summary, '原速读内容不应被替换');
    assert.ok(after.visuals.flat().every(id => id === 'suyan'));
    assert.ok(after.labels.every(label => label === '自信 · 同行解读'));
    assert.deepEqual(after.cardsKept, [true, true, true], '重选保留三个原速读节点');
    assert.deepEqual(after.collapsed, [true, true, true], '三处阅读折叠状态应保留');
    assert.notEqual(after.color, before.color, '重选后全站强调色同步更新');
    assert.notEqual(after.pageBg, before.pageBg, '重选后实际页面大背景也同步更新');
    assert.notEqual(after.chapterBg, before.chapterBg, '重选后同行场景背景同步更新');
    assert.equal(after.guide, before.guide, '问问对话身份不变');
    assert.equal(after.focus, 'reportTraitReselect', '重建报告后焦点返回新的重选按钮');
    await page.click('#modeWestern');
    await page.waitForFunction(() => window._w3d?.built?.astro?.container === document.getElementById('w3d-astro') && document.querySelector('#w3d-astro canvas'), { timeout: 15000 });
    await page.$eval('#w3d-astro', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const scene = await page.evaluate(() => {
      const built = window._w3d.built.astro;
      window.__savedAstro = built;
      window.__savedCanvas = built.container.querySelector('canvas');
      window.__savedAstroStage = built.scene.background.getHexString();
      const rect = built.container.getBoundingClientRect();
      return { x: rect.left + rect.width * .2, y: rect.top + rect.height * .52,
        theta: built.orbit.theta, position: built.camera.position.toArray(), radius: built.orbit.radius };
    });
    await page.mouse.move(scene.x, scene.y);
    await page.mouse.down();
    await page.mouse.move(scene.x + 65, scene.y + 8, { steps: 5 });
    await page.mouse.up();
    const moved = await page.evaluate(() => ({ theta: window._w3d.built.astro.orbit.theta,
      position: window._w3d.built.astro.camera.position.toArray() }));
    assert.notEqual(moved.theta, scene.theta, '合并后的星盘仍可拖拽');
    assert.notDeepEqual(moved.position, scene.position, '减少动态时主动拖拽仍应重绘视角');
    await page.mouse.wheel({ deltaY: 120 });
    assert.notEqual(await page.evaluate(() => window._w3d.built.astro.orbit.radius), scene.radius, '滚轮缩放仍可用');
    await page.click('#w3d-astro .w3d-reset');
    assert.equal(await page.evaluate(() => window._w3d.built.astro.orbit.theta), 0, '复位仍可用');
    const resizeFrame = await page.evaluate(() => ({ frame: window._w3d.built.astro.renderer.info.render.frame,
      width: document.querySelector('#w3d-astro canvas').width }));
    await page.setViewport({ width: 568, height: 320 });
    await page.waitForFunction(before => window._w3d.built.astro.renderer.info.render.frame > before.frame &&
      document.querySelector('#w3d-astro canvas').width !== before.width, { timeout: 5000 }, resizeFrame);
    await page.setViewport({ width: 390, height: 844 });
    await page.waitForFunction(before => document.querySelector('#w3d-astro canvas').width === before.width,
      { timeout: 5000 }, resizeFrame);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.waitForFunction(() => !!window._w3d.built.astro.raf, { timeout: 5000 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.waitForFunction(() => !window._w3d.built.astro.raf && !window._w3d.built.astro.timer, { timeout: 5000 });
    // Build another scene before the trait change; it must be recolored in
    // place when revisited, without losing the renderer or its orbit.
    await showSection(page, 's-yun');
    await page.waitForFunction(() => window._w3d?.built?.horo?.container === document.getElementById('w3d-horo'), { timeout: 15000 });
    await page.evaluate(() => {
      window.__savedHoro = window._w3d.built.horo;
      window.__savedHoroCanvas = document.querySelector('#w3d-horo canvas');
      window.__savedHoro.orbit.theta = .35;
    });
    await showSection(page, 's-ming');
    await page.waitForFunction(() => window._w3d.STATE.activeKey === 'astro');
    await page.click('#characterResultHero .result-portrait-toggle');
    assert.equal(await page.$eval('#characterResultHero .result-portrait-toggle', el => el.getAttribute('aria-expanded')), 'false');
    const recovered = await page.evaluate(() => {
      const create = document.createElement;
      const originalOverview = document.querySelector('#characterResultHero .qr-card');
      document.createElement = function (tag, ...args) {
        if (tag === 'picture') throw new Error('simulated optional character failure');
        return create.call(this, tag, ...args);
      };
      try { window.dispatchEvent(new CustomEvent('tj:trait-change')); }
      finally { document.createElement = create; }
      return { overview: document.querySelector('#characterResultHero .qr-card') === originalOverview,
        canvas: document.querySelector('#w3d-astro canvas') === window.__savedCanvas,
        connected: window.__savedCanvas.isConnected };
    });
    assert.deepEqual(recovered, { overview: true, canvas: true, connected: true }, '可选人物构建失败也不能丢失真实一览或星盘');
    await page.click('#reportTraitReselect');
    await spinFor(page, 'moonfox');
    await page.waitForFunction(() => document.getElementById('traitSelection').hidden && document.querySelector('#characterResultHero')?.dataset.reportCharacter === 'moonfox');
    assert.equal(await page.$eval('html', el => el.dataset.systemMode), 'western');
    assert.equal(await page.$eval('#characterResultHero .result-portrait-toggle', el => el.getAttribute('aria-expanded')), 'false', '重选后保留西方立绘收起状态');
    assert.equal(await page.evaluate(() => window._ctx === window.__savedTraitCtx), true);
    await page.waitForFunction(() => window._w3d.built.astro.scene.background.getHexString() !== window.__savedAstroStage,
      { timeout: 10000 });
    assert.deepEqual(await page.evaluate(() => ({
      scene: window._w3d.built.astro === window.__savedAstro,
      canvas: document.querySelector('#w3d-astro canvas') === window.__savedCanvas,
      lost: window.__savedCanvas.getContext('webgl2')?.isContextLost(),
      connected: window.__savedCanvas.isConnected,
    })), { scene: true, canvas: true, lost: false, connected: true }, '重选应保留同一个可用的 WebGL 场景');
    assert.notEqual(await page.$eval('#characterResultHero .sys-western', el => getComputedStyle(el).display), 'none');
    await showSection(page, 's-yun');
    await page.waitForFunction(color => window._w3d.built.horo?.accent === color, { timeout: 10000 }, HOME_THEMES.moonfox.trait.color);
    assert.deepEqual(await page.evaluate(() => ({ scene: window._w3d.built.horo === window.__savedHoro,
      canvas: document.querySelector('#w3d-horo canvas') === window.__savedHoroCanvas,
      orbit: window._w3d.built.horo.orbit.theta,
      material: '#' + window._w3d.built.horo.mats.accent[1].color.getHexString(),
      stageMatches: window._w3d.built.horo.scene.background.getHexString() === window._w3d.built.astro.scene.background.getHexString() })),
      { scene: true, canvas: true, orbit: .35, material: HOME_THEMES.moonfox.trait.color, stageMatches: true },
      '重选后黄道天球和星空原地换色且保留视角');
    await assertNoHorizontalOverflow(page, '重选后西方报告');
    await context.close();
    console.log('✓ 报告内重选保留输入、真实计算、折叠状态、体系与问问身份');
  }

  // Exercise navigation and the original report controls instead of only
  // checking that the new illustrations exist.
  {
    const { page, context } = await openRealReport('suyan', { width: 390, height: 844, reduced: true });
    assert.equal(await page.$eval('#characterResultHero .result-character-blink', el => getComputedStyle(el).animationName), 'none', '减少动态时不能眨眼');
    assert.equal(await page.$eval('#characterResultHero .qr-title', el => el.textContent), '收起');
    assert.equal(await page.$eval('#characterResultHero .qr-head', el => el.getAttribute('aria-label')), '收起命盘速读');
    const head = '#s-ming .qr-card .qr-head';
    await page.click(head);
    assert.equal(await page.$eval(head, el => el.getAttribute('aria-expanded')), 'false');
    assert.equal(await page.$eval('#s-ming .qr-card', el => el.classList.contains('qr-collapsed')), true);
    assert.equal(await page.$eval(head, el => el.getAttribute('aria-label')), '展开命盘速读');
    assert.equal(await page.$eval('#s-ming .qr-body', el => el.hasAttribute('inert')), true);
    const legacyFocus = await page.$eval('#s-ming .qr-body', el => {
      // Simulate an older browser that does not implement inert.
      el.removeAttribute('inert');
      const action = el.querySelector('button, a, input');
      action.focus();
      const state = { visibility: getComputedStyle(action).visibility, focused: document.activeElement === action };
      el.setAttribute('inert', '');
      return state;
    });
    assert.deepEqual(legacyFocus, { visibility: 'hidden', focused: false }, '旧浏览器也不能聚焦已收起的内容');
    await page.click(head);
    assert.equal(await page.$eval(head, el => el.getAttribute('aria-expanded')), 'true');
    await page.click('#s-ming .qr-act');
    await page.waitForFunction(() => document.querySelector('[data-card="bazi"]')?.classList.contains('tj-flash'), { timeout: 3000 });
    assert.equal(await page.$eval('.structure-tab[data-structure="pillars"]', el => el.classList.contains('active')), true, '原有速读跳转仍应打开四柱');

    await page.click('#characterReportGuide .character-prompt-action');
    await page.waitForSelector('#aiSheet.open');
    assert.equal(await page.$eval('#aiTitleText', el => el.textContent), '问问大师');
    await page.evaluate(() => window.closeAsk());
    await page.waitForFunction(() => !document.getElementById('aiSheet').classList.contains('open'));

    for (const section of ['s-yun', 's-rel', 's-ming']) {
      await showSection(page, section);
      assert.equal(await page.$eval(`#${section} [data-report-character]`, el => el.dataset.reportCharacter), 'suyan');
      assert.ok(await page.$eval(`#${section} .qr-summary`, el => el.innerText.length > 10));
      if (section !== 's-ming') {
        const head = `#${section} .qr-head`;
        await page.click(head);
        assert.equal(await page.$eval(head, el => el.getAttribute('aria-expanded')), 'false');
        assert.equal(await page.$eval(`${head} .qr-title`, el => el.textContent), '展开');
        assert.equal(await page.$eval(head, el => el.getAttribute('aria-label')), section === 's-yun' ? '展开运势解读' : '展开关系解读');
        await page.focus(head); await page.keyboard.press('Enter');
        assert.equal(await page.$eval(head, el => el.getAttribute('aria-expanded')), 'true');
        assert.equal(await page.$eval(`${head} .qr-title`, el => el.textContent), '收起');
        await page.click(`#${section} .qr-act`);
        const target = section === 's-yun' ? 'trend' : 'intimacy';
        await page.waitForFunction(id => document.querySelector(`[data-card="${id}"]`)?.classList.contains('tj-flash'), { timeout: 4000 }, target);
      }
      await assertNoHorizontalOverflow(page, section);
    }

    // Switching reading systems changes the actual facts, not the chosen role.
    await page.click('#modeWestern');
    await page.waitForFunction(() => document.documentElement.dataset.systemMode === 'western');
    await page.focus('.result-character-hint-button');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('.result-character-hint-button', el => el.getAttribute('aria-expanded')), 'true', '角色提示支持键盘操作');
    const westernHint = await page.$eval('#characterResultHint .sys-western', el => el.innerText);
    assert.ok(westernHint.includes(await page.evaluate(() => window.__w3dData.horo.sunName)));
    assert.equal(await page.$('#characterResultHero .result-character-speaking'), null, '减少动态时不播放人物说话表情');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#modeWestern', el => el.getAttribute('aria-selected')), 'true');
    assert.equal(await page.$eval('#characterResultHero .sys-eastern', el => getComputedStyle(el).display), 'none');
    assert.notEqual(await page.$eval('#characterResultHero .sys-western', el => getComputedStyle(el).display), 'none');
    assert.equal(await page.$eval('#characterReportGuideWestern', el => !!el.getClientRects().length), true, '西方体系也保留问问对话入口');
    assert.equal(await page.$eval('#w3d-astro', el => el.closest('#characterResultHero')?.id), 'characterResultHero', '西方星盘与人物应处于同一场景');
    for (const section of ['s-yun', 's-rel', 's-ming']) {
      await showSection(page, section);
      const visual = await page.$eval(`#${section} [data-report-character]`, el => ({ id: el.dataset.reportCharacter,
        western: getComputedStyle(el.querySelector('.sys-western')).display,
        eastern: getComputedStyle(el.querySelector('.sys-eastern')).display }));
      assert.equal(visual.id, 'suyan');
      assert.notEqual(visual.western, 'none');
      assert.equal(visual.eastern, 'none');
      const key = { 's-yun': 'horo', 's-rel': 'num', 's-ming': 'astro' }[section];
      await page.waitForFunction(id => window._w3d?.built?.[id]?.container === document.getElementById(`w3d-${id}`) &&
        !!document.querySelector(`#w3d-${id} canvas`), { timeout: 15000 }, key);
      assert.equal(await page.$eval(`#w3d-${key}`, el => !!el.closest('[data-report-character]')), true, '三个西方场景均与人物同屏');
      assert.equal(await page.evaluate(key => window._w3d.built[key].stage, key),
        await page.evaluate(() => `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--trait-h').trim()}, 38%, 10%)`),
        '三个真实西方场景的配色均跟随特质色');
      assert.equal(await page.evaluate(key => {
        const built = window._w3d.built[key];
        return built.scene.background.getHexString() === built.scene.background.clone().set(built.stage).getHexString();
      }, key), true, '三个不透明 WebGL 场景的实际背景也必须换色');
      const point = await portraitPoint(page, section);
      const beforeDrag = await page.evaluate(key => window._w3d.built[key].orbit.theta, key);
      await page.mouse.move(point.x, point.y); await page.mouse.down();
      await page.mouse.move(point.x - 36, point.y + 4, { steps: 4 }); await page.mouse.up();
      assert.notEqual(await page.evaluate(key => window._w3d.built[key].orbit.theta, key), beforeDrag, `${key} 从立绘上拖动仍应旋转真实 3D`);
      const toggle = `#${section} .result-portrait-toggle`;
      assert.equal(await page.$eval(toggle, el => el.getAttribute('aria-expanded')), 'true', '拖动不应收起立绘');
      await page.mouse.click(point.x, point.y);
      assert.equal(await page.$eval(toggle, el => el.getAttribute('aria-expanded')), 'false', '点击立绘应收起');
      assert.equal(await page.$eval(toggle, el => el.textContent), '显示立绘');
      assert.equal(await page.$$eval('#page2 [data-report-character]', els => els.every(el => el.classList.contains('is-portrait-hidden'))), true, '三个西方分区共享收起状态');
      const beforeHiddenDrag = await page.evaluate(key => window._w3d.built[key].orbit.theta, key);
      await page.mouse.move(point.x, point.y); await page.mouse.down();
      await page.mouse.move(point.x - 28, point.y + 3, { steps: 4 }); await page.mouse.up();
      assert.notEqual(await page.evaluate(key => window._w3d.built[key].orbit.theta, key), beforeHiddenDrag, '收起后画布完整可拖动');
      await page.focus(toggle); await page.keyboard.press('Enter');
      assert.equal(await page.$eval(toggle, el => el.getAttribute('aria-expanded')), 'true', '支持键盘恢复立绘');
      assert.equal(await page.$eval(`#w3d-${key} .w3d-reset`, el => !!el.getClientRects().length), true, '复位控制保留');
      await assertNoHorizontalOverflow(page, `西方 ${section}`);
    }
    await page.click('#characterReportGuideWestern .character-prompt-dismiss');
    assert.equal(await page.$('#characterReportGuide'), null, '关闭提示应同时关闭另一体系的副本');
    assert.equal(await page.$('#characterReportGuideWestern'), null);

    await page.click('#modeEastern');
    await page.evaluate(() => { document.body.classList.add('beginner-mode'); window.TJBuildSectionTabs(); });
    await delay(100);
    assert.equal(await page.$eval('#characterResultHero', el => !!el.getClientRects().length), true, '新手模式保留角色导览');
    assert.ok(await page.$eval('#s-ming .qr-card .qr-summary', el => el.textContent.trim().length > 10));
    const proToggle = '#characterResultHero .pro-toggle';
    assert.equal(await page.$eval(proToggle, el => el.tagName), 'BUTTON');
    assert.equal(await page.$eval(proToggle, el => el.getAttribute('aria-expanded')), 'false');
    await page.focus(proToggle);
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval(proToggle, el => el.getAttribute('aria-expanded')), 'true', '新手数值可用键盘展开');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval(proToggle, el => el.getAttribute('aria-expanded')), 'false');
    for (const section of ['s-yun', 's-rel']) {
      await showSection(page, section);
      assert.equal(await page.$eval(`#${section} .result-chapter-overview .qr-card`, el => getComputedStyle(el).display !== 'none'), true, '新手模式仍能读到合并后的速读');
      assert.ok(await page.$eval(`#${section} .result-chapter-overview .qr-summary`, el => el.innerText.length > 10));
    }
    await page.evaluate(() => { document.body.classList.remove('beginner-mode'); window.TJBuildSectionTabs(); });
    await showSection(page, 's-ming');
    assert.ok(await page.$('#s-ming .qr-card .qr-summary'));

    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setEmulatedMedia', { features: [
      { name: 'forced-colors', value: 'active' }, { name: 'prefers-reduced-motion', value: 'reduce' },
    ] });
    const forced = await page.evaluate(() => ({
      scene: getComputedStyle(document.querySelector('.result-character-scene')).display,
      background: getComputedStyle(document.getElementById('characterResultHero')).backgroundColor,
      title: getComputedStyle(document.querySelector('#characterResultHero .sys-eastern .qr-title')).color,
      action: !!document.querySelector('.result-character-hint-button').getClientRects().length,
    }));
    assert.equal(forced.scene, 'none', '强制颜色下不依赖背景图');
    assert.notEqual(forced.background, forced.title, '强制颜色下标题应与背景区分');
    assert.equal(forced.action, true, '强制颜色下仍可使用角色提示');
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await cdp.detach();

    // The calendar path silently recomputes without entering the transition.
    const previousDay = await page.evaluate(() => window._ctx.dg + window._ctx.dw);
    await page.evaluate(async () => {
      document.getElementById('toolModal').classList.add('cal-fullscreen');
      document.getElementById('formModal').classList.add('open');
      document.getElementById('bDate').value = '1995-01-15';
      await window.calc(false);
    });
    const updated = await page.evaluate(() => ({ id: document.querySelector('#characterResultHero')?.dataset.reportCharacter,
      displayed: document.querySelector('[data-report-value="day-master"]')?.textContent,
      actual: window._ctx.dg + window._ctx.dw, count: document.querySelectorAll('#characterResultHero').length,
      scenes: document.querySelectorAll('#s-ming .result-character-insight').length,
      overlayHidden: document.getElementById('calculationOverlay').hidden }));
    assert.equal(updated.id, 'suyan');
    assert.equal(updated.displayed, updated.actual);
    assert.notEqual(updated.actual, previousDay, '日期修改应产生新的实际数据');
    assert.equal(updated.count, 1);
    assert.equal(updated.scenes, 0, '合并后一览不再重复人物');
    assert.equal(updated.overlayHidden, true);
    await page.click('#modeWestern');
    try {
      await page.waitForFunction(() => window._w3d?.built?.astro?.container === document.getElementById('w3d-astro') &&
        !!document.querySelector('#characterResultHero #w3d-astro canvas'), { timeout: 20000 });
    } catch (error) {
      console.error('重算后的 3D 状态', await page.evaluate(() => ({ mode: document.body.dataset.systemMode,
        active: document.querySelector('.sec.active')?.id, state: window._w3d?.STATE,
        current: !!document.getElementById('w3d-astro'), canvas: !!document.querySelector('#w3d-astro canvas'),
        oldConnected: window._w3d?.built?.astro?.container?.isConnected,
        loading: document.querySelector('#w3d-astro .w3d-loading')?.textContent })));
      throw error;
    }
    assert.equal(await page.$eval('#w3d-astro [data-report-value="sun"]', el => el.textContent), await page.evaluate(() => window.__w3dData.astro.sun.name), '后台重算后应重建新星盘而非沿用旧画布');
    await context.close();
    console.log('✓ 阅读、折叠、跳转、两种体系、问问对话、新手模式与后台重算');
  }

  // Samples stay explicitly marked; narrow/landscape viewports and dark mode
  // retain a readable, non-overflowing guide in every report section.
  for (const [id, width, height, mode] of [
    ['yuchen', 320, 568, 'light'], ['moonfox', 568, 320, 'light'], ['wenwen', 390, 844, 'dark'], ['qinglan', 1280, 800, 'dark'],
  ]) {
    const { page, context } = await openHome(id, { width, height, mode, reduced: true });
    await page.evaluate(() => { void window.calc(true); });
    await finishCalculation(page);
    const header = await page.evaluate(() => ({ menu: document.getElementById('p2MenuBtn').getBoundingClientRect().right,
      eastern: document.getElementById('modeEastern').getBoundingClientRect().left,
      western: document.getElementById('modeWestern').getBoundingClientRect().right,
      share: document.getElementById('p2ShareBtn').getBoundingClientRect().left }));
    assert.ok(header.eastern >= header.menu && header.western <= header.share, '小屏体系按钮不能与菜单或分享按钮重叠');
    assert.equal(await page.$eval('#characterResultHero', el => el.dataset.reportDemo), 'true');
    assert.ok(await page.$eval('#characterResultHero', el => el.innerText.includes('示例')));
    assert.ok(await page.$('.demo-report-note'));
    assert.ok(await page.$$eval('.result-chapter-kicker', labels => labels.length === 2 && labels.every(label => label.textContent.includes('示例'))), '运势与关系同行卡仍应标注示例');
    assert.equal(await page.$('#characterReportGuide'), null, '示例不应出现个人报告提示');
    await page.click('.result-character-hint-button');
    assert.ok(await page.$eval('#characterResultHint .sys-eastern', el => el.innerText.includes('示例命盘')));
    await delay(100);
    const hintPosition = await page.evaluate(() => ({ bottom: document.getElementById('characterResultHint').getBoundingClientRect().bottom,
      dock: document.getElementById('tabBar').getBoundingClientRect().top }));
    assert.ok(hintPosition.bottom <= hintPosition.dock + 1, '展开的提示不能被底部导航遮挡');
    await page.click('.result-character-hint-button');
    for (const system of ['eastern', 'western']) {
      await page.click(system === 'eastern' ? '#modeEastern' : '#modeWestern');
      for (const section of ['s-ming', 's-yun', 's-rel']) {
        await showSection(page, section);
        assert.equal(await page.$eval(`#${section} [data-report-character]`, el => el.dataset.reportCharacter), id);
        const target = section === 's-ming'
          ? (system === 'eastern' ? '.result-character-overview' : '.result-character-reading.sys-western')
          : (system === 'eastern' ? '.result-chapter-overview' : '.result-chapter-reading.sys-western');
        const style = await page.$eval(`#${section} [data-report-character] ${target}`, el => ({
          visible: !!el.getClientRects().length && getComputedStyle(el).display !== 'none', text: el.innerText,
        }));
        assert.ok(style.visible && style.text.trim(), `${id} ${system} ${section} 应有可见内容`);
        if (section === 's-rel') assert.ok(await page.$eval(`#${section} [data-report-character]`, el => el.innerText.includes('示例')), '示例关系内容应明确标记');
        await assertNoHorizontalOverflow(page, `${width} ${system} ${section}`);
      }
    }
    await context.close();
  }
  console.log('✓ 示例标记、小屏与横屏、浅深主题及减少动态');

  // Real touch taps and horizontal drags must coexist on the portrait area.
  {
    const { page, context } = await openRealReport('moonfox', { width: 320, height: 568, reduced: true, touch: true });
    await page.click('#modeWestern');
    await page.waitForFunction(() => document.documentElement.dataset.systemMode === 'western');
    for (const [section, key] of [['s-ming', 'astro'], ['s-yun', 'horo'], ['s-rel', 'num']]) {
      await showSection(page, section);
      await page.waitForFunction(key => window._w3d?.built?.[key]?.container === document.getElementById(`w3d-${key}`), { timeout: 15000 }, key);
      const point = await portraitPoint(page, section);
      const initial = await page.evaluate(key => window._w3d.built[key].orbit.theta, key);
      const touch = await page.touchscreen.touchStart(point.x, point.y);
      for (const dx of [-5, -10, -18, -25, -35]) await touch.move(point.x + dx, point.y);
      await touch.end();
      assert.notEqual(await page.evaluate(key => window._w3d.built[key].orbit.theta, key), initial, `${key} 触屏横拖人物区域仍可操控场景`);
      const button = `#${section} .result-portrait-toggle`;
      assert.equal(await page.$eval(button, el => el.getAttribute('aria-expanded')), 'true');
      await page.touchscreen.tap(point.x, point.y);
      assert.equal(await page.$eval(button, el => el.getAttribute('aria-expanded')), 'false', '触屏轻点人物收起');
      const rect = await page.$eval(button, el => el.getBoundingClientRect().toJSON());
      await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
      assert.equal(await page.$eval(button, el => el.getAttribute('aria-expanded')), 'true', '触屏按钮可恢复');
    }
    await context.close();
    console.log('✓ 三处西方立绘的触屏收起、恢复和 3D 横拖');
  }

  // Lack of WebGL must not cover the figure or the actual chart values.
  {
    const { page, context } = await openHome('wenwen', { reduced: true, disableWebGL: true });
    await page.evaluate(() => { void window.calc(true); });
    await finishCalculation(page);
    await page.click('#modeWestern');
    await page.waitForFunction(() => document.querySelector('#w3d-astro .w3d-loading')?.innerText.includes('暂不支持'), { timeout: 15000 });
    const fallback = await page.evaluate(() => {
      const root = document.getElementById('characterResultHero');
      const values = [...root.querySelectorAll('#w3d-astro [data-report-value]')];
      return { values: values.map(el => el.innerText), visible: values.every(el => !!el.getClientRects().length),
        loadingLayer: Number(getComputedStyle(root.querySelector('.w3d-loading')).zIndex),
        portrait: !!root.querySelector('.result-character-figure').getClientRects().length };
    });
    assert.equal(fallback.values.length, 3);
    assert.ok(fallback.values.every(Boolean) && fallback.visible && fallback.portrait && fallback.loadingLayer < 2,
      '设备不支持 3D 时仍应显示人物与太阳/月亮/上升');
    const point = await portraitPoint(page, 's-ming');
    await page.mouse.click(point.x, point.y);
    assert.equal(await page.$eval('#characterResultHero .result-portrait-toggle', el => el.textContent), '显示立绘',
      '没有 WebGL 时仍可以轻点人物收起');
    await page.click('#characterResultHero .result-portrait-toggle');
    await context.close();
    console.log('✓ 无 WebGL 时保留人物、真实数据与降级提示');
  }
  // High-contrast/forced colors use the readable fallback instead of a dark canvas.
  {
    const { page, context } = await openRealReport('xingling', { width: 320, height: 568, reduced: true });
    const client = await page.createCDPSession();
    await client.send('Emulation.setEmulatedMedia', { features: [
      { name: 'forced-colors', value: 'active' }, { name: 'prefers-reduced-motion', value: 'reduce' },
    ] });
    assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
    for (const section of ['s-ming', 's-yun', 's-rel']) {
      await showSection(page, section);
      assert.ok(await page.$eval(`#${section} .sys-eastern .qr-head`, el => !!el.getClientRects().length),
        `${section} 强制颜色下仍可操作真实速读`);
      await assertNoHorizontalOverflow(page, `强制颜色 ${section}`);
    }
    await page.click('#modeWestern');
    for (const section of ['s-ming', 's-yun', 's-rel']) {
      await showSection(page, section);
      const fallback = await page.$eval(`#${section} .result-western-theatre`, el => {
        const overlay = el.querySelector('.w3d-ov');
        const canvas = el.querySelector('canvas');
        return { visible: !!overlay?.getClientRects().length, text: overlay?.innerText.trim(),
          canvasHidden: !canvas || getComputedStyle(canvas).display === 'none' };
      });
      assert.ok(fallback.visible && fallback.text && fallback.canvasHidden,
        `${section} 强制颜色下显示可读的西方信息而不是暗色画布`);
    }
    await context.close();
    console.log('✓ 强制颜色下保留真实速读和西方信息回退');
  }
  assert.deepEqual(errors, [], '报告页面不应发生未捕获的脚本错误');
} finally {
  await browser.close();
}
