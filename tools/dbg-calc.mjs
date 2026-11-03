
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
page.on('pageerror', err => console.error('BROWSER ERROR:', err));

await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle0' });

console.log('Page loaded');
// The old form is gone: birth input goes through the funnel handoff channel.
await page.evaluate(() => {
  window.applyEntryPayload?.({ bd: '1995-06-15', timeStr: '09:00', cityName: '北京市', gen: 'male', who: '事业' });
});

console.log('Calling calc()...');
try {
  await page.evaluate(async () => {
    await window.calc(false);
  });
  console.log('calc() executed without throwing!');
} catch (e) {
  console.error('calc() threw error:', e);
}

await browser.close();
