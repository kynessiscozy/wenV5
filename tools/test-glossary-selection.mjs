import assert from 'node:assert';
import puppeteer from 'puppeteer';

const baseUrl = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];

await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !/404/.test(message.text())) errors.push(message.text());
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 15_000 });

  const contract = await page.evaluate(() => ({
    hasVocabulary: Boolean(window.__TJ_GLOSSARY__?.五行),
    hasReset: typeof window.resetGlossaryState === 'function'
  }));
  assert.deepStrictEqual(contract, { hasVocabulary: true, hasReset: true });

  await page.evaluate(() => {
    const target = document.createElement('p');
    target.id = 'glossaryTestTarget';
    target.textContent = '五行';
    document.body.appendChild(target);

    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await new Promise(resolve => setTimeout(resolve, 360));

  const chip = await page.$('#glossChip');
  assert.ok(chip, '选择术语后应显示解释入口');
  await chip.click();
  await new Promise(resolve => setTimeout(resolve, 120));

  const popover = await page.$eval('#glossPop', element => element.textContent);
  assert.match(popover, /五行/);
  assert.match(popover, /木、火、土、金、水/);
  assert.deepStrictEqual(errors, [], `页面不应产生错误：\n${errors.join('\n')}`);

  console.log('Glossary selection contract passed.');
} finally {
  await browser.close();
}
