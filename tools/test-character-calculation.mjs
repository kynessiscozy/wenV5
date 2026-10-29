import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const THEMES = {
  wenwen: { trait: '温柔', portrait: 'wenwen-reimagined.webp', art: 'awakening-scroll.webp', selector: '.calculation-scroll', animation: 'calculation-scroll' },
  moonfox: { trait: '神秘', portrait: 'moon-fox-reimagined.webp', art: 'awakening-fox-fan.webp', selector: '.calculation-tail--left img', animation: 'calculation-tail-left' },
  diyan: { trait: '威严', portrait: 'earthfire-sovereign.webp', art: 'earthfire-flame-seat.webp', selector: '.calculation-fire-seat', animation: 'calculation-fire-seat' },
  yuchen: { trait: '从容', portrait: 'yuchen-empress.webp', art: 'awakening-phoenix-wing.webp', selector: '.calculation-wing--left', animation: 'calculation-wing-left' },
  qinglan: { trait: '洒脱', portrait: 'qinglan.webp', art: 'qinglan-sword.webp', selector: '.calculation-sword', animation: 'calculation-sword-draw' },
  xingling: { trait: '魅惑', portrait: 'xingling.webp', art: 'xingling-fan.webp', selector: '.calculation-star-fan', animation: 'calculation-fan-unfold' },
  luye: { trait: '好奇', portrait: 'luye.webp', art: 'luye-turntable.svg', selector: '.calculation-turntable', animation: 'calculation-turntable-enter', detail: '.calculation-vinyl', detailAnimation: 'calculation-vinyl-spin' },
  suyan: { trait: '自信', portrait: 'suyan.webp', art: 'suyan-camera.svg', selector: '.calculation-camera-prop', animation: 'calculation-camera-focus', detail: '.calculation-camera-iris', detailAnimation: 'calculation-iris-focus' },
};
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function newPage({ theme = 'wenwen', width = 390, height = 844, motion = 'no-preference' } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector(`[data-trait="${theme}"]`);
  await page.click(`[data-trait="${theme}"]`);
  await page.waitForFunction((id, portrait) => {
    const image = document.querySelector('[data-character-asset="portrait"]');
    return window._tools2Ready === true && document.documentElement.dataset.homeReady === 'true' &&
      document.documentElement.dataset.homeTheme === id && image.complete && image.naturalWidth > 0 &&
      image.currentSrc.endsWith('/' + portrait) && !image.classList.contains('is-scene-image-loading');
  }, { timeout: 15000 }, theme, THEMES[theme].portrait);
  return { page, context };
}
async function openForm(page) {
  await page.click('#homeCtaMain');
  await page.waitForSelector('#formModal.open');
}
async function waitForResultScene(page, theme) {
  await page.waitForFunction(id => {
    const scene = document.getElementById('calculationOverlay');
    return !scene.hidden && scene.dataset.calculationState === 'ready' && scene.dataset.calculationTheme === id;
  }, { timeout: 10000 }, theme);
}
async function continueToReport(page) {
  await page.click('#calculationContinue');
  await page.waitForFunction(() => document.body.classList.contains('report-active') && document.getElementById('calculationOverlay').hidden, { timeout: 10000 });
}

