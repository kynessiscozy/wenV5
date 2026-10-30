import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { spinFor } from './trait-picker-helper.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function newHome({ width = 390, height = 844, theme = 'light', trait = 'wenwen', scale = 1, mock = false, blockHeaderStorage = false } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${width}x${height}: ${error.message}`));
  await page.setViewport({ width, height, isMobile: width <= 650, hasTouch: width <= 650 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(({ theme, mock, blockHeaderStorage }) => {
    localStorage.setItem('tj_theme', theme);
    if (blockHeaderStorage) {
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) {
        if (key === 'tj_ai_header_collapsed') throw new Error('storage unavailable');
        return get.call(this, key);
      };
      Storage.prototype.setItem = function (key, value) {
        if (key === 'tj_ai_header_collapsed') throw new Error('storage unavailable');
        return set.call(this, key, value);
      };
    }
    if (!mock) return;
    localStorage.setItem('tj_ai_provider', 'deepseek');
    localStorage.setItem('tj_ai_apikey', 'test-key-only');
    window.__aiCalls = [];
    const realFetch = window.fetch.bind(window);
    window.fetch = (url, init = {}) => {
      if (!/^https:\/\/(api\.deepseek\.com|openrouter\.ai)\//.test(String(url))) return realFetch(url, init);
      if (init.method !== 'POST') return Promise.resolve(new Response('{}', { status: 200 }));
      window.__aiCalls.push(JSON.parse(init.body));
      const encoder = new TextEncoder();
      const chunk = text => encoder.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n');
      const stream = new ReadableStream({
        start(controller) {
          setTimeout(() => controller.enqueue(chunk('这是真实请求流程的测试回复。')), 250);
          setTimeout(() => { controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); }, 700);
        },
      });
      return Promise.resolve(new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
    };
  }, { theme, mock, blockHeaderStorage });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await chooseTrait(page, trait);
  await page.$eval('#aiSheet', (el, fontScale) => el.style.setProperty('--font-scale', String(fontScale)), scale);
  return { page, context };
}

async function chooseTrait(page, trait = 'wenwen') {
  await spinFor(page, trait);
  await page.waitForFunction(id => window._tools2Ready === true && document.documentElement.dataset.homeReady === 'true' &&
    document.documentElement.dataset.homeTheme === id && document.getElementById('traitSelection').hidden, { timeout: 15000 }, trait);
}

async function openHomeChat(page) {
  await page.evaluate(() => window.openAsk());
  await page.waitForSelector('#aiSheet.open');
  await delay(120); // Let the dialog's deliberate initial-focus timer finish.
}

async function openDemoReport(page) {
  await page.evaluate(() => { void window.calc(true); });
  await page.waitForFunction(() => document.getElementById('calculationOverlay')?.dataset.calculationState === 'ready', { timeout: 15000 });
  await page.click('#calculationContinue');
  await page.waitForSelector('#page2.active', { timeout: 15000 });
  await delay(600);
  await page.click('#aiFab');
  await page.waitForSelector('#aiSheet.open');
  await delay(120);
}

async function geometry(page) {
  return page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
    const controls = ['#aiSheet .ai-new', '#aiSheet .ai-settings', '#aiSheet .ai-close', '#aiHeaderToggle', '#askInput', '#aiSheet .ai-send'];
    const hit = controls.map(selector => {
      const el = document.querySelector(selector);
      const r = el.getBoundingClientRect();
      const target = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { selector, rect: r.toJSON(), reachable: target === el || el.contains(target) };
    });
    return { sheet: rect('#aiSheet'), body: rect('#askResult'), input: rect('#aiSheet .ai-input-row'),
      title: rect('#aiTitleText'), actions: rect('#aiSheet .ai-actions'), toggle: rect('#aiHeaderToggle'),
      conn: rect('#aiConnBar'), connText: rect('#aiConnBar .ai-conn-text'), connDot: rect('#aiConnBar .ai-conn-dot'), hit };
  });
}

