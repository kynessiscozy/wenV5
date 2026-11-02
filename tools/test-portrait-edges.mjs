import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

// These formerly visible green-screen fringes lie in warm-colored hair and
// costume details. Limit checks to those regions; jade and foxfire are meant
// to retain their own green/blue colors.
const regions = {
  rongrong: [250, 100, 600, 380, 100],
  luye: [200, 0, 550, 240, 200],
  diyan: [275, 0, 570, 230, 200],
  zhiya: [200, 200, 500, 410, 200],
};
const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
try {
  const page = await browser.newPage();
  for (const [id, [left, top, right, bottom, limit]] of Object.entries(regions)) {
    const data = (await readFile(new URL(`../public/art/${id}-cinema3d.webp`, import.meta.url))).toString('base64');
    const count = await page.evaluate(async ({data, left, top, right, bottom}) => {
      const image = new Image(); image.src = `data:image/webp;base64,${data}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', {willReadFrequently: true}); ctx.drawImage(image, 0, 0);
      const {data: pixels} = ctx.getImageData(0, 0, canvas.width, canvas.height); let count = 0;
      const alpha = (x,y) => x < 0 || y < 0 || x >= canvas.width || y >= canvas.height ? 0 : pixels[(y*canvas.width+x)*4+3];
      for (let y=top; y<bottom; y++) for (let x=left; x<right; x++) {
        const i = (y*canvas.width+x)*4, r=pixels[i], g=pixels[i+1], b=pixels[i+2];
        if (pixels[i+3] <= 128 || g <= r*.85+3 || g <= b*1.5 || g <= 50) continue;
        let nearTransparent = false;
        for (let dy=-4; dy<=4 && !nearTransparent; dy++) for (let dx=-4; dx<=4; dx++) if (alpha(x+dx,y+dy) <= 15) {nearTransparent = true; break;}
        if (nearTransparent) count++;
      }
      return count;
    }, {data, left, top, right, bottom});
    assert.ok(count < limit, `${id}: 边缘残留过多绿幕色 (${count})`);
  }
  for (const [id, x, y, expected] of [['yuchen',450,580,[58,76,51,255]], ['moonfox',490,470,[27,47,77,255]]]) {
    const data = (await readFile(new URL(`../public/art/${id}-cinema3d.webp`, import.meta.url))).toString('base64');
    const pixel = await page.evaluate(async ({data,x,y}) => {
      const image = new Image(); image.src = `data:image/webp;base64,${data}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image,0,0); return [...ctx.getImageData(x,y,1,1).data];
    }, {data,x,y});
    assert.ok(pixel.every((channel, index) => Math.abs(channel - expected[index]) <= 6), `${id}: 玉色服装和蓝色细节应保持原色`);
  }
  console.log('✓ 人物发丝边缘绿幕残留减少，玉色与蓝色细节保留');
} finally { await browser.close(); }