try {
  // All eight scenes are activated only by real submissions. Their independent
  // props move behind the correct portrait; the four values come from _ctx.b.
  const sizes = [[320, 568], [390, 844], [568, 320], [844, 390], [1280, 720]];
  for (const [id, config] of Object.entries(THEMES)) {
    for (const [width, height] of sizes) {
      const { page, context } = await newPage({ theme: id, width, height });
      assert.equal(await page.$('#characterAwaken'), null, '首页不再出现错误的觉醒按钮');
      assert.equal(await page.$eval('#calculationOverlay', el => el.hidden), true, '未推演时不显示场景');
      assert.equal(await page.$$eval('.calculation-props img[src]', images => images.length), 0, '推演道具不参与首屏加载');
      assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').filter(e => /awakening-(scroll|fox-fan|phoenix-wing)\.webp/.test(e.name)).length), 0);
      await openForm(page);
      assert.ok(await page.$$eval(`.calculation-props--${id} img`, images => images.length > 0 && images.every(image => image.hasAttribute('src'))), '填写表单时应后台预取当前角色的道具');
      await page.evaluate(() => {
        document.getElementById('bDate').value = '1988-02-24';
        document.getElementById('bTime').value = '14:30';
        window.__sceneStates = [];
        const scene = document.getElementById('calculationOverlay');
        new MutationObserver(() => {
          if (!scene.hidden) window.__sceneStates.push({ state: scene.dataset.calculationState,
            values: [...scene.querySelectorAll('[data-calculation-pillar]')].map(el => el.textContent),
            report: document.body.classList.contains('report-active') });
        }).observe(scene, { attributes: true, attributeFilter: ['data-calculation-state', 'hidden'] });
      });
      await page.click('.character-form-submit');
      await waitForResultScene(page, id);
      await page.waitForFunction((theme, art) => {
        const images = [...document.querySelectorAll(`.calculation-props--${theme} img`)];
        return images.length && images.every(image => image.complete && image.naturalWidth > 0) && images.some(image => image.currentSrc.endsWith('/' + art));
      }, { timeout: 10000 }, id, config.art);
      const state = await page.evaluate((theme, selector) => {
        const scene = document.getElementById('calculationOverlay');
        const target = scene.querySelector(selector);
        const rects = ['calculationContinue', 'calculationByline', 'calculationTitle', 'calculationStatus'].map(key => document.getElementById(key).getBoundingClientRect().toJSON());
        rects.push(scene.querySelector('.calculation-pillars').getBoundingClientRect().toJSON());
        return {
          states: window.__sceneStates,
          title: getComputedStyle(document.getElementById('calculationTitle')).color,
          byline: document.getElementById('calculationByline').textContent,
          portrait: scene.querySelector('[data-calculation-portrait]').currentSrc,
          animation: getComputedStyle(target).animationName,
          subjectAnimation: getComputedStyle(scene.querySelector('.calculation-portrait')).animationName,
          active: getComputedStyle(scene.querySelector(`.calculation-props--${theme}`)).display,
          inactive: [...scene.querySelectorAll('.calculation-props')].filter(el => !el.classList.contains(`calculation-props--${theme}`)).every(el => getComputedStyle(el).display === 'none'),
          inactiveLoaded: [...scene.querySelectorAll('.calculation-props')].filter(el => !el.classList.contains(`calculation-props--${theme}`)).some(el => el.querySelector('img[src]')),
          values: [...scene.querySelectorAll('[data-calculation-pillar]')].map(el => el.textContent),
          actual: ['Y', 'M', 'D', 'H'].map(key => window._ctx.b[key].g + window._ctx.b[key].z),
          focus: document.activeElement.id, formOpen: document.getElementById('formModal').classList.contains('open'),
          formInert: document.getElementById('formModal').inert, pageInert: document.getElementById('page1').inert,
          report: document.body.classList.contains('report-active'),
          portraitZ: Number(getComputedStyle(scene.querySelector('.calculation-portrait')).zIndex),
          rects, viewport: [innerWidth, innerHeight], scroll: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
        };
      }, id, config.selector);
      assert.ok(state.states.some(item => item.state === 'computing' && item.values.every(value => value === '—') && !item.report), `${id}: 先绘制推演中，再计算`);
      assert.deepEqual(state.values, state.actual, `${id}: 显示本次计算的真实四柱`);
      assert.equal(state.byline, `${config.trait} · 命盘推演`, '推演提示只显示特质，不显示人物名称');
      assert.ok(state.portrait.endsWith('/' + config.portrait));
      assert.equal(state.title, 'rgb(255, 249, 239)', '深色场景中的标题必须清晰');
      assert.equal(state.animation, config.animation);
      assert.match(state.subjectAnimation, /^calculation-/);
      assert.notEqual(state.active, 'none');
      assert.equal(state.inactive, true);
      assert.equal(state.inactiveLoaded, false, '不应加载其他角色的演出道具');
      assert.equal(state.focus, 'calculationContinue');
      assert.ok(state.formOpen && state.formInert && state.pageInert && !state.report, '计算期间锁住背景并保留表单');
      assert.equal(state.portraitZ, 2, '人物位于火座、符印和其他道具前方');
      assert.ok(state.rects.every(rect => rect.left >= 0 && rect.right <= width && rect.top >= 0 && rect.bottom <= height), `${id} ${width}x${height}: 提示及跳过按钮应完整可见`);
      assert.equal(state.scroll[0], state.scroll[1]);
      // Sampling the actual timeline proves this is movement, not just a style name.
      const frames = await page.evaluate((selector, name) => {
        const animation = document.querySelector(selector).getAnimations().find(item => item.animationName === name);
        if (!animation) return null;
        animation.pause();
        const sample = time => { animation.currentTime = time; const s = getComputedStyle(animation.effect.target); return [s.transform, s.opacity, s.clipPath]; };
        const samples = [sample(200), sample(1200)]; animation.play(); return samples;
      }, config.selector, config.animation);
      assert.ok(frames && JSON.stringify(frames[0]) !== JSON.stringify(frames[1]), `${id}: 专属道具应有实际动作`);
      if (config.detail) {
        const detailFrames = await page.evaluate((selector, name) => {
          const animation = document.querySelector(selector).getAnimations().find(item => item.animationName === name);
          if (!animation) return null;
          animation.pause();
          const sample = time => { animation.currentTime = time; return getComputedStyle(animation.effect.target).transform; };
          const values = [sample(200), sample(1200)]; animation.play(); return values;
        }, config.detail, config.detailAnimation);
        assert.ok(detailFrames && detailFrames[0] !== detailFrames[1], `${id}: 唱片或镜头叶片应独立运动`);
      }
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'calculationContinue', '焦点应留在推演对话框中');
      await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'calculationContinue');
      // Repeated or programmatic submissions cannot replace the calculation in flight.
      await page.evaluate(() => window.calc(true));
      assert.equal(await page.evaluate(() => window._ctx.isDemoPreview), false);
      if (id === 'wenwen' && width === 390) {
        await delay(3200);
        assert.equal(await page.$eval('#calculationOverlay', el => el.hidden), false, '真实结果必须一直停留');
        assert.equal(await page.evaluate(() => document.body.classList.contains('report-active')), false);
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('#calculationOverlay', el => el.dataset.calculationState), 'ready', 'Escape 不能误关结果');
        await page.mouse.click(8, 8); // The artwork itself is also a continuation target.
      } else {
        await page.keyboard.press('Enter');
      }
      await page.waitForFunction(() => document.body.classList.contains('report-active'), { timeout: 10000 });
      assert.deepEqual(await page.evaluate(() => ({
        overlay: document.getElementById('calculationOverlay').hidden,
        form: document.getElementById('formModal').classList.contains('open'),
        inert: document.getElementById('page1').inert,
        focus: document.activeElement.id,
        camera: document.getElementById('characterScene').dataset.cameraShot,
        theme: document.documentElement.dataset.homeTheme,
      })), { overlay: true, form: false, inert: false, focus: 'p2MenuBtn', camera: 'close', theme: id });
      await page.evaluate(() => window.goBack());
      assert.equal(await page.$eval('#characterScene', el => el.dataset.cameraShot), 'close');
      assert.equal(await page.$eval('html', el => el.dataset.homeTheme), id);
      await context.close();
    }
  }
  console.log('✓ 八角色真实表单推演：专属动作、真实四柱、景别保留、键盘及五种横竖屏幕');

  // Another tab can change the home theme while computation is running;
  // this performance must stay on the character selected when it began.
  {
    const { page, context } = await newPage({ theme: 'moonfox' });
    // Predecode the other tab's role so the test observes the switch while
    // the short, normal-length scene is still on screen even on slower CI.
    await page.evaluate(async () => Promise.all(['./art/yuchen-empress.webp', './art/yuchen-hall-mobile.webp'].map(src => {
      const image = new Image(); image.src = src; return image.decode();
    })));
    await openForm(page);
    await page.click('.character-form-submit');
    await waitForResultScene(page, 'moonfox');
    await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'tj_home_character', newValue: 'yuchen' })));
    await delay(300);
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'moonfox', '其他标签页不能改变本次选择');
    assert.equal(await page.$eval('#calculationOverlay', el => el.dataset.calculationTheme), 'moonfox');
    assert.ok(await page.$eval('[data-calculation-portrait]', el => el.currentSrc.endsWith('/moon-fox-reimagined.webp')));
    assert.equal(await page.$eval('#calculationByline', el => el.textContent), '神秘 · 命盘推演');
    await continueToReport(page);
    await context.close();
  }
  console.log('✓ 推演中锁定所选角色，跨标签切换不会串场');

  // Example and saved profile previously used a separate, simulated loader.
  {
    const { page, context } = await newPage({ theme: 'moonfox' });
    await page.evaluate(() => { window.__example = window.calc(true); });
    await waitForResultScene(page, 'moonfox');
    assert.equal(await page.evaluate(() => window._ctx.isDemoPreview), true);
    await continueToReport(page);
    assert.ok(await page.$('.demo-report-note'));
    // Open a saved profile from an already visible report, not just from home.
    const id = await page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('TJ_Bazi', 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const item = { name: '推演档案', bd: '1985-04-12', timeStr: '16:30', bp: 'shanghai', gen: 'female', updatedAt: Date.now() };
        const put = db.transaction('profiles', 'readwrite').objectStore('profiles').add(item);
        put.onsuccess = () => { resolve(put.result); db.close(); };
        put.onerror = () => reject(put.error);
      };
    }));
    await page.evaluate(profileId => { void window.loadProfile(profileId); }, id);
    await waitForResultScene(page, 'moonfox');
    assert.equal(await page.evaluate(() => window._ctx.input.bd_raw), '1985-04-12');
    assert.equal(await page.evaluate(() => window._ctx.isDemoPreview), false);
    const activeTab = await page.$eval('.tab-item.active', el => el.dataset.sec);
    await page.keyboard.press('2');
    assert.equal(await page.$eval('.tab-item.active', el => el.dataset.sec), activeTab, '推演时全局快捷键不能操作后台报告');
    await continueToReport(page);
    assert.equal(await page.$('.demo-report-note'), null);
    await context.close();
  }
  console.log('✓ 示例与档案也走真实推演场景');

  // Calendar profile entry is not report navigation and must stay in the calendar.
  {
    const { page, context } = await newPage();
    await page.click('#homeCtaCal');
    await page.waitForSelector('#toolModal.open.cal-fullscreen');
    await page.click('#toolModal [data-fill]');
    await page.waitForSelector('#formModal.open');
    await page.click('.character-form-submit');
    await page.waitForFunction(() => !document.getElementById('formModal').classList.contains('open'));
    assert.equal(await page.$eval('#calculationOverlay', el => el.hidden), true);
    assert.equal(await page.$eval('#toolModal', el => el.classList.contains('open') && el.classList.contains('cal-fullscreen')), true);
    assert.equal(await page.evaluate(() => document.body.classList.contains('report-active')), false);
    assert.equal(await page.evaluate(() => document.activeElement.matches('#toolModal [data-fill]')), true);
    await context.close();
  }
  console.log('✓ 日历录入保持在日历并恢复焦点');

  // Failing synchronous report rendering must remove the overlay, restore focus,
  // preserve the user's form and previous context, and permit retry.
  {
    const { page, context } = await newPage();
    await openForm(page);
    await page.evaluate(() => {
      window.__previousContext = { marker: 'previous' };
      window._ctx = window.__previousContext;
      window._formDirty = true;
      document.getElementById('bDate').value = '1992-09-21';
      document.getElementById('p2Inner').id = 'p2Inner-for-test';
    });
    await page.click('.character-form-submit');
    await page.waitForFunction(() => document.querySelector('.tj-toast')?.textContent.includes('推演出错'));
    assert.deepEqual(await page.evaluate(() => ({
      open: document.getElementById('formModal').classList.contains('open'),
      inert: document.getElementById('formModal').inert,
      hidden: document.getElementById('calculationOverlay').hidden,
      focus: document.activeElement.classList.contains('character-form-submit'),
      date: document.getElementById('bDate').value,
      previous: window._ctx === window.__previousContext,
      dirty: window._formDirty,
    })), { open: true, inert: false, hidden: true, focus: true, date: '1992-09-21', previous: true, dirty: true });
    await page.evaluate(() => { document.getElementById('p2Inner-for-test').id = 'p2Inner'; });
    await page.click('.character-form-submit');
    await waitForResultScene(page, 'wenwen');
    await continueToReport(page);
    await context.close();
  }
  console.log('✓ 计算失败恢复表单、焦点与旧上下文，可重试');

  // An optional prop can fail and later retry; it must not block the report.
  {
    const { page, context } = await newPage();
    await page.setRequestInterception(true);
    let failures = 0;
    page.on('request', request => {
      if (request.url().endsWith('/awakening-scroll.webp') && failures++ < 2) request.abort('failed').catch(() => {});
      else request.continue().catch(() => {});
    });
    await openForm(page);
    await page.waitForFunction(() => { const image = document.querySelector('.calculation-scroll img'); return image.hasAttribute('src') && image.complete && !image.naturalWidth; });
    await page.click('.character-form-submit');
    await waitForResultScene(page, 'wenwen');
    await page.waitForFunction(() => { const image = document.querySelector('.calculation-scroll img'); return image.complete && !image.naturalWidth; });
    await continueToReport(page);
    await page.evaluate(() => window.goBack()); await delay(550);
    await openForm(page);
    await page.click('.character-form-submit');
    await waitForResultScene(page, 'wenwen');
    await page.waitForFunction(() => document.querySelector('.calculation-scroll img').naturalWidth > 0, { timeout: 5000 });
    assert.ok(failures >= 3, '失败的道具在下次推演时应重试');
    await continueToReport(page);
    await context.close();
  }
  console.log('✓ 道具加载失败不阻塞结果，下一次可重试');

  // Simulate an indefinitely slow optional prop. Computation and navigation
  // complete while the request is still held; a late response cannot reopen it.
  {
    const { page, context } = await newPage();
    await page.setRequestInterception(true);
    const held = [];
    let notify;
    const started = new Promise(resolve => { notify = resolve; });
    page.on('request', request => {
      if (request.url().endsWith('/awakening-scroll.webp')) { held.push(request); notify(); }
      else request.continue().catch(() => {});
    });
    await openForm(page);
    await page.click('.character-form-submit');
    await Promise.race([started, delay(5000).then(() => { throw new Error('慢网道具请求未开始'); })]);
    await waitForResultScene(page, 'wenwen');
    assert.ok(held.length > 0);
    assert.equal(await page.evaluate(() => document.body.classList.contains('report-active')), false);
    await continueToReport(page);
    await Promise.all(held.map(request => request.continue().catch(() => {})));
    await delay(300);
    assert.equal(await page.$eval('#calculationOverlay', el => el.hidden), true, '迟到的素材不能重新打开结果');
    assert.equal(await page.$eval('html', el => el.dataset.homeTheme), 'wenwen');
    assert.equal(await page.evaluate(() => document.body.classList.contains('report-active')), true);
    await context.close();
  }
  console.log('✓ 弱网下不等待演出素材，迟到的旧素材不会串到新角色');

  // Clicking skip, backgrounding the page and changing motion preferences
  // can advance the cinematic, but can never dismiss the actual result.
  {
    const { page, context } = await newPage({ theme: 'moonfox' });
    await openForm(page);
    await page.click('.character-form-submit');
    await page.waitForFunction(() => document.getElementById('calculationOverlay').dataset.calculationState === 'computing');
    await page.click('#calculationSkip span'); // The nested arrow must not bubble into result confirmation.
    await waitForResultScene(page, 'moonfox');
    assert.equal(await page.$eval('#calculationSkip', el => el.hidden), true);
    const label = await page.$eval('.calculation-pillars', el => el.getAttribute('aria-label'));
    assert.match(label, /年柱.+月柱.+日柱.+时柱/);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      delete document.hidden;
    });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await delay(600);
    assert.equal(await page.$eval('#calculationOverlay', el => el.dataset.calculationState), 'ready');
    assert.equal(await page.evaluate(() => document.body.classList.contains('report-active')), false);
    await page.mouse.click(8, 8);
    await page.waitForFunction(() => document.body.classList.contains('report-active'));
    await context.close();
  }
  console.log('✓ 跳过、后台和减动态都只影响动画，结果需主动点击');

  // Reduced-motion users should not be made to wait for the cinematic.
  {
    const { page, context } = await newPage({ theme: 'yuchen', motion: 'reduce' });
    await openForm(page);
    assert.equal(await page.$$eval('.calculation-props img[src]', images => images.length), 0, '减动态时不额外下载短暂演出的道具');
    await page.evaluate(() => {
      const scene = document.getElementById('calculationOverlay');
      window.__reducedScene = null;
      new MutationObserver(() => {
        if (!scene.hidden) window.__reducedScene = {
          animation: getComputedStyle(scene.querySelector('.calculation-wing--left')).animationName,
          skipHidden: document.getElementById('calculationSkip').hidden,
        };
      }).observe(scene, { attributes: true, attributeFilter: ['hidden'] });
    });
    const start = Date.now();
    await page.evaluate(() => { void window.calc(); });
    await waitForResultScene(page, 'yuchen');
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 1800, `减动态不应等待演出，实际 ${elapsed}ms`);
    assert.deepEqual(await page.evaluate(() => window.__reducedScene), { animation: 'none', skipHidden: true });
    await delay(400);
    assert.equal(await page.evaluate(() => document.body.classList.contains('report-active')), false, '减动态也必须等待用户确认结果');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'calculationContinue');
    await continueToReport(page);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'p2MenuBtn');
    await context.close();
  }
  // A live preference change skips the animation, never the result.
  {
    const { page, context } = await newPage({ theme: 'diyan' });
    await openForm(page);
    await page.click('.character-form-submit');
    await page.waitForFunction(() => document.querySelector('#calculationOverlay').dataset.calculationState === 'computing');
    const start = Date.now();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await waitForResultScene(page, 'diyan');
    assert.ok(Date.now() - start < 1500);
    await delay(400);
    assert.equal(await page.evaluate(() => document.body.classList.contains('report-active')), false);
    await continueToReport(page);
    await context.close();
  }
  console.log('✓ 减动态及实时切换不强制等待，结果与焦点正常');

  // Escape skips the cinematic but neither Escape nor reduced motion dismisses the result.
  {
    const { page, context } = await newPage();
    const client = await page.createCDPSession();
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await openForm(page);
    await page.click('.character-form-submit');
    await page.waitForFunction(() => document.querySelector('#calculationOverlay').dataset.calculationState === 'computing');
    await page.keyboard.press('Escape');
    await waitForResultScene(page, 'wenwen');
    const colors = await page.$eval('#calculationContinue', el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
    assert.notEqual(colors[0], colors[1]);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'calculationContinue');
    await page.keyboard.press('Escape');
    await delay(300);
    assert.equal(await page.$eval('#calculationOverlay', el => el.dataset.calculationState), 'ready');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.body.classList.contains('report-active'));
    await context.close();
  }
  console.log('✓ 强制颜色、Escape 只跳动画与键盘查看报告');

  assert.deepEqual(errors, [], '不应有未捕获的页面错误');
} finally {
  await browser.close();
}
