// 验证第12个需求：切换光球颜色时，--c-accent 变量及"输入信息"按钮同步变色
import puppeteer from 'puppeteer';

const URL = process.env.TJ_URL || 'https://afec98a9e4eec3cc8.bj10.agentos-app.net';
const OUT = process.env.TJ_OUT || '/root/.codebuddy/artifact';
const results = [];

function rgbToHex(rgb) {
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) return rgb;
  const parts = m[1].split(',').map((s) => s.trim());
  const toHex = (n) => {
    const v = Math.round(parseFloat(n));
    return v.toString(16).padStart(2, '0');
  };
  return '#' + toHex(parts[0]) + toHex(parts[1]) + toHex(parts[2]);
}

async function capture(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
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

  const probe = async (label) => {
    return await page.evaluate((l) => {
      const cs = getComputedStyle(document.documentElement);
      const btn = document.querySelector('.home-cta');
      const bcs = getComputedStyle(btn);
      const orb = document.querySelector('canvas.liquid-orb');
      return {
        label: l,
        orbColorKey: window._tjLiquidOrb.getColorKey(),
        cAccent: cs.getPropertyValue('--c-accent').trim(),
        orbAmb1: cs.getPropertyValue('--orb-amb-1').trim(),
        btnBg: bcs.backgroundColor,
        btnBgHex: (() => {
          const m = bcs.backgroundColor.match(/rgba?\(([^)]+)\)/);
          if (!m) return bcs.backgroundColor;
          const p = m[1].split(',').map((s) => s.trim());
          const h = (n) => Math.round(parseFloat(n)).toString(16).padStart(2, '0');
          return '#' + h(p[0]) + h(p[1]) + h(p[2]);
        })(),
        canvasPresent: !!orb,
      };
    }, label);
  };

  // 1) 默认 amber
  const before = await probe('before-amber');
  results.push(before);
  await capture(page, 'accent_default_amber');

  // 2) 切到 ice
  await page.evaluate(() => window._tjLiquidOrb.setColor('ice'));
  await new Promise((r) => setTimeout(r, 800));
  const ice = await probe('after-ice');
  results.push(ice);
  await capture(page, 'accent_after_ice');

  // 3) 切到 violet
  await page.evaluate(() => window._tjLiquidOrb.setColor('violet'));
  await new Promise((r) => setTimeout(r, 800));
  const violet = await probe('after-violet');
  results.push(violet);
  await capture(page, 'accent_after_violet');

  // 4) 切回 gold
  await page.evaluate(() => window._tjLiquidOrb.setColor('gold'));
  await new Promise((r) => setTimeout(r, 800));
  const gold = await probe('after-gold');
  results.push(gold);
  await capture(page, 'accent_after_gold');

  console.log('===== 验证结果 =====');
  for (const r of results) {
    console.log(`[${r.label}] orbKey=${r.orbColorKey} | --c-accent=${r.cAccent} | btnBg=${r.btnBg}(${r.btnBgHex}) | --orb-amb-1=${r.orbAmb1}`);
  }

  // 断言
  const amber = results[0];
  const iceR = results[1];
  const ok = [];
  ok.push(['切色后 orbColorKey 同步', iceR.orbColorKey === 'ice']);
  ok.push(['--c-accent 从 amber 变为 ice', amber.cAccent !== iceR.cAccent]);
  ok.push(['按钮背景色随 --c-accent 变化', amber.btnBg !== iceR.btnBg]);
  ok.push(['--orb-amb-1 环境辉光随主题色变化', amber.orbAmb1 !== iceR.orbAmb1]);
  ok.push(['--c-accent 为冰蓝系(色相≈205)', /hsl\(20[0-9],/.test(iceR.cAccent)]);
  ok.push(['violet 与 amber 按钮色不同', results[2].btnBg !== amber.btnBg]);
  ok.push(['gold 与 ice 按钮色不同', results[3].btnBg !== iceR.btnBg]);
  ok.push(['光球 canvas 存在', amber.canvasPresent]);

  console.log('\n===== 断言 =====');
  let pass = 0;
  for (const [name, v] of ok) {
    console.log(`${v ? 'PASS' : 'FAIL'} | ${name}`);
    if (v) pass++;
  }
  console.log(`\n通过 ${pass}/${ok.length}`);

  await browser.close();
  process.exit(pass === ok.length ? 0 : 1);
})().catch((e) => {
  console.error('ERROR', e);
  process.exit(2);
});
