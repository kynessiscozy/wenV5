
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
// Fill in form if needed
await page.evaluate(() => {
  document.getElementById('bDate').value = '1995-06-15';
  document.getElementById('bTime').value = '09:00';
  document.getElementById('bPlace').value = 'beijing';
  document.getElementById('bGen').value = 'male';
  document.getElementById('bQ').value = '事业';
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
