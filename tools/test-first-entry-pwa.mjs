/* Production subpath regression: first visit, PWA start page, and v2 DB repair. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import puppeteer from 'puppeteer';
import { HOME_THEMES } from '../src/ui/home-theme.js';
import { themeForPersona } from '../src/ui/entry-personas.js';
import { buildGuidePerspective } from '../src/ui/guide-perspective.js';

const root = resolve('dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!path.startsWith('/demo/')) return res.writeHead(404).end();
  const file = resolve(root, path.slice('/demo/'.length) || 'index.html');
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  // Videos are optional; exercise poster fallbacks without downloading them.
  if (extname(file) === '.mp4') return res.writeHead(404).end();
  try { res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/demo/`;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => location.pathname.endsWith('/funnel.html') && !!document.querySelector('#btnStart'));
  const bounds = await page.evaluate(() => {
    const menu = document.querySelector('#btnMenu').getBoundingClientRect();
    const roles = document.querySelector('.persona-switch').getBoundingClientRect();
    return { menuRight: menu.right, rolesLeft: roles.left, rolesRight: roles.right, width: innerWidth };
  });
  assert.ok(bounds.menuRight <= bounds.rolesLeft && bounds.rolesRight <= bounds.width, '窄屏菜单与角色切换不能重叠或溢出');
  assert.equal(await page.$eval('#entryVideo', el => el.getAttribute('src')), './art/yuebai-entry.mp4');
  assert.equal(await page.$eval('#entryVideo', el => el.getAttribute('poster')), './art/yuebai-lord.webp');
  assert.equal(await page.$eval('#personaLabel', el => el.textContent), '月白');
  assert.equal(await page.$eval('#personaToggle', el => el.getAttribute('aria-expanded')), 'false');
  assert.equal(await page.$eval('#personaOptions', el => el.hidden), true);
  await page.click('#personaToggle');
  assert.equal(await page.$eval('#personaToggle', el => el.getAttribute('aria-expanded')), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#personaOptions', el => el.hidden), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'personaToggle');
  const paletteGradients = new Set();
  for (const [key, name, video] of [
    ['diyan', '焱绒', 'diyan-entry2.mp4'], ['yuchen', '祢玉', 'yuchen-entry.mp4'],
    ['xiyao', '夕瑶', 'xiyao-entry.mp4'], ['moonfox', '月白', 'yuebai-entry.mp4'],
  ]) {
    await page.click('#personaToggle');
    await page.click(`#personaOptions [data-persona="${key}"]`);
    assert.equal(await page.$eval('#personaLabel', el => el.textContent), name);
    assert.equal(await page.$eval('#personaPerspective', el => el.textContent), name + ' · ' + buildGuidePerspective(themeForPersona(key)).focus);
    assert.equal(await page.$eval('#entryVideo', el => el.getAttribute('aria-label')), name);
    assert.equal(await page.$eval('#qwhoName', el => el.textContent), name + ' 问');
    assert.ok((await page.$eval('#ltext', el => el.textContent)).startsWith(name));
    assert.equal(await page.$eval('#entryVideo', el => el.getAttribute('src')), './art/' + video);
    const palette = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        persona: document.documentElement.dataset.funnelPersona,
        accent: root.getPropertyValue('--gold').trim(),
        background: root.getPropertyValue('--bg').trim(),
        buttonTop: root.getPropertyValue('--button-top').trim(),
        meta: document.querySelector('meta[name="theme-color"]').content,
        cta: getComputedStyle(document.querySelector('#btnStart')).backgroundImage,
        backdrop: getComputedStyle(document.querySelector('.bg')).backgroundImage,
      };
    });
    const reportTheme = HOME_THEMES[themeForPersona(key)];
    assert.equal(palette.persona, key);
    assert.equal(palette.accent, reportTheme.trait.color, '首屏强调色与报告角色一致');
    assert.equal(palette.meta, palette.background, '浏览器主题色与首屏背景一致');
    assert.ok(palette.backdrop.includes(reportTheme.backdrop.mobile.slice(2)), '窄屏背景使用对应角色场景');
    assert.ok(palette.cta.includes('linear-gradient'), '首屏按钮使用角色主题渐变');
    paletteGradients.add(palette.cta);
    const channels = palette.buttonTop.slice(1).match(/../g).map(x => parseInt(x, 16) / 255)
      .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    const luminance = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    assert.ok(1.05 / (luminance + .05) >= 4.5, '首屏按钮文字与主题色对比度至少 4.5');
    assert.equal(await page.$eval(`#personaOptions [data-persona="${key}"]`, el => el.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$eval('#personaOptions', el => el.hidden), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('wen_funnel_persona')), key);
    if (key === 'diyan' || key === 'yuchen') {
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#personaLabel', el => el.textContent), name, '旧角色标识仍能恢复新名称');
      assert.equal(await page.$eval('html', el => el.dataset.funnelPersona), key, '刷新后恢复选中角色的主题');
    }
  }
  assert.equal(paletteGradients.size, 4, '四个人物的首屏按钮使用不同配色');
  await page.click('#personaToggle');
  await page.click('#personaOptions [data-persona="xiyao"]');
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.$eval('#personaLabel', el => el.textContent), '夕瑶', '再次进入时保留用户选择');
  assert.equal(await page.$eval('html', el => el.dataset.funnelPersona), 'xiyao');
  await page.setViewport({ width: 1280, height: 800 });
  assert.ok((await page.$eval('.bg', el => getComputedStyle(el).backgroundImage)).includes('xingling-room-wide.webp'), '桌面展示对应角色的宽屏背景');
  await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
  await page.evaluate(() => localStorage.setItem('wen_funnel_persona', 'unknown'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.$eval('#personaLabel', el => el.textContent), '月白', '无效角色应回退月白');
  await page.click('#personaToggle');
  await page.click('#s-entry .entry-shade');
  assert.equal(await page.$eval('#personaOptions', el => el.hidden), true, '点击外部收起人物选择');
  console.log('✓ 首次展示月白，人物选择可折叠并记住选择');
  const session = await page.createCDPSession();
  const manifest = await session.send('Page.getAppManifest');
  assert.equal(manifest.url, base + 'manifest.webmanifest');
  assert.deepEqual(manifest.errors, []);
  await page.waitForFunction(async () => !!navigator.serviceWorker.controller && !!(await navigator.serviceWorker.getRegistration()), { timeout: 30000 });
  const installability = await session.send('Page.getInstallabilityErrors');
  assert.deepEqual(installability.installabilityErrors, [], '入口页应满足浏览器安装检查');
  await session.detach();
  console.log('✓ 全新根路径进入漏斗，首访即注册 PWA');

  await page.click('#btnMenu');
  await page.waitForFunction(() => document.querySelector('#fmDrawer.open'));
  const schema = await page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('TJ_Bazi');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const result = { version: db.version, store: db.objectStoreNames.contains('profiles') };
      if (result.store) result.index = db.transaction('profiles').objectStore('profiles').indexNames.contains('updatedAt');
      db.close(); resolve(result);
    };
  }));
  assert.deepEqual(schema, { version: 3, store: true, index: true });
  await page.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__wenAppReady && !!window.__wenProfilesReady, { timeout: 30000 });
  await page.evaluate(() => window.__wenProfilesReady);
  assert.deepEqual(errors, []);
  console.log('✓ 首次打开菜单后主应用可读取档案库');

  await page.setOfflineMode(true);
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => location.pathname.endsWith('/funnel.html') && !!document.querySelector('#btnStart'));
  assert.equal(await page.$eval('html', el => el.dataset.funnelPersona), 'moonfox');
  await page.click('#personaToggle');
  await page.click('#personaOptions [data-persona="xiyao"]');
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.$eval('html', el => el.dataset.funnelPersona), 'xiyao', '离线刷新保留角色配色');
  await page.click('#personaToggle');
  await page.click('#personaOptions [data-persona="moonfox"]');
  await page.click('#btnStart');
  await page.click('#btnSkipStory');
  await page.click('#quitFunnel');
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#confirmFunnelExit')]);
  assert.ok(await page.$eval('#s-entry', el => el.classList.contains('active')), '离线也可以退出填写');
  await page.goto(base + 'funnel.html?stats', { waitUntil: 'domcontentloaded' });
  assert.ok(await page.$eval('h1', el => el.textContent.includes('漏斗步数')));
  await page.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__wenAppReady && !document.getElementById('entryFallback')?.hidden, { timeout: 30000 });
  console.log('✓ 首访缓存后，根路径、带参数入口与主应用可离线启动');

  await page.goto(base + 'funnel.html', { waitUntil: 'domcontentloaded' });
  await page.click('#btnStart');
  await page.click('#btnSkipStory');
  async function step(number, selector, value) {
    await page.waitForFunction(n => document.querySelector('#s-quiz.active') &&
      document.querySelector('#pcount')?.textContent.startsWith(n + ' /'), {}, number);
    // Wait for the previous transition lock as well as the visible question.
    await new Promise(resolve => setTimeout(resolve, 650));
    if (value) await page.$eval('#qmount input', (input, v) => { input.value = v; }, value);
    await page.click(selector);
  }
  await step(1, '#qmount .opt');
  await step(2, '#qmount .btn.primary', '1990-06-15');
  await step(3, '#qmount .btn.ghost');
  await step(4, '#qmount .btn.ghost');
  await step(5, '#qmount .opt');
  await step(6, '#qmount .btn.ghost');
  await step(7, '#qmount .btn.ghost');
  await page.waitForFunction(() => location.pathname.endsWith('/index.html') &&
    document.body.classList.contains('report-active'), { timeout: 30000 });
  assert.ok(await page.$eval('#characterResultHero [data-report-value="day-master"]', el => el.textContent.trim()));
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wen_funnel_v1')).trait), 'moonfox');
  assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'moonfox');
  assert.equal(await page.$eval('.guide-perspective-title', el => el.textContent), '线索与依据');
  assert.ok((await page.$eval('.guide-perspective-facts.sys-eastern', el => el.textContent)).includes('日柱'));
  assert.ok((await page.$eval('.guide-perspective-note', el => el.textContent)).includes('不改变排盘或评分'));
  assert.deepEqual(errors, []);
  console.log('✓ 离线从漏斗问卷交接到真实报告');
  await context.close();

  const deepContext = await browser.createBrowserContext();
  const deep = await deepContext.newPage();
  await deep.goto(base + '?panel=about', { waitUntil: 'domcontentloaded' });
  await deep.waitForSelector('#aboutModal.open', { timeout: 30000 });
  assert.equal(new URL(deep.url()).pathname, '/demo/');
  await deepContext.close();
  console.log('✓ 根路径的已有面板深链仍然生效');

  for (const withProfile of [false, true]) {
    const ctx = await browser.createBrowserContext();
    const tab = await ctx.newPage();
    tab.on('pageerror', error => errors.push(error.message));
    await tab.goto(base + 'funnel.html', { waitUntil: 'domcontentloaded' });
    await tab.evaluate(withProfile => new Promise((resolve, reject) => {
      const req = indexedDB.open('TJ_Bazi', 2);
      req.onupgradeneeded = () => {
        if (withProfile) {
          const store = req.result.createObjectStore('profiles', { keyPath: 'id', autoIncrement: true });
          store.createIndex('updatedAt', 'updatedAt');
          store.add({ name: '保留的档案', updatedAt: 1 });
        }
      };
      req.onsuccess = () => { req.result.close(); resolve(); };
      req.onerror = () => reject(req.error);
    }), withProfile);
    if (withProfile) {
      await tab.click('#personaToggle');
      await tab.click('#personaOptions [data-persona="yuchen"]');
      // An older handoff must not override the guide selected for this profile.
      await tab.evaluate(() => localStorage.setItem('wen_funnel_v1', JSON.stringify({ trait: 'diyan', bd: '1990-01-01', applied: 1, teasered: 1 })));
    }
    await tab.click('#btnMenu');
    await tab.waitForFunction(() => document.querySelector('#fmDrawer.open'));
    if (withProfile) {
      await tab.waitForFunction(() => document.querySelector('#fmProfiles')?.textContent.includes('保留的档案'));
      await Promise.all([tab.waitForNavigation({ waitUntil: 'domcontentloaded' }), tab.click('#fmProfiles .fm-card')]);
      await tab.waitForFunction(() => document.documentElement.dataset.homeTheme === 'yuchen', { timeout: 20000 });
    } else await tab.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
    await tab.waitForFunction(() => !!window.__wenProfilesReady, { timeout: 30000 });
    await tab.evaluate(() => window.__wenProfilesReady);
    const result = await tab.evaluate(() => new Promise((resolve, reject) => {
      const req = indexedDB.open('TJ_Bazi');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('profiles')) { db.close(); return resolve(null); }
        const get = db.transaction('profiles').objectStore('profiles').getAll();
        get.onsuccess = () => { const names = get.result.map(p => p.name); db.close(); resolve(names); };
        get.onerror = () => reject(get.error);
      };
    }));
    assert.deepEqual(result, withProfile ? ['保留的档案'] : []);
    await ctx.close();
  }
  assert.deepEqual(errors, []);
  console.log('✓ 修复旧空数据库，同时保留已有档案');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
