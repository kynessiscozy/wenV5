/* 漏斗单一入口下的离线回归（生产构建，挂在 /demo/ 子路径）。
 *
 * 旧版这个脚本逐一转动特质轮盘，验证 10 个角色的离线素材；漏斗成为唯一
 * 入口后轮盘不可交互，那些断言已不适用。现在改为验证新的离线契约：
 *   · 缓存版本跟随 sw.js，旧的 wenda-cache-v* 被清理
 *   · manifest / 图标 / 首页 HTML 离线可用
 *   · funnel.html 作为独立导航目标离线可打开
 *   · 四位引路人的立绘已预缓存
 *   · 离线也能从待机入口卡打开表单、完成推演并得到报告
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import puppeteer from 'puppeteer';

const root = resolve('dist');
const swSource = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const expectedCache = swSource.match(/const CACHE\s*=\s*'([^']+)'/)?.[1];
assert.ok(expectedCache, 'sw.js 应声明 CACHE 常量');
const expectedVersion = Number(expectedCache.match(/v(\d+)$/)?.[1]);
const personaPosters = ['art/diyan-lord.webp', 'art/yuchen-lord.webp', 'art/yuebai-lord.webp', 'art/xiyao-lord.webp'];
for (const asset of personaPosters) {
  assert.ok(swSource.includes(`'${asset}'`), `${asset} 必须列入离线可选素材`);
}

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json',
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
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/demo/`;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__wenFlow && typeof window.TJOpenForm === 'function' &&
    document.getElementById('entryFallback') && !document.getElementById('entryFallback').hidden, { timeout: 20000 });
  console.log('✓ 在线首屏显示可操作的待机入口卡');

  const cdp = await page.createCDPSession();
  const manifest = await cdp.send('Page.getAppManifest');
  assert.equal(manifest.url, `${base}manifest.webmanifest`);
  assert.deepEqual(manifest.errors, [], '浏览器应能解析生产清单');
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installabilityErrors.filter(error => /icon|manifest/i.test(error.errorId)), [],
    '浏览器不应报告图标或清单安装错误');
  await cdp.detach();

  // A clean visitor installs the worker without any test-side registration.
  await page.waitForFunction(async ({ name, version }) => {
    const keys = await caches.keys();
    return (await navigator.serviceWorker.getRegistrations()).length === 1 &&
      !!navigator.serviceWorker.controller && keys.includes(name) &&
      !keys.some(key => {
        const old = /^wenda-cache-v(\d+)$/.exec(key);
        return old && Number(old[1]) >= 17 && Number(old[1]) < version;
      });
  }, { timeout: 30000 }, { name: expectedCache, version: expectedVersion });
  console.log('✓ 自动安装新版 worker 并清理旧缓存');

  const required = [
    './manifest.webmanifest', './icon-twins-128.png', './apple-touch-icon-twins.png',
    './icon-twins-192.png', './icon-twins-512.png', './icon-twins-maskable-192.png', './icon-twins-maskable-512.png',
    ...personaPosters.map(a => './' + a),
  ];
  const missing = await page.evaluate(async ({ name, urls }) => {
    const cache = await caches.open(name);
    const found = await Promise.all(urls.map(url => cache.match(new URL(url, location.href))));
    return urls.filter((_, index) => !found[index]);
  }, { name: expectedCache, urls: required });
  assert.deepEqual(missing, [], `离线清单 / 图标 / 引路人立绘必须缓存：缺 ${missing.join(', ')}`);
  console.log('✓ 清单、图标与四位引路人立绘均已缓存');

  // Independent navigation target: previously every offline navigation fell
  // back to index.html, so the funnel entry could not be reopened offline.
  const funnel = await browser.newPage();
  funnel.on('pageerror', error => errors.push(error.message));
  await funnel.goto(base + 'funnel.html', { waitUntil: 'domcontentloaded' });
  await funnel.waitForFunction(async name => {
    const keys = await caches.keys();
    return keys.includes(name) && !!(await (await caches.open(name)).match(new URL('./funnel.html', location.href)));
  }, { timeout: 20000 }, expectedCache);
  await funnel.close();
  console.log('✓ 漏斗页作为独立导航页写入缓存');

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.TJOpenForm === 'function' &&
    !document.getElementById('entryFallback').hidden && !!document.documentElement.dataset.homeTheme, { timeout: 20000 });
  console.log('✓ 离线刷新后主应用与角色主题仍可用');

  const offlineFunnel = await browser.newPage();
  offlineFunnel.on('pageerror', error => errors.push(error.message));
  await offlineFunnel.setOfflineMode(true);
  await offlineFunnel.goto(base + 'funnel.html', { waitUntil: 'domcontentloaded' });
  await offlineFunnel.waitForSelector('#btnStart', { timeout: 15000 });
  assert.equal(await offlineFunnel.$eval('#btnStart', el => !!el.textContent.trim()), true);
  await offlineFunnel.close();
  console.log('✓ 离线仍可打开漏斗入口页');

  // The whole funnel-only path works without a network: idle → form → result
  // scene (explicit confirmation) → report.
  await page.click('#entryFallback .ef-primary');
  await page.waitForSelector('#formModal.open');
  await page.$eval('#bDate', el => { el.value = '1989-03-29'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.$eval('#bTime', el => { el.value = '11:23'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('.character-form-submit');
  await page.waitForFunction(() => document.getElementById('calculationOverlay')?.dataset.calculationState === 'ready', { timeout: 15000 });
  await page.click('#calculationContinue');
  await page.waitForFunction(() => document.body.classList.contains('report-active') &&
    !!document.querySelector('#characterResultHero [data-report-value="day-master"]')?.textContent.trim(), { timeout: 15000 });
  console.log('✓ 离线完成一次真实推演并进入报告');

  // Closing the form from a report restores the report; the fallback card is
  // never replaced by a silent redirect.
  await page.evaluate(() => window.goBack());
  await page.waitForFunction(() => document.getElementById('formModal').classList.contains('open'));
  assert.equal(await page.evaluate(() => location.pathname), new URL(base + 'index.html').pathname);
  await page.evaluate(() => window.TJCloseForm());
  await page.waitForFunction(() => document.body.classList.contains('report-active'));
  console.log('✓ 离线返回 / 关闭表单不会强制跳页');

  assert.deepEqual(errors, [], '离线流程不应有页面脚本错误');
  console.log('\n✓ 漏斗单一入口离线链路完整');
} finally {
  await browser.close();
  server.close();
}
