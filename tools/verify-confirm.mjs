import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/confirm', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  // 先生成报告（示例）
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(4000);
  // 打开表单并修改出生日期（未推演）
  await page.evaluate(() => window.TJOpenForm());
  await sleep(500);
  await page.evaluate(() => {
    const el = document.getElementById('bDate');
    el.value = '1993-01-01';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(300);
  const dirty = await page.evaluate(() => window._formDirty);
  console.log('修改后 dirty:', dirty);
  // 关闭表单 → 报告页 → 点重新推演
  await page.evaluate(() => window.TJCloseForm());
  await sleep(300);
  await page.evaluate(() => document.querySelector('.p2-back')?.click());
  await sleep(500);
  const modal = await page.evaluate(() => ({
    confirmOpen: !!document.getElementById('tjConfirm'),
    title: document.querySelector('.tj-confirm-card .tt')?.textContent,
    text: document.querySelector('.tj-confirm-card .tx')?.textContent,
    stillOnReport: document.body.classList.contains('report-active'),
  }));
  console.log('弹窗:', JSON.stringify(modal));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/confirm/pop.png' });
  // 取消 → 留在报告页
  await page.evaluate(() => document.querySelector('.tj-confirm-card [data-act="cancel"]')?.click());
  await sleep(300);
  const afterCancel = await page.evaluate(() => ({
    confirmGone: !document.getElementById('tjConfirm'),
    stillOnReport: document.body.classList.contains('report-active'),
  }));
  console.log('取消后:', JSON.stringify(afterCancel));
  // 再点重新推演 → 继续返回 → 回首页
  await page.evaluate(() => document.querySelector('.p2-back')?.click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('.tj-confirm-card [data-act="ok"]')?.click());
  await sleep(500);
  const afterOk = await page.evaluate(() => ({
    backHome: !document.body.classList.contains('report-active'),
    page1Shown: !document.getElementById('page1')?.classList.contains('hidden'),
  }));
  console.log('继续返回后:', JSON.stringify(afterOk));
  // 无修改时点重新推演 → 不弹窗（先生成报告）
  await page.evaluate(() => { window._formDirty = false; window.showPage2 && window.showPage2(); });
  await sleep(400);
  await page.evaluate(() => document.querySelector('.p2-back')?.click());
  await sleep(400);
  const noDirty = await page.evaluate(() => !document.getElementById('tjConfirm'));
  console.log('未修改时直接返回(无弹窗):', noDirty ? '✅' : '❌');
  console.log('JS 错误:', errs.length, errs.slice(0,3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
