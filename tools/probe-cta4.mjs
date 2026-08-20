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
    const hero = document.querySelector('.home-hero');
    const ar = actions.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    const mcs = getComputedStyle(main);
    const acs = getComputedStyle(actions);
    return {
      heroW: Math.round(hr.width), actionsW: Math.round(ar.width),
      mainMin: mcs.minWidth, mainFlex: mcs.flex, mainNowrap: mcs.whiteSpace,
      actionsDisplay: acs.display, actionsMaxW: acs.maxWidth,
      mainMW: main.scrollWidth,
      heroMaxW: getComputedStyle(hero).maxWidth,
    };
  });
  console.log(JSON.stringify(r, null, 1));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
