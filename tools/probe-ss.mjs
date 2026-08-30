import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: 'shell', protocolTimeout: 420000, args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 430, height: 932 });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(()=>{});
await new Promise(r => setTimeout(r, 6000));
const d = await p.evaluate(() => {
  const c = window._ctx;
  return { yg: c.ss.yg, mg: c.ss.mg, yzc0: c.ss.yzc?.[0], dimsOk: typeof c.P[c.dg]?.core };
});
console.log(JSON.stringify(d));
await b.close();
