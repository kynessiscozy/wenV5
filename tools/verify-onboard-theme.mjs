/* 新手引导 · 明暗双主题验证截图 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const BASE = 'http://localhost:5174/wenV2/';
const OUT = '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/onboard-theme';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const out = {};
try {
  for (const theme of ['light','dark']) {
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await page.evaluate(t => { localStorage.setItem('tj_theme', t); localStorage.removeItem('tj_onboarded_v1'); }, theme);
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.onboard-overlay', { timeout: 6000 });
    await sleep(450);
    const grab = () => page.evaluate(() => {
      const cs = el => el ? getComputedStyle(el) : null;
      const card = document.querySelector('.onboard-card');
      const next = document.querySelector('.onboard-next');
      const tryb = document.querySelector('.onboard-try');
      const title = document.querySelector('.onboard-title');
      return {
        theme: getComputedStyle(document.documentElement).getPropertyValue('data-theme') || (theme=>theme)(document.documentElement.getAttribute('data-theme')),
        cardBg: cs(card).backgroundImage.slice(0,60),
        titleColor: cs(title).color,
        nextBg: cs(next).backgroundColor || cs(next).backgroundImage.slice(0,40),
        nextColor: cs(next).color,
        tryVisible: tryb && !tryb.hidden,
        tryBorder: tryb ? cs(tryb).borderColor : null,
      };
    });
    // step1 欢迎
    await page.screenshot({ path: OUT + '/' + theme + '-s1-welcome.png' });
    out[theme+'_s1'] = await grab();
    // step2 AI 对话（含次级 try 按钮）
    await page.click('.onboard-next'); await sleep(380);
    await page.screenshot({ path: OUT + '/' + theme + '-s2-ai.png' });
    out[theme+'_s2'] = await grab();
    // step3 日历
    await page.click('.onboard-next'); await sleep(380);
    await page.screenshot({ path: OUT + '/' + theme + '-s3-cal.png' });
    // step4 末步 排盘
    await page.click('.onboard-next'); await sleep(380);
    await page.screenshot({ path: OUT + '/' + theme + '-s4-final.png' });
  }
} catch (e) { out.error = e.message; }
finally { console.log(JSON.stringify(out, null, 1)); await browser.close(); }
