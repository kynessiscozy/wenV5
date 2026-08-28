// 像素分析：检测首页光球主体（高饱和主题色）的中心与直径
import puppeteer from 'puppeteer';
const URL = 'https://afec98a9e4eec3cc8.bj10.agentos-app.net';
const OUT = '/root/.codebuddy/artifact';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=1'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction('window._tjLiquidOrb && window._tjLiquidOrb.getPresets', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1800));

  const analysis = await page.evaluate(() => {
    const canvas = document.getElementById('liquidOrb');
    if (!canvas) return { error: 'no canvas' };
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, w, h).data;
    // 阈值：饱和度高且非暗非纯白（主题色球体），排除背景流动弱光晕
    const pts = [];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4;
        const r = img[i], g = img[i + 1], b = img[i + 2], a = img[i + 3];
        if (a < 40) continue;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        // 主题色球体：饱和度中高、亮度中
        if (sat > 0.35 && lum > 0.25 && lum < 0.85) {
          pts.push([x, y, r, g, b]);
        }
      }
    }
    if (pts.length < 100) return { error: 'few points', n: pts.length, w, h };
    // 聚类近似：取 x 质心 与 y 质心，用半径覆盖
    let sx = 0, sy = 0;
    for (const p of pts) { sx += p[0]; sy += p[1]; }
    const cx = sx / pts.length, cy = sy / pts.length;
    // 半径：点到质心平均距离的放大
    let dist = 0;
    for (const p of pts) dist += Math.hypot(p[0] - cx, p[1] - cy);
    const avgR = dist / pts.length;
    const maxR = Math.max(...pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy)));
    return {
      w, h,
      centerPctX: (cx / w).toFixed(2),
      centerPctY: (cy / h).toFixed(2),
      centerPx: { x: Math.round(cx), y: Math.round(cy) },
      avgRpx: Math.round(avgR),
      maxRpx: Math.round(maxR),
      n: pts.length,
      sampleColor: pts.length ? `rgb(${pts[Math.floor(pts.length / 2)][2]},${pts[Math.floor(pts.length / 2)][3]},${pts[Math.floor(pts.length / 2)][4]})` : null,
    };
  });
  console.log(JSON.stringify(analysis, null, 2));

  await page.screenshot({ path: `${OUT}/home_orb_resized.png` });
  await browser.close();
})().catch((e) => { console.error('ERROR', e); process.exit(2); });
