import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import puppeteer from 'puppeteer';
import { spinFor } from './trait-picker-helper.mjs';
import { calcWesternChart } from '../src/engines/western.js';

// Exercise the built app at a non-root deployment. All external services are
// mocked: tests never send user data or require a real AI key / geolocation.
const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (!pathname.startsWith('/demo/')) return res.writeHead(404).end();
  const file = resolve(root, pathname.slice('/demo/'.length) || 'index.html');
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try { res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const base = `http://127.0.0.1:${server.address().port}/demo/`;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));

async function createPage({ desktop = false, reduced = true, failMotionInMain = false } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport(desktop ? { width: 1280, height: 800 } : { width: 390, height: 844, isMobile: true, hasTouch: true });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(({ desktopPointer, failMotionInMain }) => {
    window.__test = { clears: 0, cursor: 0, geo: 0, reverse: 0, weather: [], overpass: [], ai: [], hidden: false, stream: 'fail' };
    const originalMatch = window.matchMedia.bind(window);
    window.matchMedia = query => {
      if (failMotionInMain && !window.__test.motionFailed && query === '(prefers-reduced-motion: reduce)' &&
          new Error().stack.includes('/assets/main-')) {
        window.__test.motionFailed = true;
        throw new Error('simulated older WebView media query failure');
      }
      const actual = originalMatch(query);
      if (!desktopPointer || !/^\(hover\s*:\s*none\)$/.test(query)) return actual;
      return new Proxy(actual, { get(target, property) {
        if (property === 'matches') return false;
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      } });
    };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__test.hidden });
    // The legacy section organizer is the only 400ms interval in the app.
    // It must settle quickly even when the modern report already groups cards.
    window.__test.sectionTicks = 0;
    window.__sectionIntervals = new Set();
    const nativeInterval = window.setInterval.bind(window), nativeClearInterval = window.clearInterval.bind(window);
    window.setInterval = (callback, ms, ...args) => {
      if (ms !== 400) return nativeInterval(callback, ms, ...args);
      const id = nativeInterval(() => { window.__test.sectionTicks++; callback(...args); }, ms);
      window.__sectionIntervals.add(id);
      return id;
    };
    window.clearInterval = id => { window.__sectionIntervals.delete(id); nativeClearInterval(id); };
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas?.id === 'tjParticles') window.__test.clears++;
      return clear.apply(this, args);
    };
    window.addEventListener('DOMContentLoaded', () => {
      const dot = document.getElementById('tjCursorDot');
      if (dot) new MutationObserver(m => { window.__test.cursor += m.length; }).observe(dot, { attributes: true, attributeFilter: ['style'] });
    });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition(success, failure) { window.__test.geo++; window.__test.geoSuccess = success; window.__test.geoFailure = failure; },
    } });
    window.__geoSuccess = (latitude = 31.2, longitude = 121.5) => window.__test.geoSuccess({ coords: { latitude, longitude } });
    window.__geoDeny = () => window.__test.geoFailure({ code: 1 });
    const realFetch = window.fetch.bind(window);
    window.fetch = (url, init = {}) => {
      const u = String(url);
      if (u.startsWith('https://nominatim.openstreetmap.org/')) {
        window.__test.reverse++;
        const city = Number(new URL(u).searchParams.get('lat')) > 35 ? '北京' : '上海';
        return Promise.resolve(new Response(JSON.stringify({ address: { city } }), { status: 200 }));
      }
      if (u.startsWith('https://api.open-meteo.com/')) {
        window.__test.weather.push(u);
        return new Promise((resolveWeather, rejectWeather) => {
          window.__weatherResolvers ||= [];
          window.__weatherSuccess = () => resolveWeather(new Response(JSON.stringify({ current: {
            temperature_2m: 30, relative_humidity_2m: 55, weather_code: 61, wind_speed_10m: 22,
          } }), { status: 200 }));
          window.__weatherResolvers.push(window.__weatherSuccess);
          window.__weatherFail = () => rejectWeather(new Error('offline'));
        });
      }
      if (u.startsWith('https://overpass-api.de/')) {
        const entry = { body: init.body, aborted: false };
        window.__test.overpass.push(entry);
        return new Promise((resolveMap, rejectMap) => {
          entry.resolve = () => resolveMap(new Response(JSON.stringify({ elements: [
            { type: 'node', lat: 31.2003, lon: 121.5, tags: { leisure: 'park' } },
          ] }), { status: 200 }));
          init.signal?.addEventListener('abort', () => { entry.aborted = true; rejectMap(new DOMException('Aborted', 'AbortError')); }, { once: true });
        });
      }
      if (u.startsWith('https://api.deepseek.com/')) {
        if (init.method !== 'POST') return Promise.resolve(new Response('{}', { status: 200 }));
        const body = JSON.parse(init.body);
        window.__test.ai.push(body);
        if (!body.stream) return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: '先从一件小事开始。' } }] }), { status: 200 }));
        if (window.__test.stream === 'fail') return Promise.resolve(new Response('offline', { status: 503 }));
        const chunk = 'data: ' + JSON.stringify({ choices: [{ delta: { content: '可以先做一个小步骤。' } }] }) + '\n\ndata: [DONE]\n\n';
        return Promise.resolve(new Response(chunk, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
      }
      if (/^https?:\/\//.test(u) && !u.startsWith(location.origin)) return Promise.reject(new Error('external request blocked in test'));
      return realFetch(url, init);
    };
  }, { desktopPointer: desktop, failMotionInMain });
  await page.goto(base, { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window._tools2Ready && typeof window.calc === 'function', { timeout: 20000 });
  return { page, context };
}

