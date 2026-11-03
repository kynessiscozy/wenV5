import { spinFor } from './trait-picker-helper.mjs';

// Shared entry helpers for browser tests. The funnel is now the only entry:
// the trait reel stays hidden and the birth form opens automatically once the
// main module is ready. Keep the old spin path for a build that still exposes
// the home page, so this helper works in both configurations.
export async function selectHomeTrait(page, role = 'wenwen') {
  const reelVisible = await page.evaluate(() => {
    const selection = document.getElementById('traitSelection');
    const home = document.getElementById('page1');
    return !!selection && !selection.hidden && !!home && getComputedStyle(home).display !== 'none';
  });
  if (reelVisible) await spinFor(page, role);
  await page.waitForFunction(() => !!document.documentElement.dataset.homeTheme && typeof window.calc === 'function', { timeout: 15000 });
}

/** Replace the removed #homeCtaMain click: wait for the auto-opened form. */
export async function openBirthForm(page) {
  await page.evaluate(() => { if (typeof window.TJOpenForm === 'function') window.TJOpenForm(); });
  await page.waitForSelector('#formModal.open', { timeout: 15000 });
}

export async function continueCalculation(page) {
  await page.waitForFunction(() => document.getElementById('calculationOverlay').dataset.calculationState === 'ready', { timeout: 15000 });
  await page.click('#calculationContinue');
  await page.waitForFunction(() => document.getElementById('calculationOverlay').hidden && document.body.classList.contains('report-active'), { timeout: 15000 });
}

export async function openDemoReport(page) {
  await page.evaluate(() => { void window.calc(true); });
  await continueCalculation(page);
}
