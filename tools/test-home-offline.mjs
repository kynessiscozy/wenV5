import { spinFor } from './trait-picker-helper.mjs';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import puppeteer from 'puppeteer';

// Serve the production build from a subpath, not just the development root.
const root = resolve('dist');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!pathname.startsWith('/demo/')) { response.writeHead(404).end(); return; }
  const relative = pathname.slice('/demo/'.length) || 'index.html';
  const file = resolve(root, relative);
  if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(data);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/demo/`;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];

async function offlineCalculation(page, id, assetName = '') {
  await page.click('#homeCtaMain');
  await page.waitForSelector('#formModal.open');
  await page.click('.character-form-submit');
  await page.waitForFunction((theme, asset) => {
    const scene = document.getElementById('calculationOverlay');
    const images = [...scene.querySelectorAll(`.calculation-props--${theme} img`)];
    const pillars = [...scene.querySelectorAll('[data-calculation-pillar]')];
    return !scene.hidden && scene.dataset.calculationState === 'ready' && scene.dataset.calculationTheme === theme &&
      images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0) &&
      (!asset || images.some(image => image.currentSrc.endsWith('/' + asset))) &&
      pillars.every(item => item.textContent === window._ctx.b[item.dataset.calculationPillar].g + window._ctx.b[item.dataset.calculationPillar].z);
  }, { timeout: 10000 }, id, assetName);
  await page.click('#calculationContinue');
  await page.waitForFunction((theme) => {
    const hero = document.getElementById('characterResultHero');
    const portrait = hero?.querySelector('.result-character-portrait');
    const chapter = document.querySelector('#s-yun .result-character-chapter');
    const summary = hero?.querySelector('.qr-card .qr-summary');
    return document.body.classList.contains('report-active') && hero?.dataset.reportCharacter === theme &&
      chapter?.dataset.reportCharacter === theme && !!summary?.textContent.trim() &&
      portrait?.complete && portrait.naturalWidth > 0 &&
      hero.querySelector('[data-report-value="day-master"]').textContent === window._ctx.dg + window._ctx.dw;
  }, { timeout: 10000 }, id);
  await new Promise(resolve => setTimeout(resolve, 400));
  await page.click('.result-character-hint-button');
  await page.waitForFunction(() => {
    const hint = document.getElementById('characterResultHint');
    const speaking = document.querySelector('#characterResultHero .result-character-speaking');
    return !hint.hidden && hint.textContent.includes(window._ctx.dg + window._ctx.dw) &&
      speaking?.complete && speaking.naturalWidth > 0;
  }, { timeout: 10000 });
  if (id === 'wenwen') {
    // The assistant's artwork and local answer both work on the first offline open.
    await page.click('#aiFab');
    await page.waitForSelector('#aiSheet.open');
    await page.waitForFunction(() => [...document.querySelectorAll('#aiSheet [data-master-portrait], #aiSheet .chat-avatar--twins img')].length === 4 &&
      [...document.querySelectorAll('#aiSheet [data-master-portrait], #aiSheet .chat-avatar--twins img')].every(image => image.complete && image.naturalWidth > 0));
    await page.type('#askInput', '你好');
    await page.click('#aiSheet .ai-send');
    await page.waitForFunction(() => document.querySelectorAll('#askResult .chat-msg-ai:not(.chat-typing)').length >= 2, { timeout: 5000 });
    assert.equal(await page.$$eval('#askResult .chat-msg-ai:not(.chat-typing) .chat-avatar--twins', avatars => avatars.every(avatar => avatar.querySelectorAll('img').length === 2)), true);
    await page.evaluate(() => window.closeAsk());
    // The first-ever share in this page is a tool result, entirely offline.
    // The preview must already be available without fetching a new chunk.
    await page.evaluate(() => window.openToolPage('daily'));
    await page.waitForSelector('#twYShare', { timeout: 15000 });
    await page.click('#twYShare');
    await page.waitForSelector('#shareStudio .share-studio-image', { timeout: 15000 });
    assert.equal(await page.$eval('#shareStudioTitle', el => el.textContent), '分享结果');
    assert.equal(await page.$eval('#shareStudio .share-studio-save', el => el.disabled), false);
    await page.click('#shareStudio .share-studio-close');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'twYShare', '离线关闭分享返回原工具按钮');
    await page.evaluate(() => window.closeToolPage());
    // The character poster and selected assets must also be available offline.
    await page.click('#p2ShareBtn');
    await page.waitForSelector('#shareStudio .share-studio-image', { timeout: 15000 });
    assert.equal(await page.$eval('#shareStudio .share-studio-image', el => el.naturalWidth), 1080);
    assert.equal(await page.$eval('#shareStudio .share-studio-save', el => el.disabled), false);
    await page.click('#shareStudio .share-studio-close');
    // The Three.js chunks may not have been downloaded yet. In that case the
    // offline fallback still exposes real western values and portrait controls.
    await page.click('.result-character-hint-button');
    await page.click('#modeWestern');
    await page.waitForFunction(() => document.documentElement.dataset.systemMode === 'western');
    await page.waitForFunction(() => document.querySelector('#w3d-astro canvas') ||
      /(离线时无法加载|暂不支持)/.test(document.querySelector('#w3d-astro .w3d-loading')?.textContent || ''), { timeout: 15000 });
    const western = await page.evaluate(() => ({
      values: [...document.querySelectorAll('#w3d-astro [data-report-value]')].map(el => el.textContent.trim()),
      sun: window.__w3dData.astro.sun.name,
      moon: window.__w3dData.astro.moon.name,
    }));
    assert.equal(western.values.length, 3);
    assert.ok(western.values[0].includes(western.sun) && western.values[1].includes(western.moon),
      '离线西方场景显示真实太阳与月亮信息');
    await page.click('#characterResultHero .result-portrait-toggle');
    assert.equal(await page.$eval('#characterResultHero .result-portrait-toggle', el => el.getAttribute('aria-expanded')), 'false');
    await page.click('#characterResultHero .result-portrait-toggle');
    await page.click('#modeEastern');
    await page.waitForFunction(() => document.documentElement.dataset.systemMode === 'eastern');
    const { day, summary } = await page.evaluate(() => ({ day: window._ctx.dg + window._ctx.dw, summary: document.querySelector('#s-ming .qr-summary').textContent }));
    await page.click('#reportTraitReselect');
    await spinFor(page, 'moonfox');
    await page.waitForFunction(() => document.getElementById('traitSelection').hidden &&
      document.querySelector('#characterResultHero')?.dataset.reportCharacter === 'moonfox');
    assert.equal(await page.evaluate(() => window._ctx.dg + window._ctx.dw), day, '离线重选不能重算或丢失结果');
    assert.equal(await page.$eval('#characterResultHero .qr-summary', el => el.textContent), summary, '离线重选保留一览的实际摘要');
    await page.click('#reportTraitReselect');
    await spinFor(page, 'wenwen');
    await page.waitForFunction(() => document.getElementById('traitSelection').hidden &&
      document.querySelector('#characterResultHero')?.dataset.reportCharacter === 'wenwen');
  }
  await page.evaluate(() => window.goBack());
  await page.waitForFunction(() => !document.body.classList.contains('report-active'));
  await new Promise(resolve => setTimeout(resolve, 550)); // Let the home page finish sliding back.
}

async function choose(page, id, width, room) {
  await page.waitForSelector('#traitMachine[data-ready="true"]', { timeout: 15000 });
  assert.equal(await page.$eval('#traitSelection', el => el.hidden), false, '离线刷新也应重新选择');
  await spinFor(page, id);
  await page.waitForFunction((theme, size, backdrop) => {
    const portrait = document.querySelector('[data-character-asset="portrait"]');
    const images = [...document.querySelectorAll('.character-expression')];
    return window._tools2Ready === true && document.documentElement.dataset.homeTheme === theme &&
      document.getElementById('traitSelection').hidden && portrait.complete && portrait.naturalWidth === size &&
      images.every(image => !image.hidden && image.complete && image.naturalWidth === size) &&
      document.querySelector('.character-backdrop img').currentSrc.endsWith('/' + backdrop);
  }, { timeout: 15000 }, id, width, room);
  assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close');
}

try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window._tools2Ready === true && document.getElementById('traitMachine')?.dataset.ready === 'true');
  // None of the roles are chosen online; all scenes must still work offline.
  await page.evaluate(async () => {
    for (const version of [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]) await caches.open(`wenda-cache-v${version}`);
    await caches.open('unrelated-app-cache');
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(async () => (await caches.keys()).includes('wenda-cache-v36') && !(await caches.keys()).some(key => /^wenda-cache-v(17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35)$/.test(key)));
  assert.ok(await page.evaluate(async () => (await caches.keys()).includes('unrelated-app-cache')), '更新不能删除其他应用的缓存');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => navigator.serviceWorker.controller && window._tools2Ready === true && document.getElementById('traitMachine')?.dataset.ready === 'true');

  const required = [
    './art/master-twin-indigo.webp', './art/master-twin-rose.webp',
    './art/master-twin-indigo-avatar.webp', './art/master-twin-rose-avatar.webp',
    './art/wenwen-reimagined.webp', './art/wenwen-reimagined-avatar.webp', './art/wenwen-reimagined-blink.webp', './art/wenwen-reimagined-speak.webp',
    './art/sacred-study-wide.webp', './art/sacred-study-mobile.webp',
    './art/moon-fox-reimagined.webp', './art/moon-fox-reimagined-avatar.webp', './art/moon-fox-reimagined-blink.webp', './art/moon-fox-reimagined-speak.webp',
    './art/moon-fox-cloud-trail.webp', './art/moon-fox-study-wide.webp', './art/moon-fox-study-mobile.webp',
    './art/earthfire-sovereign.webp', './art/earthfire-sovereign-avatar.webp', './art/earthfire-sovereign-blink.webp', './art/earthfire-sovereign-speak.webp',
    './art/earthfire-flame-seat.webp', './art/earthfire-hall-wide.webp', './art/earthfire-hall-mobile.webp', './art/earthfire-runes.webp', './art/earthfire-rune-seal.webp',
    './art/yuchen-empress.webp', './art/yuchen-empress-avatar.webp', './art/yuchen-empress-blink.webp', './art/yuchen-empress-speak.webp',
    './art/yuchen-hall-wide.webp', './art/yuchen-hall-mobile.webp',
    './art/qinglan-renewed.webp', './art/qinglan-renewed-avatar.webp', './art/qinglan-renewed-blink.webp', './art/qinglan-renewed-speak.webp',
    './art/qinglan-room-wide.webp', './art/qinglan-room-mobile.webp', './art/qinglan-sword.webp',
    './art/xingling-renewed.webp', './art/xingling-renewed-avatar.webp', './art/xingling-renewed-blink.webp', './art/xingling-renewed-speak.webp',
    './art/xingling-room-wide.webp', './art/xingling-room-mobile.webp', './art/xingling-fan.webp',
    './art/luye.webp', './art/luye-avatar.webp', './art/luye-blink.webp', './art/luye-speak.webp',
    './art/luye-room-wide.webp', './art/luye-room-mobile.webp', './art/luye-turntable.svg', './art/luye-vinyl.svg',
    './art/suyan.webp', './art/suyan-avatar.webp', './art/suyan-blink.webp', './art/suyan-speak.webp',
    './art/suyan-room-wide.webp', './art/suyan-room-mobile.webp', './art/suyan-camera.svg',
    './art/awakening-scroll.webp', './art/awakening-fox-fan.webp', './art/awakening-phoenix-wing.webp',
  ];
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name).filter(url => url.startsWith(location.origin + '/demo/')));
  await page.waitForFunction(async urls => (await Promise.all(urls.map(url => caches.match(url)))).every(Boolean), { timeout: 15000 }, [...required, ...resources]);
  await page.setOfflineMode(true);

  const roles = [
    ['wenwen', 848, 'sacred-study-mobile.webp', 'awakening-scroll.webp'],
    ['moonfox', 848, 'moon-fox-study-mobile.webp', 'awakening-fox-fan.webp'],
    ['diyan', 625, 'earthfire-hall-mobile.webp', 'earthfire-flame-seat.webp'],
    ['yuchen', 1024, 'yuchen-hall-mobile.webp', 'awakening-phoenix-wing.webp'],
    ['qinglan', 848, 'qinglan-room-mobile.webp', 'qinglan-sword.webp'],
    ['xingling', 848, 'xingling-room-mobile.webp', 'xingling-fan.webp'],
    ['luye', 848, 'luye-room-mobile.webp', 'luye-turntable.svg'],
    ['suyan', 848, 'suyan-room-mobile.webp', 'suyan-camera.svg'],
  ];
  for (const [id, width, room, asset] of roles) {
    await choose(page, id, width, room);
    if (id === 'diyan') {
      await page.waitForFunction(() => document.querySelector('.character-fire-base').naturalWidth === 1124 &&
        [...document.querySelectorAll('.character-rune img')].every(image => !image.hidden && image.naturalWidth === 512) &&
        document.querySelector('.character-prop--rune-seal img').naturalWidth === 960);
    } else assert.ok(await page.$$eval('.character-rune, .character-prop--rune-seal', props => props.every(prop => prop.hidden)));
    await offlineCalculation(page, id, asset);
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), id);
    if (id !== roles.at(-1)[0]) await page.reload({ waitUntil: 'domcontentloaded' });
  }
  await page.click('#homeTraitReset');
  await page.click('#traitLever');
  await page.waitForFunction(() => !document.getElementById('traitConfirm').hidden, { timeout: 5000 });
  assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'suyan', '离线转动结果在确认前不能改变角色');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'suyan');
  await page.setViewport({ width: 1280, height: 720 });
  await page.waitForFunction(() => document.querySelector('.character-backdrop img').complete &&
    document.querySelector('.character-backdrop img').naturalWidth > 0 && document.querySelector('.character-backdrop img').currentSrc.endsWith('/suyan-room-wide.webp'));
  await page.click('#characterPortraitButton');
  await page.waitForSelector('#formModal.open');
  await page.keyboard.press('Escape');
  await page.click('#homeCtaCal');
  await page.waitForSelector('#toolModal.open.cal-fullscreen');
  await page.evaluate(() => window.closeToolPage());
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.$eval('#traitSelection', el => el.hidden), false);
  assert.equal(await page.$eval('html', el => el.dataset.homeTheme), undefined);
  assert.deepEqual(errors, [], '离线页面不应产生未捕获的 JavaScript 错误');
  console.log('✓ /demo/ 生产构建：缓存更新、八角色离线选择/重选、真实结果、西方信息回退、固定近景与探索日历');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
