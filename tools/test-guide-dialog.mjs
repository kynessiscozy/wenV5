import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { spinFor } from './trait-picker-helper.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
try {
  for (const [width, height, theme] of [[320, 568, 'light'], [390, 844, 'dark'], [1280, 800, 'light']]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluateOnNewDocument(theme => localStorage.setItem('tj_theme', theme), theme);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await spinFor(page, 'wenwen');
    await page.waitForFunction(() => document.getElementById('traitSelection').hidden && typeof window.openNoviceGuide === 'function');
    await page.click('.character-guide-link');
    await page.waitForSelector('#noviceGuideModal.open');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'ng-close-btn');
    assert.equal(await page.$eval('.ng-sheet', el => el.getAttribute('aria-modal')), 'true');
    assert.equal(await page.$$('.ng-tab-btn').then(items => items.length), 5);
    assert.equal(await page.$eval('#ng-tab-tour', el => el.getAttribute('aria-selected')), 'true');
    assert.equal(await page.$eval('#ngBodyContent', el => el.getAttribute('aria-labelledby')), 'ng-tab-tour');
    const size = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth,
      body: document.querySelector('.ng-body').clientHeight,
      footer: document.querySelector('.ng-footer').getBoundingClientRect().toJSON() }));
    assert.equal(size.overflow, false, `${width}px 指引不应横向溢出`);
    assert.ok(size.body > 100 && size.footer.bottom <= height + 1, `${width}px 指引可滚动且按钮可见`);

    // Arrow keys move the actual selected tab, and Escape restores focus.
    await page.focus('#ng-tab-tour');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'ng-tab-eastern');
    assert.equal(await page.$eval('#ng-tab-eastern', el => el.getAttribute('aria-selected')), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'ng-tab-faq');
    const faq = await page.$eval('#ngBodyContent', el => el.innerText);
    assert.ok(faq.includes('09:00') && faq.includes('服务商') && faq.includes('不准确'));
    assert.ok(!/不上传任何服务器|绝不会.*泄露|绝对精准/.test(faq));
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#noviceGuideModal', el => el.classList.contains('open')), false);
    assert.equal(await page.evaluate(() => document.activeElement.className), 'character-guide-link');

    await page.focus('#homeCtaMain');
    await page.evaluate(() => window.openAboutModal());
    assert.equal(await page.$eval('#aboutModal [role="dialog"]', el => el.getAttribute('aria-labelledby')), 'aboutTitle');
    const about = await page.$eval('#aboutModal', el => el.innerText);
    assert.ok(about.includes('服务商') && about.includes('专业建议'));
    assert.ok(!/所有数据.*不上传|绝对精准/.test(about));
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#aboutModal', el => el.classList.contains('open')), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'homeCtaMain');

    await page.click('.character-guide-link');
    await page.click('.ng-act-btn.primary');
    await page.waitForSelector('#formModal.open');
    await page.evaluate(() => window.TJCloseForm());
    await page.evaluate(() => { void window.calc(true); });
    await page.waitForFunction(() => document.getElementById('calculationOverlay').dataset.calculationState === 'ready');
    await page.click('#calculationContinue');
    await page.waitForFunction(() => document.body.classList.contains('report-active'));
    await page.evaluate(() => window.openNoviceGuide('western'));
    assert.equal(await page.$eval('#ng-tab-western', el => el.getAttribute('aria-selected')), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#noviceGuideModal', el => el.classList.contains('open')), false);
    assert.equal(await page.evaluate(() => document.body.classList.contains('report-active')), true, '关闭指引不能返回首页');
    await page.evaluate(() => window.openAboutModal());
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.body.classList.contains('report-active')), true, '关闭关于不能返回首页');
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('✓ 五标签指引、键盘焦点、关于说明及报告内关闭在多视口正常');
} finally {
  await browser.close();
}
