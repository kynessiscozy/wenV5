import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/homenodemo', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  // 1) 首页按钮结构
  const btns = await page.evaluate(() => [...document.querySelectorAll('.home-hero-actions button')].map(b => ({
    text: b.textContent.trim() || '[图标]',
    id: b.id,
    hasSvg: !!b.querySelector('svg'),
  })));
  console.log('首页按钮:', JSON.stringify(btns));
  const hasDemo = await page.evaluate(() => !!document.getElementById('homeCtaGhost'));
  console.log('我先看看按钮已移除:', !hasDemo ? '✅' : '❌');
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/homenodemo/home.png' });
  // 2) 点输入信息 → 表单正常
  await page.evaluate(() => document.querySelector('#homeCtaMain')?.click());
  await sleep(500);
  const form = await page.evaluate(() => {
    const fm = document.getElementById('formModal');
    return { open: fm?.classList.contains('open') || !!document.querySelector('.form-modal, #formSheet, [id*=form]') };
  });
  console.log('输入信息弹窗:', JSON.stringify(form));
  // 关闭表单（按 Esc 或点遮罩）
  await page.keyboard.press('Escape');
  await sleep(400);
  // 3) 点日历 → 全屏日历
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(900);
  const cal = await page.evaluate(() => ({
    open: document.querySelector('#toolModal')?.classList.contains('open'),
    fullscreen: document.querySelector('#toolModal')?.classList.contains('cal-fullscreen'),
    hasGrid: document.querySelectorAll('.tw-cal-day:not(.blank)').length > 20,
    pill: document.querySelector('.tw-cal-pill')?.textContent,
    demoNote: !!document.querySelector('.demo-report-note'),
  }));
  console.log('日历模式:', JSON.stringify(cal));
  // 4) 关闭日历，确认首页无示例报告跳转
  await page.evaluate(() => document.querySelector('.tw-cal-back')?.click());
  await sleep(500);
  const backHome = await page.evaluate(() => ({
    onHome: document.getElementById('page1') ? getComputedStyle(document.getElementById('page1')).display !== 'none' : false,
    noReport: !document.getElementById('page2')?.classList.contains('active'),
  }));
  console.log('返回首页:', JSON.stringify(backHome));
  console.log('JS 错误:', errs.length, errs.slice(0,3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
