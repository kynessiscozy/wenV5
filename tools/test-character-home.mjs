import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { WENWEN } from '../src/character/wenwen.js';
import { MOON_FOX } from '../src/character/moon-fox.js';
import { EARTHFIRE_SOVEREIGN } from '../src/character/earthfire-sovereign.js';

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
    if (key) localStorage.setItem('tj_ai_apikey', key);
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
          setTimeout(() => controller.enqueue(chunk(currentMode === 'long' ? '【结论】：' + '完整回答'.repeat(30) + '<img src=x onerror=alert(1)>' : '这是服务返回的第一段。')), 100);
          setTimeout(() => {
            if (currentMode === 'partialFail') {
              controller.error(new Error('mock interrupted stream'));
            } else {
              controller.enqueue(chunk('我们可以从一件小事开始。'));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          }, currentMode === 'partialFail' ? 220 : 800);
        },
      });
      return Promise.resolve(new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
    };
  }, {
    theme: options.theme || 'light', homeTheme: options.homeTheme, mock: !!options.mock, provider: options.provider,
    key: options.key, mode: options.mode, history: options.history, finePointer: !!options.finePointer,
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window._tools2Ready === true && document.documentElement.dataset.homeReady === 'true', { timeout: 15000 });
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.character-portrait img, .character-prop img')].filter(image => !image.hidden);
    images.push(document.querySelector('.character-backdrop img'));
    return images.length >= 4 && images.every(image => image?.complete && image.naturalWidth > 0);
  }, { timeout: 15000 });
  return { page, context };
}

