import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { getCompatibility } from '../src/engines/horoscope.js';
import { selectHomeTrait, openDemoReport } from './test-entry.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

async function checkLottery(page, type) {
  await page.evaluate(() => { window.closeToolPage(); window.openToolPage('lottery'); });
  await page.waitForSelector('#twLotDraw');
  if (type === 'dlt') await page.click('#toolModalContent [data-k="dlt"]');
  await page.click('#toolModalContent [data-k="3"]');
  const modern = await page.evaluate(() => {
    const previous = Math.random;
    let seed = 123456;
    Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    try { document.querySelector('#twLotDraw').click(); } finally { Math.random = previous; }
    return [...document.querySelectorAll('.tw-l-ball-row')].map(row => ({
      red: [...row.querySelectorAll('.red')].map(el => el.textContent),
      blue: [...row.querySelectorAll('.blue')].map(el => el.textContent),
    }));
  });
  assert.equal(modern.length, 3);
  for (const row of modern) {
    assert.equal(row.red.length, type === 'ssq' ? 6 : 5);
    assert.equal(row.blue.length, type === 'ssq' ? 1 : 2);
    assert.ok([...row.red, ...row.blue].every(value => /^\d{2}$/.test(value)), '号码应保留两位格式');
  }
  await page.$eval('#twLotCopy', el => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  const beforeCopy = await page.evaluate(() => {
    const btn = document.querySelector('#twLotCopy');
    const rect = btn?.getBoundingClientRect();
    const hit = rect && document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { rect: rect?.toJSON(), hit: hit?.outerHTML.slice(0, 250) };
  });
  await page.click('#twLotCopy');
  try {
    await page.waitForFunction(() => window.__copiedLottery, { timeout: 4000 });
  } catch (error) {
    const info = await page.evaluate(() => ({
      activeTool: window._activeTool,
      modal: document.querySelector('#toolModal')?.className,
      content: document.querySelector('#toolModalContent')?.innerText.slice(0, 200),
      clipboard: typeof navigator.clipboard?.writeText,
    }));
    throw new Error(`复制按钮未响应: ${JSON.stringify({ beforeCopy, ...info })}; ${error.message}`);
  }
  assert.match(await page.evaluate(() => window.__copiedLottery), type === 'ssq' ? /双色球 3 注/ : /超级大乐透 3 注/);
  await page.evaluate(() => { window.__copiedLottery = ''; });

  // Test the result actions with pointer clicks as well as deterministic draws.
  await page.$eval('#twLotAgain', el => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await page.evaluate(() => {
    window.__restoreLotteryRandom = Math.random;
    let seed = 987654;
    Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  });
  try { await page.click('#twLotAgain'); }
  finally { await page.evaluate(() => { Math.random = window.__restoreLotteryRandom; delete window.__restoreLotteryRandom; }); }
  const redrawn = await page.$$eval('.tw-l-ball-row', rows => rows.map(row => ({
    red: [...row.querySelectorAll('.red')].map(el => el.textContent),
    blue: [...row.querySelectorAll('.blue')].map(el => el.textContent),
  })));
  assert.equal(redrawn.length, 3);
  assert.notDeepEqual(redrawn, modern, '换一组应重新生成号码');
  await page.$eval('.tw-result-back', el => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await page.click('.tw-result-back');
  assert.equal(await page.$eval('.tw-view-form', el => el.classList.contains('tw-view-hidden')), false);
  assert.equal(await page.$eval('#toolModalContent [data-k="3"]', el => el.classList.contains('active')), true);
  assert.equal(await page.$eval(`#toolModalContent [data-k="${type}"]`, el => el.classList.contains('active')), true);

  // Old window API stays callable and produces the same numbers and labels
  // when given the same random sequence as the modern tool.
  const legacy = await page.evaluate(type => {
    window.closeToolPage();
    const inputs = document.createElement('div');
    inputs.hidden = true;
    inputs.innerHTML = '<input id="lotteryType"><input id="lotteryCount">';
    document.body.appendChild(inputs);
    document.getElementById('lotteryType').value = type;
    document.getElementById('lotteryCount').value = '3';
    window._activeTool = 'lottery';
    const previous = Math.random;
    let seed = 123456;
    Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    try { window.runLotteryTool(); } finally { Math.random = previous; inputs.remove(); }
    return [...document.querySelectorAll('#toolModalContent .tr-text-body')].map(el => {
      const spans = [...el.querySelectorAll('span')];
      return {
        red: spans[0].textContent.match(/\d{2}/g) || [],
        blue: spans[1].textContent.match(/\d{2}/g) || [],
        redLabel: spans[0].textContent,
        blueLabel: spans[1].textContent,
      };
    });
  }, type);
  assert.equal(legacy.length, 3);
  legacy.forEach((row, i) => {
    assert.deepEqual({ red: row.red, blue: row.blue }, modern[i]);
    assert.match(row.redLabel, type === 'ssq' ? /^红球 / : /^前区 /);
    assert.match(row.blueLabel, type === 'ssq' ? /^蓝球 / : /^后区 /);
  });
  if (type === 'ssq') {
    const fractionalCount = await page.evaluate(() => {
      const inputs = document.createElement('div');
      inputs.hidden = true;
      inputs.innerHTML = '<input id="lotteryType" value="ssq"><input id="lotteryCount" value="2.5">';
      document.body.appendChild(inputs);
      window._activeTool = 'lottery';
      try {
        window.runLotteryTool();
        return document.querySelectorAll('#toolModalContent .tr-text-body').length;
      } finally { inputs.remove(); }
    });
    assert.equal(fractionalCount, 3, '旧入口保留非整数注数的历史取整方式');
  }
}

try {
  const viewports = [{ width: 390, height: 844 }, { width: 1280, height: 800 }];
  for (const viewport of process.env.TEST_DESKTOP_ONLY ? viewports.slice(1) : viewports) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport(viewport);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: text => { window.__copiedLottery = text; return Promise.resolve(); },
      } });
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        if (String(input).startsWith('https://api.deepseek.com/')) {
          return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: {
            content: `<img src=x onerror="window.__cleanupXss=true">\n\n下一行`,
          } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return originalFetch(input, init);
      };
    });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await selectHomeTrait(page);
    await page.waitForFunction(() => window._tools2Ready === true, { timeout: 15000 });

    await page.evaluate(() => window.showRiQian());
    const daily = await page.$eval('#rqResult', el => el.textContent);
    const dayZhi = daily.match(/[甲乙丙丁戊己庚辛壬癸]([子丑寅卯辰巳午未申酉戌亥])日/)?.[1];
    assert.ok(dayZhi, '日签应显示今日干支');
    const opposition = '鼠牛虎兔龙蛇马羊猴鸡狗猪'[('子丑寅卯辰巳午未申酉戌亥'.indexOf(dayZhi) + 6) % 12];
    assert.ok(daily.includes('冲' + opposition), '日签冲生肖应符合六冲关系');
    await page.evaluate(() => window.closeRq());

    await page.evaluate(() => { localStorage.setItem('tj_ai_apikey_deepseek', 'test-only-key'); window.openToolPage('horoscope'); });
    await page.waitForSelector('#twHSynMe');
    await page.select('#twHSynMe', 'aries');
    await page.select('#twHSynOther', 'leo');
    assert.match(await page.$eval('.pair-title', el => el.textContent), /白羊座.*狮子座/);
    assert.equal(Number((await page.$eval('.tw-h-gauge-box .score', el => el.textContent)).replace('%', '')), getCompatibility('aries', 'leo').score);
    await page.click('#twAiMainBtn');
    await page.waitForSelector('.tw-ai-text');
    const ai = await page.$eval('.tw-ai-text', el => ({ html: el.innerHTML, images: el.querySelectorAll('img').length, text: el.textContent }));
    assert.equal(ai.images, 0);
    assert.match(ai.html, /&lt;img/);
    assert.match(ai.html, /<br>下一行/);
    assert.equal(await page.evaluate(() => !!window.__cleanupXss), false);
    await page.click('[data-tab="compendium"]');
    await page.click('[data-elem="fire"]');
    assert.equal((await page.$$('#toolModalContent .tw-h-cat-tile')).length, 3);
    await page.click('[data-sign="sagittarius"]');
    assert.match(await page.$eval('.tw-h-detail-card h3', el => el.textContent), /射手座/);
    await page.click('#twHUseAsMySign');
    assert.equal(await page.$eval('#twHSynMe', el => el.value), 'sagittarius');

    await page.evaluate(() => window.closeToolPage());
    await openDemoReport(page);
    await page.evaluate(() => window.openToolPage('date'));
    await page.waitForSelector('#twDDetail');
    await page.click('#toolModalContent button.tw-d-day');
    assert.match(await page.$eval('#twDDetail', el => el.textContent), /基调.*十神.*适配度/s, '点击日期应展示详细计算');
    await page.select('#twDEvent', '搬家出行');
    await page.click('#toolModalContent button.tw-d-day');
    assert.match(await page.$eval('#twDDetail', el => el.textContent), /搬家出行.*适配度/s);
    await checkLottery(page, 'ssq');
    await checkLottery(page, 'dlt');
    assert.deepEqual(errors, [], `浏览器错误：${errors.join('; ')}`);
    console.log(`✓ ${viewport.width}px：日签、星座速配/图鉴/AI 防注入、择日点击、两种新旧选号及结果操作`);
    await page.close();
  }
} finally {
  await browser.close();
}
