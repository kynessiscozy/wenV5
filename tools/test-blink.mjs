import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { spinFor } from './trait-picker-helper.mjs';
import { HOME_THEMES } from '../src/ui/home-theme.js';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setBypassServiceWorker(true);
  await page.goto(process.env.BASE_URL || 'http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  for (const [index, id] of Object.keys(HOME_THEMES).entries()) {
    if (index) await page.click('#homeTraitReset');
    await spinFor(page, id);
    await page.waitForFunction(id => document.documentElement.dataset.homeTheme === id && document.getElementById('traitSelection').hidden, {}, id);
    await page.waitForFunction(() => {
      const eye = document.querySelector('.character-blink');
      return !eye.hidden && eye.complete && eye.naturalWidth > 0;
    });
    const change = await page.evaluate(async () => {
      const original = document.querySelector('[data-character-asset="portrait"]');
      const layer = document.querySelector('.character-blink');
      await Promise.all([original.decode(), layer.decode()]);
      const w = original.naturalWidth, h = original.naturalHeight;
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(original, 0, 0); const before = ctx.getImageData(0, 0, w, h).data;
      ctx.clearRect(0, 0, w, h); ctx.drawImage(layer, 0, 0); const patch = ctx.getImageData(0, 0, w, h).data;
      let left = w, right = 0, top = h, bottom = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (patch[(y*w+x)*4+3] > 8) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      const counts = [0, 0];
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const i = (y*w+x)*4;
        if (patch[i+3] >= 250 && Math.max(...[0,1,2].map(c => Math.abs(before[i+c] - patch[i+c]))) > 20) counts[x < (left+right)/2 ? 0 : 1]++;
      }
      return { counts, left, right, top, bottom, width: w, height: h };
    });
    assert.ok(change.counts.every(count => count > 100), `${id}: 双眼区域都应完整替换而非只闭一只眼 ${JSON.stringify(change)}`);
    assert.ok((change.right-change.left) < change.width * .25 && (change.bottom-change.top) < change.height * .1, `${id}: 眨眼图层应限制在眼部`);
  }
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const timing = await page.evaluate(() => {
    const eye = document.querySelector('.character-blink');
    const animation = eye.getAnimations().find(item => item.animationName === 'character-blink');
    animation.pause();
    return [6000, 6040, 6080, 6100, 6150, 6200, 6240, 6300].map(time => {
      animation.currentTime = time;
      return Number(getComputedStyle(eye).opacity);
    });
  });
  assert.ok(timing.includes(0) && timing.includes(1) && timing.every(opacity => opacity === 0 || opacity === 1), `眨眼不应把睁眼和闭眼半透明混合: ${timing}`);
  console.log('✓ 十位人物的双眼均有完整闭眼图层，眨眼切换无半透明重影');
} finally { await browser.close(); }
