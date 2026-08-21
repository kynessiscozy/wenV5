import puppeteer from 'puppeteer';
const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
await p.goto(BASE, { waitUntil: 'networkidle0', timeout: 20000 });
for (let i = 0; i < 40 && !(await p.evaluate(() => window._tools2Ready)); i++) await new Promise(r => setTimeout(r, 50));
await p.evaluate(() => window.calc(true));
await new Promise(r => setTimeout(r, 2500));

// 打开风水工具并生成结果
await p.evaluate(() => window.openToolPage('fengshui'));
await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => document.getElementById('twFGen').click());
await new Promise(r => setTimeout(r, 600));

// 不配置密钥 → 点击 AI 解读应出现错误提示（验证解读挂载路径）
const aiBtnCount = await p.evaluate(() => document.querySelectorAll('.tw-ai-mount .tw-btn-ai, .tw-result-page .tw-btn-ai').length);
await p.evaluate(() => { const b = document.querySelector('.tw-result-page .tw-btn-ai') || document.querySelector('.tw-ai-mount .tw-btn-ai'); if (b) b.click(); });
await new Promise(r => setTimeout(r, 300));
const errText = await p.evaluate(() => (document.querySelector('.tw-ai-box .tw-ai-err') || {}).textContent || '');
const aiBoxShown = await p.evaluate(() => { const x = document.querySelector('.tw-ai-box'); return x ? !x.hidden : false; });

console.log('=== 风水大师 AI 追问 冒烟测试（无密钥路径） ===');
console.log('AI 解读按钮数:', aiBtnCount);
console.log('无密钥错误提示:', errText.trim());
console.log('AI 输出盒已显示:', aiBoxShown);
console.log('\n错误:', errs.length ? [...new Set(errs)].slice(0, 8).join(' | ') : '无');
await b.close();
