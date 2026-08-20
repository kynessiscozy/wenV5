import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await page.goto('https://afec98a9e4eec3cc8.bj10.agentos-app.net/', { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r=>setTimeout(r,1500));
// 打开示例推演
await page.evaluate(() => document.querySelector('#homeCtaGhost')?.click());
await new Promise(r=>setTimeout(r,4000));
// 打开 3 个代表性工具验证 tools2 已生效
for (const id of ['wealth','daily','relation']) {
  await page.evaluate(i => window.openToolPage(i), id);
  await new Promise(r=>setTimeout(r,900));
  const ok = await page.evaluate(() => !!document.querySelector('#toolModalContent .tw-mast-title'));
  console.log(id + ':', ok ? '✅ tools2 已生效' : '❌');
  await page.evaluate(() => window.closeToolPage());
  await new Promise(r=>setTimeout(r,300));
}
console.log('JS 错误数:', errs.length);
errs.slice(0,5).forEach(e=>console.log('  ERR:', e.slice(0,140)));
await page.screenshot({ path: '/workspace/wenV2-tools-shots/deploy-live.png' });
await browser.close();
