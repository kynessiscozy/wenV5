import { applyThemeFor } from './theme-helper.mjs';

// Shared entry helpers for browser tests. funnel.html is the only entry:
// the persona (and therefore the theme) is chosen there and handed over via
// wen_funnel_v1; birth input travels the same channel (applyEntryPayload).
// There is no slot machine and no birth form left in the main app.
export async function selectHomeTrait(page, role = 'wenwen') {
  await applyThemeFor(page, role);
  await page.waitForFunction(() => !!document.documentElement.dataset.homeTheme && typeof window.calc === 'function', { timeout: 15000 });
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
