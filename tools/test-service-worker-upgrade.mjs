import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

// Simulate an earlier preview worker which cached mutable files forever, then
// serve the current worker at the same URL. Proxy all app requests to Vite.
const upstream = new URL(process.env.BASE_URL || 'http://127.0.0.1:5173/');
const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const cacheName = worker.match(/const CACHE = '([^']+)'/)?.[1];
assert.ok(cacheName, '应能读取当前离线缓存版本');
const legacyWorker = `
const CACHE = 'wenda-cache-legacy-test';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode === 'navigate') return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));
});
`;
// Delay installation enough for the poisoned old files to be requested first.
const installDelay = `self.addEventListener('install', event => event.waitUntil(new Promise(resolve => setTimeout(resolve, 600))));\n`;
let phase = 'old';
let failOneArtwork = false;
const server = createServer((incoming, outgoing) => {
  const pathname = incoming.url?.split('?')[0];
  if (pathname === '/sw.js') {
    const marker = phase === 'newer' ? '\n// another release\n' : phase === 'fault' ? '\n// unavailable release\n' : '';
    const source = phase === 'old' ? legacyWorker : installDelay + worker + marker;
    outgoing.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
    outgoing.end(source);
    return;
  }
  if ((phase === 'fault' && pathname === '/') || (failOneArtwork && pathname === '/art/wenwen-reimagined.webp')) {
    outgoing.writeHead(503, { 'Cache-Control': 'no-store' });
    outgoing.end('temporarily unavailable');
    return;
  }
  const target = new URL(incoming.url?.replace(/^\//, '') || '', upstream);
  const proxyRequest = (target.protocol === 'https:' ? httpsRequest : httpRequest)(target, {
    method: incoming.method,
    headers: { ...incoming.headers, host: target.host },
  }, response => {
    outgoing.writeHead(response.statusCode || 502, response.headers);
    response.pipe(outgoing);
  });
  proxyRequest.on('error', error => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(error.message); });
  incoming.pipe(proxyRequest);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  let homeModule = '';
  let navigations = 0;
  const staleResponses = [];
  page.on('request', request => { if (request.url().includes('/src/ui/home-theme.js')) homeModule = request.url(); });
  page.on('response', response => {
    if (response.headers()['x-stale-test'] === 'yes') staleResponses.push(response.url());
  });
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#traitOptions button');
  assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), false, '没有旧注册时不自动安装 worker');
  assert.ok(homeModule, '应观察到首页角色模块');

  await page.evaluate(async () => {
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(async url => {
    const legacy = await caches.open('wenda-cache-legacy-test');
    await legacy.put(url, new Response("export function initHomeTheme() { document.documentElement.dataset.staleHome = 'yes'; }", {
      headers: { 'Content-Type': 'application/javascript', 'X-Stale-Test': 'yes' },
    }));
    await legacy.put('/src/character-theme.css', new Response('body { --stale-test: 1; }', {
      headers: { 'Content-Type': 'text/css', 'X-Stale-Test': 'yes' },
    }));
    await legacy.put('/art/wenwen-reimagined.webp', await fetch('/art/wenwen-reimagined.webp'));
    await caches.open('unrelated-app-cache');
  }, homeModule);

  phase = 'new';
  failOneArtwork = true;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(async name => {
    return (await caches.keys()).includes(name) && !document.documentElement.dataset.staleHome &&
      document.querySelectorAll('#traitOptions button').length === 8;
  }, { timeout: 15000 }, cacheName);
  assert.ok(staleResponses.length, '测试应先命中旧 worker 的损坏缓存');
  assert.ok(navigations >= 3, '新 worker 接管后应自动重载选择页面');
  assert.equal(await page.evaluate(async () => (await caches.keys()).includes('unrelated-app-cache')), true, '不能删除其他应用的缓存');
  const preservedArt = await page.evaluate(async name => {
    const image = await (await caches.open(name)).match('/art/wenwen-reimagined.webp');
    return image && (await image.arrayBuffer()).byteLength;
  }, cacheName);
  assert.ok(preservedArt > 10000, '非关键素材下载失败时应沿用旧离线副本');
  failOneArtwork = false;
  console.log('✓ 旧 worker 返回过期脚本和样式后，页面自动升级恢复');

  // Even if mutable development assets are present in the new cache, they
  // must be fetched from the current server instead of the old cached copy.
  await page.evaluate(async ({ url, name }) => {
    const cache = await caches.open(name);
    await cache.put(url, new Response("export function initHomeTheme() { document.documentElement.dataset.staleHome = 'yes'; }", {
      headers: { 'Content-Type': 'application/javascript' },
    }));
    await cache.put('/src/trait-selection.css', new Response('body { --stale-test: 1; }', {
      headers: { 'Content-Type': 'text/css' },
    }));
  }, { url: homeModule, name: cacheName });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#traitOptions button');
  await page.waitForFunction(() => window._tools2Ready === true, { timeout: 15000 });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.staleHome), undefined);
  assert.equal(await page.$eval('#traitSelection', element => getComputedStyle(element).position), 'fixed');
  console.log('✓ 开发预览不复用缓存中的旧模块和样式');

  const art = '/art/wenwen-reimagined.webp';
  await page.evaluate(async ({ name, url }) => {
    const cache = await caches.open(name);
    await cache.put(url, new Response('stale', { headers: { 'Content-Type': 'image/webp' } }));
  }, { name: cacheName, url: art });
  const onlineBytes = await page.evaluate(async url => (await (await fetch(url)).arrayBuffer()).byteLength, art);
  assert.ok(onlineBytes > 10000, '在线时应优先取得最新人物图片');
  await page.waitForFunction(async ({ name, url }) => {
    const cached = await (await caches.open(name)).match(url);
    return cached && (await cached.arrayBuffer()).byteLength > 10000;
  }, { timeout: 5000 }, { name: cacheName, url: art });
  await page.setOfflineMode(true);
  const offlineBytes = await page.evaluate(async url => (await (await fetch(url)).arrayBuffer()).byteLength, art);
  assert.equal(offlineBytes, onlineBytes, '离线时应回落到已缓存的图片');
  await page.setOfflineMode(false);
  console.log('✓ 人物图片在线更新，离线仍可读取');

  // A later update must never interrupt a selected character or an open form.
  await page.click('[data-trait="wenwen"]');
  await page.waitForFunction(() => document.getElementById('traitSelection').hidden);
  await page.click('#homeCtaMain');
  await page.waitForSelector('#formModal.open', { timeout: 15000 });
  await page.$eval('#cInp', input => { input.value = '尚未完成的输入'; });
  await page.evaluate(() => {
    window.__controllerChanges = 0;
    navigator.serviceWorker.addEventListener('controllerchange', () => { window.__controllerChanges++; });
  });
  const before = navigations;
  phase = 'newer';
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForFunction(() => window.__controllerChanges > 0, { timeout: 15000 });
  assert.equal(navigations, before, '不能因更新重载正在进行的角色会话');
  assert.equal(await page.$eval('#cInp', input => input.value), '尚未完成的输入');
  assert.equal(await page.$eval('html', element => element.dataset.homeTheme), 'wenwen');
  assert.equal(await page.$eval('#formModal', element => element.classList.contains('open')), true);
  console.log('✓ 会话或表单进行中更新不会丢失输入');

  // A failed installation must leave the previous worker and its cache usable.
  await page.evaluate(async () => {
    window.__failedInstall = false;
    const registration = await navigator.serviceWorker.getRegistration();
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'redundant') window.__failedInstall = true;
      });
    });
  });
  phase = 'fault';
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForFunction(() => window.__failedInstall, { timeout: 15000 });
  assert.equal(await page.evaluate(async name => (await caches.keys()).includes(name), cacheName), true);
  assert.equal(await page.$eval('#cInp', input => input.value), '尚未完成的输入');
  assert.equal(navigations, before, '失败的更新不能中断当前会话');
  const fallbackPage = await browser.newPage();
  await fallbackPage.goto(base, { waitUntil: 'domcontentloaded' });
  await fallbackPage.waitForSelector('#traitOptions button', { timeout: 15000 });
  assert.equal(await fallbackPage.$eval('#traitSelection', element => element.hidden), false, '服务错误时应回落到已缓存的页面');
  await fallbackPage.close();
  console.log('✓ 更新或页面请求异常时，旧缓存及当前会话仍可用');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
