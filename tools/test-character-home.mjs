import { spinFor } from './trait-picker-helper.mjs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { WENWEN } from '../src/character/wenwen.js';
import { MOON_FOX } from '../src/character/moon-fox.js';
import { EARTHFIRE_SOVEREIGN } from '../src/character/earthfire-sovereign.js';
import { JADE_EMPRESS } from '../src/character/jade-empress.js';
import { QINGLAN } from '../src/character/qinglan.js';
import { XINGLING } from '../src/character/xingling.js';
import { LUYE } from '../src/character/luye.js';
import { SUYAN } from '../src/character/suyan.js';
import { RONGRONG } from '../src/character/rongrong.js';
import { ZHIYA } from '../src/character/zhiya.js';
import { HOME_THEMES } from '../src/ui/home-theme.js';
import { CHAT_MASTER } from '../src/character/chat-master.js';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];

async function newPage(width, height, options = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height, isMobile: !!options.touch, hasTouch: !!options.touch });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: options.motion || 'reduce' }]);
  await page.evaluateOnNewDocument(({ theme, homeTheme, mock, provider, key, mode, history, finePointer }) => {
    if (finePointer) {
      const original = window.matchMedia.bind(window);
      window.matchMedia = query => query === '(hover: hover) and (pointer: fine)' ? { matches: true } : original(query);
    }
    localStorage.setItem('tj_theme', theme || 'light');
    if (homeTheme != null) localStorage.setItem('tj_home_character', homeTheme);
    if (provider) localStorage.setItem('tj_ai_provider', provider);
    if (key) localStorage.setItem('tj_ai_apikey_' + (provider || 'deepseek'), key);
    if (history) localStorage.setItem('tj_ai_history_v2', JSON.stringify(history));
    if (!mock) return;
    window.__mockMode = mode || 'success';
    window.__aiCalls = [];
    window.__speakingEvents = [];
    window.addEventListener('tj:ai-stream', event => window.__speakingEvents.push(event.detail.active));
    const realFetch = window.fetch.bind(window);
    window.fetch = (url, init = {}) => {
      const address = String(url);
      if (!/^https:\/\/(api\.deepseek\.com|openrouter\.ai)\//.test(address)) return realFetch(url, init);
      if (init.method !== 'POST') return Promise.resolve(new Response('{}', { status: 200 }));
      window.__aiCalls.push({ url: address, body: JSON.parse(init.body) });
      const currentMode = window.__mockMode;
      if (currentMode === 'fail') return Promise.resolve(new Response('unavailable', { status: 503 }));
      if (currentMode === 'slowFail') return new Promise(resolve => setTimeout(() => resolve(new Response('unavailable', { status: 503 })), 180));
      const encoder = new TextEncoder();
      const chunk = text => encoder.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n');
      const stream = new ReadableStream({
        start(controller) {
          setTimeout(() => controller.enqueue(chunk(currentMode === 'long' ? '【结论】：' + '完整回答'.repeat(30) + '<img src=x onerror=alert(1)>' : '这是服务返回的第一段。')), currentMode === 'slowStart' ? 600 : 100);
          setTimeout(() => {
            if (currentMode === 'partialFail') {
              controller.error(new Error('mock interrupted stream'));
            } else {
              controller.enqueue(chunk('我们可以从一件小事开始。'));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          }, currentMode === 'partialFail' ? 220 : currentMode === 'slowStart' ? 1200 : 800);
        },
      });
      return Promise.resolve(new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
    };
  }, {
    theme: options.theme || 'light', homeTheme: options.homeTheme, mock: !!options.mock, provider: options.provider,
    key: options.key, mode: options.mode, history: options.history, finePointer: !!options.finePointer,
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('#traitMachine[data-ready="true"]', { timeout: 15000 });
  if (options.picker) return { page, context };
  const role = options.homeTheme || 'wenwen';
  await spinFor(page, role);
  await page.waitForFunction(id => window._tools2Ready === true && document.documentElement.dataset.homeReady === 'true' && document.documentElement.dataset.homeTheme === id && document.getElementById('traitSelection').hidden, { timeout: 15000 }, role);
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.character-portrait img, .character-prop img')].filter(image => !image.hidden);
    images.push(document.querySelector('.character-backdrop img'));
    return images.length >= 4 && images.every(image => image?.complete && image.naturalWidth > 0);
  }, { timeout: 15000 });
  return { page, context };
}

// Sample the actual gradient rather than trusting the CSS background-color.
async function renderedButtonContrast(page, selectors) {
  const buttons = await page.evaluate(items => items.map(selector => {
    const el = document.querySelector(selector);
    const rect = el.getBoundingClientRect();
    return { selector, x: rect.x, y: rect.y, width: rect.width, height: rect.height, color: getComputedStyle(el).color };
  }), selectors);
  const image = await page.screenshot({ encoding: 'base64' });
  return page.evaluate(async ({ buttons, image }) => {
    const bitmap = new Image();
    bitmap.src = `data:image/png;base64,${image}`;
    await bitmap.decode();
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    const lum = rgb => rgb.slice(0, 3).map(v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
      .reduce((total, value, i) => total + value * [.2126, .7152, .0722][i], 0);
    return buttons.map(button => {
      const foreground = lum(button.color.match(/\d+/g).map(Number));
      const ratios = [];
      for (const x of [.2, .35, .5, .65, .8]) for (const y of [.25, .75]) {
        const pixel = context.getImageData(Math.round((button.x + button.width * x) * bitmap.width / innerWidth), Math.round((button.y + button.height * y) * bitmap.height / innerHeight), 1, 1).data;
        const background = lum([...pixel]);
        ratios.push((Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05));
      }
      return { selector: button.selector, ratio: Math.min(...ratios) };
    });
  }, { buttons, image });
}

// Measure the actual illustrated backdrop under visible glyphs, not a CSS fallback color.
async function renderedTextContrast(page, selector) {
  await page.$eval(selector, el => el.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
  const meta = await page.$eval(selector, el => ({ rect: el.getBoundingClientRect().toJSON(), color: getComputedStyle(el).color }));
  const on = await page.screenshot({ encoding: 'base64' });
  const previousStyle = await page.$eval(selector, el => {
    const original = el.getAttribute('style');
    el.style.setProperty('transition', 'none', 'important');
    el.style.setProperty('color', 'transparent', 'important');
    el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
    el.style.setProperty('text-shadow', 'none', 'important');
    return original;
  });
  const off = await page.screenshot({ encoding: 'base64' });
  await page.$eval(selector, (el, original) => original == null ? el.removeAttribute('style') : el.setAttribute('style', original), previousStyle);
  return page.evaluate(async ({ meta, on, off }) => {
    const decode = async source => { const image = new Image(); image.src = `data:image/png;base64,${source}`; await image.decode(); return image; };
    const [front, back] = await Promise.all([decode(on), decode(off)]);
    const canvas = document.createElement('canvas'); canvas.width = front.width; canvas.height = front.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(front, 0, 0); const a = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.drawImage(back, 0, 0); const b = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const lum = rgb => rgb.map(v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
      .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
    const foreground = lum(meta.color.match(/\d+/g).slice(0, 3).map(Number));
    const x0 = Math.max(0, Math.floor(meta.rect.left)), x1 = Math.min(canvas.width, Math.ceil(meta.rect.right));
    const y0 = Math.max(0, Math.floor(meta.rect.top)), y1 = Math.min(canvas.height, Math.ceil(meta.rect.bottom));
    const ratios = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * canvas.width + x) * 4;
      const difference = Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2]);
      if (difference < 80) continue; // Ignore the background and faint antialiasing.
      const background = lum([b[i], b[i + 1], b[i + 2]]);
      ratios.push((Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05));
    }
    return { ratio: Math.min(...ratios), samples: ratios.length };
  }, { meta, on, off });
}

// Count rendered changes rather than merely checking that decorative rune files loaded.
async function visibleRunePixels(page) {
  const scene = await page.$eval('#characterScene', el => el.getBoundingClientRect().toJSON());
  const withRunes = await page.screenshot({ encoding: 'base64' });
  const hidden = await page.addStyleTag({ content: '.character-rune-anchor, .character-prop--rune-seal { visibility: hidden !important; }' });
  const withoutRunes = await page.screenshot({ encoding: 'base64' });
  await hidden.evaluate(el => el.remove());
  return page.evaluate(async ({ withRunes, withoutRunes, scene }) => {
    const decode = async value => { const image = new Image(); image.src = `data:image/png;base64,${value}`; await image.decode(); return image; };
    const [visible, hidden] = await Promise.all([decode(withRunes), decode(withoutRunes)]);
    const canvas = document.createElement('canvas'); canvas.width = visible.width; canvas.height = visible.height;
    const context = canvas.getContext('2d');
    context.drawImage(visible, 0, 0); const a = context.getImageData(0, 0, canvas.width, canvas.height).data;
    context.drawImage(hidden, 0, 0); const b = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let upper = 0, lower = 0;
    for (let y = Math.max(0, Math.floor(scene.top)); y < Math.min(canvas.height, Math.ceil(scene.bottom)); y++) {
      for (let x = Math.max(0, Math.floor(scene.left)); x < Math.min(canvas.width, Math.ceil(scene.right)); x++) {
        const i = (y * canvas.width + x) * 4;
        if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) < 18) continue;
        if (y < scene.top + scene.height * .5) upper++; else lower++;
      }
    }
    return { upper, lower };
  }, { withRunes, withoutRunes, scene });
}

async function waitForSend(page) {
  await page.waitForFunction(() => !document.querySelector('#aiSheet .ai-send').disabled, { timeout: 12000 });
}

// Other tools can still invoke the assistant while the home page is visible; it is not a home CTA.
async function openToolAssistant(page) {
  await page.evaluate(() => window.openAsk());
  await page.waitForSelector('#aiSheet.open');
}

async function continueResult(page) {
  await page.waitForFunction(() => document.getElementById('calculationOverlay').dataset.calculationState === 'ready', { timeout: 10000 });
  await page.click('#calculationContinue');
}

