import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const r = await page.evaluate(() => {
    const actions = document.querySelector('.home-hero-actions');
    const main = document.querySelector('#homeCtaMain');
    const cal = document.querySelector('#homeCtaCal');
    const acs = getComputedStyle(actions);
    const mcs = getComputedStyle(main);
    const ccs = getComputedStyle(cal);
    const ar = actions.getBoundingClientRect();
    const mr = main.getBoundingClientRect();
    const cr = cal.getBoundingClientRect();
    return {
      actionsW: Math.round(ar.width), actionsJustify: acs.justifyContent,
      actionsGap: acs.gap, actionsAlign: acs.alignItems,
      main: { w: Math.round(mr.width), flex: mcs.flex, mw: mcs.minWidth, maxW: mcs.maxWidth, pad: mcs.padding },
      cal: { w: Math.round(cr.width), flex: ccs.flex, mw: ccs.minWidth, maxW: ccs.maxWidth, pad: ccs.padding },
    };
  });
  console.log(JSON.stringify(r, null, 1));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
