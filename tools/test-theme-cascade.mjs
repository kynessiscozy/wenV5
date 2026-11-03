import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { spinFor } from './trait-picker-helper.mjs';
import { HOME_THEMES } from '../src/ui/home-theme.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const tokens = await readFile(new URL('../src/theme-claude.css', import.meta.url), 'utf8');
const base = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const ui = await readFile(new URL('../src/claude-ui.css', import.meta.url), 'utf8');
const character = await readFile(new URL('../src/character-theme.css', import.meta.url), 'utf8');
assert.ok(html.indexOf('/src/styles.css') < html.indexOf('/src/theme-claude.css'), '令牌必须在基础样式之后加载');
assert.match(tokens, /html\[data-home-theme\]\s*\{/);
assert.match(tokens, /html\[data-home-theme\]\[data-theme="dark"\]\s*\{/);
const root = base.match(/:root\{([^}]*)\}/)?.[1] || '';
for (const name of ['accent', 'accent-h', 'ac', 'ac1', 'glass-border', 'glass-shadow', 'sf']) {
  assert.doesNotMatch(root, new RegExp(`--${name}\\s*:`), `${name} 不应在基础样式重复定义`);
  assert.match(tokens, new RegExp(`--${name}\\s*:`), `${name} 应由主题令牌提供`);
}
assert.doesNotMatch(ui, /:root\s*\{/);
assert.doesNotMatch(character, /html\[data-home-theme\]\s*\{/);

const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
try {
  for (const mode of ['light','dark']) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width:390,height:844});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.evaluateOnNewDocument(mode => localStorage.setItem('tj_theme', mode),mode);
    await page.goto(process.env.BASE_URL || 'http://localhost:5173/', {waitUntil:'domcontentloaded'});
    assert.equal(await page.$eval('#homeTraitSummary', el => el.hidden), true, '选择之前不显示说明');
    const snapshots = new Map();
    const ids = Object.keys(HOME_THEMES);
    for (const id of [...ids, ...ids]) {
      if (snapshots.size) await page.click('#homeTraitReset');
      await spinFor(page,id);
      await page.waitForFunction(id => document.documentElement.dataset.homeTheme === id && document.getElementById('traitSelection').hidden,{},id);
      const values = await page.evaluate(() => {
        const root=getComputedStyle(document.documentElement), page=getComputedStyle(document.getElementById('page1'));
        return Object.fromEntries(['--trait-color','--accent-h','--accent-s','--accent-l','--c-bg','--c-surface','--c-accent','--c-accent-text','--ac','--ac1','--glass-border','--glass-shadow'].map(k=>[k,root.getPropertyValue(k).trim()]).concat([['--home-bg',page.getPropertyValue('--home-bg').trim()]]));
      });
      if (snapshots.has(id)) assert.deepEqual(values,snapshots.get(id),`${mode}/${id}: 重选后主题不应混入之前的值`);
      else snapshots.set(id,values);
      assert.equal(values['--trait-color'].toLowerCase(),HOME_THEMES[id].trait.color.toLowerCase());
      const summary = await page.$eval('#homeTraitSummary', el => ({hidden:el.hidden, label:el.querySelector('#homeTraitLabel').textContent, description:el.querySelector('#homeTraitDescription').textContent}));
      assert.deepEqual(summary, {hidden:false, label:HOME_THEMES[id].trait.label, description:HOME_THEMES[id].trait.description}, `${mode}/${id}: 特质说明应同步更新`);
    }
    assert.ok(new Set([...snapshots.values()].map(value=>value['--c-accent'])).size>5, '不同特质保留独立主题色');
    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(await page.$eval('#homeTraitSummary', el => el.hidden), true, '刷新后重新选择前不显示旧说明');
    await context.close();
  }
  for (const [width,height] of [[320,568],[390,844],[568,320],[1280,720]]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width,height});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.goto(process.env.BASE_URL || 'http://localhost:5173/', {waitUntil:'domcontentloaded'});
    for (const [index,id] of Object.keys(HOME_THEMES).entries()) {
      if (index) await page.click('#homeTraitReset');
      await spinFor(page,id);
      await page.waitForFunction(id => document.documentElement.dataset.homeTheme === id && document.getElementById('traitSelection').hidden,{},id);
      const layout = await page.evaluate(() => {
        document.querySelector('#page1 .p1-scroll').scrollTop = 0;
        const box = selector => document.querySelector(selector).getBoundingClientRect();
        const summary = box('#homeTraitSummary'), menu = box('#homeMenuBtn'), toggle = box('.theme-toggle-home'), cta = box('#homeCtaMain');
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('#homeTraitDescription'));
        const text = range.getBoundingClientRect();
        return {top:summary.top,bottom:summary.bottom,left:text.left,right:text.right,menuRight:menu.right,toggleLeft:toggle.left,ctaTop:cta.top,overflow:document.documentElement.scrollWidth > innerWidth};
      });
      assert.ok(!layout.overflow && layout.top >= 0 && layout.bottom <= height && layout.bottom < layout.ctaTop && layout.left >= layout.menuRight && layout.right <= layout.toggleLeft, `${width}x${height}/${id}: 说明应完整显示且不遮挡按钮 ${JSON.stringify(layout)}`);
    }
    await context.close();
  }
  console.log('✓ 主题令牌、十种特质说明及明暗切换、刷新和多视口布局');
} finally { await browser.close(); }