async function switchHome(page, id) {
  await page.click(`[data-home-character="${id}"]`);
  await page.waitForFunction(target => {
    const portrait = document.querySelector('[data-character-asset="portrait"]');
    const backdrop = document.querySelector('.character-backdrop img');
    const room = matchMedia('(max-aspect-ratio: 4/5)').matches ? 'mobile' : 'wide';
    const expected = {
      wenwen: ['wenwen-divine.webp', `sacred-study-${room}.webp`],
      moonfox: ['moon-fox.webp', `moon-fox-study-${room}.webp`],
      diyan: ['earthfire-sovereign.webp', `earthfire-hall-${room}.webp`],
    }[target];
    const fire = document.querySelector('.character-fire-base');
    return document.documentElement.dataset.homeTheme === target &&
      document.querySelector(`[data-home-character="${target}"]`).getAttribute('aria-pressed') === 'true' &&
      portrait.complete && portrait.naturalWidth > 0 && portrait.currentSrc.endsWith('/' + expected[0]) &&
      backdrop.complete && backdrop.naturalWidth > 0 && backdrop.currentSrc.endsWith('/' + expected[1]) &&
      (target !== 'diyan' || (fire.complete && fire.naturalWidth === 1124));
  }, { timeout: 15000 }, id);
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

async function waitForSend(page) {
  await page.waitForFunction(() => !document.querySelector('#aiSheet .ai-send').disabled, { timeout: 12000 });
}

// Other tools can still invoke the assistant while the home page is visible; it is not a home CTA.
async function openToolAssistant(page) {
  await page.evaluate(() => window.openAsk());
  await page.waitForSelector('#aiSheet.open');
}

try {
  for (const [width, height] of [[1440, 900], [1280, 720], [1024, 768], [901, 900], [900, 900], [768, 1024], [650, 844], [430, 932], [390, 844], [375, 812], [361, 844], [360, 640], [320, 844], [320, 568]]) {
    const { page, context } = await newPage(width, height);
    const layout = await page.evaluate(() => {
      const scroll = document.querySelector('#page1 .p1-scroll');
      const scene = document.getElementById('characterScene');
      const image = scene.querySelector('[data-character-asset="portrait"]');
      const portrait = document.getElementById('characterPortraitButton');
      const header = document.querySelector('.character-header');
      const footer = document.querySelector('.character-footer');
      const menu = document.getElementById('homeMenuBtn').getBoundingClientRect();
      const theme = document.querySelector('.theme-toggle-home').getBoundingClientRect();
      const imageRect = portrait.getBoundingClientRect();
      const cta = document.getElementById('homeCtaMain').getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const lower = context.getImageData(0, Math.floor(image.naturalHeight * .9), image.naturalWidth, 1).data;
      let coverage = 0;
      for (let i = 3; i < lower.length; i += 4) if (lower[i] >= 200) coverage++;
      const anchorRect = scene.querySelector('.character-lantern-anchor').getBoundingClientRect();
      const lantern = scene.querySelector('.character-prop--lantern');
      const lanternImage = lantern.querySelector('img');
      const lanternRect = lantern.getBoundingClientRect();
      const cordStyle = getComputedStyle(lantern, '::before');
      const cordCenter = parseFloat(cordStyle.left) + new DOMMatrixReadOnly(cordStyle.transform).m41 + parseFloat(cordStyle.width) / 2;
      const cordCanvas = document.createElement('canvas');
      cordCanvas.width = lanternImage.naturalWidth; cordCanvas.height = lanternImage.naturalHeight;
      const cordContext = cordCanvas.getContext('2d'); cordContext.drawImage(lanternImage, 0, 0);
      const row = cordContext.getImageData(0, 0, lanternImage.naturalWidth, 1).data;
      let weightedX = 0, totalAlpha = 0;
      for (let x = 0; x < lanternImage.naturalWidth; x++) {
        const alpha = row[x * 4 + 3];
        if (alpha >= 80) { weightedX += (x + .5) * alpha; totalAlpha += alpha; }
      }
      const imageCordCenter = weightedX / totalAlpha / lanternImage.naturalWidth * lanternRect.width;
      // Compare the top of the illustrated lantern body and the character's hair, not transparent padding.
      const firstOpaqueRow = (ctx, width, height, fraction) => {
        const pixels = ctx.getImageData(0, 0, width, height).data;
        for (let y = 0; y < height; y++) {
          let count = 0;
          for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] > 128) count++;
          if (count > width * fraction) return y;
        }
        return NaN;
      };
      const headY = firstOpaqueRow(context, image.naturalWidth, image.naturalHeight, .03);
      const lampBodyY = firstOpaqueRow(cordContext, lanternImage.naturalWidth, lanternImage.naturalHeight, .33);
      const imageScale = Math.min(imageRect.width / image.naturalWidth, imageRect.height / image.naturalHeight);
      const headTop = imageRect.bottom - image.naturalHeight * imageScale + headY * imageScale;
      const lanternTop = lanternRect.top + lampBodyY / lanternImage.naturalHeight * lanternRect.height;
      return {
        scrollWidth: scroll.scrollWidth, clientWidth: scroll.clientWidth,
        headerText: header.innerText, topLine: getComputedStyle(header).borderBottomWidth,
        bottomLine: getComputedStyle(footer).borderTopWidth,
        headerRect: header.getBoundingClientRect().toJSON(), menu: menu.toJSON(), theme: theme.toJSON(),
        visibleTitle: [...header.querySelectorAll('h1,h2')].some(el => el.getClientRects().length),
        homeHeading: document.querySelector('.character-home h1')?.textContent,
        homeButtons: [...document.querySelectorAll('.character-home button')].map(el => el.textContent.trim()),
        invitation: !!document.getElementById('characterInvitation'),
        portraitLabel: portrait.getAttribute('aria-label'), portraitControls: portrait.getAttribute('aria-controls'),
        portraitUrl: image.currentSrc, backdropUrl: document.querySelector('.character-backdrop img').currentSrc,
        backdropHidden: document.querySelector('.character-backdrop').getAttribute('aria-hidden'),
        aura: { hidden: portrait.querySelector('.character-aura').getAttribute('aria-hidden'), pointer: getComputedStyle(portrait.querySelector('.character-aura')).pointerEvents },
        heartlight: { hidden: scene.querySelector('.scene-heartlight').getAttribute('aria-hidden'), display: getComputedStyle(scene.querySelector('.scene-heartlight')).display,
          pointer: getComputedStyle(scene.querySelector('.scene-heartlight')).pointerEvents, animation: getComputedStyle(scene.querySelector('.scene-heartlight')).animationName },
        sceneryHidden: scene.querySelector('.character-scenery').getAttribute('aria-hidden'),
        removedArmillary: !scene.querySelector('.character-prop--armillary'),
        anchorRect: anchorRect.toJSON(), portraitRect: imageRect.toJSON(),
        cordError: Math.abs(cordCenter - imageCordCenter),
        artworkAlignment: Math.abs(lanternTop - headTop),
        lanternCordX: lanternRect.left + cordCenter,
        props: [...scene.querySelectorAll('.character-prop img')].filter(prop => !prop.hidden).map(prop => {
          const rect = prop.getBoundingClientRect();
          const canvas = document.createElement('canvas');
          canvas.width = prop.naturalWidth; canvas.height = prop.naturalHeight;
          const ctx = canvas.getContext('2d'); ctx.drawImage(prop, 0, 0);
          return { src: prop.currentSrc, alpha: ctx.getImageData(0, 0, 1, 1).data[3], pointer: getComputedStyle(prop).pointerEvents,
            centerX: rect.left + rect.width / 2,
            visible: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight };
        }),
        cornerAlpha: context.getImageData(0, 0, 1, 1).data[3], lowerCoverage: coverage / image.naturalWidth,
        portraitStyle: { border: getComputedStyle(portrait).borderTopWidth, background: getComputedStyle(portrait).backgroundColor, ratio: portrait.style.getPropertyValue('--character-ratio') },
        layers: [...scene.querySelectorAll('.character-expression')].map(el => ({ src: el.currentSrc, hidden: el.hidden, aria: el.getAttribute('aria-hidden'), pointer: getComputedStyle(el).pointerEvents, animation: getComputedStyle(el).animationName })),
        ctaVisible: cta.left >= 0 && cta.right <= innerWidth && cta.top >= 0 && cta.bottom <= innerHeight,
        cloudButtons: ['homeCtaMain', 'homeCtaCal'].map(id => {
          const button = document.getElementById(id);
          const rect = button.getBoundingClientRect();
          const art = button.querySelector('.character-btn-art');
          const texture = art.querySelector('image');
          const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return { id, name: button.textContent.trim(), rect: rect.toJSON(),
            artHidden: art.getAttribute('aria-hidden'), iconHidden: button.querySelector('.character-btn-icon').getAttribute('aria-hidden'),
            shape: art.querySelector('.character-btn-fill').getAttribute('href'),
            texture: new URL(texture.getAttribute('href'), document.baseURI).href,
            textureVisibility: getComputedStyle(texture).visibility,
            pointer: getComputedStyle(art).pointerEvents, centerHit: center?.closest('button')?.id };
        }),
        imageBottom: imageRect.bottom, ctaTop: cta.top,
      };
    });
    assert.equal(layout.scrollWidth, layout.clientWidth, `${width}px: 首页不得横向溢出`);
    assert.equal(layout.topLine, '0px', `${width}px: 顶部不应有横线`);
    assert.equal(layout.bottomLine, '0px', `${width}px: 底部不应有横线`);
    assert.equal(layout.visibleTitle, false, '首页顶部不应再显示标题');
    assert.ok(!layout.headerText.includes('问问大师'));
    assert.equal(layout.homeHeading, '问问大师', '首页仍应保留屏幕阅读器标题');
    assert.ok(!layout.homeButtons.some(text => ['事业', '关系', '自己'].includes(text)), '首页不应出现预设选题');
    assert.ok(!layout.homeButtons.some(text => text.includes('聊聊')) && !layout.invitation, '首页不应出现聊天入口');
    assert.equal(layout.portraitLabel, '点击问问，开启探索');
    assert.equal(layout.portraitControls, 'formModal');
    assert.ok(layout.menu.width >= 44 && layout.menu.height >= 44 && layout.theme.width >= 44 && layout.theme.height >= 44, '页头触控目标至少 44px');
    assert.ok(layout.menu.right < layout.theme.left && Math.abs(layout.menu.left - layout.headerRect.left) < 1 && Math.abs(layout.theme.right - layout.headerRect.right) < 1, '菜单和主题切换分别位于两侧');
    assert.equal(layout.portraitUrl, new URL(WENWEN.assets.portrait.src, BASE).href);
    const portraitRoom = width / height <= 4 / 5;
    assert.equal(layout.backdropUrl, new URL(`./art/sacred-study-${portraitRoom ? 'mobile' : 'wide'}.webp`, BASE).href, `${width}px: 应选择对应横竖构图的书斋`);
    assert.equal(layout.backdropHidden, 'true');
    assert.deepEqual(layout.aura, { hidden: 'true', pointer: 'none' }, '人物光晕不应干扰辅助技术或点击');
    assert.equal(layout.heartlight.hidden, 'true');
    assert.equal(layout.heartlight.display, portraitRoom ? 'block' : 'none', '竖屏应保留可见的心芒');
    assert.equal(layout.heartlight.pointer, 'none');
    assert.equal(layout.heartlight.animation, 'none', '减少动态时心芒保持静止');
    assert.equal(layout.sceneryHidden, 'true', '装饰道具不应干扰屏幕阅读器');
    assert.deepEqual(layout.props.map(prop => prop.src), [new URL(WENWEN.assets.cloudTrail.src, BASE).href, new URL(WENWEN.assets.lantern.src, BASE).href]);
    assert.ok(layout.removedArmillary, '首页不应再出现浑天仪');
    assert.ok(layout.props.every(prop => prop.alpha === 0 && prop.pointer === 'none' && prop.visible), `${width}px: 透明配景应完整可见且不拦截操作`);
    assert.ok(Math.abs(layout.anchorRect.left - layout.portraitRect.left) < .5 && Math.abs(layout.anchorRect.width - layout.portraitRect.width) < .5, `${width}px: 天灯定位应随人物尺寸变化`);
    assert.ok(layout.cordError < .5, `${width}px: 灯绳应对齐素材中的灯绳，误差 ${layout.cordError.toFixed(2)}px`);
    assert.ok(layout.artworkAlignment < 12, `${width}px: 灯身与人物顶部应视觉对齐，误差 ${layout.artworkAlignment.toFixed(2)}px`);
    assert.ok(layout.lanternCordX > layout.menu.right + 8, `${width}px: 灯绳应避开菜单按钮`);
    assert.equal(layout.cornerAlpha, 0, '人物素材应透明无框');
    assert.ok(layout.lowerCoverage > .15, '人物下半部和云朵应完整');
    assert.equal(layout.portraitStyle.border, '0px');
    assert.equal(layout.portraitStyle.background, 'rgba(0, 0, 0, 0)');
    assert.equal(layout.portraitStyle.ratio, '992 / 1299');
    assert.equal(layout.layers.length, 2);
    assert.deepEqual(layout.layers.map(layer => layer.src), [new URL(WENWEN.assets.blink.src, BASE).href, new URL(WENWEN.assets.speaking.src, BASE).href]);
    assert.ok(layout.layers.every(layer => !layer.hidden && layer.aria === 'true' && layer.pointer === 'none' && layer.animation === 'none'), '表情层不能拦截操作，减少动态时不应播放');
    assert.ok(layout.ctaVisible, `${width}px: 主操作应在首屏`);
    assert.ok(layout.imageBottom <= layout.ctaTop, `${width}px: 操作按钮应位于人物下方`);
    assert.deepEqual(layout.cloudButtons.map(button => button.name), ['开启探索', '日历']);
    assert.ok(layout.cloudButtons.every(({ id, rect, artHidden, iconHidden, shape, texture, textureVisibility, pointer, centerHit }) =>
      rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= width && rect.top >= 0 && rect.bottom <= height &&
      artHidden === 'true' && iconHidden === 'true' && shape === '#homeCloudShape' &&
      texture === new URL(WENWEN.assets.cloudTrail.src, BASE).href && textureVisibility === 'visible' && pointer === 'none' && centerHit === id),
    `${width}px: 祥云按钮应位于首屏，有足够点击区且装饰不干扰操作`);
    assert.ok(layout.cloudButtons[0].rect.right <= layout.cloudButtons[1].rect.left, `${width}px: 两个按钮不能重叠`);
    await context.close();
  }
  console.log('✓ 光芒人物、心芒书斋、天灯对齐与十四种视口布局');

  // The three camera stops are the same unframed scene, not separate static pages.
  for (const theme of ['wenwen', 'moonfox', 'diyan']) for (const [width, height] of [[1440, 900], [390, 844], [320, 568]]) {
    const { page, context } = await newPage(width, height, { homeTheme: theme });
    const baseline = await page.$eval('#characterPortraitButton', el => el.getBoundingClientRect().toJSON());
    const picker = await page.evaluate(() => ({
      label: document.querySelector('.character-camera-picker').getAttribute('aria-label'),
      buttons: [...document.querySelectorAll('.character-camera-picker button')].map(button => ({
        text: button.textContent.trim(), pressed: button.getAttribute('aria-pressed'), rect: button.getBoundingClientRect().toJSON(),
      })),
      hint: document.querySelector('#characterCameraHint').textContent,
      description: document.querySelector('#characterPortraitButton').getAttribute('aria-describedby'),
    }));
    assert.equal(picker.label, '人物景别');
    assert.deepEqual(picker.buttons.map(button => button.text), ['远景', '中景', '近景']);
    assert.deepEqual(picker.buttons.map(button => button.pressed), ['false', 'true', 'false']);
    assert.ok(picker.buttons.every(({ rect }) => rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= width && rect.bottom <= height));
    assert.match(picker.hint, /左右拖动人物/);
    assert.equal(picker.description, 'characterCameraHint');
    for (const [shot, expected] of [['far', .82], ['mid', 1], ['close', theme === 'diyan' ? 1.55 : 1.7]]) {
      await page.click(`.character-camera-picker [data-camera-shot="${shot}"]`);
      const state = await page.evaluate(() => {
        const scene = document.querySelector('#characterScene');
        const camera = document.querySelector('.character-camera');
        const subject = document.querySelector('.character-camera-subject');
        const scenery = document.querySelector('.character-scenery');
        const portrait = document.querySelector('#characterPortraitButton');
        const room = document.querySelector('.character-backdrop img');
        const scroll = document.querySelector('#page1 .p1-scroll');
        const main = document.querySelector('#homeCtaMain').getBoundingClientRect();
        const safeX = scene.dataset.cameraSafeX == null ? null : Number(scene.dataset.cameraSafeX);
        const subjectRect = subject.getBoundingClientRect();
        return {
          shot: scene.dataset.cameraShot,
          pressed: [...document.querySelectorAll('.character-camera-picker button')].map(button => button.getAttribute('aria-pressed')),
          scale: Number(camera.style.getPropertyValue('--camera-scale')),
          subjectScale: new DOMMatrixReadOnly(getComputedStyle(subject).transform).a,
          sceneryScale: new DOMMatrixReadOnly(getComputedStyle(scenery).transform).a,
          roomScale: new DOMMatrixReadOnly(getComputedStyle(room).transform).a,
          transition: getComputedStyle(subject).transitionDuration,
          portrait: portrait.getBoundingClientRect().toJSON(), subject: subjectRect.toJSON(), scene: scene.getBoundingClientRect().toJSON(),
          safeAnchor: safeX == null ? null : subjectRect.left + subjectRect.width * safeX,
          scrollWidth: scroll.scrollWidth, clientWidth: scroll.clientWidth, cta: main.toJSON(),
          hit: document.elementFromPoint(main.left + main.width / 2, main.top + main.height / 2)?.closest('button')?.id,
        };
      });
      assert.equal(state.shot, shot);
      assert.deepEqual(state.pressed, ['far', 'mid', 'close'].map(id => String(id === shot)));
      assert.ok(Math.abs(state.scale - expected) < .001 && Math.abs(state.subjectScale - expected) < .001 && Math.abs(state.sceneryScale - expected) < .001, `${theme} ${width}px ${shot}: 人物与配景须同步运镜`);
      assert.ok(Math.abs(state.roomScale - ({ far: 1.015, mid: 1.04, close: 1.105 }[shot])) < .001, '背景应有更轻的纵深移动');
      assert.equal(state.transition, '0s', '减少动态时景别直接切换');
      assert.ok(Math.abs(state.portrait.width - baseline.width) < .5 && Math.abs(state.portrait.height - baseline.height) < .5, '运镜不能改变人物焦点目标的布局');
      if (shot === 'close' && state.safeAnchor != null) assert.ok(state.safeAnchor >= state.scene.left + 12 && state.safeAnchor <= state.scene.right - 12, `${theme} ${width}px: 近景需保留狐火或权杖`);
      assert.equal(state.scrollWidth, state.clientWidth, `${theme} ${width}px ${shot}: 运镜不能产生横向滚动`);
      assert.ok(state.cta.bottom <= height && state.hit === 'homeCtaMain', '运镜不得遮挡首屏主操作');
    }
    await context.close();
  }
  console.log('✓ 三角色远中近景、九种关键视口组合与焦点布局稳定');

  for (const theme of ['wenwen', 'moonfox', 'diyan']) {
    const { page, context } = await newPage(390, 844, { homeTheme: theme });
    for (const shot of ['mid', 'close']) {
      await page.click(`.character-camera-picker [data-camera-shot="${shot}"]`);
      for (const selector of ['.camera-gesture-hint', ...['far', 'mid', 'close'].map(id => `.character-camera-picker [data-camera-shot="${id}"]`)]) {
        const text = await renderedTextContrast(page, selector);
        assert.ok(text.samples > 0 && text.ratio >= 4.5, `${theme} ${shot} ${selector}: 实景上的景别文字对比度 ${text.ratio.toFixed(2)}`);
      }
    }
    await context.close();
  }
  console.log('✓ 三角色景别控制在实景背景上的文字对比度');

  {
    const { page, context } = await newPage(390, 844, { motion: 'no-preference', homeTheme: 'diyan' });
    const ax = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
    assert.ok(ax.nodes.some(node => !node.ignored && node.role?.value === 'group' && node.name?.value === '人物景别'));
    for (const label of ['远景', '中景', '近景']) assert.ok(ax.nodes.some(node => !node.ignored && node.role?.value === 'button' && node.name?.value === label));
    await page.focus('.character-camera-picker [data-camera-shot="mid"]');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'far');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.cameraShot), 'far');
    await page.keyboard.press('End');
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.cameraShot), 'close');
    assert.notEqual(await page.$eval('.character-camera-subject', el => getComputedStyle(el).transitionDuration), '0s', '正常动态应平滑运镜');
    await page.waitForFunction(() => document.querySelector('#characterScene').classList.contains('camera-react'), { timeout: 2000 });
    assert.equal(await page.$eval('.character-blink', el => getComputedStyle(el).animationName), 'camera-greeting-blink', '镜头落定时人物轻轻眨眼');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.keyboard.press('Home');
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'far');
    assert.equal(await page.$eval('.character-camera-subject', el => getComputedStyle(el).transitionDuration), '0s');
    assert.equal(await page.$eval('.character-blink', el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.$eval('#characterScene', el => el.classList.contains('camera-react')), false);
    await page.keyboard.press('End');
    await page.focus('.character-camera-picker [data-camera-shot="far"]');
    const scrollBefore = await page.$eval('#page1 .p1-scroll', el => el.scrollTop);
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'characterPortraitButton');
    assert.equal(await page.$eval('#page1 .p1-scroll', el => el.scrollTop), scrollBefore, '近景键盘聚焦不能跳动画面');
    assert.equal(await page.$eval('.character-camera-viewport', el => el.scrollTop), 0);
    assert.match(await page.$eval('#characterScene', el => getComputedStyle(el, '::after').content), /开启探索/, '无画框的聚焦提示必须可见');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#formModal.open');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'characterPortraitButton');
    const client = await page.createCDPSession();
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
    const forced = await page.$$eval('.character-camera-picker button', buttons => buttons.map(button => ({
      background: getComputedStyle(button).backgroundColor, color: getComputedStyle(button).color,
    })));
    assert.notEqual(forced[0].background, forced[2].background, '强制颜色下近景仍需可辨认');
    assert.notEqual(forced[2].color, forced[2].background);
    await context.close();
  }
  console.log('✓ 景别键盘、聚焦、人物眨眼、强制颜色与减少动态');

  {
    const { page, context } = await newPage(390, 844, { motion: 'no-preference', finePointer: true, homeTheme: 'diyan' });
    const scene = await page.$eval('#characterScene', el => el.getBoundingClientRect().toJSON());
    const x = scene.left + scene.width / 2, y = scene.top + scene.height * .35;
    await page.evaluate(({ x, y }) => {
      const common = { pointerId: 42, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: x, clientY: y };
      document.querySelector('#characterPortraitButton').dispatchEvent(new PointerEvent('pointerdown', common));
      window.dispatchEvent(new PointerEvent('pointermove', { ...common, clientX: x - 60 }));
    }, { x, y });
    await page.waitForFunction(() => document.querySelector('#characterScene').dataset.cameraDragging === 'true');
    await page.evaluate(({ x, y }) => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 42, pointerType: 'touch', isPrimary: true, clientX: x - 60, clientY: y })), { x, y });
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'mid', '手势取消时应恢复原景别');
    assert.equal(await page.$eval('body', el => el.classList.contains('camera-dragging')), false);
    await page.click('.character-camera-picker [data-camera-shot="far"]');
    await page.evaluate(({ x, y }) => {
      const common = { pointerId: 43, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: x, clientY: y };
      document.querySelector('#characterPortraitButton').dispatchEvent(new PointerEvent('pointerdown', common));
      window.dispatchEvent(new PointerEvent('pointermove', { ...common, clientX: x - 300 }));
      window.dispatchEvent(new PointerEvent('pointerup', { ...common, clientX: x - 300 }));
    }, { x, y });
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close', '快速跨越两档不应被吸附拉回中景');
    await page.click('.character-camera-picker [data-camera-shot="mid"]');
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 60, y + 1, { steps: 6 });
    await page.waitForFunction(() => document.querySelector('#characterScene').dataset.cameraDragging === 'true' && Number(document.querySelector('.character-camera').style.getPropertyValue('--camera-scale')) > 1.1);
    const during = await page.$eval('.character-camera', el => Number(el.style.getPropertyValue('--camera-scale')));
    assert.ok(during < 1.55, '拖动过程应连续跟手，而不是松开后才跳变');
    await page.mouse.move(x - 135, y + 1, { steps: 6 }); await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('#characterScene').dataset.cameraShot === 'close');
    assert.equal(await page.$eval('#formModal', el => el.classList.contains('open')), false, '拖动不能误触探索表单');
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraDragging), undefined);
    await new Promise(resolve => setTimeout(resolve, 850));
    await page.click('#characterPortraitButton');
    await page.waitForSelector('#formModal.open');
    await page.keyboard.press('Escape');
    await switchHome(page, 'moonfox');
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close', '切换角色时保留景别');
    await page.waitForFunction(() => document.querySelector('.character-camera').style.getPropertyValue('--camera-scale') === '1.7000');
    await switchHome(page, 'wenwen');
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close');
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraSafeX), undefined, '切换角色时清除旧的权杖/狐火构图参数');
    await context.close();
  }
  console.log('✓ 鼠标拖动跟手、不会误开表单与跨角色景别保持');

  {
    const { page, context } = await newPage(390, 844, { homeTheme: 'diyan', touch: true });
    const client = await page.createCDPSession();
    const touch = (type, x, y) => client.send('Input.dispatchTouchEvent', {
      type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
    });
    await touch('touchStart', 200, 300);
    for (const x of [180, 160, 140, 120, 100, 80]) await touch('touchMove', x, 300);
    await touch('touchEnd', 0, 0);
    await page.waitForFunction(() => document.querySelector('#characterScene').dataset.cameraShot === 'close');
    assert.equal(await page.$eval('#formModal', el => el.classList.contains('open')), false);
    await touch('touchStart', 200, 400);
    for (const y of [380, 355, 330, 305, 280, 255, 230, 205, 180]) await touch('touchMove', 200, y);
    await touch('touchEnd', 0, 0);
    await page.waitForFunction(() => document.querySelector('#page1 .p1-scroll').scrollTop > 0);
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close', '纵向滑动应正常滚动，不改变景别');
    assert.equal(await page.$eval('#formModal', el => el.classList.contains('open')), false);
    await context.close();
  }
  console.log('✓ 触屏横向切景、纵向滚动与误触保护');

  {
    const { page, context } = await newPage(390, 844, { motion: 'no-preference' });
    const bounds = await page.$$eval('.character-expression', images => images.map(image => {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] > 8) {
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
      return { width: canvas.width, height: canvas.height, left, top, right, bottom };
    }));
    assert.ok(bounds.every(box => box.width === WENWEN.assets.portrait.width && box.height === WENWEN.assets.portrait.height &&
      box.left > box.width * .35 && box.right < box.width * .7 && box.top > box.height * .1 && box.bottom < box.height * .25), '表情贴图应只覆盖新版人物的面部');
    assert.equal(WENWEN.assets.blink.forPortrait, WENWEN.assets.portrait.src);
    assert.equal(WENWEN.assets.speaking.forPortrait, WENWEN.assets.portrait.src);
    assert.equal(await page.$eval('.scene-heartlight', el => getComputedStyle(el).animationName), 'heartlight-breathe');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.scene-heartlight', el => getComputedStyle(el).animationName), 'none');
    await context.close();
  }
  console.log('✓ 新人物表情对齐与心芒动态偏好');

  {
    const { page, context } = await newPage(390, 844);
    await page.setViewport({ width: 1280, height: 720 });
    await page.waitForFunction(() => document.querySelector('.character-backdrop img').currentSrc.endsWith('/sacred-study-wide.webp'));
    await page.setViewport({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector('.character-backdrop img').currentSrc.endsWith('/sacred-study-mobile.webp'));
    await context.close();
  }

  for (const theme of ['light', 'dark']) {
    const { page, context } = await newPage(390, 844, { theme });
    const contrast = await renderedButtonContrast(page, ['#homeCtaMain', '#homeCtaCal']);
    contrast.forEach(({ selector, ratio }) => assert.ok(ratio >= 4.5, `${theme} ${selector}: 实际对比度 ${ratio.toFixed(2)}`));
    for (const selector of ['[data-home-character="wenwen"]', '[data-home-character="moonfox"]', '[data-home-character="diyan"]', '.character-guide-link', '.character-footer']) {
      const text = await renderedTextContrast(page, selector);
      assert.ok(text.samples > 0 && text.ratio >= 4.5, `${theme} ${selector}: 书斋背景上的文字对比度 ${text.ratio.toFixed(2)}`);
    }
    await openToolAssistant(page);
    await page.waitForSelector('#aiSheet.open');
    const styles = await page.evaluate(() => {
      const button = document.querySelector('.chat-home-actions button');
      const panel = document.getElementById('aiSheet');
      return { foreground: getComputedStyle(button).color, background: getComputedStyle(panel).backgroundColor };
    });
    const ratio = await page.evaluate(({ foreground, background }) => {
      const lum = color => color.match(/\d+/g).slice(0, 3).map(Number).map(v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
        .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
      const a = lum(foreground), b = lum(background);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    }, styles);
    assert.ok(ratio >= 4.5, `${theme}: 对话入口文字对比度 ${ratio.toFixed(2)}`);
    await context.close();
  }
  for (const [width, height] of [[430, 932], [361, 844], [320, 844]]) {
    const { page, context } = await newPage(width, height);
    const footer = await renderedTextContrast(page, '.character-footer');
    assert.ok(footer.samples > 0 && footer.ratio >= 4.5, `${width}px: 书卷背景上的说明文字对比度 ${footer.ratio.toFixed(2)}`);
    await context.close();
  }
  console.log('✓ 明暗主题、书斋背景文字及操作按钮对比度');

  // The fox is a full second scene, not a recolored version of the original portrait.
  for (const [index, [width, height]] of [[1440, 900], [1280, 720], [1024, 768], [768, 1024], [650, 844], [430, 932], [390, 844], [361, 844], [320, 844], [320, 568]].entries()) {
    const { page, context } = await newPage(width, height, { theme: index % 2 ? 'dark' : 'light' });
    await switchHome(page, 'moonfox');
    const state = await page.evaluate(() => {
      const scroll = document.querySelector('#page1 .p1-scroll');
      const portrait = document.getElementById('characterPortraitButton');
      const art = portrait.querySelector('[data-character-asset="portrait"]');
      const rect = portrait.getBoundingClientRect();
      const canvas = document.createElement('canvas'); canvas.width = art.naturalWidth; canvas.height = art.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(art, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let edgePixels = 0;
      for (let x = 0; x < canvas.width; x++) for (const y of [0, canvas.height - 1]) if (pixels[(y * canvas.width + x) * 4 + 3]) edgePixels++;
      for (let y = 0; y < canvas.height; y++) for (const x of [0, canvas.width - 1]) if (pixels[(y * canvas.width + x) * 4 + 3]) edgePixels++;
      const buttonRects = [...document.querySelectorAll('.character-actions button')].map(el => el.getBoundingClientRect().toJSON());
      return {
        scrollWidth: scroll.scrollWidth, clientWidth: scroll.clientWidth,
        portrait: rect.toJSON(), label: portrait.getAttribute('aria-label'), alt: art.alt,
        border: getComputedStyle(portrait).borderTopWidth, background: getComputedStyle(portrait).backgroundColor,
        natural: [art.naturalWidth, art.naturalHeight], edgePixels,
        room: document.querySelector('.character-backdrop img').currentSrc,
        lanternHidden: document.querySelector('.character-prop--lantern').hidden,
        cloudDisplay: getComputedStyle(document.querySelector('.character-prop--cloud')).display,
        expressions: [...portrait.querySelectorAll('.character-expression')].map(el => ({ src: el.currentSrc, hidden: el.hidden, natural: [el.naturalWidth, el.naturalHeight] })),
        menu: document.getElementById('homeMenuBtn').getBoundingClientRect().toJSON(),
        toggle: document.querySelector('.theme-toggle-home').getBoundingClientRect().toJSON(),
        switcher: document.querySelector('.character-theme-switcher').getBoundingClientRect().toJSON(),
        switches: [...document.querySelectorAll('[data-home-character]')].map(el => ({ pressed: el.getAttribute('aria-pressed'), rect: el.getBoundingClientRect().toJSON() })),
        buttons: buttonRects,
        texture: document.querySelector('.character-btn-texture').getAttribute('href'),
        avatar: document.querySelector('.character-dock-avatar').getAttribute('src'),
      };
    });
    assert.equal(state.scrollWidth, state.clientWidth, `${width}px: 狐妖场景不能横向溢出`);
    assert.equal(state.label, '点击月白，开启探索');
    assert.match(state.alt, /狐妖月白.*蓝色狐火/);
    assert.deepEqual(state.natural, [MOON_FOX.assets.portrait.width, MOON_FOX.assets.portrait.height]);
    assert.equal(state.edgePixels, 0, '人物四边应透明，不应有被裁断的图框');
    assert.equal(state.border, '0px');
    assert.equal(state.background, 'rgba(0, 0, 0, 0)');
    assert.ok(state.portrait.left >= 0 && state.portrait.right <= width && state.portrait.bottom <= state.buttons[0].top, `${width}px: 完整人物应在操作按钮上方`);
    assert.ok(state.buttons.every(rect => rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= width && rect.bottom <= height), `${width}px: 探索和日历应在首屏且便于点击`);
    assert.ok(state.menu.right <= state.switcher.left && state.switcher.right <= state.toggle.left, `${width}px: 角色切换不能遮挡两侧控制`);
    assert.ok(state.switches.every(({ rect }) => rect.width >= 44 && rect.height >= 44));
    assert.deepEqual(state.switches.map(el => el.pressed), ['false', 'true', 'false']);
    assert.ok(state.room.endsWith(`/moon-fox-study-${width / height <= 4 / 5 ? 'mobile' : 'wide'}.webp`));
    assert.equal(state.lanternHidden, true, '新角色不应继承问问的天灯');
    assert.equal(state.cloudDisplay, 'none', '狐妖自身祥云应保持完整，不叠加多余配景');
    assert.deepEqual(state.expressions.map(el => el.src), [new URL(MOON_FOX.assets.blink.src, BASE).href, new URL(MOON_FOX.assets.speaking.src, BASE).href]);
    assert.ok(state.expressions.every(el => !el.hidden && el.natural[0] === 770 && el.natural[1] === 973));
    assert.equal(state.texture, MOON_FOX.assets.cloudTrail.src);
    assert.equal(state.avatar, WENWEN.assets.avatar.src, '首页主题切换不能错换报告中问问的头像');
    await context.close();
  }
  console.log('✓ 月白狐独立人物、横竖书斋与十种视口布局');

  for (const theme of ['light', 'dark']) {
    const { page, context } = await newPage(390, 844, { theme });
    await switchHome(page, 'moonfox');
    const contrast = await renderedButtonContrast(page, ['#homeCtaMain', '#homeCtaCal']);
    contrast.forEach(({ selector, ratio }) => assert.ok(ratio >= 4.5, `${theme} 月白狐 ${selector}: 实际对比度 ${ratio.toFixed(2)}`));
    for (const selector of ['[data-home-character="wenwen"]', '[data-home-character="moonfox"]', '[data-home-character="diyan"]', '.character-guide-link', '.character-footer']) {
      const text = await renderedTextContrast(page, selector);
      assert.ok(text.samples > 0 && text.ratio >= 4.5, `${theme} 月白狐 ${selector}: 背景文字对比度 ${text.ratio.toFixed(2)}`);
    }
    await page.click('.theme-toggle-home');
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'moonfox', '明暗模式不能覆盖首页角色');
    assert.equal(await page.$eval('html', el => el.dataset.theme), theme === 'light' ? 'dark' : 'light');
    await switchHome(page, 'wenwen');
    assert.equal(await page.$eval('.character-prop--lantern', el => el.hidden), false, '切回问问时应恢复天灯');
    assert.equal(await page.$eval('.character-btn-texture', el => el.getAttribute('href')), WENWEN.assets.cloudTrail.src);
    await context.close();
  }
  console.log('✓ 月白狐明暗主题与实景文字、按钮对比度，切回问问');

  // The sovereign is deliberately larger, while the natural fire remains behind him.
  for (const [index, [width, height]] of [[1440, 900], [1280, 720], [1024, 768], [901, 900], [768, 1024], [650, 844], [430, 932], [390, 844], [361, 844], [320, 844], [320, 568]].entries()) {
    const { page, context } = await newPage(width, height, { theme: index % 2 ? 'dark' : 'light' });
    const wenwenHeight = await page.$eval('#characterPortraitButton', el => el.getBoundingClientRect().height);
    await switchHome(page, 'moonfox');
    const foxHeight = await page.$eval('#characterPortraitButton', el => el.getBoundingClientRect().height);
    await switchHome(page, 'diyan');
    const state = await page.evaluate(() => {
      const scroll = document.querySelector('#page1 .p1-scroll');
      const portrait = document.getElementById('characterPortraitButton');
      const art = portrait.querySelector('[data-character-asset="portrait"]');
      const fire = document.querySelector('.character-fire-base');
      const holder = fire.closest('.character-prop');
      const anchor = document.querySelector('.character-flame-anchor');
      const scenery = document.querySelector('.character-scenery');
      const rect = portrait.getBoundingClientRect();
      const canvas = document.createElement('canvas'); canvas.width = art.naturalWidth; canvas.height = art.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(art, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let edgePixels = 0;
      for (let x = 0; x < canvas.width; x++) for (const y of [0, canvas.height - 1]) if (pixels[(y * canvas.width + x) * 4 + 3]) edgePixels++;
      for (let y = 0; y < canvas.height; y++) for (const x of [0, canvas.width - 1]) if (pixels[(y * canvas.width + x) * 4 + 3]) edgePixels++;
      const fireCanvas = document.createElement('canvas'); fireCanvas.width = fire.naturalWidth; fireCanvas.height = fire.naturalHeight;
      const fireCtx = fireCanvas.getContext('2d'); fireCtx.drawImage(fire, 0, 0);
      const corners = [[0, 0], [fire.naturalWidth - 1, 0], [0, fire.naturalHeight - 1], [fire.naturalWidth - 1, fire.naturalHeight - 1]]
        .map(([x, y]) => fireCtx.getImageData(x, y, 1, 1).data[3]);
      const x = rect.left + rect.width / 2, y = rect.top + rect.height * .43;
      return {
        scrollWidth: scroll.scrollWidth, clientWidth: scroll.clientWidth,
        portrait: rect.toJSON(), label: portrait.getAttribute('aria-label'), alt: art.alt,
        natural: [art.naturalWidth, art.naturalHeight], edgePixels,
        border: getComputedStyle(portrait).borderTopWidth, background: getComputedStyle(portrait).backgroundColor,
        anchor: anchor.getBoundingClientRect().toJSON(), fire: holder.getBoundingClientRect().toJSON(),
        fireNatural: [fire.naturalWidth, fire.naturalHeight], fireCorners: corners,
        fireHidden: holder.hidden || fire.hidden, firePointer: getComputedStyle(fire).pointerEvents,
        sceneryZ: getComputedStyle(scenery).zIndex, portraitZ: getComputedStyle(portrait).zIndex,
        centerHit: document.elementFromPoint(x, y)?.closest('button')?.id,
        room: document.querySelector('.character-backdrop img').currentSrc,
        lanternHidden: document.querySelector('.character-prop--lantern').hidden,
        cloudHidden: document.querySelector('.character-prop--cloud').hidden,
        heartDisplay: getComputedStyle(document.querySelector('.scene-heartlight')).display,
        expressions: [...portrait.querySelectorAll('.character-expression')].map(el => ({ src: el.currentSrc, hidden: el.hidden, natural: [el.naturalWidth, el.naturalHeight] })),
        menu: document.getElementById('homeMenuBtn').getBoundingClientRect().toJSON(),
        toggle: document.querySelector('.theme-toggle-home').getBoundingClientRect().toJSON(),
        switcher: document.querySelector('.character-theme-switcher').getBoundingClientRect().toJSON(),
        switches: [...document.querySelectorAll('[data-home-character]')].map(el => ({ pressed: el.getAttribute('aria-pressed'), rect: el.getBoundingClientRect().toJSON(), transition: getComputedStyle(el).transitionDuration })),
        buttons: [...document.querySelectorAll('.character-actions button')].map(el => el.getBoundingClientRect().toJSON()),
        texture: getComputedStyle(document.querySelector('.character-btn-texture')).visibility,
        avatar: document.querySelector('.character-dock-avatar').getAttribute('src'),
      };
    });
    assert.equal(state.scrollWidth, state.clientWidth, `${width}px: 地炎场景不能横向溢出`);
    assert.equal(state.label, '点击地炎君，开启探索');
    assert.match(state.alt, /地炎君.*权杖.*火焰王座/);
    assert.deepEqual(state.natural, [EARTHFIRE_SOVEREIGN.assets.portrait.width, EARTHFIRE_SOVEREIGN.assets.portrait.height]);
    assert.equal(state.edgePixels, 0, '地炎人物应完整透明、没有裁切边框');
    assert.equal(state.border, '0px');
    assert.equal(state.background, 'rgba(0, 0, 0, 0)');
    assert.ok(state.portrait.height > Math.max(wenwenHeight, foxHeight) + 10, `${width}px: 地炎人物应比前两个角色更大`);
    assert.ok(state.portrait.left >= 0 && state.portrait.right <= width && state.portrait.bottom <= state.buttons[0].top, `${width}px: 完整人物应在按钮上方`);
    assert.ok(state.buttons.every(rect => rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= width && rect.bottom <= height), `${width}px: 主要操作应在首屏`);
    assert.ok(state.menu.right <= state.switcher.left && state.switcher.right <= state.toggle.left, `${width}px: 主题切换不能遮挡两侧控制`);
    assert.ok(state.switches.every(({ rect }) => rect.width >= 44 && rect.height >= 44));
    assert.ok(state.switches.every(({ transition }) => transition === '0s'), '切换后当前主题标记应立即更新');
    assert.deepEqual(state.switches.map(el => el.pressed), ['false', 'false', 'true']);
    assert.ok(state.room.endsWith(`/earthfire-hall-${width / height <= 4 / 5 ? 'mobile' : 'wide'}.webp`));
    assert.deepEqual(state.fireNatural, [1124, 644]);
    assert.deepEqual(state.fireCorners, [0, 0, 0, 0], '火焰背景须透明无框');
    assert.equal(state.fireHidden, false);
    assert.equal(state.firePointer, 'none');
    assert.ok(Number(state.sceneryZ) < Number(state.portraitZ) && state.centerHit === 'characterPortraitButton', '座椅位于人物之后且不遮挡交互');
    assert.ok(Math.abs(state.anchor.left - state.portrait.left) < .5 && Math.abs(state.anchor.width - state.portrait.width) < .5, '火焰座椅锚点跟随人物');
    assert.ok(Math.abs(state.fire.width / state.portrait.width - 1.4) < .01, '火焰扶手应与人物坐姿相配');
    assert.equal(state.lanternHidden, true);
    assert.equal(state.cloudHidden, true);
    assert.equal(state.heartDisplay, 'none');
    assert.deepEqual(state.expressions.map(el => el.src), [new URL(EARTHFIRE_SOVEREIGN.assets.blink.src, BASE).href, new URL(EARTHFIRE_SOVEREIGN.assets.speaking.src, BASE).href]);
    assert.ok(state.expressions.every(el => !el.hidden && el.natural[0] === 625 && el.natural[1] === 1180));
    assert.equal(state.texture, 'hidden', '无祥云素材时仍保留祥云按钮轮廓');
    assert.equal(state.avatar, WENWEN.assets.avatar.src, '报告助手仍然是问问');
    await context.close();
  }
  console.log('✓ 地炎君大比例人物、自然火焰王座层级与十一种视口布局');

  for (const theme of ['light', 'dark']) {
    const { page, context } = await newPage(390, 844, { theme, homeTheme: 'diyan' });
    const contrast = await renderedButtonContrast(page, ['#homeCtaMain', '#homeCtaCal']);
    contrast.forEach(({ selector, ratio }) => assert.ok(ratio >= 4.5, `${theme} 地炎 ${selector}: 实际对比度 ${ratio.toFixed(2)}`));
    for (const selector of ['[data-home-character="wenwen"]', '[data-home-character="moonfox"]', '[data-home-character="diyan"]', '.character-guide-link', '.character-footer']) {
      const text = await renderedTextContrast(page, selector);
      assert.ok(text.samples > 0 && text.ratio >= 4.5, `${theme} 地炎 ${selector}: 背景文字对比度 ${text.ratio.toFixed(2)}`);
    }
    await page.click('.theme-toggle-home');
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'diyan');
    assert.equal(await page.$eval('html', el => el.dataset.theme), theme === 'light' ? 'dark' : 'light');
    await switchHome(page, 'moonfox');
    assert.equal(await page.$eval('.character-prop--fire', el => el.hidden), true, '切走后火焰座椅必须隐藏');
    await switchHome(page, 'wenwen');
    assert.equal(await page.$eval('.character-prop--lantern', el => el.hidden), false);
    await context.close();
  }
  console.log('✓ 地炎实景文字与祥云按钮对比度、明暗模式及配景隔离');

  {
    const { page, context } = await newPage(390, 844, { motion: 'no-preference', finePointer: true });
    const ax = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
    for (const name of ['问问主题', '月白狐主题', '地炎符文暴君主题']) {
      assert.ok(ax.nodes.some(node => !node.ignored && node.role?.value === 'button' && node.name?.value === name), `${name}: 主题按钮应可被辅助技术识别`);
    }
    await page.focus('[data-home-character="wenwen"]');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'moonfox');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.homeCharacter), 'moonfox');
    const expressionBounds = await page.$$eval('.character-expression', images => images.map(image => {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (pixels[(y * canvas.width + x) * 4 + 3] > 8) {
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
      return { left, top, right, bottom, width: canvas.width, height: canvas.height };
    }));
    assert.ok(expressionBounds.every(box => box.left > box.width * .33 && box.right < box.width * .5 && box.top > box.height * .1 && box.bottom < box.height * .18), '狐妖表情贴图只应覆盖自己的眼睛和嘴部');
    assert.equal(await page.$eval('.character-blink', el => getComputedStyle(el).animationName), 'character-blink');
    assert.equal(await page.$eval('.character-puppet', el => getComputedStyle(el, '::after').animationName), 'foxfire-breathe');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('tj:ai-stream', { detail: { active: true } })));
    assert.equal(await page.$eval('.character-speak', el => getComputedStyle(el).animationName), 'character-speaking');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.character-blink', el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.$eval('.character-speak', el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.$eval('.character-puppet', el => getComputedStyle(el, '::after').animationName), 'none');
    await page.focus('#characterPortraitButton');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#formModal.open');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'characterPortraitButton');
    await page.click('#homeCtaCal');
    await page.waitForSelector('#toolModal.open.cal-fullscreen');
    await page.evaluate(() => window.closeToolPage());
    const client = await page.createCDPSession();
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
    const forced = await page.$$eval('[data-home-character]', buttons => buttons.map(el => ({
      color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor,
    })));
    assert.notEqual(forced[0].background, forced[1].background, '强制颜色下仍应区分当前主题');
    assert.notEqual(forced[1].color, forced[1].background, '强制颜色下选中文字必须可读');
    await context.close();
  }
  console.log('✓ 角色选择键盘、无障碍、狐火动态及强制颜色');

  {
    const { page, context } = await newPage(390, 844, { motion: 'no-preference' });
    await page.focus('[data-home-character="moonfox"]');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'diyan');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.homeCharacter), 'diyan');
    assert.equal(await page.$eval('.character-fire-base', el => getComputedStyle(el).animationName), 'fire-seat-flicker');
    assert.equal(await page.$eval('.character-fire-glow', el => getComputedStyle(el).animationName), 'fire-seat-lift');
    assert.equal(await page.$eval('.character-scenery', el => getComputedStyle(el, '::before').animationName), 'embers-rise');
    const bounds = await page.$$eval('.character-expression', images => images.map(image => {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (pixels[(y * canvas.width + x) * 4 + 3] > 8) {
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
      return { left, top, right, bottom, width: canvas.width, height: canvas.height };
    }));
    assert.ok(bounds.every(box => box.left > box.width * .39 && box.right < box.width * .52 && box.top > box.height * .17 && box.bottom < box.height * .24), '地炎表情只能覆盖同源人物的眼睛和嘴部');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'wenwen');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.homeCharacter), 'wenwen', '方向键应在三个角色间循环');
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'diyan');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.character-fire-base', el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.$eval('.character-fire-glow', el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.$eval('.character-scenery', el => getComputedStyle(el, '::before').animationName), 'none');
    assert.equal(await page.$eval('.character-blink', el => getComputedStyle(el).animationName), 'none');
    const client = await page.createCDPSession();
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
    const forced = await page.$$eval('[data-home-character]', buttons => buttons.map(el => ({
      color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor,
    })));
    assert.notEqual(forced[0].background, forced[2].background, '强制颜色下仍应区分地炎主题');
    assert.notEqual(forced[2].color, forced[2].background, '强制颜色下选中文字必须可读');
    await context.close();
  }
  console.log('✓ 三主题方向键循环、地炎表情、火焰动画与减少动态');

  {
    const { page, context } = await newPage(390, 844);
    const other = await context.newPage();
    other.on('pageerror', error => errors.push(error.message));
    await other.setViewport({ width: 390, height: 844 });
    await other.goto(BASE, { waitUntil: 'domcontentloaded' });
    await other.waitForFunction(() => document.documentElement.dataset.homeReady === 'true');
    await switchHome(page, 'moonfox');
    assert.equal(await page.evaluate(() => localStorage.getItem('tj_home_character')), 'moonfox');
    await other.waitForFunction(() => document.documentElement.dataset.homeTheme === 'moonfox' && document.querySelector('[data-home-character="moonfox"]').getAttribute('aria-pressed') === 'true');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.homeReady === 'true' && document.querySelector('[data-character-asset="portrait"]').currentSrc.endsWith('/moon-fox.webp'));
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'moonfox', '刷新后应恢复用户选择');
    await switchHome(page, 'diyan');
    assert.equal(await page.evaluate(() => localStorage.getItem('tj_home_character')), 'diyan');
    await other.waitForFunction(() => document.documentElement.dataset.homeTheme === 'diyan' && document.querySelector('[data-home-character="diyan"]').getAttribute('aria-pressed') === 'true');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.homeReady === 'true' && document.querySelector('[data-character-asset="portrait"]').currentSrc.endsWith('/earthfire-sovereign.webp'));
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'diyan', '刷新后应恢复地炎主题');
    await switchHome(page, 'wenwen');
    await other.waitForFunction(() => document.documentElement.dataset.homeTheme === 'wenwen');
    await context.close();
  }
  console.log('✓ 首页主题记忆、刷新与跨标签同步');

  {
    const { page, context } = await newPage(390, 844, { homeTheme: 'unknown-theme' });
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'wenwen', '未知偏好应回退到问问');
    await context.close();

    const privateContext = await browser.createBrowserContext();
    const privatePage = await privateContext.newPage();
    privatePage.on('pageerror', error => errors.push(error.message));
    await privatePage.setViewport({ width: 390, height: 844 });
    await privatePage.evaluateOnNewDocument(() => {
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) { if (key === 'tj_home_character') throw new Error('storage blocked'); return get.call(this, key); };
      Storage.prototype.setItem = function (key, value) { if (key === 'tj_home_character') throw new Error('storage blocked'); return set.call(this, key, value); };
    });
    await privatePage.goto(BASE, { waitUntil: 'domcontentloaded' });
    await privatePage.waitForFunction(() => window._tools2Ready === true && document.documentElement.dataset.homeReady === 'true');
    await switchHome(privatePage, 'moonfox');
    assert.equal(await privatePage.$eval('html', el => el.dataset.homeTheme), 'moonfox', '存储受限时仍可在当前页面切换');
    await switchHome(privatePage, 'diyan');
    assert.equal(await privatePage.$eval('html', el => el.dataset.homeTheme), 'diyan', '存储受限时仍可选择地炎');
    await privateContext.close();
  }
  console.log('✓ 无效偏好与受限存储安全回退');

  {
    const { page, context } = await newPage(390, 844);
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/art/moon-fox')) setTimeout(() => request.continue().catch(() => {}), 350);
      else request.continue().catch(() => {});
    });
    await page.click('[data-home-character="moonfox"]');
    await page.waitForFunction(() => document.querySelector('.character-theme-switcher').getAttribute('aria-busy') === 'true');
    assert.equal(await page.evaluate(() => localStorage.getItem('tj_home_character')), 'moonfox', '加载素材时即应记住用户选择');
    await page.click('[data-home-character="wenwen"]');
    await new Promise(resolve => setTimeout(resolve, 700));
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'wenwen', '较慢的旧请求不能覆盖最后一次选择');
    assert.equal(await page.evaluate(() => localStorage.getItem('tj_home_character')), 'wenwen');
    await context.close();
  }
  {
    const { page, context } = await newPage(390, 844);
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/art/earthfire-')) setTimeout(() => request.continue().catch(() => {}), 350);
      else request.continue().catch(() => {});
    });
    await page.click('[data-home-character="diyan"]');
    await page.waitForFunction(() => document.querySelector('.character-theme-switcher').getAttribute('aria-busy') === 'true');
    assert.equal(await page.evaluate(() => localStorage.getItem('tj_home_character')), 'diyan');
    await switchHome(page, 'moonfox');
    await new Promise(resolve => setTimeout(resolve, 700));
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'moonfox', '较慢的地炎素材不能覆盖最后一次选择');
    assert.equal(await page.evaluate(() => localStorage.getItem('tj_home_character')), 'moonfox');
    assert.equal(await page.$eval('.character-prop--fire', el => el.hidden), true);
    await context.close();
  }
  console.log('✓ 连续切换不会被较慢的素材加载覆盖');

  // Cloud artwork is decorative; the actual buttons stay keyboard and high-contrast accessible.
  {
    const { page, context } = await newPage(390, 844);
    const ax = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
    for (const name of ['开启探索', '日历']) {
      assert.ok(ax.nodes.some(node => !node.ignored && node.role?.value === 'button' && node.name?.value === name), `${name}: 按钮应有简洁的无障碍名称`);
    }
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
    await page.focus('#homeCtaCal');
    await openToolAssistant(page);
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

  // Both providers receive the explicitly absent chart; even a greeting is not a canned home reply.
  for (const provider of ['deepseek', 'openrouter']) {
    const { page, context } = await newPage(1280, 720, { mock: true, key: 'test-key-only', provider, motion: 'no-preference' });
    await openToolAssistant(page);
    await page.waitForSelector('#aiSheet.open .ai-send', { visible: true });
    await page.type('#askInput', '你好');
    await page.click('#aiSheet .ai-send');
    assert.notEqual(await page.$eval('#characterScene', el => el.dataset.speaking), 'true', '等待模型时不应假装在说话');
    await page.waitForFunction(() => document.getElementById('characterScene').dataset.speaking === 'true', { timeout: 8000 });
    assert.equal(await page.$eval('.character-speak', el => getComputedStyle(el).animationName), 'character-speaking');
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
    assert.equal(await page.$eval('#characterScene', el => el.dataset.speaking), 'false');
    assert.deepEqual(await page.evaluate(() => window.__speakingEvents), [true, false]);
    assert.equal(await page.$eval('.chat-msg-ai .chat-avatar img', el => el.currentSrc), new URL(WENWEN.assets.avatar.src, BASE).href);
    if (provider === 'deepseek') {
      await page.click('.chat-actions [data-act="retry"]');
      assert.equal(await page.$eval('#aiSheet .ai-send', el => el.disabled), true, '重试也应防止并发发送');
      await waitForSend(page);
      assert.equal(await page.evaluate(() => window.__aiCalls.length), 2);
      assert.equal(await page.$$('.chat-msg-user').then(els => els.length), 1, '重试已有回答不能重复用户消息');
    }
    await context.close();
  }
  console.log('✓ 两个 AI 提供方的无命盘真实流式对话与嘴型状态');

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
    assert.equal(await page.$eval('#characterScene', el => el.dataset.speaking), 'false');
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
    await page.waitForFunction(() => document.getElementById('characterScene').dataset.speaking === 'true');
    assert.equal(await page.$eval('.character-blink', el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.$eval('.character-speak', el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.$eval('.character-speak', el => getComputedStyle(el).opacity), '0');
    await waitForSend(page);
    await context.close();
  }
  console.log('✓ 眨眼、指针视差和动态偏好实时切换');

  // Keep the report assistant and personalized tool calls connected to the existing engines.
  {
    const { page, context } = await newPage(390, 844, { mock: true, key: 'test-key-only' });
    await switchHome(page, 'moonfox');
    await page.click('#homeCtaMain');
    await page.waitForSelector('#formModal.open');
    await page.click('[data-style="rigorous"]');
    await page.click('#swTrueSolar');
    assert.equal(await page.$eval('#swTrueSolar', el => el.getAttribute('aria-checked')), 'true');
    await page.click('.character-form-submit');
    await page.waitForSelector('#page2.active #characterReportGuide', { timeout: 15000 });
    assert.equal(await page.$eval('#characterReportGuide', el => el.getAttribute('aria-label')), '问问的提示');
    assert.equal(await page.$eval('#characterReportGuide img', el => el.getAttribute('src')), WENWEN.assets.avatar.src, '报告仍使用真实问问助手');
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
    await page.waitForFunction(() => !!window._tjLiquidOrb, { timeout: 15000 });
    await page.click('#p2MenuBtn');
    await page.waitForSelector('#p2MenuDrawer.open');
    await page.click('#p2OrbBtn');
    await page.waitForSelector('#p2OrbPalette.open [data-key="violet"]', { visible: true });
    await page.click('#p2OrbPaletteGrid [data-key="violet"]');
    assert.equal(await page.evaluate(() => window._tjLiquidOrb.getColorKey()), 'violet');
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
    await page.waitForSelector('#page2.active #characterReportGuide', { timeout: 15000 });
    assert.equal(await page.$eval('#characterReportGuide', el => el.getAttribute('aria-label')), '问问的提示');
    assert.equal(await page.$eval('#characterReportGuide img', el => el.getAttribute('src')), WENWEN.assets.avatar.src);
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
    await page.evaluate(() => window.calc(true));
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
    await page.evaluate(() => window.calc(true));
    await page.waitForSelector('#page2.active');
    await page.click('#aiFab');
    await page.waitForSelector('#aiSheet.open .chat-msg-ai .chat-avatar img');
    assert.equal(await page.$eval('.chat-msg-ai .chat-bubble', el => el.textContent), '旧的回答');
    assert.equal(await page.$eval('.chat-msg-user .chat-avatar', el => el.textContent), '我');
    await context.close();
  }
  console.log('✓ 旧对话恢复与共享头像');

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