function assertUsable(layout, width, height, label) {
  assert.ok(layout.body.height >= 45, `${label}: 消息区仍可滚动`);
  assert.ok(layout.input.bottom <= layout.sheet.bottom + 1 && layout.input.bottom <= height + 1, `${label}: 输入区必须完整可见`);
  assert.ok(layout.body.bottom <= layout.input.top + 1, `${label}: 消息区不能与输入区重叠`);
  assert.ok(layout.title.right <= layout.actions.left + 1 || layout.title.top >= layout.actions.bottom - 1, `${label}: 标题不能遮挡操作`);
  assert.ok(layout.toggle.right <= layout.sheet.right + 1 && layout.toggle.left >= layout.sheet.left - 1 &&
    layout.toggle.bottom <= layout.sheet.bottom + 1 && layout.toggle.width >= 24 && layout.toggle.height >= 24, `${label}: 折叠按钮不能被裁切`);
  for (const item of layout.hit) {
    assert.ok(item.rect.width > 0 && item.rect.height > 0 && item.reachable, `${label}: ${item.selector} 必须可点击`);
    assert.ok(item.rect.left >= 0 && item.rect.right <= width + 1 && item.rect.top >= 0 && item.rect.bottom <= height + 1,
      `${label}: ${item.selector} 必须位于视口内`);
  }
  assert.ok(layout.conn.width > 0 && layout.conn.height > 0, `${label}: 连接状态仍可见`);
  assert.ok(layout.connText.right <= layout.conn.right + 1 && layout.connDot.left >= layout.conn.left - 1, `${label}: 连接状态不能被挤出容器`);
  const overlaps = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  assert.ok(!overlaps(layout.connText, layout.actions) && !overlaps(layout.connText, layout.toggle) &&
    !overlaps(layout.connText, layout.title), `${label}: 连接状态不能遮住标题或操作`);
}

async function toggleContrast(page) {
  return page.$eval('#aiHeaderToggle', el => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    const rgba = color => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const luminance = color => color.slice(0, 3).map(value => (value /= 255) <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
    const style = getComputedStyle(el), foreground = rgba(style.color), background = rgba(style.backgroundColor);
    const a = luminance(foreground), b = luminance(background);
    return { ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), alpha: background[3] };
  });
}

async function assertToggleAX(page, name, expanded) {
  const ax = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
  const button = ax.nodes.find(node => !node.ignored && node.role?.value === 'button' && node.name?.value === name);
  assert.ok(button, `无障碍树应包含按钮“${name}”`);
  assert.equal(button.properties?.find(property => property.name === 'expanded')?.value?.value, expanded,
    `${name}应公布当前展开状态`);
}

