import puppeteer from 'puppeteer';
const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
await p.goto(BASE, { waitUntil: 'networkidle0', timeout: 20000 });
// 等 tools2 就绪
for (let i = 0; i < 40 && !(await p.evaluate(() => window._tools2Ready)); i++) await new Promise(r => setTimeout(r, 50));
// 生成命盘上下文
await p.evaluate(() => window.calc(true));
await new Promise(r => setTimeout(r, 2500));

// 打开风水大师工具
await p.evaluate(() => window.openToolPage('fengshui'));
await new Promise(r => setTimeout(r, 800));

const title = await p.evaluate(() => (document.querySelector('.tw-mast-title') || {}).textContent);
const hasStatus = await p.evaluate(() => !!document.querySelector('.tw-fs-status'));
const selectCount = await p.evaluate(() => document.querySelectorAll('#twFSpace,#twFFocus,#twFZuo').length);
const hasCompass = await p.evaluate(() => !!document.querySelector('#twFCompass'));
const hasLocNote = await p.evaluate(() => /未定位|已定位/.test((document.querySelector('.tw-fs-status') || {}).textContent || ''));

// 选一个坐向（宅卦判定）
await p.evaluate(() => { const s = document.getElementById('twFZuo'); s.value = '坐东朝西'; s.dispatchEvent(new Event('change')); });

// 点击生成
await p.evaluate(() => document.getElementById('twFGen').click());
await new Promise(r => setTimeout(r, 600));

const resultSvg = await p.evaluate(() => !!document.querySelector('.tw-result-page .tw-fs-svg'));
const dirCells = await p.evaluate(() => document.querySelectorAll('.tw-result-page .tw-fs-card').length);
const hasDirRow = await p.evaluate(() => !!document.querySelector('.tw-result-page .tw-fs-dir-row'));
const hasLoc = await p.evaluate(() => !!document.querySelector('.tw-result-page .tw-fs-loc'));
const hasEight = await p.evaluate(() => !!document.querySelector('.tw-result-page .tw-fs-pair'));
const resultText = await p.evaluate(() => (document.querySelector('.tw-result-page-body') || {}).innerText || '');
const hasMingGua = /命卦/.test(resultText);
const hasZhaiGua = /宅卦/.test(resultText);

await p.screenshot({ path: '/tmp/fengshui-result.png' });

console.log('=== 风水大师 冒烟测试 ===');
console.log('标题:', title);
console.log('状态行渲染:', hasStatus);
console.log('表单下拉数量(含坐向):', selectCount);
console.log('罗盘按钮:', hasCompass);
console.log('定位提示:', hasLocNote);
console.log('九宫 SVG 渲染:', resultSvg);
console.log('重点卡片数:', dirCells);
console.log('用神方位区:', hasDirRow);
console.log('当前位置卡:', hasLoc);
console.log('八宅吉凶位:', hasEight);
console.log('含「命卦」:', hasMingGua);
console.log('含「宅卦」:', hasZhaiGua);
console.log('结果含「九宫飞星」:', resultText.includes('九宫飞星'));
console.log('结果含「五黄」:', resultText.includes('五黄'));
console.log('结果含「八白」:', resultText.includes('八白'));
console.log('结果含「一白」:', resultText.includes('一白'));
console.log('\n错误:', errs.length ? [...new Set(errs)].slice(0, 8).join(' | ') : '无');
await b.close();
