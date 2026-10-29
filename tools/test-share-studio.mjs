import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { spinFor } from './trait-picker-helper.mjs';
import { HOME_THEMES } from '../src/ui/home-theme.js';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];

async function openReport(page, id) {
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => {
    window.__posterText = [];
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
      if (this.canvas.width === 1080 && [1080, 1350].includes(this.canvas.height)) window.__posterText.push(String(text));
      return draw.call(this, text, ...args);
    };
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => !!data.files?.length });
    Object.defineProperty(navigator, 'share', { configurable: true, value: data => {
      window.__shareCall = { title: data.title, files: data.files.map(file => ({ name: file.name, type: file.type, size: file.size })),
        activated: navigator.userActivation?.isActive };
      return window.__abortShare ? Promise.reject(new DOMException('Cancelled', 'AbortError')) : Promise.resolve();
    }});
    window.ClipboardItem = class { constructor(items) { this.items = items; } };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write(items) {
      window.__copiedType = Object.keys(items[0].items)[0];
      return window.__failCopy ? Promise.reject(new Error('denied')) : Promise.resolve();
    }}});
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window._tools2Ready && document.getElementById('traitMachine')?.dataset.ready === 'true');
  await spinFor(page, id);
  await page.waitForFunction(() => document.getElementById('traitSelection').hidden);
  await page.click('#homeCtaMain');
  await page.waitForSelector('#formModal.open');
  await page.$eval('#bDate', el => { el.value = '1989-03-29'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.$eval('#bTime', el => { el.value = '11:23'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('.character-form-submit');
  await page.waitForFunction(() => document.getElementById('calculationOverlay')?.dataset.calculationState === 'ready');
  await page.click('#calculationContinue');
  await page.waitForFunction(() => document.body.classList.contains('report-active'));
}

async function openPoster(page) {
  await page.evaluate(() => { window.__posterText = []; });
  await page.click('#p2ShareBtn');
  await page.waitForSelector('#shareStudio .share-studio-image', { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('#shareStudio .share-studio-preview')?.getAttribute('aria-busy') === 'false');
}

async function waitForNewPoster(page, oldSrc) {
  await page.waitForFunction(old => {
    const image = document.querySelector('#shareStudio .share-studio-image');
    return image?.src !== old && image?.naturalWidth === 1080 && document.querySelector('.share-studio-preview').getAttribute('aria-busy') === 'false';
  }, { timeout: 15000 }, oldSrc);
}

try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await openReport(page, 'qinglan');
  await openPoster(page);
  assert.equal(await page.$eval('#page2', el => el.hasAttribute('inert')), true, '弹窗期间报告不可误触');
  assert.equal(await page.$eval('#shareStudio [role="dialog"]', el => el.getAttribute('aria-modal')), 'true');
  assert.equal(await page.$eval('#shareStudio .share-studio-image', el => el.naturalHeight), 1350);
  const initial = await page.evaluate(() => ({ text: window.__posterText.slice(), day: window._ctx.dg + window._ctx.dw, useful: window._ctx.wx.ys,
    active: document.activeElement.className, input: window._ctx.input, city: window._ctx.city.n }));
  assert.ok(initial.text.includes('洒脱') && initial.text.includes(initial.day) && initial.text.includes(initial.useful), '海报应取所选特质和真实结果');
  assert.equal(initial.active, 'share-studio-close');
  for (const secret of ['1989', '11:23', initial.city, '青岚']) assert.ok(!initial.text.some(line => line.includes(secret)), `海报不能泄露 ${secret}`);

  await page.click('#shareStudio .share-studio-share');
  const shared = await page.evaluate(() => window.__shareCall);
  assert.equal(shared.files.length, 1);
  assert.equal(shared.files[0].type, 'image/png');
  assert.ok(shared.files[0].size > 50000 && shared.files[0].name === '问问大师_同行海报.png');
  assert.equal(shared.activated, true, '原生分享必须在用户点击激活期间调用');
  await page.click('#shareStudio .share-studio-copy');
  await page.waitForFunction(() => window.__copiedType === 'image/png');
  assert.match(await page.$eval('.share-studio-status', el => el.textContent), /已复制/);
  await page.evaluate(() => { window.__failCopy = true; window.__abortShare = true; });
  await page.click('#shareStudio .share-studio-copy');
  await page.waitForFunction(() => document.querySelector('.share-studio-status')?.textContent.includes('未能复制'));
  await page.click('#shareStudio .share-studio-share');
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(await page.$eval('.share-studio-status', el => el.textContent.includes('分享完成')), false, '取消分享不是成功');
  await page.evaluate(() => {
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() { window.__download = { name: this.download, href: this.href }; };
    window.__restoreAnchor = () => { HTMLAnchorElement.prototype.click = original; };
  });
  await page.click('#shareStudio .share-studio-save');
  assert.deepEqual(await page.evaluate(() => ({ name: window.__download.name, isBlob: window.__download.href.startsWith('blob:') })),
    { name: '问问大师_同行海报.png', isBlob: true });
  await page.evaluate(() => window.__restoreAnchor());

  let old = await page.$eval('#shareStudio .share-studio-image', el => el.src);
  await page.evaluate(() => { window.__posterText = []; });
  await page.click('#shareStudio [data-format="square"]');
  await waitForNewPoster(page, old);
  assert.equal(await page.$eval('#shareStudio .share-studio-image', el => el.naturalHeight), 1080, '方形需生成真正的方图而不是裁剪预览');
  old = await page.$eval('#shareStudio .share-studio-image', el => el.src);
  await page.evaluate(() => { window.__posterText = []; });
  await page.click('#shareStudio [data-system="western"]');
  await waitForNewPoster(page, old);
  const west = await page.evaluate(() => ({ text: window.__posterText, sun: window.__w3dData.horo.sunName, moon: window.__w3dData.astro.moon.name }));
  assert.ok(west.text.includes(west.sun) && west.text.includes(west.moon), '西方摘要使用真实星盘');
  old = await page.$eval('#shareStudio .share-studio-image', el => el.src);
  await page.evaluate(() => { window.__posterText = []; });
  await page.click('#shareStudio .share-studio-check');
  await waitForNewPoster(page, old);
  assert.equal(await page.evaluate(() => window.__posterText.includes('太阳') || window.__posterText.includes('月亮')), false, '关闭摘要后不绘制结果');

  // Only the most recent render may become the downloadable image.
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    let count = 0;
    HTMLCanvasElement.prototype.toBlob = function(cb, ...args) {
      const delay = count++ === 0 ? 450 : 10;
      window.__blobCount = count;
      return original.call(this, blob => setTimeout(() => cb(blob), delay), ...args);
    };
    window.__restoreBlob = () => { HTMLCanvasElement.prototype.toBlob = original; };
  });
  await page.click('#shareStudio [data-format="portrait"]');
  await page.waitForFunction(() => window.__blobCount >= 1);
  await page.click('#shareStudio [data-format="square"]');
  await page.waitForFunction(() => document.querySelector('#shareStudio .share-studio-image')?.naturalHeight === 1080);
  await new Promise(resolve => setTimeout(resolve, 550));
  assert.equal(await page.$eval('#shareStudio .share-studio-image', el => el.naturalHeight), 1080, '旧绘制不能覆盖新选择');
  await page.evaluate(() => window.__restoreBlob());
  await page.keyboard.press('Escape');
  assert.equal(await page.$('#shareStudio'), null);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'p2ShareBtn');
  assert.equal(await page.$eval('#page2', el => el.hasAttribute('inert')), false);
  console.log('✓ 真实摘要、隐私、方图、取消、原生分享、保存、复制、竞态与焦点');

  // Every real selection produces its own portrait and trait, without a new
  // calculation or exposing the character's internal name.
  const colors = new Set();
  for (const [id, theme] of Object.entries(HOME_THEMES)) {
    if (id !== 'qinglan' || await page.$eval('html', el => el.dataset.homeTheme) !== id) {
      await page.click('#reportTraitReselect');
      await spinFor(page, id);
      await page.waitForFunction(expected => document.getElementById('traitSelection').hidden &&
        document.getElementById('characterResultHero')?.dataset.reportCharacter === expected, {}, id);
    }
    await openPoster(page);
    const got = await page.evaluate(() => {
      const image = document.querySelector('#shareStudio .share-studio-image');
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const g = canvas.getContext('2d'); g.drawImage(image, 5, 5, 1, 1, 0, 0, 1, 1);
      return { text: window.__posterText, pixel: [...g.getImageData(0, 0, 1, 1).data].join(',') };
    });
    assert.ok(got.text.includes(theme.trait.label), `${id} 海报应展示自己的特质`);
    assert.ok(!got.text.includes(theme.character.name), `${id} 海报不应显示人物名`);
    colors.add(got.pixel);
    await page.click('#shareStudio .share-studio-close');
  }
  assert.ok(colors.size >= 7, '八种人物的海报底色和场景应各有区别');
  console.log('✓ 八种真实特质的角色海报、真实数据及角色重选');

  // Contextual entries should use the already-rendered daily/week data.
  for (const [kind, expected] of [['today', ['宜', '忌']], ['week', ['相对顺利', '多留余量']], ['year', ['事业', '财运']]]) {
    await page.evaluate(k => { window.__posterText = []; window.openPosterShare(k); }, kind);
    await page.waitForSelector('#shareStudio .share-studio-image', { timeout: 15000 });
    const words = await page.evaluate(() => window.__posterText);
    assert.ok(expected.every(word => words.includes(word)), `${kind}: 海报使用对应内容而不是空数据`);
    assert.equal(await page.$eval('.share-studio-system-field', el => el.hidden), true);
    await page.click('#shareStudio .share-studio-close');
  }
  console.log('✓ 今日、本周和当年入口保留各自真实结果');

  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback) { callback(null); };
    window.__restoreBlob = () => { HTMLCanvasElement.prototype.toBlob = original; };
  });
  await page.click('#p2ShareBtn');
  await page.waitForSelector('#shareStudio .share-studio-retry');
  assert.equal(await page.$eval('#shareStudio .share-studio-save', el => el.disabled), true, '生成失败时不能导出旧图片');
  await page.evaluate(() => window.__restoreBlob());
  await page.click('#shareStudio .share-studio-retry');
  await page.waitForSelector('#shareStudio .share-studio-image');
  await page.click('#shareStudio .share-studio-close');
  console.log('✓ 图片生成失败后可重试');

  // The primary actions remain reachable in compact mobile and landscape
  // viewports, and keyboard focus stays inside the preview until it closes.
  for (const [width, height] of [[320, 568], [390, 844], [568, 320], [768, 1024]]) {
    await page.setViewport({ width, height, isMobile: true, hasTouch: true });
    await openPoster(page);
    const layout = await page.evaluate(() => {
      const sheet = document.querySelector('.share-studio-sheet').getBoundingClientRect();
      const save = document.querySelector('.share-studio-save').getBoundingClientRect();
      return { top: sheet.top, bottom: sheet.bottom, saveTop: save.top, saveBottom: save.bottom,
        scrollWidth: document.querySelector('.share-studio').scrollWidth, screenWidth: innerWidth };
    });
    assert.ok(layout.top >= 0 && layout.bottom <= height + 1 && layout.saveTop >= 0 && layout.saveBottom <= height,
      `${width}×${height}: 关闭与保存操作必须始终在可见视口内`);
    assert.ok(layout.scrollWidth <= layout.screenWidth, '分享面板不能横向溢出');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.querySelector('#shareStudio').contains(document.activeElement)), true);
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
    assert.equal(await page.evaluate(() => document.querySelector('#shareStudio').contains(document.activeElement)), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'p2ShareBtn');
  }
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  console.log('✓ 手机、平板及短横屏保留可见的保存操作和键盘焦点');

  // Existing tool cards use the same explicit preview, rather than silently
  // attempting to share or copy as soon as the card is generated.
  await page.evaluate(() => window.openToolPage('daily'));
  await page.waitForSelector('#twYShare', { timeout: 15000 });
  await page.click('#twYShare');
  await page.waitForSelector('#shareStudio .share-studio-image', { timeout: 15000 });
  assert.equal(await page.$eval('#shareStudioTitle', el => el.textContent), '分享结果');
  assert.equal(await page.$eval('.share-studio-poster-controls', el => el.hidden), true);
  await page.click('#shareStudio .share-studio-close');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'twYShare', '关闭后返回原工具操作');
  console.log('✓ 工具结果也使用统一预览和导出流程');

  assert.deepEqual(errors, [], '分享过程不能产生未捕获异常');
} finally {
  await browser.close();
}
