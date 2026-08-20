import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
try {
  await page.goto('http://localhost:5173/wenV2/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const r = await page.evaluate(() => {
    const G = window.__TJ_GLOSSARY__ || {};
    const test = ['六合','三刑','官印相生','伤官见官','枭神夺食','沐浴','临官','配偶宫','红鸾','烂桃花','起运','太岁','从格','胎元','天干五合','财库','食神制杀','比劫夺财'];
    const miss = test.filter(k => !G[k]);
    return { total: Object.keys(G).length, miss, sample: G['官印相生'] };
  });
  console.log('术语总数:', r.total);
  console.log('缺失:', r.miss.length ? r.miss.join(',') : '无（全部命中）');
  console.log('示例 官印相生:', r.sample);
} catch (e) { console.error(e.message); }
finally { await browser.close(); }
