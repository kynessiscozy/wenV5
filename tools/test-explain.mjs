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
  await openDemoReport(page);
  await page.evaluate(() => window.openAsk());
  await page.waitForSelector('#aiSheet.open');

  async function ask(question) {
    await page.evaluate(q => { window.newAskChat(); window.doAsk(q); }, question);
    await page.waitForFunction(() => window._aiConversation?.length >= 2, { timeout: 10000 });
    return page.$eval('#askResult', el => el.innerText);
  }

  // The old inline explanation buttons were removed. The current chat and
  // selected-text explanations must still recognize the full matching term.
  for (const [question, term] of [
    ['食神格是什么意思？', '食神格'], ['用神是什么', '用神'], ['身旺怎么理解', '身旺'],
  ]) {
    const answer = await ask(question);
    assert.match(answer, /释义/);
    assert.ok(answer.includes(term));
    const actual = await page.evaluate(() => window._aiConversation.at(-1)?.content);
    assert.ok(actual?.length > 8, `${term} 应有实际解释`);
  }

  // A personal question must reference the actual chart, not merely return a
  // definition of the word in the question (works without a configured key).
  const dayMaster = await page.evaluate(() => window._ctx.dg);
  const answer = await ask('我的事业有什么特点？');
  assert.ok(dayMaster && answer.includes('日主' + dayMaster));
  assert.doesNotMatch(answer, /术语\s*事业\s*\d\s*释义/);
  assert.deepEqual(errors, []);
  console.log('✓ 术语最长匹配、个人命盘上下文及离线解答');
} finally {
  await browser.close();
}
