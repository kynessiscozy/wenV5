import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { selectHomeTrait, openDemoReport } from './test-entry.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];

async function openReport({ touch = false } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport(touch
    ? { width: 390, height: 844, isMobile: true, hasTouch: true }
    : { width: 1200, height: 850 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await selectHomeTrait(page);
  await openDemoReport(page);
  // Report layout is reorganized after the reveal; select text only once the
  // real section tabs have been mounted and the rearrangement has settled.
  await page.waitForFunction(() => document.querySelectorAll('#s-ming .ming-tab').length >= 2);
  await new Promise(resolve => setTimeout(resolve, 800));
  return { page, context };
}

// Select a term from the actual rendered report, not a test-only fixture.
async function selectTerm(page, term) {
  const found = await page.evaluate(text => {
    const root = document.querySelector('#page2 .sec.active');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const offset = node.data.indexOf(text);
      const parent = node.parentElement;
      if (offset < 0 || !parent || !parent.getClientRects().length) continue;
      parent.scrollIntoView({ block: 'center', behavior: 'instant' });
      const range = document.createRange();
      range.setStart(node, offset);
      range.setEnd(node, offset + text.length);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    }
    return false;
  }, term);
  assert.equal(found, true, `报告中未找到可见术语「${term}」`);
}

try {
  {
    const { page, context } = await openReport();
    assert.equal(await page.$$('#page2 .glossary-term').then(nodes => nodes.length), 0, '报告不应恢复旧的自动下划线标注');
    await selectTerm(page, '用神');
    await page.waitForSelector('#glossChip', { visible: true });
    assert.match(await page.$eval('#glossChip', el => el.textContent), /解释「用神」/);
    await page.click('#glossChip .gloss-chip-x');
    await page.waitForSelector('#glossPop.open');
    assert.equal(await page.$eval('#glossPopTt', el => el.textContent), '用神');
    assert.equal(await page.$eval('#glossPopBd', el => el.textContent), await page.evaluate(() => window.__TJ_GLOSSARY__['用神']));

    // Right click must offer the same definition and dismiss cleanly.
    await selectTerm(page, '用神');
    const prevented = await page.evaluate(() => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 150, clientY: 120 });
      document.dispatchEvent(event);
      return event.defaultPrevented;
    });
    assert.equal(prevented, true);
    await page.waitForSelector('#glossCtx');
    await page.click('#glossCtx [data-act="explain"]');
    assert.equal(await page.$eval('#glossPopTt', el => el.textContent), '用神');
    assert.equal(await page.$('#glossCtx'), null);

    // The AI entry opens the real assistant and passes the selected term.
    await selectTerm(page, '用神');
    await page.evaluate(() => document.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 150, clientY: 120,
    })));
    await page.click('#glossCtx [data-act="ask"]');
    await page.waitForSelector('#aiSheet.open');
    await page.waitForFunction(() => [...document.querySelectorAll('#askResult .chat-msg-user')]
      .some(message => message.textContent.includes('用神')), { timeout: 10000 });
    await context.close();
  }
  console.log('✓ 报告选词解释、右键菜单和问问大师入口');

  {
    const { page, context } = await openReport({ touch: true });
    await selectTerm(page, '用神');
    await page.waitForSelector('.dock-gloss-x', { visible: true });
    await page.waitForFunction(() => !document.querySelector('.tab-bar-inner')?.classList.contains('dock-gloss-arm'));
    await page.click('.dock-gloss-x');
    await page.waitForSelector('#glossPop.open');
    assert.equal(await page.$eval('#glossPopTt', el => el.textContent), '用神');
    assert.equal(await page.$('.dock-gloss-x'), null, '解释后应恢复原有导航');
    await context.close();
  }
  console.log('✓ 触屏选词解释与导航恢复');
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
