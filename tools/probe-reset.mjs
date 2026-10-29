import { selectHomeTrait, openDemoReport } from './test-entry.mjs';
import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: 'shell', protocolTimeout: 420000, args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0, 160)));
await p.setViewport({ width: 430, height: 932, deviceScaleFactor: 1 });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(()=>{});
await selectHomeTrait(p);
await openDemoReport(p);
await new Promise(r => setTimeout(r, 6000));
await p.evaluate(() => { window.setUserMode('western'); document.querySelector('.tab-item[data-sec="s-ming"]')?.click(); });
await new Promise(r => setTimeout(r, 5000));
const ok0 = await p.evaluate(() => !!window._w3d?.built?.astro);
if (!ok0) { console.log('SCENE-NOT-BUILT'); process.exit(1); }
await p.mouse.move(215, 400);
await p.mouse.down();
for (let i = 1; i <= 10; i++) { await p.mouse.move(215 - i * 9, 400 - i * 4); await new Promise(r => setTimeout(r, 16)); }
await p.mouse.up();
await new Promise(r => setTimeout(r, 400));
const dragged = await p.evaluate(() => ({ theta: +window._w3d.built.astro.orbit.theta.toFixed(3), phi: +window._w3d.built.astro.orbit.phi.toFixed(3) }));
await p.evaluate(() => document.querySelector('#w3d-astro .w3d-reset')?.click());
await new Promise(r => setTimeout(r, 500));
const reset = await p.evaluate(() => ({
  theta: +window._w3d.built.astro.orbit.theta.toFixed(3),
  phi: +window._w3d.built.astro.orbit.phi.toFixed(3),
  loadingGone: !document.querySelector('#w3d-astro .w3d-loading'),
  resetBtn: !!document.querySelector('#w3d-astro .w3d-reset'),
}));
console.log(JSON.stringify({ dragged, reset, resetWorks: dragged.theta !== reset.theta && Math.abs(reset.phi - 0.61) < 0.01 }, null, 1));
await b.close();
