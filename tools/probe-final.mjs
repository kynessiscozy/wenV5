import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: 'shell', protocolTimeout: 420000, args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0, 180)));
await p.setViewport({ width: 430, height: 932, deviceScaleFactor: 1 });
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 45000 }).catch(()=>{});
await p.evaluate(() => window.calc(true));
await new Promise(r => setTimeout(r, 6000));
await p.evaluate(() => { window.setUserMode('western'); document.querySelector('.tab-item[data-sec="s-ming"]')?.click(); });
await new Promise(r => setTimeout(r, 6000));
const d = await p.evaluate(() => {
  const s = window._w3d?.built?.astro;
  return {
    built: !!s,
    loadingGone: !document.querySelector('#w3d-astro .w3d-loading'),
    resetBtn: !!document.querySelector('#w3d-astro .w3d-reset'),
    orbit: s ? { theta: +s.orbit.theta.toFixed(2), phi: +s.orbit.phi.toFixed(2), radius: +s.orbit.radius.toFixed(1) } : null,
  };
});
console.log(JSON.stringify(d));
// 拖拽后点复位
await p.mouse.move(215, 380);
await p.mouse.down();
for (let i = 1; i <= 8; i++) { await p.mouse.move(215 - i * 8, 380 - i * 3); await new Promise(r => setTimeout(r, 16)); }
await p.mouse.up();
await new Promise(r => setTimeout(r, 300));
const dragged = await p.evaluate(() => +window._w3d.built.astro.orbit.theta.toFixed(2));
await p.evaluate(() => document.querySelector('#w3d-astro .w3d-reset')?.click());
await new Promise(r => setTimeout(r, 400));
const reset = await p.evaluate(() => +window._w3d.built.astro.orbit.theta.toFixed(2));
console.log('drag:', dragged, '→ reset:', reset, '| works:', dragged !== reset && Math.abs(reset) < 0.01);
await p.screenshot({ path: '/tmp/final-reset.png', clip: { x: 0, y: 55, width: 430, height: 500 } });
await b.close();
