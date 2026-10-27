import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { WENWEN } from '../src/character/wenwen.js';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];

async function contrastRatio(page, selector) {
  return page.$eval(selector, el => {
    const css = getComputedStyle(el);
    const luminance = color => {
      const rgb = color.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number);
      const linear = rgb.map(v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const a = luminance(css.color), b = luminance(css.backgroundColor);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

async function newPage(width, height) {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => localStorage.setItem('tj_theme', 'light'));
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window._tools2Ready === true, { timeout: 15000 });
  await page.waitForFunction(() => {
    const image = document.querySelector('.character-portrait img');
    const backdrop = document.querySelector('.character-backdrop img');
    return image?.complete && image.naturalWidth > 0 && backdrop?.complete && backdrop.naturalWidth > 0;
  }, { timeout: 15000 });
  return page;
}

try {
  for (const [width, height] of [[1440, 900], [1280, 720], [768, 1024], [390, 844], [320, 568]]) {
    const page = await newPage(width, height);
    const layout = await page.evaluate(() => {
      const scroll = document.querySelector('#page1 .p1-scroll');
      const image = document.querySelector('.character-portrait img');
      const portrait = image.closest('.character-portrait');
      const portraitStyle = getComputedStyle(portrait);
      const backdrop = document.querySelector('.character-backdrop');
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const cornerAlpha = context.getImageData(0, 0, 1, 1).data[3];
      const lowerPixels = context.getImageData(0, Math.floor(image.naturalHeight * .9), image.naturalWidth, 1).data;
      let opaqueLowerPixels = 0;
      for (let i = 3; i < lowerPixels.length; i += 4) if (lowerPixels[i] >= 200) opaqueLowerPixels++;
      const cta = document.getElementById('homeCtaMain').getBoundingClientRect();
      const sceneElement = document.getElementById('characterScene');
      const scene = sceneElement.getBoundingClientRect();
      const firstTopic = document.querySelector('.character-companion-option').getBoundingClientRect();
      return {
        scrollWidth: scroll.scrollWidth,
        clientWidth: scroll.clientWidth,
        imageLoaded: image.complete && image.naturalWidth > 0,
        imageUrl: image.currentSrc,
        backdropUrl: backdrop.querySelector('img').currentSrc,
        backdropHidden: backdrop.getAttribute('aria-hidden'),
        backdropWidth: backdrop.getBoundingClientRect().width,
        cornerAlpha,
        lowerCoverage: opaqueLowerPixels / image.naturalWidth,
        portraitRatio: portrait.style.getPropertyValue('--character-ratio'),
        lightX: portrait.style.getPropertyValue('--character-light-x'),
        portraitBackground: portraitStyle.backgroundColor,
        portraitBorder: portraitStyle.borderTopWidth,
        portraitShadow: portraitStyle.boxShadow,
        sceneGlow: getComputedStyle(sceneElement).getPropertyValue('--scene-glow').trim(),
        sceneBottom: scene.bottom,
        topicTop: firstTopic.top,
        homeText: document.querySelector('.character-home').innerText,
        heading: document.querySelector('#page1 h1')?.textContent,
        response: document.querySelector('.character-companion-response').textContent,
        ctaVisible: cta.left >= 0 && cta.right <= innerWidth && cta.top >= 0 && cta.bottom <= innerHeight,
        topics: document.querySelectorAll('.character-companion-option').length,
      };
    });
    assert.ok(layout.imageLoaded, `${width}px: 角色插画应成功加载`);
    assert.equal(layout.imageUrl, new URL(WENWEN.assets.portrait.src, BASE).href, '首页应使用共享角色素材');
    assert.equal(layout.backdropUrl, new URL('./art/celestial-stage.webp', BASE).href, '星空舞台素材应成功加载');
    assert.equal(layout.backdropHidden, 'true', '装饰背景不应被屏幕阅读器朗读');
    assert.equal(layout.backdropWidth, layout.clientWidth, `${width}px: 背景应铺满页面而不是给人物加画框`);
    assert.equal(layout.cornerAlpha, 0, `${width}px: 人物图片应有透明背景`);
    assert.ok(layout.lowerCoverage > .15, `${width}px: 人物下半部和云朵应完整呈现，不应渐隐截断`);
    assert.equal(layout.portraitRatio, `${WENWEN.assets.portrait.width} / ${WENWEN.assets.portrait.height}`, '人物容器比例应来自共享素材');
    assert.equal(layout.lightX, `${WENWEN.assets.portrait.spotlight.x}%`, '罗盘光的位置应来自共享素材');
    assert.equal(layout.portraitBackground, 'rgba(0, 0, 0, 0)', `${width}px: 人物不应有背景画框`);
    assert.equal(layout.portraitBorder, '0px', `${width}px: 人物不应有边框`);
    assert.equal(layout.portraitShadow, 'none', `${width}px: 人物按钮不应绘制卡片阴影`);
    assert.ok(layout.sceneBottom <= layout.topicTop, `${width}px: 人物应位于话题和操作按钮上方`);
    assert.equal(layout.response, '', `${width}px: 首页初始不应显示对话提示`);
    assert.equal(layout.heading, '问问大师', `${width}px: 页面仍应保留可访问的产品标题`);
    assert.doesNotMatch(layout.homeText, /你好，我是|今天想聊什么[？?]|问问。/, `${width}px: 已删除的问候不应出现在首页`);
    assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${width}px: 首页不应横向溢出`);
    assert.ok(layout.ctaVisible, `${width}px: 首屏主要入口应可见`);
    assert.equal(layout.topics, 3, `${width}px: 三个对话话题应可选择`);
    assert.ok(await contrastRatio(page, '#homeCtaMain') >= 4.5, '首页主按钮文字应具有足够对比度');
    assert.ok(await contrastRatio(page, '#homeCtaCal') >= 4.5, '日历入口文字应具有足够对比度');
    assert.ok(await contrastRatio(page, '.character-companion-option') >= 4.5, '未选择话题文字应具有足够对比度');
    assert.ok(await contrastRatio(page, '.character-message') >= 4.5, '人物提示文字应具有足够对比度');
    assert.ok(await page.$eval('.character-message', el => el.getBoundingClientRect().height) >= 44, '人物提示应保留足够的触控区域');
    assert.equal(await page.$eval('.character-message', el => getComputedStyle(el).animationName), 'none', '减少动态效果时应停止装饰动画');
    assert.equal(await page.$eval('.character-puppet', el => getComputedStyle(el).animationName), 'none', '减少动态效果时应停止人物浮动');
    assert.equal(await page.$eval('.character-puppet', el => getComputedStyle(el, '::after').animationName), 'none', '减少动态效果时应停止罗盘呼吸光');

    await page.click('#homeCtaMain');
    await page.waitForSelector('#formModal.open');
    await page.waitForFunction(() => document.activeElement.id === 'formModalTitle');
    assert.ok(await contrastRatio(page, '.character-form-submit') >= 4.5, '表单提交按钮文字应具有足够对比度');
    await page.focus('.character-form-submit');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'form-modal-close', 'Tab 应在弹窗内循环');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeCtaMain', '关闭弹窗应返回触发入口');
    await page.click('[data-topic="career"]');
    assert.ok(await contrastRatio(page, '[data-topic="career"]') >= 4.5, '选中话题文字应具有足够对比度');
    const selectedScene = await page.$eval('#characterScene', scene => ({
      mood: scene.dataset.characterMood,
      glow: getComputedStyle(scene).getPropertyValue('--scene-glow').trim(),
      portraitShadow: getComputedStyle(scene.querySelector('.character-portrait')).boxShadow,
    }));
    assert.equal(selectedScene.mood, 'career', '选题应更新人物状态');
    assert.notEqual(selectedScene.glow, layout.sceneGlow, '选题应改变人物周围的光色');
    assert.equal(selectedScene.portraitShadow, 'none', '选题时也不应出现画框');
    const actions = await page.evaluate(() => {
      const primary = document.getElementById('homeCtaMain').getBoundingClientRect();
      const calendar = document.getElementById('homeCtaCal').getBoundingClientRect();
      const scroll = document.querySelector('#page1 .p1-scroll');
      return { primaryTop: primary.top, primaryBottom: primary.bottom, calendarTop: calendar.top, width: scroll.scrollWidth, available: scroll.clientWidth };
    });
    assert.ok(actions.width <= actions.available + 1, `${width}px: 选择话题后不应横向溢出`);
    assert.ok(actions.primaryBottom <= height, `${width}px: 选择话题后主要操作仍应在首屏可见`);
    assert.equal(actions.primaryTop, actions.calendarTop, `${width}px: 主要操作应保持同一行`);
    await page.close();
    console.log(`✓ ${width}×${height} 首页、角色资源与表单焦点`);
  }

  // Headless Chromium reports no fine pointer, so simulate one to exercise parallax.
  const motionPage = await browser.newPage();
  motionPage.on('pageerror', error => errors.push(error.message));
  await motionPage.setViewport({ width: 1440, height: 900 });
  await motionPage.evaluateOnNewDocument(() => {
    const match = window.matchMedia.bind(window);
    window.matchMedia = query => query === '(hover: hover) and (pointer: fine)' ? { matches: true } : match(query);
  });
  await motionPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  assert.equal(await motionPage.$eval('.character-message', el => getComputedStyle(el).animationName), 'character-float');
  assert.equal(await motionPage.$eval('.character-puppet', el => getComputedStyle(el).animationName), 'character-drift', '普通动态下完整人物应轻微浮动');
  assert.equal(await motionPage.$eval('.character-puppet', el => getComputedStyle(el, '::after').animationName), 'compass-glow', '普通动态下罗盘光应轻微呼吸');
  const box = await motionPage.$eval('#characterScene', el => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width * .7, y: r.top + r.height * .7 };
  });
  await motionPage.mouse.move(box.x, box.y);
  await motionPage.evaluate(() => document.querySelector('[data-topic="relationships"]').click());
  assert.equal(await motionPage.$eval('.character-companion-response', el => el.textContent),
    WENWEN.topics.find(topic => topic.id === 'relationships').response, '回应文字应立即更新，不能等待动画结束');
  await motionPage.waitForFunction(() => document.getElementById('characterPortraitButton').getAnimations()
    .some(animation => animation.id === 'character-reaction' && animation.playState === 'running'));
  if (await motionPage.evaluate(() => CSS.supports('interpolate-size', 'allow-keywords'))) {
    assert.ok(await motionPage.$eval('.character-companion-response', el => el.getAnimations()
      .some(animation => animation.transitionProperty === 'height' && animation.playState === 'running')), '回应出现时布局应平滑展开');
  }
  await motionPage.evaluate(() => new Promise(resolve => setTimeout(resolve, 80)));
  assert.ok(await contrastRatio(motionPage, '[data-topic="relationships"]') >= 4.5, '普通动态下选中话题时文字也应立即清晰');
  const repeatedReaction = await motionPage.evaluate(() => {
    const portrait = document.getElementById('characterPortraitButton');
    const before = getComputedStyle(portrait).transform;
    document.querySelector('[data-topic="career"]').click();
    const animation = portrait.getAnimations().find(item => item.id === 'character-reaction');
    return { before, start: animation?.effect.getKeyframes()[0].transform };
  });
  assert.equal(repeatedReaction.start, repeatedReaction.before, '快速切换话题时人物应从当前姿态继续，而不是突然归位');
  assert.equal(await motionPage.$eval('.character-companion-response', el => el.textContent),
    WENWEN.topics.find(topic => topic.id === 'career').response, '快速切换时应立即更新为最新回应');
  await motionPage.waitForFunction(() => {
    const x = parseFloat(document.getElementById('characterScene').style.getPropertyValue('--character-x'));
    return Number.isFinite(x) && x !== 0;
  });
  const depth = await motionPage.$eval('#characterScene', el => ({
    character: parseFloat(el.style.getPropertyValue('--character-x')),
    light: parseFloat(el.style.getPropertyValue('--scene-drift-x')),
  }));
  assert.ok(depth.character * depth.light < 0, '人物与背景光应反向视差以形成空间层次');
  await motionPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await motionPage.waitForFunction(() => document.getElementById('characterScene').style.getPropertyValue('--character-x') === '0px');
  assert.equal(await motionPage.$eval('#characterScene', el => el.style.getPropertyValue('--scene-drift-x')), '0px', '减少动态效果时背景光也应归位');
  assert.equal(await motionPage.$eval('.character-message', el => getComputedStyle(el).animationName), 'none');
  assert.equal(await motionPage.$eval('.character-puppet', el => getComputedStyle(el).animationName), 'none');
  assert.equal(await motionPage.$eval('.character-puppet', el => getComputedStyle(el, '::after').animationName), 'none');
  assert.equal(await motionPage.$eval('.character-companion-response', el => getComputedStyle(el).transitionDuration), '0s', '减少动态效果时回应应立即展开');
  await motionPage.evaluate(() => document.querySelector('[data-topic="self"]').click());
  assert.equal(await motionPage.$eval('#characterPortraitButton', el => el.getAnimations()
    .some(animation => animation.id === 'character-reaction' && animation.playState === 'running')), false, '减少动态效果时选题不应触发人物动作');
  await motionPage.close();
  console.log('✓ 普通动态、指针视差与减少动态效果');

  // A selected topic must travel through the real form and into an editable AI draft.
  const guided = await newPage(390, 844);
  await guided.click('#characterPortraitButton');
  assert.equal(await guided.evaluate(() => document.activeElement.dataset.topic), 'career', '点击人物应聚焦话题选择');
  await guided.click('#characterInvitation');
  assert.equal(await guided.evaluate(() => document.activeElement.dataset.topic), 'career', '点击人物提示应聚焦话题选择');
  await guided.click('[data-topic="career"]');
  assert.equal(await guided.$eval('[data-topic="career"]', el => el.getAttribute('aria-pressed')), 'true');
  assert.equal(await guided.$eval('.character-companion-response', el => el.textContent), '一起看看方向和选择。');
  assert.equal(await guided.$eval('#homeCtaMain', el => el.textContent), '填写信息');
  await guided.click('#homeCtaMain');
  await guided.waitForSelector('#formModal.open');
  assert.match(await guided.$eval('#characterFormContext', el => el.textContent), /事业/);
  await guided.click('#characterFormContext .character-prompt-action');
  assert.equal(await guided.$eval('#characterFormContext', el => el.hidden), true, '可以清除待聊话题');
  assert.equal(await guided.evaluate(() => document.activeElement.id), 'formModalTitle', '清除后焦点应留在表单');
  await guided.keyboard.press('Escape');
  assert.equal(await guided.$eval('[data-topic="career"]', el => el.getAttribute('aria-pressed')), 'false', '清除后首页不应保留旧话题');
  assert.equal(await guided.$eval('#characterInvitation b', el => el.textContent), '和我聊聊');
  assert.equal(await guided.$eval('#homeCtaMain', el => el.textContent), '开启探索');
  await guided.click('[data-topic="career"]');
  await guided.click('#homeCtaMain');
  assert.equal(await guided.$eval('#characterFormContext', el => el.hidden), false);
  await guided.keyboard.press('Escape');
  await guided.evaluate(() => window.TJOpenForm());
  assert.equal(await guided.$eval('#characterFormContext', el => el.hidden), true, '取消后其他入口不应继承旧话题');
  await guided.keyboard.press('Escape');

  await guided.click('[data-topic="relationships"]');
  assert.equal(await guided.$eval('[data-topic="career"]', el => el.getAttribute('aria-pressed')), 'false');
  assert.equal(await guided.$eval('.character-companion-response', el => el.textContent), '一起聊聊关系里的感受。');
  await guided.click('#homeCtaMain');
  assert.match(await guided.$eval('#characterFormContext', el => el.textContent), /关系/);
  await guided.click('.character-form-submit');
  await guided.waitForSelector('#page2.active', { timeout: 15000 });
  assert.match(await guided.$eval('#characterReportGuide', el => el.textContent), /关系/);
  assert.equal(await guided.$eval('#characterReportGuide img', el => el.currentSrc), new URL(WENWEN.assets.avatar.src, BASE).href, '报告应复用同一人物头像');
  await guided.click('#characterReportGuide .character-prompt-action');
  await guided.waitForSelector('#aiSheet.open');
  const suggestedQuestion = await guided.$eval('#askInput', el => el.value);
  assert.match(suggestedQuestion, /关系/);
  assert.equal(await guided.$eval('#askInput', input =>
    input.clientHeight > 40 && input.clientHeight >= input.scrollHeight - 2), true, '打开时草稿应完整可见');
  assert.equal(await guided.$$('.chat-msg-user').then(items => items.length), 0, '引导只能生成草稿，不能自动发送');
  await guided.$eval('#askInput', el => { el.value = '我自己正在写的问题'; });
  await guided.evaluate(() => window.closeAsk());
  await guided.click('#characterReportGuide .character-prompt-action');
  assert.equal(await guided.$eval('#askInput', el => el.value), '我自己正在写的问题', '不能覆盖未发送的问题');
  await guided.evaluate(() => { window.closeAsk(); window.goBack(); });
  assert.equal(await guided.$eval('#homeCtaMain', el => el.textContent), '继续聊聊', '返回首页后可继续已完成命盘的话题');
  await guided.click('#homeCtaMain');
  await guided.waitForSelector('#aiSheet.open');
  assert.equal(await guided.$eval('#askInput', el => el.value), '我自己正在写的问题');
  await guided.$eval('#askInput', (el, question) => {
    el.value = question;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, suggestedQuestion);
  await guided.click('#aiSheet .ai-send');
  await guided.waitForSelector('.chat-msg-user');
  await guided.waitForFunction(() => [...document.querySelectorAll('.chat-msg-ai:not(.chat-welcome):not(.chat-typing)')]
    .some(message => message.querySelector('.chat-ai-text, .chat-bubble-kb')?.textContent.trim().length > 0), { timeout: 10000 });
  assert.equal(await guided.$eval('.chat-msg-ai:not(.chat-welcome):not(.chat-typing) .chat-avatar img', el => el.naturalWidth > 0), true, '问答回复应复用角色头像');
  assert.equal(await guided.$eval('.chat-msg-ai:not(.chat-welcome):not(.chat-typing) .chat-avatar img', el => el.currentSrc), new URL(WENWEN.assets.avatar.src, BASE).href, '问答和报告应使用同一人物头像');
  await guided.waitForFunction(() => {
    const history = JSON.parse(localStorage.getItem('tj_ai_history_v2') || '[]');
    return history.some(item => item.h?.includes('chat-msg-ai'));
  }, { timeout: 10000 });
  await guided.evaluate(() => { window.closeAsk(); window.goBack(); });
  await guided.click('[data-topic="career"]');
  await guided.click('#homeCtaMain');
  await guided.waitForSelector('#aiSheet.open');
  assert.match(await guided.$eval('#askInput', el => el.value), /事业/);
  await guided.click('#aiSheet .ai-send');
  await guided.waitForFunction(() => {
    const replies = [...document.querySelectorAll('.chat-msg-ai:not(.chat-welcome):not(.chat-typing)')];
    return replies.length >= 2 && !document.querySelector('.chat-typing') && !!replies.at(-1).querySelector('.chat-bubble')?.textContent.trim();
  }, { timeout: 10000 });
  assert.equal(await guided.evaluate(() => {
    const replies = [...document.querySelectorAll('.chat-msg-ai:not(.chat-welcome):not(.chat-typing)')];
    return !!replies.at(-1).querySelector('.chat-tool-btn');
  }), false, '事业提问不应误触发工具调用');
  await guided.close();
  console.log('✓ 人物选择、表单承接、报告续聊与真实问答');

  const legacyContext = await browser.createBrowserContext();
  const legacy = await legacyContext.newPage();
  legacy.on('pageerror', error => errors.push(error.message));
  await legacy.setViewport({ width: 390, height: 844 });
  await legacy.evaluateOnNewDocument(() => {
    localStorage.setItem('tj_ai_history_v2', JSON.stringify([
      { h: '<div class="chat-msg chat-msg-ai"><div class="chat-avatar">✦</div><div class="chat-content"><div class="chat-bubble">旧的回答</div></div></div>' },
      { h: '<div class="chat-msg chat-msg-user"><div class="chat-avatar">我</div><div class="chat-content"><div class="chat-bubble">旧的问题</div></div></div>' },
    ]));
  });
  await legacy.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await legacy.waitForFunction(() => window._tools2Ready === true, { timeout: 15000 });
  await legacy.evaluate(() => window.calc(true));
  await legacy.waitForSelector('#page2.active');
  await legacy.click('#aiFab');
  await legacy.waitForSelector('#aiSheet.open .chat-msg-ai .chat-avatar img');
  await legacy.waitForFunction(() => document.querySelector('.chat-msg-ai .chat-avatar img')?.naturalWidth > 0);
  assert.equal(await legacy.$eval('.chat-msg-ai .chat-bubble', el => el.textContent), '旧的回答');
  assert.equal(await legacy.$eval('.chat-msg-user .chat-avatar', el => el.textContent), '我', '只替换问问的头像，不改变用户消息');
  await legacyContext.close();
  console.log('✓ 旧对话恢复时复用人物头像');

  const demo = await newPage(390, 844);
  await demo.click('[data-topic="self"]');
  await demo.evaluate(() => window.calc(true));
  await demo.waitForSelector('#page2.active .demo-report-note', { timeout: 15000 });
  assert.equal(await demo.$('#characterReportGuide'), null, '示例报告不应冒充个人命盘');
  await demo.evaluate(() => window.goBack());
  assert.equal(await demo.$eval('#homeCtaMain', el => el.textContent), '填写信息');
  await demo.click('#homeCtaMain');
  assert.match(await demo.$eval('#characterFormContext', el => el.textContent), /自己/);
  assert.equal(await demo.$eval('#aiSheet', el => el.classList.contains('open')), false, '示例报告不能直接续聊个人命盘');
  await demo.close();
  console.log('✓ 示例报告与个人话题隔离');

  // A pending tool autofocus must never steal focus from, or after, its nested form.
  const focusRace = await newPage(390, 844);
  await focusRace.evaluate(() => {
    window.openCalendarMode();
    const fill = document.querySelector('#toolModal [data-fill]');
    fill.focus();
    fill.click();
  });
  await focusRace.waitForFunction(() => document.activeElement.id === 'formModalTitle');
  await focusRace.evaluate(() => new Promise(resolve => setTimeout(resolve, 180)));
  assert.equal(await focusRace.evaluate(() => document.getElementById('formModal').contains(document.activeElement)), true, '日历自动聚焦不得抢走表单焦点');
  await focusRace.keyboard.press('Escape');
  await focusRace.evaluate(() => window.closeToolPage());
  await focusRace.evaluate(() => {
    window.openCalendarMode();
    const fill = document.querySelector('#toolModal [data-fill]');
    fill.focus();
    fill.click();
    document.querySelector('.character-form-submit').click();
  });
  await focusRace.evaluate(() => new Promise(resolve => setTimeout(resolve, 180)));
  assert.equal(await focusRace.evaluate(() => document.activeElement.hasAttribute('data-fill')), true, '快速提交后日历自动聚焦不得覆盖恢复的焦点');
  await focusRace.close();
  console.log('✓ 日历嵌套表单的焦点恢复');

  const page = await newPage(390, 844);
  await page.click('.theme-toggle-home');
  assert.equal(await page.$eval('html', el => el.dataset.theme), 'dark', '深色模式应可切换');
  assert.equal(await page.$eval('.character-portrait', el => getComputedStyle(el).borderTopWidth), '0px', '深色模式也不应出现人物边框');
  assert.equal(await page.$eval('.character-portrait', el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', '深色模式也应保留透明人物');
  await page.click('.theme-toggle-home');
  assert.equal(await page.$eval('html', el => el.dataset.theme), 'light', '浅色模式应可切回');

  assert.equal(await page.$eval('#homeMenuDrawer', el => el.inert), true, '收起的菜单不应参与键盘导航');
  await page.click('#homeMenuBtn');
  await page.waitForSelector('#homeMenuDrawer.open');
  assert.equal(await page.$eval('#homeMenuBtn', el => el.getAttribute('aria-expanded')), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'home-menu-close', '打开菜单时应聚焦关闭按钮');
  await page.click('.home-menu-close');
  assert.equal(await page.$eval('#homeMenuDrawer', el => el.inert), true, '关闭后菜单应退出键盘导航');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'homeMenuBtn', '关闭菜单应恢复焦点');
  assert.equal(await page.$eval('#homeMenuDrawer', el => el.classList.contains('open')), false, '首页菜单应能关闭');

  await page.click('.character-guide-link');
  await page.waitForSelector('#noviceGuideModal.open');
  await page.click('.ng-close-btn');
  assert.equal(await page.$eval('#noviceGuideModal', el => el.classList.contains('open')), false, '新手指引应能关闭');

  // The calendar opens the same form and refreshes in place when it is submitted.
  await page.click('#homeCtaCal');
  await page.waitForSelector('#toolModal.open.cal-fullscreen');
  await page.click('[data-fill]');
  await page.waitForSelector('#formModal.open');
  await page.click('[data-style="rigorous"]');
  await page.click('#swTrueSolar');
  assert.equal(await page.$eval('#swTrueSolar', el => el.getAttribute('aria-checked')), 'true', '真太阳时开关应同步无障碍状态');
  await page.click('.character-form-submit');
  await page.waitForFunction(() => !document.getElementById('formModal').classList.contains('open'));
  assert.equal(await page.$eval('#toolModal', el => el.classList.contains('cal-fullscreen')), true, '日历填表后应留在日历');
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-fill')), true, '日历刷新后应恢复焦点');
  await page.evaluate(() => window.closeToolPage());

  await page.click('#homeCtaMain');
  await page.waitForSelector('#formModal.open');
  await page.click('.character-form-submit');
  await page.waitForSelector('#page2.active', { timeout: 15000 });
  const report = await page.evaluate(() => ({
    hasContext: !!window._ctx,
    style: window._ctx?.input?.resultStyle || window._ctx?._input?.resultStyle,
    activeTab: document.querySelector('.tab-item.active')?.dataset.sec,
  }));
  assert.equal(report.hasContext, true, '原有命盘推演应生成上下文');
  assert.equal(report.style, 'rigorous', '表单结果风格应传递到命盘');
  assert.equal(report.activeTab, 's-ming', '推演后应打开命盘页');
  await page.click('#aiFab');
  await page.waitForSelector('#aiSheet.open .chat-avatar img');
  await page.waitForFunction(() => document.querySelector('#aiSheet .chat-avatar img')?.naturalWidth > 0);
  assert.equal(await page.$eval('#aiFab img', el => el.naturalWidth > 0), true, '问问入口应显示角色头像');
  await page.evaluate(() => window.closeAsk());
  await page.waitForFunction(() => !!window._tjLiquidOrb, { timeout: 15000 });
  await page.click('#p2MenuBtn');
  await page.waitForSelector('#p2MenuDrawer.open');
  await page.click('#p2OrbBtn');
  await page.waitForSelector('#p2OrbPalette.open [data-key="violet"]', { visible: true });
  await page.click('#p2OrbPaletteGrid [data-key="violet"]');
  assert.equal(await page.evaluate(() => window._tjLiquidOrb.getColorKey()), 'violet', '报告页主题色设置应继续可用');
  await page.click('.p2-menu-close');
  await page.evaluate(() => window.goBack());
  await page.waitForFunction(() => !document.getElementById('page1').classList.contains('hidden'));
  assert.equal(await page.$eval('#homeCtaMain', el => el.textContent.trim()), '开启探索');
  await page.close();
  assert.deepEqual(errors, [], '页面不应产生未捕获的 JavaScript 错误');
  console.log('✓ 明暗切换、菜单、指引、日历填表与命盘推演');
} finally {
  await browser.close();
}
