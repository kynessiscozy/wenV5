import { spinFor } from './trait-picker-helper.mjs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const ids = ['wenwen', 'moonfox', 'diyan', 'yuchen', 'qinglan', 'xingling', 'luye', 'suyan', 'rongrong', 'zhiya'];

async function openPage(motion = 'no-preference') {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 390, height: 844 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#traitSpin');
  await page.waitForFunction(() => document.getElementById('traitMachine')?.dataset.ready === 'true');
  return { page, context };
}

async function waitForChoice(page, id) {
  await page.waitForFunction(role => document.getElementById('traitSelection').hidden && document.documentElement.dataset.homeTheme === role, { timeout: 8000 }, id);
}

try {
  {
    const { page, context } = await openPage();
    assert.equal(await page.$$('.trait-side-reel').then(els => els.length), 2);
    assert.equal(await page.$eval('#traitCancel', el => el.hidden), true, '首次进入不能跳过选择');
    await page.click('#traitSpin');
    await page.waitForFunction(() => document.getElementById('traitMachine').dataset.spinning === 'true');
    assert.equal(await page.$eval('#traitSpin', el => el.disabled), true);
    assert.equal(await page.$eval('#traitLever', button => button.disabled), true);
    assert.equal(await page.$('#traitOptions'), null, '不能提供直接选择列表');
    await delay(150);
    const moving = await page.$eval('#traitReelTrack', el => ({ animations: el.getAnimations().length, transform: getComputedStyle(el).transform }));
    assert.ok(moving.animations > 0 && moving.transform !== 'none', '转轮应实际运动，而非静态装饰');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#traitSelection', el => el.hidden), false, '首次选择时 Escape 不应跳过');
    await page.waitForFunction(() => !document.getElementById('traitConfirm').hidden && document.getElementById('traitMachine').dataset.spinning === 'false', { timeout: 5000 });
    let outcome = await page.$eval('#traitConfirm', el => ({ id: el.dataset.result, text: el.textContent }));
    assert.ok(ids.includes(outcome.id));
    assert.match(outcome.text, /^选择「.+」$/);
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), undefined, '随机结果在确认前不能自动应用');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'traitConfirm');
    assert.ok((await page.$eval('#traitReelTrack', el => el.textContent)).includes(outcome.text.slice(3, -1)), '转轮展示实际结果');
    assert.ok((await page.$eval('#traitStatus', el => el.textContent)).includes('转到了'));
    await page.click('#traitLever');
    await page.waitForFunction(() => document.getElementById('traitMachine').dataset.spinning === 'true');
    await page.waitForFunction(() => document.getElementById('traitMachine').dataset.spinning === 'false', { timeout: 5000 });
    outcome = await page.$eval('#traitConfirm', el => ({ id: el.dataset.result, text: el.textContent }));
    assert.ok(ids.includes(outcome.id), '可再次拉动并确认结果');
    await page.click('#traitConfirm');
    await waitForChoice(page, outcome.id);

    await page.evaluate(() => {
      const sentinel = document.createElement('div');
      sentinel.id = 'traitTestSentinel';
      sentinel.setAttribute('inert', '');
      sentinel.setAttribute('aria-hidden', 'true');
      document.body.append(sentinel);
      document.getElementById('bDate').value = '1988-07-23';
    });
    await page.click('#homeTraitReset');
    await page.evaluate(() => {
      const late = document.createElement('div');
      late.id = 'lateTraitBackground';
      document.body.append(late);
    });
    await page.waitForFunction(() => document.getElementById('lateTraitBackground').inert);
    await page.click('#traitSpin');
    await page.waitForFunction(() => document.getElementById('traitMachine').dataset.spinning === 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#traitSelection', el => el.hidden), true, '转动期间允许取消重选');
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), outcome.id);
    assert.equal(await page.$eval('#traitTestSentinel', el => el.inert && el.getAttribute('aria-hidden') === 'true'), true, '恢复此前的背景状态');
    assert.equal(await page.$eval('#lateTraitBackground', el => !el.inert && !el.hasAttribute('aria-hidden')), true, '新添加的背景也应在关闭时恢复');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeTraitReset');
    const next = outcome.id === 'suyan' ? 'diyan' : 'suyan';
    await page.click('#homeTraitReset');
    await spinFor(page, next);
    await waitForChoice(page, next);
    await delay(1700); // A cancelled spin must not finish into the new selection.
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), next);
    assert.equal(await page.$eval('#bDate', el => el.value), '1988-07-23', '重选不能清空未提交的表单输入');
    await context.close();
    console.log('✓ 真转动、再转、确认、取消竞态、背景和表单保持');
  }

  {
    const { page, context } = await openPage('reduce');
    const start = Date.now();
    await page.click('#traitSpin');
    await page.waitForFunction(() => !document.getElementById('traitConfirm').hidden, { timeout: 3000 });
    assert.ok(Date.now() - start < 1000, '减少动态时应直接显示结果，无长时间转轮');
    assert.equal(await page.$eval('#traitReelTrack', el => el.getAnimations().length), 0);
    assert.equal(await page.$eval('#traitMachine .trait-lever-arm', el => getComputedStyle(el).animationName), 'none');
    const result = await page.$eval('#traitConfirm', el => el.dataset.result);
    await page.click('#traitConfirm');
    await waitForChoice(page, result);
    await context.close();
    const changing = await openPage();
    await changing.page.click('#traitSpin');
    await changing.page.waitForFunction(() => document.getElementById('traitMachine').dataset.spinning === 'true');
    await changing.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await changing.page.waitForFunction(() => !document.getElementById('traitConfirm').hidden, { timeout: 1500 });
    assert.equal(await changing.page.$eval('#traitReelTrack', el => el.getAnimations().length), 0, '运行中启用减少动态应立即停止转轮');
    await changing.context.close();
    console.log('✓ 减少动态及运行中切换均可直接显示随机结果');
  }

  // Each new outcome is reachable only through the real random reel and the
  // public result and accessible name never reveal its internal character name.
  {
    const { page, context } = await openPage('reduce');
    for (const [id, label, internalName] of [['rongrong', '可爱', '绒绒'], ['zhiya', '天真', '纸鸢']]) {
      await spinFor(page, id, { confirm: false });
      assert.equal(await page.$eval('#traitConfirm', button => button.textContent), `选择「${label}」`);
      assert.ok(!(await page.$eval('#traitSelection', el => el.textContent)).includes(internalName));
      const tree = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
      assert.ok(!tree.nodes.some(node => !node.ignored && String(node.name?.value || '').includes(internalName)));
      await page.click('#traitConfirm');
      await waitForChoice(page, id);
      assert.ok((await page.$eval('#characterPortraitButton', button => button.getAttribute('aria-label'))).includes(label));
      if (id === 'rongrong') await page.click('#homeTraitReset');
    }
    await context.close();
    console.log('✓ 可爱、天真均可随机抽取，界面和读屏只暴露特质');
  }

  // Two very slow successive portraits must not unmask or restore an old one.
  {
    const { page, context } = await openPage('reduce');
    // Exercise network stalls, not the worker's pre-cached artwork.
    await page.setBypassServiceWorker(true);
    await spinFor(page, 'wenwen');
    await waitForChoice(page, 'wenwen');
    await page.setRequestInterception(true);
    const held = { yuchen: [], suyan: [] };
    let failMoon = false;
    page.on('request', request => {
      if (failMoon && request.url().endsWith('/moon-fox-reimagined.webp')) request.abort('failed').catch(() => {});
      else if (request.url().endsWith('/yuchen-empress.webp')) held.yuchen.push(request);
      else if (request.url().endsWith('/suyan.webp')) held.suyan.push(request);
      else request.continue().catch(() => {});
    });
    await page.click('#homeTraitReset');
    await spinFor(page, 'yuchen');
    await waitForChoice(page, 'yuchen');
    assert.ok(held.yuchen.length, '第一张慢图应被拦截');
    await page.click('#homeTraitReset');
    await spinFor(page, 'suyan');
    await waitForChoice(page, 'suyan');
    assert.ok(held.suyan.length, '第二张慢图应被拦截');
    assert.equal(await page.$eval('[data-character-asset="portrait"]', el => el.classList.contains('is-scene-image-loading')), true);
    await page.$eval('[data-character-asset="portrait"]', el => { el.dispatchEvent(new Event('load')); el.dispatchEvent(new Event('error')); });
    assert.equal(await page.$eval('[data-character-asset="portrait"]', el => el.classList.contains('is-scene-image-loading')), true, '旧图的迟到事件不能提前显示新图');
    await Promise.all(held.yuchen.map(request => request.continue().catch(() => {})));
    await delay(250);
    assert.equal(await page.$eval('[data-character-asset="portrait"]', el => el.classList.contains('is-scene-image-loading')), true);
    await Promise.all(held.suyan.map(request => request.continue().catch(() => {})));
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-character-asset="portrait"]');
      return image.complete && image.naturalWidth > 0 && image.currentSrc.endsWith('/suyan.webp') && !image.classList.contains('is-scene-image-loading');
    }, { timeout: 6000 });
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'suyan');
    failMoon = true;
    await page.click('#homeTraitReset');
    await spinFor(page, 'moonfox');
    await waitForChoice(page, 'moonfox');
    await page.waitForFunction(() => document.getElementById('homeLoadingStatus').textContent.includes('无法加载'), { timeout: 5000 });
    await page.click('#homeTraitReset');
    await spinFor(page, 'wenwen');
    await waitForChoice(page, 'wenwen');
    assert.equal(await page.$eval('#homeLoadingStatus', el => el.textContent), '', '换回正常素材后不应保留旧错误提示');
    await context.close();
    console.log('✓ 连续弱网重选不闪回旧人物，错误素材可恢复');
  }

  assert.deepEqual(errors, [], '选择器不应产生未捕获的脚本错误');
} finally {
  await browser.close();
}
