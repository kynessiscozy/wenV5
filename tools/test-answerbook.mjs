import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { selectHomeTrait } from './test-entry.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 390, height: 844 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('tj_answerbook_saved', JSON.stringify([{ text: '旧收藏依然可读。', at: 100 }]));
    // Earlier v2 records may also use text; equal timestamps must not delete
    // a different entry merely because both records have no answer property.
    localStorage.setItem('tj_answerbook_saved_v2', JSON.stringify([
      { text: '同刻旧收藏甲。', at: 200 },
      { text: '同刻旧收藏乙。', at: 200 },
    ]));
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await selectHomeTrait(page);
  await page.waitForFunction(() => window._tools2Ready === true, { timeout: 15000 });
  await page.evaluate(() => window.openToolPage('answerbook'));
  await page.waitForSelector('#twABSaved');
  await page.click('#twABSaved');
  assert.match(await page.$eval('.tw-ab-saved', el => el.textContent), /旧收藏依然可读/);
  await page.click('#twABBack');
  await page.type('#twABQ', '我该如何开始？');
  await page.click('#twABOpen');
  await page.waitForSelector('#twABSave');
  const answer = await page.$eval('.tw-ab-answer blockquote', el => el.textContent);
  assert.ok(answer.trim());
  await page.click('#twABSave');
  assert.equal(await page.$eval('#twABSave', el => el.disabled), true);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tj_answerbook_saved_v2')).length), 3);

  await page.evaluate(() => { window.closeToolPage(); window.openToolPage('answerbook'); });
  await page.click('#twABSaved');
  assert.equal(await page.$$('.tw-ab-saved-item').then(items => items.length), 4);
  const legacy = await page.$$('.tw-ab-saved-item');
  const contents = await Promise.all(legacy.map(item => item.$eval('blockquote', el => el.textContent)));
  assert.ok(contents.includes(answer) && contents.includes('旧收藏依然可读。'));
  const legacyIndex = contents.indexOf('旧收藏依然可读。');
  await legacy[legacyIndex].$eval('[data-act="del"]', el => el.click());
  await page.waitForFunction(() => document.querySelectorAll('.tw-ab-saved-item').length === 3, { timeout: 5000 });
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('tj_answerbook_saved'))), []);
  let items = await page.$$('.tw-ab-saved-item');
  let texts = await Promise.all(items.map(item => item.$eval('blockquote', el => el.textContent)));
  await items[texts.indexOf('同刻旧收藏乙。')].$eval('[data-act="del"]', el => el.click());
  await page.waitForFunction(() => document.querySelectorAll('.tw-ab-saved-item').length === 2, { timeout: 5000 });
  items = await page.$$('.tw-ab-saved-item');
  texts = await Promise.all(items.map(item => item.$eval('blockquote', el => el.textContent)));
  assert.ok(texts.includes('同刻旧收藏甲。') && !texts.includes('同刻旧收藏乙。'));
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tj_answerbook_saved_v2')).length), 2);
  assert.deepEqual(errors, []);
  console.log('✓ 答案之书无需命盘、翻页收藏及旧收藏读取删除');
} finally {
  await browser.close();
}
