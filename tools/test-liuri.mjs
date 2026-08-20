globalThis.window = globalThis.window || globalThis;
import { mkBazi } from '../src/engines/bazi.js';
import { calcLiuRi, buildDailyCopy, dailyOneLiner, getDayGZ } from '../src/engines/liuri.js';

let pass=0,fail=0;
const t=(n,c,e='')=>{c?(pass++,console.log('  ✓',n)):(fail++,console.log('  ✗',n,e))};

console.log('\n[1] 干支计算');
t('2024-01-01 = 甲子日', getDayGZ(new Date(2024,0,1)).gz==='甲子', getDayGZ(new Date(2024,0,1)).gz);
t('2000-01-01 = 戊午日', getDayGZ(new Date(2000,0,1)).gz==='戊午', getDayGZ(new Date(2000,0,1)).gz);
t('连续两天干支不同', getDayGZ(new Date(2024,0,1)).gz!==getDayGZ(new Date(2024,0,2)).gz);
t('60 天后干支循环', getDayGZ(new Date(2024,0,1)).gz===getDayGZ(new Date(2024,2,1)).gz, getDayGZ(new Date(2024,2,1)).gz);

console.log('\n[2] 同一天必须稳定（不能每次刷新都变）');
const me=mkBazi(1990,6,15,5);
const d=new Date(2026,7,2);
const a=buildDailyCopy(calcLiuRi(me,'水',d));
const b2=buildDailyCopy(calcLiuRi(me,'水',d));
t('两次调用结果一致', JSON.stringify(a)===JSON.stringify(b2));

console.log('\n[3] 因人而异（不同命盘同一天结论应不同）');
const other=mkBazi(1985,11,2,3);
const r1=calcLiuRi(me,'水',d), r2=calcLiuRi(other,'火',d);
t('不同命盘 role 或 energy 不同', r1.role!==r2.role||r1.energy!==r2.energy,
  `${r1.role}/${r1.energy} vs ${r2.role}/${r2.energy}`);

console.log('\n[4] 自洽性：tone 与 energy 必须匹配');
let bad=0,tones={};
for(let i=0;i<400;i++){
  const dt=new Date(2026,0,1+i);
  const r=calcLiuRi(me,'水',dt);
  tones[r.tone]=(tones[r.tone]||0)+1;
  const ok=(r.energy>=72&&r.tone==='flow')||(r.energy>=55&&r.energy<72&&r.tone==='steady')
         ||(r.energy>=38&&r.energy<55&&r.tone==='friction')||(r.energy<38&&r.tone==='rest');
  if(!ok)bad++;
  const c=buildDailyCopy(r);
  if(!c.headline||!c.sections.length)bad++;
  if(r.energy<10||r.energy>95)bad++;
}
t('400 天全部自洽', bad===0, 'bad='+bad);
t('基调有分布而非恒定', Object.keys(tones).length>=2, JSON.stringify(tones));
console.log('    基调分布:', JSON.stringify(tones));

console.log('\n[5] 冲/合能被识别');
let foundChong=false,foundHe=false;
for(let i=0;i<60;i++){
  const r=calcLiuRi(me,'水',new Date(2026,0,1+i));
  if(r.chong.length)foundChong=true;
  if(r.he.length)foundHe=true;
}
t('60 天内出现过相冲', foundChong);
t('60 天内出现过相合', foundHe);

console.log('\n[6] 不含吉凶断言与恐吓词');
const banned=['大凶','大吉','必有','灾','厄','破财','血光','小人','必然','凶险'];
let hitWord=null;
for(let i=0;i<200;i++){
  const c=buildDailyCopy(calcLiuRi(me,'水',new Date(2026,0,1+i)));
  const all=c.headline+JSON.stringify(c.sections);
  for(const w of banned) if(all.includes(w)){hitWord=w+' @day'+i;break}
  if(hitWord)break;
}
t('200 天文案无吉凶/恐吓用词', !hitWord, hitWord||'');

console.log('\n[7] 一句话摘要');
const ol=dailyOneLiner(calcLiuRi(me,'水',d));
t('摘要含干支且非空', /[甲乙丙丁戊己庚辛壬癸]/.test(ol)&&ol.length>6, ol);
console.log('    示例:', ol);

console.log(`\n结果： ${pass} 通过 / ${fail} 失败\n`);
process.exit(fail?1:0);