try {
  // A visit starts at a modal trait choice, not at a remembered or default role.
  {
    const { page, context } = await newPage(390, 844, { picker: true, homeTheme: 'diyan' });
    assert.equal(await page.$eval('#traitSelection', el => el.hidden), false);
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), undefined, '旧存储不能绕过首次选择');
    assert.equal(await page.$eval('#page1', el => el.inert), true);
    assert.equal(await page.$eval('#traitSelection', el => el.getAttribute('aria-modal')), 'true');
    assert.equal(await page.$('#traitOptions'), null, '只能通过老虎机选择特质');
    assert.equal(await page.$$('.trait-role').then(els => els.length), 0);
    const pickerText = await page.$eval('#traitSelection', el => el.textContent);
    assert.ok(!/姜姜|问问|月白|地炎|玉宸|青岚|星绫|陆野|苏言|绒绒|纸鸢/.test(pickerText), '选择页不应暴露人物名称');
    assert.ok(!/让心意|转个方向|直接选择/.test(pickerText), '删除旧标题和直接选择文案');
    const choiceTree = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
    const choiceNames = choiceTree.nodes.filter(node => !node.ignored && ['button', 'togglebutton'].includes(node.role?.value)).map(node => node.name?.value);
    assert.ok(choiceNames.some(name => name?.includes('转一转')), '屏幕阅读器可以操作随机转轮');
    assert.ok(!choiceNames.some(name => /姜姜|问问|月白|地炎|玉宸|青岚|星绫|陆野|苏言|绒绒|纸鸢/.test(name || '')), '屏幕阅读器也不暴露角色名');
    const fetched = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name));
    assert.ok(!fetched.some(name => /(?:wenwen|moonfox|diyan|yuchen|qinglan|xingling|luye|suyan|rongrong|zhiya)-cinema3d\.webp/.test(name)), '未选择前不应预加载任何主图');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'traitSpin', '老虎机可以用键盘操作');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#traitSelection', el => el.hidden), false);
    // Force a reproducible spin in the test, but use only the real keyboard controls.
    await page.evaluate(() => {
      window.__keyboardRandom = crypto.getRandomValues;
      crypto.getRandomValues = value => { value[0] = 0x30000000; return value; };
    });
    await page.keyboard.press('Enter');
    await page.evaluate(() => { crypto.getRandomValues = window.__keyboardRandom; delete window.__keyboardRandom; });
    await page.waitForFunction(() => document.getElementById('traitConfirm').dataset.result === 'moonfox' && !document.getElementById('traitConfirm').hidden);
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), undefined, '转动后必须确认');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'traitConfirm');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('traitSelection').hidden && document.documentElement.dataset.homeTheme === 'moonfox');
    assert.equal(await page.$eval('#page1', el => el.inert), false);
    assert.equal(await page.$('.character-theme-switcher'), null);
    assert.equal(await page.$('.character-camera-picker'), null);
    await page.evaluate(() => {
      localStorage.setItem('tj_home_character', 'yuchen');
      window.dispatchEvent(new StorageEvent('storage', { key: 'tj_home_character', newValue: 'yuchen' }));
      document.getElementById('traitSpin').click();
    });
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'moonfox', '后台存储或隐藏轮盘不能意外更改角色');
    await page.click('#homeTraitReset');
    assert.equal(await page.$eval('#traitSelection', el => el.hidden), false);
    assert.equal(await page.$eval('#page1', el => el.inert), true, '重选时应屏蔽背景');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#traitSelection', el => el.hidden), true);
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'moonfox', '取消不能更改原角色');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeTraitReset', '取消后焦点返回入口');
    await page.click('#homeTraitReset');
    await spinFor(page, 'diyan');
    await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'diyan' && document.getElementById('traitSelection').hidden);
    assert.equal(await page.$eval('#page1', el => el.inert), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeTraitReset', '选择完成后焦点返回入口');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#traitMachine[data-ready="true"]');
    assert.equal(await page.$eval('#traitSelection', el => el.hidden), false, '刷新后必须重新选择');
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), undefined);
    await spinFor(page, 'yuchen');
    await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'yuchen' && document.getElementById('traitSelection').hidden);
    await context.close();
  }
  console.log('✓ 首次选择、主动重选、取消、键盘及刷新重选');

  // All eight choices remain reachable without clipping at common phone and
  // landscape sizes, including the 320px-wide and short-height layouts.
  for (const [width, height] of [[320, 240], [480, 270], [320, 568], [360, 640], [390, 844], [568, 320], [844, 390], [768, 1024], [1280, 720]]) {
    const { page, context } = await newPage(width, height, { picker: true });
    const layout = await page.evaluate(() => {
      const picker = document.getElementById('traitSelection');
      return { scrollWidth: picker.scrollWidth, width: picker.clientWidth,
        scrollHeight: picker.scrollHeight, height: picker.clientHeight,
        machine: picker.querySelector('#traitMachine').getBoundingClientRect().toJSON(),
        spin: picker.querySelector('#traitSpin').getBoundingClientRect().toJSON(),
        lever: picker.querySelector('#traitLever').getBoundingClientRect().toJSON() };
    });
    assert.equal(layout.scrollWidth, layout.width, '选择页不能横向溢出');
    assert.ok([layout.machine, layout.spin, layout.lever].every(rect => rect.left >= 0 && rect.right <= width && rect.top >= 0 && rect.bottom <= height), `${width}x${height}: 特质、转动与拉杆应完整可见`);
    await context.close();
  }
  console.log('✓ 轮盘、转动按钮与拉杆在手机、横屏与桌面均完整可见');

  // Different tabs choose independently and cannot switch each other's companion.
  {
    const { page, context } = await newPage(390, 844, { homeTheme: 'wenwen' });
    const other = await context.newPage();
    await other.setViewport({ width: 390, height: 844 });
    await other.goto(BASE, { waitUntil: 'domcontentloaded' });
    await other.waitForSelector('#traitMachine[data-ready="true"]');
    await spinFor(other, 'diyan');
    await other.waitForFunction(() => document.documentElement.dataset.homeTheme === 'diyan' && document.getElementById('traitSelection').hidden);
    await other.evaluate(() => localStorage.setItem('tj_home_character', 'diyan'));
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'wenwen');
    await page.click('#homeTraitReset');
    await spinFor(page, 'suyan');
    await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'suyan' && document.getElementById('traitSelection').hidden);
    assert.equal(await other.$eval('html', el => el.dataset.homeTheme), 'diyan', '另一标签重选不能改变当前角色');
    await context.close();
  }
  console.log('✓ 跨标签互不干扰');

  // Lock the choice immediately even when its image is slow, then fail open
  // without showing a different role or allowing a second selection.
  {
    const { page, context } = await newPage(390, 844, { picker: true });
    await page.setRequestInterception(true);
    const held = [];
    page.on('request', request => {
      if (request.url().endsWith('/yuchen-cinema3d.webp')) held.push(request);
      else request.continue().catch(() => {});
    });
    await spinFor(page, 'yuchen');
    await page.waitForFunction(() => document.getElementById('traitSelection').getAttribute('aria-busy') === 'true');
    assert.equal(await page.$$eval('#traitSpin, #traitLever, #traitConfirm', buttons => buttons.every(button => button.disabled)), true);
    assert.equal(await page.$eval('#traitStatus', el => el.textContent), '正在开启场景…', '加载状态也不能暴露人物名称');
    await page.$eval('#traitSpin', button => button.click());
    await page.waitForFunction(() => document.getElementById('traitSelection').hidden, { timeout: 5000 });
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'yuchen');
    assert.equal(await page.$eval('[data-character-asset="portrait"]', el => el.getAttribute('src')), JADE_EMPRESS.assets.portrait.src);
    await Promise.all(held.map(request => request.continue().catch(() => {})));
    await page.waitForFunction(() => document.querySelector('[data-character-asset="portrait"]').naturalWidth > 0, { timeout: 5000 });
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'yuchen');
    await context.close();
  }
  console.log('✓ 慢素材下立即锁定选择，不闪现其他角色');

  // One close-up composition and the same canvas height for all roles.
  const roles = {
    // Opaque illustrated details which extend beyond the untransformed button
    // in compact landscape, rather than empty background.
    wenwen: { character: WENWEN, room: 'sacred-study', prop: 'lantern', hit: [.24, .50] },
    moonfox: { character: MOON_FOX, room: 'moon-fox-study', prop: null, hit: [.20, .38] },
    diyan: { character: EARTHFIRE_SOVEREIGN, room: 'earthfire-hall', prop: 'fireThrone', hit: [.20, .40] },
    yuchen: { character: JADE_EMPRESS, room: 'yuchen-hall', prop: null, hit: [.32, .40] },
    qinglan: { character: QINGLAN, room: 'qinglan-room', prop: null, hit: [.16, .43] },
    xingling: { character: XINGLING, room: 'xingling-room', prop: null, hit: [.24, .40] },
    luye: { character: LUYE, room: 'luye-room', prop: null, hit: [.24, .48] },
    suyan: { character: SUYAN, room: 'suyan-room', prop: null, hit: [.24, .32] },
    rongrong: { character: RONGRONG, room: 'rongrong-room', prop: null, hit: [.18, .45] },
    zhiya: { character: ZHIYA, room: 'zhiya-room', prop: null, hit: [.20, .45] },
  };
  for (const [width, height] of [[320, 568], [390, 844], [568, 320], [844, 390], [1280, 720]]) {
    let reference;
    for (const [id, config] of Object.entries(roles)) {
      const { page, context } = await newPage(width, height, { homeTheme: id });
      const state = await page.evaluate((portraitSrc, roomName, role, hitPoint) => {
        const scene = document.getElementById('characterScene');
        const portrait = scene.querySelector('[data-character-asset="portrait"]');
        const bg = document.querySelector('.character-backdrop img');
        const hero = scene.getBoundingClientRect().toJSON();
        const cta = document.getElementById('homeCtaMain').getBoundingClientRect().toJSON();
        const subject = scene.querySelector('.character-camera-subject');
        const scenery = scene.querySelector('.character-scenery');
        const button = document.getElementById('characterPortraitButton');
        const targetRect = button.getBoundingClientRect();
        const visualRect = subject.getBoundingClientRect();
        const hitX = visualRect.left + visualRect.width * hitPoint[0];
        const hitY = visualRect.top + visualRect.height * hitPoint[1];
        const hit = document.elementFromPoint(hitX, hitY);
        const backgroundX = visualRect.left + visualRect.width * .1;
        const backgroundY = visualRect.top + visualRect.height * .2;
        const backgroundHit = document.elementFromPoint(backgroundX, backgroundY);
        const controls = ['homeMenuBtn', 'homeCtaMain', 'homeCtaCal'].map(id => {
          const rect = document.getElementById(id).getBoundingClientRect();
          return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('button')?.id;
        });
        const canvas = document.createElement('canvas'); canvas.width = portrait.naturalWidth; canvas.height = portrait.naturalHeight;
        const ctx = canvas.getContext('2d'); ctx.drawImage(portrait, 0, 0);
        const corner = ctx.getImageData(0, 0, 1, 1).data[3];
        const hitAlpha = ctx.getImageData(Math.floor(portrait.naturalWidth * hitPoint[0]), Math.floor(portrait.naturalHeight * hitPoint[1]), 1, 1).data[3];
        return {
          image: portrait.currentSrc.endsWith(portraitSrc.replace('./', '/')),
          bg: bg.currentSrc.includes(roomName), shot: scene.dataset.cameraShot,
          scale: new DOMMatrixReadOnly(getComputedStyle(subject).transform).a,
          corner, hero, cta, noHorizontalScroll: document.documentElement.scrollWidth === document.documentElement.clientWidth,
          visualHit: { x: hitX, y: hitY, outsideButton: hitX < targetRect.left, belongsToPortrait: !!hit?.closest('#characterPortraitButton'), alpha: hitAlpha },
          backgroundHit: { x: backgroundX, y: backgroundY, belongsToPortrait: !!backgroundHit?.closest('#characterPortraitButton') },
          // Normalized landmarks in the empress artwork: crown tip and jade seal.
          landmarks: [[.49, .045], [.30, .34]].map(([x, y]) => ({ x: visualRect.left + visualRect.width * x, y: visualRect.top + visualRect.height * y })),
          controls,
          subjectZ: getComputedStyle(subject.parentElement).zIndex, sceneryZ: getComputedStyle(scenery).zIndex,
          props: [...scene.querySelectorAll('[data-character-scene-optional]')].filter(el => !el.hidden).map(el => el.dataset.characterAsset),
          expressionAligned: [...scene.querySelectorAll('.character-expression')].every(el => !el.hidden && el.naturalWidth === portrait.naturalWidth && el.naturalHeight === portrait.naturalHeight),
          labels: [document.getElementById('characterPortraitButton').getAttribute('aria-label'), role], alt: portrait.alt,
        };
      }, config.character.assets.portrait.src, config.room, HOME_THEMES[id].trait.label, config.hit);
      assert.ok(state.image && state.bg && state.shot === 'close' && state.scale > 1.2, `${id}: 所选角色和近景应一致`);
      const landscapeBoost = width > height && height <= 550 ? 1.35 : 1;
      assert.ok(Math.abs(state.scale - config.character.camera.closeScale * landscapeBoost) < .01, `${id}: 横屏与竖屏都应使用角色自己的近景比例`);
      assert.deepEqual(state.controls, ['homeMenuBtn', 'homeCtaMain', 'homeCtaCal'], `${id}: 放大人物不能遮挡菜单或操作按钮`);
      if (landscapeBoost > 1) {
        assert.ok(state.visualHit.alpha > 128 && state.visualHit.outsideButton && state.visualHit.belongsToPortrait, `${id}: 放大后的可见人物应仍可点击 ${JSON.stringify(state.visualHit)}`);
        assert.equal(state.backgroundHit.belongsToPortrait, false, `${id}: 透明角落不能把房间当作人物点击`);
      }
      assert.equal(state.corner, 0, '人物应保持透明、无框');
      assert.equal(state.expressionAligned, true, '新表情必须与人物同源对齐');
      assert.ok(state.noHorizontalScroll);
      assert.ok(state.cta.top >= 0 && state.cta.bottom <= height + 1, `${id} ${width}x${height}: 主操作应在首屏`);
      assert.match(state.labels[0], new RegExp(state.labels[1]));
      assert.ok(!state.labels[0].includes(config.character.name), `${id}: 读屏不应显示角色名`);
      assert.ok(state.alt.includes(state.labels[1]) && !state.alt.includes(config.character.name), `${id}: 图像备用文案只显示特质`);
      if (reference) {
        assert.ok(Math.abs(state.hero.height - reference.height) < 1 && Math.abs(state.hero.y - reference.y) < 1, '十角色使用同一近景画幅');
      } else reference = state.hero;
      if (config.prop) assert.ok(state.props.includes(config.prop), `${id}: 角色专属道具不可丢失`);
      if (id !== 'diyan') assert.ok(!state.props.includes('fireThrone') && !state.props.includes('runes'));
      if (id === 'diyan') {
        assert.ok(state.props.includes('runes') && state.props.includes('runeSeal'));
        assert.ok(Number(state.subjectZ) > Number(state.sceneryZ), '火椅与符文必须在人物后方');
      }
      if (id === 'yuchen') {
        assert.ok(state.landmarks.every(point => point.x > 0 && point.x < width && point.y > 0 && point.y < state.cta.top),
          `${id} ${width}x${height}: 放大近景仍应保留凤冠和玉印`);
      }
      if (landscapeBoost > 1) {
        await page.mouse.click(state.backgroundHit.x, state.backgroundHit.y);
        assert.equal(await page.$eval('#formModal', el => el.classList.contains('open')), false, `${id}: 点击背景不能误开表单`);
        await page.mouse.click(state.visualHit.x, state.visualHit.y);
      } else await page.click('#characterPortraitButton');
      await page.waitForSelector('#formModal.open');
      assert.equal(await page.$eval('#aiSheet', el => el.classList.contains('open')), false);
      await page.keyboard.press('Escape');
      await context.close();
    }
  }
  console.log('✓ 十角色相同近景画幅、透明人物、专属道具与五种视口');

  // Extremely short landscape screens must still show both complete actions.
  for (const [width, height] of [[320, 240], [480, 270]]) {
    for (const id of Object.keys(roles)) {
      const { page, context } = await newPage(width, height, { homeTheme: id });
      const layout = await page.evaluate(() => ({
        noHorizontalScroll: document.documentElement.scrollWidth === document.documentElement.clientWidth,
        actions: ['homeCtaMain', 'homeCtaCal'].map(id => {
          const rect = document.getElementById(id).getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, hit: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('button')?.id };
        }),
      }));
      assert.ok(layout.noHorizontalScroll);
      layout.actions.forEach((action, index) => {
        assert.ok(action.top >= 0 && action.bottom <= height + 1, `${id} ${width}x${height}: 操作按钮应完整可见`);
        assert.equal(action.hit, ['homeCtaMain', 'homeCtaCal'][index]);
      });
      await context.close();
    }
  }
  console.log('✓ 极短横屏保留完整操作按钮');

  // Rotating the device recalculates the close-up without changing the chosen
  // character or leaving the large landscape crop behind on portrait screens.
  {
    const { page, context } = await newPage(390, 844, { homeTheme: 'qinglan' });
    const currentScale = () => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.character-camera-subject')).transform).a;
    assert.ok(Math.abs(await page.evaluate(currentScale) - QINGLAN.camera.closeScale) < .01);
    await page.setViewport({ width: 568, height: 320 });
    await page.waitForFunction(expected => Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.character-camera-subject')).transform).a - expected) < .01,
      {}, QINGLAN.camera.closeScale * 1.35);
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'qinglan');
    await page.setViewport({ width: 390, height: 844 });
    await page.waitForFunction(expected => Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.character-camera-subject')).transform).a - expected) < .01,
      {}, QINGLAN.camera.closeScale);
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close');
    await context.close();
  }
  console.log('✓ 横竖屏切换保留角色并重新适配近景');

  // Every expression sprite should only cover its own eyes or mouth, never
  // a whole face or a mismatched portrait, and must actually be painted.
  for (const [id, limits] of Object.entries({
    wenwen: { blink: [370, 185, 485, 250], speak: [380, 230, 468, 276] },
    moonfox: { blink: [310, 158, 416, 223], speak: [328, 195, 404, 245] },
    diyan: { blink: [365, 201, 483, 267], speak: [385, 243, 468, 291] },
    yuchen: { blink: [404, 191, 492, 244], speak: [417, 220, 479, 261] },
    qinglan: { blink: [310, 239, 412, 300], speak: [325, 272, 398, 315] },
    xingling: { blink: [345, 231, 444, 296], speak: [364, 273, 430, 319] },
    luye: { blink: [321, 198, 498, 286], speak: [370, 275, 482, 328] },
    suyan: { blink: [304, 168, 447, 246], speak: [331, 221, 426, 274] },
    rongrong: { blink: [366, 133, 475, 200], speak: [384, 178, 457, 221] },
    zhiya: { blink: [324, 268, 440, 335], speak: [350, 312, 434, 361] },
  })) {
    const { page, context } = await newPage(390, 844, { homeTheme: id });
    const bounds = await page.evaluate(() => Object.fromEntries(['blink', 'speak'].map(kind => {
      const image = document.querySelector(`.character-${kind}`);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, top = canvas.height, right = 0, bottom = 0, count = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] <= 8) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y); count++;
      }
      return [kind, { left, top, right, bottom, count }];
    })));
    for (const kind of ['blink', 'speak']) {
      const box = bounds[kind], [left, top, right, bottom] = limits[kind];
      assert.ok(box.count > 300 && box.left >= left && box.top >= top && box.right <= right && box.bottom <= bottom,
        `${id}: ${kind} 表情必须对齐五官 ${JSON.stringify(box)}`);
    }
    {
      // Sample the actual CSS animations: a sprite can be correctly aligned
      // yet painted behind the filtered portrait and therefore never visible.
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) animation.pause();
        const blink = document.querySelector('.character-blink').getAnimations().find(animation => animation.animationName === 'character-blink');
        if (!blink) throw new Error('缺少眨眼动画');
        blink.currentTime = 0;
      });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      // Give the compositor time to commit the paused zero-opacity frame.
      await new Promise(resolve => setTimeout(resolve, 120));
      const normal = await page.screenshot({ encoding: 'base64' });
      for (const kind of ['blink', 'speak']) {
        const region = await page.$eval(`.character-${kind}`, (image, box) => {
          const rect = image.getBoundingClientRect();
          // The portrait can be letterboxed by object-fit: contain, especially
          // for assets with a wider aspect ratio than the narrow viewport.
          const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
          const left = rect.left + (rect.width - image.naturalWidth * scale) / 2;
          const top = rect.bottom - image.naturalHeight * scale;
          return { left: left + box.left * scale, top: top + box.top * scale,
            right: left + box.right * scale, bottom: top + box.bottom * scale };
        }, bounds[kind]);
        await page.evaluate(kind => {
          if (kind === 'blink') {
            const animation = document.querySelector('.character-blink').getAnimations().find(item => item.animationName === 'character-blink');
            animation.currentTime = 6150;
          } else {
            document.querySelector('.character-blink').getAnimations().find(item => item.animationName === 'character-blink').currentTime = 0;
            document.getElementById('characterScene').dataset.speaking = 'true';
            const animation = document.querySelector('.character-speak').getAnimations().find(item => item.animationName === 'character-speaking');
            if (!animation) throw new Error('缺少嘴型动画');
            animation.pause(); animation.currentTime = 50;
          }
        }, kind);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await page.$eval(`.character-${kind}`, image => getComputedStyle(image).opacity), '1', `${id}: ${kind} 动画应处于可见帧`);
        let changed = 0;
        // A loaded renderer may commit the compositor a frame late; continue
        // sampling the same paused animation, never relaxing the pixel check.
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const expression = await page.screenshot({ encoding: 'base64' });
          changed = await page.evaluate(async ({ normal, expression, region }) => {
            const load = data => new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image); image.src = `data:image/png;base64,${data}`; });
            const [before, after] = await Promise.all([load(normal), load(expression)]);
            const canvas = document.createElement('canvas'); canvas.width = before.width; canvas.height = before.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(before, 0, 0); const a = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            ctx.drawImage(after, 0, 0); const b = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let count = 0;
            for (let y = Math.max(0, Math.floor(region.top)); y <= Math.min(canvas.height - 1, Math.ceil(region.bottom)); y++) {
              for (let x = Math.max(0, Math.floor(region.left)); x <= Math.min(canvas.width - 1, Math.ceil(region.right)); x++) {
                const i = (y * canvas.width + x) * 4;
                if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 8) count++;
              }
            }
            return count;
          }, { normal, expression, region });
          if (changed > 15) break;
        }
        assert.ok(changed > 15, `${id}: ${kind} 表情应实际叠在立绘上而非藏在后面，实际 ${changed} 像素`);
      }
    }
    await context.close();
  }
  console.log('✓ 十角色的眨眼与嘴型对齐且实际可见');

  // The new and redrawn silhouettes must cover the actual portrait without
  // turning a large transparent area of the room into an invisible target.
  for (const id of ['qinglan', 'xingling', 'luye', 'suyan', 'rongrong', 'zhiya']) {
    const { page, context } = await newPage(390, 844, { homeTheme: id });
    const coverage = await page.evaluate(async () => {
      const img = document.querySelector('[data-character-asset="portrait"]');
      await img.decode();
      const { naturalWidth: w, naturalHeight: h } = img;
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, w, h).data;
      const polygon = getComputedStyle(document.querySelector('.character-camera-subject'), '::after').clipPath;
      const points = [...polygon.matchAll(/([\d.]+)%\s+([\d.]+)%/g)].map(match => [Number(match[1]) * w / 100, Number(match[2]) * h / 100]);
      ctx.clearRect(0, 0, w, h); ctx.beginPath();
      points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath(); ctx.fill();
      const mask = ctx.getImageData(0, 0, w, h).data;
      let opaque = 0, covered = 0, upperShape = 0, upperOpaque = 0;
      for (let i = 0; i < w * h; i++) {
        const visible = pixels[i * 4 + 3] > 128, inside = mask[i * 4 + 3] > 0;
        if (visible) { opaque++; if (inside) covered++; }
        if (i < w * Math.floor(h * .7) && inside) { upperShape++; if (visible) upperOpaque++; }
      }
      return { coverage: covered / opaque, precision: upperOpaque / upperShape, pointCount: points.length };
    });
    assert.ok(coverage.pointCount >= 8 && coverage.coverage > .995, `${id}: 可见人物应被命中轮廓覆盖`);
    assert.ok(coverage.precision > .65, `${id}: 人物外的大块透明背景不应触发`);
    await context.close();
  }
  console.log('✓ 新版与现代角色的命中轮廓覆盖人物并避开透明背景');

  // Dragging no longer changes the camera and cannot accidentally open the form.
  {
    const { page, context } = await newPage(390, 844, { homeTheme: 'diyan', motion: 'no-preference' });
    await new Promise(resolve => setTimeout(resolve, 850)); // allow the initial composition to settle
    const rect = await page.$eval('#characterPortraitButton', el => el.getBoundingClientRect().toJSON());
    const x = rect.left + rect.width * .5, y = rect.top + rect.height * .45;
    // Compare the camera's target values rather than a potentially still
    // interpolating CSS matrix on a busy/slow browser.
    const cameraTarget = () => page.$eval('.character-camera-subject', el => {
      const style = getComputedStyle(el);
      return ['--camera-scale', '--camera-shift-x', '--camera-shift-y'].map(key => style.getPropertyValue(key));
    });
    const before = await cameraTarget();
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 45, y, { steps: 5 }); await page.mouse.up();
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close');
    assert.deepEqual(await cameraTarget(), before, '拖动不应改变近景的目标比例与位置');
    assert.equal(await page.$eval('#formModal', el => el.classList.contains('open')), false);
    await page.click('#characterPortraitButton');
    await page.waitForSelector('#formModal.open');
    await context.close();
  }
  console.log('✓ 保留人物点击探索，拖动不换景也不误触');

  // Runes actually render behind the sovereign rather than merely existing as assets.
  {
    const { page, context } = await newPage(390, 844, { homeTheme: 'diyan' });
    const pixels = await visibleRunePixels(page);
    assert.ok(pixels.upper > 20, '地炎近景的符文应可见');
    await context.close();
  }

  // The selection is usable in forced colors, and Escape cannot dismiss it.
  {
    const { page, context } = await newPage(320, 568, { picker: true });
    const client = await page.createCDPSession();
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
    const colors = await page.$eval('#traitSpin', el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
    assert.notEqual(colors[0], colors[1]);
    await page.keyboard.press('Tab');
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'traitLever', '选择器应循环焦点');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#traitSelection', el => el.hidden), false);
    await context.close();
  }
  console.log('✓ 强制颜色、焦点循环与不可跳过选择');

  // Cloud artwork is decorative; the actual buttons stay keyboard and high-contrast accessible.
  {
    const { page, context } = await newPage(390, 844);
    const ax = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
    for (const name of ['开启探索', '日历']) {
      assert.ok(ax.nodes.some(node => !node.ignored && node.role?.value === 'button' && node.name?.value === name), `${name}: 按钮应有简洁的无障碍名称`);
    }
    await page.focus('#homeMenuBtn');
    for (let i = 0; i < 12 && await page.evaluate(() => document.activeElement.id) !== 'homeCtaMain'; i++) await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeCtaMain', 'Tab 应能到达主按钮');
    for (const id of ['homeCtaMain', 'homeCtaCal']) {
      if (id === 'homeCtaCal') await page.keyboard.press('Tab');
      const focus = await page.$eval(`#${id}`, el => ({ active: document.activeElement === el, visible: el.matches(':focus-visible'),
        style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth),
        transition: getComputedStyle(el.querySelector('.character-btn-art')).transitionDuration }));
      assert.ok(focus.active && focus.visible && focus.style !== 'none' && focus.width >= 2, `${id}: 键盘焦点应可见`);
      assert.equal(focus.transition, '0s', '减少动态时按钮装饰不应过渡');
      if (id === 'homeCtaMain') {
        await page.keyboard.press('Enter');
        await page.waitForSelector('#formModal.open');
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => document.activeElement.id), id);
      } else {
        await page.keyboard.press('Space');
        await page.waitForSelector('#toolModal.open.cal-fullscreen');
        await page.evaluate(() => window.closeToolPage());
      }
    }
    const client = await page.createCDPSession();
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
    const forced = await page.$$eval('.character-btn', buttons => buttons.map(button => ({
      background: getComputedStyle(button).backgroundColor, border: parseFloat(getComputedStyle(button).borderTopWidth),
      art: getComputedStyle(button.querySelector('.character-btn-art')).display,
    })));
    assert.ok(forced.every(button => button.background !== 'rgba(0, 0, 0, 0)' && button.border >= 1 && button.art === 'none'), '强制颜色模式应回退为系统按钮');
    await context.close();
  }
  console.log('✓ 祥云按钮的无障碍名称、键盘焦点与强制颜色回退');

  // The new palettes remain legible against the actual rendered cloud art;
  // their small prop-linked glints respect the user's motion preference.
  for (const id of ['qinglan', 'xingling', 'luye', 'suyan']) {
    const { page, context } = await newPage(390, 844, { homeTheme: id, motion: 'no-preference' });
    const contrast = await renderedButtonContrast(page, ['#homeCtaMain', '#homeCtaCal']);
    assert.ok(contrast.every(item => item.ratio >= 4.5), `${id}: 祥云按钮应有足够的文字对比度 ${JSON.stringify(contrast)}`);
    assert.equal(await page.$eval('.character-puppet', el => getComputedStyle(el, '::after').animationName), 'companion-prop-glint');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.character-puppet', el => getComputedStyle(el, '::after').animationName), 'none');
    await context.close();
  }
  // The two new roles have their own actual portrait movements, not just
  // particles, while both cloud actions retain readable text.
  for (const [id, motion] of [['rongrong', 'panda-invite'], ['zhiya', 'paper-messenger-float']]) {
    const { page, context } = await newPage(390, 844, { homeTheme: id, motion: 'no-preference' });
    const contrast = await renderedButtonContrast(page, ['#homeCtaMain', '#homeCtaCal']);
    assert.ok(contrast.every(item => item.ratio >= 4.5), `${id}: 祥云按钮应有足够对比度 ${JSON.stringify(contrast)}`);
    const frames = await page.$eval('.character-idle-motion', (element, name) => {
      const animation = element.getAnimations().find(item => item.animationName === name);
      if (!animation) return null;
      animation.pause();
      animation.currentTime = 0; const start = getComputedStyle(element).transform;
      animation.currentTime = animation.effect.getTiming().duration / 2; const middle = getComputedStyle(element).transform;
      return [start, middle];
    }, motion);
    assert.ok(frames && frames[0] !== frames[1], `${id}: 角色本身应有可见的专属动作`);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.character-idle-motion', el => getComputedStyle(el).animationName), 'none');
    await context.close();
  }
  console.log('✓ 十种角色的祥云对比度和动态偏好');

  // The character is an actual exploration action, not a chat entrance.
  {
    const { page, context } = await newPage(390, 844);
    await page.focus('#characterPortraitButton');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#formModal.open');
    await page.waitForFunction(() => document.activeElement.id === 'formModalTitle');
    assert.equal(await page.$eval('#aiSheet', el => el.classList.contains('open')), false);
    const ax = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
    assert.ok(ax.nodes.some(node => node.role?.value === 'dialog' && node.name?.value === '让我们从认识你开始'), '表单应有无障碍名称');
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'character-form-submit', '反向 Tab 应留在表单中');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'form-modal-close', 'Tab 应在表单内循环');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'characterPortraitButton', '关闭表单应恢复人物焦点');
    await page.click('#homeCtaMain');
    await page.waitForSelector('#formModal.open');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeCtaMain');
    await context.close();
  }
  console.log('✓ 人物与主按钮进入探索，表单键盘焦点可恢复');

  // A tool that invokes the assistant without a key keeps its question and offers settings.
  {
    const { page, context } = await newPage(390, 844);
    assert.equal(await page.$eval('#aiSheet', el => el.inert), true, '关闭的对话不应参与键盘导航');
    assert.equal(await page.$$eval('#aiSheet [data-master-portrait]', images => images.every(image => !image.hasAttribute('src'))), true, '对话未打开时不加载双子大图');
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('/master-twin-'))), false, '双子素材不能拖慢首页');
    await page.focus('#homeCtaCal');
    await openToolAssistant(page);
    await page.waitForFunction(() => [...document.querySelectorAll('#aiSheet [data-master-portrait]')].every(image => image.complete && image.naturalWidth > 0));
    assert.deepEqual(await page.$$eval('#aiSheet [data-master-portrait]', images => images.map(image => image.getAttribute('src'))), CHAT_MASTER.twins.map(twin => twin.portrait));
    assert.equal(await page.$eval('#aiSheet .ai-master-twins', el => el.getAttribute('aria-hidden')), 'true');
    assert.equal(await page.$$('img[src*="master-twin"]:not(#aiSheet img)').then(images => images.length), 0, '双子形象只出现在对话内');
    const portraitsAvoidActions = await page.evaluate(() => {
      const actions = document.querySelector('#aiSheet .ai-actions').getBoundingClientRect();
      return [...document.querySelectorAll('#aiSheet [data-master-portrait]')].every(image => {
        const rect = image.getBoundingClientRect();
        return rect.right <= actions.left + 1 || rect.left >= actions.right - 1 ||
          rect.bottom <= actions.top + 1 || rect.top >= actions.bottom - 1;
      });
    });
    assert.equal(portraitsAvoidActions, true, '操作按钮不能盖住双子');
    await page.waitForFunction(() => document.activeElement.id === 'aiTitleText');
    assert.equal(await page.$eval('#page1', el => el.inert), true);
    assert.equal(await page.$eval('#aiSheet', el => el.getAttribute('aria-modal')), 'true');
    assert.match(await page.$eval('#homeChatIntro', el => el.textContent), /配置 AI/);
    assert.match(await page.$eval('#homeChatIntro', el => el.textContent), /填写出生信息/);
    assert.equal(await page.$eval('#aiSheet .ai-close', el => getComputedStyle(el).display !== 'none'), true);
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'ai-send', '反向 Tab 应留在对话框内');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'ai-new', 'Tab 应在对话框内循环');
    const ax = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
    assert.ok(ax.nodes.some(node => node.role?.value === 'dialog' && node.name?.value === '和问问聊聊'), '对话框应有无障碍名称');
    assert.ok(ax.nodes.some(node => node.name?.value === '输入想和问问聊的问题'), '输入框应有无障碍名称');
    await page.type('#askInput', '这个问题先留着');
    await page.click('#aiSheet .ai-send');
    await page.waitForSelector('.chat-home-error');
    assert.match(await page.$eval('.chat-home-error', el => el.textContent), /请先配置 AI/);
    assert.equal(await page.$eval('#askInput', el => el.value), '这个问题先留着');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('tj_ai_draft')), '这个问题先留着');
    assert.equal(await page.$$('.chat-msg-user').then(els => els.length), 0, '未配置时不能假装已发送');
    assert.equal(await page.$$('.chat-msg-ai').then(els => els.length), 0, '未配置时不能冒充 AI 回复');
    await page.click('.chat-home-error button');
    await page.waitForSelector('#aiSettingsModal.open');
    assert.equal(await page.$eval('#aiSheet', el => el.inert), true, '嵌套设置打开时对话框应退出键盘导航');
    assert.equal(await page.$eval('#aiSettingsModal', el => el.getAttribute('aria-hidden')), 'false');
    assert.equal(await page.$eval('#aiSheet .ai-settings', el => el.getAttribute('aria-expanded')), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '关闭 AI 设置');
    await page.click('#aiKeyEditBtn');
    assert.equal(await page.$eval('#aiKeyInput', el => el.type), 'password', '密钥编辑应隐藏输入内容');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#aiSettingsModal', el => el.classList.contains('open')), false);
    assert.equal(await page.$eval('#aiSheet', el => el.classList.contains('open')), true, 'Esc 应先关闭嵌套设置');
    assert.equal(await page.$eval('#aiSheet', el => el.inert), false);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeCtaCal', '关闭工具助手应恢复原来的焦点');
    assert.equal(await page.$eval('#page1', el => el.inert), false);
    assert.equal(await page.$eval('#aiSheet', el => el.inert), true);
    await openToolAssistant(page);
    await page.waitForSelector('#aiSheet.open');
    assert.equal(await page.$eval('#askInput', el => el.value), '这个问题先留着');
    await page.click('#homeChatIntro .chat-home-actions button:last-child');
    await page.waitForSelector('#formModal.open');
    assert.equal(await page.$eval('#aiSheet', el => el.classList.contains('open')), false);
    assert.equal(await page.$eval('#page1', el => el.inert), false);
    assert.equal(await page.$eval('#askInput', el => el.value), '这个问题先留着');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeCtaCal', '从工具助手填写后关闭表单应恢复原焦点');
    await context.close();
  }
  console.log('✓ 工具助手缺少配置提示、草稿与键盘焦点');

  // The conversation starters are editable drafts, never automatic requests.
  {
    const { page, context } = await newPage(390, 844, { mock: true });
    await openToolAssistant(page);
    assert.equal(await page.$$('.chat-starters-list button').then(buttons => buttons.length), 3);
    assert.equal(await page.$eval('.chat-starters', el => el.getAttribute('aria-label')), '提问灵感');
    assert.ok(await page.$eval('#askInput', el => parseFloat(getComputedStyle(el).fontSize)) >= 16, '手机输入字号不应触发浏览器自动放大');
    await page.click('.chat-starters-list button:first-child');
    const suggestion = '我最近有些迷茫，可以陪我理一理吗？';
    assert.equal(await page.$eval('#askInput', el => el.value), suggestion);
    assert.equal(await page.$eval('.chat-starters', el => el.hidden), true);
    assert.equal(await page.evaluate(() => window.__aiCalls.length), 0, '点灵感不能直接发送');
    assert.equal(await page.$$('.chat-msg-user').then(messages => messages.length), 0);
    await page.click('#aiSheet .ai-send');
    await page.waitForSelector('.chat-home-error');
    assert.equal(await page.$eval('#askInput', el => el.value), suggestion, '无密钥时保留建议草稿');
    await page.evaluate(() => window.closeAsk());
    await openToolAssistant(page);
    assert.equal(await page.$eval('#askInput', el => el.value), suggestion);
    assert.equal(await page.$eval('.chat-starters', el => el.hidden), true);
    await page.$eval('#askInput', el => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.$eval('.chat-starters', el => el.hidden), false);
    await page.type('#askInput', '自己的问题');
    await page.$eval('.chat-starters-list button:first-child', el => el.click());
    assert.equal(await page.$eval('#askInput', el => el.value), '自己的问题', '灵感不能覆盖已有草稿');
    await page.click('#aiSheet .ai-new');
    assert.equal(await page.$eval('#askInput', el => el.value), '');
    assert.equal(await page.$eval('.chat-starters', el => el.hidden), false, '新对话重新显示灵感');
    await page.evaluate(() => window.closeAsk());
    await page.evaluate(() => { void window.calc(true); });
    await continueResult(page);
    await page.click('#aiFab');
    await page.waitForSelector('#aiSheet.open .chat-welcome');
    assert.equal(await page.$eval('#aiSheet', el => el.getAttribute('aria-modal')), 'true');
    assert.equal(await page.$eval('#page2', el => el.inert), true, '报告背景在对话时应退出键盘导航');
    const welcomeBeforePrompts = await page.$eval('#askResult', el =>
      [...el.children].indexOf(el.querySelector('.chat-welcome')) < [...el.children].indexOf(el.querySelector('.chat-starters')));
    assert.equal(welcomeBeforePrompts, true, '从首页进入报告时，欢迎语应在灵感之前');
    await page.waitForFunction(() => document.activeElement.id === 'aiTitleText');
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'ai-send', '报告对话的反向 Tab 应留在面板');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'ai-new');
    await page.click('#aiBasisWestern');
    assert.equal(await page.$eval('#aiBasisWestern', el => el.getAttribute('aria-checked')), 'true');
    assert.equal(await page.$eval('#aiBasisEastern', el => el.getAttribute('aria-checked')), 'false');
    assert.match(await page.$eval('#aiContext', el => el.textContent), /西方星相/);
    assert.equal(await page.$eval('#aiBasisWestern', el => el.tabIndex), 0);
    assert.equal(await page.$eval('#aiBasisEastern', el => el.tabIndex), -1);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.$eval('#aiBasisEastern', el => el.getAttribute('aria-checked')), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'aiBasisEastern');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.$eval('#aiBasisWestern', el => el.getAttribute('aria-checked')), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'aiBasisWestern');
    await page.evaluate(() => window.closeAsk());
    assert.equal(await page.$eval('#page2', el => el.inert), false, '关闭后恢复报告交互');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'aiFab', '关闭报告对话后恢复入口焦点');
    await context.close();
  }
  {
    const { page, context } = await newPage(390, 844, { mock: true, key: 'test-key-only' });
    await openToolAssistant(page);
    await page.click('.chat-starters-list button:nth-child(2)');
    assert.equal(await page.evaluate(() => window.__aiCalls.length), 0);
    assert.equal(await page.$eval('#askInput', el => el.value), '我想聊聊关系里遇到的困惑。');
    await page.click('#aiSheet .ai-send');
    await waitForSend(page);
    assert.equal(await page.evaluate(() => window.__aiCalls.length), 1);
    assert.equal(await page.$('.chat-starters'), null, '有对话后不再显示建议');
    await page.evaluate(() => window.closeAsk());
    await openToolAssistant(page);
    assert.equal(await page.$('.chat-starters'), null, '恢复历史时不显示建议');
    await page.click('#aiSheet .ai-new');
    assert.equal(await page.$eval('.chat-starters', el => el.hidden), false);
    await context.close();
  }
  console.log('✓ 提问灵感只填草稿；历史、无密钥和新对话保持真实行为');

  // Older WebKit implementations can reject the preventScroll focus option.
  {
    const { page, context } = await newPage(390, 844);
    await page.evaluate(() => {
      const original = HTMLElement.prototype.focus;
      window.__restoreFocus = () => { HTMLElement.prototype.focus = original; delete window.__restoreFocus; };
      HTMLElement.prototype.focus = function (...args) {
        if (args.length) throw new TypeError('focus options unsupported');
        return original.call(this);
      };
    });
    await page.focus('#homeCtaCal');
    await openToolAssistant(page);
    await page.waitForFunction(() => document.activeElement.id === 'aiTitleText');
    await page.click('.chat-starters-list button:first-child');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'askInput', '不支持焦点选项时灵感仍能填入输入框');
    await page.click('#aiSheet .ai-settings');
    await page.waitForSelector('#aiSettingsModal.open');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '关闭 AI 设置');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'ai-settings', '设置关闭后焦点返回工具栏');
    await page.evaluate(() => window.closeAsk());
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeCtaCal', '关闭后仍能恢复焦点');
    await page.evaluate(() => window.__restoreFocus());
    await context.close();
  }
  console.log('✓ 旧式焦点选项回退保持对话可用');

  // Check actual rendered text and gradient contrast for both light and dark
  // trait palettes, including the persistent composer and sending control.
  for (const [id, theme] of [['wenwen', 'light'], ['xingling', 'dark'],
    ['rongrong', 'light'], ['rongrong', 'dark'], ['zhiya', 'light'], ['zhiya', 'dark']]) {
    const { page, context } = await newPage(390, 844, { homeTheme: id, theme });
    await openToolAssistant(page);
    await page.waitForFunction(() => [...document.querySelectorAll('#aiSheet [data-master-portrait]')].every(image => image.complete && image.naturalWidth));
    for (const selector of ['.ai-hero-caption', '.chat-home-intro p', '.chat-starters-title', '.ai-composer-note']) {
      const sample = await renderedTextContrast(page, selector);
      assert.ok(sample.samples > 20 && sample.ratio >= 4.5, `${id}/${theme}: ${selector} 文字对比不足 ${JSON.stringify(sample)}`);
    }
    const sendContrast = await renderedButtonContrast(page, ['#aiSheet .ai-send']);
    assert.ok(sendContrast[0].ratio >= 4.5, `${id}/${theme}: 发送按钮对比不足 ${JSON.stringify(sendContrast)}`);
    await context.close();
  }
  console.log('✓ 对话文字和发送按钮在浅色、深色特质主题下保持对比度');

  // Complete the previously blocked question through the settings UI with a mocked service.
  {
    const { page, context } = await newPage(390, 844, { mock: true });
    await openToolAssistant(page);
    await page.type('#askInput', '配置后继续这个问题');
    await page.click('#aiSheet .ai-send');
    await page.click('.chat-home-error button');
    await page.waitForSelector('#aiSettingsModal.open');
    await page.click('#aiKeyEditBtn');
    await page.type('#aiKeyInput', 'test-key-only');
    await page.click('#aiKeySave');
    await page.keyboard.press('Escape');
    assert.match(await page.$eval('#homeChatIntro', el => el.textContent), /还未提供命盘/);
    assert.equal(await page.$eval('#askInput', el => el.value), '配置后继续这个问题');
    await page.click('#aiSheet .ai-send');
    await waitForSend(page);
    assert.equal(await page.evaluate(() => window.__aiCalls[0].body.messages.at(-1).content), '配置后继续这个问题');
    assert.match(await page.$eval('.chat-ai-text', el => el.textContent), /服务返回/);
    await context.close();
  }
  console.log('✓ 从设置完成配置后可继续原问题');

  {
    const { page, context } = await newPage(320, 568);
    await openToolAssistant(page);
    await page.click('#homeChatIntro button');
    await page.waitForSelector('#aiSettingsModal.open');
    await page.click('#aiSettingsModal .ai-fs-opt[data-key="xlarge"]');
    await page.keyboard.press('Escape');
    const size = await page.evaluate(() => {
      const title = document.getElementById('aiTitleText').getBoundingClientRect();
      const actions = document.querySelector('#aiSheet .ai-actions').getBoundingClientRect();
      const input = document.querySelector('#aiSheet .ai-input-row').getBoundingClientRect();
      return { titleRight: title.right, actionsLeft: actions.left, inputBottom: input.bottom, introFont: parseFloat(getComputedStyle(document.querySelector('.chat-home-intro')).fontSize) };
    });
    assert.ok(size.titleRight <= size.actionsLeft, '最窄屏特大字号时标题不能压住操作按钮');
    assert.ok(size.inputBottom <= 568, '最窄屏特大字号时输入框应保持可用');
    assert.ok(size.introFont > 13, '对话说明应跟随文字大小设置');
    await context.close();
  }
  console.log('✓ 小屏与特大字号下的对话布局');

  // Extra-short home dialogs keep both setup actions and the composer visible.
  {
    const { page, context } = await newPage(568, 320);
    await openToolAssistant(page);
    const layout = await page.evaluate(() => {
      const sheet = document.getElementById('aiSheet').getBoundingClientRect();
      const intro = document.getElementById('homeChatIntro').getBoundingClientRect();
      const body = document.getElementById('askResult').getBoundingClientRect();
      const input = document.querySelector('#aiSheet .ai-input-row').getBoundingClientRect();
      return { sheet: sheet.toJSON(), intro: intro.toJSON(), body: body.toJSON(), input: input.toJSON() };
    });
    assert.ok(layout.intro.bottom <= layout.body.bottom + 1, '横屏时设置和填写入口应完整可见');
    assert.ok(layout.input.bottom <= layout.sheet.bottom && layout.input.bottom <= 320, '横屏输入区不能被遮住');
    await context.close();
  }

  // Both providers receive the explicitly absent chart; even a greeting is not a canned home reply.
  for (const provider of ['deepseek', 'openrouter']) {
    const { page, context } = await newPage(1280, 720, { mock: true, key: 'test-key-only', provider, motion: 'no-preference' });
    await openToolAssistant(page);
    await page.waitForSelector('#aiSheet.open .ai-send', { visible: true });
    await page.type('#askInput', '你好');
    await page.click('#aiSheet .ai-send');
    assert.notEqual(await page.$eval('#characterScene', el => el.dataset.speaking), 'true', '等待模型时不应假装在说话');
    await page.waitForFunction(() => window.__speakingEvents.includes(true), { timeout: 8000 });
    assert.notEqual(await page.$eval('#characterScene', el => el.dataset.speaking), 'true', '大师回复时首页人物不能替他说话');
    assert.equal(await page.$eval('#aiSheet .ai-send', el => el.disabled), true);
    assert.equal(await page.$eval('#askResult', el => el.getAttribute('aria-busy')), 'true');
    const call = await page.evaluate(() => window.__aiCalls[0]);
    assert.match(call.url, provider === 'deepseek' ? /api\.deepseek\.com\/chat\/completions/ : /openrouter\.ai\/api\/v1\/chat\/completions/);
    assert.equal(call.body.messages.at(-1).content, '你好');
    assert.match(call.body.messages[0].content, /尚未提供命盘/);
    assert.match(call.body.messages[0].content, /绝不能.*虚构/);
    await waitForSend(page);
    assert.equal(await page.$eval('.chat-ai-text', el => el.textContent), '这是服务返回的第一段。我们可以从一件小事开始。');
    assert.match(await page.$eval('#aiLiveStatus', el => el.textContent), /问问回复：这是服务返回的第一段/);
    assert.equal(await page.$eval('#askResult', el => el.hasAttribute('aria-busy')), false);
    assert.notEqual(await page.$eval('#characterScene', el => el.dataset.speaking), 'true');
    assert.deepEqual(await page.evaluate(() => window.__speakingEvents), [true, false]);
    assert.deepEqual(await page.$$eval('.chat-msg-ai:not(.chat-typing) .chat-avatar img', imgs => imgs.map(img => img.getAttribute('src'))), CHAT_MASTER.twins.map(twin => twin.avatar));
    if (provider === 'deepseek') {
      await page.click('.chat-actions [data-act="retry"]');
      assert.equal(await page.$eval('#aiSheet .ai-send', el => el.disabled), true, '重试也应防止并发发送');
      await waitForSend(page);
      assert.equal(await page.evaluate(() => window.__aiCalls.length), 2);
      assert.equal(await page.$$('.chat-msg-user').then(els => els.length), 1, '重试已有回答不能重复用户消息');
    }
    await context.close();
  }
  console.log('✓ 两个 AI 提供方的无命盘流式对话与独立双子身份');

  for (const motion of ['no-preference', 'reduce']) {
    const { page, context } = await newPage(390, 844, { mock: true, key: 'test-key-only', mode: 'slowStart', motion });
    await openToolAssistant(page);
    await page.type('#askInput', '让双子想一想');
    await page.click('#aiSheet .ai-send');
    await page.waitForSelector('#aiSheet.ai-master-thinking .chat-typing');
    const names = await page.$$eval('#aiSheet .ai-master-twin', twins => twins.map(twin => getComputedStyle(twin).animationName));
    assert.deepEqual(names, motion === 'reduce' ? ['none', 'none'] : ['master-twin-thinking', 'master-twin-thinking'], '双子思考动画尊重减少动态');
    await waitForSend(page);
    assert.equal(await page.$eval('#aiSheet', sheet => sheet.classList.contains('ai-master-thinking')), false, '回复完成后停止思考动画');
    await context.close();
  }
  console.log('✓ 双子思考互动与减少动态偏好');

  {
    const { page, context } = await newPage(390, 844, { mock: true, key: 'test-key-only', mode: 'long' });
    await openToolAssistant(page);
    await page.type('#askInput', '我想聊聊事业');
    await page.click('#aiSheet .ai-send');
    await waitForSend(page);
    const reply = await page.$eval('.chat-ai-text', el => el.textContent);
    assert.ok(reply.includes('完整回答'.repeat(30)), '首页不应截断流式回答');
    assert.ok(reply.includes('<img src=x onerror=alert(1)>'));
    assert.equal(await page.$('.chat-ai-text img'), null, 'AI 文本不能作为可执行 HTML 插入');
    assert.equal(await page.$('.chat-ai-text .ai-routes'), null, '首页不应显示无法打开的报告页跳转');
    await context.close();
  }
  console.log('✓ 完整、安全的 AI 文本与首页导航');

  // While a request fails, a different newly typed draft must not be overwritten.
  {
    const { page, context } = await newPage(390, 844, { mock: true, key: 'test-key-only', mode: 'slowFail' });
    await openToolAssistant(page);
    await page.type('#askInput', '第一条问题');
    await page.click('#aiSheet .ai-send');
    await page.waitForFunction(() => window.__aiCalls.length > 0);
    await page.type('#askInput', '另一条新草稿');
    await page.waitForSelector('.chat-home-error', { timeout: 10000 });
    await waitForSend(page);
    assert.match(await page.$eval('.chat-home-error', el => el.textContent), /无法连接 AI/);
    assert.equal(await page.$eval('#askInput', el => el.value), '另一条新草稿');
    assert.match(await page.$eval('.chat-msg-user', el => el.textContent), /第一条问题/);
    assert.equal(await page.$$('.chat-msg-ai:not(.chat-typing)').then(els => els.length), 0, '失败时不能生成兜底假回复');
    assert.ok(!(await page.evaluate(() => window.__speakingEvents)).includes(true), '网络失败不能触发说话动作');
    await page.evaluate(() => { window.__mockMode = 'success'; });
    await page.click('.chat-home-error button:last-child');
    await waitForSend(page);
    assert.equal(await page.$eval('#askInput', el => el.value), '另一条新草稿', '重试旧问题不能覆盖新草稿');
    assert.equal(await page.$$('.chat-msg-user').then(els => els.length), 1, '重试不应重复插入用户气泡');
    assert.match(await page.$eval('.chat-ai-text', el => el.textContent), /服务返回/);
    await context.close();
  }
  {
    const { page, context } = await newPage(390, 844, { mock: true, key: 'test-key-only', mode: 'partialFail' });
    await openToolAssistant(page);
    await page.type('#askInput', '中途中断的问题');
    await page.click('#aiSheet .ai-send');
    await page.waitForSelector('.chat-home-error', { timeout: 10000 });
    await waitForSend(page);
    assert.equal(await page.$eval('#askInput', el => el.value), '中途中断的问题');
    assert.equal(await page.$$('.chat-msg-ai:not(.chat-typing)').then(els => els.length), 0, '失败的半截流不能当作完整回答');
    assert.notEqual(await page.$eval('#characterScene', el => el.dataset.speaking), 'true');
    await page.reload();
    await page.waitForFunction(() => window._tools2Ready === true);
    await openToolAssistant(page);
    assert.equal(await page.$eval('#askInput', el => el.value), '中途中断的问题', '刷新后应恢复未发送的草稿');
    await context.close();
  }
  console.log('✓ 请求失败、半截回复、重试与草稿保护');

  {
    const { page, context } = await newPage(1280, 720, { mock: true, key: 'test-key-only', motion: 'no-preference', finePointer: true });
    assert.equal(await page.$eval('.character-blink', el => getComputedStyle(el).animationName), 'character-blink');
    const rect = await page.$eval('#characterScene', el => el.getBoundingClientRect().toJSON());
    await page.mouse.move(rect.left + rect.width * .8, rect.top + rect.height * .4);
    await page.waitForFunction(() => parseFloat(document.getElementById('characterScene').style.getPropertyValue('--character-x')) > 0);
    const depth = await page.$eval('#characterScene', el => ({ lantern: parseFloat(el.style.getPropertyValue('--lantern-x')), cloud: parseFloat(el.style.getPropertyValue('--cloud-x')) }));
    assert.ok(depth.lantern < 0 && depth.cloud > 0, '天灯和流云应有轻微的不同视差');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.waitForFunction(() => document.getElementById('characterScene').style.getPropertyValue('--character-x') === '0px');
    assert.equal(await page.$eval('#characterScene', el => el.style.getPropertyValue('--lantern-x')), '0px');
    assert.equal(await page.$eval('#characterScene', el => el.style.getPropertyValue('--cloud-x')), '0px');
    assert.equal(await page.$eval('.character-prop', el => getComputedStyle(el).transitionDuration), '0s');
    await openToolAssistant(page);
    await page.type('#askInput', '减少动态测试');
    await page.click('#aiSheet .ai-send');
    await page.waitForFunction(() => window.__speakingEvents.includes(true));
    assert.notEqual(await page.$eval('#characterScene', el => el.dataset.speaking), 'true');
    assert.equal(await page.$eval('.character-blink', el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.$eval('.character-speak', el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.$eval('.character-speak', el => getComputedStyle(el).opacity), '0');
    await waitForSend(page);
    await context.close();
  }
  console.log('✓ 眨眼、指针视差和动态偏好实时切换');

  // Keep the report assistant and personalized tool calls connected to the existing engines.
  {
    const { page, context } = await newPage(390, 844, { mock: true, key: 'test-key-only', homeTheme: 'moonfox' });
    await page.click('#homeCtaMain');
    await page.waitForSelector('#formModal.open');
    await page.click('[data-style="rigorous"]');
    await page.click('#swTrueSolar');
    assert.equal(await page.$eval('#swTrueSolar', el => el.getAttribute('aria-checked')), 'true');
    await page.click('.character-form-submit');
    await continueResult(page);
    await page.waitForSelector('#page2.active #characterReportGuide', { timeout: 15000 });
    assert.equal(await page.$eval('#characterReportGuide', el => el.getAttribute('aria-label')), '问问的提示');
    assert.equal(await page.$('#characterReportGuide img'), null, '报告入口不借用首页人物头像');
    assert.ok(await page.$('#characterReportGuide .character-prompt-avatar--symbol svg'));
    assert.equal(await page.$('#aiFab img'), null, '报告 dock 不在对话外显示人物形象');
    assert.equal(await page.evaluate(() => !!window._ctx && !window._ctx.isDemoPreview), true);
    assert.equal(await page.evaluate(() => window._ctx.input.resultStyle), 'rigorous');
    await page.click('#characterReportGuide .character-prompt-action');
    await page.waitForSelector('#aiSheet.open');
    assert.equal(await page.$eval('#aiSheet', el => el.inert), false);
    assert.equal(await page.$eval('#aiTitleText', el => el.textContent), '问问大师');
    await page.type('#askInput', '我参加陶艺展时怎样安排作品布置和邀请顺序？');
    await page.click('#aiSheet .ai-send');
    await page.waitForFunction(() => window.__aiCalls.length > 0, { timeout: 10000 });
    await page.waitForFunction(() => document.querySelector('.chat-ai-text')?.textContent.includes('我们可以从一件小事开始。'), { timeout: 10000 });
    assert.match(await page.evaluate(() => window.__aiCalls[0].body.messages[0].content), /用户命盘/);
    await page.evaluate(() => window.closeAsk());
    const traitColor = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--trait-color').trim());
    await page.click('#p2MenuBtn');
    await page.waitForSelector('#p2MenuDrawer.open');
    await page.waitForFunction(() => document.querySelector('#p2MenuDrawer.open')?.getBoundingClientRect().left >= -1);
    assert.equal(await page.$('#p2OrbBtn'), null, '旧的独立主题色入口应移除');
    await page.click('#p2ThemeSeg [data-val="dark"]');
    assert.equal(await page.$eval('html', el => el.dataset.theme), 'dark', '仍可切换深色模式');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--trait-color').trim()), traitColor, '明暗切换不改变特质色');
    await page.click('#p2ThemeSeg [data-val="light"]');
    assert.equal(await page.$eval('html', el => el.dataset.theme), 'light');
    await page.click('.p2-menu-close');
    await page.evaluate(() => window.goBack());
    await page.waitForFunction(() => !document.getElementById('page1').classList.contains('hidden'));
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'moonfox', '从报告返回时保留首页角色');
    await page.click('#characterPortraitButton');
    await page.waitForSelector('#formModal.open');
    assert.equal(await page.$eval('#aiSheet', el => el.classList.contains('open')), false, '回到首页后人物仍只开启探索');
    await page.keyboard.press('Escape');
    await openToolAssistant(page);
    await page.waitForSelector('#aiSheet.open');
    assert.match(await page.$eval('#homeChatIntro', el => el.textContent), /已载入你的命盘/);
    assert.equal(await page.$eval('.ai-basis-row', el => getComputedStyle(el).display !== 'none'), true, '有个人命盘时可切换分析体系');
    await page.type('#askInput', '怎样平衡工作与休息？');
    await page.click('#aiSheet .ai-send');
    await waitForSend(page);
    const system = await page.evaluate(() => window.__aiCalls.at(-1).body.messages[0].content);
    assert.match(system, /用户命盘/);
    assert.doesNotMatch(system, /用户尚未提供命盘/);
    await context.close();
  }
  {
    const { page, context } = await newPage(390, 844, { homeTheme: 'diyan' });
    await page.click('#characterPortraitButton');
    await page.waitForSelector('#formModal.open');
    await page.click('.character-form-submit');
    await continueResult(page);
    await page.waitForSelector('#page2.active #characterReportGuide', { timeout: 15000 });
    assert.equal(await page.$eval('#characterReportGuide', el => el.getAttribute('aria-label')), '问问的提示');
    assert.equal(await page.$('#characterReportGuide img'), null);
    assert.ok(await page.$('#characterReportGuide .character-prompt-avatar--symbol svg'));
    await page.click('#characterReportGuide .character-prompt-action');
    await page.waitForSelector('#aiSheet.open');
    assert.equal(await page.$eval('#aiTitleText', el => el.textContent), '问问大师', '地炎主题不能更改报告助手身份');
    await page.evaluate(() => window.closeAsk());
    await page.evaluate(() => window.goBack());
    await page.waitForFunction(() => !document.getElementById('page1').classList.contains('hidden'));
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'diyan', '从报告返回仍保留地炎主题');
    await context.close();
  }
  console.log('✓ 填写、命盘报告、报告导航及结合个人命盘的对话');

  // A demo chart is never sent to AI as if it belonged to the user.
  {
    const { page, context } = await newPage(390, 844, { mock: true, key: 'test-key-only' });
    await page.evaluate(() => { void window.calc(true); });
    await continueResult(page);
    await page.waitForSelector('#page2.active .demo-report-note', { timeout: 15000 });
    assert.equal(await page.$('#characterReportGuide'), null);
    await page.evaluate(() => window.goBack());
    await openToolAssistant(page);
    assert.match(await page.$eval('#homeChatIntro', el => el.textContent), /未提供命盘/);
    await page.type('#askInput', '我想聊聊最近的事情');
    await page.click('#aiSheet .ai-send');
    await waitForSend(page);
    assert.match(await page.evaluate(() => window.__aiCalls[0].body.messages[0].content), /尚未提供命盘/);
    await context.close();
  }
  console.log('✓ 示例命盘不会冒充个人信息');

  {
    const { page, context } = await newPage(390, 844, { history: [
      { h: '<div class="chat-msg chat-msg-ai"><div class="chat-avatar">✦</div><div class="chat-content"><div class="chat-bubble">旧的回答</div></div></div>' },
      { h: '<div class="chat-msg chat-msg-user"><div class="chat-avatar">我</div><div class="chat-content"><div class="chat-bubble">旧的问题</div></div></div>' },
    ] });
    await page.evaluate(() => { void window.calc(true); });
    await continueResult(page);
    await page.waitForSelector('#page2.active');
    await page.click('#aiFab');
    await page.waitForSelector('#aiSheet.open .chat-msg-ai .chat-avatar img');
    assert.equal(await page.$eval('.chat-msg-ai .chat-bubble', el => el.textContent), '旧的回答');
    assert.deepEqual(await page.$$eval('.chat-msg-ai .chat-avatar img', imgs => imgs.map(img => img.getAttribute('src'))), CHAT_MASTER.twins.map(twin => twin.avatar), '旧历史中 AI 头像升级为双子');
    assert.equal(await page.$eval('.chat-msg-ai .chat-avatar', el => el.getAttribute('aria-hidden')), 'true');
    assert.equal(await page.$eval('.chat-msg-user .chat-avatar', el => el.textContent), '我');
    await context.close();
  }
  console.log('✓ 旧对话恢复、保留用户内容与双子头像');

  for (const [width, height, theme] of [[320, 568, 'light'], [320, 400, 'light'], [568, 320, 'dark']]) {
    const { page, context } = await newPage(width, height, { theme });
    await page.evaluate(() => { void window.calc(true); });
    await continueResult(page);
    await page.waitForSelector('#page2.active');
    await page.$eval('#aiSheet', el => el.style.setProperty('--font-scale', '1.4'));
    await page.click('#aiFab');
    await page.waitForSelector('#aiSheet.open');
    await page.waitForFunction(() => [...document.querySelectorAll('#aiSheet [data-master-portrait]')].every(image => image.complete && image.naturalWidth));
    const layout = await page.evaluate(() => {
      const sheet = document.getElementById('aiSheet');
      const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
      return { sheet: sheet.getBoundingClientRect().toJSON(), scroll: sheet.scrollHeight, client: sheet.clientHeight,
        body: rect('#askResult'), input: rect('#aiSheet .ai-input-row'), title: rect('#aiTitleText'),
        topline: rect('#aiSheet .ai-topline'), heroCopy: rect('#aiSheet .ai-hero-copy'), head: rect('#aiSheet .ai-head'),
        twins: [...sheet.querySelectorAll('[data-master-portrait]')].map(el => el.getBoundingClientRect().toJSON()) };
    });
    assert.ok(layout.input.bottom <= layout.sheet.bottom && layout.input.bottom <= height, '报告中大字号输入区必须完整可见');
    const badge = await page.evaluate(() => {
      const badge = document.getElementById('evolveGenBadge');
      const wasHidden = badge.hidden, text = badge.textContent;
      badge.hidden = false; badge.textContent = '第123代';
      const rect = badge.getBoundingClientRect().toJSON();
      const actions = document.querySelector('#aiSheet .ai-actions').getBoundingClientRect().toJSON();
      badge.hidden = wasHidden; badge.textContent = text;
      return { rect, actions };
    });
    assert.ok(badge.rect.width > 0 && (badge.rect.right <= badge.actions.left + 1 || badge.rect.top >= badge.actions.bottom - 1), '自进化徽章不能遮住新建或设置按钮');
    assert.ok(layout.body.height >= 45, '报告中应保留可滚动的消息区域');
    assert.ok(layout.scroll <= layout.client + 1, '报告面板本身不能裁切');
    if (height > 450) {
      assert.ok(layout.heroCopy.top >= layout.topline.bottom - 1 && layout.heroCopy.bottom <= layout.head.top + 1, '大字号时主视觉文案不能压住标题或依据栏');
    }
    if (height <= 450) {
      assert.ok(layout.twins.every(rect => rect.right <= layout.title.left + 1), '短屏的双子和标题不能重叠');
      assert.equal(await page.$eval('#aiSheet .ai-close', el => getComputedStyle(el).display !== 'none'), true, '短屏报告需要可见的关闭按钮');
    }
    if (height > 360) {
      await page.click('#aiBasisWestern');
      const western = await page.evaluate(() => {
        const sheet = document.getElementById('aiSheet');
        const context = document.getElementById('aiContext');
        const value = context.querySelector('b');
        const range = document.createRange();
        range.selectNodeContents(value);
        const lines = [...range.getClientRects()];
        return { context: context.getBoundingClientRect().toJSON(), lines: lines.map(line => line.toJSON()),
          bodyHeight: document.getElementById('askResult').getBoundingClientRect().height,
          inputBottom: sheet.querySelector('.ai-input-row').getBoundingClientRect().bottom,
          sheetBottom: sheet.getBoundingClientRect().bottom, text: value.textContent };
      });
      assert.match(western.text, /太阳.*月亮.*主命数/);
      assert.ok(western.lines.length && western.lines.every(line => line.bottom <= western.context.bottom + 1 && line.right <= western.context.right + 1), '西方依据的实际数据应完整换行而不是被截断');
      assert.ok(western.bodyHeight >= 45 && western.inputBottom <= western.sheetBottom, '长依据不能挤掉消息和输入');
    }
    await page.type('#askInput', '你好');
    await page.click('#aiSheet .ai-send');
    await page.waitForFunction(() => document.querySelectorAll('#askResult .chat-msg-ai:not(.chat-typing)').length >= 2, { timeout: 5000 });
    assert.equal(await page.$$eval('#askResult .chat-msg-ai:not(.chat-typing) .chat-avatar--twins', avatars => avatars.every(avatar => avatar.querySelectorAll('img').length === 2)), true);
    if (height <= 450) {
      await page.click('#aiSheet .ai-close');
      assert.equal(await page.$eval('#aiSheet', el => el.classList.contains('open')), false);
    }
    await context.close();
  }
  console.log('✓ 报告对话在小屏、横屏、深色与特大字号下可读可发送');

  {
    const { page, context } = await newPage(390, 844);
    assert.equal(await page.$eval('.theme-toggle-home', el => el.getAttribute('aria-label')), '切换到深色主题');
    await page.click('.theme-toggle-home');
    assert.equal(await page.$eval('html', el => el.dataset.theme), 'dark');
    assert.equal(await page.$eval('.theme-toggle-home', el => el.getAttribute('aria-label')), '切换到浅色主题');
    await page.click('.theme-toggle-home');
    assert.equal(await page.$eval('html', el => el.dataset.theme), 'light');
    assert.equal(await page.$eval('#homeMenuDrawer', el => el.inert), true);
    await page.click('#homeMenuBtn');
    await page.waitForSelector('#homeMenuDrawer.open');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'home-menu-close');
    await page.click('.home-menu-close');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeMenuBtn');
    assert.equal(await page.$eval('#homeMenuDrawer', el => el.inert), true);
    await page.click('.character-guide-link');
    await page.waitForSelector('#noviceGuideModal.open');
    await page.click('.ng-close-btn');
    await page.click('#homeCtaCal');
    await page.waitForSelector('#toolModal.open.cal-fullscreen');
    await page.click('[data-fill]');
    await page.waitForSelector('#formModal.open');
    await page.waitForFunction(() => document.activeElement.id === 'formModalTitle');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 180)));
    assert.equal(await page.evaluate(() => document.getElementById('formModal').contains(document.activeElement)), true, '日历自动聚焦不能抢走表单焦点');
    await page.click('.character-form-submit');
    await page.waitForFunction(() => !document.getElementById('formModal').classList.contains('open'));
    assert.equal(await page.$eval('#toolModal', el => el.classList.contains('cal-fullscreen')), true);
    assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-fill')), true);
    await page.evaluate(() => window.closeToolPage());
    await context.close();
  }
  console.log('✓ 明暗切换、菜单、指引、日历和嵌套表单焦点');

  assert.deepEqual(errors, [], '页面不应产生未捕获的 JavaScript 错误');
} finally {
  await browser.close();
}
