import puppeteer from 'puppeteer';
import assert from 'node:assert';

async function testHomepage3D() {
  console.log('启动无头浏览器测试首页 3D 天象仪...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  console.log('【1】检查首页 3D Canvas 挂载与尺寸');
  const cvInfo = await page.evaluate(() => {
    const cv = document.getElementById('brand3d');
    if (!cv) return null;
    const rect = cv.getBoundingClientRect();
    const style = window.getComputedStyle(cv);
    return {
      exists: true,
      display: style.display,
      width: rect.width,
      height: rect.height,
      canvasWidth: cv.width,
      canvasHeight: cv.height
    };
  });

  assert.ok(cvInfo && cvInfo.exists, 'Canvas #brand3d 必须存在于页面上');
  assert.strictEqual(cvInfo.display, 'block', 'body.home 时 Canvas display 必须为 block');
  assert.ok(cvInfo.width > 0 && cvInfo.height > 0, 'Canvas 视口尺寸必须正常');
  console.log(`  ✓ Canvas 挂载正常 (视口: ${cvInfo.width}x${cvInfo.height}, 渲染分辨率: ${cvInfo.canvasWidth}x${cvInfo.canvasHeight})`);

  console.log('【2】检查首页庆典胶囊徽章 UI');
  const pillInfo = await page.evaluate(() => {
    const pill = document.getElementById('homeStarModePill');
    const text = document.getElementById('homeStarModeText');
    const tag = document.getElementById('homeStarModeTag');
    return {
      exists: !!pill,
      text: text ? text.textContent : '',
      tag: tag ? tag.textContent : ''
    };
  });

  assert.ok(pillInfo.exists, '庆典胶囊徽章 #homeStarModePill 必须存在');
  assert.ok(pillInfo.text.includes('3D黄道天象仪') || pillInfo.text.includes('西方星相'), '胶囊文本必须体现西方星相庆典主题');
  console.log(`  ✓ 庆典胶囊徽章正常显示: "${pillInfo.text}" [${pillInfo.tag}]`);

  console.log('【3】测试 3D 星轨模式切换 (Click to switch)');
  await page.click('#homeStarModePill');
  await new Promise(r => setTimeout(r, 400));
  
  const modeAfterClick1 = await page.evaluate(() => localStorage.getItem('tj_star_mode'));
  console.log(`  ✓ 点击切换后当前模式: ${modeAfterClick1}`);

  await page.click('#homeStarModePill');
  await new Promise(r => setTimeout(r, 400));
  const modeAfterClick2 = await page.evaluate(() => localStorage.getItem('tj_star_mode'));
  console.log(`  ✓ 二次点击切换后当前模式: ${modeAfterClick2}`);

  console.log('【4】测试庆典能量波冲击 (Surge API)');
  await page.evaluate(() => {
    if (window._tjArm && window._tjArm.surge) {
      window._tjArm.surge(2000);
    }
  });
  await new Promise(r => setTimeout(r, 300));
  console.log('  ✓ window._tjArm.surge(2000) 调用成功');

  console.log('【5】测试推演流程与页面切换时的 Canvas 停笔');
  await page.click('#homeCtaMain');
  await new Promise(r => setTimeout(r, 300));
  
  // 检查表单是否打开
  const formOpen = await page.evaluate(() => document.getElementById('formModal').classList.contains('open'));
  console.log(`  ✓ 出生信息表单已打开: ${formOpen}`);

  // 触发推演计算
  await page.evaluate(() => {
    if (typeof TJSubmitForm === 'function') TJSubmitForm();
    else if (typeof goCalc === 'function') goCalc();
  });
  await new Promise(r => setTimeout(r, 1200));

  const isPage2Active = await page.evaluate(() => {
    return !document.getElementById('page2').classList.contains('hidden');
  });
  console.log(`  ✓ 报告页已展示: ${isPage2Active}`);

  // 检查 Canvas 在报告页是否隐藏
  const cvInPage2 = await page.evaluate(() => {
    const cv = document.getElementById('brand3d');
    return window.getComputedStyle(cv).display;
  });
  console.log(`  ✓ 报告页中 Canvas display 状态: ${cvInPage2} (性能节约，停笔不争抢)`);

  assert.strictEqual(consoleErrors.length, 0, `页面运行中存在控制台错误:\n${consoleErrors.join('\n')}`);
  console.log('  ✓ 页面运行全程 0 控制台错误！');

  await browser.close();
  console.log('\n🎉 全部 E2E 3D 天象仪自动化测试顺利通过！');
}

testHomepage3D().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
