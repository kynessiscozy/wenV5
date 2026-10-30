import assert from 'node:assert/strict';
import { jqInstant, solarTermDutyDay } from '../src/engines/calendar.js';
import { getWesternProfile } from '../src/engines/western-context.js';
import { calcWesternChart } from '../src/engines/western.js';
import { CD } from '../src/engines/cities.js';
import { smartAnswer, installEvolveHooks } from '../src/ai/smart-answer.js';
import { renderZiWeiCard } from '../src/render/report.js';
import { TJ } from '../src/state/tj.js';
import { renderSmartAnswer } from '../src/render/ai.js';

const term = jqInstant(1990, 2).getTime();
assert.equal(solarTermDutyDay(term), 1);
assert.equal(solarTermDutyDay(term + 86400000), 2);
assert.notEqual(solarTermDutyDay(term - 1), 1);
for (const [city, y, m, d, h, offset] of [[CD.newyork,1995,6,15,9,-4],[CD.london,1995,1,15,9,0],[CD.shanghai,1990,7,1,9,9]]) {
  const profile = getWesternProfile({input:{by:y,bm:m,bd:d,timeStr:'09:00'},city});
  assert.deepEqual(profile.chart, calcWesternChart(y,m,d,h,0,city.o,city.a,offset));
}
const personal = {kind:'personal',title:'local',sections:[],links:[],related:[]};
let called = false;
installEvolveHooks({matchEvolved: () => { called = true; return personal; }});
assert.equal(smartAnswer('一件完全陌生的事情', {}), personal);
assert.equal(called, true);
assert.doesNotMatch(renderSmartAnswer({kind:'personal', title:'<img src=x>', sections:[{title:'x', content:'<img src=x>'}], links:[], related:[]}), /<img/);
assert.match(renderZiWeiCard({ps:[],approximate:true}), /近似算法/);
assert.doesNotMatch(renderZiWeiCard({ps:[],approximate:false}), /近似算法/);
assert.equal(TJ.findLiuNian([{y:new Date().getFullYear()}]).y, new Date().getFullYear());

const store = new Map([['tj_ai_provider','deepseek'],['tj_ai_apikey','unknown-legacy']]);
globalThis.localStorage = {getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const {getApiKey} = await import('../src/ui/ai-settings.js');
const {setProvider} = await import('../src/ai/index.js');
assert.equal(getApiKey(), '');
store.set('tj_ai_apikey_deepseek','deep-secret');
store.set('tj_ai_apikey_openrouter','open-secret');
assert.equal(getApiKey(),'deep-secret');
setProvider('openrouter');
assert.equal(getApiKey(),'open-secret');

const nativeTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...args) => nativeTimeout(fn, ms === 22000 ? 20 : ms, ...args);
for (const provider of ['deepseek','openrouter']) {
  let cancelled = false;
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"开头"}}]}\n\n')); },
    cancel() { cancelled = true; }
  }), {status:200});
  const {streamAskAnswer} = await import(`../src/ai/${provider}.js`);
  await assert.rejects(streamAskAnswer({apiKey:'test',systemPrompt:'',chartContext:'',question:'test',models:['test']}));
  assert.ok(cancelled, `${provider} 流超时必须取消读取`);
}
globalThis.setTimeout = nativeTimeout;
console.log('✓ 修复回归：时区、司权、个人知识、紫微提示、密钥隔离及流超时');
