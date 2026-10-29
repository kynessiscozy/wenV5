// Shared entry helpers for browser tests: every page visit requires a trait,
// and the real calculation result stays visible until explicitly acknowledged.
export async function selectHomeTrait(page, role = 'wenwen') {
  await page.waitForSelector(`[data-trait="${role}"]`, { timeout: 15000 });
  await page.click(`[data-trait="${role}"]`);
  await page.waitForFunction(id => document.documentElement.dataset.homeTheme === id && document.getElementById('traitSelection').hidden && typeof window.calc === 'function', { timeout: 15000 }, role);
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
