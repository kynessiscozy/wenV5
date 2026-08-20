import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync('/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calfill', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const log = (...a) => console.log(...a);
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(700);
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(700);
  // 初始：填写信息按钮 + 未排盘 pill
  const init = await page.evaluate(() => {
    const fill = document.querySelector('[data-fill]');
    const ops = document.querySelector('.tw-cal-ops');
    const cs = getComputedStyle(ops);
    return {
      hasFillBtn: !!fill, fillText: fill?.textContent.trim(),
      pill: document.querySelector('.tw-cal-pill')?.textContent.trim(),
      opsGap: cs.gap, opsWrap: cs.flexWrap,
      fillMinH: getComputedStyle(fill).minHeight,
    };
  });
  log('初始:', JSON.stringify(init));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calfill/1-initial.png' });

  // 点填写信息 → formModal 打开
  await page.evaluate(() => document.querySelector('[data-fill]').click());
  await sleep(500);
  const fm = await page.evaluate(() => {
    const m = document.getElementById('formModal');
    const top = document.querySelector('.tw-cal-bar')?.getBoundingClientRect().top;
    return { open: m.classList.contains('open'), formZ: getComputedStyle(m).zIndex, calZ: getComputedStyle(document.getElementById('toolModal')).zIndex, calVisible: top!==undefined };
  });
  log('表单:', JSON.stringify(fm));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calfill/2-form.png' });

  // 录八字（默认值已有效，确保一下）并提交
  await page.evaluate(() => {
    const set = (id,v)=>{const el=document.getElementById(id); if(el){el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));}};
    set('bDate','1990-06-15'); set('bTime','09:00'); set('bGen','male'); set('bPlace','shanghai');
    window.calc();
  });
  await sleep(900);
  const after = await page.evaluate(() => {
    const m = document.getElementById('formModal');
    const pill = document.querySelector('.tw-cal-pill');
    const page2 = document.getElementById('page2');
    const cal = document.querySelector('.tw-cal');
    return {
      formStillOpen: m.classList.contains('open'),
      pill: pill?.textContent.trim(),
      pillIsCombined: /已结合命盘/.test(pill?.textContent||''),
      page2Visible: page2 && !page2.classList.contains('hidden'),
      calendarStillThere: !!cal,
      hasFillBtn: !!document.querySelector('[data-fill]'),
    };
  });
  log('录入后:', JSON.stringify(after));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calfill/3-combined.png' });

  // 点某天，确认详情显示命理（能量/今宜）
  await page.evaluate(() => { const d=document.querySelector('.tw-cal-day:not(.blank):not(.sel)'); d?.click(); });
  await sleep(400);
  const detail = await page.evaluate(() => {
    const dt = document.querySelector('.tw-cal-detail');
    const txt = dt?.textContent || '';
    return { hasEnergy: /当日能量/.test(txt), hasAct: /今日适合/.test(txt), len: txt.length };
  });
  log('详情:', JSON.stringify(detail));
} catch (e) { log('ERR', e.message); }
finally { await browser.close(); }
