import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const THEMES = {
  wenwen: { trait: '温柔', portrait: 'wenwen-reimagined.webp', lead: '别急，我们慢慢看。' },
  moonfox: { trait: '神秘', portrait: 'moon-fox-reimagined.webp', lead: '有意思，线索已经浮现。' },
  diyan: { trait: '威严', portrait: 'earthfire-sovereign.webp', lead: '先定根基，再看全局。' },
  yuchen: { trait: '从容', portrait: 'yuchen-empress.webp', lead: '静下心，先看这一处。' },
  qinglan: { trait: '洒脱', portrait: 'qinglan.webp', lead: '不妨换个角度。' },
  xingling: { trait: '魅惑', portrait: 'xingling.webp', lead: '细看，线索藏在这里。' },
  luye: { trait: '好奇', portrait: 'luye.webp', lead: '发现一个有趣的起点。' },
  suyan: { trait: '自信', portrait: 'suyan.webp', lead: '先把重点抓出来。' },
};
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function openHome(id, { width = 390, height = 844, mode = 'light', reduced = false } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${id}: ${error.message}`));
  await page.setViewport({ width, height });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(theme => {
    localStorage.setItem('tj_theme', theme);
    document.documentElement.dataset.theme = theme;
  }, mode);
  await page.waitForSelector(`[data-trait="${id}"]`);
  await page.click(`[data-trait="${id}"]`);
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

try {
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
        const insight = section.querySelector('.result-character-insight');
        return { id: visual?.dataset.reportCharacter, portrait: visual?.querySelector('.result-character-portrait')?.getAttribute('src'),
          insight: insight?.dataset.reportCharacter, label: insight?.querySelector('.result-insight-label')?.textContent,
          summary: insight?.querySelector('.qr-summary')?.textContent.trim() };
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
    for (const section of result.sections) {
      assert.equal(section.id, id, `${id} 应出现在三个报告分区`);
      assert.ok(section.portrait.endsWith('/' + config.portrait), `${id} 应使用对应人物素材`);
      assert.equal(section.insight, id, `${id} 应陪伴真实速读内容`);
      assert.equal(section.label, `${config.trait} · 解读`);
      assert.ok(section.summary.length > 10, '原有真实摘要应保留');
    }
    assert.ok(result.sections[0].summary.includes(result.actualDay), '摘要仍为实际命盘数据');
    assert.ok(result.sections[1].summary.includes(result.year), '运势摘要仍为实际流年');
    assert.equal(result.guide, '和问问聊聊', '报告 AI 身份不随主页角色改变');
    assert.equal(result.westernGuide, '和问问聊聊');
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
  console.log('✓ 八个角色跟随真实推演进入命盘、运势与关系；数据及问问 AI 身份不变');

  // Reselecting inside an existing real report changes only the companion.
  {
    const { page, context } = await openRealReport('wenwen', { width: 390, height: 844, reduced: true });
    const before = await page.evaluate(() => {
      window.__savedTraitCtx = window._ctx;
      return { date: document.getElementById('bDate').value, day: window._ctx.dg + window._ctx.dw,
        summary: ['s-ming', 's-yun', 's-rel'].map(id => document.querySelector(`#${id} .qr-summary`).textContent),
        guide: document.querySelector('#characterReportGuide .character-prompt-action').textContent };
    });
    await page.click('#s-ming .qr-head');
    assert.equal(await page.$eval('#s-ming .qr-card', el => el.classList.contains('qr-collapsed')), true);
    await page.click('#reportTraitReselect');
    assert.equal(await page.$eval('#page2', el => el.inert), true, '重选时报告背景不可操作');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'wenwen');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'reportTraitReselect');
    await page.click('#reportTraitReselect');
    await page.click('[data-trait="suyan"]');
    await page.waitForFunction(() => document.getElementById('traitSelection').hidden && document.querySelector('#characterResultHero')?.dataset.reportCharacter === 'suyan');
    const after = await page.evaluate(() => ({ sameContext: window._ctx === window.__savedTraitCtx,
      report: document.body.classList.contains('report-active'), inert: document.getElementById('page2').inert,
      date: document.getElementById('bDate').value, day: window._ctx.dg + window._ctx.dw,
      summary: ['s-ming', 's-yun', 's-rel'].map(id => document.querySelector(`#${id} .qr-summary`).textContent),
      visuals: ['s-ming', 's-yun', 's-rel'].map(id => [...document.querySelectorAll(`#${id} [data-report-character]`)].map(el => el.dataset.reportCharacter)),
      labels: [...document.querySelectorAll('.result-insight-label')].map(el => el.textContent),
      collapsed: document.querySelector('#s-ming .qr-card').classList.contains('qr-collapsed'),
      guide: document.querySelector('#characterReportGuide .character-prompt-action').textContent,
      focus: document.activeElement.id }));
    assert.ok(after.sameContext && after.report && !after.inert, '无需重算，留在原报告');
    assert.equal(after.date, before.date);
    assert.equal(after.day, before.day);
    assert.deepEqual(after.summary, before.summary, '原速读内容不应被替换');
    assert.ok(after.visuals.flat().every(id => id === 'suyan'));
    assert.ok(after.labels.every(label => label === '自信 · 解读'));
    assert.equal(after.collapsed, true, '原阅读状态应保留');
    assert.equal(after.guide, before.guide, '问问对话身份不变');
    assert.equal(after.focus, 'reportTraitReselect', '重建报告后焦点返回新的重选按钮');
    await page.click('#modeWestern');
    await page.click('#reportTraitReselect');
    await page.click('[data-trait="moonfox"]');
    await page.waitForFunction(() => document.getElementById('traitSelection').hidden && document.querySelector('#characterResultHero')?.dataset.reportCharacter === 'moonfox');
    assert.equal(await page.$eval('html', el => el.dataset.systemMode), 'western');
    assert.equal(await page.evaluate(() => window._ctx === window.__savedTraitCtx), true);
    assert.notEqual(await page.$eval('#characterResultHero .sys-western', el => getComputedStyle(el).display), 'none');
    await assertNoHorizontalOverflow(page, '重选后西方报告');
    await context.close();
    console.log('✓ 报告内重选保留输入、真实计算、折叠状态、体系与问问身份');
  }

  // Exercise navigation and the original report controls instead of only
  // checking that the new illustrations exist.
  {
    const { page, context } = await openRealReport('suyan', { width: 390, height: 844, reduced: true });
    assert.equal(await page.$eval('#characterResultHero .result-character-blink', el => getComputedStyle(el).animationName), 'none', '减少动态时不能眨眼');
    await page.click('#characterResultHero .result-character-action');
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('qr-card')), true, '开始阅读应聚焦命盘速读');
    const head = '#s-ming .qr-card .qr-head';
    await page.click(head);
    assert.equal(await page.$eval(head, el => el.getAttribute('aria-expanded')), 'false');
    assert.equal(await page.$eval('#s-ming .qr-card', el => el.classList.contains('qr-collapsed')), true);
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
      assert.ok(await page.$eval(`#${section} .result-character-insight .qr-summary`, el => el.innerText.length > 10));
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
    await page.click('#characterResultHero .result-character-action');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'w3d-astro', '西方阅读按钮应定位星盘');
    for (const section of ['s-yun', 's-rel', 's-ming']) {
      await showSection(page, section);
      const visual = await page.$eval(`#${section} [data-report-character]`, el => ({ id: el.dataset.reportCharacter,
        western: getComputedStyle(el.querySelector('.sys-western')).display,
        eastern: getComputedStyle(el.querySelector('.sys-eastern')).display }));
      assert.equal(visual.id, 'suyan');
      assert.notEqual(visual.western, 'none');
      assert.equal(visual.eastern, 'none');
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
    await page.evaluate(() => { document.body.classList.remove('beginner-mode'); window.TJBuildSectionTabs(); });
    assert.ok(await page.$('#s-ming .qr-card .qr-summary'));

    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setEmulatedMedia', { features: [
      { name: 'forced-colors', value: 'active' }, { name: 'prefers-reduced-motion', value: 'reduce' },
    ] });
    const forced = await page.evaluate(() => ({
      scene: getComputedStyle(document.querySelector('.result-character-scene')).display,
      background: getComputedStyle(document.getElementById('characterResultHero')).backgroundColor,
      title: getComputedStyle(document.querySelector('#characterResultHero .sys-eastern h1')).color,
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
    assert.equal(updated.scenes, 1);
    assert.equal(updated.overlayHidden, true);
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
    assert.ok(await page.$$eval('.result-insight-label', labels => labels.length === 3 && labels.every(label => label.textContent.includes('示例'))), '滚动后的摘要仍应标注示例');
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
        const style = await page.$eval(`#${section} [data-report-character] .sys-${system}`, el => ({
          visible: !!el.getClientRects().length && getComputedStyle(el).display !== 'none', text: el.innerText,
        }));
        assert.ok(style.visible && style.text.trim(), `${id} ${system} ${section} 应有可见内容`);
        if (section === 's-rel') assert.ok(style.text.includes('示例'), '示例关系内容应明确标记');
        await assertNoHorizontalOverflow(page, `${width} ${system} ${section}`);
      }
    }
    await context.close();
  }
  console.log('✓ 示例标记、小屏与横屏、浅深主题及减少动态');
  assert.deepEqual(errors, [], '报告页面不应发生未捕获的脚本错误');
} finally {
  await browser.close();
}
