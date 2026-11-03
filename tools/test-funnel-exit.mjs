import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.FUNNEL_URL || 'http://localhost:5173/funnel.html';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const context = await browser.createBrowserContext();
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
const previous = JSON.stringify({ bd: '1988-01-01', trait: 'diyan', applied: 1, teasered: 1 });
async function start() {
  await page.click('#btnStart');
  await page.waitForSelector('#s-immersion.active');
  await page.click('#btnSkipStory');
  await page.waitForSelector('#s-quiz.active');
}
async function step(number, selector, value) {
  await page.waitForFunction(n => document.querySelector('#s-quiz.active') &&
    document.querySelector('#pcount')?.textContent.startsWith(n + ' /'), { timeout: 10000 }, number);
  await sleep(650);
  if (value) await page.$eval('#qmount input', (input, v) => { input.value = v; }, value);
  await page.click(selector);
}
async function throughCity() {
  await step(1, '#qmount .opt');
  await step(2, '#qmount .btn.primary', '1990-06-15');
  await step(3, '#qmount .btn.ghost');
  await step(4, '#qmount .btn.ghost');
}
async function finishQuiz() {
  await throughCity();
  await step(5, '#qmount .opt');
  await step(6, '#qmount .btn.ghost');
  await step(7, '#qmount .btn.ghost');
  await page.waitForSelector('#s-loading.active');
}
async function exitAndWait() {
  await page.click('#quitFunnel');
  await page.waitForSelector('#funnelExitDialog:not([hidden])');
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#confirmFunnelExit')]);
  assert.ok(await page.$eval('#s-entry', el => el.classList.contains('active')));
}
try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.evaluate(value => { localStorage.setItem('wen_funnel_v1', value); localStorage.setItem('wen_load_profile_v1', '42'); }, previous);
  await page.click('#btnStart');
  await page.click('#quitFunnel');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cancelFunnelExit');
  assert.equal(await page.$eval('#s-immersion', el => el.hasAttribute('inert')), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#funnelExitDialog', el => el.hidden), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'quitFunnel');
  await page.click('#btnSkipStory');
  await step(1, '#qmount .opt');
  await page.waitForFunction(() => document.querySelector('#pcount')?.textContent.startsWith('2 /'));
  await sleep(650);
  await page.$eval('#qmount input', el => { el.value = '1990-06-15'; });
  await page.click('#quitFunnel');
  await page.click('#cancelFunnelExit');
  assert.equal(await page.$eval('#qmount input', el => el.value), '1990-06-15', '继续填写必须保留当前输入');
  await exitAndWait();
  assert.equal(await page.evaluate(() => localStorage.getItem('wen_funnel_v1')), previous);
  assert.equal(await page.evaluate(() => localStorage.getItem('wen_load_profile_v1')), '42');
  assert.equal(await page.$eval('#quitFunnel', el => el.hidden), true);
  console.log('✓ 沉浸页与问卷可退出，取消保留输入，确认不影响旧档案');

  await start();
  await throughCity();
  await page.waitForSelector('#s-inter.active');
  await page.click('#quitFunnel');
  await sleep(2600); // The interstitial may finish behind the modal.
  assert.equal(await page.$eval('#funnelExitDialog', el => el.hidden), false);
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#confirmFunnelExit')]);
  await sleep(500);
  assert.ok(await page.$eval('#s-entry', el => el.classList.contains('active')));
  console.log('✓ 过场期间退出不会被延迟跳转拉回问卷');

  await start();
  await finishQuiz();
  await page.click('#quitFunnel');
  await sleep(8200);
  assert.ok((await page.url()).includes('funnel.html'), '退出确认期间不得自动跳转');
  assert.equal(await page.evaluate(() => localStorage.getItem('wen_funnel_v1')), previous, '确认期间不得覆盖旧数据');
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }), page.click('#cancelFunnelExit')]);
  assert.ok((await page.url()).includes('index.html'));
  const handoff = await page.evaluate(() => JSON.parse(localStorage.getItem('wen_funnel_v1')));
  assert.equal(handoff.bd, '1990-06-15');
  assert.equal(await page.evaluate(() => localStorage.getItem('wen_load_profile_v1')), null);
  console.log('✓ 加载时暂停交接，选择继续后才保存并进入报告');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.evaluate(value => { localStorage.setItem('wen_funnel_v1', value); localStorage.setItem('wen_load_profile_v1', '42'); }, previous);
  await start();
  await finishQuiz();
  await page.click('#quitFunnel');
  await sleep(8200);
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#confirmFunnelExit')]);
  await sleep(800);
  assert.ok((await page.url()).includes('funnel.html'), '确认退出后不得发生延迟交接');
  assert.equal(await page.evaluate(() => localStorage.getItem('wen_funnel_v1')), previous);
  assert.equal(await page.evaluate(() => localStorage.getItem('wen_load_profile_v1')), '42');
  console.log('✓ 加载时确认退出不会提交或覆盖旧数据');
  assert.deepEqual(errors, []);
} finally {
  await context.close();
  await browser.close();
}
