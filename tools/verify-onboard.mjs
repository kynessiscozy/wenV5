import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/onboard', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const out = {};
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  // 清掉标记，模拟首次
  await page.evaluate(() => localStorage.removeItem('tj_onboarded_v1'));
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.onboard-overlay', { timeout: 5000 });
  await sleep(400);
  const snap = () => page.evaluate(() => {
    const o = document.querySelector('.onboard-overlay');
    const active = document.querySelectorAll('.onboard-dot.active').length;
    const total = document.querySelectorAll('.onboard-dot').length;
    const tryBtn = document.querySelector('.onboard-try');
    return {
      title: document.querySelector('.onboard-title')?.textContent,
      next: document.querySelector('.onboard-next')?.textContent,
      tryVisible: tryBtn && !tryBtn.hidden,
      tryText: tryBtn?.textContent || null,
      activeDots: active, totalDots: total,
      overlay: !!o,
    };
  });
  out.step1 = await snap();
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/onboard/s1.png' });
  // 翻到第2步
  await page.click('.onboard-next'); await sleep(350); out.step2 = await snap();
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/onboard/s2.png' });
  await page.click('.onboard-next'); await sleep(350); out.step3 = await snap();
  await page.click('.onboard-next'); await sleep(350); out.step4 = await snap();
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/onboard/s4.png' });
  // 末步「开始体验」→ 应关闭引导并打开排盘表单
  out.lsBefore = await page.evaluate(() => localStorage.getItem('tj_onboarded_v1'));
  await page.click('.onboard-next'); await sleep(800);
  out.afterFinal = await page.evaluate(() => ({
    overlayGone: !document.querySelector('.onboard-overlay'),
    formOpen: document.getElementById('formModal')?.classList.contains('open'),
    ls: localStorage.getItem('tj_onboarded_v1'),
  }));
  // 刷新后不应再显示
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(600);
  out.relaunched = await page.evaluate(() => ({ overlay: !!document.querySelector('.onboard-overlay') }));
} catch (e) { out.error = e.message; }
finally { console.log(JSON.stringify(out, null, 1)); await browser.close(); }
