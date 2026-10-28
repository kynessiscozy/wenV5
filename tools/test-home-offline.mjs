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

try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window._tools2Ready === true && document.documentElement.dataset.homeReady === 'true');
  await page.evaluate(async () => {
    // A stale cache from a previous release should be removed on activation.
    await caches.open('wenda-cache-v16');
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(async () => (await caches.keys()).includes('wenda-cache-v17') && !(await caches.keys()).includes('wenda-cache-v16'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => navigator.serviceWorker.controller && window._tools2Ready === true && document.documentElement.dataset.homeReady === 'true');

  const required = [
    './art/wenwen-divine.webp', './art/sacred-study-wide.webp', './art/sacred-study-mobile.webp',
    './art/moon-fox.webp', './art/moon-fox-avatar.webp', './art/moon-fox-blink.webp', './art/moon-fox-speak.webp',
    './art/moon-fox-cloud-trail.webp', './art/moon-fox-study-wide.webp', './art/moon-fox-study-mobile.webp',
    './art/earthfire-sovereign.webp', './art/earthfire-sovereign-avatar.webp', './art/earthfire-sovereign-blink.webp', './art/earthfire-sovereign-speak.webp',
    './art/earthfire-flame-seat.webp', './art/earthfire-hall-wide.webp', './art/earthfire-hall-mobile.webp',
  ];
  const resources = await page.evaluate(() => performance.getEntriesByType('resource')
    .map(entry => entry.name).filter(url => url.startsWith(location.origin + '/demo/')));
  await page.waitForFunction(async urls => (await Promise.all(urls.map(url => caches.match(url)))).every(Boolean), { timeout: 15000 }, [...required, ...resources]);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.homeTheme), 'wenwen');

  // These assets must be available offline even before the fox theme was ever selected online.
  await page.setOfflineMode(true);
  await page.click('[data-home-character="moonfox"]');
  await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'moonfox' &&
    document.querySelector('[data-character-asset="portrait"]').naturalWidth === 770 &&
    document.querySelector('.character-backdrop img').currentSrc.endsWith('/moon-fox-study-mobile.webp'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window._tools2Ready === true && document.documentElement.dataset.homeReady === 'true' &&
    document.documentElement.dataset.homeTheme === 'moonfox' && document.querySelector('[data-character-asset="portrait"]').naturalWidth === 770);
  // The third scene also has to work when never selected while online.
  await page.click('[data-home-character="diyan"]');
  await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'diyan' &&
    document.querySelector('[data-character-asset="portrait"]').naturalWidth === 625 &&
    document.querySelector('.character-fire-base').naturalWidth === 1124 &&
    document.querySelector('.character-backdrop img').currentSrc.endsWith('/earthfire-hall-mobile.webp'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window._tools2Ready === true && document.documentElement.dataset.homeReady === 'true' &&
    document.documentElement.dataset.homeTheme === 'diyan' && document.querySelector('[data-character-asset="portrait"]').naturalWidth === 625 &&
    document.querySelector('.character-fire-base').naturalWidth === 1124);
  await page.click('.character-camera-picker [data-camera-shot="close"]');
  await page.waitForFunction(() => document.getElementById('characterScene').dataset.cameraShot === 'close' &&
    document.querySelector('.character-camera').style.getPropertyValue('--camera-scale') === '1.5500');
  await page.setViewport({ width: 1280, height: 720 });
  await page.waitForFunction(() => document.querySelector('.character-backdrop img').complete &&
    document.querySelector('.character-backdrop img').naturalWidth > 0 && document.querySelector('.character-backdrop img').currentSrc.endsWith('/earthfire-hall-wide.webp'));
  await page.click('#characterPortraitButton');
  await page.waitForSelector('#formModal.open');
  await page.keyboard.press('Escape');
  await page.click('#homeCtaCal');
  await page.waitForSelector('#toolModal.open.cal-fullscreen');
  await page.evaluate(() => window.closeToolPage());
  await page.click('[data-home-character="wenwen"]');
  await page.waitForFunction(() => document.documentElement.dataset.homeTheme === 'wenwen' &&
    document.querySelector('[data-character-asset="portrait"]').naturalWidth === 992 && !document.querySelector('.character-prop--lantern').hidden);
  assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close', '离线切换角色仍应保留景别');
  await page.click('.character-camera-picker [data-camera-shot="far"]');
  assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'far');
  assert.deepEqual(errors, [], '离线页面不应产生未捕获的 JavaScript 错误');
  console.log('✓ /demo/ 生产构建：v16 缓存清理、三主题离线切换/刷新、运镜、横竖屏、探索和日历');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
