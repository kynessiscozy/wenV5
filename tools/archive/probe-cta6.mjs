import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
const probe = async (w) => {
  await page.setViewport({ width: w, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(700);
  return page.evaluate(() => {
    const main = document.querySelector('#homeCtaMain');
    const cal = document.querySelector('#homeCtaCal');
    const actions = document.querySelector('.home-hero-actions');
    const mr = main.getBoundingClientRect(), ar = actions.getBoundingClientRect();
    const mcs = getComputedStyle(main);
    return {
      viewW: window.innerWidth,
      actionsW: Math.round(ar.width), actionsLeft: Math.round(ar.left), actionsRight: Math.round(ar.right),
      mainW: Math.round(mr.width), mainScrollW: main.scrollWidth, mainClientW: main.clientWidth,
      textOverflow: main.scrollWidth > main.clientWidth,
      mainOutOfActions: mr.right > ar.right + 1 || mr.left < ar.left - 1,
      padding: mcs.padding, fontSize: mcs.fontSize, boxSizing: mcs.boxSizing,
      whiteSpace: mcs.whiteSpace,
      calW: Math.round(cal.getBoundingClientRect().width),
    };
  });
};
try {
  console.log('390px:', JSON.stringify(await probe(390)));
  console.log('375px:', JSON.stringify(await probe(375)));
  console.log('360px:', JSON.stringify(await probe(360)));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
