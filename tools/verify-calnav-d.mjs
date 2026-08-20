import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(700);
  await page.evaluate(() => document.querySelector('#homeCtaCal')?.click());
  await sleep(700);
  const r = await page.evaluate(() => {
    const bar = document.querySelector('.tw-cal-bar');
    const wrap = document.querySelector('.tw-cal-monthwrap');
    const month = document.querySelector('.tw-cal-month');
    const navs = document.querySelectorAll('.tw-cal-nav');
    const br = bar.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), mr = month.getBoundingClientRect();
    return {
      barCx: Math.round(br.left+br.width/2), wrapCx: Math.round(wr.left+wr.width/2),
      wrapCentered: Math.abs((wr.left+wr.width/2)-(br.left+br.width/2))<4,
      prevGap: Math.round(mr.left-navs[0].getBoundingClientRect().right),
      nextGap: Math.round(navs[1].getBoundingClientRect().left-mr.right),
      navCount: navs.length,
    };
  });
  console.log('桌面端:', JSON.stringify(r));
  await page.screenshot({ path: '/root/.codebuddy/projects/workspace/2f8a7d30-9c21-4f0b-1cfe-b21be6359000/wenV2/wenV2-main-2/.verify-shots/calnav/after-desktop.png' });
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
