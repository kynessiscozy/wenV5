import { spinFor } from './trait-picker-helper.mjs';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import puppeteer from 'puppeteer';
import { HOME_THEMES } from '../src/ui/home-theme.js';

// Production build, including the non-root deployment used by the offline test.
const root = resolve('dist');
const builtHtml = await readFile(resolve(root, 'index.html'), 'utf8');
const eagerModules = builtHtml.match(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/g) || [];
assert.ok(eagerModules.every(link => !/\/engines-[^/]+\.js/.test(link)), '首屏不能预加载完整推演引擎');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!pathname.startsWith('/demo/')) return response.writeHead(404).end();
  const file = resolve(root, pathname.slice('/demo/'.length) || 'index.html');
  if (!file.startsWith(root + sep)) return response.writeHead(403).end();
  try {
    const data = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600',
    }).end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/demo/`;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

function gateRequests(page, shouldHold) {
  const held = [];
  const seen = [];
  const external = [];
  let released = false;
  page.on('request', request => {
    const url = request.url();
    seen.push(url);
    if (url.startsWith('http') && !url.startsWith(base)) {
      external.push(url);
      request.abort().catch(() => {});
    } else if (!released && shouldHold(url)) held.push(request);
    else request.continue().catch(() => {});
  });
  return {
    held, seen, external,
    async release() {
      released = true;
      await Promise.all(held.splice(0).map(request => request.continue().catch(() => {})));
    },
  };
}

async function waitForHeld(gate, part) {
  const until = Date.now() + 5000;
  while (!gate.held.some(request => request.url().includes(part))) {
    if (Date.now() > until) throw new Error(`Expected held request: ${part}`);
    await new Promise(done => setTimeout(done, 20));
  }
}

async function openContext(homeTheme = 'wenwen') {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  // Network gates must observe requests rather than a service worker's cache.
  await page.setBypassServiceWorker(true);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(theme => {
    localStorage.setItem('tj_theme', 'light');
    localStorage.setItem('tj_home_character', theme);
  }, homeTheme);
  return { page, context, errors };
}

async function choose(page, id) {
  await page.waitForSelector('#traitMachine[data-ready="true"]', { timeout: 15000 });
  await spinFor(page, id);
  const theme = HOME_THEMES[id];
  await page.waitForFunction((role, portrait, room) => {
    const p = document.querySelector('[data-character-asset="portrait"]');
    const b = document.querySelector('.character-backdrop img');
    return document.documentElement.dataset.homeTheme === role && document.getElementById('traitSelection').hidden &&
      p.complete && p.naturalWidth > 0 && p.currentSrc.endsWith(portrait.replace('./', '/')) &&
      b.complete && b.naturalWidth > 0 && b.currentSrc.endsWith(room.replace('./', '/'));
  }, { timeout: 15000 }, id, theme.character.assets.portrait.src, theme.backdrop.mobile);
}

try {
  // A stalled entry module gets a helpful message rather than a silent spinner,
  // and still recovers if the module eventually arrives.
  {
    const { page, context, errors } = await openContext();
    await page.evaluateOnNewDocument(() => {
      const original = window.setTimeout.bind(window);
      window.setTimeout = (callback, delay, ...args) => original(callback, delay === 12000 ? 120 : delay, ...args);
    });
    await page.setRequestInterception(true);
    const gate = gateRequests(page, url => /\/assets\/index-[^/]+\.js(?:\?|$)/.test(url));
    const navigation = page.goto(base, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForHeld(gate, '/assets/index-');
    await page.waitForFunction(() => document.querySelector('#traitStatus')?.textContent.includes('请检查网络'), { timeout: 5000 });
    assert.equal(await page.$eval('#traitSelection', el => el.hidden), false);
    assert.equal(await page.$$eval('#traitSpin, #traitLever', buttons => buttons.every(button => button.disabled)), true, '模块未就绪时不能触发无效转动');
    await gate.release();
    await navigation;
    await page.waitForSelector('#traitMachine[data-ready="true"]', { timeout: 15000 });
    assert.equal(await page.$eval('#traitSpin', el => el.disabled), false, '入口加载完成后可以转动');
    assert.equal(await page.$eval('#traitStatus', el => el.textContent), '');
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('✓ 首屏入口加载缓慢时提示并可恢复');

  // Only the selected role is downloaded, and its registry owns the sources.
  for (const [id, theme] of Object.entries(HOME_THEMES)) {
    const { page, context, errors } = await openContext(id);
    await page.setRequestInterception(true);
    const gate = gateRequests(page, () => false);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#traitMachine[data-ready="true"]');
    const portraits = Object.values(HOME_THEMES).map(item => item.character.assets.portrait.src.split('/').at(-1));
    assert.ok(!gate.seen.some(url => portraits.some(file => url.endsWith('/' + file))), '选择之前不应下载人物主图');
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), undefined, '旧存储不能使角色预先选定');
    await choose(page, id);
    assert.ok(!gate.seen.some(url => url.includes('/master-twin-')), '首页选择完成前不应下载双子对话素材');
    const loaded = await page.evaluate(() => ({
      src: document.querySelector('[data-character-asset="portrait"]').getAttribute('src'),
      alt: document.querySelector('[data-character-asset="portrait"]').alt,
      width: document.querySelector('[data-character-asset="portrait"]').naturalWidth,
      height: document.querySelector('[data-character-asset="portrait"]').naturalHeight,
      shot: document.getElementById('characterScene').dataset.cameraShot,
    }));
    assert.equal(loaded.src, theme.character.assets.portrait.src);
    assert.equal(loaded.alt, theme.character.assets.portrait.alt.replace(theme.character.name, `${theme.trait.label}特质同行`));
    assert.ok(!loaded.alt.includes(theme.character.name), '图片加载失败时的备用文案也不应显示角色名');
    assert.equal(loaded.width, theme.character.assets.portrait.width);
    assert.equal(loaded.height, theme.character.assets.portrait.height);
    assert.equal(loaded.shot, 'close');
    assert.ok(!gate.seen.some(url => portraits.filter(file => file !== theme.character.assets.portrait.src.split('/').at(-1)).some(file => url.endsWith('/' + file))), '不应下载未选择的角色主图');
    assert.equal(gate.seen.some(url => /awakening-(scroll|fox-fan|phoenix-wing)\.webp/.test(url)), false, '推演道具不参与首屏');
    assert.ok(!gate.external.some(url => /font|woff|\.ttf/i.test(url)), '首屏不能依赖外部字体');
    if (id === 'wenwen') {
      await page.evaluate(() => window.openAsk());
      await page.waitForSelector('#aiSheet.open');
      await page.waitForFunction(() => [...document.querySelectorAll('#aiSheet [data-master-portrait]')].every(image => image.complete && image.naturalWidth > 0));
      assert.deepEqual(await page.$$eval('#aiSheet [data-master-portrait]', images => images.map(image => new URL(image.currentSrc).pathname)),
        ['/demo/art/master-twin-indigo.webp', '/demo/art/master-twin-rose.webp'], '生产子路径中首次打开对话才加载双子');
      assert.equal(await page.$eval('#aiSheet .ai-master-twin', el => getComputedStyle(el).display), 'block');
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('✓ 选择后才按注册表加载对应人物和场景');

  // Hold the big report engines: trait selection and the scene must remain
  // usable, and an early exploration tap must be replayed after loading.
  {
    const { page, context, errors } = await openContext('yuchen');
    await page.setRequestInterception(true);
    const gate = gateRequests(page, url => /\/assets\/engines-[^/]+\.js(?:\?|$)/.test(url));
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForHeld(gate, '/assets/engines-');
    await choose(page, 'yuchen');
    assert.equal(await page.evaluate(() => typeof window.TJOpenForm), 'undefined');
    assert.equal(gate.seen.some(url => /\/(wenwen-cinema3d\.webp|sacred-study-(wide|mobile)\.webp|wenwen-lantern\.webp)(?:\?|$)/.test(url)), false);
    assert.deepEqual(gate.external, []);
    assert.equal(await page.$eval('#calculationOverlay', el => el.hidden), true);
    await page.click('#homeCtaMain');
    assert.equal(await page.$eval('#homeCtaMain', el => el.getAttribute('aria-busy')), 'true');
    assert.match(await page.$eval('#homeCtaMain', el => el.textContent), /加载中/);
    await gate.release();
    await page.waitForSelector('#formModal.open', { timeout: 15000 });
    assert.match(await page.$eval('#homeCtaMain', el => el.textContent), /开启探索/);
    assert.equal(await page.$eval('#homeCtaMain', el => el.hasAttribute('aria-busy')), false);
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('✓ 主程序慢时可选特质、显示人物并保留提前点击');

  // Calendar loading is explicit and can take longer than two seconds.
  {
    const { page, context, errors } = await openContext();
    await page.setRequestInterception(true);
    const engines = [], tools = [];
    let releaseEngines = false, releaseTools = false;
    page.on('request', request => {
      const url = request.url();
      if (/\/assets\/engines-[^/]+\.js(?:\?|$)/.test(url) && !releaseEngines) engines.push(request);
      else if (/\/assets\/tools2-[^/]+\.js(?:\?|$)/.test(url) && !releaseTools) tools.push(request);
      else if (url.startsWith('http') && !url.startsWith(base)) request.abort().catch(() => {});
      else request.continue().catch(() => {});
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await choose(page, 'wenwen');
    await page.click('#homeCtaCal');
    assert.match(await page.$eval('#homeCtaCal', el => el.textContent), /加载中/);
    releaseEngines = true;
    await Promise.all(engines.splice(0).map(request => request.continue().catch(() => {})));
    const limit = Date.now() + 10000;
    while (!tools.length) {
      if (Date.now() > limit) throw new Error('点击日历后应立即请求工具模块');
      await new Promise(done => setTimeout(done, 20));
    }
    await new Promise(done => setTimeout(done, 2200));
    assert.equal(await page.$eval('#homeCtaCal', el => el.getAttribute('aria-busy')), 'true');
    releaseTools = true;
    await Promise.all(tools.splice(0).map(request => request.continue().catch(() => {})));
    await page.waitForSelector('#toolModal.open.cal-fullscreen', { timeout: 15000 });
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('✓ 日历按需加载，慢于两秒也不会丢失点击');

  // The legacy wealth/layoff fallbacks must remain usable while tools2 is
  // loading. Other tool types have always delegated rather than rendering the
  // unreachable legacy forms that used to follow that delegation.
  {
    const { page, context, errors } = await openContext();
    await page.setRequestInterception(true);
    const gate = gateRequests(page, url => /\/assets\/tools2-[^/]+\.js(?:\?|$)/.test(url));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.runWealthTool === 'function', { timeout: 15000 });
    await waitForHeld(gate, '/assets/tools2-');
    assert.notEqual(await page.evaluate(() => window._tools2Ready), true);
    await page.evaluate(() => {
      window._ctx = { ws: 75, cs: 60, dg: '甲', dw: '木', wx: { st: false, ys: '木' } };
      window.openToolPage('wealth');
      document.getElementById('wealthIncome').value = '6000';
      document.getElementById('wealthCost').value = '2000';
      document.getElementById('wealthCash').value = '12000';
      window.runWealthTool();
    });
    assert.match(await page.$eval('#toolModalContent', el => el.textContent), /每月结余/);
    await page.evaluate(() => { window.openToolPage('layoff'); window.runLayoffTool(); });
    assert.match(await page.$eval('#toolModalContent', el => el.textContent), /综合预警/);
    await page.evaluate(() => window.openToolPage('career'));
    assert.match(await page.$eval('#toolModalContent', el => el.textContent), /工具加载中/);
    await gate.release();
    await page.waitForFunction(() => window._tools2Ready === true &&
      document.querySelector('#toolModalContent.tw-tool-career .tw-mast-title')?.textContent.includes('事业大师'), { timeout: 15000 });
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('✓ 旧工具兜底及新版工具加载交接正常');

  // Optional fire layers and expression images must not block a role selection.
  for (const [id, heldPattern, filename, selector] of [
    ['diyan', /earthfire-(flame-seat|runes|rune-seal)\.webp/, 'earthfire-flame-seat.webp', '.character-fire-base'],
    ['moonfox', /moonfox-cinema3d-blink-v2\.webp/, 'moonfox-cinema3d-blink-v2.webp', '.character-blink'],
  ]) {
    const { page, context, errors } = await openContext();
    await page.setRequestInterception(true);
    const gate = gateRequests(page, url => heldPattern.test(url));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await choose(page, id);
    await waitForHeld(gate, filename);
    assert.equal(await page.$eval(selector, image => image.complete && image.naturalWidth > 0), false);
    if (id === 'moonfox') assert.equal(await page.$eval(selector, image => image.hidden), true, '未加载的表情不能露出错误图层');
    await gate.release();
    await page.waitForFunction(sel => { const image = document.querySelector(sel); return !image.hidden && image.complete && image.naturalWidth > 0; }, {}, selector);
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), id);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('✓ 慢配景和表情不阻塞角色，也不显示错误表情');

  // If a portrait is extremely slow, keep the intent locked and reveal it only
  // when the image finally loads, without substituting a different character.
  {
    const { page, context } = await openContext();
    await page.setRequestInterception(true);
    const gate = gateRequests(page, url => url.endsWith('/yuchen-cinema3d.webp'));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#traitMachine[data-ready="true"]');
    await spinFor(page, 'yuchen');
    await waitForHeld(gate, '/yuchen-cinema3d.webp');
    assert.equal(await page.$$eval('#traitSpin, #traitLever, #traitConfirm', buttons => buttons.every(button => button.disabled)), true);
    await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'yuchen', { timeout: 5000 });
    assert.equal(await page.$eval('[data-character-asset="portrait"]', image => getComputedStyle(image).visibility), 'hidden');
    await gate.release();
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-character-asset="portrait"]');
      return image.complete && image.currentSrc.endsWith('/yuchen-cinema3d.webp') && getComputedStyle(image).visibility === 'visible';
    });
    await context.close();
  }
  console.log('✓ 极慢素材下锁定本次选择并防止人物闪现');

  // If the main module really fails, leave the selection/scene usable and explain the error.
  {
    const { page, context } = await openContext();
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (/\/assets\/engines-[^/]+\.js(?:\?|$)/.test(request.url())) request.abort('failed').catch(() => {});
      else if (request.url().startsWith('http') && !request.url().startsWith(base)) request.abort().catch(() => {});
      else request.continue().catch(() => {});
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await choose(page, 'wenwen');
    await page.click('#homeCtaMain');
    await page.waitForFunction(() => document.querySelector('#homeCtaMain').textContent.includes('请刷新重试'));
    assert.match(await page.$eval('#homeLoadingStatus', el => el.textContent), /加载失败/);
    assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close');
    await context.close();
  }
  console.log('✓ 主程序加载失败时提示刷新，特质和近景仍可用');

  // No-JavaScript users must receive an explanation instead of an unchosen role.
  {
    const { page, context } = await openContext();
    await page.setJavaScriptEnabled(false);
    await page.goto(base, { waitUntil: 'load' });
    const fallback = await page.evaluate(() => ({
      message: document.querySelector('.trait-noscript')?.textContent,
      overlay: getComputedStyle(document.getElementById('calculationOverlay')).display,
      inert: document.getElementById('page1').inert,
    }));
    assert.match(fallback.message, /启用 JavaScript/);
    assert.equal(fallback.overlay, 'none');
    assert.equal(fallback.inert, true);
    await context.close();
  }
  console.log('✓ 无 JavaScript 时给出明确提示，不自动分配角色');

  // A refresh asks again but can reuse the selected image and room in cache.
  {
    const { page, context } = await openContext('moonfox');
    const responses = [];
    page.on('response', response => responses.push({ url: response.url(), cached: response.fromCache() }));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await choose(page, 'moonfox');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#traitSelection', el => el.hidden), false);
    responses.length = 0;
    await choose(page, 'moonfox');
    for (const name of ['moonfox-cinema3d.webp', 'moon-fox-study-mobile.webp']) {
      const response = responses.find(item => item.url.endsWith('/' + name));
      assert.ok(response?.cached, `${name} 重新选择应复用浏览器缓存`);
    }
    await context.close();
  }
  console.log('✓ 刷新重选同时复用已有图片缓存');

  // A constrained real network/CPU must still reach the selected art quickly.
  for (const id of Object.keys(HOME_THEMES)) {
    const { page, context } = await openContext(id);
    const client = await page.createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 200 * 1024 });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#traitMachine[data-ready="true"]', { timeout: 30000 });
    const start = Date.now();
    await choose(page, id);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 10000, `${id} 的慢网场景加载过慢：${elapsed}ms`);
    console.log(`  ${id} 慢网选择到实际人物/背景 ${elapsed}ms`);
    await context.close();
  }
  console.log('✓ 十角色慢网下只加载所选场景');
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
