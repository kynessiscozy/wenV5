import puppeteer from 'puppeteer';

const URL = 'https://afec98a9e4eec3cc8.bj10.agentos-app.net';
const out = '/root/.codebuddy/artifact';

const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));

// 在首页空白处模拟一次按下+移动（触发液态流动）
async function ripple() {
  await page.mouse.move(640, 460);
  await page.mouse.down();
  for (let i = 0; i < 8; i++) { await page.mouse.move(640 + i * 12, 460 + i * 6); await new Promise(r => setTimeout(r, 20)); }
}
await ripple();
await new Promise(r => setTimeout(r, 120));
await page.screenshot({ path: `${out}/orb_flow_brand.png` });
await page.mouse.up();

// 切到冰蓝再点一次，确认流动色跟随
await page.evaluate(() => window._tjLiquidOrb.setColor('ice'));
await new Promise(r => setTimeout(r, 150));
await ripple();
await new Promise(r => setTimeout(r, 120));
await page.screenshot({ path: `${out}/orb_flow_ice.png` });
await page.mouse.up();

console.log('pageerrors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
