import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  // 1) 弹窗动画
  await page.evaluate(() => window.openToolPage('wealth'));
  await sleep(200);
  const modal = await page.evaluate(() => ({
    modalAnim: getComputedStyle(document.querySelector('.tool-modal')).animationName,
    sheetAnim: getComputedStyle(document.querySelector('.tool-sheet')).animationName,
    sheetOrigin: getComputedStyle(document.querySelector('.tool-sheet')).transformOrigin,
  }));
  console.log('弹窗动画:', JSON.stringify(modal));
  await page.evaluate(() => window.closeToolPage());
  await sleep(400);
  // 2) Dock 指示条过渡
  const ind = await page.evaluate(() => {
    const t = getComputedStyle(document.querySelector('.tab-indicator')).transitionProperty;
    return t;
  });
  console.log('指示条过渡属性:', ind);
  // 3) ai-sheet 弹簧
  await page.evaluate(() => window.openAsk());
  await sleep(300);
  const sheet = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.ai-sheet'));
    return { t: cs.transitionProperty, dur: cs.transitionDuration, tf: cs.transitionTimingFunction.slice(0, 40) };
  });
  console.log('ai-sheet 过渡:', JSON.stringify(sheet));
  await page.evaluate(() => window.closeAsk());
  // 4) tool-tile hover（工具中心）
  await page.evaluate(() => document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
  await sleep(900);
  const tile = await page.evaluate(() => {
    const t = document.querySelector('.tool-tile');
    const cs = getComputedStyle(t);
    return { transition: cs.transitionDuration, willChange: cs.willChange };
  });
  console.log('tool-tile:', JSON.stringify(tile));
  // 5) 全局按钮 active 反馈
  const btnActive = await page.evaluate(() => {
    const btn = document.querySelector('.tool-tile button, button.p2-act, .home-cta');
    return btn ? getComputedStyle(btn).transitionDuration : 'n/a';
  });
  console.log('按钮过渡:', btnActive);
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
