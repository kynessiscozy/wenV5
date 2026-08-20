import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/oracle2', { recursive: true });
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
  await page.evaluate(() => window.openToolPage('oracle'));
  await sleep(700);
  await page.evaluate(() => document.querySelector('#twODraw')?.click());
  // 阶段1：摇签中（600ms）
  await sleep(600);
  const shake = await page.evaluate(() => {
    const cup = document.querySelector('.tw-o-cup');
    const sticks = document.querySelectorAll('.tw-o-stick');
    return {
      shaking: document.querySelector('#twOStage')?.classList.contains('shake'),
      cupAnim: cup ? getComputedStyle(cup).animationName : '',
      stickCount: sticks.length,
      heights: [...sticks].map(s => s.style.height),
      delays: [...sticks].map(s => s.style.animationDelay),
    };
  });
  console.log('摇签中:', JSON.stringify(shake));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/oracle2/shake.png' });
  // 阶段2：出签（2000ms，ring + rising）
  await sleep(1500);
  const draw = await page.evaluate(() => {
    const st = document.querySelector('#twOStage');
    const rising = document.querySelector('.tw-o-stick.rising');
    const ring = document.querySelector('.tw-o-ring');
    return {
      draw: st?.classList.contains('draw'),
      risingTransform: rising ? getComputedStyle(rising).transform : '无',
      risingFilter: rising ? getComputedStyle(rising).filter : '',
      ringOn: ring?.classList.contains('on'),
      status: document.querySelector('.tw-o-status')?.textContent,
    };
  });
  console.log('出签:', JSON.stringify(draw));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/oracle2/draw.png' });
  // 阶段3：结果卡（3000ms+）
  await sleep(1300);
  const card = await page.evaluate(() => ({
    card: !!document.querySelector('.tw-o-card'),
    anim: getComputedStyle(document.querySelector('.tw-o-card')).animationName,
    grade: document.querySelector('.tw-o-card .grade')?.textContent,
  }));
  console.log('结果卡:', JSON.stringify(card));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/oracle2/card.png' });
  console.log('JS 错误:', errs.length);
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
