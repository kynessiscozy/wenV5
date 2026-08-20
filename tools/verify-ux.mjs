import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/ux';
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage','--window-size=480,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(800);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);

  // 1. 返回栏新样式（career 结果页）
  await page.evaluate(() => window.openToolPage('career'));
  await sleep(600);
  await page.evaluate(() => document.querySelector('#twCGen')?.click());
  await sleep(800);
  await page.screenshot({ path: OUT + '/resultbar.png' });
  // 校验返回栏结构
  const bar = await page.evaluate(() => {
    const b = document.querySelector('.tw-result-back');
    const k = document.querySelector('.tw-result-kicker');
    const t = document.querySelector('.tw-result-bar-title');
    const border = getComputedStyle(document.querySelector('.tw-result-bar')).borderBottomWidth;
    return { round: b ? getComputedStyle(b).borderRadius : 'none', kicker: k?.textContent, title: t?.textContent, borderBottom: border };
  });
  console.log('返回栏:', JSON.stringify(bar));
  await page.evaluate(() => window.closeToolPage());
  await sleep(400);

  // 2. 答案之书重构
  await page.evaluate(() => window.openToolPage('answerbook'));
  await sleep(700);
  await page.screenshot({ path: OUT + '/ab-form.png' });
  // 填问题 → 翻开
  await page.evaluate(() => {
    const el = document.querySelector('#twABQ');
    if (el) { el.value = '我现在应该换工作吗？'; el.dispatchEvent(new Event('input', { bubbles: true })); }
    document.querySelector('#twABOpen')?.click();
  });
  await sleep(1500); // 翻书动画中
  await page.screenshot({ path: OUT + '/ab-flip.png' });
  await sleep(900);  // 答案卡
  await page.screenshot({ path: OUT + '/ab-result.png' });
  const abOk = await page.evaluate(() => ({
    answer: !!document.querySelector('.tw-ab-answer blockquote'),
    again: !!document.querySelector('#twABAgain'),
    save: !!document.querySelector('#twABSave'),
    share: !!document.querySelector('#twABShare'),
  }));
  console.log('答案之书结果页:', JSON.stringify(abOk));
  // 收藏
  await page.evaluate(() => document.querySelector('#twABSave')?.click());
  await sleep(300);
  await page.evaluate(() => window.closeToolPage());
  await sleep(400);
  // 收藏夹
  await page.evaluate(() => window.openToolPage('answerbook'));
  await sleep(600);
  const savedBtn = await page.evaluate(() => !!document.querySelector('#twABSaved'));
  console.log('收藏入口出现:', savedBtn);
  await page.evaluate(() => document.querySelector('#twABSaved')?.click());
  await sleep(600);
  const savedList = await page.evaluate(() => document.querySelectorAll('.tw-ab-saved-item').length);
  console.log('收藏夹条目:', savedList);
  await page.screenshot({ path: OUT + '/ab-saved.png' });
  await page.evaluate(() => window.closeToolPage());
  await sleep(300);

  console.log('JS 错误数:', errs.length);
  errs.slice(0, 5).forEach(e => console.log('  ERR:', e.slice(0, 150)));
} catch (e) {
  console.error('异常:', e.message);
} finally {
  await browser.close();
}
