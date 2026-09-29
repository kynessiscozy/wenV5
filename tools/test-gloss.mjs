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
  await new Promise(resolve => setTimeout(resolve, 4_200));

  console.log('=== 1. 术语词表与重置接口可用 ===');
  const contract = await page.evaluate(() => ({
    hasVocabulary: Boolean(window.__TJ_GLOSSARY__?.五行),
    hasNewTerms: ['格局', '命局', '喜神', '食神格'].every(term => Boolean(window.__TJ_GLOSSARY__?.[term])),
    hasReset: typeof window.resetGlossaryState === 'function'
  }));
  assert.deepStrictEqual(contract, { hasVocabulary: true, hasNewTerms: true, hasReset: true });

  console.log('=== 2. 选中文字后出现解释入口 ===');
  await page.evaluate(() => {
    const target = document.createElement('p');
    target.id = 'glossaryTestTarget';
    target.textContent = '五行';
    document.getElementById('p2Inner').appendChild(target);

    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await new Promise(resolve => setTimeout(resolve, 420));

  const interaction = await page.evaluate(() => {
    if (document.getElementById('glossChip')) return 'floating-chip';
    if (document.querySelector('.dock-gloss[data-act="explain"]')) return 'dock-action';
    return 'missing';
  });
  assert.notStrictEqual(interaction, 'missing', '选择术语后应出现解释入口');
  console.log(`  入口形态: ${interaction}`);

  if (interaction === 'floating-chip') {
    await page.evaluate(() => document.getElementById('glossChip').click());
  } else {
    await new Promise(resolve => setTimeout(resolve, 260));
    await page.evaluate(() => document.querySelector('.dock-gloss[data-act="explain"]').click());
  }
  await page.waitForSelector('#glossPop.open', { timeout: 3_000 });

  const popover = await page.$eval('#glossPop', element => element.innerText);
  assert.match(popover, /五行/);
  assert.match(popover, /木、火、土、金、水/);
  await page.screenshot({ path: '/tmp/glossary-selection.png' });

  assert.deepStrictEqual(errors, [], `页面不应出现错误：\n${errors.join('\n')}`);
  console.log('术语选择交互验证通过。');
} finally {
  await browser.close();
}
