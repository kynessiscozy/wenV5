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

async function openForm() {
  await page.evaluate(() => window.openToolPage('relation'));
  await page.waitForSelector('#twRDate', { timeout: 5_000 });
}

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.evaluate(() => localStorage.removeItem('tj_partners_v1'));
  await page.evaluate(() => window.calc(true));
  await new Promise(resolve => setTimeout(resolve, 4_200));

  console.log('=== 1. 首次打开没有最近对象 ===');
  await openForm();
  assert.strictEqual(await page.$('.tj-partner-picker'), null);

  console.log('=== 2. 合盘并保存对象 ===');
  await page.click('#twRName');
  await page.type('#twRName', '阿雯');
  await page.evaluate(() => {
    const input = document.getElementById('twRDate');
    input.value = '1988-03-11';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.evaluate(() => document.getElementById('twRRun').click());
  await page.waitForSelector('#twRSave', { timeout: 5_000 });

  const result = await page.$eval('.tw-result-page', element => element.innerText);
  assert.match(result, /契合度/);
  assert.ok(await page.$('#twRShare'), '结果页应提供合盘卡分享');
  assert.ok(await page.$('#twRText'), '结果页应提供文本分享');
  await page.evaluate(() => document.getElementById('twRSave').click());
  await page.waitForSelector('.tj-partner-chip', { timeout: 5_000 });

  const partners = await page.evaluate(() => JSON.parse(localStorage.getItem('tj_partners_v1') || '[]'));
  assert.strictEqual(partners.length, 1);
  assert.deepStrictEqual(
    { name: partners[0].name, y: partners[0].y, m: partners[0].m, d: partners[0].d },
    { name: '阿雯', y: 1988, m: 3, d: 11 }
  );

  console.log('=== 3. 最近对象可回填并可删除 ===');
  await page.evaluate(() => document.querySelector('.tj-partner-chip').click());
  const restored = await page.evaluate(() => ({
    name: document.getElementById('twRName').value,
    date: document.getElementById('twRDate').value
  }));
  assert.deepStrictEqual(restored, { name: '阿雯', date: '1988-03-11' });

  await page.evaluate(() => document.querySelector('.tj-partner-del').click());
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.strictEqual(await page.$('.tj-partner-chip'), null);
  assert.deepStrictEqual(errors, [], `页面不应出现错误：\n${errors.join('\n')}`);
  console.log('合盘对象保存、回填与删除验证通过。');
} finally {
  await browser.close();
}
