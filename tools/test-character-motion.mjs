import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { HOME_THEMES } from '../src/ui/home-theme.js';
import { spinFor } from './trait-picker-helper.mjs';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setBypassServiceWorker(true);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(process.env.BASE_URL || 'http://localhost:5173/index.html', { waitUntil: 'domcontentloaded' });
  for (const [index, id] of Object.keys(HOME_THEMES).entries()) {
    if (index) await page.click('#homeTraitReset');
    await spinFor(page, id);
    await page.waitForFunction(id => document.documentElement.dataset.homeTheme === id && document.getElementById('traitSelection').hidden, {}, id);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    const state = await page.evaluate(id => {
      const idle = document.querySelector('.character-idle-motion');
      const anim = idle.getAnimations().find(a => ['companion-breathe', 'panda-invite', 'paper-messenger-float'].includes(a.animationName));
      const effect = document.querySelector(`.trait-effect--${id}`);
      const controls = ['homeMenuBtn', 'homeCtaMain', 'homeCtaCal'].map(id => {
        const r = document.getElementById(id).getBoundingClientRect();
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('button')?.id;
      });
      const pointerEvents = getComputedStyle(document.querySelector('.character-trait-effect')).pointerEvents;
      return { animation: !!anim, effect: effect ? getComputedStyle(effect).animationName : null, pointerEvents, controls };
    }, id);
    assert.ok(state.animation, `${id}: 人物应有呼吸动画`);
    if (state.effect !== null) assert.notEqual(state.effect, 'none', `${id}: 专属道具应有动态`);
    assert.equal(state.pointerEvents, 'none');
    assert.deepEqual(state.controls, ['homeMenuBtn', 'homeCtaMain', 'homeCtaCal']);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.character-idle-motion', el => getComputedStyle(el).animationName), 'none');
    if (state.effect !== null) assert.equal(await page.$eval(`.trait-effect--${id}`, el => getComputedStyle(el).animationName), 'none');
  }
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.evaluate(() => document.getElementById('characterPortraitButton').click());
  assert.equal(await page.$eval('#characterScene', el => el.classList.contains('character-responding')), true);
  await page.waitForSelector('#formModal.open');
  assert.equal(await page.$eval('#characterScene', el => el.classList.contains('character-responding')), false);
  await page.evaluate(() => window.TJCloseForm());
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluate(() => document.getElementById('characterPortraitButton').click());
  await page.waitForSelector('#formModal.open');
  assert.equal(await page.$eval('#characterScene', el => el.classList.contains('character-responding')), false);
  console.log('✓ 十角色呼吸、专属动效、点击反馈、控制按钮与减少动态');
} finally { await browser.close(); }
