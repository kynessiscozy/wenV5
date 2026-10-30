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
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await selectHomeTrait(page);
  await page.waitForFunction(() => window._tools2Ready === true, { timeout: 15000 });

  await page.evaluate(() => window.openToolPage('daily'));
  assert.match(await page.$eval('#toolModalContent', el => el.innerText), /请先完成个人推演/);
  await page.evaluate(() => window.closeToolPage());

  await openDemoReport(page);
  await page.evaluate(() => window.openToolPage('daily'));
  await page.waitForSelector('#toolModalContent .tw-y-card');
  const first = await page.$eval('#toolModalContent .tw-y-card', el => el.innerText);
  assert.match(first, /基调/);
  assert.match(first, /宜/);
  assert.match(first, /忌/);
  assert.ok(await page.$('#twYShare'), '日签分享入口应保留');
  await page.evaluate(() => { window.closeToolPage(); window.openToolPage('daily'); });
  const second = await page.$eval('#toolModalContent .tw-y-card', el => el.innerText);
  assert.equal(second, first, '同一命盘同一天的日签应稳定');
  assert.deepEqual(errors, []);
  console.log('✓ 日签无命盘提示、真实生成、分享入口与同日稳定性');
} finally {
  await browser.close();
}
