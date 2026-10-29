import { HOME_THEMES } from '../src/ui/home-theme.js';

/** Exercise the real spinner with a deterministic random value in tests only. */
export async function spinFor(page, id, { confirm = true, control = '#traitSpin', timeout = 15000 } = {}) {
  const ids = Object.keys(HOME_THEMES);
  const index = ids.indexOf(id);
  if (index < 0) throw new Error(`Unknown test trait: ${id}`);
  await page.waitForSelector('#traitMachine[data-ready="true"]', { timeout });
  await page.evaluate(({ index, count }) => {
    const original = window.crypto.getRandomValues;
    window.__restoreTestRandom = () => { window.crypto.getRandomValues = original; delete window.__restoreTestRandom; };
    window.crypto.getRandomValues = array => {
      array[0] = Math.floor(((index + 0.5) / count) * 0x100000000);
      return array;
    };
  }, { index, count: ids.length });
  try {
    await page.click(control);
  } finally {
    await page.evaluate(() => window.__restoreTestRandom?.());
  }
  await page.waitForFunction(expected => {
    const button = document.getElementById('traitConfirm');
    return button && !button.hidden && button.dataset.result === expected &&
      document.getElementById('traitMachine').dataset.spinning === 'false';
  }, { timeout }, id);
  if (confirm) await page.click('#traitConfirm');
}
