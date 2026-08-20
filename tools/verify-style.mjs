import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/style';
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage','--window-size=480,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  await page.evaluate(() => window.openToolPage('style'));
  await sleep(700);
  // 模拟天气数据（注入 getWxNow 返回值不便，改为 window 上放一份测试天气）
  await page.evaluate(() => { window.__wxTest = { city: '上海', temp: 31, hum: 72, wind: 18, label: '多云', icon: 'cloud-sun' }; });
  // 重新打开 style 让天气生效？——style open 时调用 getWxNow()，这里注入后需触发。改为直接走结果页检查
  await page.evaluate(() => document.querySelector('#twSGen')?.click());
  await sleep(800);
  const info = await page.evaluate(() => ({
    mast: !!document.querySelector('.tw-mast-title'),
    art: document.querySelectorAll('.tw-style-art').length,
    artBox: document.querySelectorAll('.tw-style-art-box').length,
    wx: !!document.querySelector('.tw-style-wx'),
    wxText: document.querySelector('.tw-style-wx .wx-copy')?.innerText || '',
    palette: document.querySelectorAll('.tw-s-swatch').length,
    backBtn: !!document.querySelector('.tw-result-back'),
  }));
  console.log('style 结果页:', JSON.stringify(info));
  await page.screenshot({ path: OUT + '/style-result.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