async function choose(page) {
  await spinFor(page, 'wenwen');
  await page.waitForFunction(() => document.getElementById('traitSelection').hidden);
}
async function showReport(page, birthDate = '1995-06-15') {
  await page.evaluate(date => {
    document.getElementById('bDate').value = date;
    document.getElementById('bTime').value = '00:30';
    document.getElementById('cInp').value = '上海';
    document.getElementById('bPlace').value = 'shanghai';
    void window.calc();
  }, birthDate);
  await page.waitForFunction(() => document.getElementById('calculationOverlay')?.dataset.calculationState === 'ready', { timeout: 20000 });
  await page.click('#calculationContinue');
  await page.waitForFunction(() => document.body.classList.contains('report-active'), { timeout: 15000 });
}
async function difference(page, field, ms = 700) {
  const before = await page.evaluate(key => window.__test[key], field);
  await delay(ms);
  return (await page.evaluate(key => window.__test[key], field)) - before;
}

try {
  // Idle home has no hidden canvas drawing or location prompt. Report effects
  // resume, follow the motion preference, and stop on background/home.
  {
    const { page, context } = await createPage({ desktop: true, reduced: false });
    await delay(500);
    assert.equal(await difference(page, 'clears'), 0, '首页隐藏的粒子画布不能持续清绘');
    assert.equal(await page.evaluate(() => window.__test.geo), 0, '首次进入不应请求定位');
    assert.equal(await page.evaluate(() => window.__sectionIntervals.size), 0, '首页不应轮询报告分区');
    await choose(page);
    assert.equal(await difference(page, 'clears'), 0);
    await showReport(page);
    await page.waitForFunction(() => window.__test.sectionTicks > 0 && window.__sectionIntervals.size === 0, { timeout: 6000 });
    assert.ok(await page.$$('#s-ming .ming-tab').then(items => items.length >= 2), '东方报告分区应保留原有标签');
    assert.ok(await difference(page, 'clears') >= 8, '普通动态效果下报告星点应继续绘制');
    await page.mouse.move(180, 180);
    await page.mouse.move(870, 450);
    await page.waitForFunction(() => window.__test.cursor > 0, { timeout: 5000 });
    await delay(1500);
    assert.ok(await difference(page, 'cursor') <= 1, '鼠标停止后光标拖尾应停止逐帧写入');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await delay(350);
    assert.ok(await difference(page, 'clears') <= 1, '减少动态效果时星点应为静态');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await delay(350);
    assert.ok(await difference(page, 'clears') >= 8, '恢复动态偏好后报告星点应恢复');
    await page.evaluate(() => { window.__test.hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
    await delay(350);
    assert.equal(await difference(page, 'clears'), 0, '后台标签不应绘制报告星点');
    await page.evaluate(() => { window.__test.hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await delay(350);
    assert.ok(await difference(page, 'clears') >= 8, '回到标签后报告星点应恢复');

    // A real Western theatre stops its RAF/timer when hidden or returning home,
    // and resumes the same scene when the report becomes visible again.
    await page.click('#modeWestern');
    await page.waitForFunction(() => window._w3d?.built?.astro?.raf, { timeout: 20000 });
    assert.ok(await page.$$('#s-ming .wastro-tab').then(items => items.length >= 2), '西方报告分区应保留原有标签');
    await page.$eval('#s-ming .wastro-tab[data-wastro="astro-elements"]', el => el.click());
    assert.equal(await page.$eval('#s-ming .wastro-pane[data-wastro="astro-elements"]', el => el.classList.contains('active')), true);
    const stoppedImmediately = await page.evaluate(() => {
      window.__test.hidden = true; document.dispatchEvent(new Event('visibilitychange'));
      const scene = window._w3d.built.astro;
      return window._w3d.STATE.activeKey === null && !scene.raf && !scene.timer && !scene.fallbackTimer;
    });
    assert.equal(stoppedImmediately, true, '标签隐藏时应立即停止 3D 动画与兜底定时器');
    await page.waitForFunction(() => window._w3d.STATE.activeKey === null && !window._w3d.built.astro.raf && !window._w3d.built.astro.timer, { timeout: 5000 });
    await page.evaluate(() => { window.__test.hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => window._w3d.STATE.activeKey === 'astro' && !!window._w3d.built.astro.raf, { timeout: 8000 });
    await page.evaluate(() => window.goBack());
    await page.waitForFunction(() => window._w3d.STATE.activeKey === null && !window._w3d.built.astro.raf && !window._w3d.built.astro.timer, { timeout: 5000 });
    await delay(300);
    assert.equal(await difference(page, 'clears'), 0, '返回首页应停止粒子');
    await page.mouse.move(300, 220);
    assert.equal(await difference(page, 'cursor'), 0, '首页隐藏的光标不应继续运行拖尾');
    await page.evaluate(() => window.showPage2());
    await page.waitForFunction(() => window._w3d.STATE.activeKey === 'astro' && !!window._w3d.built.astro.raf, { timeout: 8000 });
    await context.close();
  }
  console.log('✓ 首页空闲、光标静止、减少动态效果、后台及西方 3D 场景的暂停与恢复');

  // A failed optional motion query in an older WebView must not prevent the
  // dynamically loaded application or the report from opening.
  {
    const { page, context } = await createPage({ failMotionInMain: true });
    assert.equal(await page.evaluate(() => window.__test.motionFailed), true);
    await choose(page);
    await showReport(page);
    assert.ok(await page.evaluate(() => !!window._ctx?.b));
    await context.close();
  }
  console.log('✓ 启动时动态偏好查询失败不阻止选择与报告');

  // A weather request starts on demand, coalesces menu + tool requests and
  // updates only the weather region, retaining all user selections.
  {
    const { page, context } = await createPage();
    assert.equal(await page.evaluate(() => window.__test.geo), 0);
    assert.equal(await page.evaluate(() => window.__test.weather.length), 0);
    await choose(page);
    await page.evaluate(() => window.openToolPage('style'));
    await page.waitForFunction(() => window.__test.geo === 1 && !!document.getElementById('twSGen'));
    await page.evaluate(() => window.toggleHomeMenu(true));
    await delay(100);
    assert.equal(await page.evaluate(() => window.__test.geo), 1, '并发打开菜单和穿搭应共享定位');
    await page.evaluate(() => { window.toggleHomeMenu(false); window.__geoSuccess(); });
    await delay(400);
    await page.waitForFunction(() => window.__test.weather.length === 1);
    await page.click('[data-s="面试汇报"]');
    await page.select('#twSSpace', '久坐');
    await page.evaluate(() => window.__weatherSuccess());
    await page.waitForFunction(() => document.querySelector('[data-style-weather]')?.textContent.includes('上海'));
    assert.equal(await page.$eval('[data-s="面试汇报"]', el => el.classList.contains('active')), true);
    assert.equal(await page.$eval('#twSSpace', el => el.value), '久坐');
    assert.deepEqual(await page.evaluate(() => ({ geo: window.__test.geo, reverse: window.__test.reverse, weather: window.__test.weather.length })),
      { geo: 1, reverse: 1, weather: 1 });
    assert.match(await page.$eval('#wxSecondary', el => el.textContent), /上海/);
    assert.match(await page.$eval('#p2WxSecondary', el => el.textContent), /上海/);
    assert.equal(await page.$eval('#wxLine', el => getComputedStyle(el).display), 'block');
    await page.click('#twSGen');
    const result = await page.$eval('.tw-view-result', el => el.innerText);
    assert.match(result, /面试汇报/);
    assert.match(result, /结合天气/);
    assert.match(result, /通用配色/);
    assert.doesNotMatch(result, /用神「土」/);
    await page.click('.tw-ai-basis-chip[data-b="western"]');
    assert.match(await page.$eval('#twAiBasisHint', el => el.textContent), /尚未提供完整出生信息/);
    assert.doesNotMatch(await page.$eval('#twAiBasisHint', el => el.textContent), /太阳：|上升：|月亮：/);

    // First AI answer succeeds; a failed follow-up keeps the original draft and
    // removes the failed user bubble. Retrying sends it once and can succeed.
    await page.evaluate(() => localStorage.setItem('tj_ai_apikey_deepseek', 'test-key-only'));
    await page.click('#twAiMainBtn');
    await page.waitForSelector('.tw-fu-input', { timeout: 5000 });
    assert.match(await page.$eval('.basis-badge', el => el.textContent), /未提供个人命盘依据/);
    const prompt = await page.evaluate(() => window.__test.ai[0].messages[0].content);
    assert.match(prompt, /尚未提供完整出生信息/);
    assert.match(prompt, /绝不能编造/);
    await page.type('.tw-fu-input', '这一步应该怎么开始？');
    await page.$eval('.tw-fu-send', el => el.scrollIntoView({ block: 'center' }));
    await delay(300);
    await page.click('.tw-fu-send');
    await page.waitForFunction(() => document.querySelector('.tw-fu-flow')?.textContent.includes('问题已保留'), { timeout: 8000 });
    assert.equal(await page.$eval('.tw-fu-input', el => el.value), '这一步应该怎么开始？');
    assert.equal(await page.$$('.tw-fu-turn.user').then(list => list.length), 0);
    await page.evaluate(() => { window.__test.stream = 'success'; });
    await page.$eval('.tw-fu-send', el => el.scrollIntoView({ block: 'center', behavior: 'auto' }));
    await delay(300);
    await page.click('.tw-fu-send');
    await page.waitForFunction(() => document.querySelector('.tw-fu-flow')?.textContent.includes('可以先做一个小步骤'), { timeout: 8000 });
    assert.equal(await page.$eval('.tw-fu-input', el => el.value), '');
    assert.equal(await page.$$('.tw-fu-turn.user').then(list => list.length), 1);
    await page.evaluate(() => window.openToolPage('horoscope'));
    await page.waitForSelector('#twHSynMe', { visible: true });
    assert.match(await page.$eval('#twHBody', el => el.innerText), /初始星座为示例/);
    assert.match(await page.$eval('#twHBody', el => el.innerText), /不是完整合盘或科学测量/);
    await page.select('#twHSynMe', 'aries');
    assert.equal(await page.$eval('#twHSynMe', el => el.value), 'aries');
    await context.close();
  }
  console.log('✓ 定位与天气按需合并；表单不被异步覆盖；无命盘不伪造依据，AI 失败可保留追问重试');

  // An early result stays unchanged while weather is in flight. Returning to
  // the form preserves choices and lets the user generate again with weather.
  {
    const { page, context } = await createPage();
    await choose(page);
    await page.evaluate(() => window.openToolPage('style'));
    await page.waitForSelector('#twSGen');
    await page.click('[data-s="专注工作"]');
    await page.select('#twSSpace', '光线');
    await page.click('#twSGen');
    assert.match(await page.$eval('.tw-view-result', el => el.innerText), /天气仍在查询中/);
    await page.evaluate(() => window.__geoSuccess());
    await page.waitForFunction(() => window.__test.weather.length === 1);
    await page.evaluate(() => window.__weatherSuccess());
    await page.waitForFunction(() => document.querySelector('[data-style-weather]')?.textContent.includes('上海'));
    assert.match(await page.$eval('.tw-view-result', el => el.innerText), /天气仍在查询中/, '晚到的天气不能重建已经展示的结果');
    await page.click('.tw-result-back');
    assert.equal(await page.$eval('[data-s="专注工作"]', el => el.classList.contains('active')), true);
    assert.equal(await page.$eval('#twSSpace', el => el.value), '光线');
    await page.click('#twSGen');
    assert.match(await page.$eval('.tw-view-result', el => el.innerText), /结合天气/);
    await context.close();
  }
  console.log('✓ 天气未返回时可以先生成，结果不被覆盖，返回后可用天气重新生成');

  // Refused location is explicitly labelled as the Beijing fallback; failed
  // network requests can be retried the next time the menu is opened.
  {
    const { page, context } = await createPage();
    await choose(page);
    await page.evaluate(() => window.toggleHomeMenu(true));
    await page.waitForFunction(() => window.__test.geo === 1);
    await page.evaluate(() => window.__geoDeny());
    await page.waitForFunction(() => window.__test.weather.length === 1);
    assert.match(await page.evaluate(() => window.__test.weather[0]), /latitude=39\.9042&longitude=116\.4074/);
    await page.evaluate(() => window.__weatherFail());
    await page.waitForFunction(() => document.getElementById('wxPrimary').textContent.includes('暂不可用'));
    await page.evaluate(() => { window.toggleHomeMenu(false); window.toggleHomeMenu(true); });
    await page.waitForFunction(() => window.__test.geo === 2);
    await page.evaluate(() => window.__geoDeny());
    await page.waitForFunction(() => window.__test.weather.length === 2);
    await page.evaluate(() => window.__weatherSuccess());
    await page.waitForFunction(() => document.getElementById('wxSecondary').textContent.includes('北京（默认）'));
    assert.match(await page.$eval('#p2WxSecondary', el => el.textContent), /北京（默认）/);
    await context.close();
  }
  console.log('✓ 拒绝定位时标明北京默认天气，网络失败后可重新尝试');

  // If a user explicitly updates location while the old forecast is still in
  // flight, the old response must never be displayed as the new city's weather.
  {
    const { page, context } = await createPage();
    await choose(page);
    await page.evaluate(() => window.toggleHomeMenu(true));
    await page.waitForFunction(() => window.__test.geo === 1);
    await page.evaluate(() => window.__geoSuccess());
    await page.waitForFunction(() => window.__test.weather.length === 1);
    await page.evaluate(() => { window.toggleHomeMenu(false); window.openToolPage('fengshui'); });
    await page.waitForSelector('#twFLoc', { visible: true });
    await delay(350);
    await page.click('#twFLoc');
    await page.waitForFunction(() => window.__test.geo === 2);
    await page.evaluate(() => window.__geoSuccess(39.9, 116.4));
    await page.waitForFunction(() => document.getElementById('twFGeoNote')?.textContent.includes('北京'));
    await page.evaluate(() => window.__weatherResolvers[0]());
    await page.waitForFunction(() => window.__test.weather.length === 2);
    assert.match(await page.evaluate(() => window.__test.weather[1]), /latitude=39\.9000&longitude=116\.4000/);
    assert.doesNotMatch(await page.$eval('#wxSecondary', el => el.textContent), /上海/);
    await page.evaluate(() => window.__weatherResolvers[1]());
    await page.waitForFunction(() => document.getElementById('wxSecondary').textContent.includes('北京'));
    await page.click('#twFLoc');
    await page.waitForFunction(() => window.__test.geo === 3);
    await page.evaluate(() => window.__geoSuccess());
    await page.waitForFunction(() => document.getElementById('twFGeoNote')?.textContent.includes('上海'));
    await page.evaluate(() => { window.closeToolPage(); window.toggleHomeMenu(true); });
    await page.waitForFunction(() => window.__test.weather.length === 3);
    assert.match(await page.evaluate(() => window.__test.weather[2]), /latitude=31\.2000&longitude=121\.5000/);
    await page.evaluate(() => window.__weatherResolvers[2]());
    await page.waitForFunction(() => document.getElementById('wxSecondary').textContent.includes('上海'));
    await context.close();
  }
  console.log('✓ 定位变化时旧天气请求不会覆盖新位置，缓存会按地点失效');

  // Location and mapping remain optional; switching tools while a map request
  // is pending must cancel it and never replace the newer tool's content.
  {
    const { page, context } = await createPage();
    await choose(page);
    await page.evaluate(() => { window.openToolPage('fengshui'); window.closeToolPage(); });
    await delay(600);
    assert.equal(await page.evaluate(() => window.__test.geo), 0, '快速关闭风水工具后不能再弹出定位');
    await page.evaluate(() => window.openToolPage('fengshui'));
    await page.waitForFunction(() => window.__test.geo === 1, { timeout: 5000 });
    assert.equal(await page.evaluate(() => window.__test.weather.length), 0, '风水定位不应顺带请求天气');
    assert.equal(await page.evaluate(() => window.__test.overpass.length), 0, '生成前不能请求周边地图');
    await page.evaluate(() => window.__geoSuccess());
    await page.waitForFunction(() => document.getElementById('twFGeoNote')?.textContent.includes('上海'));
    await page.click('#twFGen');
    await page.waitForFunction(() => window.__test.overpass.length === 1);
    assert.match(await page.evaluate(() => decodeURIComponent(window.__test.overpass[0].body)), /31\.2,121\.5/);
    await page.evaluate(() => window.openToolPage('style'));
    await page.waitForSelector('#twSGen', { visible: true });
    await page.waitForFunction(() => window.__test.overpass[0].aborted, { timeout: 5000 });
    await page.evaluate(() => window.__test.overpass[0].resolve());
    await delay(300);
    assert.ok(await page.$('#twSGen'), '旧风水结果不能覆盖新打开的穿搭工具');
    await page.evaluate(() => window.openToolPage('fengshui'));
    await page.waitForSelector('#twFGen', { visible: true });
    assert.match(await page.$eval('#twFGeoNote', el => el.textContent), /上海/);
    assert.equal(await page.evaluate(() => window.__test.geo), 1, '重新打开复用已授权定位');
    await page.click('#twFGen');
    await page.waitForFunction(() => window.__test.overpass.length === 2);
    await page.evaluate(() => window.__test.overpass[1].resolve());
    await page.waitForSelector('.tw-fs-tg[data-v="detail"]', { visible: true });
    await page.click('.tw-fs-tg[data-v="detail"]');
    assert.match(await page.$eval('.tw-fs-detail', el => el.innerText), /上海/);
    assert.match(await page.$eval('.tw-fs-detail', el => el.innerText), /绿地公园/);
    await context.close();
  }
  console.log('✓ 风水定位与周边查询按需执行，切换工具后中止旧请求并保留新界面');

  // The report, tool AI and chat must show the same actual midnight chart.
  {
    const { page, context } = await createPage();
    await choose(page);
    // Jan 20 at this time is a cusp date: the true solar sign differs from
    // the fixed month/day lookup, so all views must use the same chart.
    await showReport(page, '1995-01-20');
    const expected = calcWesternChart(1995, 1, 20, 0, 30, 121.5, 31.2);
    const noon = calcWesternChart(1995, 1, 20, 12, 30, 121.5, 31.2);
    assert.notEqual(expected.asc.name, noon.asc.name);
    assert.equal(await page.evaluate(() => window.__w3dData.astro.asc.name), expected.asc.name);
    assert.equal(await page.evaluate(() => window.__w3dData.horo.sunName), expected.sun.name);
    assert.match(await page.$eval('#s-yun', el => el.textContent), /并非实时天象或预测/);
    await page.evaluate(() => window.openToolPage('style'));
    await page.waitForSelector('#twSGen');
    await page.click('#twSGen');
    await page.waitForSelector('#toolModalContent .tw-ai-basis-chip[data-b="western"]', { visible: true, timeout: 5000 });
    await page.click('#toolModalContent .tw-ai-basis-chip[data-b="western"]');
    assert.match(await page.$eval('#toolModalContent #twAiBasisHint', el => el.textContent), new RegExp('上升：' + expected.asc.name));
    await page.evaluate(() => window.openToolPage('horoscope'));
    await page.waitForSelector('#twHSynMe', { visible: true });
    assert.equal(await page.$eval('#twHSynMe', el => el.value), expected.sun.id);
    assert.match(await page.$eval('#twHBody', el => el.innerText), /默认使用个人星盘的太阳星座/);
    await page.evaluate(() => { window.closeToolPage(); window.openAsk(); });
    await page.waitForSelector('#aiSheet.open');
    await page.click('#aiBasisWestern');
    assert.match(await page.$eval('#aiContext', el => el.textContent), new RegExp('上升 ' + expected.asc.name));
    assert.doesNotMatch(await page.$eval('#aiContext', el => el.textContent), new RegExp('上升 ' + noon.asc.name));
    // Rebuilding the report replaces sections; the observer must attach to the
    // new nodes, preserve both systems' tabs and settle again.
    await page.evaluate(() => { window.closeAsk(); window.goBack(); });
    const ticksBefore = await page.evaluate(() => window.__test.sectionTicks);
    await showReport(page, '1995-07-12');
    await page.waitForFunction(previous => window.__test.sectionTicks > previous && window.__sectionIntervals.size === 0, { timeout: 6000 }, ticksBefore);
    assert.ok(await page.$$('#s-ming .ming-tab').then(items => items.length >= 2));
    await page.evaluate(() => window.setSystemMode('western'));
    await page.waitForSelector('#s-ming .wastro-tab[data-wastro="astro-elements"]', { visible: true });
    await page.$eval('#s-ming .wastro-tab[data-wastro="astro-elements"]', el => el.click());
    assert.equal(await page.$eval('#s-ming .wastro-pane[data-wastro="astro-elements"]', el => el.classList.contains('active')), true);
    await context.close();
  }
  console.log('✓ 实际午夜与交界日期在报告、星座工具及对话中一致；报告重算后标签可用');

  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
