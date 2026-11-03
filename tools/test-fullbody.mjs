import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { spinFor } from './trait-picker-helper.mjs';

const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
try {
  for (const [width,height] of [[320,568],[390,844],[568,320],[844,390],[1280,720]]) {
    const context=await browser.createBrowserContext();
    const page=await context.newPage();
    await page.setViewport({width,height});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.goto(process.env.BASE_URL || 'http://localhost:5173/index.html',{waitUntil:'domcontentloaded'});
    for (const [i,id] of ['luye','suyan'].entries()) {
      if (i) await page.click('#homeTraitReset');
      await spinFor(page,id);
      await page.waitForFunction(id=>document.documentElement.dataset.homeTheme===id&&document.getElementById('traitSelection').hidden,{},id);
      const view=await page.evaluate(async () => {
        document.querySelector('#page1 .p1-scroll').scrollTop=0;
        const img=document.querySelector('[data-character-asset="portrait"]'); await img.decode();
        const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
        const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
        let minY=c.height,maxY=0;
        for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++) if(pixels[(y*c.width+x)*4+3]>128){minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
        const rect=img.getBoundingClientRect(),scale=Math.min(rect.width/c.width,rect.height/c.height),top=rect.bottom-c.height*scale;
        const pointX=rect.left+rect.width*.5,pointY=top+(minY+(maxY-minY)*.35)*scale;
        return {head:top+minY*scale,feet:top+maxY*scale,cta:document.getElementById('homeCtaMain').getBoundingClientRect().top,hit:!!document.elementFromPoint(pointX,pointY)?.closest('#characterPortraitButton'),hidden:[...document.querySelectorAll('.character-expression')].every(el=>el.hidden),overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.ok(view.head>=0 && view.feet<=view.cta && view.hit && view.hidden && !view.overflow,`${id} ${width}x${height}: 全身应可见、可点击且不能复用旧表情 ${JSON.stringify(view)}`);
    }
    await context.close();
  }
  console.log('✓ 两位全身人物在横竖屏完整显示，可点击且不复用旧表情');
} finally {await browser.close();}
