import assert from 'node:assert';
import puppeteer from 'puppeteer';

const baseUrl = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];

await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !/404/.test(message.text())) errors.push(message.text());
});

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await new Promise(resolve => setTimeout(resolve, 900));

  console.log('=== 1. 无命盘时给出明确引导 ===');
  await page.evaluate(() => window.openToolPage('daily'));
  await page.waitForSelector('.tw-para', { timeout: 5_000 });
  const emptyState = await page.$eval('.tw-content', element => element.innerText);
  assert.match(emptyState, /请先完成个人推演/);
  await page.evaluate(() => window.closeToolPage());

  console.log('=== 2. 生成命盘并打开日签 ===');
  await page.evaluate(() => window.calc(true));
  await new Promise(resolve => setTimeout(resolve, 4_200));
  await page.evaluate(() => window.openToolPage('daily'));
  await page.waitForSelector('.tw-y-card', { timeout: 5_000 });

  const firstCard = await page.$eval('.tw-y-card', element => element.innerText);
  assert.match(firstCard, /基调/);
  assert.match(firstCard, /宜/);
  assert.match(firstCard, /忌/);
  assert.ok(await page.$('#twYShare'), '日签应提供分享卡操作');
  assert.ok(await page.$('#twYText'), '日签应提供文字分享操作');
  console.log(firstCard.slice(0, 560));

  console.log('=== 3. 同一天重复打开内容保持一致 ===');
  await page.evaluate(() => window.closeToolPage());
  await page.evaluate(() => window.openToolPage('daily'));
  await page.waitForSelector('.tw-y-card', { timeout: 5_000 });
  const secondCard = await page.$eval('.tw-y-card', element => element.innerText);
  assert.strictEqual(secondCard, firstCard, '同一日期的日签内容应稳定一致');

  assert.deepStrictEqual(errors, [], `页面不应出现错误：\n${errors.join('\n')}`);
  console.log('日签工具契约验证通过。');
} finally {
  await browser.close();
}
