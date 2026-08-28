import puppeteer from 'puppeteer';

const URL = 'https://afec98a9e4eec3cc8.bj10.agentos-app.net';
const out = '/root/.codebuddy/artifact';
const ok = (n, c) => console.log((c ? 'PASS' : 'FAIL') + ' | ' + n);

const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 900));

const keys = await page.evaluate(() => window._tjLiquidOrb ? window._tjLiquidOrb.getPresets().map(p => p.key) : []);
console.log('presets:', keys.join(','));
ok('amber 已移除', !keys.includes('amber'));
ok('gold 已移除', !keys.includes('gold'));
ok('brand 存在', keys.includes('brand'));

const cur = await page.evaluate(() => window._tjLiquidOrb ? window._tjLiquidOrb.getColorKey() : '?');
ok('默认键为 brand', cur === 'brand');

const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim());
console.log('--c-accent:', accent);
ok('强调色为赭色系(hue~15)', /hsl\(15/.test(accent) || /15,/.test(accent));

await page.screenshot({ path: `${out}/orb_brand_default.png` });

// 打开 P2 菜单确认色板无黄色
await page.evaluate(() => window.toggleP2Menu && window.toggleP2Menu(true));
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: `${out}/orb_brand_p2.png` });

await browser.close();
