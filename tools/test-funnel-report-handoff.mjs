/* Browser regression for the actual funnel → teaser → interactive report path. */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.BASE_URL || 'http://127.0.0.1:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];

async function monitor(page) {
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    window.__reelVisible = false;
    const check = () => {
      const reel = document.getElementById('traitSelection');
      if (reel && getComputedStyle(reel).display !== 'none' && reel.getClientRects().length) window.__reelVisible = true;
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

async function assertTeaserToReport(page, name, theme, exit = 'cta') {
  await page.waitForSelector('#funnelTeaser .ft-cta', { visible: true, timeout: 30000 });
  assert.equal(await page.$eval('#funnelTeaser .ft-kicker', el => el.textContent), name + ' · 命盘预告');
  assert.equal(await page.$eval('html', el => el.dataset.homeTheme), theme);
  assert.equal(await page.$eval('#traitSelection', el => getComputedStyle(el).display), 'none');
  assert.equal(await page.evaluate(() => window.__reelVisible), false, '老虎机不得在交接期间闪现');
  assert.equal(await page.$eval('#page2', el => el.inert), true, '预告打开时报告不可交互');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'ft-cta');

  // Simulate an old cached script trying to reopen the obsolete picker.
  await page.$eval('#traitSelection', el => { el.hidden = false; });
  assert.equal(await page.$eval('#traitSelection', el => getComputedStyle(el).display), 'none');
  if (exit === 'escape') await page.keyboard.press('Escape');
  else await page.click(exit === 'skip' ? '#funnelTeaser .ft-skip' : exit === 'close' ? '#funnelTeaser .ft-close' : '#funnelTeaser .ft-cta');
  await page.waitForFunction(() => !document.getElementById('funnelTeaser'));
  assert.equal(await page.$eval('#page2', el => el.inert), false, '关闭预告后报告必须恢复交互');
  assert.equal(await page.$eval('#page2', el => el.classList.contains('active')), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'p2MenuBtn');
  assert.ok(await page.$eval('#characterResultHero [data-report-value="day-master"]', el => el.textContent.trim()));
  await page.click('#p2MenuBtn');
  assert.equal(await page.$eval('#p2MenuDrawer', el => el.classList.contains('open')), true, '报告菜单必须真的可点击');
  assert.equal(await page.evaluate(() => window.__reelVisible), false);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wen_funnel_v1')).teasered), 1);
}

try {
  // Exercise the real seven-question entry, not just a fabricated payload.
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await monitor(page);
  await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
  await page.goto(base + 'funnel.html', { waitUntil: 'domcontentloaded' });
  await page.click('#personaToggle');
  await page.click('#personaOptions [data-persona="xiyao"]');
  await page.click('#btnStart');
  await page.click('#btnSkipStory');
  async function step(number, selector, value) {
    await page.waitForFunction(n => document.querySelector('#s-quiz.active') && document.querySelector('#pcount')?.textContent.startsWith(n + ' /'), {}, number);
    await sleep(650);
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
  await page.waitForFunction(() => location.pathname.endsWith('/index.html'), { timeout: 30000 });
  await assertTeaserToReport(page, '夕瑶', 'xingling');
  await ctx.close();
  console.log('✓ 手机真实问卷 → 夕瑶预告 → 可操作报告，期间没有老虎机');

  // Slow optional artwork used to leave the report inert, and caused an early
  // calculation to use the wrong guide. Verify while requests are still stalled.
  const slowCtx = await browser.createBrowserContext();
  const slow = await slowCtx.newPage();
  await monitor(slow);
  await slow.setViewport({ width: 1280, height: 800 });
  await slow.setRequestInterception(true);
  let stalled = 0;
  slow.on('request', request => {
    if (/\/(yuchen-empress|yuchen-hall).*\.webp/.test(request.url())) {
      stalled++;
      setTimeout(() => { if (!request.isInterceptResolutionHandled()) request.continue().catch(() => {}); }, 15000).unref();
    } else request.continue().catch(() => {});
  });
  await slow.goto(base + 'funnel.html', { waitUntil: 'domcontentloaded' });
  await slow.evaluate(() => {
    localStorage.setItem('wen_funnel_persona', 'yuchen');
    localStorage.setItem('wen_funnel_v1', JSON.stringify({ trait: 'yuchen', bd: '1990-06-15', gen: 'male', timeStr: '12:00', cityName: '上海', concerns: [], applied: 0 }));
  });
  await slow.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  await assertTeaserToReport(slow, '玉宸', 'yuchen', 'escape');
  assert.ok(stalled > 0, '测试必须拦截到玉宸素材');
  await slow.reload({ waitUntil: 'domcontentloaded' });
  await slow.waitForFunction(() => !!window.__wenAppReady && window.__wenFlow?.state === 'idle', { timeout: 30000 });
  assert.equal(await slow.$('#funnelTeaser'), null, '已完成的问卷不能刷新后重复出现预告');
  assert.equal(await slow.$eval('#traitSelection', el => getComputedStyle(el).display), 'none');
  await slowCtx.close();
  console.log('✓ 慢素材与 Esc 退出时角色正确、报告可交互，刷新不重播');

  for (const [persona, name, exit] of [['moonfox', '月白', 'skip'], ['diyan', '焱绒', 'close']]) {
    const otherCtx = await browser.createBrowserContext();
    const other = await otherCtx.newPage();
    await monitor(other);
    await other.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await other.goto(base + 'funnel.html', { waitUntil: 'domcontentloaded' });
    await other.evaluate(key => localStorage.setItem('wen_funnel_v1', JSON.stringify({ trait: key, bd: '1990-06-15', gen: 'male', cityName: '上海', concerns: [], applied: 0 })), persona);
    await other.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
    await assertTeaserToReport(other, name, persona, exit);
    await otherCtx.close();
  }
  console.log('✓ 月白和焱绒预告的跳过与关闭也直接进入可操作报告');

  // A previously consumed questionnaire must not place its preview over a
  // different saved profile or a newly entered manual calculation.
  const oldCtx = await browser.createBrowserContext();
  const old = await oldCtx.newPage();
  await monitor(old);
  await old.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await old.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  await old.waitForFunction(() => !!window.__wenProfilesReady && !!window.TJOpenForm, { timeout: 30000 });
  await old.evaluate(() => window.__wenProfilesReady);
  const profileId = await old.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('TJ_Bazi');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const transaction = db.transaction('profiles', 'readwrite');
      const add = transaction.objectStore('profiles').add({ name: '另一份档案', bd: '1988-02-10', timeStr: '10:00', bp: 'shanghai', gen: 'male', updatedAt: Date.now() });
      add.onsuccess = () => resolve(add.result);
      add.onerror = () => reject(add.error);
      transaction.oncomplete = () => db.close();
    };
  }));
  await old.evaluate(id => {
    localStorage.setItem('wen_funnel_v1', JSON.stringify({ trait: 'diyan', bd: '1990-06-15', name: '旧预告', applied: 1, concerns: [] }));
    localStorage.setItem('wen_load_profile_v1', String(id));
  }, profileId);
  await old.reload({ waitUntil: 'domcontentloaded' });
  await old.waitForFunction(() => document.querySelector('#calculationOverlay')?.dataset.calculationState === 'ready', { timeout: 30000 });
  await old.click('#calculationContinue');
  await old.waitForFunction(() => document.body.classList.contains('report-active'));
  assert.equal(await old.$('#funnelTeaser'), null, '读取档案不能显示旧问卷预告');
  assert.equal(await old.$eval('#bDate', el => el.value), '1988-02-10');
  await old.evaluate(() => window.goBack());
  await old.waitForSelector('#formModal.open');
  await old.$eval('#bDate', el => { el.value = '1995-04-03'; });
  await old.click('.character-form-submit');
  await old.waitForFunction(() => document.querySelector('#calculationOverlay')?.dataset.calculationState === 'ready', { timeout: 30000 });
  await old.click('#calculationContinue');
  await old.waitForFunction(() => document.body.classList.contains('report-active') && !document.querySelector('#formModal.open'));
  assert.equal(await old.$('#funnelTeaser'), null, '手动重推不能显示旧问卷预告');
  assert.equal(await old.$eval('#bDate', el => el.value), '1995-04-03');
  await oldCtx.close();
  console.log('✓ 档案及手动重推不会串入旧问卷预告');

  const corruptCtx = await browser.createBrowserContext();
  const corrupt = await corruptCtx.newPage();
  await corrupt.goto(base + 'funnel.html', { waitUntil: 'domcontentloaded' });
  await corrupt.evaluate(() => {
    localStorage.setItem('wen_funnel_persona', 'yuchen');
    localStorage.setItem('wen_funnel_v1', '{invalid');
  });
  await corrupt.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  await corrupt.waitForFunction(() => window.__wenAppReady && window.__wenFlow?.state === 'idle', { timeout: 30000 });
  assert.equal(await corrupt.$eval('html', el => el.dataset.homeTheme), 'yuchen', '损坏的旧数据不能覆盖已经选定的引路人');
  await corruptCtx.close();
  console.log('✓ 旧问卷数据损坏时仍保留选中的引路人');

  // JS startup can be delayed or fail; the old reel must never be the fallback.
  const blockedCtx = await browser.createBrowserContext();
  const blocked = await blockedCtx.newPage();
  await blocked.setRequestInterception(true);
  blocked.on('request', request => request.url().includes('/src/home.js') ? request.abort() : request.continue());
  await blocked.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  assert.equal(await blocked.$eval('#traitSelection', el => el.hidden), true);
  assert.equal(await blocked.$eval('#traitSelection', el => getComputedStyle(el).display), 'none');
  await blockedCtx.close();
  console.log('✓ 主入口脚本未加载时也不显示旧老虎机');
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
