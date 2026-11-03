import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import { selectHomeTrait, continueCalculation } from './test-entry.mjs';
const dir = await mkdtemp(join(tmpdir(), 'wenv5-security-'));
const browser = await puppeteer.launch({headless:true,args:['--no-sandbox']});
try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('tj_ai_provider','deepseek');
    localStorage.setItem('tj_ai_apikey','legacy-unknown-key');
    localStorage.setItem('tj_ai_apikey_deepseek','deep-key');
    localStorage.setItem('tj_ai_apikey_openrouter','open-key');
    localStorage.setItem('tj_ai_settings',JSON.stringify({natural:true,context:false,length:'short'}));
    window.requests=[];
    const original = fetch.bind(window);
    window.fetch = async (url, opts={}) => {
      if (/^https:\/\/(api\.deepseek\.com|openrouter\.ai)/.test(String(url))) {
        window.requests.push({url:String(url),auth:opts.headers?.Authorization,body:opts.body});
        if (String(url).includes('/chat/completions')) return new Response('data: {"choices":[{"delta":{"content":"模拟回复"}}]}\n\ndata: [DONE]\n\n',{status:200});
        return new Response('{}',{status:200});
      }
      return original(url,opts);
    };
  });
  await page.goto(process.env.BASE_URL || 'http://localhost:5173/',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{const store=await import('/src/evolve/store.js');await store.saveGenome({generation:1,enabled:true,topics:{健康:4},lessons:[{id:'test',text:'近期健康私密主题',weight:1}]});});
  await page.reload({waitUntil:'domcontentloaded'});
  await selectHomeTrait(page);
  await page.waitForFunction(() => typeof window.handleImport === 'function');
  const payload = '<img src=x onerror=window.__profileXss=1>';
  const file = join(dir,'profiles.json');
  await writeFile(file,JSON.stringify([
    {bd:'1995-06-15',bp:'shanghai',gen:'male',name:payload,q:payload},
    {bd:'1995-06-15'+payload,bp:'shanghai',gen:'male',name:'invalid',q:'综合'}
  ]));
  const input=await page.$('#impFile');
  await input.uploadFile(file);
  await page.waitForFunction(()=>document.querySelector('#recentGrid')?.textContent.includes('onerror'));
  assert.equal(await page.evaluate(()=>window.__profileXss),undefined);
  assert.equal((await page.$$('#recentGrid img')).length,0);
  assert.equal((await page.$$('#profileGrid .r-card')).length,1);
  await page.evaluate(()=>window.toggleAISettings());
  await page.select('#aiProviderSelect','openrouter');
  await page.select('#aiProviderSelect','deepseek');
  assert.equal(await page.evaluate(()=>window.requests.length),0, '切换服务商不应自动发送密钥');
  await page.evaluate(()=>window.closeAISettingsModal());
  await page.evaluate(()=>window.TJOpenForm());
  await page.waitForSelector('#formModal.open');
  await page.evaluate(()=>void window.calc());
  await continueCalculation(page);
  await page.evaluate(()=>window.openAsk());
  await page.evaluate(async()=>{const {generateAnswer}=await import('/src/ui/ask-panel.js');await generateAnswer('请帮我分析这一件陌生事情下一步如何稳妥推进',{homeSession:false});});
  const request=await page.evaluate(()=>window.requests.find(r=>r.url.includes('/chat/completions')));
  assert.ok(request);
  assert.equal(request.auth,'Bearer deep-key');
  assert.doesNotMatch(request.body,/近期健康私密主题/);
  await context.close();
  console.log('✓ 浏览器安全回归：恶意档案、跨服务商密钥、个人记忆不上传');
} finally { await browser.close(); await rm(dir,{recursive:true,force:true}); }
