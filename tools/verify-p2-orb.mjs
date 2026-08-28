// 验证 P2 菜单中"紧凑"按钮已改造为主题色变更按钮
import puppeteer from 'puppeteer';

const URL = 'https://afec98a9e4eec3cc8.bj10.agentos-app.net';
const OUT = '/root/.codebuddy/artifact';
const results = [];
let pass = 0, total = 0;
function assert(name, v) {
  total++;
  console.log(`${v ? 'PASS' : 'FAIL'} | ${name}`);
  if (v) pass++;
  results.push([name, v]);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=2'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction('window._tjLiquidOrb && window._tjLiquidOrb.getPresets', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1200));

  // 1) 检查"紧凑"按钮已不存在，主题色按钮存在
  const hasCompact = await page.$('#p2DensityBtn');
  assert('紧凑按钮 (#p2DensityBtn) 已移除', hasCompact === null);

  const orbBtnExists = await page.$('#p2OrbBtn');
  assert('主题色按钮 (#p2OrbBtn) 存在', orbBtnExists !== null);
  const orbBtnText = await page.evaluate(() => document.querySelector('#p2OrbBtn span')?.textContent);
  assert('主题色按钮文案为「主题色」', orbBtnText === '主题色');

  // 2) 色板已构建（7个色块）
  const swatchCount = await page.evaluate(() => document.querySelectorAll('#p2OrbPaletteGrid .p2-orb-palette-swatch').length);
  assert('P2 色板包含 7 个色块', swatchCount === 7);

  // 3) 打开 P2 菜单
  await page.evaluate(() => window.toggleP2Menu(true));
  await new Promise((r) => setTimeout(r, 500));
  const drawerOpen = await page.evaluate(() => document.getElementById('p2MenuDrawer')?.classList.contains('open'));
  assert('P2 菜单抽屉打开', drawerOpen === true);
  await page.screenshot({ path: `${OUT}/p2orb_menu_open.png` });

  // 4) 点击主题色按钮展开色板
  await page.click('#p2OrbBtn');
  await new Promise((r) => setTimeout(r, 400));
  const paletteOpen = await page.evaluate(() => document.getElementById('p2OrbPalette')?.classList.contains('open'));
  assert('点击后色板展开', paletteOpen === true);
  await page.screenshot({ path: `${OUT}/p2orb_palette_open.png` });

  // 5) 记录当前 accent，选择 ice 色块
  const before = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim());
  const iceSwatch = await page.$('#p2OrbPaletteGrid .p2-orb-palette-swatch[data-key="ice"]');
  assert('ice 色块存在', iceSwatch !== null);
  await iceSwatch.click();
  await new Promise((r) => setTimeout(r, 600));

  const after = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      accent: cs.getPropertyValue('--c-accent').trim(),
      orbKey: window._tjLiquidOrb.getColorKey(),
    };
  });
  assert('选中 ice 后 --c-accent 变化', before !== after.accent);
  assert('选中 ice 后 orbColorKey 变为 ice', after.orbKey === 'ice');
  assert('--c-accent 为冰蓝系', /hsl\(20[0-9],/.test(after.accent));
  await page.screenshot({ path: `${OUT}/p2orb_after_ice.png` });

  // 6) 选色后 active 高亮同步（与首页调色盘一致：选色后面板保持打开，点击外部关闭）
  const activeKey = await page.evaluate(() => {
    const a = document.querySelector('#p2OrbPaletteGrid .p2-orb-palette-swatch.active');
    return a ? a.dataset.key : null;
  });
  assert('选色后 active 高亮为 ice', activeKey === 'ice');

  console.log(`\n===== 结果: ${pass}/${total} =====`);
  await browser.close();
  process.exit(pass === total ? 0 : 1);
})().catch((e) => {
  console.error('ERROR', e);
  process.exit(2);
});
