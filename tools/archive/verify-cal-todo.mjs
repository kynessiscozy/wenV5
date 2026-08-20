import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/caltodo', { recursive: true });
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
  await page.evaluate(() => document.querySelector('#calFab')?.click());
  await sleep(800);
  // 选中今天（8-17，本月默认选中今天）
  await page.evaluate(() => document.querySelector('.tw-cal-day.today')?.click());
  await sleep(300);
  // 添加两条待办
  await page.evaluate(() => {
    const inp = document.querySelector('#twCalTodoIn');
    inp.value = '提交周报';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#twCalTodoAdd')?.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const inp = document.querySelector('#twCalTodoIn');
    inp.value = '准备明天的会议';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#twCalTodoAdd')?.click();
  });
  await sleep(300);
  const afterAdd = await page.evaluate(() => ({
    items: [...document.querySelectorAll('.tw-cal-todo .it .tx')].map(x => x.textContent),
    cnt: document.querySelector('.tw-cal-todo .cnt')?.textContent,
    cellMark: document.querySelector('.tw-cal-day.today .todo-n')?.textContent,
    stored: JSON.parse(localStorage.getItem('tj_cal_todo') || '{}'),
  }));
  console.log('添加后:', JSON.stringify(afterAdd));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/caltodo/list.png' });
  // 勾选完成第一条
  await page.evaluate(() => document.querySelector('.tw-cal-todo .it .ck')?.click());
  await sleep(300);
  const afterToggle = await page.evaluate(() => ({
    done: document.querySelectorAll('.tw-cal-todo .it.done').length,
    cnt: document.querySelector('.tw-cal-todo .cnt')?.textContent,
    cellMark: document.querySelector('.tw-cal-day.today .todo-n')?.textContent,
    stored: JSON.parse(localStorage.getItem('tj_cal_todo') || '{}'),
  }));
  console.log('勾选后:', JSON.stringify(afterToggle));
  // 删除第二条
  await page.evaluate(() => document.querySelectorAll('.tw-cal-todo .it .del')[0]?.click());
  await sleep(300);
  const afterDel = await page.evaluate(() => ({
    items: [...document.querySelectorAll('.tw-cal-todo .it .tx')].map(x => x.textContent),
    cellMark: document.querySelector('.tw-cal-day.today .todo-n')?.textContent,
  }));
  console.log('删除后:', JSON.stringify(afterDel));
  // 关闭再打开，数据保留
  await page.evaluate(() => document.querySelector('.tool-modal-bg')?.click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('#calFab')?.click());
  await sleep(800);
  const persisted = await page.evaluate(() => {
    const t = JSON.parse(localStorage.getItem('tj_cal_todo') || '{}');
    const key = Object.keys(t)[0];
    return key ? { key, items: t[key].map(x => ({ text: x.text, done: x.done })) } : null;
  });
  console.log('重开日历后:', JSON.stringify(persisted));
  console.log('JS 错误:', errs.length, errs.slice(0,3).join(' | '));
} catch (e) { console.error('异常:', e.message); }
finally { await browser.close(); }