try {
  // Verify focus, draft, a streamed answer and persistence in the actual home flow.
  {
    const { page, context } = await newHome({ mock: true });
    await openHomeChat(page);
    await page.waitForFunction(() => [...document.querySelectorAll('#aiSheet [data-master-portrait]')].every(image => image.complete && image.naturalWidth));
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-controls')), 'aiHero aiContext');
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'true');
    await assertToggleAX(page, '收起顶部', true);
    await page.type('#askInput', '折叠期间也要保留的问题');
    await page.focus('#aiHeaderToggle');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'aiHeaderToggle', '键盘折叠后保留焦点');
    assert.equal(await page.$eval('#askInput', el => el.value), '折叠期间也要保留的问题');
    assert.equal(await page.$eval('#aiHero', el => el.hidden && getComputedStyle(el).display === 'none'), true);
    assert.equal(await page.$eval('#aiContext', el => el.hidden), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('tj_ai_header_collapsed')), '1');
    await assertToggleAX(page, '展开顶部', false);
    await page.keyboard.press('Space');
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'true', '空格可重新展开');
    await page.keyboard.press('Enter');

    await page.click('#aiSheet .ai-send');
    await page.waitForFunction(() => window.__aiCalls.length === 1);
    await page.click('#aiHeaderToggle'); // Expand and collapse while a real streaming request is in progress.
    await page.click('#aiHeaderToggle');
    await page.waitForFunction(() => !document.querySelector('#aiSheet .ai-send').disabled &&
      document.querySelector('#askResult')?.textContent.includes('这是真实请求流程的测试回复。'), { timeout: 12000 });
    assert.match(await page.$eval('#askResult', el => el.textContent), /折叠期间也要保留的问题/);
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'false');

    // Reading older messages stays put; a reader already at the bottom stays there.
    await page.evaluate(() => {
      const body = document.getElementById('askResult');
      const filler = document.createElement('div');
      filler.id = 'test-scroll-filler'; filler.style.height = '2200px';
      body.prepend(filler); body.scrollTop = 200;
    });
    const oldScroll = await page.$eval('#askResult', el => el.scrollTop);
    await page.click('#aiHeaderToggle');
    assert.ok(Math.abs(await page.$eval('#askResult', el => el.scrollTop) - oldScroll) < 2, '阅读旧消息时不跳到最新消息');
    await page.$eval('#askResult', el => { el.scrollTop = el.scrollHeight; });
    await page.click('#aiHeaderToggle');
    assert.ok(await page.$eval('#askResult', el => el.scrollHeight - el.clientHeight - el.scrollTop) < 2, '已在底部时保持底部');
    await page.$eval('#test-scroll-filler', el => el.remove());

    await page.type('#askInput', '关闭后仍在的草稿');
    await page.click('#aiSheet .ai-close');
    await openHomeChat(page);
    assert.equal(await page.$eval('#askInput', el => el.value), '关闭后仍在的草稿');
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'false');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await chooseTrait(page);
    await openHomeChat(page);
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'false', '刷新后记住收起状态');
    assert.equal(await page.$eval('#askInput', el => el.value), '关闭后仍在的草稿', '刷新后保留原草稿');
    assert.deepEqual(await page.$$eval('#aiSheet [data-master-portrait]', images => images.map(image => image.getAttribute('src'))), [null, null],
      '默认收起时不必提前加载顶部插画');
    await page.click('#aiHeaderToggle');
    await page.waitForFunction(() => [...document.querySelectorAll('#aiSheet [data-master-portrait]')].every(image => image.complete && image.naturalWidth));
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'true');
    assert.equal(await page.evaluate(() => localStorage.getItem('tj_ai_header_collapsed')), '0');
    await context.close();
  }
  console.log('✓ 首页键盘折叠、流式对话、滚动位置、草稿及刷新记忆');

  // Different traits, dark mode, narrow/short screens and large text. The
  // compact landscape header must actually give space back to messages.
  for (const options of [
    { width: 390, height: 844, trait: 'wenwen' },
    { width: 320, height: 568, trait: 'moonfox', theme: 'dark', scale: 1.4 },
    { width: 320, height: 400, trait: 'diyan', scale: 1.4 },
    { width: 410, height: 320, trait: 'yuchen', theme: 'dark', scale: 1.4 },
    { width: 519, height: 320, trait: 'qinglan', scale: 1.4 },
    { width: 520, height: 320, trait: 'luye', theme: 'dark', scale: 1.4 },
    { width: 568, height: 320, trait: 'xingling', theme: 'dark', scale: 1.4 },
    { width: 1440, height: 900, trait: 'suyan' },
    { width: 390, height: 844, trait: 'rongrong', theme: 'dark' },
    { width: 320, height: 568, trait: 'zhiya', scale: 1.4 },
  ]) {
    const { page, context } = await newHome(options);
    await openHomeChat(page);
    const before = await geometry(page);
    assertUsable(before, options.width, options.height, '展开');
    const contrast = await toggleContrast(page);
    assert.ok(contrast.alpha === 255 && contrast.ratio >= 4.5, `${options.trait}: 折叠按钮文字对比度应达到 4.5:1`);
    await page.click('#aiHeaderToggle');
    const after = await geometry(page);
    assertUsable(after, options.width, options.height, '收起');
    assert.ok(after.body.height > before.body.height + 7, `${options.width}x${options.height}: 收起应扩大消息区 (${before.body.height} → ${after.body.height})`);
    assert.equal(await page.$eval('#aiHero', el => getComputedStyle(el).display), 'none');
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'false');
    await assertToggleAX(page, '展开顶部', false); // Includes the icon-only narrow layout.
    if (options.width === 520) {
      await page.$eval('#aiConnModel', el => { el.textContent = '一个很长很长的模型名称用于测试溢出'; });
      assertUsable(await geometry(page), options.width, options.height, '长模型名称');
      assert.equal(await page.$eval('#aiConnModel', el => el.scrollWidth > el.clientWidth), true, '长模型名称应截断而非挤出连接状态');
    }
    if (options.width === 320 && options.height === 400) {
      await page.type('#askInput', '没有密钥也要保留草稿');
      await page.click('#aiSheet .ai-send');
      await page.waitForSelector('.chat-home-error');
      assert.equal(await page.$eval('#askInput', el => el.value), '没有密钥也要保留草稿');
      assert.equal(await page.$$('.chat-msg-ai').then(items => items.length), 0, '未配置时不能伪造回复');
    }
    await page.click('#aiHeaderToggle');
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'true');
    await context.close();
  }
  console.log('✓ 多特质、深色、小屏、横屏和大字号均能节省消息空间');

  {
    const { page, context } = await newHome({ blockHeaderStorage: true });
    await openHomeChat(page);
    await page.click('#aiHeaderToggle');
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'false', '存储不可用时仍能折叠');
    await page.click('#aiHeaderToggle');
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'true', '存储不可用时仍能展开');
    await context.close();
  }
  console.log('✓ 偏好存储不可用时仍可正常切换');

  // A report keeps its basis controls and updates the hidden summary. Settings
  // and close remain functional, including after the compact responsive layout.
  for (const options of [
    { width: 390, height: 844, trait: 'wenwen' },
    { width: 320, height: 400, trait: 'moonfox', theme: 'dark', scale: 1.4 },
    { width: 568, height: 320, trait: 'diyan', scale: 1.4 },
  ]) {
    const { page, context } = await newHome(options);
    await openDemoReport(page);
    const before = await geometry(page);
    await page.click('#aiHeaderToggle');
    const after = await geometry(page);
    assertUsable(after, options.width, options.height, '报告收起');
    assert.ok(after.body.height > before.body.height + 7, '报告收起后应扩大消息区');
    assert.equal(await page.$eval('#aiContext', el => el.hidden && getComputedStyle(el).display === 'none'), true);
    await page.click('#aiBasisWestern');
    assert.equal(await page.$eval('#aiBasisWestern', el => el.getAttribute('aria-checked')), 'true');
    assert.match(await page.$eval('#aiContext', el => el.textContent), /西方星相/);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.$eval('#aiBasisEastern', el => el.getAttribute('aria-checked')), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'aiBasisEastern');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.$eval('#aiBasisWestern', el => el.getAttribute('aria-checked')), 'true');
    await page.click('#aiSheet .ai-settings');
    await page.waitForSelector('#aiSettingsModal.open');
    assert.equal(await page.$eval('#aiSheet', el => el.inert), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#aiSheet', el => el.inert), false);
    assert.equal(await page.$eval('#aiHeaderToggle', el => el.getAttribute('aria-expanded')), 'false');
    await page.click('#aiHeaderToggle');
    assert.equal(await page.$eval('#aiContext', el => el.hidden), false);
    assert.match(await page.$eval('#aiContext', el => el.textContent), /西方星相/, '展开后显示当前依据，不恢复过时摘要');
    if (options.height > 360) assert.notEqual(await page.$eval('#aiContext', el => getComputedStyle(el).display), 'none');
    await page.click('#aiSheet .ai-close');
    assert.equal(await page.$eval('#page2', el => el.inert), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'aiFab');
    await context.close();
  }
  console.log('✓ 报告依据切换、隐藏摘要更新、设置和焦点恢复');
  assert.deepEqual(errors, [], '不应产生未捕获的页面异常');
} finally {
  await browser.close();
}
