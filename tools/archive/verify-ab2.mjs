import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/ab2', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  await page.evaluate(() => window.openToolPage('answerbook'));
  await sleep(700);
  // 输入事业关键词 → 自动切到事业抉择主题
  await page.evaluate(() => {
    const el = document.querySelector('#twABQ');
    el.value = '我该不该跳槽去那家公司？';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(400);
  const theme = await page.evaluate(() => document.querySelector('#twABThemes .tw-tab.active')?.textContent);
  console.log('自动检测主题:', theme);
  // 翻开（翻书动画中截图）
  await page.evaluate(() => document.querySelector('#twABOpen')?.click());
  await sleep(300);
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/ab2/flip-mid.png' });
  const mid = await page.evaluate(() => ({ stage: !!document.querySelector('#twABStage'), sparks: document.querySelectorAll('.tw-ab-sparks i').length, flip: document.querySelector('#twABStage')?.classList.contains('flip') }));
  console.log('翻书动画中:', JSON.stringify(mid));
  await sleep(1100);
  // 答案卡（可能抽到限定句，多翻几次看看）
  let lockedSeen = 0, total = 0;
  for (let i = 0; i < 6; i++) {
    total++;
    const r = await page.evaluate(() => ({
      lock: !!document.querySelector('.tw-ab-lock'),
      ans: document.querySelector('.tw-ab-answer blockquote')?.textContent.trim().slice(0, 26) || '',
      cardAnim: getComputedStyle(document.querySelector('.tw-ab-answer')).animationName,
    }));
    if (r.lock) { lockedSeen++; console.log('  [' + i + '] 限定句:', r.ans); }
    await page.evaluate(() => document.querySelector('#twABAgain')?.click());
    await sleep(1650); // 卡片翻出 250ms + 翻书 1120ms + 余量
  }
  console.log('限定句出现: ' + lockedSeen + '/' + total + ' 次（30% 概率抽样）');
  // 最终结果卡
  const final = await page.evaluate(() => ({
    answer: document.querySelector('.tw-ab-answer blockquote')?.textContent.trim().slice(0, 30),
    cardAnim: getComputedStyle(document.querySelector('.tw-ab-answer')).animationName,
    lock: !!document.querySelector('.tw-ab-lock'),
  }));
  console.log('最终答案卡:', JSON.stringify(final));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/ab2/card.png' });
  // 收藏 pop 动画
  await page.evaluate(() => document.querySelector('#twABSave')?.click());
  await sleep(300);
  const saveAnim = await page.evaluate(() => getComputedStyle(document.querySelector('#twABSave')).animationName);
  console.log('收藏按钮动画:', saveAnim);
  console.log('JS 错误:', errs.length, errs.slice(0, 3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
