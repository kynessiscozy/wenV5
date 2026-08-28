// 截图当前首页光球现状，并输出光球几何信息
import puppeteer from 'puppeteer';
const URL = 'https://afec98a9e4eec3cc8.bj10.agentos-app.net';
const OUT = '/root/.codebuddy/artifact';

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
  await new Promise((r) => setTimeout(r, 1500));

  // 读取光球实际绘制几何：通过 hook 读取 canvas 后做像素分析太复杂，
  // 改用 JS 复现 drawOrb 的几何计算（rf 随机，取范围）。
  const info = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const base = Math.min(vw, vh);
    // rf 范围 0.26~0.32，oy 范围 -0.06~0.02，取典型值估算
    return {
      vw, vh, base,
      rfMin: 0.26, rfMax: 0.32,
      cyPct: 0.44,
      // 估算光球主体直径范围（相对视口宽）
      rMin: Math.round(0.26 * base),
      rMax: Math.round(0.32 * base),
      dMinPctVw: Math.round((2 * 0.26 * base / vw) * 100) + '%视口宽',
      dMaxPctVw: Math.round((2 * 0.32 * base / vw) * 100) + '%视口宽',
    };
  });
  console.log(JSON.stringify(info, null, 2));

  // hero 底部按钮位置
  const btnPos = await page.evaluate(() => {
    const btn = document.getElementById('homeCtaMain');
    const r = btn.getBoundingClientRect();
    return { btnTop: Math.round(r.top), btnBottom: Math.round(r.bottom), vh: innerHeight };
  });
  console.log('按钮位置:', JSON.stringify(btnPos));
  console.log('按钮底边占视口比例:', (btnPos.btnBottom / btnPos.vh).toFixed(2));

  await page.screenshot({ path: `${OUT}/home_orb_current.png` });
  await browser.close();
})().catch((e) => { console.error('ERROR', e); process.exit(2); });
