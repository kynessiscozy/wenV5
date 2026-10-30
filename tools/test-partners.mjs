import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { selectHomeTrait, openDemoReport } from './test-entry.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 430, height: 932 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText(text) { window.__sharedText = text; return Promise.resolve(); },
    } });
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await selectHomeTrait(page);
  await openDemoReport(page);
  await page.waitForFunction(() => window._tools2Ready === true);
  await page.evaluate(() => window.openToolPage('relation'));
  await page.waitForSelector('#twRDate');
  assert.equal(await page.$('.tj-partner-picker'), null);

  await page.$eval('#twRName', el => { el.value = '阿雯'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.$eval('#twRDate', el => { el.value = '1988-03-11'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.click('#twRRun');
  await page.waitForSelector('#twRSave');
  const score = await page.evaluate(() => window._lastSynastry?.score);
  assert.ok(Number.isFinite(score) && score >= 0 && score <= 100);
  assert.match(await page.$eval('#toolModalContent .tw-view-result', el => el.innerText), /双方命盘/);
  await page.click('#twRText');
  await page.waitForFunction(() => window.__sharedText);
  const shared = await page.evaluate(() => window.__sharedText);
  assert.match(shared, /阿雯/);
  assert.doesNotMatch(shared, /1988[-年]0?3/);

  await page.click('#twRSave');
  await page.waitForSelector('.tj-partner-chip');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tj_partners_v1') || '[]').length), 1);
  await page.evaluate(() => { window.closeToolPage(); window.openToolPage('relation'); });
  await page.waitForSelector('.tj-partner-chip');
  await page.click('.tj-partner-chip');
  assert.equal(await page.$eval('#twRName', el => el.value), '阿雯');
  assert.equal(await page.$eval('#twRDate', el => el.value), '1988-03-11');
  await page.click('#twRRun');
  await page.waitForSelector('#twRSave', { timeout: 5000 });
  assert.equal(await page.evaluate(() => window._lastSynastry.score), score, '选择已保存对象后应可直接再次计算');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await selectHomeTrait(page);
  await openDemoReport(page);
  await page.waitForFunction(() => window._tools2Ready === true);
  await page.evaluate(() => window.openToolPage('relation'));
  await page.waitForSelector('.tj-partner-chip');
  assert.match(await page.$eval('.tj-partner-chip', el => el.textContent), /阿雯/);
  await page.click('.tj-partner-del');
  await page.waitForFunction(() => !document.querySelector('.tj-partner-chip'));
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('tj_partners_v1') || '[]')), []);
  assert.deepEqual(errors, []);
  console.log('✓ 合盘结果、隐私分享、对象保存、回填、刷新与删除');
} finally {
  await browser.close();
}
