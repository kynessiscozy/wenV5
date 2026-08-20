import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
  await sleep(3500);
  await page.evaluate(() => window.openToolPage('lottery'));
  await sleep(600);
  await page.evaluate(() => document.querySelector('#twLotDraw')?.click());
  await sleep(1500);
  const info = await page.evaluate(() => {
    const balls = [...document.querySelectorAll('.tw-l-ball')];
    return {
      total: balls.length,
      reds: balls.filter(b => b.classList.contains('red')).length,
      blues: balls.filter(b => b.classList.contains('blue')).length,
      types: balls.map(b => ({ cls: [...b.classList].join(','), text: b.textContent, animDelay: b.style.animationDelay, display: getComputedStyle(b).display, opacity: getComputedStyle(b).opacity, w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height })),
      rowHtml: document.querySelector('.tw-l-ball-row')?.outerHTML?.slice(0, 500),
    };
  });
  console.log('球总数:', info.total, '| 红:', info.reds, '| 蓝:', info.blues);
  console.log('各球:', JSON.stringify(info.types, null, 1));
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
