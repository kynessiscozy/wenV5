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
  await page.evaluate(() => window.calc(true));
  await new Promise(resolve => setTimeout(resolve, 4_300));

  console.log('=== 1. 选择术语后可转入问问大师 ===');
  await page.evaluate(() => {
    const target = document.createElement('p');
    target.id = 'explainTestTarget';
    target.textContent = '五行';
    document.getElementById('p2Inner').appendChild(target);
    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await new Promise(resolve => setTimeout(resolve, 420));
  await page.evaluate(() => document.getElementById('glossChip').click());
  await page.waitForSelector('#glossPopAi', { timeout: 3_000 });
  await page.evaluate(() => document.getElementById('glossPopAi').click());
  await page.waitForFunction(
    () => document.getElementById('aiSheet').classList.contains('open')
      && document.getElementById('askResult').innerText.includes('五行')
      && document.getElementById('askResult').innerText.includes('是什么意思'),
    { timeout: 4_000 }
  );

  console.log('=== 2. 术语问题走本地释义分支 ===');
  await page.evaluate(() => window.newAskChat());
  await page.evaluate(() => window.doAsk('食神格是什么意思？'));
  await page.waitForFunction(
    () => {
      const text = document.getElementById('askResult').innerText;
      return text.includes('食神格') && text.includes('释义') && text.includes('想法变成具体作品');
    },
    { timeout: 4_000 }
  );

  const response = await page.$eval('#askResult', element => element.innerText);
  assert.match(response, /食神格/);
  assert.match(response, /释义/);
  assert.match(response, /想法变成具体作品/);
  assert.deepStrictEqual(errors, [], `页面不应出现错误：\n${errors.join('\n')}`);
  console.log(response.slice(-360));
  console.log('术语问答验证通过。');
} finally {
  await browser.close();
}
